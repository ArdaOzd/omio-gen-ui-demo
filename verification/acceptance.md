# Acceptance evidence

Verified on 2026-10-02 against commits `b1c8912` (backend) and `4978700`
(frontend). The database is generated data and remains outside Git.

## Database and source coverage

`data/omio.sqlite3` passed `PRAGMA integrity_check` and contains:

- 1,000,000 fares in a 158,183,424-byte SQLite file
- 442 directional routes, 63 providers, and 144 locations
- 322,660 route-days, covering every route on all 730 days from 2026-01-01
  through 2027-12-31
- no route or provider without fares
- no negative seat counts, invalid prices, invalid durations, or
  departure/arrival duration mismatches
- 70,445 sold-out fares; the search API excludes these and enforces the
  requested passenger count
- the five planned route/date/seat, price, duration, and provider indexes

The independent parser in `verification/verify_pasted_coverage.py` compared the
provided connection and company list with the generated database. It found 374
route requirements (307 mode-specific and 67 generic), 52 company labels, and
127 route-endpoint locations. All were present. The backend test suite also
checks this source contract against a generated SQLite database.

Reproduce these checks with:

```sh
python3 -m unittest discover -s backend/tests -v
python3 verification/verify_pasted_coverage.py \
  "/path/to/source-requirements.txt" \
  --database data/omio.sqlite3
```

The test suite completed six tests successfully. The coverage script reported
empty missing-route, missing-company, and missing-location sets.

## HTTP API

A fresh server on port 18080 passed 26 direct HTTP assertions:

- health, metadata, and location endpoints
- London to Paris on 2026-10-02 in all four sort orders
- ascending and descending price and duration order
- train, bus, and flight mode filters
- passenger filtering with every returned seat count at or above the request
- outbound and reversed return legs
- summary counts, minimum prices, and minimum durations
- pagination with disjoint result IDs
- structured 400 responses for invalid cities, dates, return order, modes,
  sorts, and passenger counts
- 404 handling and CORS preflight

The London-to-Paris search returned eight fares across train, bus, and flight.
The measured SQLite lookup took 0.06 ms, API searches took 0.81-1.11 ms, and the
round trip took 0.95 ms on this machine. Timings are observations, not service
level guarantees.

## Browser flow

`npm run build` completed successfully with 35 transformed modules. The live
application was then driven in Chrome at desktop (1200 x 662) and mobile
(390 x 844) viewports.

The landing page displayed the Omio-style navigation, hero, transport search,
offer section, and mobile-app promotion. All nine local visual assets loaded,
the browser console stayed clean, and the mobile layout had no page-level
horizontal overflow.

The full search flow passed for trains, buses, flights, and ferries. Checks
covered:

- accent-insensitive location suggestions, including `malmö` and `düsseldorf`
- keyboard and mouse selection, arrow navigation, Enter, Escape, outside-click
  dismissal, and rejection of arbitrary unselected text
- all four price and duration sort directions
- transport tabs, date strip, direct filter, passengers, fare expansion, and
  outbound/return tabs
- a London-Paris round trip with the return heading reversed to Paris-London
- easyJet and Air France flight results
- a Palermo-Naples ferry search with Grandi Navi Veloci and Tirrenia results
- clearing a return date after viewing the return leg, which correctly resets
  the view to outbound results
- responsive landing and result pages at 390 x 844, with scrollable mode tabs
  and stacked supporting panels

Full-page desktop and mobile captures were inspected inline during the browser
run. They are not committed because the browser session did not provide a
persistent local export path.

Routes used for UI acceptance returned fewer than the default 20-result page
size, so the disabled Next button was the expected state. API pagination was
verified separately with a three-result page size.
