# Graph Report - omio-gen-ui-demo  (2026-10-05)

## Corpus Check
- 173 files · ~190,760 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1151 nodes · 2451 edges · 88 communities (70 shown, 18 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 76 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `64237aa6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- app.py
- App.jsx
- createFareDataBridge
- context.tsx
- scripts
- browser.ts
- Shared scalar catalog contract
- ui-state-store.ts
- worker-client.ts
- live/README.md
- index.ts
- ArtifactErrorBoundary
- codex-provider.md
- fare-data-bridge.ts
- SearchForm.jsx
- compilerOptions
- snapshot-exporter.ts
- tree.ts
- chat-route.ts
- codex-provider.ts
- repair.ts
- package.json
- Source document
- devDependencies
- dependencies
- @testing-library/dom
- @types/react
- @types/react-dom
- a/toolkit.tsx
- Acceptance Evidence
- @vitejs/plugin-react
- Native A compatibility evidence
- routes.tsx
- query-engine.ts
- ResultsPage.jsx
- selected-fare-count.test.tsx
- abortError
- smart-planner-handoff.ts
- request-schema.ts
- LandingPage.jsx
- planning-tracker.test.tsx
- classic-search.test.tsx
- runtime-provider.tsx
- registration-lifecycle.test.ts
- Source document
- location-catalog.ts
- run-state-proof.mjs
- verify_pasted_coverage.py
- Contributing Guide
- run.mjs
- query-engine/package.json
- run-completion.mjs
- Repository Workflow
- run.ts
- Urban Travel Scene
- Transportation Landscape Hero
- catalog.ts
- Selected fare count catalog extension
- Download on the Apple App Store Badge
- run-query-benchmark.mjs
- spike/toolkit.tsx
- Browser query engine decision
- install-graphify-hooks.sh
- test-graphify-hooks.sh
- Huawei AppGallery Download Badge
- Machine-Readable Link
- Compass Icon
- run-live.mjs
- Local query engine benchmark report
- Distinct travel catalog primitives
- Google Play
- Mobile Ticketing
- Visual Scan Target
- Update and Refresh
- backend/__init__.py
- query-null-semantics.md
- playwright.config.ts
- catalog.md
- run-browser-proof.mjs
- vite.config.js

## God Nodes (most connected - your core abstractions)
1. `createFareDataBridge()` - 46 edges
2. `Shared scalar catalog contract` - 42 edges
3. `createUIStateStore()` - 39 edges
4. `ArtifactIdSchema` - 34 edges
5. `assertNoBulkData()` - 23 edges
6. `cityLabel()` - 18 edges
7. `createActionRouter()` - 18 edges
8. `useTravelQuery()` - 17 edges
9. `FareRowSchema` - 17 edges
10. `FareDataBridge` - 17 edges

## Surprising Connections (you probably didn't know these)
- `Pull Request Template` --semantically_similar_to--> `Contributing Guide`  [INFERRED] [semantically similar]
  .github/pull_request_template.md → CONTRIBUTING.md
- `request()` --calls--> `exportAgentContext()`  [EXTRACTED]
  agent/scene-completion.test.ts → src/generative/state/snapshot-exporter.ts
- `capture()` --calls--> `exportAgentContext()`  [EXTRACTED]
  verification/generative-ui/a/spike/main.tsx → src/generative/state/snapshot-exporter.ts
- `handleChat()` --calls--> `assertNoBulkData()`  [EXTRACTED]
  agent/chat-route.ts → src/generative/contracts/privacy.ts
- `handleChat()` --calls--> `validatePresentTree()`  [EXTRACTED]
  agent/chat-route.ts → src/generative/variants/a/tree.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Dual-Graph Repository Analysis** — agents_repository_workflow, agents_code_review_graph, agents_graphify_knowledge_graph, agents_graph_guided_source_verification [EXTRACTED 1.00]
- **Acceptance Verification Layers** — verification_acceptance_database_source_coverage, verification_acceptance_http_api_acceptance, verification_acceptance_browser_flow_acceptance [EXTRACTED 1.00]
- **Source Coverage Contract Verification** — verification_acceptance_generated_sqlite_database, verification_acceptance_coverage_parser, verification_acceptance_backend_test_suite, verification_acceptance_source_contract [EXTRACTED 1.00]
- **App Call-to-Action Intermodal Scene** — public_assets_omio_app_background_app_cta_background, public_assets_omio_app_background_urban_travel_scene, public_assets_omio_app_background_bus, public_assets_omio_app_background_train, public_assets_omio_app_background_cityscape [INFERRED 0.75]
- **Multimodal Passenger Transport** — public_assets_omio_hero_air_travel, public_assets_omio_hero_rail_travel, public_assets_omio_hero_bus_travel, public_assets_omio_hero_ferry_travel [INFERRED 0.85]
- **Synthetic Multimodal Search Demo** — backend_readme_synthetic_timetable_backend, backend_readme_deterministic_synthetic_timetable, backend_readme_timetable_search_api, index_omio_travel_search_demo, index_multimodal_travel_search [INFERRED 0.95]

## Communities (88 total, 18 thin omitted)

### Community 0 - "app.py"
Cohesion: 0.06
Nodes (59): ApiError, _connect(), _date_value(), dispatch(), _fail(), get_locations(), get_metadata(), _integer() (+51 more)

### Community 1 - "App.jsx"
Cohesion: 0.19
Nodes (14): buildSearchUrl(), getJson(), minutesFromDuration(), MODE_ORDER, modes, normalizeLocations(), normalizeSearch(), normalizeTrip() (+6 more)

### Community 2 - "createFareDataBridge"
Cohesion: 0.09
Nodes (31): request(), artifactId, fare(), PendingQueryProbe(), setup(), CatalogNode(), TravelProvider(), id (+23 more)

### Community 3 - "context.tsx"
Cohesion: 0.07
Nodes (76): controls, layouts, statuses, carrierLabel(), cityLabel(), departure(), duration(), money() (+68 more)

### Community 4 - "scripts"
Cohesion: 0.12
Nodes (16): scripts, agent:dev, benchmark:query, build, check:catalog, dev, frontend:dev, frontend:preview (+8 more)

### Community 5 - "browser.ts"
Cohesion: 0.15
Nodes (20): base, benchmarkRows(), csvRows(), expected(), id, longTasks, Metric, percentile() (+12 more)

### Community 6 - "Shared scalar catalog contract"
Cohesion: 0.04
Nodes (45): Append-only B positional schema, ArtifactSkeleton, Callout, Canonical catalog identity, Carousel, CarrierFilter, CheapestFastest, CitySequence (+37 more)

### Community 7 - "ui-state-store.ts"
Cohesion: 0.18
Nodes (9): {decision}, servers, ArtifactId, ArtifactUIStateSchema, CompactArtifactSnapshotSchema, UIStateRevisionSchema, artifactId, coverage (+1 more)

### Community 8 - "worker-client.ts"
Cohesion: 0.14
Nodes (15): index, BoundedQueryResult, DatasetId, QueryIR, scalar, WorkerRequest, WorkerResponse, WorkerResponseSchema (+7 more)

### Community 10 - "index.ts"
Cohesion: 0.06
Nodes (32): descriptors, refs, hash, CompactSummarySchema, ComponentDescriptor, Coverage, DatasetFieldManifest, DatasetFieldManifestSchema (+24 more)

### Community 13 - "fare-data-bridge.ts"
Cohesion: 0.10
Nodes (24): BoundedFareFactSchema, FareRow, apiRow, pageSource, request, coverageKey(), FarePage, LoadedResource (+16 more)

### Community 14 - "SearchForm.jsx"
Cohesion: 0.18
Nodes (12): displayLocation(), locationValue(), RouteMap(), editDistance(), isSubsequence(), LocationField(), handleKeyDown(), selectLocation() (+4 more)

### Community 15 - "compilerOptions"
Cohesion: 0.07
Nodes (28): agent, benchmarks/query-engine, *.config.ts, DOM, DOM.Iterable, ES2022, node, src (+20 more)

### Community 16 - "snapshot-exporter.ts"
Cohesion: 0.06
Nodes (47): currentMessage(), fits(), olderMessage(), projectNetworkHistory(), splitText(), context(), prepared(), createSnapshotTransport() (+39 more)

### Community 17 - "tree.ts"
Cohesion: 0.12
Nodes (20): keys, names, scalarLimit(), scalars, scope, validatePresentPrefix(), hasLaterAcceptedScene(), ScenePart (+12 more)

### Community 18 - "chat-route.ts"
Cohesion: 0.30
Nodes (12): handleChat(), ChatRequest, ack(), artifact, other, acceptTurn(), getAcceptedScenes(), ledger (+4 more)

### Community 19 - "codex-provider.ts"
Cohesion: 0.19
Nodes (11): CODEX_DEVELOPER_INSTRUCTIONS, CODEX_MODEL, CODEX_REASONING_EFFORT, codexDecision(), Decision, DecisionDelta, DecisionSchema, readString() (+3 more)

### Community 20 - "repair.ts"
Cohesion: 0.20
Nodes (8): mocks, ModelProcess, valid, InvalidModelOutputError, ModelAttemptObservation, withOneRepair(), knownMessages, validationReason()

### Community 21 - "package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 22 - "Source document"
Cohesion: 0.13
Nodes (15): Current query selection capability, Granular independently arranged primitives, Inclusive date window and real retry, Keyboard tab semantics, Later-date selection intent, Ranked and authored grouped comparisons, Selected itinerary facts and separate total, Source document (+7 more)

### Community 23 - "devDependencies"
Cohesion: 0.09
Nodes (23): @assistant-ui/vite, jsdom, devDependencies, @assistant-ui/vite, jsdom, @playwright/test, @testing-library/jest-dom, @testing-library/react (+15 more)

### Community 24 - "dependencies"
Cohesion: 0.11
Nodes (19): ai, @ai-sdk/react, assistant-stream, @assistant-ui/ai-sdk, @assistant-ui/react, @assistant-ui/react-generative-ui, dependencies, ai (+11 more)

### Community 28 - "a/toolkit.tsx"
Cohesion: 0.09
Nodes (21): generative, library, Travel UI evidence capture: 0-1280-blue-partial, Travel UI evidence capture: 0-1280-blue, Travel UI evidence capture: 0-360-blue-partial, Travel UI evidence capture: 0-360-blue, Travel UI evidence capture: 0-360-sand-partial, Travel UI evidence capture: 0-360-sand (+13 more)

### Community 29 - "Acceptance Evidence"
Cohesion: 0.11
Nodes (20): Acceptance Evidence, API Pagination, Backend Commit b1c8912, Backend Test Suite, Browser Captures, Browser flow, Browser Flow Acceptance, Coverage Parser (+12 more)

### Community 31 - "Native A compatibility evidence"
Cohesion: 0.33
Nodes (5): Commands, Native A compatibility evidence, Observed API boundaries, Provider probe, Shared catalog and paused-stream proof

### Community 32 - "routes.tsx"
Cohesion: 0.10
Nodes (24): Forty shared granular travel descriptors, ArtifactIdSchema, CATALOG_VERSION, CONTRACT_VERSION, createServices(), GenerativeRoute(), io, createArtifactStore() (+16 more)

### Community 33 - "query-engine.ts"
Cohesion: 0.16
Nodes (14): AllowedFareField, DatasetRevision, DatasetRevisionSchema, PredicateTree, compare(), defaults, executeQuery(), matches() (+6 more)

### Community 34 - "ResultsPage.jsx"
Cohesion: 0.22
Nodes (10): sortTrips(), companyColors, dateSequence(), formatDate(), formatDuration(), formatPrice(), formatTime(), modeLabels (+2 more)

### Community 35 - "selected-fare-count.test.tsx"
Cohesion: 0.17
Nodes (9): artifactId, otherId, CoverageRequest, FareIdSchema, first, request, second, request (+1 more)

### Community 36 - "abortError"
Cohesion: 0.30
Nodes (8): load(), cancel(), finish(), abortError(), loadResource(), request(), cancel(), QueryWorker

### Community 37 - "smart-planner-handoff.ts"
Cohesion: 0.29
Nodes (7): openSmartPlanner(), HISTORY_LIMITS, completeSmartPlannerHandoff(), readSmartPlannerHandoff(), SmartPlannerHandoff, storeSmartPlannerHandoff(), search

### Community 38 - "request-schema.ts"
Cohesion: 0.15
Nodes (15): ErrorOutput, id, MessageSchema, parseChatRequest(), parseToolInput(), parseToolOutput(), PartSchema, RequestSchema (+7 more)

### Community 39 - "LandingPage.jsx"
Cohesion: 0.24
Nodes (6): Icon(), paths, LandingPage(), offers, transportModes, Logo()

### Community 40 - "planning-tracker.test.tsx"
Cohesion: 0.25
Nodes (8): DatasetManifestSchema, booleanFields, datasetId, fact(), fixture(), manifest, numericFields, rows

### Community 41 - "classic-search.test.tsx"
Cohesion: 0.40
Nodes (3): response(), summaries, trip()

### Community 42 - "runtime-provider.tsx"
Cohesion: 0.09
Nodes (15): normalizeToolContinuations(), CanonicalMessagesContext, completedLocalToolIndices(), completedNarrativeIndices(), localToolNames, GenerativeChat(), GenerativeChatProps, AssistantNarrative() (+7 more)

### Community 43 - "registration-lifecycle.test.ts"
Cohesion: 0.16
Nodes (4): deferred(), request, scenario(), createLocalQueryEngine()

### Community 44 - "Source document"
Cohesion: 0.15
Nodes (13): Atomic verified database generation, Bounded fare search API, Global calendar versus cache coverage, Preserved v2 read-only profile, Source document, Strict current source verification, Synthetic timetable, Explicit null sort ordering (+5 more)

### Community 45 - "location-catalog.ts"
Cohesion: 0.60
Nodes (3): loadLocationCatalog(), locationsSchema, selectLocations()

### Community 47 - "run-state-proof.mjs"
Cohesion: 0.17
Nodes (9): case0, errors, last, parts, requests, result, secondView, streams (+1 more)

### Community 52 - "verify_pasted_coverage.py"
Cohesion: 0.44
Nodes (11): check_database(), main(), normalized(), pair(), parse_dash_line(), parse_manifest(), parse_to_line(), Path (+3 more)

### Community 53 - "Contributing Guide"
Cohesion: 0.08
Nodes (30): Pull Request Template, Pull Request Branch Target, Pull Request Verification, Atomic Database Generation, Deterministic Synthetic Timetable, Generate the database, Location, Metadata, and Search Endpoints, Run the API (+22 more)

### Community 57 - "run.mjs"
Cohesion: 0.22
Nodes (7): agentPort, apiPort, children, env, start(), stop(), webPort

### Community 75 - "query-engine/package.json"
Cohesion: 0.29
Nodes (6): dependencies, @duckdb/duckdb-wasm, name, private, type, @duckdb/duckdb-wasm

### Community 84 - "run-completion.mjs"
Cohesion: 0.29
Nodes (6): errors, last, requests, responses, started, timers

### Community 86 - "Repository Workflow"
Cohesion: 0.40
Nodes (5): Code Review Graph, Graph-Guided Source Verification, Graphify Knowledge Graph, Knowledge graphs, Repository Workflow

### Community 87 - "run.ts"
Cohesion: 0.33
Nodes (4): awaiting, completion, errors, measurements

### Community 91 - "Urban Travel Scene"
Cohesion: 0.40
Nodes (6): App Call-to-Action Background Illustration, Bus, Cityscape, Intermodal Mobility, Train, Urban Travel Scene

### Community 92 - "Transportation Landscape Hero"
Cohesion: 0.33
Nodes (6): Air Travel, Bus Travel, Ferry Travel, Multimodal Travel, Rail Travel, Transportation Landscape Hero

### Community 96 - "catalog.ts"
Cohesion: 0.29
Nodes (6): catalogDescriptors, catalogHash, catalogVersion, componentNames, sharedPropsSchema, aPrompt

### Community 97 - "Selected fare count catalog extension"
Cohesion: 0.40
Nodes (4): Contract and ownership, Cost and boundary proof, Generator and compatibility, Selected fare count catalog extension

### Community 105 - "Download on the Apple App Store Badge"
Cohesion: 0.40
Nodes (5): Apple App Store, Download on the Apple App Store Badge, Apple Logo, iOS App Download, Trusted Platform Acquisition

### Community 108 - "spike/toolkit.tsx"
Cohesion: 0.60
Nodes (3): SpikeCard(), SpikeSurface(), generative

### Community 112 - "Browser query engine decision"
Cohesion: 0.40
Nodes (4): Browser query engine decision, Domain verification, Measurement, Reproduce

### Community 143 - "Huawei AppGallery Download Badge"
Cohesion: 0.50
Nodes (4): Huawei AppGallery Download Badge, Huawei AppGallery, Mobile App Download, Platform Distribution Call to Action

### Community 144 - "Machine-Readable Link"
Cohesion: 0.50
Nodes (4): Cross-Device Handoff, Machine-Readable Link, Mobile App Acquisition, Mobile App QR Code

### Community 145 - "Compass Icon"
Cohesion: 0.50
Nodes (4): Compass Icon, Directional Navigation, Explore Destinations, Travel Discovery

### Community 147 - "Local query engine benchmark report"
Cohesion: 0.50
Nodes (4): Local query engine benchmark report, The report includes thresholds, cancellation timings, main-thread long-task fields and correctness booleans; this is visible report text rather than independent proof., A printed report names typescript-worker and duckdb-wasm at 50000 and 200000 rows., Workloads named topK, filter, group and join contain p50Ms/p95Ms metrics.

### Community 150 - "Google Play"
Cohesion: 0.67
Nodes (3): Android App Distribution, Google Play Download Badge, Google Play

### Community 151 - "Mobile Ticketing"
Cohesion: 1.00
Nodes (3): Mobile Ticketing, QR Code, Mobile Ticket QR Code Icon

### Community 152 - "Visual Scan Target"
Cohesion: 0.67
Nodes (3): QR Code Scanning, Scanner Frame, Visual Scan Target

### Community 153 - "Update and Refresh"
Cohesion: 0.67
Nodes (3): Synchronization, Update and Refresh, Updates Icon

## Knowledge Gaps
- **394 isolated node(s):** `TravelContext`, `GenerativeChatProps`, `messages`, `ref`, `revision` (+389 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createFareDataBridge()` connect `createFareDataBridge` to `registration-lifecycle.test.ts`, `abortError`?**
  _High betweenness centrality (0.001) - this node is a cross-community bridge._
- **Why does `createWorkerQueryEngine()` connect `browser.ts` to `abortError`?**
  _High betweenness centrality (0.000) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `createUIStateStore()` (e.g. with `dispatch()` and `get()`) actually correct?**
  _`createUIStateStore()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `TravelContext`, `GenerativeChatProps`, `messages` to the rest of the system?**
  _394 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `app.py` be split into smaller, more focused modules?**
  _Cohesion score 0.06233062330623306 - nodes in this community are weakly interconnected._
- **Should `createFareDataBridge` be split into smaller, more focused modules?**
  _Cohesion score 0.08773784355179703 - nodes in this community are weakly interconnected._
- **Should `context.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06523005241700641 - nodes in this community are weakly interconnected._