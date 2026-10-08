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
python3 -m backend.generate_db --output data/omio.sqlite3 --rows 50000000
```

The default seed always produces exactly 50,000,000 synthetic fares from 2026-10-08
through 2027-12-31. Every directional route has service on every day in that range.
Weighted, seeded allocation varies service frequency, operators, departure times,
prices, durations, and availability while remaining reproducible. These are generated
examples, not live schedules or bookable fares. The generator writes to a temporary
database, verifies row count, route/day coverage, and SQLite integrity, then atomically
replaces the output.

Verify the saved artifact, including the 120-city manifest, ordered-pair daily
coverage, route legs, and required query indexes:

```sh
python3 -m backend.verify_db data/omio.sqlite3 --expected-rows 50000000
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
- `POST /api/query-groups` executes one to eight fixed generative-UI query groups.
- `POST /api/lookup` resolves up to 160 source-scoped selected-fare pins.

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

The generative UI endpoints accept JSON only. `/api/query-groups` supports the
closed projection kinds `farePage`, `calendarDays`, `carrierFacets`,
`modeSummary`, and `fareHighlights`. It validates every field strictly, executes
the full request in one read-only SQLite transaction, and either returns every
group or a versioned error. An empty `projections` array returns only the logical
scope manifest. Its `availableDateWindow` is the intersection with the source
horizon; `complete` is false for partial or unavailable windows, and a fully
unavailable window returns bounded empty results. Page cursors are opaque and bind the source version,
normalized scope, filters, ordering, and page size.

`/api/lookup` accepts `{version, requestId, sourceVersion, pins}` and returns
`items` plus explicit `missingPins`. A selected pin contains only `fareId` and
`resourceKey`; the source version is supplied once for the whole lookup. Source
mismatches return HTTP 409 `sourceChanged`, so a fare is never silently resolved
against a replacement database.

Both endpoints return fare scalars with local `serviceDate` and
`departureMinutes`. They do not infer a timezone or arrival instant. Each fare
contains only bounded ordered leg facts from the source: leg index, mode, carrier,
duration, and endpoint IDs and labels. `direct` is derived from the leg count, and
`directOnly` is applied by the server. The response omits a redundant transfer
count and all arbitrary query or SQL structures. Preserved version2 fixtures,
which have no route-leg table, receive one fare-derived direct leg.

## Test

```sh
python3 -m unittest discover -s backend/tests -v
```
