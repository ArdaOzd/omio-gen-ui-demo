# Graph Report - omio-gen-ui-demo  (2026-10-05)

## Corpus Check
- 196 files · ~196,917 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1331 nodes · 2811 edges · 111 communities (87 shown, 24 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 77 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ae228dbe`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- app.py
- App.jsx
- browser.ts
- browser-tools.ts
- createFareDataBridge
- ArtifactIdSchema
- fare-data-bridge.ts
- context.tsx
- index.ts
- tree.ts
- Shared scalar catalog contract
- thread-shell.tsx
- compilerOptions
- worker-client.ts
- components.json
- devDependencies
- a/toolkit.tsx
- Acceptance Evidence
- dependencies
- scene-completion.test.ts
- scripts
- request-schema.ts
- run-state-proof.mjs
- check-shadcn.mjs
- registration-lifecycle.test.ts
- codex-provider.ts
- chat-continuation.test.ts
- persistence.ts
- SearchForm.jsx
- summarize-fares.test.ts
- query-engine.ts
- verify_pasted_coverage.py
- Contributing Guide
- planning-tracker.tsx
- Deterministic Database Generator
- run.mjs
- Omio Generative UI Demo
- Current Pasted Source Catalog
- SelectedFareCount
- Canonical Catalog Descriptor
- Omio Reference Assets
- runtime-provider.tsx
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
- snapshot-exporter.ts
- LandingPage.jsx
- assertNoBulkData
- routes.tsx
- playwright.config.ts
- install-graphify-hooks.sh
- test-graphify-hooks.sh
- catalog.md
- live/README.md
- run-browser-proof.mjs
- codex-provider.md
- vite.config.js
- abortError
- views/index.tsx
- protocol.ts
- chat-route.ts
- @ai-sdk/react
- classic-search.test.tsx
- assistant-stream
- @assistant-ui/ai-sdk
- @assistant-ui/react-generative-ui
- cn
- radix-ui
- react-dom
- tailwindcss
- @tailwindcss/vite
- zod
- ResultsPage.jsx

## God Nodes (most connected - your core abstractions)
1. `createFareDataBridge()` - 46 edges
2. `Shared scalar catalog contract` - 42 edges
3. `createUIStateStore()` - 39 edges
4. `ArtifactIdSchema` - 34 edges
5. `assertNoBulkData()` - 23 edges
6. `createActionRouter()` - 18 edges
7. `cityLabel()` - 18 edges
8. `FareDataBridge` - 17 edges
9. `useTravelQuery()` - 17 edges
10. `scripts` - 17 edges

## Surprising Connections (you probably didn't know these)
- `Pull Request Template` --semantically_similar_to--> `Contributing Guide`  [INFERRED] [semantically similar]
  .github/pull_request_template.md → CONTRIBUTING.md
- `10,000,000 Synthetic Fares` --semantically_similar_to--> `10,000,000-row Default`  [INFERRED] [semantically similar]
  README.md → backend/README.md
- `handleChat()` --calls--> `assertNoBulkData()`  [EXTRACTED]
  agent/chat-route.ts → src/generative/contracts/privacy.ts
- `handleChat()` --calls--> `validatePresentTree()`  [EXTRACTED]
  agent/chat-route.ts → src/generative/variants/a/tree.ts
- `runNullableOracle()` --calls--> `parseQuery()`  [EXTRACTED]
  benchmarks/query-engine/browser.ts → src/generative/contracts/index.ts

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

## Communities (111 total, 24 thin omitted)

### Community 0 - "app.py"
Cohesion: 0.06
Nodes (62): ApiError, _connect(), _date_value(), dispatch(), _fail(), get_locations(), get_metadata(), _integer() (+54 more)

### Community 1 - "App.jsx"
Cohesion: 0.19
Nodes (16): buildSearchUrl(), displayLocation(), getJson(), locationValue(), minutesFromDuration(), MODE_ORDER, modes, normalizeLocations() (+8 more)

### Community 2 - "browser.ts"
Cohesion: 0.15
Nodes (20): base, benchmarkRows(), csvRows(), expected(), id, longTasks, Metric, percentile() (+12 more)

### Community 3 - "browser-tools.ts"
Cohesion: 0.15
Nodes (13): DatasetIdSchema, DatasetManifestSchema, EditArtifactInputSchema, FareFieldSchema, LocalToolError, SummarizeFaresInputSchema, booleanFields, datasetId (+5 more)

### Community 4 - "createFareDataBridge"
Cohesion: 0.11
Nodes (25): request(), artifactId, fare(), setup(), CatalogNode(), TravelProvider(), id, setup() (+17 more)

### Community 5 - "ArtifactIdSchema"
Cohesion: 0.09
Nodes (20): artifactId, otherId, ArtifactId, ArtifactIdSchema, ArtifactUIStateSchema, CompactArtifactSnapshotSchema, FareIdSchema, FareRow (+12 more)

### Community 6 - "fare-data-bridge.ts"
Cohesion: 0.12
Nodes (23): BoundedFareFactSchema, DatasetFieldManifest, DatasetManifest, parseQuery(), apiRow, pageSource, request, load() (+15 more)

### Community 7 - "context.tsx"
Cohesion: 0.14
Nodes (21): TravelContext, id, request, ArtifactUIState, CoverageRequest, DispatchResult, FareDataBridge, UICommand (+13 more)

### Community 8 - "index.ts"
Cohesion: 0.06
Nodes (33): descriptors, refs, hash, AgentContextEnvelopeSchema, CATALOG_VERSION, CompactSummarySchema, ComponentDescriptor, Coverage (+25 more)

### Community 9 - "tree.ts"
Cohesion: 0.14
Nodes (15): keys, names, scalarLimit(), scalars, scope, validatePresentPrefix(), LEAKAGE_SENTINEL, layouts (+7 more)

### Community 10 - "Shared scalar catalog contract"
Cohesion: 0.06
Nodes (33): ArtifactSkeleton, Callout, Carousel, CarrierFilter, CheapestFastest, CitySequence, CoverageNotice, CoverageSummary (+25 more)

### Community 11 - "thread-shell.tsx"
Cohesion: 0.11
Nodes (14): Textarea(), TravelServices, CanonicalMessagesContext, completedLocalToolIndices(), completedNarrativeIndices(), localToolNames, AssistantNarrative(), assistantWorkingPuns (+6 more)

### Community 12 - "compilerOptions"
Cohesion: 0.06
Nodes (30): agent, benchmarks/query-engine, *.config.ts, DOM, DOM.Iterable, ES2022, node, src (+22 more)

### Community 13 - "worker-client.ts"
Cohesion: 0.22
Nodes (8): index, BoundedQueryResult, DatasetId, QueryIR, WorkerResponseSchema, QueryResource, LocalQueryEngine, Measured TypeScript versus DuckDB engine decision

### Community 14 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 15 - "devDependencies"
Cohesion: 0.06
Nodes (31): @assistant-ui/vite, jsdom, devDependencies, @assistant-ui/vite, jsdom, @playwright/test, @testing-library/dom, @testing-library/jest-dom (+23 more)

### Community 16 - "a/toolkit.tsx"
Cohesion: 0.09
Nodes (21): generative, library, Travel UI evidence capture: 0-1280-blue-partial, Travel UI evidence capture: 0-1280-blue, Travel UI evidence capture: 0-360-blue-partial, Travel UI evidence capture: 0-360-blue, Travel UI evidence capture: 0-360-sand-partial, Travel UI evidence capture: 0-360-sand (+13 more)

### Community 17 - "Acceptance Evidence"
Cohesion: 0.11
Nodes (20): Acceptance Evidence, API Pagination, Backend Commit b1c8912, Backend Test Suite, Browser Captures, Browser flow, Browser Flow Acceptance, Coverage Parser (+12 more)

### Community 18 - "dependencies"
Cohesion: 0.13
Nodes (15): ai, @assistant-ui/react, class-variance-authority, lucide-react, dependencies, ai, @assistant-ui/react, class-variance-authority (+7 more)

### Community 19 - "scene-completion.test.ts"
Cohesion: 0.20
Nodes (15): handleChat(), ChatRequest, parseToolOutput(), request, ack(), artifact, other, acceptTurn() (+7 more)

### Community 20 - "scripts"
Cohesion: 0.12
Nodes (17): scripts, agent:dev, benchmark:query, build, check:catalog, check:shadcn, dev, frontend:dev (+9 more)

### Community 21 - "request-schema.ts"
Cohesion: 0.22
Nodes (8): ErrorOutput, id, MessageSchema, PartSchema, RequestSchema, revision, TOOL_NAMES, ToolSchema

### Community 22 - "run-state-proof.mjs"
Cohesion: 0.17
Nodes (9): case0, errors, last, parts, requests, result, secondView, streams (+1 more)

### Community 23 - "check-shadcn.mjs"
Cohesion: 0.15
Nodes (20): assistantInteractiveParts, attributesOf(), componentsPath, interactiveRoles, isDirectShadcnAsChild(), isProductionSource(), jsxName(), location() (+12 more)

### Community 24 - "registration-lifecycle.test.ts"
Cohesion: 0.16
Nodes (4): deferred(), request, scenario(), createLocalQueryEngine()

### Community 25 - "codex-provider.ts"
Cohesion: 0.18
Nodes (12): CODEX_DEVELOPER_INSTRUCTIONS, CODEX_MODEL, CODEX_REASONING_EFFORT, codexDecision(), Decision, DecisionDelta, DecisionSchema, readString() (+4 more)

### Community 26 - "chat-continuation.test.ts"
Cohesion: 0.21
Nodes (9): {decision}, servers, mocks, valid, InvalidModelOutputError, ModelAttemptObservation, withOneRepair(), knownMessages (+1 more)

### Community 27 - "persistence.ts"
Cohesion: 0.10
Nodes (15): CoverageRequestSchema, UIStateStore, io, descriptor, parsePersistedThread(), PersistedThreadSchema, id, request (+7 more)

### Community 28 - "SearchForm.jsx"
Cohesion: 0.10
Nodes (18): editDistance(), isSubsequence(), LocationField(), handleKeyDown(), selectLocation(), normalizeText(), resolveLocation(), SearchForm() (+10 more)

### Community 29 - "summarize-fares.test.ts"
Cohesion: 0.25
Nodes (9): createBrowserTools(), artifactId, coverage, setup(), artifactRef, coverage, fare(), fixture() (+1 more)

### Community 30 - "query-engine.ts"
Cohesion: 0.17
Nodes (13): AllowedFareField, DatasetRevision, PredicateTree, compare(), defaults, executeQuery(), matches(), QueryLimits (+5 more)

### Community 31 - "verify_pasted_coverage.py"
Cohesion: 0.44
Nodes (11): check_database(), main(), normalized(), pair(), parse_dash_line(), parse_manifest(), parse_to_line(), Path (+3 more)

### Community 32 - "Contributing Guide"
Cohesion: 0.31
Nodes (11): Pull Request Template, Pull Request Branch Target, Pull Request Verification, Contributing Guide, Branch Naming Convention, dev Branch, Focused Pull Requests, Hotfix Branch (+3 more)

### Community 33 - "planning-tracker.tsx"
Cohesion: 0.16
Nodes (14): Dialog(), DialogClose(), DialogContent(), DialogDescription(), DialogTitle(), DialogTrigger(), FareId, artifactIds() (+6 more)

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

### Community 41 - "runtime-provider.tsx"
Cohesion: 0.16
Nodes (10): openSmartPlanner(), normalizeToolContinuations(), HISTORY_LIMITS, GenerativeChat(), GenerativeChatProps, completeSmartPlannerHandoff(), readSmartPlannerHandoff(), SmartPlannerHandoff (+2 more)

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

### Community 74 - "snapshot-exporter.ts"
Cohesion: 0.09
Nodes (27): AgentContextEnvelope, BoundedFareFact, CompactArtifactSnapshot, CONTRACT_VERSION, OlderArtifactSummary, captureAgentContext(), captureAgentContextWithSelectedFares(), capturePreparedContext() (+19 more)

### Community 75 - "LandingPage.jsx"
Cohesion: 0.19
Nodes (10): Icon(), paths, LandingPage(), offers, transportModes, Logo(), Badge(), badgeVariants (+2 more)

### Community 76 - "assertNoBulkData"
Cohesion: 0.16
Nodes (18): parseChatRequest(), parseToolInput(), currentMessage(), fits(), olderMessage(), projectNetworkHistory(), splitText(), context() (+10 more)

### Community 77 - "routes.tsx"
Cohesion: 0.15
Nodes (13): Collapsible(), CollapsibleContent(), CollapsibleTrigger(), Forty shared granular travel descriptors, GenerativeRoute(), getSceneMetadata(), createIndexedDBStorage(), createThreadPersistence() (+5 more)

### Community 94 - "abortError"
Cohesion: 0.33
Nodes (6): cancel(), finish(), abortError(), request(), cancel(), QueryWorker

### Community 95 - "views/index.tsx"
Cohesion: 0.05
Nodes (68): Alert(), AlertDescription(), AlertTitle(), alertVariants, Checkbox(), Field(), FieldLegend(), FieldSet() (+60 more)

### Community 96 - "protocol.ts"
Cohesion: 0.22
Nodes (8): DatasetRevisionSchema, scalar, WorkerRequest, WorkerResponse, id, query, requests, resources

### Community 99 - "chat-route.ts"
Cohesion: 0.24
Nodes (9): loadLocationCatalog(), locationsSchema, selectLocations(), catalogDescriptors, catalogHash, catalogVersion, componentNames, sharedPropsSchema (+1 more)

### Community 102 - "classic-search.test.tsx"
Cohesion: 0.40
Nodes (3): response(), summaries, trip()

### Community 117 - "ResultsPage.jsx"
Cohesion: 0.14
Nodes (16): sortTrips(), companyColors, dateSequence(), formatDate(), formatDuration(), formatPrice(), formatTime(), modeLabels (+8 more)

## Knowledge Gaps
- **448 isolated node(s):** `structuralLayouts`, `PlannedFare`, `PlannedFareResult`, `LocationSeed`, `ScenePart` (+443 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Shared scalar catalog contract` connect `Shared scalar catalog contract` to `SelectedFareCount`, `Granular Component Semantics`, `DateWindow`?**
  _High betweenness centrality (0.000) - this node is a cross-community bridge._
- **Why does `FareDataBridge` connect `context.tsx` to `views/index.tsx`?**
  _High betweenness centrality (0.000) - this node is a cross-community bridge._
- **Why does `SelectedFareCount` connect `SelectedFareCount` to `Canonical Catalog Descriptor`?**
  _High betweenness centrality (0.000) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `createUIStateStore()` (e.g. with `dispatch()` and `get()`) actually correct?**
  _`createUIStateStore()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `structuralLayouts`, `PlannedFare`, `PlannedFareResult` to the rest of the system?**
  _448 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `app.py` be split into smaller, more focused modules?**
  _Cohesion score 0.05851619644723093 - nodes in this community are weakly interconnected._
- **Should `browser.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14855072463768115 - nodes in this community are weakly interconnected._