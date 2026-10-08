# Synthetic timetable backend

This dependency-free Python service builds and searches an Omio-style timetable. The
data is synthetic and deterministic; route and provider names are inspired by the
public [Omio landing page](https://www.omio.com/), while prices, schedules, seat
availability, and supplementary routes are generated demo data.

The catalog preserves all 36 connection pairs from the supplied landing-page text
and uses the pasted popular-route lists as a starting point for synthetic
supplementary corridors. US locations and providers are excluded, and ferry,
flight, and microstate links are limited to geographically sensible gateways. The
result covers 50 European and trans-European capitals. Routes beyond the initial
36 are marked `source_kind: "supplementary"` in API results.

## Generate the database

Run from the repository root:

```sh
python3 -m backend.generate_db --output data/omio.sqlite3 --rows 10000000
```

The default seed always produces exactly 10,000,000 synthetic fares from 2026-01-01
through 2027-12-31. Every directional route has service on every day in that range.
Weighted, seeded allocation varies service frequency, operators, departure times,
prices, durations, and availability while remaining reproducible. These are generated
examples, not live schedules or bookable fares. The generator writes to a temporary
database, verifies row count, route/day coverage, and SQLite integrity, then atomically
replaces the output.

Verify the saved artifact, including the pasted route/provider/location manifest
and required query indexes:

```sh
python3 -m backend.verify_db data/omio.sqlite3 --expected-rows 10000000
```

## Preserve an externally supplied version2 fixture

The default verifier remains strict against the current pasted source catalog. A preserved version2 synthetic fixture can be structurally valid while predating later route/provider/location additions. Do not regenerate or replace that file merely to make the current-catalog check green.

For this explicit compatibility case, use:

```sh
python3 -m backend.verify_db /path/to/preserved.sqlite3 --expected-rows 10000000 --manifest-policy preserved-v2 --json
```

This profile requires generator version2, synthetic-demo/EUR metadata, exact actual and metadata counts, complete daily route coverage, valid fare facts, required indexes, foreign keys and SQLite integrity. It opens read-only and rejects source changes during verification. The report names all missing current catalog requirements under `source_manifest_drift`; `source_manifest_status: drift` does not mean current-source-manifest compliance. It declares actual available modes, locations and calendar range rather than invented capabilities. Application queries and studies must use that observed source identity and availability. Reports remain local artifacts; this profile changes neither the database nor the current catalog.

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
/api/search?origin=london&destination=paris&departure_date=2026-10-02&return_date=2026-10-05&passengers=2&mode=all&sort=price_asc&page=1&limit=20
```

Each leg includes independent totals, pagination, per-mode counts and minimum
prices, and results. Sold-out fares are excluded, and every returned fare has at
least the requested number of available seats. Times are local scheduled times at
their origin and destination; `duration_minutes` remains authoritative across time
zones.

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
