#!/usr/bin/env python3
"""Export a bounded, lossless static fare corpus from the generated SQLite fixture."""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import os
import shutil
import sqlite3
import tempfile
from collections import Counter
from datetime import date, datetime, timedelta
from pathlib import Path
SCHEMA_VERSION = 1
DEFAULT_FROM = date(2026, 12, 1)
DEFAULT_TO = date(2026, 12, 15)
FARE_TUPLE_FIELDS = [
    "id",
    "routeId",
    "companyId",
    "dayOffset",
    "departureMinutes",
    "durationMinutes",
    "priceCents",
    "availableSeats",
]


def compact_json(value: object) -> bytes:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def write_json(path: Path, value: object, *, compress: bool = False) -> dict[str, object]:
    payload = compact_json(value)
    encoded = gzip.compress(payload, compresslevel=9, mtime=0) if compress else payload
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(encoded)
    descriptor: dict[str, object] = {
        "path": path.name,
        "bytes": len(encoded),
        "sha256": hashlib.sha256(encoded).hexdigest(),
    }
    if compress:
        descriptor.update({
            "encoding": "gzip",
            "decodedBytes": len(payload),
            "decodedSha256": hashlib.sha256(payload).hexdigest(),
        })
    return descriptor


def decode_file(path: Path, descriptor: dict[str, object]) -> bytes:
    payload = path.read_bytes()
    if len(payload) != descriptor["bytes"] or hashlib.sha256(payload).hexdigest() != descriptor["sha256"]:
        raise ValueError(f"static fare asset integrity failed for {path}")
    decoded = gzip.decompress(payload) if descriptor.get("encoding") == "gzip" else payload
    if descriptor.get("encoding") == "gzip" and (
        len(decoded) != descriptor["decodedBytes"]
        or hashlib.sha256(decoded).hexdigest() != descriptor["decodedSha256"]
    ):
        raise ValueError(f"static fare decoded integrity failed for {path}")
    return decoded


def content_hash(descriptor: dict[str, object]) -> object:
    return descriptor.get("decodedSha256", descriptor["sha256"])


def parse_date(raw: str) -> date:
    parsed = date.fromisoformat(raw)
    if parsed.isoformat() != raw:
        raise argparse.ArgumentTypeError("dates must use YYYY-MM-DD")
    return parsed


def connect_read_only(database: Path) -> sqlite3.Connection:
    database = database.resolve()
    if not database.is_file():
        raise FileNotFoundError(database)
    connection = sqlite3.connect(f"file:{database}?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA query_only = ON")
    return connection


def table_rows(connection: sqlite3.Connection, query: str) -> list[list[object]]:
    return [list(row) for row in connection.execute(query)]


def minute_of_day(timestamp: str) -> int:
    return int(timestamp[11:13]) * 60 + int(timestamp[14:16])


def reconstructed_arrival(service_date: str, departure_minutes: int, duration_minutes: int) -> str:
    departure = datetime.combine(date.fromisoformat(service_date), datetime.min.time())
    arrival = departure + timedelta(minutes=departure_minutes + duration_minutes)
    return arrival.strftime("%Y-%m-%dT%H:%M")


def export(database: Path, output: Path, from_date: date, to_date: date, replace: bool) -> None:
    if to_date < from_date:
        raise ValueError("--to must be on or after --from")
    if output.exists() and not replace:
        raise FileExistsError(f"{output} exists; pass --replace to replace this generated corpus")

    output_parent = output.resolve().parent
    output_parent.mkdir(parents=True, exist_ok=True)
    temporary = Path(tempfile.mkdtemp(prefix=f".{output.name}-", dir=output_parent))
    try:
        with connect_read_only(database) as connection:
            metadata = {str(row["key"]): str(row["value"]) for row in connection.execute("SELECT key, value FROM metadata ORDER BY key")}
            source_from = date.fromisoformat(metadata["start_date"])
            source_to = date.fromisoformat(metadata["end_date"])
            if from_date < source_from or to_date > source_to:
                raise ValueError(f"requested range must stay inside {source_from} through {source_to}")

            locations = table_rows(
                connection,
                "SELECT id, slug, city, country_code, latitude, longitude FROM locations ORDER BY id",
            )
            companies = table_rows(
                connection,
                "SELECT id, name, mode FROM companies ORDER BY id",
            )
            routes = table_rows(
                connection,
                """
                SELECT id, route_key, mode, origin_location_id, destination_location_id,
                       origin_point, destination_point, base_duration_minutes, base_price_cents,
                       transfer_count, source_kind, source_url
                FROM routes ORDER BY id
                """,
            )
            route_companies = table_rows(
                connection,
                "SELECT route_id, company_id FROM route_companies ORDER BY route_id, company_id",
            )
            route_legs = table_rows(
                connection,
                """
                SELECT route_id, leg_index, mode, origin_location_id, destination_location_id,
                       origin_point, destination_point, duration_minutes, company_id
                FROM route_legs ORDER BY route_id, leg_index
                """,
            )

            locations_file = write_json(
                temporary / "locations.json",
                {
                    "schemaVersion": SCHEMA_VERSION,
                    "fields": ["id", "slug", "city", "countryCode", "latitude", "longitude"],
                    "rows": locations,
                },
            )
            companies_file = write_json(
                temporary / "companies.json",
                {"schemaVersion": SCHEMA_VERSION, "fields": ["id", "name", "mode"], "rows": companies},
            )
            routes_file = write_json(
                temporary / "routes.json.gz",
                {
                    "schemaVersion": SCHEMA_VERSION,
                    "routeFields": [
                        "id",
                        "routeKey",
                        "mode",
                        "originLocationId",
                        "destinationLocationId",
                        "originPoint",
                        "destinationPoint",
                        "baseDurationMinutes",
                        "basePriceCents",
                        "transferCount",
                        "sourceKind",
                        "sourceUrl",
                    ],
                    "routes": routes,
                    "routeCompanyFields": ["routeId", "companyId"],
                    "routeCompanies": route_companies,
                    "routeLegFields": [
                        "routeId",
                        "legIndex",
                        "mode",
                        "originLocationId",
                        "destinationLocationId",
                        "originPoint",
                        "destinationPoint",
                        "durationMinutes",
                        "companyId",
                    ],
                    "routeLegs": route_legs,
                },
                compress=True,
            )

            origin_shards: dict[str, dict[str, object]] = {}
            totals_by_date: Counter[str] = Counter()
            totals_by_mode: Counter[str] = Counter()
            sold_out = 0
            total_rows = 0
            min_duration: int | None = None
            max_duration: int | None = None
            min_price: int | None = None
            max_price: int | None = None
            min_arrival: str | None = None
            max_arrival: str | None = None
            arrivals_after_window = 0
            origin_query = """
                SELECT f.id, f.route_id, f.company_id, f.service_date, f.departure_time,
                       f.arrival_time, f.duration_minutes, f.price_cents, f.available_seats,
                       r.mode
                FROM routes r
                JOIN fares f INDEXED BY idx_fares_route_date_seats
                  ON f.route_id = r.id AND f.service_date BETWEEN ? AND ?
                WHERE r.origin_location_id = ?
                ORDER BY f.route_id, f.service_date, f.departure_time, f.id
            """
            for location_id, slug, *_rest in locations:
                rows: list[list[int]] = []
                shard_by_date: Counter[str] = Counter()
                shard_by_mode: Counter[str] = Counter()
                shard_sold_out = 0
                for row in connection.execute(origin_query, (from_date.isoformat(), to_date.isoformat(), location_id)):
                    service_date = str(row["service_date"])
                    departure_minutes = minute_of_day(str(row["departure_time"]))
                    duration_minutes = int(row["duration_minutes"])
                    arrival = reconstructed_arrival(service_date, departure_minutes, duration_minutes)
                    if arrival != row["arrival_time"]:
                        raise ValueError(f"fare {row['id']} arrival cannot be reconstructed losslessly")
                    day_offset = (date.fromisoformat(service_date) - from_date).days
                    fare = [
                        int(row["id"]),
                        int(row["route_id"]),
                        int(row["company_id"]),
                        day_offset,
                        departure_minutes,
                        duration_minutes,
                        int(row["price_cents"]),
                        int(row["available_seats"]),
                    ]
                    rows.append(fare)
                    shard_by_date[service_date] += 1
                    shard_by_mode[str(row["mode"])] += 1
                    if fare[7] == 0:
                        shard_sold_out += 1
                    min_duration = fare[5] if min_duration is None else min(min_duration, fare[5])
                    max_duration = fare[5] if max_duration is None else max(max_duration, fare[5])
                    min_price = fare[6] if min_price is None else min(min_price, fare[6])
                    max_price = fare[6] if max_price is None else max(max_price, fare[6])
                    min_arrival = arrival if min_arrival is None else min(min_arrival, arrival)
                    max_arrival = arrival if max_arrival is None else max(max_arrival, arrival)
                    arrivals_after_window += int(arrival[:10] > to_date.isoformat())
                shard_path = temporary / "origins" / f"{slug}.json.gz"
                descriptor = write_json(
                    shard_path,
                    {
                        "schemaVersion": SCHEMA_VERSION,
                        "originId": slug,
                        "from": from_date.isoformat(),
                        "to": to_date.isoformat(),
                        "fields": FARE_TUPLE_FIELDS,
                        "rows": rows,
                    },
                    compress=True,
                )
                descriptor["path"] = f"origins/{slug}.json.gz"
                descriptor["rowCount"] = len(rows)
                descriptor["soldOutCount"] = shard_sold_out
                descriptor["rowsByDate"] = dict(sorted(shard_by_date.items()))
                descriptor["rowsByMode"] = dict(sorted(shard_by_mode.items()))
                origin_shards[str(slug)] = descriptor
                total_rows += len(rows)
                sold_out += shard_sold_out
                totals_by_date.update(shard_by_date)
                totals_by_mode.update(shard_by_mode)

            expected_days = (to_date - from_date).days + 1
            if len(totals_by_date) != expected_days:
                raise ValueError(f"exported {len(totals_by_date)} dates, expected {expected_days}")
            if any(count == 0 for count in totals_by_date.values()):
                raise ValueError("every exported date must contain fares")
            if total_rows != sum(totals_by_date.values()) or total_rows != sum(totals_by_mode.values()):
                raise ValueError("export aggregate counts disagree")

            identity = {
                "schemaVersion": SCHEMA_VERSION,
                "databaseMetadata": metadata,
                "from": from_date.isoformat(),
                "to": to_date.isoformat(),
                "rowCount": total_rows,
                "files": {
                    "locations": content_hash(locations_file),
                    "companies": content_hash(companies_file),
                    "routes": content_hash(routes_file),
                    "origins": {key: content_hash(value) for key, value in sorted(origin_shards.items())},
                },
            }
            source_digest = hashlib.sha256(compact_json(identity)).hexdigest()
            source_version = f"static-fares-v1-{source_digest[:24]}"
            manifest = {
                "schemaVersion": SCHEMA_VERSION,
                "sourceVersion": source_version,
                "currency": metadata.get("currency", "EUR"),
                "dateWindow": {"from": from_date.isoformat(), "to": to_date.isoformat()},
                "rowCount": total_rows,
                "soldOutCount": sold_out,
                "rowsByDate": dict(sorted(totals_by_date.items())),
                "rowsByMode": dict(sorted(totals_by_mode.items())),
                "bounds": {
                    "durationMinutes": {"min": min_duration, "max": max_duration},
                    "priceCents": {"min": min_price, "max": max_price},
                    "arrival": {"min": min_arrival, "max": max_arrival},
                },
                "arrivalsAfterDateWindowCount": arrivals_after_window,
                "fareTupleFields": FARE_TUPLE_FIELDS,
                "databaseMetadata": metadata,
                "files": {
                    "locations": locations_file,
                    "companies": companies_file,
                    "routes": routes_file,
                },
                "originShards": dict(sorted(origin_shards.items())),
            }
            write_json(temporary / "manifest.json", manifest)

        if output.exists():
            backup = output.with_name(f".{output.name}.previous-{os.getpid()}")
            output.rename(backup)
            try:
                temporary.rename(output)
            except BaseException:
                backup.rename(output)
                raise
            shutil.rmtree(backup)
        else:
            temporary.rename(output)
        print(
            f"Exported {total_rows:,} fares ({sold_out:,} sold out) from "
            f"{from_date} through {to_date} into {output}"
        )
    except BaseException:
        if temporary.exists():
            shutil.rmtree(temporary)
        raise


def check(output: Path) -> None:
    manifest = json.loads((output / "manifest.json").read_text(encoding="utf-8"))
    if manifest.get("schemaVersion") != SCHEMA_VERSION:
        raise ValueError("unsupported static fare schema")
    row_count = 0
    sold_out_count = 0
    by_date: Counter[str] = Counter()
    by_mode: Counter[str] = Counter()
    min_duration: int | None = None
    max_duration: int | None = None
    min_price: int | None = None
    max_price: int | None = None
    for label, descriptor in manifest["files"].items():
        decode_file(output / descriptor["path"], descriptor)
    routes_payload = json.loads(decode_file(output / manifest["files"]["routes"]["path"], manifest["files"]["routes"]))
    mode_by_route = {int(row[0]): str(row[2]) for row in routes_payload["routes"]}
    min_arrival: str | None = None
    max_arrival: str | None = None
    arrivals_after_window = 0
    for origin, descriptor in manifest["originShards"].items():
        path = output / descriptor["path"]
        shard = json.loads(decode_file(path, descriptor))
        if shard["originId"] != origin or shard["fields"] != FARE_TUPLE_FIELDS:
            raise ValueError(f"static fare shard contract failed for {origin}")
        if len(shard["rows"]) != descriptor["rowCount"]:
            raise ValueError(f"static fare shard count failed for {origin}")
        for row in shard["rows"]:
            if len(row) != len(FARE_TUPLE_FIELDS):
                raise ValueError(f"invalid fare tuple in {origin}")
            service_date = (date.fromisoformat(manifest["dateWindow"]["from"]) + timedelta(days=int(row[3]))).isoformat()
            arrival = reconstructed_arrival(service_date, int(row[4]), int(row[5]))
            row_count += 1
            by_date[service_date] += 1
            by_mode[mode_by_route[int(row[1])]] += 1
            sold_out_count += int(row[7] == 0)
            min_duration = int(row[5]) if min_duration is None else min(min_duration, int(row[5]))
            max_duration = int(row[5]) if max_duration is None else max(max_duration, int(row[5]))
            min_price = int(row[6]) if min_price is None else min(min_price, int(row[6]))
            max_price = int(row[6]) if max_price is None else max(max_price, int(row[6]))
            min_arrival = arrival if min_arrival is None else min(min_arrival, arrival)
            max_arrival = arrival if max_arrival is None else max(max_arrival, arrival)
            arrivals_after_window += int(arrival[:10] > manifest["dateWindow"]["to"])
    if row_count != manifest["rowCount"]:
        raise ValueError("static fare row count does not match manifest")
    if sold_out_count != manifest["soldOutCount"]:
        raise ValueError("static fare sold-out count does not match manifest")
    if dict(sorted(by_date.items())) != manifest["rowsByDate"]:
        raise ValueError("static fare date counts do not match manifest")
    if dict(sorted(by_mode.items())) != manifest["rowsByMode"]:
        raise ValueError("static fare mode counts do not match manifest")
    if {"min": min_duration, "max": max_duration} != manifest["bounds"]["durationMinutes"]:
        raise ValueError("static fare duration bounds do not match manifest")
    if {"min": min_price, "max": max_price} != manifest["bounds"]["priceCents"]:
        raise ValueError("static fare price bounds do not match manifest")
    if {"min": min_arrival, "max": max_arrival} != manifest["bounds"]["arrival"]:
        raise ValueError("static fare arrival bounds do not match manifest")
    if arrivals_after_window != manifest["arrivalsAfterDateWindowCount"]:
        raise ValueError("static fare overnight-arrival count does not match manifest")
    identity = {
        "schemaVersion": manifest["schemaVersion"],
        "databaseMetadata": manifest["databaseMetadata"],
        "from": manifest["dateWindow"]["from"],
        "to": manifest["dateWindow"]["to"],
        "rowCount": manifest["rowCount"],
        "files": {
            "locations": content_hash(manifest["files"]["locations"]),
            "companies": content_hash(manifest["files"]["companies"]),
            "routes": content_hash(manifest["files"]["routes"]),
            "origins": {key: content_hash(value) for key, value in sorted(manifest["originShards"].items())},
        },
    }
    expected_version = f"static-fares-v1-{hashlib.sha256(compact_json(identity)).hexdigest()[:24]}"
    if manifest["sourceVersion"] != expected_version:
        raise ValueError("static fare source version does not match its canonical content identity")
    print(f"Verified {row_count:,} static fares across {len(manifest['originShards'])} origin shards")


def check_source(database: Path, output: Path) -> None:
    manifest = json.loads((output / "manifest.json").read_text(encoding="utf-8"))
    from_date = date.fromisoformat(manifest["dateWindow"]["from"])
    to_date = date.fromisoformat(manifest["dateWindow"]["to"])
    with connect_read_only(database) as connection:
        metadata = {str(row["key"]): str(row["value"]) for row in connection.execute("SELECT key, value FROM metadata ORDER BY key")}
        if metadata != manifest["databaseMetadata"]:
            raise ValueError("static fare database metadata no longer matches its source")
        locations = table_rows(connection, "SELECT id, slug, city, country_code, latitude, longitude FROM locations ORDER BY id")
        companies = table_rows(connection, "SELECT id, name, mode FROM companies ORDER BY id")
        routes = table_rows(
            connection,
            """
            SELECT id, route_key, mode, origin_location_id, destination_location_id,
                   origin_point, destination_point, base_duration_minutes, base_price_cents,
                   transfer_count, source_kind, source_url
            FROM routes ORDER BY id
            """,
        )
        route_companies = table_rows(connection, "SELECT route_id, company_id FROM route_companies ORDER BY route_id, company_id")
        route_legs = table_rows(
            connection,
            """
            SELECT route_id, leg_index, mode, origin_location_id, destination_location_id,
                   origin_point, destination_point, duration_minutes, company_id
            FROM route_legs ORDER BY route_id, leg_index
            """,
        )
        expected_dictionaries = {
            "locations": {"schemaVersion": SCHEMA_VERSION, "fields": ["id", "slug", "city", "countryCode", "latitude", "longitude"], "rows": locations},
            "companies": {"schemaVersion": SCHEMA_VERSION, "fields": ["id", "name", "mode"], "rows": companies},
            "routes": {
                "schemaVersion": SCHEMA_VERSION,
                "routeFields": ["id", "routeKey", "mode", "originLocationId", "destinationLocationId", "originPoint", "destinationPoint", "baseDurationMinutes", "basePriceCents", "transferCount", "sourceKind", "sourceUrl"],
                "routes": routes,
                "routeCompanyFields": ["routeId", "companyId"],
                "routeCompanies": route_companies,
                "routeLegFields": ["routeId", "legIndex", "mode", "originLocationId", "destinationLocationId", "originPoint", "destinationPoint", "durationMinutes", "companyId"],
                "routeLegs": route_legs,
            },
        }
        for label, value in expected_dictionaries.items():
            if hashlib.sha256(compact_json(value)).hexdigest() != content_hash(manifest["files"][label]):
                raise ValueError(f"static fare {label} no longer matches its source database")

        query = """
            SELECT f.id, f.route_id, f.company_id, f.service_date, f.departure_time,
                   f.arrival_time, f.duration_minutes, f.price_cents, f.available_seats
            FROM routes r
            JOIN fares f INDEXED BY idx_fares_route_date_seats
              ON f.route_id = r.id AND f.service_date BETWEEN ? AND ?
            WHERE r.origin_location_id = ?
            ORDER BY f.route_id, f.service_date, f.departure_time, f.id
        """
        for location_id, slug, *_rest in locations:
            rows: list[list[int]] = []
            for row in connection.execute(query, (from_date.isoformat(), to_date.isoformat(), location_id)):
                service_date = str(row["service_date"])
                departure_minutes = minute_of_day(str(row["departure_time"]))
                duration_minutes = int(row["duration_minutes"])
                if reconstructed_arrival(service_date, departure_minutes, duration_minutes) != row["arrival_time"]:
                    raise ValueError(f"fare {row['id']} arrival cannot be reconstructed losslessly")
                rows.append([
                    int(row["id"]), int(row["route_id"]), int(row["company_id"]),
                    (date.fromisoformat(service_date) - from_date).days,
                    departure_minutes, duration_minutes, int(row["price_cents"]), int(row["available_seats"]),
                ])
            shard = {
                "schemaVersion": SCHEMA_VERSION,
                "originId": slug,
                "from": from_date.isoformat(),
                "to": to_date.isoformat(),
                "fields": FARE_TUPLE_FIELDS,
                "rows": rows,
            }
            if hashlib.sha256(compact_json(shard)).hexdigest() != content_hash(manifest["originShards"][slug]):
                raise ValueError(f"static fare shard {slug} no longer matches its source database")
    print(f"Verified static fares losslessly against source database {database}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", type=Path, default=Path("data/omio.sqlite3"))
    parser.add_argument("--output", type=Path, default=Path("site/data/fares-v1"))
    parser.add_argument("--from", dest="from_date", type=parse_date, default=DEFAULT_FROM)
    parser.add_argument("--to", dest="to_date", type=parse_date, default=DEFAULT_TO)
    parser.add_argument("--replace", action="store_true")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    if args.check:
        check(args.output)
        if args.database.is_file():
            check_source(args.database, args.output)
        else:
            print(f"Source database {args.database} is absent; skipped source comparison")
    else:
        export(args.database, args.output, args.from_date, args.to_date, args.replace)


if __name__ == "__main__":
    main()
