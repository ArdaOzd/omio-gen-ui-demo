"""Dependency-free HTTP API for searching the synthetic timetable."""

from __future__ import annotations

import argparse
import json
import os
import sqlite3
from contextlib import closing
from dataclasses import dataclass
from datetime import date
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Never
from urllib.parse import parse_qs, urlparse

from backend.generate_db import (
    DEFAULT_END_DATE,
    DEFAULT_ROW_COUNT,
    DEFAULT_START_DATE,
    GENERATOR_VERSION,
    SCHEMA_VERSION,
)


DEFAULT_DATABASE = Path(__file__).resolve().parents[1] / "data" / "omio.sqlite3"
MODES = ("train", "bus", "flight", "ferry")
MODE_FARE_COUNT_KEYS = {mode: f"fare_count_{mode}" for mode in MODES}
EXPECTED_COVERAGE_MODEL = "all_ordered_pairs_daily"
EXPECTED_LOCATION_SCOPE = "strict_geographic_europe"
EXPECTED_LOCATION_COUNT = 120
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
    return f"sqlite-demo-v{GENERATOR_VERSION}-{stat.st_ino:x}-{stat.st_size:x}-{stat.st_mtime_ns:x}"


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
    connection = sqlite3.connect(f"file:{database}?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA query_only = ON")
    return connection


def _metadata_values(connection: sqlite3.Connection) -> dict[str, str]:
    return {row["key"]: row["value"] for row in connection.execute("SELECT key, value FROM metadata")}


def validate_database_contract(database: Path) -> dict[str, str]:
    """Reject a stale fixture before the API begins serving it."""
    with closing(_connect(database)) as connection:
        values = _metadata_values(connection)
        expected = {
            "generator_version": str(GENERATOR_VERSION),
            "schema_version": str(SCHEMA_VERSION),
            "coverage_model": EXPECTED_COVERAGE_MODEL,
            "location_scope": EXPECTED_LOCATION_SCOPE,
            "start_date": DEFAULT_START_DATE.isoformat(),
            "end_date": DEFAULT_END_DATE.isoformat(),
            "fare_count": str(DEFAULT_ROW_COUNT),
        }
        mismatches = [
            f"{key}={values.get(key)!r} (expected {expected_value!r})"
            for key, expected_value in expected.items()
            if values.get(key) != expected_value
        ]
        mode_fare_counts: dict[str, int] = {}
        for mode, key in MODE_FARE_COUNT_KEYS.items():
            raw_count = values.get(key)
            try:
                count = int(raw_count) if raw_count is not None else -1
            except ValueError:
                count = -1
            if count < 0:
                mismatches.append(f"{key}={raw_count!r} (expected a non-negative integer)")
            else:
                mode_fare_counts[mode] = count
        if len(mode_fare_counts) == len(MODES) and sum(mode_fare_counts.values()) != DEFAULT_ROW_COUNT:
            mismatches.append(
                "cached mode fare counts do not sum to "
                f"{DEFAULT_ROW_COUNT!r}"
            )
        location_count = connection.execute("SELECT COUNT(*) FROM locations").fetchone()[0]
        if location_count != EXPECTED_LOCATION_COUNT:
            mismatches.append(
                f"location_count={location_count!r} (expected {EXPECTED_LOCATION_COUNT!r})"
            )
        route_columns = {
            row[1] for row in connection.execute("PRAGMA table_info(routes)")
        }
        leg_columns = {
            row[1] for row in connection.execute("PRAGMA table_info(route_legs)")
        }
        if "transfer_count" not in route_columns:
            mismatches.append("routes.transfer_count is missing")
        required_leg_columns = {
            "route_id",
            "leg_index",
            "mode",
            "origin_location_id",
            "destination_location_id",
            "origin_point",
            "destination_point",
            "duration_minutes",
            "company_id",
        }
        missing_leg_columns = sorted(required_leg_columns - leg_columns)
        if missing_leg_columns:
            mismatches.append(
                f"route_legs columns are missing: {', '.join(missing_leg_columns)}"
            )
    if mismatches:
        raise RuntimeError(
            "The fare database does not match the current dataset contract; "
            "regenerate it with `npm run seed`. " + "; ".join(mismatches)
        )
    return values


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
            "SELECT mode, COUNT(*) AS route_count FROM routes GROUP BY mode ORDER BY mode"
        ).fetchall()
        route_counts = {row["mode"]: row["route_count"] for row in mode_rows}
        company_rows = connection.execute(
            "SELECT name, mode FROM companies ORDER BY mode, name"
        ).fetchall()
        location_count = connection.execute("SELECT COUNT(*) FROM locations").fetchone()[0]
        route_count = connection.execute("SELECT COUNT(*) FROM routes").fetchone()[0]
        route_rows = connection.execute(
            """
            SELECT r.route_key, r.mode, origin.slug AS origin, destination.slug AS destination,
                   r.origin_point, r.destination_point, r.transfer_count, r.source_kind
            FROM routes r
            JOIN locations origin ON origin.id = r.origin_location_id
            JOIN locations destination ON destination.id = r.destination_location_id
            ORDER BY r.mode, origin.city, destination.city
            """
        ).fetchall()

    return {
        "source_version": _verified_source_version(database, source_version),
        "schema_version": int(values["schema_version"]),
        "coverage_model": values["coverage_model"],
        "location_scope": values["location_scope"],
        "location_count": location_count,
        "route_count": route_count,
        "timetable": {
            "start_date": values["start_date"],
            "end_date": values["end_date"],
            "fare_count": int(values["fare_count"]),
            "currency": values["currency"],
            "timestamp_semantics": values["timestamp_semantics"],
        },
        "modes": {
            mode: {
                "fare_count": int(values[MODE_FARE_COUNT_KEYS[mode]]),
                "directional_route_count": route_counts.get(mode, 0),
            }
            for mode in MODES
        },
        "companies": [dict(row) for row in company_rows],
        "routes": [dict(row) for row in route_rows],
        "source_url": values["source_url"],
        "generator": {"version": values["generator_version"], "seed": int(values["seed"])},
    }


def _route_legs(
    connection: sqlite3.Connection, route_ids: list[int]
) -> dict[int, list[dict[str, object]]]:
    if not route_ids:
        return {}
    placeholders = ",".join("?" for _ in route_ids)
    rows = connection.execute(
        f"""
        SELECT leg.route_id, leg.leg_index, leg.mode, company.name AS company,
               leg.duration_minutes,
               origin.slug AS origin_id, origin.city AS origin_city,
               origin.country_code AS origin_country_code, leg.origin_point,
               destination.slug AS destination_id, destination.city AS destination_city,
               destination.country_code AS destination_country_code, leg.destination_point
        FROM route_legs leg
        JOIN companies company ON company.id = leg.company_id
        JOIN locations origin ON origin.id = leg.origin_location_id
        JOIN locations destination ON destination.id = leg.destination_location_id
        WHERE leg.route_id IN ({placeholders})
        ORDER BY leg.route_id, leg.leg_index
        """,
        route_ids,
    ).fetchall()
    by_route: dict[int, list[dict[str, object]]] = {}
    for row in rows:
        by_route.setdefault(row["route_id"], []).append(
            {
                "leg_index": row["leg_index"],
                "mode": row["mode"],
                "company": row["company"],
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
            }
        )
    return by_route


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
        SELECT f.id, r.id AS route_id, r.mode, r.transfer_count,
               c.name AS company, f.departure_time, f.arrival_time,
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
    legs_by_route = _route_legs(connection, list({row["route_id"] for row in rows}))
    results = [
        {
            "id": f'fare_{row["id"]:09d}',
            "mode": row["mode"],
            "company": row["company"],
            "transfers": row["transfer_count"],
            "legs": legs_by_route[row["route_id"]],
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
            values = _metadata_values(connection)
            fare_count = int(values["fare_count"])
        return HTTPStatus.OK, {
            "status": "ok",
            "fare_count": fare_count,
            "generator_version": int(values["generator_version"]),
            "schema_version": int(values["schema_version"]),
            "coverage_model": values["coverage_model"],
            "source_version": _verified_source_version(database, source_version),
            "service": "omio-fare-api",
            "pid": os.getpid(),
        }
    if path == "/api/locations":
        return HTTPStatus.OK, get_locations(database)
    if path == "/api/metadata":
        return HTTPStatus.OK, get_metadata(database)
    if path == "/api/search":
        return HTTPStatus.OK, search(database, parse_search_query(query))
    raise ApiError(HTTPStatus.NOT_FOUND, "not_found", f"unknown endpoint {path}")


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

        def _headers(self, content_type: str, content_length: int) -> None:
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(content_length))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
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
    parser.add_argument(
        "--check-contract",
        action="store_true",
        help="validate the database contract and exit",
    )
    arguments = parser.parse_args()
    try:
        validate_database_contract(arguments.database)
    except ApiError as error:
        parser.error(error.message)
    except RuntimeError as error:
        parser.error(str(error))
    if arguments.check_contract:
        print(f"Validated fare database contract at {arguments.database.resolve()}")
        return
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
