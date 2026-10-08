# Graph Report - omio-gen-ui-demo  (2026-10-08)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2120 nodes · 4935 edges · 156 communities (127 shown, 29 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 111 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ca19e700`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- app.py
- createUIStateStore
- fare-data-bridge.ts
- query_groups.py
- query-groups.ts
- action-router.ts
- index.ts
- fixed-projection-fixture.ts
- createFareDataBridge
- routes.tsx
- tree.ts
- compilerOptions
- ResultsPage.jsx
- dependencies
- chat-route.ts
- devDependencies
- App.jsx
- controls/index.tsx
- trip-planning/components.tsx
- cityLabel
- views/index.tsx
- contracts/display-context.ts
- request-schema.ts
- browser.ts
- component.tsx
- context.tsx
- present-boundary.tsx
- display-context-provider.tsx
- worker-client.ts
- scene-completion.test.ts
- components.json
- snapshot-exporter.ts
- codex-provider.ts
- check-shadcn.mjs
- useDisplayNode
- Acceptance Evidence
- Native Recursive Present Tree
- runtime-provider.tsx
- state/display-context.ts
- persistence.ts
- Server-Driven Generative UI Implementation Plan
- planning-tracker.tsx
- thread-shell.tsx
- run-fare-selection-proof.mts
- Null-safe Query Predicates
- resource-loader.ts
- main.tsx
- scripts
- SearchForm.jsx
- Booking Ownership per Logical Trip Leg
- LandingPage.jsx
- DisplayContextStore
- assertNoBulkData
- run-state-proof.mjs
- query-engine-fixture.ts
- browser-tools.ts
- chat-sessions.spec.ts
- useProjection
- display-context.test.ts
- createWorkerQueryEngine
- verify_pasted_coverage.py
- Contributing Guide
- Omio Generative UI Demo
- Committed Display Ledger
- transport.ts
- snapshot-resources.test.ts
- London to Paris Bus Option
- present-prefix.ts
- Component Function Registry
- run.mjs
- CATALOG_VERSION
- query-engine.ts
- Fixed Projection Union
- Milestones and commit boundaries
- Completed Server-Driven Implementation
- SearchForm
- FareDataBridge
- FareProjectionBridge
- QueryExecutionState
- Canonical Catalog Descriptor
- Progressive Fare Strip
- tool-supersession.test.ts
- Responsive Mobile Fare Selection
- query-engine/package.json
- smart-planner-handoff.ts
- route-calendar.test.tsx
- trip-planning-fixture.tsx
- run-completion.mjs
- Repository Workflow
- run.ts
- Urban Travel Scene
- Transportation Landscape Hero
- @assistant-ui/react
- window-retry.test.tsx
- history-projection.ts
- query-engine.test.ts
- package.json
- Download on the Apple App Store Badge
- Omio Reference Assets
- run-query-benchmark.mjs
- Seven Day Lowest Fare Selector
- Signed-in Codex Provider Verification
- spike/toolkit.tsx
- ModelProcess
- Huawei AppGallery Download Badge
- Machine-Readable Link
- Compass Icon
- ArtifactErrorBoundary
- VisibleSentinelObserver
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
- Inclusive Local Query Semantics
- Bounded artifactRef Scalar
- Atomic Selection Status Region
- Native Renderer Selection Actions
- No Query Network or Model Turn
- Selected Fare Count Catalog Extension
- selectedFareIds Length Derivation
- Unresolved Artifact Fallback
- shadcn/ui MIT License

## God Nodes (most connected - your core abstractions)
1. `createUIStateStore()` - 53 edges
2. `ArtifactIdSchema` - 49 edges
3. `createFareDataBridge()` - 46 edges
4. `createFixedProjectionFixture()` - 42 edges
5. `createActionRouter()` - 33 edges
6. `useDisplayNode()` - 32 edges
7. `usePublishDisplay()` - 28 edges
8. `createDisplayContextStore()` - 27 edges
9. `Server-Driven Generative UI Implementation Plan` - 27 edges
10. `DatasetIdSchema` - 26 edges

## Surprising Connections (you probably didn't know these)
- `49-Component Travel UI Vocabulary` --semantically_similar_to--> `Component Function Registry`  [INFERRED] [semantically similar]
  src/generative/catalog/generated/catalog.md → docs/server-driven-generative-ui-implementation-plan.md
- `Pull Request Template` --semantically_similar_to--> `Contributing Guide`  [INFERRED] [semantically similar]
  .github/pull_request_template.md → CONTRIBUTING.md
- `Deterministic SQLite Fare Fixture` --semantically_similar_to--> `Deterministic Synthetic Timetable`  [INFERRED] [semantically similar]
  README.md → backend/README.md
- `request()` --calls--> `createUIStateStore()`  [EXTRACTED]
  agent/scene-completion.test.ts → src/generative/state/ui-state-store.ts
- `parseChatRequest()` --calls--> `parseAgentContext()`  [EXTRACTED]
  agent/request-schema.ts → src/generative/contracts/index.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Committed Display Evidence Flow** — docs_server_driven_generative_ui_implementation_plan_display_ledger, docs_server_driven_generative_ui_implementation_plan_immutable_display_inspection, docs_server_driven_generative_ui_implementation_plan_context_privacy_budget, docs_server_driven_generative_ui_implementation_plan_source_bound_pins, docs_server_driven_generative_ui_implementation_plan_immutable_fare_strip_page_publishers, docs_server_driven_generative_ui_implementation_plan_aggregate_fare_strip_publisher [EXTRACTED 1.00]
- **Fixed Query Execution Flow** — docs_server_driven_generative_ui_implementation_plan_component_function_registry, docs_server_driven_generative_ui_implementation_plan_batching_query_coordinator, docs_server_driven_generative_ui_implementation_plan_server_executed_fixed_queries, backend_readme_fixed_projection_union [EXTRACTED 1.00]
- **Streamed Journey View** — verification_generative_ui_a_browser_proof_2_1280_blue_streamed_journey_story, verification_generative_ui_a_browser_proof_2_1280_blue_route_timeline, verification_generative_ui_a_browser_proof_2_1280_blue_synthetic_fare_options [EXTRACTED 1.00]
- **Catalog Trip Planning State** — src_generative_catalog_generated_catalog_multi_city_plan_grid, src_generative_catalog_generated_catalog_stable_leg_identity, src_generative_catalog_generated_catalog_local_filter_controls, src_generative_catalog_generated_catalog_planning_tracker [EXTRACTED 1.00]
- **Dual-Graph Repository Analysis** — agents_repository_workflow, agents_code_review_graph, agents_graphify_knowledge_graph, agents_graph_guided_source_verification [EXTRACTED 1.00]
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

## Communities (156 total, 29 thin omitted)

### Community 0 - "app.py"
Cohesion: 0.06
Nodes (61): ApiError, _connect(), _date_value(), dispatch(), _fail(), get_locations(), get_metadata(), _integer() (+53 more)

### Community 1 - "createUIStateStore"
Cohesion: 0.05
Nodes (54): artifactId, setup(), CatalogNode(), TravelProvider(), renderSelector(), artifactId, fixture(), rows (+46 more)

### Community 2 - "fare-data-bridge.ts"
Cohesion: 0.05
Nodes (49): artifactId, scope, items, scope, selectorItems, DatasetIdSchema, DatasetRevisionSchema, UIStateRevisionSchema (+41 more)

### Community 3 - "query_groups.py"
Cohesion: 0.10
Nodes (51): dispatch_post(), _available_date_window(), _calendar_days(), _canonical(), _carrier_facets(), _company_ids(), _cursor_hash(), _cursor_predicate() (+43 more)

### Community 4 - "query-groups.ts"
Cohesion: 0.04
Nodes (58): DatasetRevision, artifactId, CalendarDaysRequestSchema, CalendarDaysResultSchema, CarrierFacetsRequestSchema, CarrierFacetsResultSchema, datasetId, datasetRevision (+50 more)

### Community 5 - "action-router.ts"
Cohesion: 0.08
Nodes (43): resolvePlannerDatasetRef(), ArtifactId, ArtifactUIState, BoundedFareFact, Coverage, DatasetId, FareId, UIStateStore (+35 more)

### Community 6 - "index.ts"
Cohesion: 0.04
Nodes (51): artifactId, otherId, BoundedFareFactSchema, CitySequenceSchema, CompactArtifactSnapshotSchema, CompactSummarySchema, ComponentBindingSchema, DatasetFieldManifest (+43 more)

### Community 7 - "fixed-projection-fixture.ts"
Cohesion: 0.11
Nodes (18): FareLeg, ResultKeySchema, dates(), fare(), fixture(), clone(), compare(), rowsFor() (+10 more)

### Community 8 - "createFareDataBridge"
Cohesion: 0.11
Nodes (35): createFareDataBridge(), assertActive(), executeGroup(), fetchScope(), findBinding(), findBindingForScope(), findCachedFare(), getBinding() (+27 more)

### Community 9 - "routes.tsx"
Cohesion: 0.13
Nodes (27): createLegacySessionSummary(), createSessionSummary(), LEGACY_SESSION_ID, orderedSessions(), readSessionHistory(), SessionHistory, SessionHistorySchema, SessionSummary (+19 more)

### Community 10 - "tree.ts"
Cohesion: 0.09
Nodes (22): createAgentPresentValidationScope(), PresentScopeArtifact, PresentScopeDataset, context, datasets, ActiveScene, bindingKey(), getSceneMetadata() (+14 more)

### Community 11 - "compilerOptions"
Cohesion: 0.06
Nodes (30): agent, benchmarks/query-engine, *.config.ts, DOM, DOM.Iterable, ES2022, node, src (+22 more)

### Community 12 - "ResultsPage.jsx"
Cohesion: 0.10
Nodes (22): sortTrips(), companyColors, dateSequence(), formatDate(), formatDuration(), formatPrice(), formatTime(), modeLabels (+14 more)

### Community 13 - "dependencies"
Cohesion: 0.07
Nodes (29): ai, @ai-sdk/react, assistant-stream, @assistant-ui/ai-sdk, @assistant-ui/react-generative-ui, cn, lucide-react, dependencies (+21 more)

### Community 14 - "chat-route.ts"
Cohesion: 0.10
Nodes (18): loadLocationCatalog(), locationsSchema, selectLocations(), CatalogComponentName, ComponentFunctionDeclaration, componentFunctions, none, catalogDescriptors (+10 more)

### Community 15 - "devDependencies"
Cohesion: 0.07
Nodes (28): @assistant-ui/vite, jsdom, devDependencies, @assistant-ui/vite, jsdom, @playwright/test, @testing-library/dom, @testing-library/jest-dom (+20 more)

### Community 16 - "App.jsx"
Cohesion: 0.13
Nodes (19): buildSearchUrl(), getJson(), locationValue(), minutesFromDuration(), MODE_ORDER, modes, normalizeLocations(), normalizeSearch() (+11 more)

### Community 17 - "controls/index.tsx"
Cohesion: 0.10
Nodes (13): Checkbox(), Field(), FieldLegend(), FieldSet(), fieldVariants, Input(), Label(), NativeSelect() (+5 more)

### Community 18 - "trip-planning/components.tsx"
Cohesion: 0.09
Nodes (31): DropdownMenu(), DropdownMenuCheckboxItem(), DropdownMenuContent(), DropdownMenuTrigger(), useItineraryPlan(), CityField(), dateRange(), defaultLegSort (+23 more)

### Community 19 - "cityLabel"
Cohesion: 0.27
Nodes (27): PendingQueryProbe(), carrierLabel(), cityLabel(), departure(), duration(), money(), useOrderedFares(), fareInspectionItems() (+19 more)

### Community 20 - "views/index.tsx"
Cohesion: 0.16
Nodes (16): Card(), Table(), TableBody(), TableCaption(), TableCell(), TableHead(), TableHeader(), TableRow() (+8 more)

### Community 21 - "contracts/display-context.ts"
Cohesion: 0.08
Nodes (25): boundedFact, ComponentRef, ComponentRefSchema, componentRefValue, date, DisplayCell, displayCells, DisplayCellSchema (+17 more)

### Community 22 - "request-schema.ts"
Cohesion: 0.10
Nodes (21): {decision}, servers, CODEX_MODEL, CODEX_REASONING_EFFORT, date, ErrorOutput, id, MessageSchema (+13 more)

### Community 23 - "browser.ts"
Cohesion: 0.14
Nodes (20): base, benchmarkRows(), csvRows(), expected(), id, longTasks, Metric, percentile() (+12 more)

### Community 24 - "component.tsx"
Cohesion: 0.22
Nodes (12): Alert(), alertVariants, Skeleton(), controls, layouts, statuses, SubscribedCatalogNode(), useArtifact() (+4 more)

### Community 25 - "context.tsx"
Cohesion: 0.12
Nodes (22): addMinutes(), bindingCandidates(), CalendarDaysResult, CarrierFacetsResult, ComponentQueryOptions, ComponentQueryResult, defaultSort, FareHighlightsResult (+14 more)

### Community 26 - "present-boundary.tsx"
Cohesion: 0.17
Nodes (19): useTravelServices(), datasetBoundComponentNames, datasetBoundComponents, isDatasetBoundComponent(), isLegBoundPlannerComponent(), legBoundPlannerComponents, hasLaterAcceptedScene(), AcceptedSceneBindings() (+11 more)

### Community 27 - "display-context-provider.tsx"
Cohesion: 0.11
Nodes (19): DisplayContextProvider(), DisplayNodeProvider(), DisplayVisibilityProvider(), inspectionSource(), NodeContext, PublishDisplayInput, StoreContext, PublishingChild() (+11 more)

### Community 28 - "worker-client.ts"
Cohesion: 0.15
Nodes (12): BoundedQueryResult, QueryIR, scalar, WorkerRequest, WorkerResponse, WorkerResponseSchema, QueryResource, LocalQueryEngine (+4 more)

### Community 29 - "scene-completion.test.ts"
Cohesion: 0.15
Nodes (19): handleChat(), CODEX_DEVELOPER_INSTRUCTIONS, ChatRequest, currentContext, displayContext, fact, inspectInput, inspectOutput (+11 more)

### Community 30 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 31 - "snapshot-exporter.ts"
Cohesion: 0.16
Nodes (21): CompactArtifactSnapshot, ComponentBinding, OlderArtifactSummary, LookupPin, addMinutes(), bindingFor(), captureAgentContext(), capturePreparedContext() (+13 more)

### Community 32 - "codex-provider.ts"
Cohesion: 0.17
Nodes (13): codexDecision(), Decision, DecisionDelta, DecisionSchema, readString(), mocks, valid, InvalidModelOutputError (+5 more)

### Community 33 - "check-shadcn.mjs"
Cohesion: 0.15
Nodes (20): assistantInteractiveParts, attributesOf(), componentsPath, interactiveRoles, isDirectShadcnAsChild(), isProductionSource(), jsxName(), location() (+12 more)

### Community 34 - "useDisplayNode"
Cohesion: 0.28
Nodes (20): useTravelAction(), CarrierControl(), Control(), recordDisplayInteraction(), useDisplayNode(), usePublishDisplay(), Layout(), Status() (+12 more)

### Community 35 - "Acceptance Evidence"
Cohesion: 0.11
Nodes (20): Acceptance Evidence, API Pagination, Backend Commit b1c8912, Backend Test Suite, Browser Captures, Browser flow, Browser Flow Acceptance, Coverage Parser (+12 more)

### Community 36 - "Native Recursive Present Tree"
Cohesion: 0.10
Nodes (21): Backendless assistant-ui Compiler, Host Raw-tree Validation, Native A Compatibility Evidence, Native Recursive Present Tree, AssistantChatTransport Snapshot Transform, Calendar Arrangement, Compare Arrangement, Deterministic Browser Proof (+13 more)

### Community 37 - "runtime-provider.tsx"
Cohesion: 0.15
Nodes (13): normalizeToolContinuations(), scene, setup(), TestNode, exportedMessages(), GenerativeChat(), GenerativeChatProps, isUIMessage() (+5 more)

### Community 38 - "state/display-context.ts"
Cohesion: 0.11
Nodes (18): DISPLAY_CONTEXT_VERSION, DISPLAY_LIMITS, DisplayedFareFact, DisplayedFareFactSchema, DisplayLedgerEntrySchema, DisplayRepresentationSchema, FrozenDisplayContextSchema, InspectDisplayInput (+10 more)

### Community 39 - "persistence.ts"
Cohesion: 0.12
Nodes (7): ArtifactUIStateSchema, CONTRACT_VERSION, FareScopeSchema, descriptor, PersistedThread, ThreadConflictError, ThreadStorage

### Community 40 - "Server-Driven Generative UI Implementation Plan"
Cohesion: 0.11
Nodes (18): Acceptance criteria, Authoritative current state — 2026-10-08, Caller view, Contract sketch, Display ledger and next-turn context, Fixed server projections, Frozen query wire contract, Handback format (+10 more)

### Community 41 - "planning-tracker.tsx"
Cohesion: 0.18
Nodes (13): Dialog(), DialogClose(), DialogContent(), DialogDescription(), DialogTitle(), DialogTrigger(), artifactIds(), comparePlannedFares() (+5 more)

### Community 42 - "thread-shell.tsx"
Cohesion: 0.09
Nodes (8): Textarea(), assistantWorkingPuns, AssistantWorkingStatus(), partComponents, randomPunIndex(), suggestions, services, ThreadShell()

### Community 43 - "run-fare-selection-proof.mts"
Cohesion: 0.12
Nodes (14): ApiFare, CanonicalFare, cheapestCandidates, fareDateTime(), fastestCandidates, matchDisplayedFare(), money(), outputDir (+6 more)

### Community 44 - "Null-safe Query Predicates"
Cohesion: 0.12
Nodes (18): Benchmark Browser Module, Local Query Engine Benchmark Page, DuckDB NULL Semantics Documentation, Independent DuckDB Oracle, DuckDB Prepared Statements Documentation, Null-preserving Projection, Null-safe Query Predicates, Deterministic Null Sorting (+10 more)

### Community 45 - "resource-loader.ts"
Cohesion: 0.14
Nodes (15): CoverageRequest, CoverageRequestSchema, coverageKey(), FarePage, LoadedResource, PageInput, PageSource, stableRef() (+7 more)

### Community 46 - "main.tsx"
Cohesion: 0.13
Nodes (15): request(), exportAgentContext(), finish(), App(), artifactId, bridge, capture(), input (+7 more)

### Community 47 - "scripts"
Cohesion: 0.12
Nodes (17): scripts, agent:dev, benchmark:query, build, check:catalog, check:shadcn, dev, frontend:dev (+9 more)

### Community 48 - "SearchForm.jsx"
Cohesion: 0.21
Nodes (13): displayLocation(), editDistance(), isSubsequence(), LocationField(), handleKeyDown(), selectLocation(), normalizeText(), resolveLocation() (+5 more)

### Community 49 - "Booking Ownership per Logical Trip Leg"
Cohesion: 0.15
Nodes (16): Authoritative Current State, Booking Ownership per Logical Trip Leg, Complete Present Booking-Ownership Validator, Deterministic Booking Workflow Fixtures, Exact-Once Booking-Leg Coverage, FareCalendar Bound-Leg Booking Owner, MultiCityPlanGrid All-Leg Booking Owner, Ownership-Aware Cross-Message Supersession (+8 more)

### Community 50 - "LandingPage.jsx"
Cohesion: 0.19
Nodes (10): Icon(), paths, LandingPage(), offers, transportModes, Logo(), Badge(), badgeVariants (+2 more)

### Community 51 - "DisplayContextStore"
Cohesion: 0.12
Nodes (7): DisplayLedgerEntry, DisplayVisibility, FrozenDisplayContext, InputProvenance, SemanticInteraction, QueryGroupScope, DisplayContextStore

### Community 52 - "assertNoBulkData"
Cohesion: 0.16
Nodes (13): AgentContextEnvelopeSchema, CoverageSchema, QueryIRSchema, assertNoBulkData(), fareFields, forbidden, hasFareRowFields(), LEAKAGE_SENTINEL (+5 more)

### Community 53 - "run-state-proof.mjs"
Cohesion: 0.13
Nodes (12): /src/generative/data/fare-data-bridge.ts, /src/generative/state/persistence.ts, /src/generative/state/ui-state-store.ts, case0, errors, last, parts, requests (+4 more)

### Community 54 - "query-engine-fixture.ts"
Cohesion: 0.17
Nodes (9): DatasetManifest, DatasetManifestSchema, FareRowSchema, rows, fixture(), rows, boolean, createQueryEngineFixture() (+1 more)

### Community 55 - "browser-tools.ts"
Cohesion: 0.18
Nodes (12): InspectDisplayInputSchema, InspectDisplayOutputSchema, EditArtifactInputSchema, UICommandPatchSchema, UIStateRevision, QueryExecutionStateSchema, commandInputFields(), completeCommand() (+4 more)

### Community 56 - "chat-sessions.spec.ts"
Cohesion: 0.26
Nodes (10): alpha, beta, datasetIdFor(), dataStream(), mockGeneratedPlanner(), requestFor(), seedLegacySession(), seedSessions() (+2 more)

### Community 57 - "useProjection"
Cohesion: 0.18
Nodes (12): committedDatasetId(), committedResultKey(), useCalendarDays(), useCarrierFacets(), useDayFares(), useFareDayRepresentatives(), useFareHighlights(), useFareRows() (+4 more)

### Community 58 - "display-context.test.ts"
Cohesion: 0.18
Nodes (7): ComponentIdentitySchema, envelope(), QueryGroupScopeSchema, DisplayInspectionError, connectedFact(), fact(), inspectionItems

### Community 59 - "createWorkerQueryEngine"
Cohesion: 0.27
Nodes (8): abortError(), loadResource(), createLocalQueryEngine(), createWorkerQueryEngine(), receive(), request(), cancel(), QueryWorker

### Community 60 - "verify_pasted_coverage.py"
Cohesion: 0.44
Nodes (11): check_database(), main(), normalized(), pair(), parse_dash_line(), parse_manifest(), parse_to_line(), Path (+3 more)

### Community 61 - "Contributing Guide"
Cohesion: 0.31
Nodes (11): Pull Request Template, Pull Request Branch Target, Pull Request Verification, Contributing Guide, Branch Naming Convention, dev Branch, Focused Pull Requests, Hotfix Branch (+3 more)

### Community 62 - "Omio Generative UI Demo"
Cohesion: 0.20
Nodes (11): Deterministic Synthetic Timetable, Preserved Version 2 Fixture Policy, Query Groups Endpoint, Source-Bound Opaque Cursors, Synthetic Timetable Backend, Deterministic SQLite Fare Fixture, Local Signed-In Codex Model Agent, Native React Component Composition (+3 more)

### Community 63 - "Committed Display Ledger"
Cohesion: 0.24
Nodes (11): Aggregate Fare Strip Publisher, CheapestFastest Supplementary Comparison, Next-Turn Context Privacy Budget, Decouple Browsing Depth from Context Budget, Committed Display Ledger, Immutable Bounded Display Inspection, Immutable Fare Strip Page Publishers, Preserve Page Identity During Progressive Append (+3 more)

### Community 64 - "transport.ts"
Cohesion: 0.31
Nodes (6): context(), prepared(), createSnapshotTransport(), snapshotRequest(), messages, parseAgentContext()

### Community 65 - "snapshot-resources.test.ts"
Cohesion: 0.35
Nodes (10): createThreadPersistence(), parsePersistedThread(), cacheScope(), displayStore(), fare(), id, restoredContextFixture(), scope() (+2 more)

### Community 66 - "London to Paris Bus Option"
Cohesion: 0.18
Nodes (11): London to Paris Bus Option, Desktop Blue Fare Selection Partial Stream, Cheapest Fastest and Selected Trip Summary, Desktop Blue Fare Selection Completed Stream, Selected Bus Transport Filter, Mobile Blue Fare Selection Completed Stream, Current Changes Stream Completion, Mobile Sand Fare Selection Partial Stream (+3 more)

### Community 67 - "present-prefix.ts"
Cohesion: 0.24
Nodes (8): keys, names, scalarLimit(), scalars, scope, validatePresentPrefix(), registeredActions, registeredSelectors

### Community 68 - "Component Function Registry"
Cohesion: 0.20
Nodes (10): Component Function Registry, 49-Component Catalog Vocabulary, Child-Accepting Layout Containers, 49-Component Travel UI Vocabulary, Local Fare Filter Controls, MultiCityPlanGrid, Shared PlanningTracker Selection, Shared Catalog 1.1.0 (+2 more)

### Community 69 - "run.mjs"
Cohesion: 0.22
Nodes (7): agentPort, apiPort, children, env, start(), stop(), webPort

### Community 70 - "CATALOG_VERSION"
Cohesion: 0.22
Nodes (7): descriptors, legRefs, refs, hash, BookingOwnership, CATALOG_VERSION, ComponentDescriptor

### Community 71 - "query-engine.ts"
Cohesion: 0.29
Nodes (9): AllowedFareField, PredicateTree, compare(), defaults, executeQuery(), matches(), QueryLimits, QueryResources (+1 more)

### Community 72 - "Fixed Projection Union"
Cohesion: 0.22
Nodes (9): Fixed Projection Union, Source-Scoped Fare Lookup Endpoint, Fare Scope Manifest, Fixed Projection Boundary, Normalize Shifted Fare Scope Threshold, Bounded Ordered Route Legs, Source-Bound Opaque Cursor, Source-Bound Selected Fare Pins (+1 more)

### Community 73 - "Milestones and commit boundaries"
Cohesion: 0.22
Nodes (9): 0. Preserve the clean base and journal, 1. Prove fixed SQL projections, 2. Add query contracts, client, and coordinator, 3. Bind catalog components to semantic functions, 4. Add the display ledger and inspection capture, 5. Migrate the generative runtime and delete bulk preload, 6. Prove the first user-test render, 7. Refresh graphs and hand off (+1 more)

### Community 74 - "Completed Server-Driven Implementation"
Cohesion: 0.22
Nodes (9): Batching Query Coordinator, Use a Clean Managed Worktree, Completed Server-Driven Implementation, Delete Browser Bulk Preload, Preserve Classic Search API, Preserve Committed Output During Refresh, Server-Executed Fixed Query Functions, Use One Commit Steward (+1 more)

### Community 75 - "SearchForm"
Cohesion: 0.38
Nodes (5): SearchForm(), handlePlannerKeyDown(), startPlan(), submit(), submitPlan()

### Community 79 - "Canonical Catalog Descriptor"
Cohesion: 0.25
Nodes (8): Authored Nodes and Positional Props, Distinct Travel Catalog Primitives, Granular Component Semantics, Catalog Version 1.0.0, Canonical Catalog Descriptor, Generated Schemas and Model Documentation, Expanded Vocabulary Manifest Hash, Native Compiler-valid Toolkit

### Community 80 - "Progressive Fare Strip"
Cohesion: 0.29
Nodes (8): Bounded Vertical Fare Viewport, Deterministic Fixture Acceptance, Direct Trip Planning Fixture, Explicit Retry for Failed Fare Append, Keep Calendar Pagination Separate, Progressive Fare Strip, Reset Progressive Fares on Effective Requirement Change, Size Workspace by Sidebar Ownership

### Community 81 - "tool-supersession.test.ts"
Cohesion: 0.29
Nodes (3): ScenePart, SceneReplacementPredicate, Claim

### Community 82 - "Responsive Mobile Fare Selection"
Cohesion: 0.25
Nodes (8): Desktop Fare Selection Proof, Selected Fastest Flight, Selection and Tracker Consistency, Unselected Cheapest Bus, Responsive Mobile Fare Selection, Responsive Selection Continuity, Stacked Mobile Fare Cards, Stacked Mobile Planning Tracker

### Community 83 - "query-engine/package.json"
Cohesion: 0.29
Nodes (6): dependencies, @duckdb/duckdb-wasm, name, private, type, @duckdb/duckdb-wasm

### Community 84 - "smart-planner-handoff.ts"
Cohesion: 0.31
Nodes (6): openSmartPlanner(), HISTORY_LIMITS, SmartPlannerHandoff, storeEmptyChatHandoff(), storeSmartPlannerHandoff(), search

### Community 85 - "route-calendar.test.tsx"
Cohesion: 0.38
Nodes (5): dates(), fare(), fixed(), id, window

### Community 86 - "trip-planning-fixture.tsx"
Cohesion: 0.32
Nodes (5): TravelServices, artifactId, createTripPlanningFixtureTree(), TripPlanningFixture(), TripPlanningFixtureWorkflow

### Community 87 - "run-completion.mjs"
Cohesion: 0.29
Nodes (6): errors, last, requests, responses, started, timers

### Community 88 - "Repository Workflow"
Cohesion: 0.40
Nodes (5): Code Review Graph, Graph-Guided Source Verification, Graphify Knowledge Graph, Knowledge graphs, Repository Workflow

### Community 89 - "run.ts"
Cohesion: 0.33
Nodes (4): awaiting, completion, errors, measurements

### Community 90 - "Urban Travel Scene"
Cohesion: 0.40
Nodes (6): App Call-to-Action Background Illustration, Bus, Cityscape, Intermodal Mobility, Train, Urban Travel Scene

### Community 91 - "Transportation Landscape Hero"
Cohesion: 0.33
Nodes (6): Air Travel, Bus Travel, Ferry Travel, Multimodal Travel, Rail Travel, Transportation Landscape Hero

### Community 93 - "window-retry.test.tsx"
Cohesion: 0.40
Nodes (3): binding(), id, scope()

### Community 94 - "history-projection.ts"
Cohesion: 0.67
Nodes (5): currentMessage(), fits(), olderMessage(), projectNetworkHistory(), splitText()

### Community 95 - "query-engine.test.ts"
Cohesion: 0.33
Nodes (3): datasetId, resources, rows

### Community 96 - "package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 97 - "Download on the Apple App Store Badge"
Cohesion: 0.40
Nodes (5): Apple App Store, Download on the Apple App Store Badge, Apple Logo, iOS App Download, Trusted Platform Acquisition

### Community 98 - "Omio Reference Assets"
Cohesion: 0.40
Nodes (4): Live Landing Page Asset Provenance, Mobile App Call-to-Action Assets, Non-Production Visual Reference Use, Omio Reference Assets

### Community 100 - "Seven Day Lowest Fare Selector"
Cohesion: 0.40
Nodes (5): Seven Day Lowest Fare Selector, Bus Mode and Lowest Price Controls, Mode Table and Price Journey Time Plot, Desktop Blue Fare Comparison Partial Stream, Desktop Blue Fare Comparison Completed Stream

### Community 101 - "Signed-in Codex Provider Verification"
Cohesion: 0.40
Nodes (5): Signed-in Codex CLI Probe, Isolated Codex App-server Adapter, Shared Provider and Model Parity, Signed-in Codex Provider Verification, Server-owned Visible-turn Ledger

### Community 102 - "spike/toolkit.tsx"
Cohesion: 0.60
Nodes (3): SpikeCard(), SpikeSurface(), generative

### Community 104 - "Huawei AppGallery Download Badge"
Cohesion: 0.50
Nodes (4): Huawei AppGallery Download Badge, Huawei AppGallery, Mobile App Download, Platform Distribution Call to Action

### Community 105 - "Machine-Readable Link"
Cohesion: 0.50
Nodes (4): Cross-Device Handoff, Machine-Readable Link, Mobile App Acquisition, Mobile App QR Code

### Community 106 - "Compass Icon"
Cohesion: 0.50
Nodes (4): Compass Icon, Directional Navigation, Explore Destinations, Travel Discovery

### Community 109 - "Dated Bus Journey Timeline"
Cohesion: 0.50
Nodes (4): Flixbus Fare Option, Dated Bus Journey Timeline, Schematic London to Paris Route, Desktop Blue Route Timeline Partial Stream

### Community 111 - "Desktop Right Planning Tracker"
Cohesion: 0.50
Nodes (4): Cheapest and Fastest Fare Comparison, Demo Purchase Action, Desktop Right Planning Tracker, Selected Fare Purchase State

### Community 112 - "DuckDB WASM Engine"
Cohesion: 0.67
Nodes (4): DuckDB WASM Engine, Local Query Engine Benchmark, TypeScript Worker Engine, Top K Filter Group Join Correctness

### Community 113 - "Omio Travel Search Demo Page"
Cohesion: 0.67
Nodes (3): Multimodal Travel Search, Omio Travel Search Demo Page, React Application Entry

### Community 114 - "Google Play"
Cohesion: 0.67
Nodes (3): Android App Distribution, Google Play Download Badge, Google Play

### Community 115 - "Mobile Ticketing"
Cohesion: 1.00
Nodes (3): Mobile Ticketing, QR Code, Mobile Ticket QR Code Icon

### Community 116 - "Visual Scan Target"
Cohesion: 0.67
Nodes (3): QR Code Scanning, Scanner Frame, Visual Scan Target

### Community 117 - "Update and Refresh"
Cohesion: 0.67
Nodes (3): Synchronization, Update and Refresh, Updates Icon

### Community 118 - "Stacked Mobile Travel View"
Cohesion: 0.67
Nodes (3): Mobile Blue Fare Selection Partial Stream, Stacked Mobile Travel View, Sticky Chat Composer Over Travel Content

### Community 119 - "London to Paris Route Timeline"
Cohesion: 0.67
Nodes (3): London to Paris Route Timeline, Streamed Journey Story, Synthetic Fare Options

### Community 120 - "Local Fare Controls"
Cohesion: 0.67
Nodes (3): Cheapest and Fastest Summary, Local Fare Controls, Split Fare Comparison

### Community 121 - "Calendar First Fare Comparison"
Cohesion: 0.67
Nodes (3): Calendar First Fare Comparison, Local Refinement Controls, Mode and Duration Matrix

### Community 122 - "Journey Itinerary Timeline"
Cohesion: 0.67
Nodes (3): Journey Itinerary Timeline, London to Paris Route Map, Synthetic Total Per Passenger

### Community 123 - "Travel Choices"
Cohesion: 0.67
Nodes (3): Native Rendering Smoke Test, Train and Bus Options, Travel Choices

### Community 124 - "Per-leg Fare Selection"
Cohesion: 0.67
Nodes (3): London Paris Barcelona Multi-city Route, Per-leg Fare Selection, Sticky Synthetic Totals

### Community 125 - "Selected Bus Fare"
Cohesion: 0.67
Nodes (3): Persisted Fare View, Selected Bus Fare, Text-only State Summary

## Knowledge Gaps
- **634 isolated node(s):** `LocationSeed`, `ActiveScene`, `PresentScopeArtifact`, `PresentScopeDataset`, `BookingClaim` (+629 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createFareDataBridge()` connect `createFareDataBridge` to `createUIStateStore`, `fare-data-bridge.ts`, `runtime-provider.tsx`, `index.ts`, `fixed-projection-fixture.ts`, `routes.tsx`, `thread-shell.tsx`, `main.tsx`, `browser-tools.ts`, `request-schema.ts`, `browser.ts`, `trip-planning-fixture.tsx`, `scene-completion.test.ts`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `createUIStateStore()` connect `createUIStateStore` to `snapshot-resources.test.ts`, `fare-data-bridge.ts`, `runtime-provider.tsx`, `index.ts`, `action-router.ts`, `fixed-projection-fixture.ts`, `routes.tsx`, `thread-shell.tsx`, `persistence.ts`, `main.tsx`, `window-retry.test.tsx`, `route-calendar.test.tsx`, `request-schema.ts`, `trip-planning-fixture.tsx`, `browser-tools.ts`, `display-context.test.ts`, `scene-completion.test.ts`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `createFixedProjectionFixture()` connect `createUIStateStore` to `snapshot-resources.test.ts`, `fare-data-bridge.ts`, `index.ts`, `fixed-projection-fixture.ts`, `createFareDataBridge`, `persistence.ts`, `assertNoBulkData`, `route-calendar.test.tsx`, `window-retry.test.tsx`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `createUIStateStore()` (e.g. with `dispatch()` and `get()`) actually correct?**
  _`createUIStateStore()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `createFareDataBridge()` (e.g. with `executeGroup()` and `findBinding()`) actually correct?**
  _`createFareDataBridge()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `createActionRouter()` (e.g. with `.dispatch()` and `.get()`) actually correct?**
  _`createActionRouter()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `LocationSeed`, `ActiveScene`, `PresentScopeArtifact` to the rest of the system?**
  _634 weakly-connected nodes found - possible documentation gaps or missing edges._