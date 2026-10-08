# Server-driven generative UI implementation plan

Status: ready for implementation from a clean isolated worktree

Target branch: `feature/server-driven-generative-ui-review`

Target base: `7c60602ebbd1dedebf3ea22c8f56ae98077a1da3`

Working directory: `/Users/ardaozdogru/.codex/worktrees/server-driven-generative-ui/omio-gen-ui-demo`

Delivery boundary: produce the first complete browser render for user testing. Keep the branch local, unmerged, and unpushed.

## Objective

Move the generative travel UI from browser-loaded fare datasets to server-executed, fixed query functions. The model still composes the existing registered UI components. Components ask for semantic query groups, the server runs parameterized SQL against the 10 million row synthetic timetable, and the browser receives only the bounded rows or aggregates required for the active display.

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

## Repository and dirty-baseline record

The original checkout was on `dev` at `7c60602` with active concurrent changes. Creating `feature/server-driven-generative-ui` in that checkout preserved those changes, but the worktree continued to change while it was being inspected. That checkout is therefore evidence only and is not an implementation workspace.

At the first full status capture, the original checkout had 35 modified tracked files, 12 untracked files, and no staged files. The initial unstaged patch fingerprint was `0927a4de14fef2a0ddf0601bb7081568568bfb38a44ae7493af3bf2d208ea784`. A later diagnostic archive captured a moving snapshot at `/tmp/server-driven-generative-ui-baseline.FcThYk`:

- `tracked.patch`: `eff141bec32a79abca8f0c953dd44ca33eb4af4a2d10912f932269fb49eb42c7`
- `staged.patch`: `e3b0c44298fc1c149afbf4a8996fb92427ae41e4649b934ca495991b7852b855`, the SHA-256 of an empty file
- `untracked-manifest.txt`: `2a577ee444eabf7835a8741e3db7b9eb47997fece51c5fa39d43bb1783f17e8d`

The live patch changed again immediately after that archive. Do not use the archive as a source patch or copy its files into this worktree. It only proves why implementation must stay isolated.

The managed worktree was created directly from committed HEAD `7c60602ebbd1dedebf3ea22c8f56ae98077a1da3`. It started detached, then attached to the clean branch `feature/server-driven-generative-ui-review`. All implementation, testing, screenshots, and commits belong there.

This worktree does not contain `node_modules` or the ignored database. The original checkout has the matching installed dependency tree at `/Users/ardaozdogru/projects/omio-gen-ui-demo/node_modules`; create a worktree-local symlink only after confirming the lockfile is unchanged. The available database is `/Users/ardaozdogru/projects/omio-gen-ui-demo/data/omio.sqlite3`. A read-only metadata query found schema version 3, generator version 3, `all_ordered_pairs_daily`, exactly 10,000,000 rows, and coverage from 2026-10-08 through 2027-12-31. The clean base documentation describes the older version 2 date range. Use the available file read-only through `--database` after a schema smoke test. Do not regenerate 10 million rows for this feature. Unit tests use small temporary fixtures. If the version 3 schema is incompatible, stop the live proof with a precise compatibility finding instead of replacing the user's database.

If work must later touch a file that is also dirty in the original checkout, compare the clean-branch diff to the original baseline by hunk. Never use `git add -A`, stash the original checkout, reset it, or copy a whole mixed file over it. Integration into the original checkout is outside this task.

## Current system at the committed base

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

The fare scalar matches the clean-base committed `FareRow` fields. It has no transfer, route-leg, arrival, timestamp, or time-zone fields:

```ts
type FareItem = {
  id: FareId;
  originId: string;
  destinationId: string;
  serviceDate: Date;
  mode: "train" | "bus" | "flight" | "ferry";
  carrierId: string;
  carrierName: string | null;
  priceCents: number;
  durationMinutes: number;
  departureMinutes: number;
  availableSeats: number;
  currency: "EUR";
  synthetic: true;
  priceBasis: "per-passenger-including-demo-fees";
  direct: boolean;
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
  totalAvailable: number;
  availableModes: TransportMode[];
  complete: true;
};
```

`passengers` is 1 through 8. `earliestDeparture.minutes` is 0 through 1439. `complete` means the server source covers the logical scope. It never claims the browser materialized every row. The backend emits `carrierId` as `carrier-${stableRef(companyName)}` using the same unsigned 32-bit FNV-1a algorithm as `resource-loader.ts`.

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
        "direct": true
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
    "direct": true
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
| 0. Clean base and plan |  |  |
| 1. Fixed SQL projections |  |  |
| 2. Query contracts and coordinator |  |  |
| 3. Catalog function bindings |  |  |
| 4. Display ledger and inspection capture |  |  |
| 5. Runtime migration and preload deletion |  |  |
| 6. First user-test render |  |  |
| 7. Graph refresh and handoff |  |  |

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

The root integrator becomes the sole editor of this section after the plan commit. Append entries. Do not rewrite earlier decisions after implementation starts.

Current checklist:

- [x] Inspect code-review graph and Graphify graph at committed HEAD.
- [x] Record original dirty checkout and moving patch fingerprints.
- [x] Create the original in-place topic branch without disturbing dirty files.
- [x] Create a clean managed worktree at `7c60602`.
- [x] Create `feature/server-driven-generative-ui-review` in the managed worktree.
- [x] Write and verify this implementation plan.
- [ ] Commit this plan alone.
- [ ] Implement and commit fixed backend projections.
- [ ] Implement and commit query contracts and coordinator.
- [ ] Implement and commit component function bindings.
- [ ] Implement and commit display ledger and inspection capture.
- [ ] Migrate runtime and delete obsolete generative preload paths.
- [ ] Run focused, full, privacy, and browser validation.
- [ ] Refresh both graphs.
- [ ] Open the populated local preview for user testing.
- [ ] Report local commits and confirm no merge or push.

Resume pointer:

> Work only in `/Users/ardaozdogru/.codex/worktrees/server-driven-generative-ui/omio-gen-ui-demo` on `feature/server-driven-generative-ui-review`. Start from milestone 1 after confirming the plan commit and a clean status. Treat the original checkout and `/tmp/server-driven-generative-ui-baseline.FcThYk` as read-only evidence. The next unresolved design task is to finalize exact request and response schemas for each fixed projection before writing the backend endpoint.

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

## Source citations

- `backend/README.md`, database generation and API sections: 10 million deterministic fares, 2026-01-01 through 2027-12-31, exact-date search, and 100-row page cap.
- `backend/app.py`, `_search_leg`, `search`, and `dispatch`: current parameterized SQL, one-date request shape, summaries, pagination, and endpoint routing.
- `src/generative/data/resource-loader.ts`, `loadResource`: current browser route-date-page loop and row accumulation.
- `src/generative/data/search-client.ts`, `createSearchPageSource`: current `/api/search` adapter and fare normalization.
- `src/generative/data/fare-data-bridge.ts`, `createFareDataBridge`: current browser resource registration, lookup, and local query ownership.
- `src/generative/query/query-engine.ts`, `executeQuery`: current local QueryIR execution, grouping, ordering, and transfer budgets.
- `src/generative/catalog/context.tsx`, `useTravelQuery` and fare hooks: current per-view query construction and stale-result guards.
- `src/generative/catalog/descriptors.ts`: 49 component definitions and the 11 child-accepting containers.
- `src/generative/contracts/index.ts`: current dataset, query, artifact, snapshot, limit, and bridge contracts.
- `src/generative/state/snapshot-exporter.ts`: current artifact ordering, selected-fact priority, leg thresholds, and 24 KB degradation loop.
- `src/generative/tools/browser-tools.ts`: current bounded model tools, coverage loading, summarization, selected facts, and privacy boundary.
- `src/generative/contracts/privacy.ts`: current copied-row rejection.
- `src/generative/variants/a/prompt.ts`: current composition rules, synthetic-data language, selected-trip authority, and next-turn guidance.
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
