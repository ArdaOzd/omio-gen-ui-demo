"""Verify a generated timetable database against its schema and source manifest."""

from __future__ import annotations

import argparse
import sqlite3
from contextlib import closing
from datetime import date
from pathlib import Path

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


def verify_database(database: Path, *, expected_rows: int) -> dict[str, int | str]:
    database = database.resolve()
    _require(database.is_file(), f"database not found: {database}")
    with closing(sqlite3.connect(f"file:{database}?mode=ro", uri=True)) as connection:
        metadata = dict(connection.execute("SELECT key, value FROM metadata"))
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
               OR arrival_time <= departure_time
            """
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

    _require(fare_count == expected_rows, f"expected {expected_rows} fares, found {fare_count}")
    _require(metadata["fare_count"] == str(expected_rows), "metadata fare_count mismatch")
    _require(route_days == route_count * service_days, "daily route coverage is incomplete")
    _require(invalid_fares == 0, f"found {invalid_fares} invalid fares")
    _require(integrity == "ok", f"integrity_check returned {integrity!r}")
    _require(EXPECTED_INDEXES <= indexes, "one or more required indexes are missing")
    _require(set(SOURCE_DESTINATION_SLUGS) <= locations, "source destinations are missing")
    _require(all(item in routes for item in SOURCE_MODE_PAIRS), "source mode routes are missing")
    route_pairs = {(origin, destination) for _, origin, destination in routes}
    _require(all(item in route_pairs for item in SOURCE_GENERAL_PAIRS), "source corridors are missing")
    _require(set(SOURCE_COMPANIES) <= providers_with_fares, "source providers lack fares")
    _require(
        set(SOURCE_COMPANY_ALIASES.values()) <= providers_with_fares,
        "normalized source providers lack fares",
    )
    return {
        "path": str(database),
        "fare_count": fare_count,
        "directional_route_count": route_count,
        "route_day_count": route_days,
        "company_count": company_count,
        "location_count": location_count,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "size_bytes": database.stat().st_size,
        "integrity": integrity,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("database", type=Path, nargs="?", default=Path("data/omio.sqlite3"))
    parser.add_argument("--expected-rows", type=int, default=1_000_000)
    arguments = parser.parse_args()
    summary = verify_database(arguments.database, expected_rows=arguments.expected_rows)
    for key, value in summary.items():
        print(f"{key}: {value}")


if __name__ == "__main__":
    main()
