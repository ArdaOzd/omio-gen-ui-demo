# Server-driven generative UI implementation plan

Status: implementation complete, verified, and running locally for user testing

Target branch: `feature/server-driven-generative-ui-review`

Target base: `7c60602ebbd1dedebf3ea22c8f56ae98077a1da3`

Working directory: `/Users/ardaozdogru/.codex/worktrees/server-driven-generative-ui/omio-gen-ui-demo`

Delivery boundary: produce the first complete browser render for user testing. Keep the branch local, unmerged, and unpushed.

## Authoritative current state — 2026-10-08

This section supersedes the earlier clean-base assumptions preserved later in this document as planning history.

- Work only in `/Users/ardaozdogru/.codex/worktrees/server-driven-generative-ui/omio-gen-ui-demo` on local branch `feature/server-driven-generative-ui-review`. The original checkout and `/tmp/server-driven-generative-ui-baseline.FcThYk` remain read-only evidence. Do not merge or push.
- The active source is generator v4 on schema v3: 50,000,000 fares, 120 cities, all ordered city pairs, and date coverage from 2026-10-08 through 2027-12-31. Public fares include bounded ordered `legs`; `direct` agrees with leg count. Manifests distinguish the requested `coverage` from `availableDateWindow` and report partial or unavailable windows with `complete: false`.
- Fixed `/api/query-groups` and `/api/lookup` endpoints, strict TypeScript contracts, the batching coordinator, all 49 catalog component functions, immutable display context, bounded inspection, source-bound pins, and production server-query hooks are implemented. The arbitrary public `QueryIR` and generative browser bulk-load seams are gone; local QueryIR survives only behind test fixtures.
- Row selectors use bounded server cursor pages. General fare views and the active calendar day expose Back/Next controls. The planner `FareStrip` instead presents a bounded vertical viewport, progressively appends cursor pages at its scroll boundary, resets accumulated rows and scroll position when the exact effective requirement changes, and retains selected facts outside the visible portion.
- Next-turn context records normalized desired inputs separately from immutable committed output. It carries active views, exact ordered IDs or aggregate cells, source version, result identity, omissions, compact selected facts, and bounded `inspect_display` handles.
- The implementation is committed through layout-guidance follow-up commit `a244608`. Cursor continuation binds semantic query inputs rather than response-correlation IDs. Logical fare-scope resource keys remain stable across source generations, while page caches, pin caches, result identities, cursors, and inspection handles remain source-bound.
- Final validation passes: the full Vitest suite reports 359 tests passed with four opt-in cases skipped; the backend suite passes 28 tests; the strict live TypeScript wire suite passes four tests; and `tests/generative/verify-api.ts` exercises all five projections plus a selected pin against the 50-million-row source. The steward's focused booking, persistence, fixture, and supersession run passes 82 tests; the final layout-guidance and ownership suite passes 16 tests; and `npm run typecheck`, `npm run build`, `npm run check:catalog`, and `git diff --check` pass after the follow-up.
- Both project graphs are refreshed locally through `a244608` and this final journal update. External semantic extraction providers remain disabled; the documentation-aware semantic fragment uses only inline Codex extraction.
- The populated preview is running at [http://127.0.0.1:5175/generative](http://127.0.0.1:5175/generative), with the direct interaction fixture at [http://127.0.0.1:5175/trip-planning-fixture](http://127.0.0.1:5175/trip-planning-fixture). Trusted native probes show backend `127.0.0.1:8003` PID `21190`, agent `127.0.0.1:8013` PID `67040`, and Vite `127.0.0.1:5175` PID `21194`. The backend health endpoint reports 50,000,000 fares and source `sqlite-demo-v4-acb4e29-1ed351000-18dc82f4e8cc630b`; the agent health endpoint reports `gpt-6.1-sol` at high reasoning; the frontend returns HTTP 200. Sandbox-local curl can falsely report connection refusal, so use native `lsof` and escalated curl before replacing a listener.
- Native acceptance passed on a 390 px mobile viewport in chat `travel-5592f2a8-561b-4bcd-825e-41521cf4c17a`, artifact `artifact-11e3b762-e9e5-4bbf-8975-067813dac649`: the tracker stacked responsively, real calendar Page 2 showed ranks 9–16 with different IDs, and the immutable display capture was `display-8` / `result-4786e0e6-0a68-4873-a971-3e24134e5b55` on source v4. Reloading the same chat at desktop width restored Page 2 and the right-side tracker.
- A post-resource-identity native reload also passes in chat `travel-f8fd5677-34f9-45b6-a177-4c9354b0be74`, artifact `artifact-5c9077d2-f46c-4369-9846-7030a1b7f768`, with stable logical scope `scope-67a42174e3bf6ae2969e365019a303f8` and the same source v4 identity.
- A prior next-turn proof changed the Flight filter locally from selected to cleared without another model request; the committed Bus €12.69 / 5h26 and Train €41.25 / 3h04 remained visible. The next model turn cited those displayed fares and dates, the €28.56 premium, the 2h22 time saving, and approximately €12 per hour saved from the frozen display context.
- The fixture is a direct control surface for this same review branch, not a separate product version. It opens with populated fare strips and a seven-day calendar at full desktop width. Choose a fare to reveal the right-side tracker, then scroll inside either fare list to append the next bounded server cursor batch. Changing Departure or Transport replaces accumulated rows and returns that list to the top. The calendar active-day pager remains separate and unchanged. At 390 px the tracker stacks above the planner and each fare list becomes one bounded vertical column without page overflow.
- Progressive-scroll acceptance passes. Fare strips have no Previous, Page, or Next controls; ordered pages append once without duplicates; effective requirement changes discard stale pages and reset the viewport; earlier and appended fares resolve their exact identity in the tracker; immutable per-page publishers retain the original result handle and inspection facts; and the aggregate root reports the first 100 ordered references plus explicit omissions without limiting continued browsing.
- Follow-up ownership was serialized in the shared worktree: `fixture_data_check` owned `FareStrip` logic and focused regressions, `fixture_layout_fix` owned `trip-planning.css`, and `fixture_review_steward` owned native desktop/mobile acceptance, this plan, local-only graph refreshes, staging, and local commits. Do not merge or push.
- Booking ownership is assigned per logical trip leg. `MultiCityPlanGrid` claims every resolved leg in its artifact. Each root-level `FareCalendar`, branded “Flexible dates,” claims its explicit bound `legIndex`. Distinct-leg calendars are valid together, but duplicate calendars for one leg, duplicate all-leg planners, and any `MultiCityPlanGrid` plus `FareCalendar` overlap are invalid.
- When root-level booking owners are present, their union must cover every requested trip leg exactly once. A flexible-dates trip interface therefore uses one existing `FareCalendar` per ordered leg; no new aggregate component replaces it. Enforce ownership and complete coverage in catalog metadata, the complete Present validator, the streaming tree pruner, and agent composition guidance. Controls and results rendered internally by the chosen owners remain valid.
- Supplementary views do not claim booking ownership. In particular, `CheapestFastest` may appear beside either chosen booking interface, shares the same bound leg state and PlanningTracker selection, and retains its direct Add to trip actions. Overview, map, and comparison-only scenes remain valid without any booking owner when the request does not need editable booking controls.
- Booking ownership also governs scene supersession across the full restored conversation, not only siblings in one Present tree or tool calls in one message. A later accepted booking scene supersedes earlier controls only where its claims overlap the same artifact legs. A later supplementary or ownerless comparison must not hide the active booking interface. Invalid historical mixed scenes remain saved but render the existing sanitized error instead of guessing an owner or rewriting history.
- Preserve existing bounded server queries, immutable display provenance, progressive fare scrolling, route thresholds, and the shared selected-fare tracker. Prove two calendars for legs 0 and 1 are valid; reject duplicate same-leg calendars, two `MultiCityPlanGrid` owners, grid-plus-calendar overlap, and incomplete booking-leg coverage. Also prove both valid booking workflows can coexist with `CheapestFastest` without duplicating booking ownership.
- `fixture_data_check` owns catalog/schema metadata, per-leg ownership validation, prompt guidance, and focused boundary tests. `fixture_layout_fix` owns the default MultiCity-only fixture, the deterministic `?workflow=flexible` fixture mode with one existing `FareCalendar` per leg, supplementary `CheapestFastest`, styles when needed, and focused rendering tests. `fixture_review_steward` owns this durable plan, independent headless DOM/CDP acceptance without native Accessibility or other computer-control permission, local-only graph refreshes, staging, and local commits. Do not merge or push.
- The layout-guidance follow-up teaches the agent to vary compositions through the actual recursive layout catalog instead of repeating one recipe. Six task-shaped patterns distinguish complete editable and flexible-date booking from focused discovery, tradeoff, journey-review, and multi-leg analysis. Every pattern remains subordinate to exact artifact, dataset, leg, booking-owner, stay, tracker, and display-provenance connections. `FadeFares` now accurately describes bounded vertical progressive scrolling. `fixture_data_check` owns descriptor, generated catalog/toolkit, prompt, and focused guidance tests; `fixture_layout_fix` owns independent example and constraint review; `fixture_review_steward` owns this plan, a genuine creative-composition smoke, local-only graph refreshes, commits, and the explicitly authorized push of `feature/server-driven-generative-ui-review` only. Do not merge or mutate `dev`.

## Objective

Move the generative travel UI from browser-loaded fare datasets to server-executed, fixed query functions. The model still composes the existing registered UI components. Components ask for semantic query groups, the server runs parameterized SQL against the current 50 million row synthetic timetable, and the browser receives only the bounded rows or aggregates required for the active display.

The next model turn must describe what the user actually saw. It must carry the exact user inputs, the committed display result, selected fare facts, active views, ordered visible fare IDs, aggregate cells, omissions, and stable inspection handles. A pending refresh must not rewrite the previous display record until its new result commits.

## Acceptance criteria

- The 49-component catalog remains the compositional vocabulary. Its 11 child-accepting containers remain available for layout.
- Catalog entries bind to fixed component functions. The public API and model tool schemas never accept SQL or an arbitrary query AST.
- The server exposes a strict union of semantic projections. The wire kinds are `farePage`, `calendarDays`, `carrierFacets`, `modeSummary`, and `fareHighlights`. A dated `farePage` is the day-fare projection. Scope manifests, `/api/lookup`, and `/api/locations` cover coverage, selected facts, and location options.
- A component function declares its projection, logical scope, bounded input, response parser, and next-turn serializer in one registry entry.
- Query groups use artifact identity, stable leg scope, and purpose. Replaceable dataset IDs stay implementation handles and do not define the logical group.
- The coordinator coalesces compatible component requirements into one HTTP batch. The backend executes a bounded set of parameterized SQL statements in one read transaction.
- Fare filters preserve current behavior. Carrier facets exclude the carrier filter itself. Calendar baselines ignore the selected day. Later-leg schedule thresholds still derive from the selected arrival plus the destination stay.
- A refresh records a new desired input while the previous committed result remains visible. Canceled, late, source-mismatched, and superseded responses cannot replace the committed display.
- Row views use bounded cursor pagination and explicit display limits. Selected fares remain pinned and inspectable even when they are outside the current page.
- The next-turn context records the exact normalized user input and the exact committed display output separately. It never claims the pending input was displayed.
- Display records contain stable component references, active or hidden state, ordered visible IDs, aggregate cells, viewport limits, completeness, omitted counts, query and result fingerprints, source version, and immutable inspection handles.
- `inspect_display` returns at most five bounded items from a captured committed result. It cannot run a new open-ended query or inspect a different source version.
- The existing 24 KB context cap and 12-fact turn budget stay in force until measured tests justify a change. Omitted facts are reported explicitly.
- Full fare rows remain outside model prompts, tool arguments, and next-turn context. Existing privacy rejection tests remain green.
- The classic search page keeps its current `/api/search` path. Obsolete generative bulk-preload code is deleted only after every generative caller moves to server queries.
- A real browser run against the actual SQLite API renders a representative multi-city plan on desktop and mobile. Captured network evidence shows bounded query-group requests rather than page-by-page coverage downloads.
- The final handoff leaves `feature/server-driven-generative-ui-review` checked out, with reviewable commits, no merge, and no push.

## Repository and dirty-baseline record (historical isolation evidence)

The original checkout was on `dev` at `7c60602` with active concurrent changes. Creating `feature/server-driven-generative-ui` in that checkout preserved those changes, but the worktree continued to change while it was being inspected. That checkout is therefore evidence only and is not an implementation workspace.

At the first full status capture, the original checkout had 35 modified tracked files, 12 untracked files, and no staged files. The initial unstaged patch fingerprint was `0927a4de14fef2a0ddf0601bb7081568568bfb38a44ae7493af3bf2d208ea784`. A later diagnostic archive captured a moving snapshot at `/tmp/server-driven-generative-ui-baseline.FcThYk`:

- `tracked.patch`: `eff141bec32a79abca8f0c953dd44ca33eb4af4a2d10912f932269fb49eb42c7`
- `staged.patch`: `e3b0c44298fc1c149afbf4a8996fb92427ae41e4649b934ca495991b7852b855`, the SHA-256 of an empty file
- `untracked-manifest.txt`: `2a577ee444eabf7835a8741e3db7b9eb47997fece51c5fa39d43bb1783f17e8d`

The live patch changed again immediately after that archive. Do not use the archive as a source patch or copy its files into this worktree. It only proves why implementation must stay isolated.

The managed worktree was created directly from committed HEAD `7c60602ebbd1dedebf3ea22c8f56ae98077a1da3`. It started detached, then attached to the clean branch `feature/server-driven-generative-ui-review`. All implementation, testing, screenshots, and commits belong there.

This worktree does not contain `node_modules` or the ignored database. The original checkout has the matching installed dependency tree at `/Users/ardaozdogru/projects/omio-gen-ui-demo/node_modules`; create a worktree-local symlink only after confirming the lockfile is unchanged. The available database is `/Users/ardaozdogru/projects/omio-gen-ui-demo/data/omio.sqlite3`. A read-only metadata query found schema version 3, generator version 3, `all_ordered_pairs_daily`, exactly 10,000,000 rows, and coverage from 2026-10-08 through 2027-12-31. The clean base documentation describes the older version 2 date range. Use the available file read-only through `--database` after a schema smoke test. Do not regenerate 10 million rows for this feature. Unit tests use small temporary fixtures. If the version 3 schema is incompatible, stop the live proof with a precise compatibility finding instead of replacing the user's database.

If work must later touch a file that is also dirty in the original checkout, compare the clean-branch diff to the original baseline by hunk. Never use `git add -A`, stash the original checkout, reset it, or copy a whole mixed file over it. Integration into the original checkout is outside this task.

## Original system at the committed base (historical)

The backend owns a deterministic 10,000,000-row SQLite timetable covering 2026-01-01 through 2027-12-31. `/api/search` accepts one exact departure date, optional return date, mode, sort, page, and limit. `_search_leg` counts and selects one route-day scope with parameterized SQL, then returns up to 100 rows plus per-mode summaries.

The generative path expands a requested date window in the browser. `loadResource` loops every route, date, and API page, collects normalized `FareRow` objects, and registers them with `FareDataBridge`. A local worker executes `QueryIR` over those copied rows. React views build their own `QueryIR` inside `useTravelQuery`.

The model receives manifests and bounded tools. It does not receive fare rows. The current next-turn snapshot records artifact state, dataset manifests, component bindings, planned fare IDs, and selected fare facts under a 24 KB cap. It does not yet provide a versioned ledger of the rows and aggregates that each component committed to the screen.

The catalog contains 49 entries. Eleven entries accept child components: `TravelHero`, `Carousel`, `TravelSurface`, `Section`, `Stack`, `Inline`, `ResponsiveGrid`, `SplitPane`, `StickySummary`, `Tabs`, and `Callout`.

## Caller view

A catalog component asks for a semantic result. It does not construct transport details or SQL:

```ts
const fares = useComponentFunction({
  artifactId,
  componentRef,
  legKey,
  purpose: "primary-fare-list",
  function: {
    kind: "orderedFares",
    input: {
      route,
      dateWindow,
      passengers,
      filters,
      scheduleThreshold,
      order,
      cursor,
      limit: 20,
    },
  },
});
```

Several components in one artifact can request results together:

```ts
const response = await queryCoordinator.refresh({
  artifactId,
  requirements: [fareListRequirement, calendarRequirement, carrierFacetRequirement],
  signal,
});
```

The model sees a compact committed display record:

```ts
{
  componentRef: "root.main.leg-0.fares",
  keySource: "authored-key",
  group: { artifactId, legKey: "london:paris", purpose: "primary-fare-list" },
  intent: { queryKey, inputHash, inputVersion: 4 },
  committed: {
    resultKey,
    inputHash: previousInputHash,
    inputVersion: 3,
    resultFingerprint,
    sourceVersion,
    orderedFareIds,
    viewport: { offset: 0, limit: 20 },
    complete: false,
    omittedCount: 65,
    displayHandle,
  },
}
```

When the model needs detail that did not fit in the turn envelope, it uses the immutable handle:

```ts
await inspect_display({ captureId, displayHandle, resultKey, itemIds, limit: 5 });
```

## Contract sketch

Place the query contract in `src/generative/contracts/query-groups.ts`. This module owns the public projection union and remains independent of React and HTTP.

```ts
type QueryGroupScope = {
  artifactId: ArtifactId;
  legKey: string;
  purpose: string;
};

type ProjectionRequest =
  | { kind: "farePage"; input: FarePageInput }
  | { kind: "calendarDays"; input: CalendarDaysInput }
  | { kind: "carrierFacets"; input: CarrierFacetsInput }
  | { kind: "modeSummary"; input: ModeSummaryInput }
  | { kind: "fareHighlights"; input: FareHighlightsInput };

type QueryRequirement = {
  group: QueryGroupScope;
  componentRef: string;
  queryKey: string;
  inputVersion: number;
  inputHash: string;
  projection: ProjectionRequest;
};

type QueryBatchRequest = {
  schemaVersion: 1;
  sourceVersion?: string;
  requirements: QueryRequirement[];
};

type QueryBatchResult = {
  schemaVersion: 1;
  captureId: string;
  sourceVersion: string;
  results: ProjectionResult[];
};
```

Each input reuses small domain values such as route, date window, passengers, modes, direct-only, price bounds, duration bounds, carrier IDs, schedule threshold, fixed sort choices, cursor, and limit. Inputs are strict objects. Limits remain projection-specific and server-enforced.

Place display contracts in `src/generative/contracts/display-context.ts`:

```ts
type ComponentRef = {
  value: string;
  keySource: "authored-key" | "tree-path";
};

type QueryIntent = {
  queryKey: string;
  inputHash: string;
  inputVersion: number;
};

type CommittedDisplay = {
  resultKey: string;
  inputHash: string;
  inputVersion: number;
  resultFingerprint: string;
  sourceVersion: string;
  datasetIdentity: string;
  active: boolean;
  orderedIds: FareId[];
  aggregateCells: DisplayCell[];
  viewport?: { offset: number; limit: number; cursor?: string };
  complete: boolean;
  omittedCount: number;
  displayHandle: string;
};

type DisplayLedgerEntry = {
  componentRef: ComponentRef;
  group: QueryGroupScope;
  intent: QueryIntent;
  committed?: CommittedDisplay;
};
```

Use separate version numbers for query-group and display-context wire formats. Because dataset ownership and agent context change materially, bump the containing generative contract version and migrate all generative callers in the same branch. Do not add a browser-row compatibility shim. Keep `/api/search` for classic search.

## Frozen query wire contract

Implement these names and shapes in strict Zod 4 schemas and identical camelCase backend JSON. Only the query worker edits `src/generative/contracts/index.ts` to re-export them. The backend worker implements the matching request parser and serializer under `backend/**`.

The fare scalar keeps the clean-base committed fare fields and adds bounded, source-authored route legs. It has no redundant transfer count, arrival instant, timestamp, or time-zone fields:

```ts
type FareItem = {
  id: FareId;
  originId: string;
  destinationId: string;
  serviceDate: Date;
  mode: "train" | "bus" | "flight" | "ferry";
  carrierId: string;
  carrierName: string;
  priceCents: number;
  durationMinutes: number;
  departureMinutes: number;
  availableSeats: number;
  currency: "EUR";
  synthetic: true;
  priceBasis: "per-passenger-including-demo-fees";
  direct: boolean;
  legs: FareLeg[];
};

type FareLeg = {
  legIndex: number;
  mode: "train" | "bus" | "flight" | "ferry";
  carrierName: string;
  durationMinutes: number;
  originId: string;
  destinationId: string;
  originLabel: string;
  destinationLabel: string;
};

type FareSource = {
  kind: "search";
  descriptorId: ResourceKey;
  sourceVersion: string;
};

type FareScope = {
  kind: "fareScope";
  originId: string;
  destinationId: string;
  dateWindow: { from: Date; to: Date };
  passengers: number;
  earliestDeparture: { date: Date; minutes: number };
};

type FareScopeManifest = {
  kind: "fareScopeManifest";
  resourceKey: ResourceKey;
  source: FareSource;
  coverage: FareScope;
  availableDateWindow: { from: Date; to: Date } | null;
  totalAvailable: number;
  availableModes: TransportMode[];
  complete: boolean;
};
```

`passengers` is 1 through 8. `earliestDeparture.minutes` is 0 through 1439. Leg indices are sequential from zero, and `direct === (legs.length <= 1)`. `complete` is true only when `availableDateWindow` equals the requested `coverage.dateWindow`. A partial overlap reports the intersection and `complete: false`; a fully unavailable window reports `availableDateWindow: null`, zero availability, and bounded empty projections. It never claims the browser materialized every row. The backend emits `carrierId` as `carrier-${stableRef(companyName)}` using the same unsigned 32-bit FNV-1a algorithm as `resource-loader.ts`.

`POST /api/query-groups` accepts:

```json
{
  "version": 1,
  "requestId": "req-1",
  "expectedSourceVersion": null,
  "groups": [{
    "groupId": "artifact-1:leg:london:paris",
    "scope": {
      "kind": "fareScope",
      "originId": "london",
      "destinationId": "paris",
      "dateWindow": { "from": "2026-10-26", "to": "2026-11-05" },
      "passengers": 1,
      "earliestDeparture": { "date": "2026-10-26", "minutes": 1020 }
    },
    "projections": [
      {
        "projectionId": "ordered",
        "kind": "farePage",
        "filters": { "modes": ["train"], "carrierIds": [], "directOnly": false },
        "serviceDate": null,
        "sort": { "field": "departureMinutes", "direction": "asc" },
        "after": null,
        "limit": 25
      },
      {
        "projectionId": "calendar",
        "kind": "calendarDays",
        "filters": { "modes": ["train"], "carrierIds": [], "directOnly": false },
        "objective": "cheapest"
      },
      {
        "projectionId": "carriers",
        "kind": "carrierFacets",
        "filters": { "modes": ["train"], "carrierIds": ["carrier-x"], "directOnly": false }
      },
      {
        "projectionId": "modes",
        "kind": "modeSummary",
        "filters": { "modes": ["train"], "carrierIds": [], "directOnly": false },
        "baseline": "withoutModeFilter"
      },
      {
        "projectionId": "highlights",
        "kind": "fareHighlights",
        "filters": { "modes": ["train"], "carrierIds": [], "directOnly": false }
      }
    ]
  }]
}
```

Filters also allow optional `minPriceCents`, `maxPriceCents`, and `maxDurationMinutes`. Empty `modes` means no mode restriction, matching current filter behavior. A request contains 1 through 8 groups. Each group contains 0 through 8 projections. An empty projection list loads a scope manifest without returning fare items.

The success response is:

```ts
type QueryGroupsResponse = {
  version: 1;
  requestId: string;
  sourceVersion: string;
  groups: Array<{
    groupId: string;
    manifest: FareScopeManifest;
    projections: Array<
      | {
          projectionId: string;
          kind: "farePage";
          inputHash: string;
          resultFingerprint: string;
          items: FareItem[];
          pageInfo: {
            total: number;
            returned: number;
            hasNextPage: boolean;
            nextCursor: string | null;
          };
        }
      | {
          projectionId: string;
          kind: "calendarDays";
          inputHash: string;
          resultFingerprint: string;
          days: Array<{ date: Date; count: number; representative: FareItem | null }>;
        }
      | {
          projectionId: string;
          kind: "carrierFacets";
          inputHash: string;
          resultFingerprint: string;
          options: Array<{ carrierId: string; carrierName: string | null; count: number }>;
        }
      | {
          projectionId: string;
          kind: "modeSummary";
          inputHash: string;
          resultFingerprint: string;
          baseline: "withoutModeFilter" | "active";
          modes: Array<{
            mode: TransportMode;
            count: number;
            minPriceCents: number | null;
            minDurationMinutes: number | null;
          }>;
        }
      | {
          projectionId: string;
          kind: "fareHighlights";
          inputHash: string;
          resultFingerprint: string;
          cheapest: FareItem | null;
          fastest: FareItem | null;
        }
    >;
  }>;
};
```

Representative JSON keeps the same camelCase field names:

```json
{
  "version": 1,
  "requestId": "req-1",
  "sourceVersion": "sqlite-demo-v2-example",
  "groups": [{
    "groupId": "artifact-1:leg:london:paris",
    "manifest": {
      "kind": "fareScopeManifest",
      "resourceKey": "scope-example",
      "source": {
        "kind": "search",
        "descriptorId": "scope-example",
        "sourceVersion": "sqlite-demo-v2-example"
      },
      "coverage": {
        "kind": "fareScope",
        "originId": "london",
        "destinationId": "paris",
        "dateWindow": { "from": "2026-10-26", "to": "2026-11-05" },
        "passengers": 1,
        "earliestDeparture": { "date": "2026-10-26", "minutes": 1020 }
      },
      "availableDateWindow": { "from": "2026-10-26", "to": "2026-11-05" },
      "totalAvailable": 1234,
      "availableModes": ["train", "bus"],
      "complete": true
    },
    "projections": [{
      "projectionId": "ordered",
      "kind": "farePage",
      "inputHash": "input-example",
      "resultFingerprint": "result-example",
      "items": [{
        "id": "fare_000000123",
        "originId": "london",
        "destinationId": "paris",
        "serviceDate": "2026-10-26",
        "mode": "train",
        "carrierId": "carrier-example",
        "carrierName": "Example Rail",
        "priceCents": 2500,
        "durationMinutes": 160,
        "departureMinutes": 1080,
        "availableSeats": 4,
        "currency": "EUR",
        "synthetic": true,
        "priceBasis": "per-passenger-including-demo-fees",
        "direct": true,
        "legs": [{
          "legIndex": 0,
          "mode": "train",
          "carrierName": "Example Rail",
          "durationMinutes": 160,
          "originId": "london",
          "destinationId": "paris",
          "originLabel": "London",
          "destinationLabel": "Paris"
        }]
      }],
      "pageInfo": {
        "total": 82,
        "returned": 1,
        "hasNextPage": true,
        "nextCursor": "opaque-cursor"
      }
    }]
  }]
}
```

All projections run against one verified source version and read snapshot. The initial endpoint is all-or-nothing. Errors always use `{ version: 1, requestId, error: { code, message } }`. Stable codes are `invalidRequest` with HTTP 400, `unknownScope` with HTTP 400, `staleCursor` with HTTP 409, `sourceChanged` with HTTP 409, `databaseUnavailable` with HTTP 503, and `internalError` with HTTP 500. Responses never expose SQL or internal exception text.

```json
{
  "version": 1,
  "requestId": "req-1",
  "error": {
    "code": "staleCursor",
    "message": "The result cursor no longer matches this fare scope."
  }
}
```

`farePage` uses full-scope server filtering and deterministic cursor pagination. `serviceDate: null` means the whole scope window. An explicit date means the day list. The cursor binds source version, normalized scope, filters, sort, and the final ordering tuple. `limit` is 1 through 100. Ordering uses the requested primary sort, then `serviceDate`, `departureMinutes`, and `id`.

`calendarDays` scans every date in scope and does not accept the active selected date. It applies the threshold and all declared filters. Cheapest representatives order by price, departure, then ID. Fastest representatives order by duration, departure, then ID. Selecting a date refreshes only a dated `farePage`.

`carrierFacets` applies modes, price, duration, direct, and threshold filters while ignoring `carrierIds`. `modeSummary` with `withoutModeFilter` applies carrier, price, duration, direct, and threshold filters while ignoring modes. `modeSummary` with `active` applies all filters. `fareHighlights` applies active filters and returns independent deterministic cheapest and fastest winners. Selected totals never use a filtered-query aggregate.

`POST /api/lookup` accepts source-scoped pins:

```json
{
  "version": 1,
  "requestId": "lookup-1",
  "sourceVersion": "sqlite-demo-v2-...",
  "pins": [{ "fareId": "fare_000000123", "resourceKey": "scope-..." }]
}
```

The response is `{ version: 1, requestId, sourceVersion, items: FareItem[], missingPins: Array<{ fareId, resourceKey }> }`. The request accepts at most 160 deduplicated pins. A source mismatch returns HTTP 409 `sourceChanged`. The client keeps immutable `{ fareId, resourceKey, sourceVersion }` pins outside the page cache, and selected facts remain usable after page eviction.

```json
{
  "version": 1,
  "requestId": "lookup-1",
  "sourceVersion": "sqlite-demo-v2-example",
  "items": [{
    "id": "fare_000000123",
    "originId": "london",
    "destinationId": "paris",
    "serviceDate": "2026-10-26",
    "mode": "train",
    "carrierId": "carrier-example",
    "carrierName": "Example Rail",
    "priceCents": 2500,
    "durationMinutes": 160,
    "departureMinutes": 1080,
    "availableSeats": 4,
    "currency": "EUR",
    "synthetic": true,
    "priceBasis": "per-passenger-including-demo-fees",
    "direct": true,
    "legs": [{
      "legIndex": 0,
      "mode": "train",
      "carrierName": "Example Rail",
      "durationMinutes": 160,
      "originId": "london",
      "destinationId": "paris",
      "originLabel": "London",
      "destinationLabel": "Paris"
    }]
  }],
  "missingPins": []
}
```

A lookup error uses the same envelope and stable code set:

```json
{
  "version": 1,
  "requestId": "lookup-1",
  "error": {
    "code": "sourceChanged",
    "message": "The fare source changed. Refresh the displayed results."
  }
}
```

The public client seam is:

```ts
interface FareProjectionBridge {
  loadScope(scope: FareScope, signal: AbortSignal): Promise<FareScopeManifest>;
  executeGroup(group: QueryGroupRequest, signal: AbortSignal): Promise<QueryGroupResult>;
  lookupPins(input: LookupPinsRequest, signal: AbortSignal): Promise<LookupPinsResult>;
  getManifest(resourceKey: ResourceKey): FareScopeManifest;
  subscribe(resourceKey: ResourceKey, listener: () => void): () => void;
  release(resourceKey: ResourceKey): void;
  dispose(): void;
}
```

Production code exposes no `query(QueryIR)`. `TravelServices.queryForView` is removed. QueryIR and the local engine may remain only behind a fixed-projection fixture adapter.

Coordinator identity is frozen as:

```ts
type QueryIntentIdentity = {
  queryKey: string;
  groupKey: string;
  projectionKey: string;
  desiredInputHash: string;
  desiredInputVersion: number;
  uiRevision: UIStateRevision;
};

type QueryResultIdentity = {
  resultKey: string;
  inputHash: string;
  inputVersion: number;
  requestId: string;
  resourceKey: ResourceKey;
  datasetId: string;
  datasetRevision: number;
  sourceVersion: string;
  resultFingerprint: string;
  total: number;
  truncated: boolean;
};

type QueryExecutionState =
  | { status: "loading"; intent: QueryIntentIdentity }
  | { status: "ready"; intent: QueryIntentIdentity; current: QueryResultIdentity }
  | { status: "refreshing"; intent: QueryIntentIdentity; current: QueryResultIdentity }
  | { status: "error"; intent: QueryIntentIdentity; previous?: QueryResultIdentity };
```

Normalized dependencies control fingerprints and versions. An unrelated artifact revision does not. `captureProjectionResult(resultKey)` returns the exact immutable bounded projection snapshot used by display capture. A stable `queryKey` identifies intent and is not an immutable result lookup.

Current selected fare IDs may temporarily gain a pin map in one migration commit. All active callers must move to immutable pins and the compatibility map must be deleted before the first-render handoff. The final runtime has one source of truth for selection.

## Fixed server projections

Catalog function names describe UI intent. Wire discriminants describe one canonical server operation. Keep the mapping explicit:

| Catalog function | Server operation |
| --- | --- |
| `orderedFares` | `farePage` with `serviceDate: null` |
| `dayFares` | `farePage` with an explicit `serviceDate` |
| `calendarDays` | `calendarDays` |
| `carrierFacets` | `carrierFacets` |
| `modeStats` | `modeSummary` with an explicit baseline |
| `fareHighlights` | `fareHighlights` |
| `selectedFacts` | `POST /api/lookup` |
| `coverage` | query group with `projections: []`, returning the scope manifest |
| `locationOptions` | the bounded locations endpoint and client |

`farePage` returns a stable ordered page of display-ready fare facts, total count, cursor, and completeness. It covers both ordered multi-day results and date-specific day results. It accepts only the supported fare filters and sort choices. The server adds stable tie-breakers.

`calendarDays` returns one row per date with count plus the representative fare required by the chosen calendar objective. It applies route, passenger, mode, price, duration, direct, carrier, and schedule constraints but ignores the currently selected calendar date.

`carrierFacets` returns carrier IDs, names, and counts. It applies the current scope except the carrier selection itself, so selected and unselected carrier choices remain discoverable.

`modeSummary` returns per-mode counts and fixed aggregates under the current route and date scope. Its explicit `baseline` says whether it excludes the mode filter, and tests cover both values.

`fareHighlights` returns fixed cheapest and fastest facts. The response shape names each objective and does not let callers choose arbitrary projected fields.

`/api/lookup` resolves pinned selected IDs against one source version. It is independent of the current list cursor and returns an explicit missing-pin list.

The empty-projection scope load returns logical route, date, mode, source, and completeness information. It replaces generative manifests that imply a browser-owned full row resource.

`/api/locations` continues to return bounded location suggestions and route-aware availability needed by city controls.

The backend may reuse an internal query representation, but only code-owned projection compilers can produce it. The HTTP boundary parses the fixed union, compiles parameterized statements, and never evaluates caller-supplied SQL, columns, operators, table names, or order fragments.

## Component function registry

Add a registry near the catalog, for example `src/generative/catalog/component-functions.ts`. One entry owns the relationship between a catalog component and server data:

```ts
type ComponentFunctionDefinition<K extends ProjectionRequest["kind"]> = {
  component: CatalogComponentName;
  purpose: string;
  projection: K;
  bindInput(context: ComponentBindingContext): ProjectionInput<K>;
  parseResponse(value: unknown): ProjectionOutput<K>;
  toDisplayRecord(output: ProjectionOutput<K>, context: DisplayContext): DisplayRecord;
  toNextTurn(record: DisplayRecord): DisplayContextEntry;
};
```

The registry is the single source of truth for what each component queries and what it reports to the next turn. Layout-only containers need visibility instrumentation but no query. Data views use registry functions. Controls update host state, which changes input hashes and triggers the relevant groups.

## Query coordination and server transport

Add a coordinator that owns desired intent, in-flight batches, cancellation, result commitment, and subscriptions. A projection fingerprint includes projection kind, normalized logical input, source scope, pagination cursor, and fixed contract version. An artifact group key includes `artifactId`, stable `legKey`, and purpose.

On state change:

1. Freeze normalized host inputs for every active component.
2. Build requirements and deterministic input hashes.
3. Publish desired intents to the ledger without deleting committed results.
4. Coalesce compatible requirements into one HTTP request.
5. Abort superseded requests where possible.
6. Execute all projection statements in one backend read transaction against one verified source version.
7. Validate the strict batch response.
8. Commit only results whose group, input version, input hash, source version, and current desired intent still match.
9. Keep prior committed displays when a refresh fails or is canceled. Record an error or stale status separately.

`uiRevision` remains useful for action guards and metadata. It must not invalidate every query when unrelated UI state changes.

The transport returns bounded results. For row projections, use an opaque cursor bound to the projection fingerprint and source version. Reject a cursor if either changes. Keep display limits separate from fetch limits, and record both in the committed display.

## Display ledger and next-turn context

Add a runtime-owned display store. `CatalogNode` injects a stable component reference from authored `$key`; when absent, it uses the deterministic tree path and marks `keySource: "tree-path"`. Remounts with the same authored tree keep the same reference.

Every view family commits display evidence:

- lists, fare strips, tables, timelines, and plots record exact ordered fare IDs and viewport bounds;
- calendars record ordered day cells, their aggregates, and representative fare IDs;
- comparison matrices, mode summaries, and facets record labeled aggregate cells in display order;
- selected itinerary records the ordered selected fare IDs and facts used to render them;
- route, coverage, location, status, and retry views record the exact bounded values or state shown;
- `Tabs` records the active child and marks hidden children inactive without deleting their last committed result;
- containers record active descendants and stable layout identity without copying child data.

Before the next chat request, freeze artifact state and the display ledger atomically. Then resolve selected fare facts against the frozen selected IDs and source versions. Deduplicate facts by `(sourceVersion, fareId)`. Allocate the 12-fact budget to visible and selected facts first. Each context section reports `complete` and `omittedCount`; no truncation is silent.

The snapshot contains both the current intent and the previous committed display when a refresh is pending. `activeViews` lists visible component references in render order. `exposedOrderedIds` contains only IDs actually exposed by active views. Aggregate facts identify their source projection and result key.

An immutable capture stores any bounded details omitted from the 24 KB envelope. `inspect_display` requires `captureId`, `displayHandle`, and `resultKey`, accepts at most five item IDs, and reads only that capture. A source-version mismatch, unknown item, expired capture, or result mismatch returns a strict error.

## Privacy and data rules

- Preserve `assertNoBulkData` at request, tool, snapshot, and server-response boundaries.
- Extend forbidden-key and copied-row tests for the new query batch, display context, history, and inspection tool.
- Keep fares labeled synthetic and EUR per passenger, including demo fees.
- Use `departureMinutes`, service date, and authoritative duration. Do not infer or invent time zones.
- Send stable fare IDs and compact facts to the model. Never send a hidden page, full SQL result, full dataset, or arbitrary server error.
- Sanitize backend failures into fixed error codes. Log diagnostic detail only on the local server.

## Module map and worker ownership

Backend worker owns:

- `backend/query_groups.py` for strict parsing, fixed projection compilers, cursor validation, and batch execution;
- focused backend tests for every projection and invariant;
- the minimal `/api/query-groups` integration in `backend/app.py`;
- backend documentation for the fixed endpoint.

Query worker owns:

- `src/generative/contracts/query-groups.ts`;
- the sole edit and re-export work in `src/generative/contracts/index.ts` during parallel implementation;
- the server query client, query coordinator, projection fingerprints, group registry, and client tests;
- `src/generative/catalog/component-functions.ts`;
- migration of `src/generative/catalog/context.tsx` and the generative data bridge away from browser row ownership;
- query-facing catalog tests.

Runtime worker owns:

- `src/generative/contracts/display-context.ts`;
- the display store, provider, instrumentation helpers, capture store, and snapshot exporter changes;
- stable scene and component identity in `CatalogNode` and the present boundary;
- instrumentation for layout, tabs, status, controls, views, and trip-planning components;
- `inspect_display`, its request and response schemas, prompt language, and tests;
- next-turn display-context and snapshot-resource tests.

The runtime worker does not edit `contracts/index.ts`. It sends the required `display-context.ts` export name to the query worker, which applies the sole index re-export change.

The root integrator owns:

- cross-worker wiring, version migration, deletion of obsolete generative preload paths, and conflict resolution;
- live server and browser proof;
- the progress journal after the plan handoff;
- final graph refresh, screenshots, user-test render, and branch state.

Keep one owner for each shared file. Workers use separate worktrees and return small verified commits. Cherry-pick backend, query contracts/coordinator, runtime ledger, then integration in dependency order. If a worker needs another owner's file, it supplies a patch suggestion rather than editing it.

## Milestones and commit boundaries

| Milestone | Owner | Status |
| --- | --- | --- |
| 0. Clean base and plan | `/root/plan_branch` | complete at `a29b55e` |
| 1. Fixed SQL projections | `/root/plan_branch` | complete; 26 backend tests and real database smoke passed |
| 2. Query contracts and coordinator | `/root/query_composition_design` | complete at `dbd321c`; live wire verified |
| 3. Catalog function bindings | `/root/query_composition_design` | foundation validated; production migration pending |
| 4. Display ledger and inspection capture | `/root/runtime_composition` | in progress |
| 5. Runtime migration and preload deletion | `/root` | pending integration |
| 6. First user-test render | `/root` | pending integration |
| 7. Graph refresh and handoff | `/root` | pending integration |

### 0. Preserve the clean base and journal

- Verify branch, HEAD, upstream state, and clean status in the isolated worktree.
- Start the progress journal section in this file before source edits.
- Record worker branches, owned files, base commits, and returned commit hashes.
- Completion: the clean base and ownership map are reproducible.
- Commit: the plan only.

### 1. Prove fixed SQL projections

- Implement the strict server request union and all fixed projection compilers.
- Execute a batch inside one SQLite read transaction and verify source version before and after.
- Implement cursor binding and fixed result caps.
- Test projection output, filter semantics, stable order, parameterization, invalid inputs, cursor mismatch, and source mismatch.
- Completion: backend unit tests demonstrate every projection against a deterministic fixture.
- Commit: backend contracts, endpoint, tests, and docs.

### 2. Add query contracts, client, and coordinator

- Add strict TypeScript schemas mirroring the server union.
- Implement normalized fingerprints, artifact-leg-purpose groups, batching, cancellation, and matching-result commitment.
- Keep committed results visible while a new intent is pending.
- Test request coalescing, stale responses, source changes, supersession, cursor pagination, and unrelated `uiRevision` changes.
- Completion: coordinator tests pass without React and without browser-owned row resources.
- Commit: query contracts, transport, coordinator, and unit tests.

### 3. Bind catalog components to semantic functions

- Add the component function registry.
- Migrate every data-bearing view and planner component to fixed projections.
- Preserve facet exclusion, calendar baseline, date-specific fares, sort behavior, and schedule cascade.
- Preserve the current 49 components and 11 composition containers.
- Completion: catalog tests render deterministic server-shaped projection results and no data view constructs arbitrary public QueryIR.
- Commit: registry and catalog migration.

### 4. Add the display ledger and inspection capture

- Add strict display-context schemas and the runtime store.
- Instrument all view families, active tab state, stable component identity, ordered IDs, aggregate cells, and viewport data.
- Add immutable capture storage and bounded `inspect_display`.
- Freeze UI and ledger before asynchronous selected-fact resolution.
- Test pending refresh versus committed output, remount identity, hidden tabs, omitted counts, capture mismatch, and source-scoped selected facts.
- Completion: a next-turn snapshot can be checked against the exact rendered fixture DOM.
- Commit: display ledger, instrumentation, inspection tool, and tests.

### 5. Migrate the generative runtime and delete bulk preload

- Wire the server coordinator into the travel provider and browser tools.
- Replace generative dataset manifests with logical server scopes and bounded result handles.
- Migrate request parsing, prompt guidance, turn accounting, and tool history.
- Delete page-by-page generative coverage loading and local row-query callers after the last caller moves.
- Retain classic search behavior and `/api/search`.
- Completion: repository searches find no generative bulk preload path, and privacy checks reject row-bearing model payloads.
- Commit: runtime integration and legacy deletion.

### 6. Prove the first user-test render

- Start the real SQLite backend and the app from the isolated branch.
- Exercise one multi-city request through the actual chat path and one deterministic fixture path.
- Capture server logs or request traces showing one coalesced fixed-query batch per refresh and no fare-page download loop.
- Test desktop and mobile layouts, including the right-side selected-fare tracker and narrow stacking.
- Change a filter, calendar day, sort, selected fare, stay duration, and route leg. Verify the DOM, display ledger, next-turn snapshot, cancellation, and refresh behavior after each change.
- Reload the saved chat and confirm selected facts, active views, and stable inspection handles remain coherent.
- Completion: open the local preview for the user with a populated render and save desktop and mobile screenshots plus the network and snapshot evidence.
- Commit: only meaningful verification scripts or durable fixtures. Do not commit transient traces unless they are required review evidence.

### 7. Refresh graphs and hand off

- Run `code-review-graph update --repo .`.
- Run `graphify update .` and verify `graphify-out/graph.json` parses.
- Re-run the relevant focused suites after any graph hook changes tracked files.
- Verify `git diff --check`, branch name, HEAD, commit list, and status.
- Completion: report commit hashes, tests, preview location, evidence paths, remaining risks, and confirm no merge or push occurred.

## Validation matrix

Backend:

- every projection with empty, one-row, multi-row, and capped results;
- SQL injection strings remain bound values;
- exact-date, date-window, route, passenger, seat, mode, carrier, price, duration, direct, and schedule-threshold filters;
- carrier facet excludes its own filter;
- calendar ignores the selected date and uses the requested objective;
- deterministic ordering and cursor continuation;
- one source version and one read transaction per batch;
- canceled or changed sources cannot produce a committable response.

TypeScript domain and coordinator:

- strict schema rejection for unknown keys and over-budget arrays;
- projection registry covers every data-bearing catalog component;
- deterministic fingerprints and group keys;
- batching, deduplication, cancel, retry, stale response, and source mismatch;
- a pending input keeps the old committed display intact;
- cursor pages append without duplicate or reordered IDs;
- selected IDs remain pinned when outside the current page.

Display and agent context:

- stable authored key and deterministic path fallback;
- ordered visible IDs match DOM order for list, strip, table, timeline, and plot views;
- calendar and facet cells match rendered order and values;
- hidden tab children are inactive and the active child is explicit;
- intent and committed result versions can differ during refresh;
- 12 facts and 24 KB limits report omissions instead of silently dropping data;
- selected facts are frozen, source-scoped, and deduplicated;
- `inspect_display` returns at most five items from the exact capture and result;
- privacy tests reject full rows in requests, history, tools, and snapshots.

Browser:

- actual backend, actual chat transport, and fixture runs;
- desktop at 1280 px or wider;
- mobile at 390 px and 360 px;
- populated fares, calendar, facets, selected tracker, cancellation, retry, and reload;
- server request capture proves fixed query groups and bounded results;
- next-turn snapshot is checked against the visible UI after local interactions.

## Progress journal

Append entries and do not rewrite earlier decisions after implementation starts. `/root/plan_branch` is the sole Git commit steward while the three implementation workers share the managed worktree, so no worker races the index or `HEAD`.

Current checklist:

- [x] Inspect code-review graph and Graphify graph at committed HEAD.
- [x] Record original dirty checkout and moving patch fingerprints.
- [x] Create the original in-place topic branch without disturbing dirty files.
- [x] Create a clean managed worktree at `7c60602`.
- [x] Create `feature/server-driven-generative-ui-review` in the managed worktree.
- [x] Write and verify this implementation plan.
- [x] Commit this plan alone as `a29b55e`.
- [x] Implement and commit fixed backend projections.
- [x] Implement and commit query contracts and coordinator.
- [x] Implement and commit component function bindings.
- [x] Implement and commit display ledger and inspection capture.
- [x] Migrate runtime and delete obsolete generative preload paths.
- [x] Run focused, full, privacy, and browser validation.
- [x] Refresh both graphs.
- [x] Open the populated local preview for user testing.
- [x] Report local commits and confirm no merge or push.

Implementation entries:

- 2026-10-08: The public protocol is accepted as written above. Backend responses use the clean committed `FareItem`; fields observed only in the original dirty checkout, including transfers and legs, are excluded. Group and projection fingerprints depend on normalized query inputs rather than global `uiRevision`.
- 2026-10-08: Three workers began from the same clean managed worktree: `/root/plan_branch` owns `backend/**` and this journal, `/root/query_composition_design` owns the query contract/coordinator and catalog functions, and `/root/runtime_composition` owns the display ledger and runtime instrumentation. `/root/plan_branch` is the sole commit steward and stages only explicitly reported owner paths.
- 2026-10-08: The query worker validated the self-contained query protocol, HTTP client, batching coordinator, immutable bounded results, and 49-component static registry with focused tests and typecheck. This is the milestone 3 foundation; production catalog migration remains pending.
- 2026-10-08: The query foundation was isolated in local commit `dbd321c`; its three focused test files pass six tests. Unfinished index, context, bridge, runtime, backend, and dependency-link changes were excluded.
- 2026-10-08: Backend milestone 1 implements strict POST query groups and lookup, fixed parameterized projections, read-only batch transactions, chronological multi-day cursors, complete zero-count calendar rows, exclude-self facets, explicit mode baselines, stable pin lookup, body and query timeouts, source replacement rejection, and versioned errors while retaining classic GET search. The full backend suite passes 26 tests. A read-only source smoke returned 238 available London-to-Paris fares across 11 days in 0.013 seconds and resolved a selected pin in 0.001 seconds.
- 2026-10-08: The original checkout database changed externally during implementation. Its source version and modification time advanced, and live health now reports 50,000,000 fares and an 8,274,644,992-byte file rather than the 10,000,000-fare baseline recorded above. This worker did not write or regenerate it. Keep provenance unknown, retain read-only access, and do not use the later size as evidence that the requested 10-million-row baseline was preserved.
- 2026-10-08: The committed backend is running read-only on `127.0.0.1:8003` as PID `73957` for integration and browser proof. A live TypeScript client test parsed manifest-only output and all five projection variants, continued cursor page two with stable chronological order and counts, resolved numeric and nullable lookup fields, and parsed a typed HTTP 409 `sourceChanged`; two live-wire tests pass.
- 2026-10-08: The managed worktree initially lacked a code-review graph. The required full build completed at plan HEAD `a29b55e`; both code-review graph and Graphify still require a final refresh after integration.
- 2026-10-08: Candidate isolated preview ports are backend `8003`, agent `8013`, and frontend `5175`. Confirm availability before starting processes and preserve any user-owned process already bound there.
- 2026-10-08: No source edit is made in the original dirty checkout after isolation. Its state and `/tmp/server-driven-generative-ui-baseline.FcThYk` remain read-only diagnostics.
- 2026-10-08: Provenance that is not captured by a worker report may be recorded as unknown or restored. Do not attribute an edit to a worker without evidence.
- 2026-10-08: The backend contract is all-or-nothing for query-group batches. User testing begins only after the populated render is open. The branch remains local, unmerged, and unpushed.
- 2026-10-08: A trusted delegated report identified the replacement source as commits `7030173a6d4d4c4d6b19988d80ba105d9ca1609f` and `71545ad40ef485438b4926350e66fcdcf2524806` from source chat `01a11a95-3269-72a0-9dcc-9ac4545f0905`. The read-only database is generator v4, schema v3, 50,000,000 fares, 120 cities, all ordered pairs, and date coverage 2026-10-08 through 2027-12-31. This branch did not merge or cherry-pick those source commits; it inspected their committed schema and the database metadata read-only.
- 2026-10-08: The earlier clean-base decision excluding route legs is superseded by the verified v3 source. `FareItem` now carries only the bounded ordered leg fields listed in the frozen contract. `direct` is derived from leg count, and `directOnly` is executed from `routes.transfer_count`. There is no redundant public transfer count. Preserved v2 sources synthesize one truthful leg from their fare row.
- 2026-10-08: Scope manifests now distinguish the requested window from `availableDateWindow`. Full overlap is complete, partial overlap returns the bounded intersection with `complete: false`, and a fully unavailable date window returns null availability plus empty projections instead of provoking an unbounded client retry.
- 2026-10-08: Backend source compatibility passes 27 backend tests. A read-only v3 smoke returned six London-to-Paris flight fares on 2026-10-08, all with two ordered legs, while the direct-only projection returned zero. The updated API is running on `127.0.0.1:8003` as PID `78220` with source version `sqlite-demo-v4-acb4e29-1ed351000-18dc82f4e8cc630b`. Four strict live TypeScript tests pass against it, covering every projection, cursor continuation, lookup, source mismatch, connected legs, direct filtering, partial coverage, and fully unavailable coverage.
- 2026-10-08: Commit `b2a394b` closes the v3 source-compatibility milestone. It contains the backend adapter, protocol and live-test updates, and this journal. The committed API restarted on port `8003` as PID `79233`; it continues to read the original database without writes.
- 2026-10-08: Source replacement recovery gets one bounded metadata-only scope refresh followed by a new-generation query. It never retries forever with an expected old source version. Selection handling revalidates or clears old pins when identity cannot be proved. Immutable old-display handles retain the old source identity and expire with a typed error rather than falling through to latest data.
- 2026-10-08: The runtime migration may delete obsolete arbitrary `QueryIR` browser tools. The required model surface remains fixed metadata, source-bound selected-fare lookup, and immutable bounded display inspection. Production components and the actual preview must use the server bridge; only tests may use the new fixed-projection fixture adapter.
- 2026-10-08: The test-only fixed-projection server adapter now exercises the production bridge with the five closed projection variants, coverage intersections, direct filtering, cursor pages, pins, and resource lifecycle. Three legacy data/lifecycle suites have been migrated without adding production compatibility methods. Their focused suite has 14 passing tests; one retained privacy assertion exposed a copied-row detection regression after `legs` became array-valued. This historical blocker was resolved before the final gate below.
- 2026-10-08: Query lifecycle hardening validates returned scope and projection kinds at the HTTP boundary, includes source version and dataset revision in desired-input identity, coalesces cancellable metadata-only scope refreshes, and performs at most one source-change refresh per intent. Late old-source completions cannot commit, stable partial manifests remain cached, binding revisions advance with a new source, and pinned immutable facts remain independent of page eviction. Six focused files pass 23 tests, and isolated strict typecheck passes.
- 2026-10-08: Legacy local `QueryIR` tests now invoke the internal engine only through a test fixture. The production bridge is absent from these tests, fare legs are excluded from scalar query output, and ordering, nullable predicates, grouping, thresholds, joins, and budgets retain 13 passing assertions. This does not restore a public production arbitrary-query seam.
- 2026-10-08: The active trip-planning fixture no longer synthesizes browser fare rows. It loads two logical scopes through the default server bridge, binds the returned resource identities, and targets source-covered October and November 2026 dates. The API verifier now reads the live timetable horizon, executes all five fixed projection variants, checks chronological bounded output, and resolves one source-bound pin. Against the read-only 50-million-fare source it returned 68 London-to-Paris fares for 2026-10-08 through 2026-10-10 and completed the pin lookup.
- 2026-10-08: Local commits `5ae0366` and `9620556` isolate two query boundary corrections: local test-query rows are materialized only from declared scalar fare fields, and refreshed resource identities retire their previous scope mapping before binding changed coverage. The latter passes the bridge and runtime source-refresh suites with six assertions.
- 2026-10-08: The first real native Present attempt on ports 8003, 8013, and 5175 reached the London-to-Paris response but exposed an effect-order defect: the model called `setGroup` before display component registration completed, producing an unknown-component error. This historical blocker was resolved by the runtime registration regression and the native acceptance recorded below.
- 2026-10-08: Runtime instrumentation, immutable display capture, fixed tool schemas, all production component-function bindings, scope-aware controls, source refresh, persistence, pagination, and native Present identity are committed. Obsolete raw generative query tools are absent from the active model surface; `inspect_display`, artifact mutation, and Present remain strict and bounded. The orphaned production raw-search adapter and its obsolete test were deleted in `802cb6f`; classic `/api/search` and the classic UI remain intact.
- 2026-10-08: Commit `7f3af33` fixes real cursor continuation. Backend cursors exclude both `after` and response-correlation `projectionId`; the coordinator keeps one stable wire projection ID across page cursors. Backend, coordinator, and hook-level regressions prove that Page 2 is distinct, chronological, and accepted under a different response correlation ID.
- 2026-10-08: Commits `fb17273`, `a509d28`, and `0adff65` close cross-source restore. The backend hashes resource keys from semantic scope only; the bridge evicts source-bound pages and pins before publishing a new source generation; and the action router retains pre-eviction fare-to-leg identity so changed and downstream selections clear while proven upstream choices remain.
- 2026-10-08: Final automated validation passes from implementation HEAD `0adff65`: 327 Vitest tests pass with four opt-in skips, TypeScript passes, the production build passes, the 49-entry catalog check passes, 28 backend tests pass, four strict live-wire tests pass, and the real API verifier returns 68 London-to-Paris fares for 2026-10-08 through 2026-10-10 across all five projection kinds plus a source-bound pin.
- 2026-10-08: Final native acceptance passes on mobile and desktop. Chat `travel-5592f2a8-561b-4bcd-825e-41521cf4c17a` / artifact `artifact-11e3b762-e9e5-4bbf-8975-067813dac649` displayed a stacked 390 px tracker, real Page 2 ranks 9–16, immutable display capture `display-8`, and desktop reload restoration. Post-resource-key chat `travel-f8fd5677-34f9-45b6-a177-4c9354b0be74` / artifact `artifact-5c9077d2-f46c-4369-9846-7030a1b7f768` restored stable scope `scope-67a42174e3bf6ae2969e365019a303f8` on source v4.
- 2026-10-08: Trusted preview health is backend PID `3993` on 8003, agent PID `93255` on 8013, and Vite PID `83528` on 5175. Sandbox-local connection refusals were false negatives; native `lsof` and escalated curl are the authority. The backend reads the existing database, the frontend returns HTTP 200 at `/generative`, and the populated preview remains open for user testing.
- 2026-10-08: Code Review Graph refreshed to 2,124 nodes and 23,413 edges at `0adff65`. The final Graphify build reports 2,035 nodes, 4,760 edges, 20 hyperedges, and 161 communities with zero invalid endpoints, dangling edges, self-loops, or collapsed edges. No merge or push occurred.
- 2026-10-08: During the required documentation-aware graph refresh, `graphify . --update` selected Gemini because ambient key variables were present. It built one semantic request containing `README.md`, `backend/README.md`, this plan, `src/generative/catalog/generated/catalog.md`, and the three images under `verification/generative-ui/fare-selection-proof/`, then received HTTP 400 `Please pass a valid API key`. The command log cannot prove that the rejected request body was discarded, so the seven-file payload may have reached the provider. No external extraction result succeeded or entered the graph. A retry with both Gemini key variables unset stopped locally before extraction. The completed refresh used only local deterministic code extraction and inline Codex semantic extraction: all seven files were cached, contributing 46 semantic nodes, 47 edges, and three hyperedges.
- 2026-10-08: User-test follow-up commit `05e7f26` fixes the squeezed direct fixture without changing the production generative shell. Desktop workspaces without a session sidebar now use one main column before selection and main plus a 320 px tracker after selection. The existing sidebar layouts retain their expanded and collapsed tracks; mobile remains one column.
- 2026-10-08: User-test follow-up commit `9e1cd94` aligns the fixture's loaded scope windows with its displayed dates, so the server accepts its fixed projections. It also resets the fare-strip cursor when the exact normalized projection filters change. A focused regression proves Page 2 returns to Page 1 after a leg transport change.
- 2026-10-08: Native fixture acceptance passes at 1280 px and 390 px. The direct fixture renders 16 fare cards and seven calendar days with no alerts. Desktop selection creates a 916 px main track plus a 320 px right tracker; mobile stacks the 359 px tracker above the 359 px planner and keeps its fare strip horizontally scrollable without page overflow. The calendar switched to Tuesday 27 October and rendered eight active-day fares. The first leg reached Page 2, then clearing Train and Flight returned it to Page 1 with eight Bus fares.
- 2026-10-08: User-test follow-up commit `1f6249e` keeps a shifted fare scope valid when the requested display window starts after its loaded manifest threshold, and prevents a persisted calendar day from remaining active outside the new window. Focused context and composed calendar/strip regressions pass ten tests; typecheck passes. Native input acceptance changed the first Departure control from 26 to 27 October: every old-date row disappeared, eight 27 October rows loaded, the seven-day calendar moved to 27 October through 2 November, the three-night stay moved the second leg to 30 October, and the selected 27 October fare appeared in the right tracker with no alert.
- 2026-10-08: Durable local listeners are backend PID `21190` on 8003, agent PID `21192` on 8013, and Vite PID `21194` on 5175. Vite runs from the isolated worktree with explicit 8003 and 8013 proxies. The browser-facing health endpoints report the 50-million-row v4 source and `gpt-6.1-sol` at high reasoning.
- 2026-10-08: A new fixture follow-up replaces the per-leg fare strip's visible pagination with bounded vertical progressive scrolling. The implementation must preserve bounded server cursor queries, reset accumulated pages and scroll position on exact effective input changes, retain exact fare identity and immutable shown-fare provenance across appended pages, keep the selected-fare tracker responsive, and remove page controls only from `FareStrip`. Source, style, verification, graph, and Git ownership are assigned in the authoritative section above.
- 2026-10-08: Commit `3242409` completes the progressive fare-strip follow-up. A non-inspectable aggregate publisher records up to 100 globally ranked visible references and explicit omissions, while immutable leg-scoped page publishers retain each cursor result's own handle, result key, facts, and ranks. Scrolling continues beyond the context cap. Visible sentinels fill short viewports, failed appends preserve rows and expose an explicit retry, and stale results cannot enter a new effective requirement. The focused suite passes 10 tests, including 112 browsed rows, first-page and appended-page inspection, delayed stale-page rejection, retry, and a real composed Departure reset.
- 2026-10-08: Fresh-browser acceptance passes at 1200 px and 390 px. The first list progressed from 16 to 24 and then 32 rows on desktop and to 48 rows on mobile, with no fare-strip pager or horizontal document overflow. Changing Departure from 26 to 27 October replaced the list at scroll position zero with only 27 October rows and moved the second leg to 30 October. Removing Flight after another append reset the list to 16 Train and Bus rows at the top. Selecting an earlier row and successively appended rows produced the exact date, time, carrier, and price in the right-side or stacked tracker. The browser was restored to desktop with one selected fare visible in the tracker.
- 2026-10-08: The next user-test follow-up removes overlapping booking owners per logical leg. The current fixture exposes `MultiCityPlanGrid`, which owns every resolved leg, beside one `FareCalendar` branded “Flexible dates” for leg 0; the tree validator and streaming pruner currently accept this overlap, and the agent prompt currently recommends it. The corrected contract keeps the existing leg-bound calendar: a flexible multi-city interface uses one calendar for every ordered leg, while duplicate ownership, grid-plus-calendar overlap, and incomplete booking-leg coverage are invalid at both generated-tree boundaries. Supplementary `CheapestFastest` remains valid beside either interface, and non-booking overview or comparison scenes may omit booking owners entirely.
- 2026-10-08: Cross-message review found that the existing supersession helper scanned only the current message and treated every later valid Present for an artifact as a replacement. Commit `ca19e70` now scans all later conversation parts: overlapping booking claims replace earlier controls, while a supplementary comparison leaves the booking interface active. Restored invalid mixed scenes stay in saved history and render the sanitized invalid-view state. Catalog version remains `1.1.0` because the ownership metadata is additive, preserving existing saved threads.
- 2026-10-08: Headless Chrome DOM/CDP acceptance passes without native Accessibility or computer-control permission. The default fixture renders one MultiCity workflow, zero calendars, and two leg comparisons; its progressive first-leg list grows from 16 to 24. `?workflow=flexible` renders zero MultiCity workflows, exactly two calendars for London→Paris and Paris→Rome, and two leg comparisons. Leg 2 Add to trip produces the exact Paris→Rome tracker on 1200 px desktop and 390 px mobile; the tracker remains right-side or stacked, the document never overflows horizontally, and tracker-state fare cards remain contained in their leg panels.
- 2026-10-08: A genuine signed-in agent smoke on reserved agent PID `52172` used three successful HTTP steps for a flexible London→Paris→Barcelona→London request. Its one accepted Present scene contains `FareCalendar` legs 0, 1, and 2, `CheapestFastest` legs 0, 1, and 2, and no `MultiCityPlanGrid`. Three calendars render with no tool error. The Present receipt's next-turn artifact context retains all six booking and comparison bindings, proving the validated scene, supplementary views, and context survive the continuation boundary.
- 2026-10-08: The next authorized follow-up enriches the actual agent prompt and generated catalog with varied layout grammar examples that remain subordinate to binding and booking-ownership rules. It must demonstrate that the agent can choose a fitting hierarchy from the exposed containers, not merely copy one fixed template, and must correct the agent-visible `FadeFares` description to the implemented vertical progressive list. After focused automated checks and one genuine synthetic agent composition smoke, refresh both graphs locally, commit the scoped work, and push only `feature/server-driven-generative-ui-review`; never merge or change `dev`.
- 2026-10-08: Commit `a244608` completes the layout-guidance source follow-up. The prompt now offers six materially different registered-component patterns, labels the two complete booking workflows, keeps analysis layouts supplementary, preserves exact per-leg references and chronology, and distinguishes authored `StickySummary` from the fixed host `PlanningTracker`. The generated catalog, documentation, and toolkit share the corrected bounded vertical progressive `FadeFares` description. Focused prompt and ownership tests pass 16/16; typecheck, catalog consistency, production build, and whitespace checks pass.
- 2026-10-08: A fresh signed-in agent smoke on PID `67040` received a decision-shaped editable London→Paris→Barcelona→London request without a named layout. Its accepted artifact `artifact-b11f8378-6f8b-44e8-9570-a578591da988` independently chose `SplitPane`, `Stack`, `Section`, `ResponsiveGrid`, and `StickySummary`; retained one `MultiCityPlanGrid`, no `FareCalendar`, three leg-bound `CheapestFastest` views with distinct canonical datasets, `RouteMap`, `SelectedItinerary`, and `SyntheticTotal`; and carried the complete composition into next-turn component bindings across three successful HTTP steps. The smoke used headless Chrome/CDP only and requested no native computer-control permission.

Resume pointer:

> The implementation is complete in `/Users/ardaozdogru/.codex/worktrees/server-driven-generative-ui/omio-gen-ui-demo` on `feature/server-driven-generative-ui-review`, through layout-guidance commit `a244608` plus the final plan and graph commit. Root booking ownership is per logical leg: `MultiCityPlanGrid` owns all resolved legs, while each existing `FareCalendar` owns its bound leg. Distinct-leg calendars cover every trip leg exactly once; same-leg duplicates, two grids, grid-plus-calendar overlap, inconsistent binding, and incomplete coverage are rejected. `CheapestFastest` remains a supplementary comparison with Add to trip, and overview or comparison scenes may omit booking owners. The agent may vary registered recursive layouts to match the user's decision, but containers never relax booking coverage or leg bindings. Preserve immutable provenance, tracker state, server query bounds, and route/stay thresholds. Push scope is only `feature/server-driven-generative-ui-review`; do not merge or modify `dev`.

Decision record:

| Decision | Reason | Evidence | Status |
| --- | --- | --- | --- |
| Use a clean managed worktree at committed HEAD | The original checkout changed during inspection, so feature commits could not isolate ownership | branch and patch fingerprints above | decided |
| Keep the 49-component catalog and add component functions | The catalog already provides the desired visual grammar; data ownership is the failing boundary | `src/generative/catalog/descriptors.ts` | decided |
| Use a fixed projection union | It hides SQL and query-engine choices while bounding data and preserving semantic intent | contract sketch above | decided |
| Key groups by artifact, stable leg, and purpose | Dataset references are replaceable handles and should not reset logical view identity | current route replacement behavior in `leg-bindings.ts` | decided |
| Separate query intent from committed display | A pending refresh must not make the next turn claim unrendered data | display contract sketch above | decided |
| Keep old committed output during refresh | It matches what remains visible and permits safe cancel or retry | coordinator flow above | decided |
| Keep classic search on `/api/search` | The requested migration is for generative UI data flow | `src/api.js`, `backend/app.py` | decided |
| Keep 24 KB and 12 facts initially | Existing privacy and turn-budget limits are tested; changing them needs measured evidence | `contracts/index.ts`, `agent/turn-budget.ts` | decided |
| Use one commit steward in the shared managed worktree | Concurrent `git add` and `git commit` operations would race the shared index and `HEAD` | root orchestration decision and live shared checkout | decided |
| Keep group fingerprints independent of global UI revision | Only normalized query dependencies should invalidate a server result | accepted coordinator identity contract | decided |
| Reserve candidate preview ports 8003, 8013, and 5175 | The isolated render must not replace user-owned services | root orchestration decision | decided |
| Expose bounded ordered legs and derive directness | The verified v3 source contains connected routes, and claiming every fare was direct was false | v3 metadata, `routes.transfer_count`, and `route_legs` read-only inspection | decided |
| Represent unavailable requested dates in manifests | A bounded unavailable result prevents repeated coverage loading outside the source horizon | accepted query contract and backend coverage tests | decided |

## Source citations

- `backend/README.md`, database generation and API sections: 10 million deterministic fares, 2026-01-01 through 2027-12-31, exact-date search, and 100-row page cap.
- `backend/app.py`, `_search_leg`, `search`, and `dispatch`: current parameterized SQL, one-date request shape, summaries, pagination, and endpoint routing.
- `src/generative/data/resource-loader.ts`, `loadResource`: current browser route-date-page loop and row accumulation.
- `src/generative/data/fare-data-bridge.ts`, `createFareDataBridge`: current browser resource registration, lookup, and local query ownership.
- `backend/query_groups.py`: current fixed projection execution, stable logical scope identity, source-bound cursors, manifests, and lookup.
- `src/generative/data/server-query-client.ts` and `projection-coordinator.ts`: strict wire validation, batching, source refresh, and immutable committed result identity.
- `src/generative/contracts/display-context.ts` and `src/generative/state/display-context.ts`: display ledger, frozen visible facts, completeness, and immutable inspection handles.
- `src/generative/query/query-engine.ts`, `executeQuery`: current local QueryIR execution, grouping, ordering, and transfer budgets.
- `src/generative/catalog/context.tsx`, `useTravelQuery` and fare hooks: current per-view query construction and stale-result guards.
- `src/generative/catalog/descriptors.ts`: 49 component definitions and the 11 child-accepting containers.
- `src/generative/contracts/index.ts`: current dataset, query, artifact, snapshot, limit, and bridge contracts.
- `src/generative/state/snapshot-exporter.ts`: current artifact ordering, selected-fact priority, leg thresholds, and 24 KB degradation loop.
- `src/generative/tools/browser-tools.ts`: current bounded model tools, coverage loading, summarization, selected facts, and privacy boundary.
- `src/generative/contracts/privacy.ts`: current copied-row rejection.
- `src/generative/presentation/prompt.ts`: current composition rules, synthetic-data language, selected-trip authority, and next-turn guidance.
- `agent/request-schema.ts`: current strict tool and history parsing.
- `agent/chat-route.ts`: current prompt assembly, model tool validation, and response streaming.

## Handback format

At the first-render handoff, report:

- branch and exact HEAD;
- commits in order and the milestone each closes;
- tests and browser runs with exact pass counts;
- backend request evidence, next-turn snapshot evidence, and screenshot paths;
- the local preview address and whether it is still running;
- any accepted limits or unresolved risks;
- confirmation that the branch was not merged or pushed.
