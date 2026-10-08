"""Dependency-free HTTP API for searching the synthetic timetable."""

from __future__ import annotations

import argparse
import json
import os
import re
import socket
import sqlite3
from contextlib import closing
from dataclasses import dataclass
from datetime import date
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Never
from urllib.parse import parse_qs, urlparse

from backend.query_groups import (
    QueryApiError,
    execute_lookup,
    execute_query_groups,
)


DEFAULT_DATABASE = Path(__file__).resolve().parents[1] / "data" / "omio.sqlite3"
MAX_REQUEST_BODY_BYTES = 256 * 1024
REQUEST_READ_TIMEOUT_SECONDS = 10
REQUEST_ID_PATTERN = re.compile(r"^[a-zA-Z0-9_.:-]{1,96}$")
MODES = ("train", "bus", "flight", "ferry")
SORTS = {
    "price_asc": "f.price_cents ASC, f.id ASC",
    "price_desc": "f.price_cents DESC, f.id ASC",
    "duration_asc": "f.duration_minutes ASC, f.id ASC",
    "duration_desc": "f.duration_minutes DESC, f.id ASC",
}


class ApiError(Exception):
    def __init__(self, status: HTTPStatus, code: str, message: str):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message


@dataclass(frozen=True)
class SearchQuery:
    origin: str
    destination: str
    departure_date: date
    return_date: date | None
    passengers: int
    mode: str
    sort: str
    page: int
    limit: int


def _fail(field: str, message: str) -> Never:
    raise ApiError(HTTPStatus.BAD_REQUEST, "invalid_query", f"{field}: {message}")


def _one(query: dict[str, list[str]], name: str, default: str | None = None) -> str:
    values = query.get(name)
    if values is None:
        if default is None:
            _fail(name, "is required")
        return default
    if len(values) != 1 or not values[0].strip():
        _fail(name, "must be provided exactly once")
    return values[0].strip()


def _integer(
    query: dict[str, list[str]], name: str, default: int, minimum: int, maximum: int
) -> int:
    raw = _one(query, name, str(default))
    try:
        value = int(raw)
    except ValueError:
        _fail(name, "must be an integer")
    if not minimum <= value <= maximum:
        _fail(name, f"must be between {minimum} and {maximum}")
    return value


def _date_value(query: dict[str, list[str]], name: str, *, required: bool) -> date | None:
    values = query.get(name)
    if values is None and not required:
        return None
    raw = _one(query, name)
    try:
        return date.fromisoformat(raw)
    except ValueError:
        _fail(name, "must use YYYY-MM-DD")


def parse_search_query(query: dict[str, list[str]]) -> SearchQuery:
    origin = _one(query, "origin")
    destination = _one(query, "destination")
    if origin == destination:
        _fail("destination", "must differ from origin")
    departure_date = _date_value(query, "departure_date", required=True)
    if departure_date is None:
        raise AssertionError("required departure date was not parsed")
    return_date = _date_value(query, "return_date", required=False)
    if return_date is not None and return_date < departure_date:
        _fail("return_date", "must be on or after departure_date")
    passengers = _integer(query, "passengers", 1, 1, 8)
    mode = _one(query, "mode", "all")
    if mode not in (*MODES, "all"):
        _fail("mode", f"must be one of all, {', '.join(MODES)}")
    sort = _one(query, "sort", "price_asc")
    if sort not in SORTS:
        _fail("sort", f"must be one of {', '.join(SORTS)}")
    return SearchQuery(
        origin,
        destination,
        departure_date,
        return_date,
        passengers,
        mode,
        sort,
        _integer(query, "page", 1, 1, 100_000),
        _integer(query, "limit", 20, 1, 100),
    )


def _source_version(database: Path) -> str:
    try:
        stat = database.stat()
    except FileNotFoundError:
        raise ApiError(HTTPStatus.SERVICE_UNAVAILABLE, "database_unavailable", "The fare database is unavailable.") from None
    return f"sqlite-demo-v2-{stat.st_ino:x}-{stat.st_size:x}-{stat.st_mtime_ns:x}"


def _verified_source_version(database: Path, expected: str) -> str:
    if _source_version(database) != expected:
        raise ApiError(HTTPStatus.SERVICE_UNAVAILABLE, "source_changed", "The fare source changed during this request. Retry with the current source.")
    return expected


def _connect(database: Path) -> sqlite3.Connection:
    database = database.resolve()
    if not database.is_file():
        raise ApiError(
            HTTPStatus.SERVICE_UNAVAILABLE,
            "database_unavailable",
            f"database not found at {database}; run the generator first",
        )
    connection = sqlite3.connect(f"file:{database}?mode=ro", uri=True, timeout=5.0)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA query_only = ON")
    connection.execute("PRAGMA busy_timeout = 5000")
    return connection


def _metadata_values(connection: sqlite3.Connection) -> dict[str, str]:
    return {row["key"]: row["value"] for row in connection.execute("SELECT key, value FROM metadata")}


def _validate_timetable_date(
    value: date, metadata: dict[str, str], field: str
) -> None:
    start = date.fromisoformat(metadata["start_date"])
    end = date.fromisoformat(metadata["end_date"])
    if not start <= value <= end:
        _fail(field, f"must be between {start.isoformat()} and {end.isoformat()}")


def get_locations(database: Path) -> dict[str, object]:
    with closing(_connect(database)) as connection:
        locations = connection.execute(
            "SELECT id, slug, city, country_code, latitude, longitude FROM locations ORDER BY city"
        ).fetchall()
        route_rows = connection.execute(
            """
            SELECT
                origin.slug AS origin_slug,
                destination.slug AS destination_slug,
                destination.city AS destination_city,
                destination.country_code AS destination_country_code,
                r.mode,
                r.source_kind
            FROM routes r
            JOIN locations origin ON origin.id = r.origin_location_id
            JOIN locations destination ON destination.id = r.destination_location_id
            ORDER BY origin.city, destination.city, r.mode
            """
        ).fetchall()

    destinations: dict[str, dict[str, dict[str, object]]] = {}
    for row in route_rows:
        by_destination = destinations.setdefault(row["origin_slug"], {})
        destination = by_destination.setdefault(
            row["destination_slug"],
            {
                "id": row["destination_slug"],
                "city": row["destination_city"],
                "country_code": row["destination_country_code"],
                "modes": [],
                "source_kinds": [],
            },
        )
        if row["mode"] not in destination["modes"]:
            destination["modes"].append(row["mode"])
        if row["source_kind"] not in destination["source_kinds"]:
            destination["source_kinds"].append(row["source_kind"])

    return {
        "locations": [
            {
                "id": row["slug"],
                "database_id": row["id"],
                "city": row["city"],
                "display_name": f'{row["city"]}, {row["country_code"]}',
                "country_code": row["country_code"],
                "latitude": row["latitude"],
                "longitude": row["longitude"],
                "destinations": list(destinations.get(row["slug"], {}).values()),
            }
            for row in locations
        ]
    }


def get_metadata(database: Path) -> dict[str, object]:
    source_version = _source_version(database)
    with closing(_connect(database)) as connection:
        values = _metadata_values(connection)
        mode_rows = connection.execute(
            """
            SELECT r.mode, COUNT(*) AS fare_count, COUNT(DISTINCT r.id) AS route_count
            FROM fares f JOIN routes r ON r.id = f.route_id
            GROUP BY r.mode ORDER BY r.mode
            """
        ).fetchall()
        company_rows = connection.execute(
            "SELECT name, mode FROM companies ORDER BY mode, name"
        ).fetchall()
        route_rows = connection.execute(
            """
            SELECT r.route_key, r.mode, origin.slug AS origin, destination.slug AS destination,
                   r.origin_point, r.destination_point, r.source_kind
            FROM routes r
            JOIN locations origin ON origin.id = r.origin_location_id
            JOIN locations destination ON destination.id = r.destination_location_id
            ORDER BY r.mode, origin.city, destination.city
            """
        ).fetchall()

    return {
        "source_version": _verified_source_version(database, source_version),
        "timetable": {
            "start_date": values["start_date"],
            "end_date": values["end_date"],
            "fare_count": int(values["fare_count"]),
            "currency": values["currency"],
            "timestamp_semantics": values["timestamp_semantics"],
        },
        "modes": {
            row["mode"]: {
                "fare_count": row["fare_count"],
                "directional_route_count": row["route_count"],
            }
            for row in mode_rows
        },
        "companies": [dict(row) for row in company_rows],
        "routes": [dict(row) for row in route_rows],
        "source_url": values["source_url"],
        "generator": {"version": values["generator_version"], "seed": int(values["seed"])},
    }


def _location_id(connection: sqlite3.Connection, slug: str, field: str) -> int:
    row = connection.execute("SELECT id FROM locations WHERE slug = ?", (slug,)).fetchone()
    if row is None:
        _fail(field, f"unknown location {slug!r}")
    return int(row["id"])


def _mode_summaries(
    connection: sqlite3.Connection,
    *,
    origin_id: int,
    destination_id: int,
    service_date: date,
    passengers: int,
) -> dict[str, dict[str, int | None]]:
    summaries: dict[str, dict[str, int | None]] = {
        mode: {
            "count": 0,
            "minimum_price_cents": None,
            "minimum_duration_minutes": None,
        }
        for mode in MODES
    }
    rows = connection.execute(
        """
        SELECT r.mode, COUNT(*) AS result_count,
               MIN(f.price_cents) AS minimum_price_cents,
               MIN(f.duration_minutes) AS minimum_duration_minutes
        FROM routes r
        JOIN fares f ON f.route_id = r.id
        WHERE r.origin_location_id = ? AND r.destination_location_id = ?
          AND f.service_date = ? AND f.available_seats >= ? AND f.available_seats > 0
        GROUP BY r.mode
        """,
        (origin_id, destination_id, service_date.isoformat(), passengers),
    ).fetchall()
    for row in rows:
        summaries[row["mode"]] = {
            "count": row["result_count"],
            "minimum_price_cents": row["minimum_price_cents"],
            "minimum_duration_minutes": row["minimum_duration_minutes"],
        }
    return summaries


def _search_leg(
    connection: sqlite3.Connection,
    *,
    origin_slug: str,
    destination_slug: str,
    service_date: date,
    passengers: int,
    mode: str,
    sort: str,
    page: int,
    limit: int,
) -> dict[str, object]:
    origin_id = _location_id(connection, origin_slug, "origin")
    destination_id = _location_id(connection, destination_slug, "destination")
    mode_clause = "" if mode == "all" else " AND r.mode = ?"
    parameters: list[object] = [
        origin_id,
        destination_id,
        service_date.isoformat(),
        passengers,
    ]
    if mode != "all":
        parameters.append(mode)
    where = f"""
        r.origin_location_id = ? AND r.destination_location_id = ?
        AND f.service_date = ? AND f.available_seats >= ? AND f.available_seats > 0
        {mode_clause}
    """
    total = connection.execute(
        f"SELECT COUNT(*) FROM routes r JOIN fares f ON f.route_id = r.id WHERE {where}",
        parameters,
    ).fetchone()[0]
    offset = (page - 1) * limit
    rows = connection.execute(
        f"""
        SELECT f.id, r.mode, c.name AS company, f.departure_time, f.arrival_time,
               f.duration_minutes, f.price_cents, f.available_seats,
               origin.slug AS origin_id, origin.city AS origin_city,
               origin.country_code AS origin_country_code, r.origin_point,
               destination.slug AS destination_id, destination.city AS destination_city,
               destination.country_code AS destination_country_code, r.destination_point,
               r.source_kind
        FROM routes r
        JOIN fares f ON f.route_id = r.id
        JOIN companies c ON c.id = f.company_id
        JOIN locations origin ON origin.id = r.origin_location_id
        JOIN locations destination ON destination.id = r.destination_location_id
        WHERE {where}
        ORDER BY {SORTS[sort]}
        LIMIT ? OFFSET ?
        """,
        (*parameters, limit, offset),
    ).fetchall()
    results = [
        {
            "id": f'fare_{row["id"]:09d}',
            "mode": row["mode"],
            "company": row["company"],
            "departure_time": row["departure_time"],
            "arrival_time": row["arrival_time"],
            "duration_minutes": row["duration_minutes"],
            "origin": {
                "id": row["origin_id"],
                "city": row["origin_city"],
                "country_code": row["origin_country_code"],
                "point": row["origin_point"],
            },
            "destination": {
                "id": row["destination_id"],
                "city": row["destination_city"],
                "country_code": row["destination_country_code"],
                "point": row["destination_point"],
            },
            "price": round(row["price_cents"] / 100, 2),
            "price_cents": row["price_cents"],
            "price_basis": "per-passenger-including-demo-fees",
            "synthetic": True,
            "currency": "EUR",
            "available_seats": row["available_seats"],
            "source_kind": row["source_kind"],
        }
        for row in rows
    ]
    pages = (total + limit - 1) // limit
    return {
        "date": service_date.isoformat(),
        "origin": origin_slug,
        "destination": destination_slug,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages,
        "mode_summaries": _mode_summaries(
            connection,
            origin_id=origin_id,
            destination_id=destination_id,
            service_date=service_date,
            passengers=passengers,
        ),
        "results": results,
    }


def search(database: Path, query: SearchQuery) -> dict[str, object]:
    source_version = _source_version(database)
    with closing(_connect(database)) as connection:
        metadata = _metadata_values(connection)
        _validate_timetable_date(query.departure_date, metadata, "departure_date")
        if query.return_date is not None:
            _validate_timetable_date(query.return_date, metadata, "return_date")
        outbound = _search_leg(
            connection,
            origin_slug=query.origin,
            destination_slug=query.destination,
            service_date=query.departure_date,
            passengers=query.passengers,
            mode=query.mode,
            sort=query.sort,
            page=query.page,
            limit=query.limit,
        )
        return_leg = None
        if query.return_date is not None:
            return_leg = _search_leg(
                connection,
                origin_slug=query.destination,
                destination_slug=query.origin,
                service_date=query.return_date,
                passengers=query.passengers,
                mode=query.mode,
                sort=query.sort,
                page=query.page,
                limit=query.limit,
            )
    return {
        "source_version": _verified_source_version(database, source_version),
        "query": {
            "origin": query.origin,
            "destination": query.destination,
            "departure_date": query.departure_date.isoformat(),
            "return_date": query.return_date.isoformat() if query.return_date else None,
            "passengers": query.passengers,
            "mode": query.mode,
            "sort": query.sort,
        },
        "outbound": outbound,
        "return": return_leg,
    }


def dispatch(
    database: Path, path: str, query: dict[str, list[str]]
) -> tuple[HTTPStatus, dict[str, object]]:
    if path == "/api/health":
        source_version = _source_version(database)
        with closing(_connect(database)) as connection:
            fare_count = int(_metadata_values(connection)["fare_count"])
        return HTTPStatus.OK, {"status": "ok", "fare_count": fare_count, "source_version": _verified_source_version(database, source_version), "service": "omio-fare-api", "pid": os.getpid()}
    if path == "/api/locations":
        return HTTPStatus.OK, get_locations(database)
    if path == "/api/metadata":
        return HTTPStatus.OK, get_metadata(database)
    if path == "/api/search":
        return HTTPStatus.OK, search(database, parse_search_query(query))
    raise ApiError(HTTPStatus.NOT_FOUND, "not_found", f"unknown endpoint {path}")


def dispatch_post(
    database: Path, path: str, payload: object
) -> tuple[HTTPStatus, dict[str, object]]:
    source_version = _source_version(database)
    with closing(_connect(database)) as connection:
        if path == "/api/query-groups":
            response = execute_query_groups(connection, payload, source_version)
        elif path == "/api/lookup":
            response = execute_lookup(connection, payload, source_version)
        else:
            raise QueryApiError(
                HTTPStatus.NOT_FOUND,
                "invalidRequest",
                f"Unknown endpoint {path}.",
            )
    if _source_version(database) != source_version:
        raise QueryApiError(
            HTTPStatus.CONFLICT,
            "sourceChanged",
            "The fare source changed. Refresh the displayed results.",
        )
    return HTTPStatus.OK, response


def make_handler(database: Path) -> type[BaseHTTPRequestHandler]:
    class Handler(BaseHTTPRequestHandler):
        def do_OPTIONS(self) -> None:
            self.send_response(HTTPStatus.NO_CONTENT)
            self._headers("text/plain", 0)
            self.end_headers()

        def do_GET(self) -> None:
            parsed = urlparse(self.path)
            try:
                status, payload = dispatch(database, parsed.path, parse_qs(parsed.query))
            except ApiError as error:
                status = error.status
                payload = {"error": {"code": error.code, "message": error.message}}
            except Exception as error:
                self.log_error("unhandled backend error: %s", error)
                status = HTTPStatus.INTERNAL_SERVER_ERROR
                payload = {
                    "error": {
                        "code": "internal_error",
                        "message": "the server could not complete the request",
                    }
                }
            body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
            self.send_response(status)
            self._headers("application/json; charset=utf-8", len(body))
            self.end_headers()
            self.wfile.write(body)

        def do_POST(self) -> None:
            parsed = urlparse(self.path)
            request_id = "unknown"
            try:
                raw_length = self.headers.get("Content-Length")
                if raw_length is None:
                    raise QueryApiError(
                        HTTPStatus.BAD_REQUEST,
                        "invalidRequest",
                        "Content-Length is required.",
                    )
                try:
                    content_length = int(raw_length)
                except ValueError:
                    raise QueryApiError(
                        HTTPStatus.BAD_REQUEST,
                        "invalidRequest",
                        "Content-Length must be an integer.",
                    ) from None
                if not 0 < content_length <= MAX_REQUEST_BODY_BYTES:
                    raise QueryApiError(
                        HTTPStatus.BAD_REQUEST,
                        "invalidRequest",
                        f"Request body must be between 1 and {MAX_REQUEST_BODY_BYTES} bytes.",
                    )
                content_type = self.headers.get_content_type()
                if content_type != "application/json":
                    raise QueryApiError(
                        HTTPStatus.BAD_REQUEST,
                        "invalidRequest",
                        "Content-Type must be application/json.",
                    )
                self.connection.settimeout(REQUEST_READ_TIMEOUT_SECONDS)
                try:
                    payload = json.loads(self.rfile.read(content_length).decode("utf-8"))
                except (json.JSONDecodeError, UnicodeDecodeError):
                    raise QueryApiError(
                        HTTPStatus.BAD_REQUEST,
                        "invalidRequest",
                        "Request body must be valid UTF-8 JSON.",
                    ) from None
                if (
                    isinstance(payload, dict)
                    and isinstance(payload.get("requestId"), str)
                    and REQUEST_ID_PATTERN.fullmatch(payload["requestId"]) is not None
                ):
                    request_id = payload["requestId"]
                status, response = dispatch_post(database, parsed.path, payload)
            except QueryApiError as error:
                status = error.status
                response = {
                    "version": 1,
                    "requestId": request_id,
                    "error": {"code": error.code, "message": error.message},
                }
            except ApiError as error:
                status = error.status
                code = "databaseUnavailable" if error.code == "database_unavailable" else "internalError"
                message = "The fare database is unavailable." if code == "databaseUnavailable" else "The server could not complete the request."
                response = {"version": 1, "requestId": request_id, "error": {"code": code, "message": message}}
            except socket.timeout:
                status = HTTPStatus.BAD_REQUEST
                response = {
                    "version": 1,
                    "requestId": request_id,
                    "error": {"code": "invalidRequest", "message": "The request body timed out."},
                }
            except Exception as error:
                self.log_error("unhandled backend POST error: %s", error)
                status = HTTPStatus.INTERNAL_SERVER_ERROR
                response = {
                    "version": 1,
                    "requestId": request_id,
                    "error": {"code": "internalError", "message": "The server could not complete the request."},
                }
            body = json.dumps(response, separators=(",", ":")).encode("utf-8")
            self.send_response(status)
            self._headers("application/json; charset=utf-8", len(body))
            self.end_headers()
            self.wfile.write(body)

        def _headers(self, content_type: str, content_length: int) -> None:
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(content_length))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Cache-Control", "no-store")

    return Handler


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--database",
        type=Path,
        default=Path(os.environ.get("OMIO_DATABASE", DEFAULT_DATABASE)),
    )
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    arguments = parser.parse_args()
    server = ThreadingHTTPServer(
        (arguments.host, arguments.port), make_handler(arguments.database)
    )
    print(
        f"Omio demo API listening on http://{arguments.host}:{arguments.port} "
        f"using {arguments.database.resolve()}"
    )
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
