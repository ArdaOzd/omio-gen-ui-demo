# Graph Report - omio-gen-ui-demo  (2026-10-05)

## Corpus Check
- 203 files · ~192,260 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1182 nodes · 2506 edges · 95 communities (77 shown, 18 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 76 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- app.py
- ResultsPage.jsx
- component.tsx
- snapshot-exporter.ts
- createFareDataBridge
- routes.tsx
- fare-data-bridge.ts
- context.tsx
- index.ts
- tree.ts
- Shared scalar catalog contract
- runtime-provider.tsx
- compilerOptions
- browser.ts
- worker-client.ts
- devDependencies
- a/toolkit.tsx
- Acceptance Evidence
- dependencies
- scene-completion.test.ts
- scripts
- browser-tools.ts
- run-state-proof.mjs
- chat-route.ts
- registration-lifecycle.test.ts
- codex-provider.ts
- repair.ts
- request-schema.ts
- selected-fare-count.test.tsx
- summarize-fares.test.ts
- abortError
- verify_pasted_coverage.py
- Contributing Guide
- query-engine.ts
- Deterministic Database Generator
- run.mjs
- Omio Generative UI Demo
- Current Pasted Source Catalog
- SelectedFareCount
- Canonical Catalog Descriptor
- Omio Reference Assets
- descriptors.ts
- Synthetic Timetable Backend
- query-engine/package.json
- Granular Component Semantics
- run-completion.mjs
- Repository Workflow
- run.ts
- Source document
- Urban Travel Scene
- Transportation Landscape Hero
- Native A compatibility evidence
- Selected Fare Count Catalog Extension
- package.json
- Download on the Apple App Store Badge
- Three-process Development Launcher
- run-query-benchmark.mjs
- spike/toolkit.tsx
- Browser query engine decision
- ModelProcess
- DateWindow
- Huawei AppGallery Download Badge
- Machine-Readable Link
- Compass Icon
- run-live.mjs
- Local query engine benchmark report
- Google Play
- Mobile Ticketing
- Visual Scan Target
- Update and Refresh
- Source document
- backend/__init__.py
- query-null-semantics.md
- No Saved State Migration or Reset
- jsdom
- @types/node
- typescript
- vitest
- playwright.config.ts
- install-graphify-hooks.sh
- test-graphify-hooks.sh
- catalog.md
- live/README.md
- run-browser-proof.mjs
- codex-provider.md
- vite.config.js

## God Nodes (most connected - your core abstractions)
1. `createFareDataBridge()` - 46 edges
2. `Shared scalar catalog contract` - 42 edges
3. `createUIStateStore()` - 39 edges
4. `ArtifactIdSchema` - 34 edges
5. `assertNoBulkData()` - 23 edges
6. `cityLabel()` - 18 edges
7. `createActionRouter()` - 18 edges
8. `FareDataBridge` - 17 edges
9. `useTravelQuery()` - 17 edges
10. `FareRowSchema` - 17 edges

## Surprising Connections (you probably didn't know these)
- `Pull Request Template` --semantically_similar_to--> `Contributing Guide`  [INFERRED] [semantically similar]
  .github/pull_request_template.md → CONTRIBUTING.md
- `10,000,000 Synthetic Fares` --semantically_similar_to--> `10,000,000-row Default`  [INFERRED] [semantically similar]
  README.md → backend/README.md
- `runNullableOracle()` --calls--> `parseQuery()`  [EXTRACTED]
  benchmarks/query-engine/browser.ts → src/generative/contracts/index.ts
- `runNullableOracle()` --calls--> `createFareDataBridge()`  [EXTRACTED]
  benchmarks/query-engine/browser.ts → src/generative/data/fare-data-bridge.ts
- `handleChat()` --calls--> `assertNoBulkData()`  [EXTRACTED]
  agent/chat-route.ts → src/generative/contracts/privacy.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Deterministic Fixture Invariants** — backend_readme_ten_million_row_default, backend_readme_two_year_calendar, backend_readme_daily_route_coverage, backend_readme_seeded_reproducible_allocation [EXTRACTED 1.00]
- **Granular Travel Catalog Primitives** — src_generative_catalog_generated_catalog_selecteditinerary, src_generative_catalog_generated_catalog_synthetictotal, src_generative_catalog_generated_catalog_selectedfarecount, src_generative_catalog_generated_catalog_comparisontable, src_generative_catalog_generated_catalog_comparisonmatrix, src_generative_catalog_generated_catalog_modebreakdown [EXTRACTED 1.00]
- **Dual-Graph Repository Analysis** — agents_repository_workflow, agents_code_review_graph, agents_graphify_knowledge_graph, agents_graph_guided_source_verification [EXTRACTED 1.00]
- **Local Three-process Development Stack** — readme_three_process_development_launcher, readme_python_fare_api, readme_model_agent_service, readme_vite_development_server [EXTRACTED 1.00]
- **Acceptance Verification Layers** — verification_acceptance_database_source_coverage, verification_acceptance_http_api_acceptance, verification_acceptance_browser_flow_acceptance [EXTRACTED 1.00]
- **Source Coverage Contract Verification** — verification_acceptance_generated_sqlite_database, verification_acceptance_coverage_parser, verification_acceptance_backend_test_suite, verification_acceptance_source_contract [EXTRACTED 1.00]
- **App Call-to-Action Intermodal Scene** — public_assets_omio_app_background_app_cta_background, public_assets_omio_app_background_urban_travel_scene, public_assets_omio_app_background_bus, public_assets_omio_app_background_train, public_assets_omio_app_background_cityscape [INFERRED 0.75]
- **Multimodal Passenger Transport** — public_assets_omio_hero_air_travel, public_assets_omio_hero_rail_travel, public_assets_omio_hero_bus_travel, public_assets_omio_hero_ferry_travel [INFERRED 0.85]

## Communities (95 total, 18 thin omitted)

### Community 0 - "app.py"
Cohesion: 0.06
Nodes (62): ApiError, _connect(), _date_value(), dispatch(), _fail(), get_locations(), get_metadata(), _integer() (+54 more)

### Community 1 - "ResultsPage.jsx"
Cohesion: 0.05
Nodes (51): buildSearchUrl(), displayLocation(), getJson(), locationValue(), minutesFromDuration(), MODE_ORDER, modes, normalizeLocations() (+43 more)

### Community 2 - "component.tsx"
Cohesion: 0.11
Nodes (50): PendingQueryProbe(), ArtifactErrorBoundary, controls, layouts, statuses, carrierLabel(), cityLabel(), departure() (+42 more)

### Community 3 - "snapshot-exporter.ts"
Cohesion: 0.07
Nodes (42): currentMessage(), fits(), olderMessage(), projectNetworkHistory(), splitText(), context(), prepared(), createSnapshotTransport() (+34 more)

### Community 4 - "createFareDataBridge"
Cohesion: 0.10
Nodes (31): {decision}, servers, request(), artifactId, fare(), setup(), CatalogNode(), id (+23 more)

### Community 5 - "routes.tsx"
Cohesion: 0.09
Nodes (27): Forty shared granular travel descriptors, ArtifactId, ArtifactIdSchema, ArtifactUIStateSchema, CONTRACT_VERSION, CoverageRequestSchema, createServices(), GenerativeRoute() (+19 more)

### Community 6 - "fare-data-bridge.ts"
Cohesion: 0.09
Nodes (27): BoundedFareFactSchema, CoverageRequest, DatasetFieldManifest, DatasetManifest, apiRow, pageSource, request, coverageKey() (+19 more)

### Community 7 - "context.tsx"
Cohesion: 0.13
Nodes (21): TravelContext, TravelProvider(), id, request, id, ArtifactUIState, DispatchResult, FareDataBridge (+13 more)

### Community 8 - "index.ts"
Cohesion: 0.06
Nodes (31): BoundedQueryResult, CompactSummarySchema, Coverage, DatasetFieldManifestSchema, DatasetRevisionSchema, DateSchema, dateWindow, ExecutionGuard (+23 more)

### Community 9 - "tree.ts"
Cohesion: 0.10
Nodes (22): keys, names, scalarLimit(), scalars, scope, validatePresentPrefix(), hasLaterAcceptedScene(), ScenePart (+14 more)

### Community 10 - "Shared scalar catalog contract"
Cohesion: 0.06
Nodes (33): ArtifactSkeleton, Callout, Carousel, CarrierFilter, CheapestFastest, CitySequence, CoverageNotice, CoverageSummary (+25 more)

### Community 11 - "runtime-provider.tsx"
Cohesion: 0.09
Nodes (15): TravelServices, normalizeToolContinuations(), CanonicalMessagesContext, completedLocalToolIndices(), completedNarrativeIndices(), localToolNames, GenerativeChatProps, AssistantNarrative() (+7 more)

### Community 12 - "compilerOptions"
Cohesion: 0.07
Nodes (28): agent, benchmarks/query-engine, *.config.ts, DOM, DOM.Iterable, ES2022, node, src (+20 more)

### Community 13 - "browser.ts"
Cohesion: 0.12
Nodes (23): base, benchmarkRows(), csvRows(), expected(), id, longTasks, Metric, percentile() (+15 more)

### Community 14 - "worker-client.ts"
Cohesion: 0.15
Nodes (13): index, DatasetId, scalar, WorkerRequest, WorkerResponse, WorkerResponseSchema, QueryResource, LocalQueryEngine (+5 more)

### Community 15 - "devDependencies"
Cohesion: 0.10
Nodes (22): @assistant-ui/vite, devDependencies, @assistant-ui/vite, @playwright/test, @testing-library/dom, @testing-library/jest-dom, @testing-library/react, @testing-library/user-event (+14 more)

### Community 16 - "a/toolkit.tsx"
Cohesion: 0.09
Nodes (21): generative, library, Travel UI evidence capture: 0-1280-blue-partial, Travel UI evidence capture: 0-1280-blue, Travel UI evidence capture: 0-360-blue-partial, Travel UI evidence capture: 0-360-blue, Travel UI evidence capture: 0-360-sand-partial, Travel UI evidence capture: 0-360-sand (+13 more)

### Community 17 - "Acceptance Evidence"
Cohesion: 0.11
Nodes (20): Acceptance Evidence, API Pagination, Backend Commit b1c8912, Backend Test Suite, Browser Captures, Browser flow, Browser Flow Acceptance, Coverage Parser (+12 more)

### Community 18 - "dependencies"
Cohesion: 0.11
Nodes (19): ai, @ai-sdk/react, assistant-stream, @assistant-ui/ai-sdk, @assistant-ui/react, @assistant-ui/react-generative-ui, dependencies, ai (+11 more)

### Community 19 - "scene-completion.test.ts"
Cohesion: 0.20
Nodes (15): handleChat(), CODEX_DEVELOPER_INSTRUCTIONS, ChatRequest, request, ack(), artifact, other, acceptTurn() (+7 more)

### Community 20 - "scripts"
Cohesion: 0.12
Nodes (16): scripts, agent:dev, benchmark:query, build, check:catalog, dev, frontend:dev, frontend:preview (+8 more)

### Community 21 - "browser-tools.ts"
Cohesion: 0.17
Nodes (12): DatasetIdSchema, DatasetManifestSchema, FareFieldSchema, LocalToolError, SummarizeFaresInputSchema, booleanFields, datasetId, fact() (+4 more)

### Community 22 - "run-state-proof.mjs"
Cohesion: 0.13
Nodes (12): /src/generative/data/fare-data-bridge.ts, /src/generative/state/persistence.ts, /src/generative/state/ui-state-store.ts, case0, errors, last, parts, requests (+4 more)

### Community 23 - "chat-route.ts"
Cohesion: 0.24
Nodes (9): loadLocationCatalog(), locationsSchema, selectLocations(), catalogDescriptors, catalogHash, catalogVersion, componentNames, sharedPropsSchema (+1 more)

### Community 24 - "registration-lifecycle.test.ts"
Cohesion: 0.16
Nodes (4): deferred(), request, scenario(), createLocalQueryEngine()

### Community 25 - "codex-provider.ts"
Cohesion: 0.19
Nodes (11): CODEX_MODEL, CODEX_REASONING_EFFORT, codexDecision(), Decision, DecisionDelta, DecisionSchema, readString(), MODEL_REQUEST_TIMEOUT_MS (+3 more)

### Community 26 - "repair.ts"
Cohesion: 0.27
Nodes (7): mocks, valid, InvalidModelOutputError, ModelAttemptObservation, withOneRepair(), knownMessages, validationReason()

### Community 27 - "request-schema.ts"
Cohesion: 0.18
Nodes (12): ErrorOutput, id, MessageSchema, parseChatRequest(), parseToolInput(), parseToolOutput(), PartSchema, RequestSchema (+4 more)

### Community 28 - "selected-fare-count.test.tsx"
Cohesion: 0.17
Nodes (9): artifactId, otherId, FareIdSchema, FareRow, first, request, second, request (+1 more)

### Community 29 - "summarize-fares.test.ts"
Cohesion: 0.21
Nodes (8): parseQuery(), UIStateStore, createBrowserTools(), artifactRef, coverage, fare(), fixture(), query()

### Community 30 - "abortError"
Cohesion: 0.30
Nodes (8): load(), cancel(), finish(), abortError(), loadResource(), request(), cancel(), QueryWorker

### Community 31 - "verify_pasted_coverage.py"
Cohesion: 0.44
Nodes (11): check_database(), main(), normalized(), pair(), parse_dash_line(), parse_manifest(), parse_to_line(), Path (+3 more)

### Community 32 - "Contributing Guide"
Cohesion: 0.31
Nodes (11): Pull Request Template, Pull Request Branch Target, Pull Request Verification, Contributing Guide, Branch Naming Convention, dev Branch, Focused Pull Requests, Hotfix Branch (+3 more)

### Community 33 - "query-engine.ts"
Cohesion: 0.25
Nodes (10): AllowedFareField, DatasetRevision, PredicateTree, compare(), defaults, executeQuery(), matches(), QueryLimits (+2 more)

### Community 34 - "Deterministic Database Generator"
Cohesion: 0.22
Nodes (10): Atomic Database Replacement, Daily Route Coverage, Deterministic Database Generator, Seeded Reproducible Allocation, 10,000,000-row Default, 2026-01-01 to 2027-12-31 Calendar, Broad European Capital Network, Generated Non-bookable Inventory (+2 more)

### Community 35 - "run.mjs"
Cohesion: 0.22
Nodes (7): agentPort, apiPort, children, env, start(), stop(), webPort

### Community 36 - "Omio Generative UI Demo"
Cohesion: 0.22
Nodes (7): Direct Local Data Controls, IndexedDB Conversation Persistence, Native React Component Composition, Omio Generative UI Demo, Run locally, Signed-in Codex Model, Verify

### Community 37 - "Current Pasted Source Catalog"
Cohesion: 0.22
Nodes (9): Current Pasted Source Catalog, European Mode and Gateway Constraints, 50 European and Trans-European Capitals, Observed Source Identity and Availability, Preserved Version 2 Fixture Profile, Source Manifest Drift, Supplementary Corridors, 36 Supplied Connection Pairs (+1 more)

### Community 38 - "SelectedFareCount"
Cohesion: 0.22
Nodes (9): Bounded artifactRef Scalar, Atomic Selection Status Region, Browser Selection and Deselection Proof, Integration-origin Reload Gate, Native Renderer Selection Actions, No Query Network or Model Turn, selectedFareIds Length Derivation, Unresolved Artifact Fallback (+1 more)

### Community 39 - "Canonical Catalog Descriptor"
Cohesion: 0.25
Nodes (7): Distinct Travel Catalog Primitives, Scoped fare-selection date intent, Catalog Version 1.0.0, Canonical Catalog Descriptor, Generated Schemas and Model Documentation, Expanded Vocabulary Manifest Hash, Native Compiler-valid Toolkit

### Community 40 - "Omio Reference Assets"
Cohesion: 0.25
Nodes (7): Multimodal Travel Search, Omio Travel Search Demo Page, React Application Entry, Live Landing Page Asset Provenance, Mobile App Call-to-Action Assets, Non-Production Visual Reference Use, Omio Reference Assets

### Community 41 - "descriptors.ts"
Cohesion: 0.29
Nodes (5): descriptors, refs, hash, CATALOG_VERSION, ComponentDescriptor

### Community 42 - "Synthetic Timetable Backend"
Cohesion: 0.29
Nodes (7): Requested Seat Availability Constraint, Duration Authoritative Across Time Zones, Generate the database, Run the API, Timetable Search Contract, Synthetic Timetable Backend, Test

### Community 43 - "query-engine/package.json"
Cohesion: 0.29
Nodes (6): dependencies, @duckdb/duckdb-wasm, name, private, type, @duckdb/duckdb-wasm

### Community 44 - "Granular Component Semantics"
Cohesion: 0.33
Nodes (7): Authored Nodes and Positional Props, Granular Component Semantics, ComparisonMatrix, ComparisonTable, ModeBreakdown, SelectedItinerary, SyntheticTotal

### Community 45 - "run-completion.mjs"
Cohesion: 0.29
Nodes (6): errors, last, requests, responses, started, timers

### Community 46 - "Repository Workflow"
Cohesion: 0.40
Nodes (5): Code Review Graph, Graph-Guided Source Verification, Graphify Knowledge Graph, Knowledge graphs, Repository Workflow

### Community 47 - "run.ts"
Cohesion: 0.33
Nodes (4): awaiting, completion, errors, measurements

### Community 48 - "Source document"
Cohesion: 0.33
Nodes (6): Explicit null sort ordering, Independent DuckDB null oracle, Manifest-declared nullable operands, Null-safe equality and membership, Ordered predicates reject null, Source document

### Community 49 - "Urban Travel Scene"
Cohesion: 0.40
Nodes (6): App Call-to-Action Background Illustration, Bus, Cityscape, Intermodal Mobility, Train, Urban Travel Scene

### Community 50 - "Transportation Landscape Hero"
Cohesion: 0.33
Nodes (6): Air Travel, Bus Travel, Ferry Travel, Multimodal Travel, Rail Travel, Transportation Landscape Hero

### Community 51 - "Native A compatibility evidence"
Cohesion: 0.33
Nodes (5): Commands, Native A compatibility evidence, Observed API boundaries, Provider probe, Shared catalog and paused-stream proof

### Community 52 - "Selected Fare Count Catalog Extension"
Cohesion: 0.40
Nodes (4): Contract and ownership, Cost and boundary proof, Generator and compatibility, Selected Fare Count Catalog Extension

### Community 53 - "package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 54 - "Download on the Apple App Store Badge"
Cohesion: 0.40
Nodes (5): Apple App Store, Download on the Apple App Store Badge, Apple Logo, iOS App Download, Trusted Platform Acquisition

### Community 55 - "Three-process Development Launcher"
Cohesion: 0.50
Nodes (5): Loopback Service Binding, Model Agent Service, Python Fare API, Three-process Development Launcher, Vite Development Server

### Community 57 - "spike/toolkit.tsx"
Cohesion: 0.60
Nodes (3): SpikeCard(), SpikeSurface(), generative

### Community 58 - "Browser query engine decision"
Cohesion: 0.40
Nodes (4): Browser query engine decision, Domain verification, Measurement, Reproduce

### Community 60 - "DateWindow"
Cohesion: 0.50
Nodes (4): Inclusive Local Query Semantics, DateStrip, DateWindow, RetryAction

### Community 61 - "Huawei AppGallery Download Badge"
Cohesion: 0.50
Nodes (4): Huawei AppGallery Download Badge, Huawei AppGallery, Mobile App Download, Platform Distribution Call to Action

### Community 62 - "Machine-Readable Link"
Cohesion: 0.50
Nodes (4): Cross-Device Handoff, Machine-Readable Link, Mobile App Acquisition, Mobile App QR Code

### Community 63 - "Compass Icon"
Cohesion: 0.50
Nodes (4): Compass Icon, Directional Navigation, Explore Destinations, Travel Discovery

### Community 65 - "Local query engine benchmark report"
Cohesion: 0.50
Nodes (4): Local query engine benchmark report, The report includes thresholds, cancellation timings, main-thread long-task fields and correctness booleans; this is visible report text rather than independent proof., A printed report names typescript-worker and duckdb-wasm at 50000 and 200000 rows., Workloads named topK, filter, group and join contain p50Ms/p95Ms metrics.

### Community 66 - "Google Play"
Cohesion: 0.67
Nodes (3): Android App Distribution, Google Play Download Badge, Google Play

### Community 67 - "Mobile Ticketing"
Cohesion: 1.00
Nodes (3): Mobile Ticketing, QR Code, Mobile Ticket QR Code Icon

### Community 68 - "Visual Scan Target"
Cohesion: 0.67
Nodes (3): QR Code Scanning, Scanner Frame, Visual Scan Target

### Community 69 - "Update and Refresh"
Cohesion: 0.67
Nodes (3): Synchronization, Update and Refresh, Updates Icon

### Community 70 - "Source document"
Cohesion: 0.67
Nodes (3): Append-only B positional schema, Canonical catalog identity, Source document

## Knowledge Gaps
- **408 isolated node(s):** `LocationSeed`, `SmartPlannerHandoff`, `GenerativeChatProps`, `Metric`, `Report` (+403 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `FareDataBridge` connect `context.tsx` to `component.tsx`?**
  _High betweenness centrality (0.001) - this node is a cross-community bridge._
- **Why does `UIStateStore` connect `summarize-fares.test.ts` to `component.tsx`?**
  _High betweenness centrality (0.000) - this node is a cross-community bridge._
- **Why does `createFareDataBridge()` connect `createFareDataBridge` to `registration-lifecycle.test.ts`, `abortError`?**
  _High betweenness centrality (0.000) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `createUIStateStore()` (e.g. with `dispatch()` and `get()`) actually correct?**
  _`createUIStateStore()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `LocationSeed`, `SmartPlannerHandoff`, `GenerativeChatProps` to the rest of the system?**
  _408 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `app.py` be split into smaller, more focused modules?**
  _Cohesion score 0.05851619644723093 - nodes in this community are weakly interconnected._
- **Should `ResultsPage.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05045045045045045 - nodes in this community are weakly interconnected._