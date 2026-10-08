# Graph Report - omio-gen-ui-demo  (2026-10-08)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2043 nodes · 4773 edges · 155 communities (127 shown, 28 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 114 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0adff653`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- app.py
- query_groups.py
- routes.tsx
- createUIStateStore
- trip-planning/components.tsx
- query-groups.ts
- index.ts
- cityLabel
- action-router.ts
- LandingPage.jsx
- compilerOptions
- dependencies
- devDependencies
- server-query-client.ts
- context.tsx
- fare-data-bridge.ts
- assertNoBulkData
- contracts/display-context.ts
- snapshot-exporter.ts
- projection-coordinator.ts
- codex-provider.ts
- ResultsPage.jsx
- browser.ts
- useDisplayNode
- controls/index.tsx
- projection-coordinator.test.ts
- components.json
- createFareDataBridge
- check-shadcn.mjs
- App.jsx
- display-context-provider.tsx
- state/display-context.ts
- query-engine.ts
- Acceptance Evidence
- Native Recursive Present Tree
- chat-route.ts
- views/index.tsx
- present-boundary.tsx
- Server-Driven Generative UI Implementation Plan
- thread-shell.tsx
- planning-tracker.tsx
- itinerary-schedule.ts
- createWorkerQueryEngine
- persistence.ts
- browser-tools.ts
- Null-safe Query Predicates
- runtime-provider.tsx
- fixed-projection-fixture.ts
- scripts
- ArtifactIdSchema
- tree.ts
- request-schema.ts
- run-state-proof.mjs
- ui-state-store.ts
- query-engine-fixture.ts
- fare-pagination.test.tsx
- request-schema.test.ts
- catalog.ts
- chat-sessions.spec.ts
- main.tsx
- SearchForm.jsx
- DisplayContextStore
- verify_pasted_coverage.py
- Contributing Guide
- SearchForm
- Committed Display Ledger
- snapshot-resources.test.ts
- London to Paris Bus Option
- createDisplayContextStore
- Omio Generative UI Demo
- run.mjs
- Milestones and commit boundaries
- component-functions.ts
- display-context.test.ts
- Server-Executed Fixed Query Functions
- FareDataBridge
- FareProjectionBridge
- QueryExecutionState
- Canonical Catalog Descriptor
- 49-Component Travel UI Vocabulary
- display-records.ts
- Responsive Mobile Fare Selection
- query-engine/package.json
- review-controls.test.tsx
- route-calendar.test.tsx
- run-completion.mjs
- Repository Workflow
- Fixed Projection Union
- run.ts
- Urban Travel Scene
- Transportation Landscape Hero
- classic-search.test.tsx
- server-query-client.live.test.ts
- package.json
- Download on the Apple App Store Badge
- Omio Reference Assets
- run-query-benchmark.mjs
- tree.test.ts
- Seven Day Lowest Fare Selector
- Signed-in Codex Provider Verification
- spike/toolkit.tsx
- ModelProcess
- Huawei AppGallery Download Badge
- Machine-Readable Link
- Compass Icon
- Dated Bus Journey Timeline
- run-live.mjs
- Desktop Right Planning Tracker
- DuckDB WASM Engine
- Omio Travel Search Demo Page
- Google Play
- Mobile Ticketing
- Visual Scan Target
- Update and Refresh
- Stacked Mobile Travel View
- London to Paris Route Timeline
- Local Fare Controls
- Calendar First Fare Comparison
- Journey Itinerary Timeline
- Travel Choices
- Per-leg Fare Selection
- Selected Bus Fare
- @assistant-ui/ai-sdk
- backend/__init__.py
- class-variance-authority
- Browser Selection and Deselection Proof
- No Saved State Migration or Reset
- radix-ui
- @testing-library/user-event
- playwright.config.ts
- install-graphify-hooks.sh
- test-graphify-hooks.sh
- run-browser-proof.mjs
- vite.config.js
- Path
- Inclusive Local Query Semantics
- Bounded artifactRef Scalar
- Atomic Selection Status Region
- Native Renderer Selection Actions
- No Query Network or Model Turn
- Selected Fare Count Catalog Extension
- selectedFareIds Length Derivation
- Unresolved Artifact Fallback
- shadcn/ui MIT License
- FareItemSchema

## God Nodes (most connected - your core abstractions)
1. `createUIStateStore()` - 52 edges
2. `ArtifactIdSchema` - 48 edges
3. `createFareDataBridge()` - 45 edges
4. `createFixedProjectionFixture()` - 41 edges
5. `createActionRouter()` - 33 edges
6. `useDisplayNode()` - 32 edges
7. `usePublishDisplay()` - 27 edges
8. `createDisplayContextStore()` - 27 edges
9. `cityLabel()` - 25 edges
10. `DatasetIdSchema` - 25 edges

## Surprising Connections (you probably didn't know these)
- `49-Component Travel UI Vocabulary` --semantically_similar_to--> `Component Function Registry`  [INFERRED] [semantically similar]
  src/generative/catalog/generated/catalog.md → docs/server-driven-generative-ui-implementation-plan.md
- `Pull Request Template` --semantically_similar_to--> `Contributing Guide`  [INFERRED] [semantically similar]
  .github/pull_request_template.md → CONTRIBUTING.md
- `Deterministic SQLite Fare Fixture` --semantically_similar_to--> `Deterministic Synthetic Timetable`  [INFERRED] [semantically similar]
  README.md → backend/README.md
- `Fixed Projection Union` --conceptually_related_to--> `Source-Bound Opaque Cursor`  [EXTRACTED]
  backend/README.md → docs/server-driven-generative-ui-implementation-plan.md
- `parseChatRequest()` --calls--> `parseAgentContext()`  [EXTRACTED]
  agent/request-schema.ts → src/generative/contracts/index.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Streamed Journey View** — verification_generative_ui_a_browser_proof_2_1280_blue_streamed_journey_story, verification_generative_ui_a_browser_proof_2_1280_blue_route_timeline, verification_generative_ui_a_browser_proof_2_1280_blue_synthetic_fare_options [EXTRACTED 1.00]
- **Catalog Trip Planning State** — src_generative_catalog_generated_catalog_multi_city_plan_grid, src_generative_catalog_generated_catalog_stable_leg_identity, src_generative_catalog_generated_catalog_local_filter_controls, src_generative_catalog_generated_catalog_planning_tracker [EXTRACTED 1.00]
- **Committed Display Evidence Flow** — docs_server_driven_generative_ui_implementation_plan_display_ledger, docs_server_driven_generative_ui_implementation_plan_immutable_display_inspection, docs_server_driven_generative_ui_implementation_plan_context_privacy_budget, docs_server_driven_generative_ui_implementation_plan_source_bound_pins [EXTRACTED 1.00]
- **Dual-Graph Repository Analysis** — agents_repository_workflow, agents_code_review_graph, agents_graphify_knowledge_graph, agents_graph_guided_source_verification [EXTRACTED 1.00]
- **Fixed Query Execution Flow** — docs_server_driven_generative_ui_implementation_plan_component_function_registry, docs_server_driven_generative_ui_implementation_plan_batching_query_coordinator, docs_server_driven_generative_ui_implementation_plan_server_executed_fixed_queries, backend_readme_fixed_projection_union [EXTRACTED 1.00]
- **Fare Decision Interface** — verification_generative_ui_a_live_case_0_split_fare_comparison, verification_generative_ui_a_live_case_0_local_fare_controls, verification_generative_ui_a_live_case_0_cheapest_fastest_summary [EXTRACTED 1.00]
- **Calendar Comparison Workflow** — verification_generative_ui_a_live_case_1_calendar_first_comparison, verification_generative_ui_a_live_case_1_mode_duration_matrix, verification_generative_ui_a_live_case_1_local_refinement_controls [EXTRACTED 1.00]
- **Journey Story** — verification_generative_ui_a_live_case_2_route_map, verification_generative_ui_a_live_case_2_itinerary_timeline, verification_generative_ui_a_live_case_2_synthetic_total [EXTRACTED 1.00]
- **Query Engine Benchmark Engines and Workloads** — verification_generative_ui_query_engine_2026_10_02_local_query_engine_benchmark, verification_generative_ui_query_engine_2026_10_02_typescript_worker_engine, verification_generative_ui_query_engine_2026_10_02_duckdb_wasm_engine, verification_generative_ui_query_engine_2026_10_02_workload_correctness [EXTRACTED 1.00]
- **Selection Persistence Proof** — verification_generative_ui_state_proof_result_persisted_fare_view, verification_generative_ui_state_proof_result_selected_bus_fare, verification_generative_ui_state_proof_result_text_only_state_summary [EXTRACTED 1.00]
- **Multi-city Planning View** — verification_generative_ui_a_user_conversation_completion_multicity_route, verification_generative_ui_a_user_conversation_completion_per_leg_fare_selection, verification_generative_ui_a_user_conversation_completion_sticky_synthetic_totals [EXTRACTED 1.00]
- **Acceptance Verification Layers** — verification_acceptance_database_source_coverage, verification_acceptance_http_api_acceptance, verification_acceptance_browser_flow_acceptance [EXTRACTED 1.00]
- **Source Coverage Contract Verification** — verification_acceptance_generated_sqlite_database, verification_acceptance_coverage_parser, verification_acceptance_backend_test_suite, verification_acceptance_source_contract [EXTRACTED 1.00]
- **App Call-to-Action Intermodal Scene** — public_assets_omio_app_background_app_cta_background, public_assets_omio_app_background_urban_travel_scene, public_assets_omio_app_background_bus, public_assets_omio_app_background_train, public_assets_omio_app_background_cityscape [INFERRED 0.75]
- **Artifact State Continuity Flow** — verification_generative_ui_a_compatibility_snapshot_transport, verification_generative_ui_a_user_conversation_readme_native_sdk_tool_execution, verification_generative_ui_state_proof_readme_restored_artifact_state, verification_generative_ui_state_proof_readme_atomic_snapshot [INFERRED 0.85]
- **Native Present Smoke Render** — verification_generative_ui_a_native_present_native_rendering_smoke_test, verification_generative_ui_a_native_present_travel_choices, verification_generative_ui_a_native_present_train_bus_options [INFERRED 0.85]
- **Multimodal Passenger Transport** — public_assets_omio_hero_air_travel, public_assets_omio_hero_rail_travel, public_assets_omio_hero_bus_travel, public_assets_omio_hero_ferry_travel [INFERRED 0.85]
- **Query Semantics and Engine Boundary** — docs_decisions_query_null_semantics_null_safe_predicates, docs_decisions_query_null_semantics_duckdb_oracle, verification_generative_ui_query_engine_2026_10_02_validated_queryir_boundary, verification_generative_ui_query_engine_2026_10_02_typescript_module_worker [INFERRED 0.85]
- **Native Generative UI Evidence** — verification_generative_ui_a_compatibility_native_present_tree, verification_generative_ui_a_live_readme_live_native_composition_evidence, verification_generative_ui_a_user_conversation_readme_native_sdk_tool_execution [INFERRED 0.95]
- **Source-Safe Result Identity** — docs_server_driven_generative_ui_implementation_plan_stable_logical_scope_identity, docs_server_driven_generative_ui_implementation_plan_source_bound_cursor, docs_server_driven_generative_ui_implementation_plan_source_bound_pins, docs_server_driven_generative_ui_implementation_plan_source_replacement_recovery [INFERRED 0.95]
- **London to Paris Journey Representations** — verification_generative_ui_a_browser_proof_2_1280_blue_partial_schematic_route, verification_generative_ui_a_browser_proof_2_1280_blue_partial_journey_timeline, verification_generative_ui_a_browser_proof_2_1280_blue_partial_fare_option [INFERRED 0.95]

## Communities (155 total, 28 thin omitted)

### Community 0 - "app.py"
Cohesion: 0.05
Nodes (65): ApiError, _connect(), _date_value(), dispatch(), dispatch_post(), _fail(), get_locations(), get_metadata() (+57 more)

### Community 1 - "query_groups.py"
Cohesion: 0.15
Nodes (47): _available_date_window(), _calendar_days(), _canonical(), _carrier_facets(), _company_ids(), _cursor_hash(), _cursor_predicate(), _decode_cursor() (+39 more)

### Community 2 - "routes.tsx"
Cohesion: 0.12
Nodes (27): createLegacySessionSummary(), createSessionSummary(), LEGACY_SESSION_ID, orderedSessions(), readSessionHistory(), SessionHistory, SessionHistorySchema, SessionSummary (+19 more)

### Community 3 - "createUIStateStore"
Cohesion: 0.08
Nodes (34): artifactId, setup(), CatalogNode(), artifactId, scope, TravelProvider(), TravelServices, artifactId (+26 more)

### Community 4 - "trip-planning/components.tsx"
Cohesion: 0.07
Nodes (45): DropdownMenu(), DropdownMenuCheckboxItem(), DropdownMenuContent(), DropdownMenuTrigger(), ArtifactErrorBoundary, controls, layouts, statuses (+37 more)

### Community 5 - "query-groups.ts"
Cohesion: 0.05
Nodes (43): artifactId, CalendarDaysRequestSchema, CalendarDaysResultSchema, CarrierFacetsRequestSchema, CarrierFacetsResultSchema, datasetId, datasetRevision, date (+35 more)

### Community 6 - "index.ts"
Cohesion: 0.05
Nodes (38): descriptors, legRefs, refs, hash, BoundedFareFactSchema, CATALOG_VERSION, CitySequenceSchema, CompactArtifactSnapshotSchema (+30 more)

### Community 7 - "cityLabel"
Cohesion: 0.26
Nodes (30): PendingQueryProbe(), carrierLabel(), cityLabel(), departure(), duration(), money(), useArtifact(), useOrderedFares() (+22 more)

### Community 8 - "action-router.ts"
Cohesion: 0.12
Nodes (27): ArtifactId, ArtifactUIState, BoundedFareFact, UIStateStore, FareScopeBinding, ResourceKey, ServerFareDataBridge, cachedSelectedFacts() (+19 more)

### Community 9 - "LandingPage.jsx"
Cohesion: 0.19
Nodes (10): Icon(), paths, LandingPage(), offers, transportModes, Logo(), Badge(), badgeVariants (+2 more)

### Community 10 - "compilerOptions"
Cohesion: 0.06
Nodes (30): agent, benchmarks/query-engine, *.config.ts, DOM, DOM.Iterable, ES2022, node, src (+22 more)

### Community 11 - "dependencies"
Cohesion: 0.07
Nodes (29): ai, @ai-sdk/react, assistant-stream, @assistant-ui/react, @assistant-ui/react-generative-ui, cn, lucide-react, dependencies (+21 more)

### Community 12 - "devDependencies"
Cohesion: 0.07
Nodes (28): @assistant-ui/vite, jsdom, devDependencies, @assistant-ui/vite, jsdom, @playwright/test, @testing-library/dom, @testing-library/jest-dom (+20 more)

### Community 13 - "server-query-client.ts"
Cohesion: 0.11
Nodes (17): LookupPinsRequestSchema, LookupPinsResponseSchema, QueryErrorCode, QueryErrorResponseSchema, ResourceKeySchema, item, scope, createServerQueryClient() (+9 more)

### Community 14 - "context.tsx"
Cohesion: 0.10
Nodes (33): addMinutes(), bindingCandidates(), CalendarDaysResult, CarrierFacetsResult, committedDatasetId(), committedResultKey(), ComponentQueryOptions, ComponentQueryResult (+25 more)

### Community 15 - "fare-data-bridge.ts"
Cohesion: 0.15
Nodes (11): FareScopeManifest, LookupPinsRequest, LookupPinsResponse, QueryGroupRequest, QueryGroupResult, SelectedFarePin, CachedItem, PendingScope (+3 more)

### Community 16 - "assertNoBulkData"
Cohesion: 0.18
Nodes (15): currentMessage(), fits(), olderMessage(), projectNetworkHistory(), splitText(), context(), prepared(), createSnapshotTransport() (+7 more)

### Community 17 - "contracts/display-context.ts"
Cohesion: 0.08
Nodes (25): boundedFact, ComponentRef, ComponentRefSchema, componentRefValue, date, DisplayCell, displayCells, DisplayCellSchema (+17 more)

### Community 18 - "snapshot-exporter.ts"
Cohesion: 0.13
Nodes (26): request(), AgentContextEnvelope, CompactArtifactSnapshot, ComponentBinding, OlderArtifactSummary, LookupPin, addMinutes(), bindingFor() (+18 more)

### Community 19 - "projection-coordinator.ts"
Cohesion: 0.15
Nodes (22): ProjectionRequestSchema, ProjectionResultSnapshotSchema, QueryIntentIdentity, ActiveRequirement, Batch, canonical(), createProjectionCoordinator(), executeBatch() (+14 more)

### Community 20 - "codex-provider.ts"
Cohesion: 0.16
Nodes (14): CODEX_DEVELOPER_INSTRUCTIONS, codexDecision(), Decision, DecisionDelta, DecisionSchema, readString(), mocks, valid (+6 more)

### Community 21 - "ResultsPage.jsx"
Cohesion: 0.10
Nodes (22): sortTrips(), companyColors, dateSequence(), formatDate(), formatDuration(), formatPrice(), formatTime(), modeLabels (+14 more)

### Community 22 - "browser.ts"
Cohesion: 0.16
Nodes (18): base, benchmarkRows(), csvRows(), expected(), id, longTasks, Metric, percentile() (+10 more)

### Community 23 - "useDisplayNode"
Cohesion: 0.31
Nodes (15): Skeleton(), useTravelAction(), CarrierControl(), Control(), recordDisplayInteraction(), useDisplayNode(), usePublishDisplay(), Layout() (+7 more)

### Community 24 - "controls/index.tsx"
Cohesion: 0.11
Nodes (12): Checkbox(), Field(), FieldLegend(), FieldSet(), fieldVariants, Input(), Label(), NativeSelect() (+4 more)

### Community 25 - "projection-coordinator.test.ts"
Cohesion: 0.12
Nodes (11): QueryGroupsRequest, QueryGroupsResponse, ProjectionRequirement, datasetId, filters, group, revision, scope (+3 more)

### Community 26 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 27 - "createFareDataBridge"
Cohesion: 0.21
Nodes (19): createFareDataBridge(), assertActive(), executeGroup(), fetchScope(), findBinding(), findBindingForScope(), findCachedFare(), getBinding() (+11 more)

### Community 28 - "check-shadcn.mjs"
Cohesion: 0.15
Nodes (20): assistantInteractiveParts, attributesOf(), componentsPath, interactiveRoles, isDirectShadcnAsChild(), isProductionSource(), jsxName(), location() (+12 more)

### Community 29 - "App.jsx"
Cohesion: 0.13
Nodes (21): buildSearchUrl(), getJson(), locationValue(), minutesFromDuration(), MODE_ORDER, modes, normalizeLocations(), normalizeSearch() (+13 more)

### Community 30 - "display-context-provider.tsx"
Cohesion: 0.15
Nodes (11): DisplayContextProvider(), DisplayVisibilityProvider(), inspectionSource(), NodeContext, PublishDisplayInput, StoreContext, PublishingChild(), EffectiveInputs (+3 more)

### Community 31 - "state/display-context.ts"
Cohesion: 0.11
Nodes (18): DISPLAY_CONTEXT_VERSION, DISPLAY_LIMITS, DisplayedFareFact, DisplayedFareFactSchema, DisplayLedgerEntrySchema, DisplayRepresentationSchema, FrozenDisplayContextSchema, InspectDisplayInput (+10 more)

### Community 32 - "query-engine.ts"
Cohesion: 0.09
Nodes (26): AllowedFareField, BoundedQueryResult, DatasetId, DatasetRevision, DatasetRevisionSchema, QueryIR, scalar, WorkerRequest (+18 more)

### Community 33 - "Acceptance Evidence"
Cohesion: 0.11
Nodes (20): Acceptance Evidence, API Pagination, Backend Commit b1c8912, Backend Test Suite, Browser Captures, Browser flow, Browser Flow Acceptance, Coverage Parser (+12 more)

### Community 34 - "Native Recursive Present Tree"
Cohesion: 0.10
Nodes (21): Backendless assistant-ui Compiler, Host Raw-tree Validation, Native A Compatibility Evidence, Native Recursive Present Tree, AssistantChatTransport Snapshot Transform, Calendar Arrangement, Compare Arrangement, Deterministic Browser Proof (+13 more)

### Community 35 - "chat-route.ts"
Cohesion: 0.20
Nodes (16): handleChat(), loadLocationCatalog(), locationsSchema, selectLocations(), ChatRequest, parseToolInput(), ack(), artifact (+8 more)

### Community 36 - "views/index.tsx"
Cohesion: 0.12
Nodes (21): Alert(), alertVariants, Card(), Table(), TableBody(), TableCaption(), TableCell(), TableHead() (+13 more)

### Community 37 - "present-boundary.tsx"
Cohesion: 0.21
Nodes (14): datasetBoundComponents, isDatasetBoundComponent(), isLegBoundPlannerComponent(), legBoundPlannerComponents, resolvePlannerDatasetRef(), hasLaterAcceptedScene(), ScenePart, DatasetIdSchema (+6 more)

### Community 38 - "Server-Driven Generative UI Implementation Plan"
Cohesion: 0.11
Nodes (18): Acceptance criteria, Authoritative Current State, Authoritative current state — 2026-10-08, Caller view, Contract sketch, Display ledger and next-turn context, Fixed server projections, Frozen query wire contract (+10 more)

### Community 39 - "thread-shell.tsx"
Cohesion: 0.13
Nodes (8): Textarea(), assistantWorkingPuns, AssistantWorkingStatus(), partComponents, randomPunIndex(), suggestions, services, ThreadShell()

### Community 40 - "planning-tracker.tsx"
Cohesion: 0.16
Nodes (15): Dialog(), DialogClose(), DialogContent(), DialogDescription(), DialogTitle(), DialogTrigger(), useTravelServices(), artifactIds() (+7 more)

### Community 41 - "itinerary-schedule.ts"
Cohesion: 0.19
Nodes (13): Coverage, FareId, fallbackLegDate(), fareArrivalInstant(), fareDepartureInstant(), fareMeetsThreshold(), instant(), legThreshold (+5 more)

### Community 42 - "createWorkerQueryEngine"
Cohesion: 0.31
Nodes (7): abortError(), createLocalQueryEngine(), createWorkerQueryEngine(), receive(), request(), cancel(), QueryWorker

### Community 43 - "persistence.ts"
Cohesion: 0.06
Nodes (22): ArtifactUIStateSchema, CONTRACT_VERSION, FareScopeSchema, descriptor, PersistedThread, PersistedThreadSchema, ThreadConflictError, ThreadStorage (+14 more)

### Community 44 - "browser-tools.ts"
Cohesion: 0.16
Nodes (13): parseToolOutput(), InputField, InspectDisplayInputSchema, InspectDisplayOutputSchema, EditArtifactInputSchema, UICommandPatchSchema, QueryExecutionStateSchema, commandInputFields() (+5 more)

### Community 45 - "Null-safe Query Predicates"
Cohesion: 0.12
Nodes (18): Benchmark Browser Module, Local Query Engine Benchmark Page, DuckDB NULL Semantics Documentation, Independent DuckDB Oracle, DuckDB Prepared Statements Documentation, Null-preserving Projection, Null-safe Query Predicates, Deterministic Null Sorting (+10 more)

### Community 46 - "runtime-provider.tsx"
Cohesion: 0.26
Nodes (6): normalizeToolContinuations(), exportedMessages(), GenerativeChat(), GenerativeChatProps, isUIMessage(), LocalToolStatus()

### Community 47 - "fixed-projection-fixture.ts"
Cohesion: 0.12
Nodes (16): FareLeg, dates(), fare(), fixture(), clone(), compare(), DateWindow, FareInput (+8 more)

### Community 48 - "scripts"
Cohesion: 0.12
Nodes (17): scripts, agent:dev, benchmark:query, build, check:catalog, check:shadcn, dev, frontend:dev (+9 more)

### Community 49 - "ArtifactIdSchema"
Cohesion: 0.15
Nodes (11): artifactId, otherId, binding(), id, scope(), ArtifactIdSchema, FareIdSchema, createArtifactStore() (+3 more)

### Community 50 - "tree.ts"
Cohesion: 0.15
Nodes (14): keys, names, scalarLimit(), scalars, scope, validatePresentPrefix(), componentKey, layouts (+6 more)

### Community 51 - "request-schema.ts"
Cohesion: 0.10
Nodes (19): {decision}, servers, CODEX_MODEL, CODEX_REASONING_EFFORT, date, ErrorOutput, id, MessageSchema (+11 more)

### Community 52 - "run-state-proof.mjs"
Cohesion: 0.13
Nodes (12): /src/generative/data/fare-data-bridge.ts, /src/generative/state/persistence.ts, /src/generative/state/ui-state-store.ts, case0, errors, last, parts, requests (+4 more)

### Community 53 - "ui-state-store.ts"
Cohesion: 0.13
Nodes (14): setup(), signal(), window, DateSchema, DispatchResult, UICommand, UIStateRevisionSchema, filters (+6 more)

### Community 54 - "query-engine-fixture.ts"
Cohesion: 0.11
Nodes (15): AgentContextEnvelopeSchema, CoverageSchema, DatasetManifest, DatasetManifestSchema, FareRowSchema, QueryIRSchema, baseContext, displayContext (+7 more)

### Community 55 - "fare-pagination.test.tsx"
Cohesion: 0.25
Nodes (7): items, renderSelector(), scope, selectorItems, FareScope, QueryGroupsResponseSchema, ServerQueryClient

### Community 56 - "request-schema.test.ts"
Cohesion: 0.25
Nodes (7): currentContext, displayContext, fact, inspectInput, inspectOutput, request, LIMITS

### Community 57 - "catalog.ts"
Cohesion: 0.18
Nodes (11): catalogDescriptors, catalogHash, catalogVersion, componentNames, legBoundPropsSchema, nodePropsSchema, sharedPropsSchema, datasetBoundComponentNames (+3 more)

### Community 58 - "chat-sessions.spec.ts"
Cohesion: 0.10
Nodes (25): CoverageRequest, CoverageRequestSchema, coverageKey(), FarePage, LoadedResource, loadResource(), PageInput, PageSource (+17 more)

### Community 59 - "main.tsx"
Cohesion: 0.17
Nodes (11): App(), artifactId, bridge, input, requests, resume(), root, scenes (+3 more)

### Community 60 - "SearchForm.jsx"
Cohesion: 0.21
Nodes (13): displayLocation(), editDistance(), isSubsequence(), LocationField(), handleKeyDown(), selectLocation(), normalizeText(), resolveLocation() (+5 more)

### Community 61 - "DisplayContextStore"
Cohesion: 0.17
Nodes (5): DisplayVisibility, FrozenDisplayContext, InputProvenance, SemanticInteraction, DisplayContextStore

### Community 62 - "verify_pasted_coverage.py"
Cohesion: 0.44
Nodes (11): check_database(), main(), normalized(), pair(), parse_dash_line(), parse_manifest(), parse_to_line(), Path (+3 more)

### Community 63 - "Contributing Guide"
Cohesion: 0.31
Nodes (11): Pull Request Template, Pull Request Branch Target, Pull Request Verification, Contributing Guide, Branch Naming Convention, dev Branch, Focused Pull Requests, Hotfix Branch (+3 more)

### Community 64 - "SearchForm"
Cohesion: 0.38
Nodes (5): SearchForm(), handlePlannerKeyDown(), startPlan(), submit(), submitPlan()

### Community 65 - "Committed Display Ledger"
Cohesion: 0.22
Nodes (10): Source-Scoped Fare Lookup Endpoint, Batching Query Coordinator, Next-Turn Context Privacy Budget, Committed Display Ledger, Immutable Bounded Display Inspection, Preserve Committed Output During Refresh, Separate Desired Intent from Committed Display, Source-Bound Opaque Cursor (+2 more)

### Community 66 - "snapshot-resources.test.ts"
Cohesion: 0.35
Nodes (10): createThreadPersistence(), parsePersistedThread(), cacheScope(), displayStore(), fare(), id, restoredContextFixture(), scope() (+2 more)

### Community 67 - "London to Paris Bus Option"
Cohesion: 0.18
Nodes (11): London to Paris Bus Option, Desktop Blue Fare Selection Partial Stream, Cheapest Fastest and Selected Trip Summary, Desktop Blue Fare Selection Completed Stream, Selected Bus Transport Filter, Mobile Blue Fare Selection Completed Stream, Current Changes Stream Completion, Mobile Sand Fare Selection Partial Stream (+3 more)

### Community 68 - "createDisplayContextStore"
Cohesion: 0.17
Nodes (9): scene, setup(), TestNode, DisplayLedgerEntry, DisplayRepresentation, clone(), createDisplayContextStore(), displayFareIds() (+1 more)

### Community 69 - "Omio Generative UI Demo"
Cohesion: 0.20
Nodes (11): Deterministic Synthetic Timetable, Preserved Version 2 Fixture Policy, Query Groups Endpoint, Source-Bound Opaque Cursors, Synthetic Timetable Backend, Deterministic SQLite Fare Fixture, Local Signed-In Codex Model Agent, Native React Component Composition (+3 more)

### Community 70 - "run.mjs"
Cohesion: 0.22
Nodes (7): agentPort, apiPort, children, env, start(), stop(), webPort

### Community 71 - "Milestones and commit boundaries"
Cohesion: 0.22
Nodes (9): 0. Preserve the clean base and journal, 1. Prove fixed SQL projections, 2. Add query contracts, client, and coordinator, 3. Bind catalog components to semantic functions, 4. Add the display ledger and inspection capture, 5. Migrate the generative runtime and delete bulk preload, 6. Prove the first user-test render, 7. Refresh graphs and hand off (+1 more)

### Community 72 - "component-functions.ts"
Cohesion: 0.22
Nodes (5): CatalogComponentName, ComponentFunctionDeclaration, componentFunctions, none, ComponentFunction

### Community 73 - "display-context.test.ts"
Cohesion: 0.17
Nodes (8): ComponentIdentitySchema, InspectDisplayItem, envelope(), QueryGroupScopeSchema, DisplayInspectionError, connectedFact(), fact(), inspectionItems

### Community 74 - "Server-Executed Fixed Query Functions"
Cohesion: 0.29
Nodes (7): Use a Clean Managed Worktree, Completed Server-Driven Implementation, Delete Browser Bulk Preload, Preserve Classic Search API, Server-Executed Fixed Query Functions, Use One Commit Steward, Validation Matrix

### Community 77 - "QueryExecutionState"
Cohesion: 0.18
Nodes (4): ProjectionResultSnapshot, QueryExecutionState, ResultKey, ProjectionCoordinator

### Community 78 - "Canonical Catalog Descriptor"
Cohesion: 0.25
Nodes (8): Authored Nodes and Positional Props, Distinct Travel Catalog Primitives, Granular Component Semantics, Catalog Version 1.0.0, Canonical Catalog Descriptor, Generated Schemas and Model Documentation, Expanded Vocabulary Manifest Hash, Native Compiler-valid Toolkit

### Community 80 - "49-Component Travel UI Vocabulary"
Cohesion: 0.25
Nodes (8): Child-Accepting Layout Containers, 49-Component Travel UI Vocabulary, Local Fare Filter Controls, MultiCityPlanGrid, Shared PlanningTracker Selection, Shared Catalog 1.1.0, Stable Logical Leg Identity, Shared Catalog and Paused-stream Proof

### Community 81 - "display-records.ts"
Cohesion: 0.33
Nodes (5): boundedFareFact(), effectiveInputFields(), effectiveInputs(), QueryDisplaySource, ProjectionResult

### Community 82 - "Responsive Mobile Fare Selection"
Cohesion: 0.25
Nodes (8): Desktop Fare Selection Proof, Selected Fastest Flight, Selection and Tracker Consistency, Unselected Cheapest Bus, Responsive Mobile Fare Selection, Responsive Selection Continuity, Stacked Mobile Fare Cards, Stacked Mobile Planning Tracker

### Community 83 - "query-engine/package.json"
Cohesion: 0.29
Nodes (6): dependencies, @duckdb/duckdb-wasm, name, private, type, @duckdb/duckdb-wasm

### Community 84 - "review-controls.test.tsx"
Cohesion: 0.38
Nodes (4): artifactId, fare(), fixedRows(), scopeDates()

### Community 85 - "route-calendar.test.tsx"
Cohesion: 0.38
Nodes (5): dates(), fare(), fixed(), id, window

### Community 87 - "run-completion.mjs"
Cohesion: 0.29
Nodes (6): errors, last, requests, responses, started, timers

### Community 88 - "Repository Workflow"
Cohesion: 0.40
Nodes (5): Code Review Graph, Graph-Guided Source Verification, Graphify Knowledge Graph, Knowledge graphs, Repository Workflow

### Community 89 - "Fixed Projection Union"
Cohesion: 0.29
Nodes (7): Fixed Projection Union, Component Function Registry, 49-Component Catalog Vocabulary, Fare Scope Manifest, Fixed Projection Boundary, Bounded Ordered Route Legs, Stable Logical Scope Identity

### Community 90 - "run.ts"
Cohesion: 0.33
Nodes (4): awaiting, completion, errors, measurements

### Community 92 - "Urban Travel Scene"
Cohesion: 0.40
Nodes (6): App Call-to-Action Background Illustration, Bus, Cityscape, Intermodal Mobility, Train, Urban Travel Scene

### Community 93 - "Transportation Landscape Hero"
Cohesion: 0.33
Nodes (6): Air Travel, Bus Travel, Ferry Travel, Multimodal Travel, Rail Travel, Transportation Landscape Hero

### Community 94 - "classic-search.test.tsx"
Cohesion: 0.40
Nodes (3): response(), summaries, trip()

### Community 97 - "server-query-client.live.test.ts"
Cohesion: 0.13
Nodes (8): ProjectionFilters, ProjectionRequest, client, filters, live, scope, Metadata, server

### Community 99 - "package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 100 - "Download on the Apple App Store Badge"
Cohesion: 0.40
Nodes (5): Apple App Store, Download on the Apple App Store Badge, Apple Logo, iOS App Download, Trusted Platform Acquisition

### Community 101 - "Omio Reference Assets"
Cohesion: 0.40
Nodes (4): Live Landing Page Asset Provenance, Mobile App Call-to-Action Assets, Non-Production Visual Reference Use, Omio Reference Assets

### Community 104 - "Seven Day Lowest Fare Selector"
Cohesion: 0.40
Nodes (5): Seven Day Lowest Fare Selector, Bus Mode and Lowest Price Controls, Mode Table and Price Journey Time Plot, Desktop Blue Fare Comparison Partial Stream, Desktop Blue Fare Comparison Completed Stream

### Community 105 - "Signed-in Codex Provider Verification"
Cohesion: 0.40
Nodes (5): Signed-in Codex CLI Probe, Isolated Codex App-server Adapter, Shared Provider and Model Parity, Signed-in Codex Provider Verification, Server-owned Visible-turn Ledger

### Community 106 - "spike/toolkit.tsx"
Cohesion: 0.60
Nodes (3): SpikeCard(), SpikeSurface(), generative

### Community 108 - "Huawei AppGallery Download Badge"
Cohesion: 0.50
Nodes (4): Huawei AppGallery Download Badge, Huawei AppGallery, Mobile App Download, Platform Distribution Call to Action

### Community 109 - "Machine-Readable Link"
Cohesion: 0.50
Nodes (4): Cross-Device Handoff, Machine-Readable Link, Mobile App Acquisition, Mobile App QR Code

### Community 110 - "Compass Icon"
Cohesion: 0.50
Nodes (4): Compass Icon, Directional Navigation, Explore Destinations, Travel Discovery

### Community 112 - "Dated Bus Journey Timeline"
Cohesion: 0.50
Nodes (4): Flixbus Fare Option, Dated Bus Journey Timeline, Schematic London to Paris Route, Desktop Blue Route Timeline Partial Stream

### Community 114 - "Desktop Right Planning Tracker"
Cohesion: 0.50
Nodes (4): Cheapest and Fastest Fare Comparison, Demo Purchase Action, Desktop Right Planning Tracker, Selected Fare Purchase State

### Community 115 - "DuckDB WASM Engine"
Cohesion: 0.67
Nodes (4): DuckDB WASM Engine, Local Query Engine Benchmark, TypeScript Worker Engine, Top K Filter Group Join Correctness

### Community 116 - "Omio Travel Search Demo Page"
Cohesion: 0.67
Nodes (3): Multimodal Travel Search, Omio Travel Search Demo Page, React Application Entry

### Community 117 - "Google Play"
Cohesion: 0.67
Nodes (3): Android App Distribution, Google Play Download Badge, Google Play

### Community 118 - "Mobile Ticketing"
Cohesion: 1.00
Nodes (3): Mobile Ticketing, QR Code, Mobile Ticket QR Code Icon

### Community 119 - "Visual Scan Target"
Cohesion: 0.67
Nodes (3): QR Code Scanning, Scanner Frame, Visual Scan Target

### Community 120 - "Update and Refresh"
Cohesion: 0.67
Nodes (3): Synchronization, Update and Refresh, Updates Icon

### Community 121 - "Stacked Mobile Travel View"
Cohesion: 0.67
Nodes (3): Mobile Blue Fare Selection Partial Stream, Stacked Mobile Travel View, Sticky Chat Composer Over Travel Content

### Community 122 - "London to Paris Route Timeline"
Cohesion: 0.67
Nodes (3): London to Paris Route Timeline, Streamed Journey Story, Synthetic Fare Options

### Community 123 - "Local Fare Controls"
Cohesion: 0.67
Nodes (3): Cheapest and Fastest Summary, Local Fare Controls, Split Fare Comparison

### Community 124 - "Calendar First Fare Comparison"
Cohesion: 0.67
Nodes (3): Calendar First Fare Comparison, Local Refinement Controls, Mode and Duration Matrix

### Community 125 - "Journey Itinerary Timeline"
Cohesion: 0.67
Nodes (3): Journey Itinerary Timeline, London to Paris Route Map, Synthetic Total Per Passenger

### Community 126 - "Travel Choices"
Cohesion: 0.67
Nodes (3): Native Rendering Smoke Test, Train and Bus Options, Travel Choices

### Community 127 - "Per-leg Fare Selection"
Cohesion: 0.67
Nodes (3): London Paris Barcelona Multi-city Route, Per-leg Fare Selection, Sticky Synthetic Totals

### Community 128 - "Selected Bus Fare"
Cohesion: 0.67
Nodes (3): Persisted Fare View, Selected Bus Fare, Text-only State Summary

### Community 160 - "FareItemSchema"
Cohesion: 0.10
Nodes (18): artifactId, datasetId, fare, resourceKey, scope, FareItemSchema, ResultKeySchema, filters (+10 more)

## Knowledge Gaps
- **620 isolated node(s):** `LocationSeed`, `Fetch`, `CalendarDaysResult`, `CarrierFacetsResult`, `ComponentQueryOptions` (+615 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createFareDataBridge()` connect `createFareDataBridge` to `server-query-client.live.test.ts`, `routes.tsx`, `createUIStateStore`, `chat-route.ts`, `createDisplayContextStore`, `thread-shell.tsx`, `browser-tools.ts`, `server-query-client.ts`, `fare-data-bridge.ts`, `fixed-projection-fixture.ts`, `ArtifactIdSchema`, `snapshot-exporter.ts`, `request-schema.ts`, `projection-coordinator.ts`, `browser.ts`, `fare-pagination.test.tsx`, `main.tsx`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `ArtifactIdSchema` connect `ArtifactIdSchema` to `routes.tsx`, `createUIStateStore`, `trip-planning/components.tsx`, `index.ts`, `server-query-client.ts`, `context.tsx`, `projection-coordinator.test.ts`, `FareItemSchema`, `chat-route.ts`, `present-boundary.tsx`, `planning-tracker.tsx`, `itinerary-schedule.ts`, `persistence.ts`, `browser-tools.ts`, `runtime-provider.tsx`, `fixed-projection-fixture.ts`, `request-schema.ts`, `ui-state-store.ts`, `fare-pagination.test.tsx`, `main.tsx`, `snapshot-resources.test.ts`, `createDisplayContextStore`, `display-records.ts`, `review-controls.test.tsx`, `route-calendar.test.tsx`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `createProjectionCoordinator()` connect `projection-coordinator.ts` to `projection-coordinator.test.ts`, `createFareDataBridge`, `fare-data-bridge.ts`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `createUIStateStore()` (e.g. with `dispatch()` and `get()`) actually correct?**
  _`createUIStateStore()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `createFareDataBridge()` (e.g. with `executeGroup()` and `findBinding()`) actually correct?**
  _`createFareDataBridge()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `createActionRouter()` (e.g. with `.dispatch()` and `.get()`) actually correct?**
  _`createActionRouter()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `LocationSeed`, `Fetch`, `CalendarDaysResult` to the rest of the system?**
  _620 weakly-connected nodes found - possible documentation gaps or missing edges._