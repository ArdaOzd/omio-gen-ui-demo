"""Verify a generated timetable database against its schema and source manifest."""

from __future__ import annotations

import argparse
import json
import sqlite3
from contextlib import closing
from datetime import date
from pathlib import Path
from typing import Literal

from backend.app import _source_version

from backend.generate_db import DEFAULT_ROW_COUNT
from backend.seeds import (
    SOURCE_COMPANIES,
    SOURCE_COMPANY_ALIASES,
    SOURCE_DESTINATION_SLUGS,
    SOURCE_GENERAL_PAIRS,
    SOURCE_MODE_PAIRS,
)


EXPECTED_INDEXES = {
    "idx_routes_origin_destination_mode",
    "idx_fares_route_date_seats",
    "idx_fares_route_date_price",
    "idx_fares_route_date_duration",
    "idx_fares_company",
}


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def verify_database(database: Path, *, expected_rows: int, manifest_policy: Literal["current", "preserved-v2"] = "current") -> dict[str, object]:
    database = database.resolve()
    _require(database.is_file(), f"database not found: {database}")
    _require(manifest_policy in ("current", "preserved-v2"), "unknown manifest policy")
    source_version = _source_version(database)
    source_stat = database.stat()
    with closing(sqlite3.connect(f"file:{database}?mode=ro", uri=True)) as connection:
        connection.execute("BEGIN")
        metadata = dict(connection.execute("SELECT key, value FROM metadata"))
        if manifest_policy == "preserved-v2":
            _require(metadata.get("generator_version") == "2", "preserved-v2 requires generator version2")
            _require(metadata.get("dataset_type") == "synthetic_demo", "preserved-v2 requires declared synthetic demo metadata")
            _require(metadata.get("currency") == "EUR", "preserved-v2 requires EUR metadata")
        fare_count = connection.execute("SELECT COUNT(*) FROM fares").fetchone()[0]
        route_count = connection.execute("SELECT COUNT(*) FROM routes").fetchone()[0]
        company_count = connection.execute("SELECT COUNT(*) FROM companies").fetchone()[0]
        location_count = connection.execute("SELECT COUNT(*) FROM locations").fetchone()[0]
        start = date.fromisoformat(metadata["start_date"])
        end = date.fromisoformat(metadata["end_date"])
        service_days = (end - start).days + 1
        route_days = connection.execute(
            """
            SELECT COUNT(*) FROM (
                SELECT route_id, service_date FROM fares GROUP BY route_id, service_date
            )
            """
        ).fetchone()[0]
        invalid_fares = connection.execute(
            """
            SELECT COUNT(*) FROM fares
            WHERE available_seats < 0 OR duration_minutes <= 0 OR price_cents <= 0
               OR arrival_time <= departure_time OR service_date < ? OR service_date > ?
            """,
            (start.isoformat(), end.isoformat()),
        ).fetchone()[0]
        locations = {row[0] for row in connection.execute("SELECT slug FROM locations")}
        routes = {
            (mode, origin, destination)
            for mode, origin, destination in connection.execute(
                """
                SELECT r.mode, origin.slug, destination.slug
                FROM routes r
                JOIN locations origin ON origin.id = r.origin_location_id
                JOIN locations destination ON destination.id = r.destination_location_id
                """
            )
        }
        providers_with_fares = {
            row[0]
            for row in connection.execute(
                """
                SELECT c.name FROM companies c JOIN fares f ON f.company_id = c.id
                GROUP BY c.id HAVING COUNT(f.id) > 0
                """
            )
        }
        indexes = {
            row[0]
            for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type = 'index'"
            )
        }
        integrity = connection.execute("PRAGMA integrity_check").fetchone()[0]
        foreign_key_violation = connection.execute("PRAGMA foreign_key_check").fetchone()

    _require(fare_count == expected_rows, f"expected {expected_rows} fares, found {fare_count}")
    _require(metadata["fare_count"] == str(expected_rows), "metadata fare_count mismatch")
    _require(route_days == route_count * service_days, "daily route coverage is incomplete")
    _require(invalid_fares == 0, f"found {invalid_fares} invalid fares")
    _require(integrity == "ok", f"integrity_check returned {integrity!r}")
    _require(EXPECTED_INDEXES <= indexes, "one or more required indexes are missing")
    _require(foreign_key_violation is None, "foreign key integrity violation")
    _require(_source_version(database) == source_version, "source changed during verification")
    route_pairs = {(origin, destination) for _, origin, destination in routes}
    drift = {
        "missing_destinations": sorted(set(SOURCE_DESTINATION_SLUGS) - locations),
        "missing_mode_routes": sorted(set(SOURCE_MODE_PAIRS) - routes),
        "missing_corridors": sorted(set(SOURCE_GENERAL_PAIRS) - route_pairs),
        "missing_providers": sorted(set(SOURCE_COMPANIES) - providers_with_fares),
        "missing_normalized_providers": sorted(set(SOURCE_COMPANY_ALIASES.values()) - providers_with_fares),
    }
    if manifest_policy == "current":
        _require(not drift["missing_destinations"], "source destinations are missing")
        _require(not drift["missing_mode_routes"], "source mode routes are missing")
        _require(not drift["missing_corridors"], "source corridors are missing")
        _require(not drift["missing_providers"], "source providers lack fares")
        _require(not drift["missing_normalized_providers"], "normalized source providers lack fares")
    return {
        "path": str(database),
        "source_version": source_version,
        "generator_version": metadata.get("generator_version", "unknown"),
        "verification_profile": manifest_policy,
        "source_manifest_status": "drift" if any(drift.values()) else "current",
        "source_manifest_drift": drift,
        "capabilities": {"modes": sorted({mode for mode, _, _ in routes}), "location_slugs": sorted(locations)},
        "fare_count": fare_count,
        "directional_route_count": route_count,
        "route_day_count": route_days,
        "company_count": company_count,
        "location_count": location_count,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "size_bytes": source_stat.st_size,
        "integrity": integrity,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("database", type=Path, nargs="?", default=Path("data/omio.sqlite3"))
    parser.add_argument("--expected-rows", type=int, default=DEFAULT_ROW_COUNT)
    parser.add_argument("--manifest-policy", choices=("current", "preserved-v2"), default="current", help="current is strict; preserved-v2 explicitly reports catalog drift without relaxing database integrity checks")
    parser.add_argument("--json", action="store_true")
    arguments = parser.parse_args()
    summary = verify_database(arguments.database, expected_rows=arguments.expected_rows, manifest_policy=arguments.manifest_policy)
    if arguments.json:
        print(json.dumps(summary, indent=2))
        return
    for key, value in summary.items():
        print(f"{key}: {value}")


if __name__ == "__main__":
    main()
