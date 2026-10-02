# Synthetic timetable backend

This dependency-free Python service builds and searches an Omio-style timetable. The
data is synthetic and deterministic; route and provider names are inspired by the
public [Omio landing page](https://www.omio.com/), while prices, schedules, seat
availability, and supplementary routes are generated demo data.

The catalog preserves all 36 connection pairs from the supplied landing-page text,
adds the pasted popular route lists as synthetic supplementary corridors, and
includes every pasted company on at least one geographically sensible route where
possible. Routes that represent broad search corridors rather than the initial 36
are marked `source_kind: "supplementary"` in API results.

## Generate the database

Run from the repository root:

```sh
python3 -m backend.generate_db --output data/omio.sqlite3 --rows 1000000
```

The default seed always produces exactly 1,000,000 fares from 2026-01-01 through
2027-12-31. Every directional route has service on every day in that range. The
generator writes to a temporary database, verifies row count, route/day coverage,
and SQLite integrity, then atomically replaces the output.

Verify the saved artifact, including the pasted route/provider/location manifest
and required query indexes:

```sh
python3 -m backend.verify_db data/omio.sqlite3 --expected-rows 1000000
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
/api/search?origin=london&destination=paris&departure_date=2026-10-02&return_date=2026-10-05&passengers=2&mode=all&sort=price_asc&page=1&limit=20
```

Each leg includes independent totals, pagination, per-mode counts and minimum
prices, and results. Sold-out fares are excluded, and every returned fare has at
least the requested number of available seats. Times are local scheduled times at
their origin and destination; `duration_minutes` remains authoritative across time
zones.

## Test

```sh
python3 -m unittest discover -s backend/tests -v
```
