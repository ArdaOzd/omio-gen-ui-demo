"""Verify the current synthetic timetable database and its coverage contract."""

from __future__ import annotations

import argparse
import json
import sqlite3
from contextlib import closing
from datetime import date
from math import asin, cos, radians, sin, sqrt
from pathlib import Path

from backend.app import _source_version
from backend.generate_db import (
    DEFAULT_END_DATE,
    DEFAULT_ROW_COUNT,
    DEFAULT_START_DATE,
    GENERATOR_VERSION,
)
from backend.seeds import (
    AIRPORTLESS_GATEWAYS,
    BUS_CORRIDORS,
    FERRY_CORRIDORS,
    ISLAND_REGIONS,
    LOCATIONS,
    MODE_PRIORITY,
    SOURCE_COMPANIES,
    SOURCE_COMPANY_ALIASES,
    SOURCE_DESTINATION_SLUGS,
    SOURCE_GENERAL_PAIRS,
    SOURCE_MODE_PAIRS,
    TRAIN_CORRIDORS,
    TRANSFER_BUFFER_MINUTES,
)


EXPECTED_COVERAGE_MODEL = "all_ordered_pairs_daily"
EXPECTED_LOCATION_SCOPE = "strict_geographic_europe"
EXPECTED_SCHEMA_VERSION = "3"
MAX_MODE_SPEED_KMH = {
    "bus": 90,
    "train": 160,
    "flight": 900,
    "ferry": 60,
}
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


def _distance_km(
    origin_latitude: float,
    origin_longitude: float,
    destination_latitude: float,
    destination_longitude: float,
) -> float:
    origin_latitude_radians = radians(origin_latitude)
    destination_latitude_radians = radians(destination_latitude)
    delta_latitude = destination_latitude_radians - origin_latitude_radians
    delta_longitude = radians(destination_longitude - origin_longitude)
    haversine = (
        sin(delta_latitude / 2) ** 2
        + cos(origin_latitude_radians)
        * cos(destination_latitude_radians)
        * sin(delta_longitude / 2) ** 2
    )
    return 6371 * 2 * asin(sqrt(haversine))


def verify_database(
    database: Path,
    *,
    expected_rows: int = DEFAULT_ROW_COUNT,
    expected_start_date: date = DEFAULT_START_DATE,
    expected_end_date: date = DEFAULT_END_DATE,
) -> dict[str, object]:
    database = database.resolve()
    _require(database.is_file(), f"database not found: {database}")
    source_version = _source_version(database)
    source_stat = database.stat()

    with closing(sqlite3.connect(f"file:{database}?mode=ro", uri=True)) as connection:
        connection.execute("BEGIN")
        metadata = dict(connection.execute("SELECT key, value FROM metadata"))
        _require(
            metadata.get("generator_version") == GENERATOR_VERSION,
            "generator version does not match the current generator",
        )
        _require(
            metadata.get("coverage_model") == EXPECTED_COVERAGE_MODEL,
            "coverage_model must declare all ordered pairs daily",
        )
        _require(
            metadata.get("location_scope") == EXPECTED_LOCATION_SCOPE,
            "location_scope must declare strict geographic Europe",
        )
        _require(
            metadata.get("schema_version") == EXPECTED_SCHEMA_VERSION,
            "schema_version must match the route-leg schema",
        )
        _require(
            metadata.get("dataset_type") == "synthetic_demo",
            "dataset_type must declare synthetic_demo",
        )
        _require(metadata.get("currency") == "EUR", "currency metadata must be EUR")

        start = date.fromisoformat(metadata["start_date"])
        end = date.fromisoformat(metadata["end_date"])
        _require(start == expected_start_date, f"start_date must be {expected_start_date}")
        _require(end == expected_end_date, f"end_date must be {expected_end_date}")
        service_days = (end - start).days + 1

        tables = {
            row[0]
            for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            )
        }
        _require("route_legs" in tables, "route_legs table is missing")

        fare_count = connection.execute("SELECT COUNT(*) FROM fares").fetchone()[0]
        mode_fare_counts: dict[str, int] = {}
        for mode in MAX_MODE_SPEED_KMH:
            value = metadata.get(f"fare_count_{mode}")
            _require(
                value is not None and value.isdigit(),
                f"fare_count_{mode} metadata must be a nonnegative integer",
            )
            mode_fare_counts[mode] = int(value)
        actual_mode_fare_counts = dict(
            connection.execute(
                """
                SELECT r.mode, COUNT(*)
                FROM fares f JOIN routes r ON r.id = f.route_id
                GROUP BY r.mode
                """
            )
        )
        route_count = connection.execute("SELECT COUNT(*) FROM routes").fetchone()[0]
        company_count = connection.execute("SELECT COUNT(*) FROM companies").fetchone()[0]
        location_count = connection.execute("SELECT COUNT(*) FROM locations").fetchone()[0]
        route_leg_count = connection.execute("SELECT COUNT(*) FROM route_legs").fetchone()[0]

        date_range = connection.execute(
            "SELECT MIN(service_date), MAX(service_date), COUNT(DISTINCT service_date) FROM fares"
        ).fetchone()
        route_pair_count = connection.execute(
            """
            SELECT COUNT(*) FROM (
                SELECT origin_location_id, destination_location_id
                FROM routes
                WHERE origin_location_id <> destination_location_id
                GROUP BY origin_location_id, destination_location_id
            )
            """
        ).fetchone()[0]
        route_days = connection.execute(
            """
            SELECT COUNT(*) FROM (
                SELECT route_id, service_date FROM fares GROUP BY route_id, service_date
            )
            """
        ).fetchone()[0]
        feasible_route_days = connection.execute(
            """
            SELECT COUNT(*) FROM (
                SELECT route_id, service_date
                FROM fares
                WHERE available_seats >= 1
                GROUP BY route_id, service_date
            )
            """
        ).fetchone()[0]
        pair_days = connection.execute(
            """
            SELECT COUNT(*) FROM (
                SELECT r.origin_location_id, r.destination_location_id, f.service_date
                FROM fares f JOIN routes r ON r.id = f.route_id
                WHERE r.origin_location_id <> r.destination_location_id
                GROUP BY r.origin_location_id, r.destination_location_id, f.service_date
            )
            """
        ).fetchone()[0]
        feasible_pair_days = connection.execute(
            """
            SELECT COUNT(*) FROM (
                SELECT r.origin_location_id, r.destination_location_id, f.service_date
                FROM fares f JOIN routes r ON r.id = f.route_id
                WHERE r.origin_location_id <> r.destination_location_id
                  AND f.available_seats >= 1
                GROUP BY r.origin_location_id, r.destination_location_id, f.service_date
            )
            """
        ).fetchone()[0]

        invalid_fares = connection.execute(
            """
            SELECT COUNT(*) FROM fares f JOIN routes r ON r.id = f.route_id
            WHERE f.available_seats < 0 OR f.duration_minutes <= 0
               OR f.price_cents <= 0
               OR f.duration_minutes < r.base_duration_minutes
               OR datetime(f.departure_time) IS NULL
               OR datetime(f.arrival_time) IS NULL
               OR datetime(f.arrival_time) <= datetime(f.departure_time)
               OR date(f.departure_time) <> f.service_date
               OR CAST(ROUND(
                      (julianday(f.arrival_time) - julianday(f.departure_time)) * 1440
                  ) AS INTEGER) <> f.duration_minutes
               OR f.service_date < ? OR f.service_date > ?
            """,
            (start.isoformat(), end.isoformat()),
        ).fetchone()[0]
        fares_outside_route_company = connection.execute(
            """
            SELECT COUNT(*)
            FROM fares f
            LEFT JOIN route_companies rc
              ON rc.route_id = f.route_id AND rc.company_id = f.company_id
            WHERE rc.route_id IS NULL
            """
        ).fetchone()[0]
        priority_sql = "CASE leg.mode " + " ".join(
            f"WHEN '{mode}' THEN {priority}"
            for mode, priority in MODE_PRIORITY.items()
        ) + " ELSE 99 END"
        invalid_route_companies = connection.execute(
            f"""
            WITH company_stats AS (
                SELECT route_id, COUNT(*) AS company_count,
                       MIN(company_id) AS company_id
                FROM route_companies
                GROUP BY route_id
            )
            SELECT COUNT(*)
            FROM routes r
            LEFT JOIN company_stats companies ON companies.route_id = r.id
            WHERE companies.company_count <> 1
               OR companies.company_id <> COALESCE(
                    (
                        SELECT leg.company_id FROM route_legs leg
                        WHERE leg.route_id = r.id
                        ORDER BY leg.duration_minutes DESC,
                                 {priority_sql},
                                 leg.leg_index
                        LIMIT 1
                    ),
                    -1
               )
            """
        ).fetchone()[0]
        invalid_leg_company_modes = connection.execute(
            """
            SELECT COUNT(*)
            FROM route_legs leg JOIN companies c ON c.id = leg.company_id
            WHERE leg.mode <> c.mode
            """
        ).fetchone()[0]
        invalid_leg_sequences = connection.execute(
            """
            WITH leg_stats AS (
                SELECT route_id, COUNT(*) AS leg_count,
                       COUNT(DISTINCT leg_index) AS distinct_indexes,
                       MIN(leg_index) AS first_index, MAX(leg_index) AS last_index,
                       SUM(duration_minutes) AS travel_minutes
                FROM route_legs GROUP BY route_id
            )
            SELECT COUNT(*)
            FROM routes r LEFT JOIN leg_stats s ON s.route_id = r.id
            WHERE s.route_id IS NULL OR s.first_index <> 0
               OR s.last_index <> s.leg_count - 1
               OR s.distinct_indexes <> s.leg_count
               OR r.transfer_count <> s.leg_count - 1
               OR r.base_duration_minutes <>
                  s.travel_minutes + r.transfer_count * ?
            """,
            (TRANSFER_BUFFER_MINUTES,),
        ).fetchone()[0]
        invalid_leg_endpoints = connection.execute(
            """
            SELECT COUNT(*)
            FROM routes r
            LEFT JOIN route_legs first_leg
              ON first_leg.route_id = r.id AND first_leg.leg_index = 0
            LEFT JOIN route_legs last_leg
              ON last_leg.route_id = r.id AND last_leg.leg_index = r.transfer_count
            WHERE first_leg.route_id IS NULL OR last_leg.route_id IS NULL
               OR first_leg.origin_location_id <> r.origin_location_id
               OR last_leg.destination_location_id <> r.destination_location_id
            """
        ).fetchone()[0]
        discontinuous_legs = connection.execute(
            """
            SELECT COUNT(*)
            FROM route_legs leg
            JOIN route_legs next_leg
              ON next_leg.route_id = leg.route_id
             AND next_leg.leg_index = leg.leg_index + 1
            WHERE leg.destination_location_id <> next_leg.origin_location_id
            """
        ).fetchone()[0]
        invalid_dominant_modes = connection.execute(
            f"""
            SELECT COUNT(*)
            FROM routes r
            WHERE r.mode <> COALESCE(
                (
                    SELECT leg.mode FROM route_legs leg
                    WHERE leg.route_id = r.id
                    ORDER BY leg.duration_minutes DESC,
                             {priority_sql},
                             leg.leg_index
                    LIMIT 1
                ),
                ''
            )
            """
        ).fetchone()[0]

        leg_geometries = connection.execute(
            """
            SELECT leg.mode, leg.duration_minutes,
                   origin.slug, origin.latitude, origin.longitude,
                   destination.slug, destination.latitude, destination.longitude
            FROM route_legs leg
            JOIN locations origin ON origin.id = leg.origin_location_id
            JOIN locations destination ON destination.id = leg.destination_location_id
            """
        ).fetchall()

        locations = {row[0] for row in connection.execute("SELECT slug FROM locations")}
        location_rows = set(
            connection.execute(
                """
                SELECT slug, city, country_code, latitude, longitude
                FROM locations
                """
            )
        )
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
        providers_in_database = {
            row[0] for row in connection.execute("SELECT name FROM companies")
        }
        indexes = {
            row[0]
            for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type = 'index'"
            )
        }
        integrity = connection.execute("PRAGMA integrity_check").fetchone()[0]
        foreign_key_violation = connection.execute("PRAGMA foreign_key_check").fetchone()

    seed_location_rows = {
        (
            location.slug,
            location.city,
            location.country_code,
            location.latitude,
            location.longitude,
        )
        for location in LOCATIONS
    }
    invalid_leg_durations = []
    forbidden_airportless_flights = []
    forbidden_cross_water_ground_legs = []
    observed_ferry_corridors: set[frozenset[str]] = set()
    for (
        mode,
        duration_minutes,
        origin,
        origin_latitude,
        origin_longitude,
        destination,
        destination_latitude,
        destination_longitude,
    ) in leg_geometries:
        distance = _distance_km(
            origin_latitude,
            origin_longitude,
            destination_latitude,
            destination_longitude,
        )
        minimum_duration = round(distance / MAX_MODE_SPEED_KMH[mode] * 60)
        if duration_minutes < minimum_duration:
            invalid_leg_durations.append((mode, origin, destination, duration_minutes))
        if mode == "flight" and (
            origin in AIRPORTLESS_GATEWAYS or destination in AIRPORTLESS_GATEWAYS
        ):
            forbidden_airportless_flights.append((origin, destination))
        origin_region = ISLAND_REGIONS.get(origin, "mainland")
        destination_region = ISLAND_REGIONS.get(destination, "mainland")
        crosses_water = origin_region != destination_region and (
            origin_region != "mainland" or destination_region != "mainland"
        )
        pair = frozenset((origin, destination))
        is_whitelisted_ground = (
            (mode == "train" and pair in TRAIN_CORRIDORS)
            or (mode == "bus" and pair in BUS_CORRIDORS)
        )
        if crosses_water and mode in {"bus", "train"} and not is_whitelisted_ground:
            forbidden_cross_water_ground_legs.append((mode, origin, destination))
        if mode == "ferry":
            observed_ferry_corridors.add(frozenset((origin, destination)))
    expected_pairs = location_count * (location_count - 1)
    expected_pair_days = expected_pairs * service_days
    expected_route_days = route_count * service_days
    _require(fare_count == expected_rows, f"expected {expected_rows} fares, found {fare_count}")
    _require(metadata["fare_count"] == str(expected_rows), "metadata fare_count mismatch")
    _require(
        sum(mode_fare_counts.values()) == expected_rows,
        "per-mode fare_count metadata does not sum to the total fare count",
    )
    _require(
        mode_fare_counts == actual_mode_fare_counts,
        "per-mode fare_count metadata differs from fare facts",
    )
    _require(
        location_count == len(seed_location_rows),
        "database location count differs from current seeds",
    )
    _require(
        location_rows == seed_location_rows,
        "database locations differ from the strict-Europe seed manifest",
    )
    _require(date_range == (start.isoformat(), end.isoformat(), service_days), "fare date coverage is incomplete")
    _require(route_pair_count == expected_pairs, "one or more ordered city pairs lack a route")
    _require(route_days == expected_route_days, "daily route coverage is incomplete")
    _require(feasible_route_days == expected_route_days, "one or more route-days lack an available fare")
    _require(pair_days == expected_pair_days, "daily ordered-pair coverage is incomplete")
    _require(
        feasible_pair_days == expected_pair_days,
        "one or more ordered city-pair days lack an available fare",
    )
    _require(expected_pair_days <= expected_rows, "ordered-pair daily floor exceeds the row budget")
    _require(invalid_fares == 0, f"found {invalid_fares} invalid fares")
    _require(fares_outside_route_company == 0, "fare operator is not assigned to its route")
    _require(
        invalid_route_companies == 0,
        "route operator is not the singleton dominant-leg operator",
    )
    _require(invalid_leg_company_modes == 0, "route-leg operator mode mismatch")
    _require(invalid_leg_sequences == 0, "route-leg indexes, transfers, or durations are invalid")
    _require(invalid_leg_endpoints == 0, "route-leg endpoints do not match route endpoints")
    _require(discontinuous_legs == 0, "route legs are not contiguous")
    _require(invalid_dominant_modes == 0, "route mode does not match its dominant leg")
    _require(not invalid_leg_durations, "route-leg duration exceeds its physical speed bound")
    _require(
        not forbidden_airportless_flights,
        "airportless microstate has an invented flight leg",
    )
    _require(
        not forbidden_cross_water_ground_legs,
        "island-to-mainland itinerary has a non-whitelisted bus or train leg",
    )
    _require(
        observed_ferry_corridors == FERRY_CORRIDORS,
        "ferry legs differ from the curated ferry-corridor whitelist",
    )
    _require(integrity == "ok", f"integrity_check returned {integrity!r}")
    _require(EXPECTED_INDEXES <= indexes, "one or more required indexes are missing")
    _require(foreign_key_violation is None, "foreign key integrity violation")
    _require(_source_version(database) == source_version, "source changed during verification")

    route_pairs = {(origin, destination) for _, origin, destination in routes}
    drift = {
        "missing_destinations": sorted(set(SOURCE_DESTINATION_SLUGS) - locations),
        "missing_mode_routes": sorted(set(SOURCE_MODE_PAIRS) - routes),
        "missing_corridors": sorted(set(SOURCE_GENERAL_PAIRS) - route_pairs),
        "missing_providers": sorted(set(SOURCE_COMPANIES) - providers_in_database),
        "missing_normalized_providers": sorted(
            set(SOURCE_COMPANY_ALIASES.values()) - providers_in_database
        ),
    }
    _require(not drift["missing_destinations"], "source destinations are missing")
    _require(not drift["missing_mode_routes"], "source mode routes are missing")
    _require(not drift["missing_corridors"], "source corridors are missing")
    _require(not drift["missing_providers"], "source providers are missing")
    _require(
        not drift["missing_normalized_providers"],
        "normalized source providers are missing",
    )

    return {
        "path": str(database),
        "source_version": source_version,
        "generator_version": metadata["generator_version"],
        "schema_version": int(metadata["schema_version"]),
        "coverage_model": metadata["coverage_model"],
        "location_scope": metadata["location_scope"],
        "source_manifest_status": "current",
        "source_manifest_drift": drift,
        "capabilities": {
            "modes": sorted({mode for mode, _, _ in routes}),
            "location_slugs": sorted(locations),
        },
        "fare_count": fare_count,
        "fare_count_by_mode": mode_fare_counts,
        "directional_route_count": route_count,
        "route_leg_count": route_leg_count,
        "route_day_count": route_days,
        "feasible_route_day_count": feasible_route_days,
        "ordered_pair_count": route_pair_count,
        "pair_day_count": pair_days,
        "feasible_pair_day_count": feasible_pair_days,
        "company_count": company_count,
        "location_count": location_count,
        "service_day_count": service_days,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "size_bytes": source_stat.st_size,
        "integrity": integrity,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("database", type=Path, nargs="?", default=Path("data/omio.sqlite3"))
    parser.add_argument("--expected-rows", type=int, default=DEFAULT_ROW_COUNT)
    parser.add_argument("--json", action="store_true")
    arguments = parser.parse_args()
    summary = verify_database(arguments.database, expected_rows=arguments.expected_rows)
    if arguments.json:
        print(json.dumps(summary, indent=2))
        return
    for key, value in summary.items():
        print(f"{key}: {value}")


if __name__ == "__main__":
    main()
