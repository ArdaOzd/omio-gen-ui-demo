# Synthetic timetable backend

This dependency-free Python service builds and searches an Omio-style timetable. The
data is synthetic and deterministic; route and provider names are inspired by the
public [Omio landing page](https://www.omio.com/), while prices, schedules, seat
availability, and supplementary routes are generated demo data.

The catalog contains 120 cities located in geographic Europe, including national
capitals and large inland and coastal cities. It covers every ordered city pair
on every service day. Gateway routes connect airportless microstates and islands;
ferry legs are used only for water-accessible cities. The dominant route mode is
the longest leg, with flight, ferry, train, then bus used as the tie order.

## Generate the database

Run from the repository root:

```sh
python3 -m backend.generate_db --output data/omio.sqlite3 --rows 10000000
```

The default seed always produces exactly 10,000,000 synthetic fares from 2026-10-08
through 2027-12-31. Every directional route has service on every day in that range.
Weighted, seeded allocation varies service frequency, operators, departure times,
prices, durations, and availability while remaining reproducible. These are generated
examples, not live schedules or bookable fares. The generator writes to a temporary
database, verifies row count, route/day coverage, and SQLite integrity, then atomically
replaces the output.

Verify the saved artifact, including the 120-city manifest, ordered-pair daily
coverage, route legs, and required query indexes:

```sh
python3 -m backend.verify_db data/omio.sqlite3 --expected-rows 10000000
```

## Run the API

```sh
python3 -m backend.app --port 8000
```

The server reads `data/omio.sqlite3` by default. Set `OMIO_DATABASE` or pass
`--database` to use a different file.

Endpoints:

- `GET /api/health`
- `GET /api/locations` returns locations plus reachable destinations and modes.
- `GET /api/metadata` returns timetable range, totals, providers, and routes.
- `GET /api/search` searches outbound and optional return legs.

Search parameters are `origin`, `destination`, `departure_date`, optional
`return_date`, `passengers` (1-8), `mode` (`all`, `train`, `bus`, `flight`, or
`ferry`), `sort` (`price_asc`, `price_desc`, `duration_asc`, or `duration_desc`),
`page`, and `limit` (1-100). Location IDs come from `/api/locations`; dates use
`YYYY-MM-DD`.

Example:

```text
/api/search?origin=london&destination=paris&departure_date=2026-10-08&return_date=2026-10-12&passengers=2&mode=all&sort=price_asc&page=1&limit=20
```

Outbound and return searches include independent totals, pagination, per-mode
counts, and results. Each result exposes a truthful `transfers` count and ordered
`legs`, including each leg's mode, operator, endpoints, and duration. Sold-out
fares are excluded, and every returned fare has at least the requested number of
available seats. Departure and arrival are full ISO timestamps; their elapsed time
matches `duration_minutes`, including overnight and multi-day journeys.

## Test

```sh
python3 -m unittest discover -s backend/tests -v
```
