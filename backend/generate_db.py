"""Build the deterministic synthetic SQLite timetable."""

from __future__ import annotations

import argparse
import os
import sqlite3
from collections.abc import Iterable, Iterator
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path

from backend.seeds import LOCATIONS, ROUTES, SOURCE_URL, RouteSeed, company_modes


DEFAULT_START_DATE = date(2026, 1, 1)
DEFAULT_END_DATE = date(2027, 12, 31)
DEFAULT_ROW_COUNT = 1_000_000
DEFAULT_SEED = 20261002
GENERATOR_VERSION = "1"


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
    source_kind TEXT NOT NULL CHECK (source_kind IN ('homepage', 'supplementary')),
    source_url TEXT NOT NULL,
    CHECK (origin_location_id <> destination_location_id)
);

CREATE TABLE route_companies (
    route_id INTEGER NOT NULL REFERENCES routes(id),
    company_id INTEGER NOT NULL REFERENCES companies(id),
    PRIMARY KEY (route_id, company_id)
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

    @property
    def key(self) -> str:
        return f"{self.mode}:{self.origin}:{self.destination}"


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
    if reverse:
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
    )


def _mix64(value: int) -> int:
    value = (value ^ (value >> 30)) * 0xBF58476D1CE4E5B9
    value = (value ^ (value >> 27)) * 0x94D049BB133111EB
    return (value ^ (value >> 31)) & 0xFFFFFFFFFFFFFFFF


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
) -> Iterator[tuple[int, int, int, str, str, str, int, int, int]]:
    cells = len(routes) * len(service_dates)
    if row_count < cells:
        raise ValueError(
            f"row_count must be at least {cells:,} to cover every route on every date"
        )
    per_cell, extra_cells = divmod(row_count, cells)
    fare_id = 1
    capacities = {"train": 160, "bus": 52, "flight": 180, "ferry": 260}
    jitter_percent = {"train": 7, "bus": 12, "flight": 6, "ferry": 10}

    for day_index, service_day in enumerate(service_dates):
        for route_index, route in enumerate(routes):
            cell_index = day_index * len(routes) + route_index
            departures = per_cell + (1 if cell_index < extra_cells else 0)
            step_minutes = 1440 / departures
            for sequence in range(departures):
                noise = _mix64(seed ^ (fare_id * 0x9E3779B97F4A7C15))
                company_name = route.companies[
                    (sequence + day_index + route.id) % len(route.companies)
                ]
                minute = int(sequence * step_minutes + route.id * 13 + day_index * 3)
                minute = (minute + int(noise % max(8, int(step_minutes / 2)))) % 1440
                departure = datetime.combine(service_day, datetime.min.time()) + timedelta(
                    minutes=minute
                )
                max_jitter = max(3, route.duration_minutes * jitter_percent[route.mode] // 100)
                duration_delta = int((noise >> 8) % (2 * max_jitter + 1)) - max_jitter
                company_delta = (
                    route.companies.index(company_name) - (len(route.companies) - 1) / 2
                )
                duration = max(
                    20,
                    route.duration_minutes
                    + duration_delta
                    + round(company_delta * max(2, max_jitter / 3)),
                )
                arrival = departure + timedelta(minutes=duration)

                demand_percent = 75 + int((noise >> 20) % 71)
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
                seats = int((noise >> 36) % (capacity + 1))
                if (noise >> 60) == 0:
                    seats = 0

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
            "INSERT INTO routes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
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
        metadata = {
            "generator_version": GENERATOR_VERSION,
            "seed": str(seed),
            "fare_count": str(row_count),
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "source_url": SOURCE_URL,
            "currency": "EUR",
            "timestamp_semantics": "local scheduled time at each origin/destination",
        }
        connection.executemany(
            "INSERT INTO metadata VALUES (?, ?)", sorted(metadata.items())
        )
        rows = _fare_rows(
            routes=routes,
            service_dates=service_dates,
            company_ids=company_ids,
            row_count=row_count,
            seed=seed,
        )
        insert_sql = """
            INSERT INTO fares (
                id, route_id, company_id, service_date, departure_time,
                arrival_time, duration_minutes, price_cents, available_seats
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        for batch in _batched(rows, 10_000):
            connection.executemany(insert_sql, batch)
        connection.executescript(INDEXES)
        connection.execute("ANALYZE")
        connection.commit()

        actual_count = connection.execute("SELECT COUNT(*) FROM fares").fetchone()[0]
        coverage = connection.execute(
            "SELECT COUNT(*) FROM (SELECT route_id, service_date FROM fares GROUP BY route_id, service_date)"
        ).fetchone()[0]
        expected_coverage = len(routes) * len(service_dates)
        integrity = connection.execute("PRAGMA integrity_check").fetchone()[0]
        if actual_count != row_count or coverage != expected_coverage or integrity != "ok":
            raise RuntimeError(
                "database verification failed: "
                f"rows={actual_count}, coverage={coverage}/{expected_coverage}, integrity={integrity}"
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
    )
    for key, value in summary.items():
        print(f"{key}: {value}")


if __name__ == "__main__":
    main()
