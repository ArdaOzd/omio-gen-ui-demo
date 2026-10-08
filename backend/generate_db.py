"""Build the deterministic synthetic SQLite timetable."""

from __future__ import annotations

import argparse
import os
import sqlite3
from collections.abc import Callable, Iterable, Iterator
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path

from backend.seeds import (
    LOCATIONS,
    MODE_PRIORITY,
    ROUTES,
    SOURCE_URL,
    TRANSFER_BUFFER_MINUTES,
    RouteLegSeed,
    RouteSeed,
    company_modes,
)


DEFAULT_START_DATE = date(2026, 10, 8)
DEFAULT_END_DATE = date(2027, 12, 31)
DEFAULT_ROW_COUNT = 50_000_000
DEFAULT_SEED = 20261002
GENERATOR_VERSION = "4"
SCHEMA_VERSION = "3"


SCHEMA = """
PRAGMA foreign_keys = ON;

CREATE TABLE metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
) WITHOUT ROWID;

CREATE TABLE locations (
    id INTEGER PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    city TEXT NOT NULL,
    country_code TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL
);

CREATE TABLE companies (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('train', 'bus', 'flight', 'ferry')),
    UNIQUE (name, mode)
);

CREATE TABLE routes (
    id INTEGER PRIMARY KEY,
    route_key TEXT NOT NULL UNIQUE,
    mode TEXT NOT NULL CHECK (mode IN ('train', 'bus', 'flight', 'ferry')),
    origin_location_id INTEGER NOT NULL REFERENCES locations(id),
    destination_location_id INTEGER NOT NULL REFERENCES locations(id),
    origin_point TEXT NOT NULL,
    destination_point TEXT NOT NULL,
    base_duration_minutes INTEGER NOT NULL CHECK (base_duration_minutes > 0),
    base_price_cents INTEGER NOT NULL CHECK (base_price_cents > 0),
    transfer_count INTEGER NOT NULL CHECK (transfer_count >= 0),
    source_kind TEXT NOT NULL CHECK (source_kind IN ('coverage', 'curated')),
    source_url TEXT NOT NULL,
    CHECK (origin_location_id <> destination_location_id)
);

CREATE TABLE route_companies (
    route_id INTEGER NOT NULL REFERENCES routes(id),
    company_id INTEGER NOT NULL REFERENCES companies(id),
    PRIMARY KEY (route_id, company_id)
) WITHOUT ROWID;

CREATE TABLE route_legs (
    route_id INTEGER NOT NULL REFERENCES routes(id),
    leg_index INTEGER NOT NULL CHECK (leg_index >= 0),
    mode TEXT NOT NULL CHECK (mode IN ('train', 'bus', 'flight', 'ferry')),
    origin_location_id INTEGER NOT NULL REFERENCES locations(id),
    destination_location_id INTEGER NOT NULL REFERENCES locations(id),
    origin_point TEXT NOT NULL,
    destination_point TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    company_id INTEGER NOT NULL REFERENCES companies(id),
    PRIMARY KEY (route_id, leg_index),
    CHECK (origin_location_id <> destination_location_id)
) WITHOUT ROWID;

CREATE TABLE fares (
    id INTEGER PRIMARY KEY,
    route_id INTEGER NOT NULL REFERENCES routes(id),
    company_id INTEGER NOT NULL REFERENCES companies(id),
    service_date TEXT NOT NULL,
    departure_time TEXT NOT NULL,
    arrival_time TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    price_cents INTEGER NOT NULL CHECK (price_cents > 0),
    available_seats INTEGER NOT NULL CHECK (available_seats >= 0)
);
"""


INDEXES = """
CREATE INDEX idx_routes_origin_destination_mode
ON routes (origin_location_id, destination_location_id, mode);

CREATE INDEX idx_fares_route_date_seats
ON fares (route_id, service_date, available_seats);

CREATE INDEX idx_fares_route_date_price
ON fares (route_id, service_date, price_cents, id);

CREATE INDEX idx_fares_route_date_duration
ON fares (route_id, service_date, duration_minutes, id);

CREATE INDEX idx_fares_company ON fares (company_id);
"""


@dataclass(frozen=True)
class DirectionalLeg:
    mode: str
    origin: str
    destination: str
    origin_point: str
    destination_point: str
    duration_minutes: int
    company: str


@dataclass(frozen=True)
class DirectionalRoute:
    id: int
    mode: str
    origin: str
    destination: str
    origin_point: str
    destination_point: str
    duration_minutes: int
    base_price_cents: int
    companies: tuple[str, ...]
    source_kind: str
    legs: tuple[DirectionalLeg, ...]

    @property
    def key(self) -> str:
        return f"{self.mode}:{self.origin}:{self.destination}"

    @property
    def transfer_count(self) -> int:
        return len(self.legs) - 1


def directional_routes() -> tuple[DirectionalRoute, ...]:
    result: list[DirectionalRoute] = []
    route_id = 1
    for route in ROUTES:
        result.append(_direction(route_id, route, reverse=False))
        route_id += 1
        result.append(_direction(route_id, route, reverse=True))
        route_id += 1
    return tuple(result)


def _direction(route_id: int, route: RouteSeed, *, reverse: bool) -> DirectionalRoute:
    seed_legs = route.legs or (
        RouteLegSeed(
            route.mode,
            route.origin,
            route.destination,
            route.origin_point,
            route.destination_point,
            route.duration_minutes,
            route.companies[0],
        ),
    )
    if reverse:
        legs = tuple(
            DirectionalLeg(
                leg.mode,
                leg.destination,
                leg.origin,
                leg.destination_point,
                leg.origin_point,
                leg.duration_minutes,
                leg.company,
            )
            for leg in reversed(seed_legs)
        )
        return DirectionalRoute(
            route_id,
            route.mode,
            route.destination,
            route.origin,
            route.destination_point,
            route.origin_point,
            route.duration_minutes,
            route.base_price_cents,
            route.companies,
            route.source_kind,
            legs,
        )
    legs = tuple(
        DirectionalLeg(
            leg.mode,
            leg.origin,
            leg.destination,
            leg.origin_point,
            leg.destination_point,
            leg.duration_minutes,
            leg.company,
        )
        for leg in seed_legs
    )
    return DirectionalRoute(
        route_id,
        route.mode,
        route.origin,
        route.destination,
        route.origin_point,
        route.destination_point,
        route.duration_minutes,
        route.base_price_cents,
        route.companies,
        route.source_kind,
        legs,
    )


def _mix64(value: int) -> int:
    value = (value ^ (value >> 30)) * 0xBF58476D1CE4E5B9
    value = (value ^ (value >> 27)) * 0x94D049BB133111EB
    return (value ^ (value >> 31)) & 0xFFFFFFFFFFFFFFFF


def _cell_weight(
    route: DirectionalRoute, service_day: date, day_index: int, seed: int
) -> int:
    """Return a stable service-frequency weight for one route and day."""
    mode_weight = {"train": 10, "bus": 8, "flight": 6, "ferry": 3}[route.mode]
    weekday_weight = {
        "train": 10 if service_day.weekday() < 5 else 8,
        "bus": 9 if service_day.weekday() < 5 else 11,
        "flight": 10 if service_day.weekday() not in (1, 2) else 8,
        "ferry": 11 if service_day.weekday() in (4, 5, 6) else 9,
    }[route.mode]
    season_weight = 13 if route.mode in {"flight", "ferry"} and service_day.month in range(5, 10) else 10
    stable_noise = _mix64(seed ^ (route.id * 0x9E3779B97F4A7C15) ^ day_index)
    return mode_weight * weekday_weight * season_weight * (80 + stable_noise % 41)


def _fare_noise(
    seed: int, route_id: int, day_index: int, sequence: int, stream: int
) -> int:
    value = (
        seed
        ^ (route_id * 0x9E3779B97F4A7C15)
        ^ ((day_index + 1) * 0xBF58476D1CE4E5B9)
        ^ ((sequence + 1) * 0x94D049BB133111EB)
        ^ (stream * 0xD6E8FEB86659FD93)
    )
    return _mix64(value)


def _dates(start_date: date, end_date: date) -> tuple[date, ...]:
    if end_date < start_date:
        raise ValueError("end_date must be on or after start_date")
    count = (end_date - start_date).days + 1
    return tuple(start_date + timedelta(days=offset) for offset in range(count))


def _fare_rows(
    *,
    routes: tuple[DirectionalRoute, ...],
    service_dates: tuple[date, ...],
    company_ids: dict[str, int],
    row_count: int,
    seed: int,
    mode_counts: dict[str, int],
) -> Iterator[tuple[int, int, int, str, str, str, int, int, int]]:
    cells = len(routes) * len(service_dates)
    if row_count < cells:
        raise ValueError(
            f"row_count must be at least {cells:,} to cover every route on every date"
        )
    remaining_rows = row_count - cells
    total_weight = sum(
        _cell_weight(route, service_day, day_index, seed)
        for day_index, service_day in enumerate(service_dates)
        for route in routes
    )
    fare_id = 1
    capacities = {"train": 160, "bus": 52, "flight": 180, "ferry": 260}
    jitter_percent = {"train": 7, "bus": 12, "flight": 6, "ferry": 10}
    service_windows = {
        "train": (5 * 60, 23 * 60 + 30),
        "bus": (4 * 60, 23 * 60 + 45),
        "flight": (5 * 60, 23 * 60 + 30),
        "ferry": (5 * 60, 23 * 60),
    }
    cumulative_weight = 0
    allocated_rows = 0

    for day_index, service_day in enumerate(service_dates):
        for route in routes:
            previous_allocated = allocated_rows
            cumulative_weight += _cell_weight(route, service_day, day_index, seed)
            allocated_rows = cumulative_weight * remaining_rows // total_weight
            departures = 1 + allocated_rows - previous_allocated
            mode_counts[route.mode] += departures
            start_minute, end_minute = service_windows[route.mode]
            service_span = end_minute - start_minute + 1
            for sequence in range(departures):
                company_noise = _fare_noise(seed, route.id, day_index, sequence, 1)
                departure_noise = _fare_noise(seed, route.id, day_index, sequence, 2)
                duration_noise = _fare_noise(seed, route.id, day_index, sequence, 3)
                price_noise = _fare_noise(seed, route.id, day_index, sequence, 4)
                seat_noise = _fare_noise(seed, route.id, day_index, sequence, 5)
                company_name = route.companies[company_noise % len(route.companies)]
                slot_start = start_minute + sequence * service_span // departures
                slot_end = start_minute + (sequence + 1) * service_span // departures
                minute = slot_start + departure_noise % max(1, slot_end - slot_start)
                departure = datetime.combine(service_day, datetime.min.time()) + timedelta(
                    minutes=minute
                )
                max_jitter = max(3, route.duration_minutes * jitter_percent[route.mode] // 100)
                duration_delta = int(duration_noise % (max_jitter + 1))
                company_delta = route.companies.index(company_name)
                duration = (
                    route.duration_minutes
                    + duration_delta
                    + round(company_delta * max(2, max_jitter / 3))
                )
                arrival = departure + timedelta(minutes=duration)

                demand_percent = 75 + int(price_noise % 71)
                weekday_percent = 110 if service_day.weekday() in (4, 5, 6) else 100
                sequence_percent = 108 if minute in range(390, 600) or minute in range(960, 1170) else 96
                price = max(
                    199,
                    route.base_price_cents
                    * demand_percent
                    * weekday_percent
                    * sequence_percent
                    // 1_000_000,
                )
                capacity = capacities[route.mode]
                seats = int(seat_noise % (capacity + 1))
                if sequence > 0 and seat_noise >> 60 == 0:
                    seats = 0
                elif sequence == 0:
                    seats = max(1, seats)

                yield (
                    fare_id,
                    route.id,
                    company_ids[company_name],
                    service_day.isoformat(),
                    departure.isoformat(timespec="minutes"),
                    arrival.isoformat(timespec="minutes"),
                    duration,
                    price,
                    seats,
                )
                fare_id += 1


def _batched(rows: Iterable[tuple[object, ...]], size: int) -> Iterator[list[tuple[object, ...]]]:
    batch: list[tuple[object, ...]] = []
    for row in rows:
        batch.append(row)
        if len(batch) == size:
            yield batch
            batch = []
    if batch:
        yield batch


def generate_database(
    output: Path,
    *,
    row_count: int = DEFAULT_ROW_COUNT,
    start_date: date = DEFAULT_START_DATE,
    end_date: date = DEFAULT_END_DATE,
    seed: int = DEFAULT_SEED,
    progress: Callable[[int], None] | None = None,
) -> dict[str, int | str]:
    """Generate an atomically replaced SQLite database and return summary data."""
    if row_count <= 0:
        raise ValueError("row_count must be positive")
    output = output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_name(f".{output.name}.tmp")
    temporary.unlink(missing_ok=True)

    routes = directional_routes()
    service_dates = _dates(start_date, end_date)
    location_ids = {location.slug: index for index, location in enumerate(LOCATIONS, 1)}
    companies = company_modes()
    company_names = sorted(companies)
    company_ids = {name: index for index, name in enumerate(company_names, 1)}

    connection = sqlite3.connect(temporary)
    try:
        connection.executescript(
            "PRAGMA journal_mode = OFF; PRAGMA synchronous = OFF; PRAGMA temp_store = MEMORY;"
        )
        connection.executescript(SCHEMA)
        connection.executemany(
            "INSERT INTO locations VALUES (?, ?, ?, ?, ?, ?)",
            (
                (
                    location_ids[item.slug],
                    item.slug,
                    item.city,
                    item.country_code,
                    item.latitude,
                    item.longitude,
                )
                for item in LOCATIONS
            ),
        )
        connection.executemany(
            "INSERT INTO companies VALUES (?, ?, ?)",
            ((company_ids[name], name, companies[name]) for name in company_names),
        )
        connection.executemany(
            "INSERT INTO routes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                (
                    route.id,
                    route.key,
                    route.mode,
                    location_ids[route.origin],
                    location_ids[route.destination],
                    route.origin_point,
                    route.destination_point,
                    route.duration_minutes,
                    route.base_price_cents,
                    route.transfer_count,
                    route.source_kind,
                    SOURCE_URL,
                )
                for route in routes
            ),
        )
        route_company_rows = (
            (route.id, company_ids[company])
            for route in routes
            for company in route.companies
        )
        connection.executemany(
            "INSERT INTO route_companies VALUES (?, ?)", route_company_rows
        )
        route_leg_rows = (
            (
                route.id,
                leg_index,
                leg.mode,
                location_ids[leg.origin],
                location_ids[leg.destination],
                leg.origin_point,
                leg.destination_point,
                leg.duration_minutes,
                company_ids[leg.company],
            )
            for route in routes
            for leg_index, leg in enumerate(route.legs)
        )
        connection.executemany(
            "INSERT INTO route_legs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            route_leg_rows,
        )
        metadata = {
            "generator_version": GENERATOR_VERSION,
            "schema_version": SCHEMA_VERSION,
            "seed": str(seed),
            "fare_count": str(row_count),
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "source_url": SOURCE_URL,
            "currency": "EUR",
            "dataset_type": "synthetic_demo",
            "coverage_model": "all_ordered_pairs_daily",
            "location_scope": "strict_geographic_europe",
            "schedule_disclaimer": "Generated examples; not live schedules or bookable fares",
            "timestamp_semantics": "naive ISO local scheduled datetimes; duration_minutes is authoritative",
        }
        fare_counts_by_mode = {mode: 0 for mode in MODE_PRIORITY}
        rows = _fare_rows(
            routes=routes,
            service_dates=service_dates,
            company_ids=company_ids,
            row_count=row_count,
            seed=seed,
            mode_counts=fare_counts_by_mode,
        )
        insert_sql = """
            INSERT INTO fares (
                id, route_id, company_id, service_date, departure_time,
                arrival_time, duration_minutes, price_cents, available_seats
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        inserted_count = 0
        next_progress = 2_000_000
        for batch in _batched(rows, 10_000):
            connection.executemany(insert_sql, batch)
            inserted_count += len(batch)
            if progress is not None and inserted_count >= next_progress:
                progress(inserted_count)
                next_progress += 2_000_000
        if sum(fare_counts_by_mode.values()) != row_count:
            raise RuntimeError("per-mode fare counts do not sum to the requested row count")
        metadata.update(
            {
                f"fare_count_{mode}": str(count)
                for mode, count in fare_counts_by_mode.items()
            }
        )
        connection.executemany(
            "INSERT INTO metadata VALUES (?, ?)", sorted(metadata.items())
        )
        connection.executescript(INDEXES)
        connection.execute("ANALYZE")
        connection.commit()

        actual_count = connection.execute("SELECT COUNT(*) FROM fares").fetchone()[0]
        coverage, available_coverage = connection.execute(
            """
            SELECT COUNT(*), SUM(has_available) FROM (
                SELECT route_id, service_date,
                       MAX(CASE WHEN available_seats > 0 THEN 1 ELSE 0 END) AS has_available
                FROM fares
                GROUP BY route_id, service_date
            )
            """
        ).fetchone()
        expected_coverage = len(routes) * len(service_dates)
        pair_count = connection.execute(
            """
            SELECT COUNT(*) FROM (
                SELECT origin_location_id, destination_location_id
                FROM routes
                GROUP BY origin_location_id, destination_location_id
            )
            """
        ).fetchone()[0]
        expected_pairs = len(LOCATIONS) * (len(LOCATIONS) - 1)
        invalid_routes = sum(
            route.transfer_count != len(route.legs) - 1
            or route.duration_minutes
            != sum(leg.duration_minutes for leg in route.legs)
            + TRANSFER_BUFFER_MINUTES * route.transfer_count
            or route.mode
            != min(
                route.legs,
                key=lambda leg: (
                    -leg.duration_minutes,
                    MODE_PRIORITY[leg.mode],
                ),
            ).mode
            for route in routes
        )
        integrity = connection.execute("PRAGMA integrity_check").fetchone()[0]
        if (
            actual_count != row_count
            or coverage != expected_coverage
            or available_coverage != expected_coverage
            or pair_count != expected_pairs
            or invalid_routes
            or integrity != "ok"
        ):
            raise RuntimeError(
                "database verification failed: "
                f"rows={actual_count}, coverage={coverage}/{expected_coverage}, "
                f"available={available_coverage}/{expected_coverage}, "
                f"pairs={pair_count}/{expected_pairs}, invalid_routes={invalid_routes}, "
                f"integrity={integrity}"
            )
    except BaseException:
        connection.close()
        temporary.unlink(missing_ok=True)
        raise
    else:
        connection.close()
    os.replace(temporary, output)
    return {
        "path": str(output),
        "fare_count": row_count,
        "route_count": len(routes),
        "route_leg_count": sum(len(route.legs) for route in routes),
        "company_count": len(company_names),
        "location_count": len(LOCATIONS),
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "size_bytes": output.stat().st_size,
    }


def _parse_date(value: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError as error:
        raise argparse.ArgumentTypeError("expected YYYY-MM-DD") from error


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("data/omio.sqlite3"))
    parser.add_argument("--rows", type=int, default=DEFAULT_ROW_COUNT)
    parser.add_argument("--start-date", type=_parse_date, default=DEFAULT_START_DATE)
    parser.add_argument("--end-date", type=_parse_date, default=DEFAULT_END_DATE)
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    arguments = parser.parse_args()
    summary = generate_database(
        arguments.output,
        row_count=arguments.rows,
        start_date=arguments.start_date,
        end_date=arguments.end_date,
        seed=arguments.seed,
        progress=lambda count: print(f"inserted fares: {count:,}", flush=True),
    )
    for key, value in summary.items():
        print(f"{key}: {value}")


if __name__ == "__main__":
    main()
