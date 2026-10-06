# Graph Report - omio-gen-ui-demo  (2026-10-06)

## Corpus Check
- 233 files · ~203,933 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1456 nodes · 3117 edges · 153 communities (101 shown, 52 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 88 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6b2e926f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- app.py
- snapshot-exporter.ts
- views/index.tsx
- index.ts
- createFareDataBridge
- context.tsx
- ArtifactIdSchema
- dependencies
- cityLabel
- chat-route.ts
- compilerOptions
- assertNoBulkData
- routes.tsx
- trip-planning/components.tsx
- Deterministic Database Generator
- browser.ts
- controls/index.tsx
- codex-provider.ts
- SelectedFareCount
- fare-data-bridge.ts
- ResultsPage.jsx
- Native Recursive Present Tree
- worker-client.ts
- components.json
- check-shadcn.mjs
- SearchForm.jsx
- Acceptance Evidence
- App.jsx
- planning-tracker.tsx
- Null-safe Query Predicates
- request-schema.ts
- scripts
- LandingPage.jsx
- query-engine.ts
- browser-tools.ts
- scene-completion.test.ts
- devDependencies
- run-state-proof.mjs
- runtime-provider.tsx
- summarize-fares.test.ts
- registration-lifecycle.test.ts
- present-boundary.tsx
- abortError
- verify_pasted_coverage.py
- Contributing Guide
- run.mjs
- smart-planner-handoff.ts
- MultiCityPlanGrid
- descriptors.ts
- query-engine/package.json
- run-completion.mjs
- Repository Workflow
- run.ts
- Urban Travel Scene
- Transportation Landscape Hero
- classic-search.test.tsx
- continuation-history.test.ts
- location-catalog.ts
- package.json
- Download on the Apple App Store Badge
- Omio Reference Assets
- Three-process Development Launcher
- run-query-benchmark.mjs
- Signed-in Codex Provider Verification
- spike/toolkit.tsx
- ModelProcess
- DateWindow
- Huawei AppGallery Download Badge
- Machine-Readable Link
- Compass Icon
- Dated Bus Journey Timeline
- run-live.mjs
- DuckDB WASM Engine
- Omio Travel Search Demo Page
- Google Play
- Mobile Ticketing
- Visual Scan Target
- Update and Refresh
- Shared Catalog 1.0.0
- Desktop Blue Fare Selection Completed Stream
- London to Paris Bus Option
- Mobile Blue Fare Selection Completed Stream
- Stacked Mobile Travel View
- Mobile Sand Fare Selection Partial Stream
- Mobile Sand Fare Selection Completed Stream
- Seven Day Lowest Fare Selector
- Seven Day Lowest Fare Selector
- London to Paris Route Timeline
- Local Fare Controls
- Calendar First Fare Comparison
- Journey Itinerary Timeline
- Travel Choices
- Per-leg Fare Selection
- Selected Bus Fare
- backend/__init__.py
- No Saved State Migration or Reset
- jsdom
- @playwright/test
- @testing-library/dom
- @testing-library/jest-dom
- @testing-library/react
- @testing-library/user-event
- tsx
- @vitejs/plugin-react
- playwright.config.ts
- install-graphify-hooks.sh
- test-graphify-hooks.sh
- ComparisonMatrix
- CoverageNotice
- FareCards
- RetryAction
- SelectedItinerary
- run-browser-proof.mjs
- vite.config.js
- shadcn/ui MIT License
- ArtifactSkeleton
- Callout
- Carousel
- CarrierFilter
- CheapestFastest
- DateStrip
- DateWindow
- DirectToggle
- DurationPricePlot
- DurationRange
- EmptyState
- Inline
- InlineError
- ItineraryTimeline
- ModeBreakdown
- ModeChips
- PriceRange
- ResponsiveGrid
- Section
- SelectedFareCount
- SortSelect
- Stack
- StayAllocation
- StickySummary
- Tabs
- TravelHero
- TravelSurface

## God Nodes (most connected - your core abstractions)
1. `createFareDataBridge()` - 49 edges
2. `createUIStateStore()` - 43 edges
3. `ArtifactIdSchema` - 38 edges
4. `cityLabel()` - 25 edges
5. `createActionRouter()` - 25 edges
6. `assertNoBulkData()` - 23 edges
7. `FareRowSchema` - 19 edges
8. `useTravelAction()` - 18 edges
9. `scripts` - 17 edges
10. `useTravelQuery()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `Pull Request Template` --semantically_similar_to--> `Contributing Guide`  [INFERRED] [semantically similar]
  .github/pull_request_template.md → CONTRIBUTING.md
- `10,000,000 Synthetic Fares` --semantically_similar_to--> `10,000,000-row Default`  [INFERRED] [semantically similar]
  README.md → backend/README.md
- `handleChat()` --calls--> `assertNoBulkData()`  [EXTRACTED]
  agent/chat-route.ts → src/generative/contracts/privacy.ts
- `handleChat()` --calls--> `validatePresentTree()`  [EXTRACTED]
  agent/chat-route.ts → src/generative/variants/a/tree.ts
- `parseChatRequest()` --calls--> `parseAgentContext()`  [EXTRACTED]
  agent/request-schema.ts → src/generative/contracts/index.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Dual-Graph Repository Analysis** — agents_repository_workflow, agents_code_review_graph, agents_graphify_knowledge_graph, agents_graph_guided_source_verification [EXTRACTED 1.00]
- **Local Three-process Development Stack** — readme_three_process_development_launcher, readme_python_fare_api, readme_model_agent_service, readme_vite_development_server [EXTRACTED 1.00]
- **Deterministic Fixture Invariants** — backend_readme_ten_million_row_default, backend_readme_two_year_calendar, backend_readme_daily_route_coverage, backend_readme_seeded_reproducible_allocation [EXTRACTED 1.00]
- **Granular Travel Catalog Primitives** — docs_decisions_catalog_primitive_semantics_selecteditinerary, docs_decisions_catalog_primitive_semantics_synthetictotal, docs_decisions_catalog_primitive_semantics_selectedfarecount, docs_decisions_catalog_primitive_semantics_comparisontable, docs_decisions_catalog_primitive_semantics_comparisonmatrix, docs_decisions_catalog_primitive_semantics_modebreakdown [EXTRACTED 1.00]
- **Acceptance Verification Layers** — verification_acceptance_database_source_coverage, verification_acceptance_http_api_acceptance, verification_acceptance_browser_flow_acceptance [EXTRACTED 1.00]
- **Source Coverage Contract Verification** — verification_acceptance_generated_sqlite_database, verification_acceptance_coverage_parser, verification_acceptance_backend_test_suite, verification_acceptance_source_contract [EXTRACTED 1.00]
- **App Call-to-Action Intermodal Scene** — public_assets_omio_app_background_app_cta_background, public_assets_omio_app_background_urban_travel_scene, public_assets_omio_app_background_bus, public_assets_omio_app_background_train, public_assets_omio_app_background_cityscape [INFERRED 0.75]
- **Multimodal Passenger Transport** — public_assets_omio_hero_air_travel, public_assets_omio_hero_rail_travel, public_assets_omio_hero_bus_travel, public_assets_omio_hero_ferry_travel [INFERRED 0.85]
- **Native Generative UI Evidence** — verification_generative_ui_a_compatibility_native_present_tree, verification_generative_ui_a_live_readme_live_native_composition_evidence, verification_generative_ui_a_user_conversation_readme_native_sdk_tool_execution [INFERRED 0.95]
- **Query Semantics and Engine Boundary** — docs_decisions_query_null_semantics_null_safe_predicates, docs_decisions_query_null_semantics_duckdb_oracle, verification_generative_ui_query_engine_2026_10_02_validated_queryir_boundary, verification_generative_ui_query_engine_2026_10_02_typescript_module_worker [INFERRED 0.85]
- **Artifact State Continuity Flow** — verification_generative_ui_a_compatibility_snapshot_transport, verification_generative_ui_a_user_conversation_readme_native_sdk_tool_execution, verification_generative_ui_state_proof_readme_restored_artifact_state, verification_generative_ui_state_proof_readme_atomic_snapshot [INFERRED 0.85]
- **London to Paris Journey Representations** — verification_generative_ui_a_browser_proof_2_1280_blue_partial_schematic_route, verification_generative_ui_a_browser_proof_2_1280_blue_partial_journey_timeline, verification_generative_ui_a_browser_proof_2_1280_blue_partial_fare_option [INFERRED 0.95]
- **Streamed Journey View** — verification_generative_ui_a_browser_proof_2_1280_blue_streamed_journey_story, verification_generative_ui_a_browser_proof_2_1280_blue_route_timeline, verification_generative_ui_a_browser_proof_2_1280_blue_synthetic_fare_options [EXTRACTED 1.00]
- **Fare Decision Interface** — verification_generative_ui_a_live_case_0_split_fare_comparison, verification_generative_ui_a_live_case_0_local_fare_controls, verification_generative_ui_a_live_case_0_cheapest_fastest_summary [EXTRACTED 1.00]
- **Calendar Comparison Workflow** — verification_generative_ui_a_live_case_1_calendar_first_comparison, verification_generative_ui_a_live_case_1_mode_duration_matrix, verification_generative_ui_a_live_case_1_local_refinement_controls [EXTRACTED 1.00]
- **Journey Story** — verification_generative_ui_a_live_case_2_route_map, verification_generative_ui_a_live_case_2_itinerary_timeline, verification_generative_ui_a_live_case_2_synthetic_total [EXTRACTED 1.00]
- **Native Present Smoke Render** — verification_generative_ui_a_native_present_native_rendering_smoke_test, verification_generative_ui_a_native_present_travel_choices, verification_generative_ui_a_native_present_train_bus_options [INFERRED 0.85]
- **Multi-city Planning View** — verification_generative_ui_a_user_conversation_completion_multicity_route, verification_generative_ui_a_user_conversation_completion_per_leg_fare_selection, verification_generative_ui_a_user_conversation_completion_sticky_synthetic_totals [EXTRACTED 1.00]
- **Query Engine Benchmark Engines and Workloads** — verification_generative_ui_query_engine_2026_10_02_local_query_engine_benchmark, verification_generative_ui_query_engine_2026_10_02_typescript_worker_engine, verification_generative_ui_query_engine_2026_10_02_duckdb_wasm_engine, verification_generative_ui_query_engine_2026_10_02_workload_correctness [EXTRACTED 1.00]
- **Selection Persistence Proof** — verification_generative_ui_state_proof_result_persisted_fare_view, verification_generative_ui_state_proof_result_selected_bus_fare, verification_generative_ui_state_proof_result_text_only_state_summary [EXTRACTED 1.00]

## Communities (153 total, 52 thin omitted)

### Community 0 - "app.py"
Cohesion: 0.06
Nodes (62): ApiError, _connect(), _date_value(), dispatch(), _fail(), get_locations(), get_metadata(), _integer() (+54 more)

### Community 1 - "snapshot-exporter.ts"
Cohesion: 0.07
Nodes (43): AgentContextEnvelope, BoundedFareFact, CitySequenceSchema, CompactArtifactSnapshot, CONTRACT_VERSION, Coverage, OlderArtifactSummary, fallbackLegDate() (+35 more)

### Community 2 - "views/index.tsx"
Cohesion: 0.10
Nodes (30): Alert(), AlertDescription(), AlertTitle(), alertVariants, Skeleton(), Table(), TableBody(), TableCaption() (+22 more)

### Community 3 - "index.ts"
Cohesion: 0.06
Nodes (35): {decision}, servers, ArtifactId, ArtifactUIStateSchema, CompactArtifactSnapshotSchema, CompactSummarySchema, ComponentBindingSchema, DatasetFieldManifestSchema (+27 more)

### Community 4 - "createFareDataBridge"
Cohesion: 0.10
Nodes (29): request(), artifactId, fare(), setup(), CatalogNode(), id, setup(), fixture() (+21 more)

### Community 5 - "context.tsx"
Cohesion: 0.13
Nodes (24): TravelContext, id, request, id, ArtifactUIState, CoverageRequest, DispatchResult, FareDataBridge (+16 more)

### Community 6 - "ArtifactIdSchema"
Cohesion: 0.09
Nodes (24): artifactId, otherId, ArtifactIdSchema, CoverageRequestSchema, FareIdSchema, createArtifactStore(), createThreadPersistence(), descriptor (+16 more)

### Community 7 - "dependencies"
Cohesion: 0.06
Nodes (35): ai, @ai-sdk/react, assistant-stream, @assistant-ui/ai-sdk, @assistant-ui/react, @assistant-ui/react-generative-ui, class-variance-authority, cn (+27 more)

### Community 8 - "cityLabel"
Cohesion: 0.20
Nodes (32): PendingQueryProbe(), carrierLabel(), cityLabel(), departure(), duration(), money(), useFareRows(), useTravelAction() (+24 more)

### Community 9 - "chat-route.ts"
Cohesion: 0.12
Nodes (22): keys, names, scalarLimit(), scalars, scope, validatePresentPrefix(), catalogDescriptors, catalogHash (+14 more)

### Community 10 - "compilerOptions"
Cohesion: 0.06
Nodes (30): agent, benchmarks/query-engine, *.config.ts, DOM, DOM.Iterable, ES2022, node, src (+22 more)

### Community 11 - "assertNoBulkData"
Cohesion: 0.12
Nodes (20): currentMessage(), fits(), olderMessage(), projectNetworkHistory(), splitText(), context(), prepared(), createSnapshotTransport() (+12 more)

### Community 12 - "routes.tsx"
Cohesion: 0.11
Nodes (20): Collapsible(), CollapsibleContent(), CollapsibleTrigger(), Textarea(), CanonicalMessagesContext, completedLocalToolIndices(), completedNarrativeIndices(), localToolNames (+12 more)

### Community 13 - "trip-planning/components.tsx"
Cohesion: 0.12
Nodes (27): useItineraryPlan(), CityField(), CityFields(), dateRange(), defaultLegSort, FadeFares(), FareCalendar(), FareOrder() (+19 more)

### Community 14 - "Deterministic Database Generator"
Cohesion: 0.08
Nodes (28): Atomic Database Replacement, Requested Seat Availability Constraint, Current Pasted Source Catalog, Daily Route Coverage, Deterministic Database Generator, Duration Authoritative Across Time Zones, European Mode and Gateway Constraints, 50 European and Trans-European Capitals (+20 more)

### Community 15 - "browser.ts"
Cohesion: 0.12
Nodes (23): base, benchmarkRows(), csvRows(), expected(), id, longTasks, Metric, percentile() (+15 more)

### Community 16 - "controls/index.tsx"
Cohesion: 0.11
Nodes (12): Checkbox(), Field(), FieldLegend(), FieldSet(), fieldVariants, Input(), Label(), NativeSelect() (+4 more)

### Community 17 - "codex-provider.ts"
Cohesion: 0.13
Nodes (18): CODEX_DEVELOPER_INSTRUCTIONS, CODEX_MODEL, CODEX_REASONING_EFFORT, codexDecision(), Decision, DecisionDelta, DecisionSchema, readString() (+10 more)

### Community 18 - "SelectedFareCount"
Cohesion: 0.09
Nodes (25): Authored Nodes and Positional Props, ComparisonMatrix, ComparisonTable, Distinct Travel Catalog Primitives, Granular Component Semantics, ModeBreakdown, SelectedFareCount, SelectedItinerary (+17 more)

### Community 19 - "fare-data-bridge.ts"
Cohesion: 0.13
Nodes (19): BoundedFareFactSchema, DatasetFieldManifest, FareRow, apiRow, pageSource, request, coverageKey(), FarePage (+11 more)

### Community 20 - "ResultsPage.jsx"
Cohesion: 0.13
Nodes (17): sortTrips(), companyColors, dateSequence(), formatDate(), formatDuration(), formatPrice(), formatTime(), modeLabels (+9 more)

### Community 21 - "Native Recursive Present Tree"
Cohesion: 0.08
Nodes (24): PriceCalendar, RouteMap, SplitPane, Backendless assistant-ui Compiler, Host Raw-tree Validation, Native A Compatibility Evidence, Native Recursive Present Tree, AssistantChatTransport Snapshot Transform (+16 more)

### Community 22 - "worker-client.ts"
Cohesion: 0.16
Nodes (13): BoundedQueryResult, DatasetId, QueryIR, scalar, WorkerRequest, WorkerResponse, WorkerResponseSchema, QueryResource (+5 more)

### Community 23 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 24 - "check-shadcn.mjs"
Cohesion: 0.15
Nodes (20): assistantInteractiveParts, attributesOf(), componentsPath, interactiveRoles, isDirectShadcnAsChild(), isProductionSource(), jsxName(), location() (+12 more)

### Community 25 - "SearchForm.jsx"
Cohesion: 0.17
Nodes (16): editDistance(), isSubsequence(), LocationField(), handleKeyDown(), selectLocation(), normalizeText(), resolveLocation(), submit() (+8 more)

### Community 26 - "Acceptance Evidence"
Cohesion: 0.11
Nodes (20): Acceptance Evidence, API Pagination, Backend Commit b1c8912, Backend Test Suite, Browser Captures, Browser flow, Browser Flow Acceptance, Coverage Parser (+12 more)

### Community 27 - "App.jsx"
Cohesion: 0.19
Nodes (16): buildSearchUrl(), displayLocation(), getJson(), locationValue(), minutesFromDuration(), MODE_ORDER, modes, normalizeLocations() (+8 more)

### Community 28 - "planning-tracker.tsx"
Cohesion: 0.16
Nodes (14): Dialog(), DialogClose(), DialogContent(), DialogDescription(), DialogTitle(), DialogTrigger(), FareId, artifactIds() (+6 more)

### Community 29 - "Null-safe Query Predicates"
Cohesion: 0.12
Nodes (18): Benchmark Browser Module, Local Query Engine Benchmark Page, DuckDB NULL Semantics Documentation, Independent DuckDB Oracle, DuckDB Prepared Statements Documentation, Null-preserving Projection, Null-safe Query Predicates, Deterministic Null Sorting (+10 more)

### Community 30 - "request-schema.ts"
Cohesion: 0.15
Nodes (14): ErrorOutput, id, MessageSchema, parseChatRequest(), parseToolInput(), parseToolOutput(), PartSchema, RequestSchema (+6 more)

### Community 31 - "scripts"
Cohesion: 0.12
Nodes (17): scripts, agent:dev, benchmark:query, build, check:catalog, check:shadcn, dev, frontend:dev (+9 more)

### Community 32 - "LandingPage.jsx"
Cohesion: 0.19
Nodes (10): Icon(), paths, LandingPage(), offers, transportModes, Logo(), Badge(), badgeVariants (+2 more)

### Community 33 - "query-engine.ts"
Cohesion: 0.17
Nodes (13): AllowedFareField, DatasetRevision, DatasetRevisionSchema, compare(), defaults, executeQuery(), matches(), QueryLimits (+5 more)

### Community 34 - "browser-tools.ts"
Cohesion: 0.17
Nodes (12): DatasetIdSchema, DatasetManifestSchema, FareFieldSchema, LocalToolError, SummarizeFaresInputSchema, booleanFields, datasetId, fact() (+4 more)

### Community 35 - "scene-completion.test.ts"
Cohesion: 0.24
Nodes (13): handleChat(), ChatRequest, ack(), artifact, other, acceptTurn(), getAcceptedScenes(), ledger (+5 more)

### Community 36 - "devDependencies"
Cohesion: 0.13
Nodes (15): @assistant-ui/vite, devDependencies, @assistant-ui/vite, @types/node, @types/react, @types/react-dom, typescript, vite (+7 more)

### Community 37 - "run-state-proof.mjs"
Cohesion: 0.13
Nodes (12): /src/generative/data/fare-data-bridge.ts, /src/generative/state/persistence.ts, /src/generative/state/ui-state-store.ts, case0, errors, last, parts, requests (+4 more)

### Community 38 - "runtime-provider.tsx"
Cohesion: 0.15
Nodes (6): TravelProvider(), TravelServices, artifactId, GenerativeChatProps, services, ThreadShell()

### Community 39 - "summarize-fares.test.ts"
Cohesion: 0.17
Nodes (9): parseQuery(), UIStateStore, io, createBrowserTools(), artifactRef, coverage, fare(), fixture() (+1 more)

### Community 40 - "registration-lifecycle.test.ts"
Cohesion: 0.16
Nodes (4): deferred(), request, scenario(), createLocalQueryEngine()

### Community 41 - "present-boundary.tsx"
Cohesion: 0.24
Nodes (8): useTravelServices(), hasLaterAcceptedScene(), ScenePart, PresentBoundary(), Props, generative, library, prunePresentTree()

### Community 42 - "abortError"
Cohesion: 0.30
Nodes (8): load(), cancel(), finish(), abortError(), loadResource(), request(), cancel(), QueryWorker

### Community 43 - "verify_pasted_coverage.py"
Cohesion: 0.44
Nodes (11): check_database(), main(), normalized(), pair(), parse_dash_line(), parse_manifest(), parse_to_line(), Path (+3 more)

### Community 44 - "Contributing Guide"
Cohesion: 0.31
Nodes (11): Pull Request Template, Pull Request Branch Target, Pull Request Verification, Contributing Guide, Branch Naming Convention, dev Branch, Focused Pull Requests, Hotfix Branch (+3 more)

### Community 45 - "run.mjs"
Cohesion: 0.22
Nodes (7): agentPort, apiPort, children, env, start(), stop(), webPort

### Community 46 - "smart-planner-handoff.ts"
Cohesion: 0.27
Nodes (6): SearchForm(), completeSmartPlannerHandoff(), readSmartPlannerHandoff(), SmartPlannerHandoff, storeSmartPlannerHandoff(), search

### Community 47 - "MultiCityPlanGrid"
Cohesion: 0.33
Nodes (9): CityField, CitySequence, FadeFares, FareCalendar, FareOrder, MultiCityPlanGrid, StayDuration, TransportSelect (+1 more)

### Community 48 - "descriptors.ts"
Cohesion: 0.29
Nodes (5): descriptors, refs, hash, CATALOG_VERSION, ComponentDescriptor

### Community 49 - "query-engine/package.json"
Cohesion: 0.29
Nodes (6): dependencies, @duckdb/duckdb-wasm, name, private, type, @duckdb/duckdb-wasm

### Community 51 - "run-completion.mjs"
Cohesion: 0.29
Nodes (6): errors, last, requests, responses, started, timers

### Community 52 - "Repository Workflow"
Cohesion: 0.40
Nodes (5): Code Review Graph, Graph-Guided Source Verification, Graphify Knowledge Graph, Knowledge graphs, Repository Workflow

### Community 53 - "run.ts"
Cohesion: 0.33
Nodes (4): awaiting, completion, errors, measurements

### Community 54 - "Urban Travel Scene"
Cohesion: 0.40
Nodes (6): App Call-to-Action Background Illustration, Bus, Cityscape, Intermodal Mobility, Train, Urban Travel Scene

### Community 55 - "Transportation Landscape Hero"
Cohesion: 0.33
Nodes (6): Air Travel, Bus Travel, Ferry Travel, Multimodal Travel, Rail Travel, Transportation Landscape Hero

### Community 56 - "classic-search.test.tsx"
Cohesion: 0.40
Nodes (3): response(), summaries, trip()

### Community 58 - "location-catalog.ts"
Cohesion: 0.60
Nodes (3): loadLocationCatalog(), locationsSchema, selectLocations()

### Community 59 - "package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 60 - "Download on the Apple App Store Badge"
Cohesion: 0.40
Nodes (5): Apple App Store, Download on the Apple App Store Badge, Apple Logo, iOS App Download, Trusted Platform Acquisition

### Community 61 - "Omio Reference Assets"
Cohesion: 0.40
Nodes (4): Live Landing Page Asset Provenance, Mobile App Call-to-Action Assets, Non-Production Visual Reference Use, Omio Reference Assets

### Community 62 - "Three-process Development Launcher"
Cohesion: 0.50
Nodes (5): Loopback Service Binding, Model Agent Service, Python Fare API, Three-process Development Launcher, Vite Development Server

### Community 64 - "Signed-in Codex Provider Verification"
Cohesion: 0.40
Nodes (5): Signed-in Codex CLI Probe, Isolated Codex App-server Adapter, Shared Provider and Model Parity, Signed-in Codex Provider Verification, Server-owned Visible-turn Ledger

### Community 65 - "spike/toolkit.tsx"
Cohesion: 0.60
Nodes (3): SpikeCard(), SpikeSurface(), generative

### Community 67 - "DateWindow"
Cohesion: 0.50
Nodes (4): DateStrip, DateWindow, Inclusive Local Query Semantics, RetryAction

### Community 68 - "Huawei AppGallery Download Badge"
Cohesion: 0.50
Nodes (4): Huawei AppGallery Download Badge, Huawei AppGallery, Mobile App Download, Platform Distribution Call to Action

### Community 69 - "Machine-Readable Link"
Cohesion: 0.50
Nodes (4): Cross-Device Handoff, Machine-Readable Link, Mobile App Acquisition, Mobile App QR Code

### Community 70 - "Compass Icon"
Cohesion: 0.50
Nodes (4): Compass Icon, Directional Navigation, Explore Destinations, Travel Discovery

### Community 71 - "Dated Bus Journey Timeline"
Cohesion: 0.50
Nodes (4): Flixbus Fare Option, Dated Bus Journey Timeline, Schematic London to Paris Route, Desktop Blue Route Timeline Partial Stream

### Community 73 - "DuckDB WASM Engine"
Cohesion: 0.67
Nodes (4): DuckDB WASM Engine, Local Query Engine Benchmark, TypeScript Worker Engine, Top K Filter Group Join Correctness

### Community 74 - "Omio Travel Search Demo Page"
Cohesion: 0.67
Nodes (3): Multimodal Travel Search, Omio Travel Search Demo Page, React Application Entry

### Community 75 - "Google Play"
Cohesion: 0.67
Nodes (3): Android App Distribution, Google Play Download Badge, Google Play

### Community 76 - "Mobile Ticketing"
Cohesion: 1.00
Nodes (3): Mobile Ticketing, QR Code, Mobile Ticket QR Code Icon

### Community 77 - "Visual Scan Target"
Cohesion: 0.67
Nodes (3): QR Code Scanning, Scanner Frame, Visual Scan Target

### Community 78 - "Update and Refresh"
Cohesion: 0.67
Nodes (3): Synchronization, Update and Refresh, Updates Icon

### Community 79 - "Shared Catalog 1.0.0"
Cohesion: 1.00
Nodes (3): Catalog Safety Contract, Shared Catalog 1.0.0, Shared Catalog and Paused-stream Proof

### Community 80 - "Desktop Blue Fare Selection Completed Stream"
Cohesion: 0.67
Nodes (3): London to Paris Bus Option, Desktop Blue Fare Selection Completed Stream, Current Changes Stream Completion

### Community 81 - "London to Paris Bus Option"
Cohesion: 0.67
Nodes (3): London to Paris Bus Option, Desktop Blue Fare Selection Partial Stream, Cheapest Fastest and Selected Trip Summary

### Community 82 - "Mobile Blue Fare Selection Completed Stream"
Cohesion: 0.67
Nodes (3): Selected Bus Transport Filter, Mobile Blue Fare Selection Completed Stream, Current Changes Stream Completion

### Community 83 - "Stacked Mobile Travel View"
Cohesion: 0.67
Nodes (3): Mobile Blue Fare Selection Partial Stream, Stacked Mobile Travel View, Sticky Chat Composer Over Travel Content

### Community 84 - "Mobile Sand Fare Selection Partial Stream"
Cohesion: 0.67
Nodes (3): Sand and Green Travel Theme, Mobile Sand Fare Selection Partial Stream, Bus Fare and Selected Trip Interface

### Community 85 - "Mobile Sand Fare Selection Completed Stream"
Cohesion: 0.67
Nodes (3): Sand and Green Travel Theme, Mobile Sand Fare Selection Completed Stream, Current Changes Stream Completion

### Community 86 - "Seven Day Lowest Fare Selector"
Cohesion: 0.67
Nodes (3): Seven Day Lowest Fare Selector, Bus Mode and Lowest Price Controls, Desktop Blue Fare Comparison Completed Stream

### Community 87 - "Seven Day Lowest Fare Selector"
Cohesion: 0.67
Nodes (3): Seven Day Lowest Fare Selector, Mode Table and Price Journey Time Plot, Desktop Blue Fare Comparison Partial Stream

### Community 88 - "London to Paris Route Timeline"
Cohesion: 0.67
Nodes (3): London to Paris Route Timeline, Streamed Journey Story, Synthetic Fare Options

### Community 89 - "Local Fare Controls"
Cohesion: 0.67
Nodes (3): Cheapest and Fastest Summary, Local Fare Controls, Split Fare Comparison

### Community 90 - "Calendar First Fare Comparison"
Cohesion: 0.67
Nodes (3): Calendar First Fare Comparison, Local Refinement Controls, Mode and Duration Matrix

### Community 91 - "Journey Itinerary Timeline"
Cohesion: 0.67
Nodes (3): Journey Itinerary Timeline, London to Paris Route Map, Synthetic Total Per Passenger

### Community 92 - "Travel Choices"
Cohesion: 0.67
Nodes (3): Native Rendering Smoke Test, Train and Bus Options, Travel Choices

### Community 93 - "Per-leg Fare Selection"
Cohesion: 0.67
Nodes (3): London Paris Barcelona Multi-city Route, Per-leg Fare Selection, Sticky Synthetic Totals

### Community 94 - "Selected Bus Fare"
Cohesion: 0.67
Nodes (3): Persisted Fare View, Selected Bus Fare, Text-only State Summary

## Knowledge Gaps
- **480 isolated node(s):** `{decision}`, `servers`, `mocks`, `valid`, `DecisionSchema` (+475 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **52 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `FareDataBridge` connect `context.tsx` to `views/index.tsx`?**
  _High betweenness centrality (0.000) - this node is a cross-community bridge._
- **Why does `UIStateStore` connect `summarize-fares.test.ts` to `cityLabel`?**
  _High betweenness centrality (0.000) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `createUIStateStore()` (e.g. with `dispatch()` and `get()`) actually correct?**
  _`createUIStateStore()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `createActionRouter()` (e.g. with `.getManifest()` and `.load()`) actually correct?**
  _`createActionRouter()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `{decision}`, `servers`, `mocks` to the rest of the system?**
  _480 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `app.py` be split into smaller, more focused modules?**
  _Cohesion score 0.05851619644723093 - nodes in this community are weakly interconnected._
- **Should `snapshot-exporter.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06787330316742081 - nodes in this community are weakly interconnected._