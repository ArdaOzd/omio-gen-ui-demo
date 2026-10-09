# Graph Report - omio-gen-ui-demo  (2026-10-09)

## Corpus Check
- 311 files · ~1,148,975 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2307 nodes · 5453 edges · 151 communities (122 shown, 29 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 97 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `54e057e1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- thread-shell.tsx
- generate_db.py
- createUIStateStore
- query_groups.py
- query-groups.ts
- resource-loader.ts
- catalog.ts
- index.ts
- trip-planning/components.tsx
- scene-metadata.ts
- fixed-projection-fixture.ts
- snapshot-exporter.ts
- routes.tsx
- run-fare-selection-proof.mts
- context.tsx
- useDisplayNode
- compilerOptions
- runtime-provider.tsx
- request-schema.ts
- dependencies
- devDependencies
- ResultsPage.jsx
- component-functions.ts
- cityLabel
- createFareDataBridge
- chat-route.ts
- fare-data-bridge.ts
- contracts/display-context.ts
- browser.ts
- createDisplayContextStore
- DatasetId
- App.jsx
- components.json
- build-report.mjs
- check-shadcn.mjs
- LandingPage.jsx
- state/display-context.ts
- Acceptance Evidence
- Restored Artifact State
- Server-Driven Generative UI Implementation Plan
- Completed Server-Driven Implementation
- VisibleSentinelObserver
- app.py
- Null-safe Query Predicates
- scripts
- SearchForm.jsx
- FareCalendarView
- check.mjs
- run-state-proof.mjs
- action-router.ts
- query-engine-fixture.ts
- abortError
- BackendTestCase
- DisplayContextStore
- Fixed Projection Union
- window-retry.test.tsx
- createFixedProjectionFixture
- display-context.test.ts
- verify_pasted_coverage.py
- Contributing Guide
- Omio Generative UI Demo
- Fare Scope Manifest
- browser-tools.ts
- seeds.py
- Progressive Fare Strip
- run.mjs
- Milestones and commit boundaries
- Committed Display Ledger
- 49-Component Travel UI Vocabulary
- FareDataBridge
- controls/index.tsx
- Canonical Catalog Descriptor
- CheapestFastest Supplementary Comparison
- Responsive Mobile Fare Selection
- query-engine/package.json
- planning-tracker.tsx
- verify_database
- Repository Workflow
- run.ts
- Urban Travel Scene
- Transportation Landscape Hero
- package.json
- Download on the Apple App Store Badge
- Demo video recording and delivery
- run-query-benchmark.mjs
- tool-supersession.test.ts
- Isolated Codex App-server Adapter
- run-completion.mjs
- Huawei AppGallery Download Badge
- Machine-Readable Link
- Compass Icon
- views/index.tsx
- ArtifactIdSchema
- Native A compatibility evidence
- Desktop Right Planning Tracker
- DuckDB WASM Engine
- Omio Travel Search Demo Page
- Google Play
- Mobile Ticketing
- Visual Scan Target
- Update and Refresh
- spike/toolkit.tsx
- FareProjectionBridge
- run-live.mjs
- component.tsx
- InspectDisplayInput
- Selected Bus Fare
- live/README.md
- backend/__init__.py
- tree.ts
- Browser Selection and Deselection Proof
- No Saved State Migration or Reset
- run-browser-proof.mjs
- user-conversation/README.md
- playwright.config.ts
- install-graphify-hooks.sh
- test-graphify-hooks.sh
- vite.config.js
- Inclusive Local Query Semantics
- Bounded artifactRef Scalar
- Atomic Selection Status Region
- Native Renderer Selection Actions
- No Query Network or Model Turn
- Selected Fare Count Catalog Extension
- selectedFareIds Length Derivation
- Unresolved Artifact Fallback
- shadcn/ui MIT License
- persistence.ts
- ModelProcess
- tailwindcss
- query-engine.ts
- ai
- chat-sessions.spec.ts
- main.tsx
- Booking Ownership per Logical Trip Leg
- assertNoBulkData
- normalize-evidence.mjs
- capability-audit/run.mjs
- display-context-provider.tsx
- codex-provider.ts
- lucide-react

## God Nodes (most connected - your core abstractions)
1. `createUIStateStore()` - 60 edges
2. `ArtifactIdSchema` - 53 edges
3. `createFareDataBridge()` - 49 edges
4. `createFixedProjectionFixture()` - 47 edges
5. `createActionRouter()` - 37 edges
6. `useDisplayNode()` - 32 edges
7. `createDisplayContextStore()` - 32 edges
8. `usePublishDisplay()` - 28 edges
9. `cityLabel()` - 27 edges
10. `DatasetIdSchema` - 27 edges

## Surprising Connections (you probably didn't know these)
- `49-Component Travel UI Vocabulary` --semantically_similar_to--> `Component Function Registry`  [INFERRED] [semantically similar]
  src/generative/catalog/generated/catalog.md → docs/server-driven-generative-ui-implementation-plan.md
- `Pull Request Template` --semantically_similar_to--> `Contributing Guide`  [INFERRED] [semantically similar]
  .github/pull_request_template.md → CONTRIBUTING.md
- `Deterministic SQLite Fare Fixture` --semantically_similar_to--> `Deterministic Synthetic Timetable`  [INFERRED] [semantically similar]
  README.md → backend/README.md
- `Source-Scoped Fare Lookup Endpoint` --implements--> `Source-Bound Selected Fare Pins`  [INFERRED]
  backend/README.md → docs/server-driven-generative-ui-implementation-plan.md
- `handleChat()` --calls--> `assertNoBulkData()`  [EXTRACTED]
  agent/chat-route.ts → src/generative/contracts/privacy.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Catalog Trip Planning State** — src_generative_catalog_generated_catalog_multi_city_plan_grid, src_generative_catalog_generated_catalog_stable_leg_identity, src_generative_catalog_generated_catalog_local_filter_controls, src_generative_catalog_generated_catalog_planning_tracker [EXTRACTED 1.00]
- **Committed Display Evidence Flow** — docs_server_driven_generative_ui_implementation_plan_display_ledger, docs_server_driven_generative_ui_implementation_plan_immutable_display_inspection, docs_server_driven_generative_ui_implementation_plan_context_privacy_budget, docs_server_driven_generative_ui_implementation_plan_source_bound_pins, docs_server_driven_generative_ui_implementation_plan_immutable_fare_strip_page_publishers, docs_server_driven_generative_ui_implementation_plan_aggregate_fare_strip_publisher [EXTRACTED 1.00]
- **Creative Layout Guidance and Proof** — docs_server_driven_generative_ui_implementation_plan_recursive_layout_catalog, docs_server_driven_generative_ui_implementation_plan_six_task_shaped_composition_patterns, docs_server_driven_generative_ui_implementation_plan_exact_artifact_dataset_leg_connections, docs_server_driven_generative_ui_implementation_plan_genuine_creative_agent_smoke, docs_server_driven_generative_ui_implementation_plan_creative_smoke_selected_layouts [EXTRACTED 1.00]
- **Dual-Graph Repository Analysis** — agents_repository_workflow, agents_code_review_graph, agents_graphify_knowledge_graph, agents_graph_guided_source_verification [EXTRACTED 1.00]
- **Fixed Query Execution Flow** — docs_server_driven_generative_ui_implementation_plan_component_function_registry, docs_server_driven_generative_ui_implementation_plan_batching_query_coordinator, docs_server_driven_generative_ui_implementation_plan_server_executed_fixed_queries, backend_readme_fixed_projection_union [EXTRACTED 1.00]
- **Query Engine Benchmark Engines and Workloads** — verification_generative_ui_query_engine_2026_10_02_local_query_engine_benchmark, verification_generative_ui_query_engine_2026_10_02_typescript_worker_engine, verification_generative_ui_query_engine_2026_10_02_duckdb_wasm_engine, verification_generative_ui_query_engine_2026_10_02_workload_correctness [EXTRACTED 1.00]
- **Selection Persistence Proof** — verification_generative_ui_state_proof_result_persisted_fare_view, verification_generative_ui_state_proof_result_selected_bus_fare, verification_generative_ui_state_proof_result_text_only_state_summary [EXTRACTED 1.00]
- **Acceptance Verification Layers** — verification_acceptance_database_source_coverage, verification_acceptance_http_api_acceptance, verification_acceptance_browser_flow_acceptance [EXTRACTED 1.00]
- **Source Coverage Contract Verification** — verification_acceptance_generated_sqlite_database, verification_acceptance_coverage_parser, verification_acceptance_backend_test_suite, verification_acceptance_source_contract [EXTRACTED 1.00]
- **App Call-to-Action Intermodal Scene** — public_assets_omio_app_background_app_cta_background, public_assets_omio_app_background_urban_travel_scene, public_assets_omio_app_background_bus, public_assets_omio_app_background_train, public_assets_omio_app_background_cityscape [INFERRED 0.75]
- **Multimodal Passenger Transport** — public_assets_omio_hero_air_travel, public_assets_omio_hero_rail_travel, public_assets_omio_hero_bus_travel, public_assets_omio_hero_ferry_travel [INFERRED 0.85]
- **Query Semantics and Engine Boundary** — docs_decisions_query_null_semantics_null_safe_predicates, docs_decisions_query_null_semantics_duckdb_oracle, verification_generative_ui_query_engine_2026_10_02_validated_queryir_boundary, verification_generative_ui_query_engine_2026_10_02_typescript_module_worker [INFERRED 0.85]

## Communities (151 total, 29 thin omitted)

### Community 0 - "thread-shell.tsx"
Cohesion: 0.13
Nodes (8): Textarea(), assistantWorkingPuns, AssistantWorkingStatus(), defaultSuggestions, partComponents, randomPunIndex(), services, ThreadShell()

### Community 1 - "generate_db.py"
Cohesion: 0.14
Nodes (19): _batched(), _cell_weight(), _dates(), _direction(), directional_routes(), DirectionalLeg, DirectionalRoute, _fare_noise() (+11 more)

### Community 2 - "createUIStateStore"
Cohesion: 0.04
Nodes (59): TravelServices, renderFareCards(), artifactId, fixture(), rows, scene, setup(), TestNode (+51 more)

### Community 3 - "query_groups.py"
Cohesion: 0.10
Nodes (53): dispatch_post(), _available_date_window(), _calendar_days(), _canonical(), _carrier_facets(), _company_ids(), _cursor_hash(), _cursor_predicate() (+45 more)

### Community 4 - "query-groups.ts"
Cohesion: 0.03
Nodes (59): artifactId, CalendarDaysRequestSchema, CalendarDaysResultSchema, CarrierFacetsRequestSchema, CarrierFacetsResultSchema, datasetId, datasetRevision, date (+51 more)

### Community 5 - "resource-loader.ts"
Cohesion: 0.14
Nodes (15): CoverageRequest, coverageKey(), FarePage, LoadedResource, loadResource(), PageInput, PageSource, stableRef() (+7 more)

### Community 6 - "catalog.ts"
Cohesion: 0.19
Nodes (11): catalogDescriptors, catalogHash, catalogVersion, componentNames, legBoundPropsSchema, sharedPropsSchema, datasetBoundComponentNames, presentationPrompt (+3 more)

### Community 7 - "index.ts"
Cohesion: 0.05
Nodes (45): descriptors, legRefs, refs, hash, AgentContextEnvelopeSchema, AgentSelectionPatchSchema, BookingOwnership, CATALOG_VERSION (+37 more)

### Community 8 - "trip-planning/components.tsx"
Cohesion: 0.09
Nodes (30): DropdownMenu(), DropdownMenuCheckboxItem(), DropdownMenuContent(), DropdownMenuTrigger(), useItineraryPlan(), CityField(), defaultLegSort, FadeFares() (+22 more)

### Community 9 - "scene-metadata.ts"
Cohesion: 0.13
Nodes (11): PresentScopeArtifact, PresentScopeDataset, context, datasets, ComponentBinding, PresentNode, PresentValidationScope, ActiveScene (+3 more)

### Community 10 - "fixed-projection-fixture.ts"
Cohesion: 0.08
Nodes (23): FareLeg, filters, named, scope, dates(), fare(), fixture(), clone() (+15 more)

### Community 11 - "snapshot-exporter.ts"
Cohesion: 0.13
Nodes (26): request(), AgentContextEnvelope, CompactArtifactSnapshot, OlderArtifactSummary, LookupPin, addMinutes(), bindingFor(), captureAgentContext() (+18 more)

### Community 12 - "routes.tsx"
Cohesion: 0.13
Nodes (24): HISTORY_LIMITS, createSessionSummary(), orderedSessions(), readSessionHistory(), SessionHistory, SessionHistorySchema, SessionSummary, SessionSummarySchema (+16 more)

### Community 13 - "run-fare-selection-proof.mts"
Cohesion: 0.12
Nodes (15): ArtifactUIStateSchema, ApiFare, CanonicalFare, cheapestCandidates, fareDateTime(), fastestCandidates, matchDisplayedFare(), money() (+7 more)

### Community 14 - "context.tsx"
Cohesion: 0.09
Nodes (27): addMinutes(), bindingCandidates(), CalendarDaysResult, CarrierFacetsResult, ComponentQueryOptions, ComponentQueryResult, defaultSort, FareHighlightsResult (+19 more)

### Community 15 - "useDisplayNode"
Cohesion: 0.32
Nodes (17): useTravelAction(), CarrierControl(), Control(), recordDisplayInteraction(), useDisplayNode(), usePublishDisplay(), Layout(), Status() (+9 more)

### Community 16 - "compilerOptions"
Cohesion: 0.06
Nodes (30): agent, benchmarks/query-engine, *.config.ts, DOM, DOM.Iterable, ES2022, node, src (+22 more)

### Community 17 - "runtime-provider.tsx"
Cohesion: 0.23
Nodes (7): normalizeToolContinuations(), exportedMessages(), GenerativeChat(), GenerativeChatProps, isUIMessage(), LocalToolStatus(), SceneLifecycle

### Community 18 - "request-schema.ts"
Cohesion: 0.08
Nodes (26): {decision}, servers, CODEX_MODEL, CODEX_REASONING_EFFORT, date, ErrorOutput, id, MessageSchema (+18 more)

### Community 19 - "dependencies"
Cohesion: 0.07
Nodes (29): @ai-sdk/react, assistant-stream, @assistant-ui/ai-sdk, @assistant-ui/react, @assistant-ui/react-generative-ui, class-variance-authority, cn, dependencies (+21 more)

### Community 20 - "devDependencies"
Cohesion: 0.06
Nodes (31): @assistant-ui/vite, jsdom, devDependencies, @assistant-ui/vite, jsdom, @playwright/test, @testing-library/dom, @testing-library/jest-dom (+23 more)

### Community 21 - "ResultsPage.jsx"
Cohesion: 0.10
Nodes (23): sortTrips(), companyColors, dateSequence(), formatDate(), formatDuration(), formatPrice(), formatTime(), modeLabels (+15 more)

### Community 22 - "component-functions.ts"
Cohesion: 0.22
Nodes (5): CatalogComponentName, ComponentFunctionDeclaration, componentFunctions, none, ComponentFunction

### Community 23 - "cityLabel"
Cohesion: 0.22
Nodes (30): PendingQueryProbe(), carrierLabel(), cityLabel(), departure(), duration(), money(), useModeStats(), useOrderedFares() (+22 more)

### Community 24 - "createFareDataBridge"
Cohesion: 0.06
Nodes (46): ProjectionRequestSchema, ProjectionResultSnapshot, ProjectionResultSnapshotSchema, QueryExecutionState, QueryIntentIdentity, ResultKey, createFareDataBridge(), assertActive() (+38 more)

### Community 25 - "chat-route.ts"
Cohesion: 0.16
Nodes (19): handleChat(), loadLocationCatalog(), locationsSchema, selectLocations(), createAgentPresentValidationScope(), ChatRequest, parseToolInput(), ack() (+11 more)

### Community 26 - "fare-data-bridge.ts"
Cohesion: 0.05
Nodes (51): artifactId, scope, items, renderSelector(), scope, selectorItems, DatasetIdSchema, DatasetRevision (+43 more)

### Community 27 - "contracts/display-context.ts"
Cohesion: 0.08
Nodes (24): boundedFact, ComponentRefSchema, componentRefValue, date, DisplayCell, displayCells, DisplayCellSchema, DisplayPayload (+16 more)

### Community 28 - "browser.ts"
Cohesion: 0.14
Nodes (21): base, benchmarkRows(), csvRows(), expected(), id, longTasks, Metric, percentile() (+13 more)

### Community 29 - "createDisplayContextStore"
Cohesion: 0.20
Nodes (7): DisplayLedgerEntry, DisplayVisibility, emptyContext(), FrozenScene(), clone(), createDisplayContextStore(), displayFareIds()

### Community 30 - "DatasetId"
Cohesion: 0.15
Nodes (14): BoundedQueryResult, DatasetId, DatasetRevisionSchema, QueryIR, scalar, WorkerRequest, WorkerResponse, WorkerResponseSchema (+6 more)

### Community 31 - "App.jsx"
Cohesion: 0.12
Nodes (22): buildSearchUrl(), displayLocation(), getJson(), locationValue(), minutesFromDuration(), MODE_ORDER, modes, normalizeLocations() (+14 more)

### Community 32 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 33 - "build-report.mjs"
Cohesion: 0.08
Nodes (35): attemptLabel(), attemptsMarkup(), auditRoot, blockingFailure(), cases, cleanRun(), componentRanking, components (+27 more)

### Community 34 - "check-shadcn.mjs"
Cohesion: 0.15
Nodes (20): assistantInteractiveParts, attributesOf(), componentsPath, interactiveRoles, isDirectShadcnAsChild(), isProductionSource(), jsxName(), location() (+12 more)

### Community 35 - "LandingPage.jsx"
Cohesion: 0.19
Nodes (10): Icon(), paths, LandingPage(), offers, transportModes, Logo(), Badge(), badgeVariants (+2 more)

### Community 36 - "state/display-context.ts"
Cohesion: 0.11
Nodes (18): DISPLAY_CONTEXT_VERSION, DISPLAY_LIMITS, DisplayedFareFact, DisplayedFareFactSchema, DisplayLedgerEntrySchema, DisplayRepresentationSchema, FrozenDisplayContextSchema, SemanticInteractionSchema (+10 more)

### Community 37 - "Acceptance Evidence"
Cohesion: 0.11
Nodes (20): Acceptance Evidence, API Pagination, Backend Commit b1c8912, Backend Test Suite, Browser Captures, Browser flow, Browser Flow Acceptance, Coverage Parser (+12 more)

### Community 38 - "Restored Artifact State"
Cohesion: 0.40
Nodes (5): Atomic Next-request Snapshot, Autosave Regression Fix, Replacement Request Cancellation, Restored Artifact State, State Continuity Browser Proof

### Community 39 - "Server-Driven Generative UI Implementation Plan"
Cohesion: 0.10
Nodes (21): Acceptance criteria, Authoritative current state — 2026-10-08, Caller view, Component Function Registry, 49-Component Catalog Vocabulary, Contract sketch, Display ledger and next-turn context, Fixed server projections (+13 more)

### Community 40 - "Completed Server-Driven Implementation"
Cohesion: 0.22
Nodes (10): Use a Clean Managed Worktree, Completed Server-Driven Implementation, Genuine Creative Composition Agent Smoke, Ownership-Aware Cross-Message Supersession, Do Not Merge or Mutate Dev, Review Branch Only Push Boundary, Sanitized Invalid Historical Scene, Use One Commit Steward (+2 more)

### Community 42 - "app.py"
Cohesion: 0.22
Nodes (22): ApiError, _connect(), dispatch(), get_locations(), get_metadata(), _location_id(), main(), make_handler() (+14 more)

### Community 43 - "Null-safe Query Predicates"
Cohesion: 0.12
Nodes (18): Benchmark Browser Module, Local Query Engine Benchmark Page, DuckDB NULL Semantics Documentation, Independent DuckDB Oracle, DuckDB Prepared Statements Documentation, Null-preserving Projection, Null-safe Query Predicates, Deterministic Null Sorting (+10 more)

### Community 44 - "scripts"
Cohesion: 0.10
Nodes (20): scripts, agent:dev, audit:capabilities, benchmark:query, build, check:capability-report, check:catalog, check:shadcn (+12 more)

### Community 45 - "SearchForm.jsx"
Cohesion: 0.13
Nodes (18): editDistance(), isSubsequence(), LocationField(), handleKeyDown(), selectLocation(), normalizeText(), resolveLocation(), SearchForm() (+10 more)

### Community 46 - "FareCalendarView"
Cohesion: 0.15
Nodes (15): committedDatasetId(), committedResultKey(), currentResultKey(), useCalendarDays(), useDayFares(), useFareDayRepresentatives(), useFareHighlights(), useFareRows() (+7 more)

### Community 47 - "check.mjs"
Cohesion: 0.08
Nodes (19): analyticalOrder, auditRoot, evidenceRoot, expectedVoteOrder, final, interactionCards, interactionDom, manifest (+11 more)

### Community 48 - "run-state-proof.mjs"
Cohesion: 0.13
Nodes (12): /src/generative/data/fare-data-bridge.ts, /src/generative/state/persistence.ts, /src/generative/state/ui-state-store.ts, case0, errors, last, parts, requests (+4 more)

### Community 49 - "action-router.ts"
Cohesion: 0.08
Nodes (44): datasetBoundComponents, legBoundPlannerComponents, resolvePlannerDatasetRef(), ArtifactId, ArtifactUIState, BoundedFareFact, Coverage, UIStateStore (+36 more)

### Community 50 - "query-engine-fixture.ts"
Cohesion: 0.16
Nodes (10): CONTRACT_VERSION, DatasetManifest, DatasetManifestSchema, FareRowSchema, rows, fixture(), rows, boolean (+2 more)

### Community 51 - "abortError"
Cohesion: 0.36
Nodes (5): abortError(), receive(), request(), cancel(), QueryWorker

### Community 52 - "BackendTestCase"
Cohesion: 0.15
Nodes (10): _date_value(), _fail(), _integer(), _one(), parse_search_query(), Never, search(), SearchQuery (+2 more)

### Community 53 - "DisplayContextStore"
Cohesion: 0.15
Nodes (5): FrozenDisplayContext, InputProvenance, SemanticInteraction, QueryGroupScope, DisplayContextStore

### Community 54 - "Fixed Projection Union"
Cohesion: 0.17
Nodes (13): Fixed Projection Union, Query Groups Endpoint, Source-Bound Opaque Cursors, Batching Query Coordinator, Combined Tradeoff Dashboard Pattern, Delete Browser Bulk Preload, Fixed Projection Boundary, Preserve Classic Search API (+5 more)

### Community 55 - "window-retry.test.tsx"
Cohesion: 0.40
Nodes (3): binding(), id, scope()

### Community 56 - "createFixedProjectionFixture"
Cohesion: 0.07
Nodes (28): artifactId, setup(), CatalogNode(), TravelProvider(), artifactId, loadedBridge(), retryFailureBridge(), rows (+20 more)

### Community 57 - "display-context.test.ts"
Cohesion: 0.20
Nodes (6): ComponentIdentitySchema, QueryGroupScopeSchema, DisplayInspectionError, connectedFact(), fact(), inspectionItems

### Community 58 - "verify_pasted_coverage.py"
Cohesion: 0.44
Nodes (11): check_database(), main(), normalized(), pair(), parse_dash_line(), parse_manifest(), parse_to_line(), Path (+3 more)

### Community 59 - "Contributing Guide"
Cohesion: 0.31
Nodes (11): Pull Request Template, Pull Request Branch Target, Pull Request Verification, Contributing Guide, Branch Naming Convention, dev Branch, Focused Pull Requests, Hotfix Branch (+3 more)

### Community 60 - "Omio Generative UI Demo"
Cohesion: 0.22
Nodes (10): Deterministic Synthetic Timetable, Source-Scoped Fare Lookup Endpoint, Preserved Version 2 Fixture Policy, Synthetic Timetable Backend, Deterministic SQLite Fare Fixture, Local Signed-In Codex Model Agent, Native React Component Composition, Omio Generative UI Demo (+2 more)

### Community 61 - "Fare Scope Manifest"
Cohesion: 0.40
Nodes (5): Fare Scope Manifest, Journey Review Pattern, Normalize Shifted Fare Scope Threshold, Bounded Ordered Route Legs, Stable Logical Scope Identity

### Community 62 - "browser-tools.ts"
Cohesion: 0.22
Nodes (10): InspectDisplayInputSchema, InspectDisplayOutputSchema, EditArtifactInputSchema, UICommandPatchSchema, UIStateRevision, BrowserDispatch, commandInputFields(), completeCommand() (+2 more)

### Community 63 - "seeds.py"
Cohesion: 0.29
Nodes (17): _access_leg(), _all_routes(), _companies_for(), _coverage_legs(), distance_km(), _dominant_leg(), _dominant_mode(), _flight_legs() (+9 more)

### Community 64 - "Progressive Fare Strip"
Cohesion: 0.24
Nodes (10): Bounded Vertical Fare Viewport, Corrected Vertical Progressive FadeFares Semantics, Deterministic Booking Workflow Fixtures, Deterministic Fixture Acceptance, Direct Trip Planning Fixture, Explicit Retry for Failed Fare Append, Keep Calendar Pagination Separate, Progressive Fare Strip (+2 more)

### Community 65 - "run.mjs"
Cohesion: 0.22
Nodes (7): agentPort, apiPort, children, env, start(), stop(), webPort

### Community 66 - "Milestones and commit boundaries"
Cohesion: 0.22
Nodes (9): 0. Preserve the clean base and journal, 1. Prove fixed SQL projections, 2. Add query contracts, client, and coordinator, 3. Bind catalog components to semantic functions, 4. Add the display ledger and inspection capture, 5. Migrate the generative runtime and delete bulk preload, 6. Prove the first user-test render, 7. Refresh graphs and hand off (+1 more)

### Community 67 - "Committed Display Ledger"
Cohesion: 0.28
Nodes (9): Aggregate Fare Strip Publisher, Next-Turn Context Privacy Budget, Decouple Browsing Depth from Context Budget, Committed Display Ledger, Immutable Bounded Display Inspection, Immutable Fare Strip Page Publishers, Preserve Page Identity During Progressive Append, Separate Desired Intent from Committed Display (+1 more)

### Community 68 - "49-Component Travel UI Vocabulary"
Cohesion: 0.29
Nodes (7): Child-Accepting Layout Containers, 49-Component Travel UI Vocabulary, Local Fare Filter Controls, MultiCityPlanGrid, Shared PlanningTracker Selection, Shared Catalog 1.1.0, Stable Logical Leg Identity

### Community 70 - "controls/index.tsx"
Cohesion: 0.09
Nodes (15): Checkbox(), Field(), FieldGroup(), FieldLegend(), FieldSet(), fieldVariants, Input(), Label() (+7 more)

### Community 71 - "Canonical Catalog Descriptor"
Cohesion: 0.25
Nodes (8): Authored Nodes and Positional Props, Distinct Travel Catalog Primitives, Granular Component Semantics, Catalog Version 1.0.0, Canonical Catalog Descriptor, Generated Schemas and Model Documentation, Expanded Vocabulary Manifest Hash, Native Compiler-valid Toolkit

### Community 72 - "CheapestFastest Supplementary Comparison"
Cohesion: 0.32
Nodes (8): CheapestFastest Supplementary Comparison, Complete Editable Booking Pattern, Agent-Selected Split Stack Section Grid and Sticky Layouts, MultiCityPlanGrid All-Leg Booking Owner, Preserve Supplementary Comparisons, Shared Selected-Fare PlanningTracker, StickySummary Is Not PlanningTracker, Supplementary Non-Owner Views

### Community 73 - "Responsive Mobile Fare Selection"
Cohesion: 0.25
Nodes (8): Desktop Fare Selection Proof, Selected Fastest Flight, Selection and Tracker Consistency, Unselected Cheapest Bus, Responsive Mobile Fare Selection, Responsive Selection Continuity, Stacked Mobile Fare Cards, Stacked Mobile Planning Tracker

### Community 74 - "query-engine/package.json"
Cohesion: 0.29
Nodes (6): dependencies, @duckdb/duckdb-wasm, name, private, type, @duckdb/duckdb-wasm

### Community 75 - "planning-tracker.tsx"
Cohesion: 0.12
Nodes (9): Card(), Dialog(), DialogClose(), DialogContent(), DialogDescription(), DialogTitle(), DialogTrigger(), PlannedFare (+1 more)

### Community 76 - "verify_database"
Cohesion: 0.23
Nodes (7): VerifierContractTests, _distance_km(), main(), Path, Verify the current synthetic timetable database and its coverage contract., _require(), verify_database()

### Community 77 - "Repository Workflow"
Cohesion: 0.40
Nodes (5): Code Review Graph, Graph-Guided Source Verification, Graphify Knowledge Graph, Knowledge graphs, Repository Workflow

### Community 78 - "run.ts"
Cohesion: 0.33
Nodes (4): awaiting, completion, errors, measurements

### Community 79 - "Urban Travel Scene"
Cohesion: 0.40
Nodes (6): App Call-to-Action Background Illustration, Bus, Cityscape, Intermodal Mobility, Train, Urban Travel Scene

### Community 80 - "Transportation Landscape Hero"
Cohesion: 0.33
Nodes (6): Air Travel, Bus Travel, Ferry Travel, Multimodal Travel, Rail Travel, Transportation Landscape Hero

### Community 82 - "package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 83 - "Download on the Apple App Store Badge"
Cohesion: 0.40
Nodes (5): Apple App Store, Download on the Apple App Store Badge, Apple Logo, iOS App Download, Trusted Platform Acquisition

### Community 84 - "Demo video recording and delivery"
Cohesion: 0.17
Nodes (10): Delivery options, Demo video recording and delivery, Gmail draft, Project publication status, Recommendation, Recording plan for this demo, Live Landing Page Asset Provenance, Mobile App Call-to-Action Assets (+2 more)

### Community 86 - "tool-supersession.test.ts"
Cohesion: 0.28
Nodes (4): hasLaterAcceptedScene(), ScenePart, SceneReplacementPredicate, Claim

### Community 87 - "Isolated Codex App-server Adapter"
Cohesion: 0.50
Nodes (4): Isolated Codex App-server Adapter, Shared Provider and Model Parity, Signed-in Codex Provider Verification, Server-owned Visible-turn Ledger

### Community 88 - "run-completion.mjs"
Cohesion: 0.29
Nodes (6): errors, last, requests, responses, started, timers

### Community 90 - "Huawei AppGallery Download Badge"
Cohesion: 0.50
Nodes (4): Huawei AppGallery Download Badge, Huawei AppGallery, Mobile App Download, Platform Distribution Call to Action

### Community 91 - "Machine-Readable Link"
Cohesion: 0.50
Nodes (4): Cross-Device Handoff, Machine-Readable Link, Mobile App Acquisition, Mobile App QR Code

### Community 92 - "Compass Icon"
Cohesion: 0.50
Nodes (4): Compass Icon, Directional Navigation, Explore Destinations, Travel Discovery

### Community 94 - "views/index.tsx"
Cohesion: 0.15
Nodes (20): Table(), TableBody(), TableCaption(), TableCell(), TableHead(), TableHeader(), TableRow(), QueryFareSelectionSource (+12 more)

### Community 95 - "ArtifactIdSchema"
Cohesion: 0.07
Nodes (24): artifactId, otherId, artifactId, fare(), fixedRows(), scopeDates(), ArtifactIdSchema, artifactId (+16 more)

### Community 96 - "Native A compatibility evidence"
Cohesion: 0.33
Nodes (5): Commands, Native A compatibility evidence, Observed API boundaries, Provider probe, Shared catalog and paused-stream proof

### Community 97 - "Desktop Right Planning Tracker"
Cohesion: 0.50
Nodes (4): Cheapest and Fastest Fare Comparison, Demo Purchase Action, Desktop Right Planning Tracker, Selected Fare Purchase State

### Community 98 - "DuckDB WASM Engine"
Cohesion: 0.67
Nodes (4): DuckDB WASM Engine, Local Query Engine Benchmark, TypeScript Worker Engine, Top K Filter Group Join Correctness

### Community 99 - "Omio Travel Search Demo Page"
Cohesion: 0.67
Nodes (3): Multimodal Travel Search, Omio Travel Search Demo Page, React Application Entry

### Community 100 - "Google Play"
Cohesion: 0.67
Nodes (3): Android App Distribution, Google Play Download Badge, Google Play

### Community 101 - "Mobile Ticketing"
Cohesion: 1.00
Nodes (3): Mobile Ticketing, QR Code, Mobile Ticket QR Code Icon

### Community 102 - "Visual Scan Target"
Cohesion: 0.67
Nodes (3): QR Code Scanning, Scanner Frame, Visual Scan Target

### Community 103 - "Update and Refresh"
Cohesion: 0.67
Nodes (3): Synchronization, Update and Refresh, Updates Icon

### Community 105 - "spike/toolkit.tsx"
Cohesion: 0.60
Nodes (3): SpikeCard(), SpikeSurface(), generative

### Community 108 - "component.tsx"
Cohesion: 0.15
Nodes (15): Alert(), alertVariants, Skeleton(), ArtifactErrorBoundary, controls, layouts, statuses, SubscribedCatalogNode() (+7 more)

### Community 111 - "Selected Bus Fare"
Cohesion: 0.67
Nodes (3): Persisted Fare View, Selected Bus Fare, Text-only State Summary

### Community 114 - "tree.ts"
Cohesion: 0.07
Nodes (40): keys, names, scalarLimit(), scalars, scope, validatePresentPrefix(), useTravelServices(), nodePropsSchema (+32 more)

### Community 140 - "persistence.ts"
Cohesion: 0.09
Nodes (28): FareScopeSchema, addChangedFare(), artifactRecords, createThreadPersistence(), descriptor, fareMatchesScope(), hydrateRestoredSelections(), legacyChangedFareIdsByArtifact() (+20 more)

### Community 144 - "query-engine.ts"
Cohesion: 0.16
Nodes (13): AllowedFareField, FareRow, PredicateTree, compare(), defaults, executeQuery(), matches(), QueryLimits (+5 more)

### Community 146 - "chat-sessions.spec.ts"
Cohesion: 0.20
Nodes (17): alpha, beta, dataStream(), fareRows(), fixtureForScope(), label(), matchingRows(), mockFareApi() (+9 more)

### Community 147 - "main.tsx"
Cohesion: 0.17
Nodes (11): App(), artifactId, bridge, input, requests, resume(), root, scenes (+3 more)

### Community 150 - "Booking Ownership per Logical Trip Leg"
Cohesion: 0.18
Nodes (13): Authoritative Current State, Booking Ownership per Logical Trip Leg, Complete Flexible-Dates Pattern, Complete Present Booking-Ownership Validator, Exact Artifact Dataset and Leg Connections, Exact-Once Booking-Leg Coverage, FareCalendar Bound-Leg Booking Owner, Focused Fare Discovery Pattern (+5 more)

### Community 151 - "assertNoBulkData"
Cohesion: 0.18
Nodes (15): currentMessage(), fits(), olderMessage(), projectNetworkHistory(), splitText(), context(), prepared(), createSnapshotTransport() (+7 more)

### Community 152 - "normalize-evidence.mjs"
Cohesion: 0.12
Nodes (12): args, byId, byPrompt, inputs, labelIndex, manifest, output, outputIndex (+4 more)

### Community 153 - "capability-audit/run.mjs"
Cohesion: 0.17
Nodes (10): args, manifest, manifestPath, output, readLatestThread(), requested, root, summary (+2 more)

### Community 158 - "display-context-provider.tsx"
Cohesion: 0.14
Nodes (17): DisplayContextProvider(), DisplayNodeProvider(), DisplayVisibilityProvider(), inspectionSource(), NodeContext, PublishDisplayInput, StoreContext, PublishingChild() (+9 more)

### Community 160 - "codex-provider.ts"
Cohesion: 0.16
Nodes (14): CODEX_DEVELOPER_INSTRUCTIONS, codexDecision(), Decision, DecisionDelta, DecisionSchema, readString(), mocks, valid (+6 more)

## Knowledge Gaps
- **703 isolated node(s):** `{decision}`, `servers`, `mocks`, `valid`, `DecisionSchema` (+698 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createFareDataBridge()` connect `createFareDataBridge` to `thread-shell.tsx`, `createUIStateStore`, `query-groups.ts`, `fixed-projection-fixture.ts`, `snapshot-exporter.ts`, `routes.tsx`, `context.tsx`, `request-schema.ts`, `main.tsx`, `createFixedProjectionFixture`, `chat-route.ts`, `fare-data-bridge.ts`, `browser.ts`, `ArtifactIdSchema`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `createUIStateStore()` connect `createUIStateStore` to `thread-shell.tsx`, `fixed-projection-fixture.ts`, `snapshot-exporter.ts`, `routes.tsx`, `persistence.ts`, `context.tsx`, `action-router.ts`, `request-schema.ts`, `main.tsx`, `window-retry.test.tsx`, `createFixedProjectionFixture`, `chat-route.ts`, `fare-data-bridge.ts`, `ArtifactIdSchema`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `UIStateStore` connect `action-router.ts` to `createUIStateStore`, `index.ts`, `snapshot-exporter.ts`, `persistence.ts`, `context.tsx`, `useDisplayNode`, `browser-tools.ts`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `createUIStateStore()` (e.g. with `dispatch()` and `get()`) actually correct?**
  _`createUIStateStore()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `createFareDataBridge()` (e.g. with `executeGroup()` and `findBinding()`) actually correct?**
  _`createFareDataBridge()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `createActionRouter()` (e.g. with `.dispatch()` and `.get()`) actually correct?**
  _`createActionRouter()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `{decision}`, `servers`, `mocks` to the rest of the system?**
  _703 weakly-connected nodes found - possible documentation gaps or missing edges._