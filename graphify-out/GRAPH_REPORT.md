# Graph Report - omio-gen-ui-demo  (2026-10-08)

## Corpus Check
- 6 files · ~273,076 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2048 nodes · 4719 edges · 161 communities (133 shown, 28 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 107 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- createUIStateStore
- ResultsPage.jsx
- routes.tsx
- ModelProcess
- query-engine.ts
- controls/index.tsx
- ThreadConflictError
- context.tsx
- snapshot-exporter.ts
- generate_db.py
- contracts/display-context.ts
- action-router.ts
- query-engine-fixture.ts
- server-query-client.ts
- ArtifactIdSchema
- fixed-projection-fixture.ts
- chat-sessions.spec.ts
- projection-coordinator.ts
- request-schema.ts
- codex-provider.ts
- seeds.py
- trip-planning/components.tsx
- QueryGroupsTestCase
- browser.ts
- state/display-context.ts
- chat-route.ts
- snapshot-resources.test.ts
- App.jsx
- planning-tracker.tsx
- projection-coordinator.test.ts
- run-fare-selection-proof.mts
- browser-tools.ts
- resource-loader.ts
- components.test.tsx
- server-query-client.live.test.ts
- fare-data-bridge.ts
- present-boundary.tsx
- app.py
- DisplayContextStore
- runtime-provider.tsx
- createDisplayContextStore
- display-context.test.ts
- ProjectionCoordinator
- verify_pasted_coverage.py
- component.tsx
- index.ts
- trip-planning-fixture.tsx
- component-functions.ts
- CATALOG_VERSION
- UIStateStore
- FareDataBridge
- query-groups.ts
- FareProjectionBridge
- query_groups.py
- selection-date.test.ts
- run-query-benchmark.mjs
- spike/toolkit.tsx
- collapsible.tsx
- run-live.mjs
- assertNoBulkData
- createFareDataBridge
- check-shadcn.mjs
- views/index.tsx
- thread-shell.tsx
- field.tsx
- run-state-proof.mjs
- api.js
- tree.ts
- _fail
- main.tsx
- present-prefix.ts
- run.mjs
- SearchForm
- ResultsPage
- LocationField
- toggle-group.tsx
- route-calendar.test.tsx
- run.ts
- classic-search.test.tsx
- window-retry.test.tsx
- Direct Trip Planning Fixture
- Fixed Projection Union
- Omio Reference Assets
- @assistant-ui/ai-sdk
- compilerOptions
- backend/__init__.py
- class-variance-authority
- radix-ui
- @testing-library/user-event
- playwright.config.ts
- install-graphify-hooks.sh
- test-graphify-hooks.sh
- dependencies
- run-browser-proof.mjs
- vite.config.js
- devDependencies
- components.json
- Acceptance Evidence
- Server-Driven Generative UI Implementation Plan
- scripts
- catalog.ts
- Milestones and commit boundaries
- request-schema.test.ts
- query-engine/package.json
- run-completion.mjs
- Repository Workflow
- package.json
- shadcn/ui MIT License
- Download on the Apple App Store Badge
- Seven Day Lowest Fare Selector
- Signed-in Codex Provider Verification
- Huawei AppGallery Download Badge
- Machine-Readable Link
- Compass Icon
- Dated Bus Journey Timeline
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
- Browser Selection and Deselection Proof
- No Saved State Migration or Reset
- Inclusive Local Query Semantics
- Bounded artifactRef Scalar
- Atomic Selection Status Region
- Native Renderer Selection Actions
- No Query Network or Model Turn
- Selected Fare Count Catalog Extension
- selectedFareIds Length Derivation
- Unresolved Artifact Fallback
- Native Recursive Present Tree
- Null-safe Query Predicates
- Committed Display Ledger
- Contributing Guide
- Omio Generative UI Demo
- London to Paris Bus Option
- Canonical Catalog Descriptor
- 49-Component Travel UI Vocabulary
- Responsive Mobile Fare Selection
- Urban Travel Scene
- Transportation Landscape Hero

## God Nodes (most connected - your core abstractions)
1. `createUIStateStore()` - 50 edges
2. `ArtifactIdSchema` - 48 edges
3. `createFareDataBridge()` - 44 edges
4. `createFixedProjectionFixture()` - 40 edges
5. `createActionRouter()` - 31 edges
6. `createDisplayContextStore()` - 26 edges
7. `DatasetIdSchema` - 25 edges
8. `cityLabel()` - 25 edges
9. `FareScope` - 24 edges
10. `useDisplayNode()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `49-Component Travel UI Vocabulary` --semantically_similar_to--> `Component Function Registry`  [INFERRED] [semantically similar]
  src/generative/catalog/generated/catalog.md → docs/server-driven-generative-ui-implementation-plan.md
- `Pull Request Template` --semantically_similar_to--> `Contributing Guide`  [INFERRED] [semantically similar]
  .github/pull_request_template.md → CONTRIBUTING.md
- `Deterministic SQLite Fare Fixture` --semantically_similar_to--> `Deterministic Synthetic Timetable`  [INFERRED] [semantically similar]
  README.md → backend/README.md
- `parseChatRequest()` --calls--> `parseAgentContext()`  [EXTRACTED]
  agent/request-schema.ts → src/generative/contracts/index.ts
- `handleChat()` --calls--> `assertNoBulkData()`  [EXTRACTED]
  agent/chat-route.ts → src/generative/contracts/privacy.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Fixed Query Execution Flow** — docs_server_driven_generative_ui_implementation_plan_component_function_registry, docs_server_driven_generative_ui_implementation_plan_batching_query_coordinator, docs_server_driven_generative_ui_implementation_plan_server_executed_fixed_queries, backend_readme_fixed_projection_union [EXTRACTED 1.00]
- **Committed Display Evidence Flow** — docs_server_driven_generative_ui_implementation_plan_display_ledger, docs_server_driven_generative_ui_implementation_plan_immutable_display_inspection, docs_server_driven_generative_ui_implementation_plan_context_privacy_budget, docs_server_driven_generative_ui_implementation_plan_source_bound_pins [EXTRACTED 1.00]
- **Source-Safe Result Identity** — docs_server_driven_generative_ui_implementation_plan_stable_logical_scope_identity, docs_server_driven_generative_ui_implementation_plan_source_bound_cursor, docs_server_driven_generative_ui_implementation_plan_source_bound_pins, docs_server_driven_generative_ui_implementation_plan_source_replacement_recovery [INFERRED 0.95]
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
- **London to Paris Journey Representations** — verification_generative_ui_a_browser_proof_2_1280_blue_partial_schematic_route, verification_generative_ui_a_browser_proof_2_1280_blue_partial_journey_timeline, verification_generative_ui_a_browser_proof_2_1280_blue_partial_fare_option [INFERRED 0.95]

## Communities (161 total, 28 thin omitted)

### Community 0 - "createUIStateStore"
Cohesion: 0.07
Nodes (42): TravelServices, PendingQueryProbe(), setup(), CatalogNode(), TravelProvider(), fixture(), loadScope(), setup() (+34 more)

### Community 1 - "ResultsPage.jsx"
Cohesion: 0.07
Nodes (33): NativeSelectProps, Icon(), Logo(), formatDuration(), formatPrice(), formatTime(), ResultCard(), Alert() (+25 more)

### Community 10 - "routes.tsx"
Cohesion: 0.13
Nodes (27): SessionHistory, SessionSummary, SessionSidebarProps, RegisterFlush, SessionConversationProps, ThreadPersistence, createLegacySessionSummary(), createSessionSummary() (+19 more)

### Community 11 - "query-engine.ts"
Cohesion: 0.11
Nodes (23): AllowedFareField, BoundedQueryResult, DatasetId, DatasetRevision, QueryIR, WorkerRequest, WorkerResponse, QueryLimits (+15 more)

### Community 12 - "controls/index.tsx"
Cohesion: 0.13
Nodes (25): PublishDisplayInput, QueryDisplaySource, DisplayRepresentation, EffectiveInputs, InputField, InspectDisplayItem, Checkbox(), useCarrierFacets() (+17 more)

### Community 16 - "context.tsx"
Cohesion: 0.11
Nodes (26): CalendarDaysResult, CarrierFacetsResult, ComponentQueryOptions, ComponentQueryResult, FareHighlightsResult, FarePageQueryOptions, FarePageResult, ModeSummaryResult (+18 more)

### Community 17 - "snapshot-exporter.ts"
Cohesion: 0.14
Nodes (25): CompactArtifactSnapshot, ComponentBinding, OlderArtifactSummary, LookupPin, ExportInput, PreparedCapture, SnapshotRecord, request() (+17 more)

### Community 18 - "generate_db.py"
Cohesion: 0.14
Nodes (18): DirectionalRoute, _batched(), _cell_weight(), _dates(), _direction(), directional_routes(), _fare_noise(), _fare_rows() (+10 more)

### Community 19 - "contracts/display-context.ts"
Cohesion: 0.08
Nodes (25): ComponentRef, DisplayCell, DisplayPayload, DisplayScope, InputOrigin, InspectDisplayError, OrderedFareRef, boundedFact (+17 more)

### Community 2 - "action-router.ts"
Cohesion: 0.10
Nodes (39): ArtifactUIState, BoundedFareFact, Coverage, FareId, ResourceKey, CoverageLoadStatus, legThreshold, ScheduledLeg (+31 more)

### Community 20 - "query-engine-fixture.ts"
Cohesion: 0.10
Nodes (16): DatasetManifest, FareRow, createSyntheticRows(), fixture(), createQueryEngineFixture(), CONTRACT_VERSION, DatasetManifestSchema, FareIdSchema (+8 more)

### Community 21 - "server-query-client.ts"
Cohesion: 0.10
Nodes (19): QueryErrorCode, Fetch, ServerQueryError, createServerQueryClient(), post(), queryError(), responseBody(), UIStateRevisionSchema (+11 more)

### Community 22 - "ArtifactIdSchema"
Cohesion: 0.10
Nodes (10): ArtifactErrorBoundary, PersistedThread, ThreadStorage, createArtifactStore(), bridgeWithStableResource(), fixture(), scope(), mount() (+2 more)

### Community 23 - "fixed-projection-fixture.ts"
Cohesion: 0.11
Nodes (18): FareLeg, QueryGroupResult, DateWindow, FareInput, FixedProjectionFixture, FixedProjectionFixtureOptions, RowSource, dates() (+10 more)

### Community 24 - "chat-sessions.spec.ts"
Cohesion: 0.13
Nodes (19): SessionFixture, coverageKey(), stableRef(), datasetIdFor(), dataStream(), mockGeneratedPlanner(), requestFor(), seedLegacySession() (+11 more)

### Community 25 - "projection-coordinator.ts"
Cohesion: 0.15
Nodes (21): QueryIntentIdentity, ActiveRequirement, Batch, ProjectionCoordinatorOptions, StoredSnapshot, canonical(), createProjectionCoordinator(), executeBatch() (+13 more)

### Community 26 - "request-schema.ts"
Cohesion: 0.10
Nodes (19): AgentContextEnvelope, parseChatRequest(), {decision}, servers, CODEX_MODEL, CODEX_REASONING_EFFORT, date, ErrorOutput (+11 more)

### Community 27 - "codex-provider.ts"
Cohesion: 0.16
Nodes (14): Decision, DecisionDelta, InvalidModelOutputError, ModelAttemptObservation, codexDecision(), readString(), withOneRepair(), validationReason() (+6 more)

### Community 28 - "seeds.py"
Cohesion: 0.16
Nodes (13): LocationSeed, RouteSeed, FixtureProvenanceTests, _all_routes(), _companies_for(), _distance_km(), _synthetic_route(), main() (+5 more)

### Community 3 - "trip-planning/components.tsx"
Cohesion: 0.07
Nodes (45): FareOrderKind, LocationOption, Plan, PlanLeg, TransportMode, DropdownMenu(), DropdownMenuCheckboxItem(), DropdownMenuContent() (+37 more)

### Community 33 - "browser.ts"
Cohesion: 0.16
Nodes (18): Metric, Report, Window, JsonScalar, benchmarkRows(), csvRows(), expected(), percentile() (+10 more)

### Community 35 - "state/display-context.ts"
Cohesion: 0.10
Nodes (19): DisplayedFareFact, InspectDisplayInput, InspectDisplayOutput, CapturedInspection, CapturedRecord, DisplayCaptureInput, DisplayInputs, DisplayInspectionFailureCode (+11 more)

### Community 38 - "chat-route.ts"
Cohesion: 0.22
Nodes (15): ChatRequest, SceneCompletion, handleChat(), loadLocationCatalog(), selectLocations(), parseToolInput(), ack(), acceptTurn() (+7 more)

### Community 40 - "snapshot-resources.test.ts"
Cohesion: 0.18
Nodes (14): FareScopeBinding, ServerFareDataBridge, createThreadPersistence(), parsePersistedThread(), cacheScope(), displayStore(), fare(), restoredContextFixture() (+6 more)

### Community 41 - "App.jsx"
Cohesion: 0.15
Nodes (12): SmartPlannerHandoff, App(), openSmartPlanner(), localDate(), LandingPage(), storeEmptyChatHandoff(), storeSmartPlannerHandoff(), DEFAULT_SEARCH (+4 more)

### Community 42 - "planning-tracker.tsx"
Cohesion: 0.18
Nodes (13): PlannedFare, PlannedFareResult, Dialog(), DialogClose(), DialogContent(), DialogDescription(), DialogTitle(), DialogTrigger() (+5 more)

### Community 44 - "projection-coordinator.test.ts"
Cohesion: 0.12
Nodes (11): QueryGroupsRequest, QueryGroupsResponse, ProjectionRequirement, datasetId, filters, group, revision, scope (+3 more)

### Community 45 - "run-fare-selection-proof.mts"
Cohesion: 0.12
Nodes (14): ApiFare, CanonicalFare, fareDateTime(), matchDisplayedFare(), money(), persistedRecord(), scene(), cheapestCandidates (+6 more)

### Community 46 - "browser-tools.ts"
Cohesion: 0.14
Nodes (15): DispatchResult, UICommand, UIStateRevision, UICommandPatch, parseToolOutput(), commandInputFields(), completeCommand(), createBrowserTools() (+7 more)

### Community 48 - "resource-loader.ts"
Cohesion: 0.16
Nodes (13): CoverageRequest, FarePage, LoadedResource, PageInput, PageSource, QueryWorker, abortError(), loadResource() (+5 more)

### Community 5 - "components.test.tsx"
Cohesion: 0.06
Nodes (27): FareItem, FareScope, Metadata, scopedFixture(), signal(), fare(), fixedRows(), scopeDates() (+19 more)

### Community 52 - "server-query-client.live.test.ts"
Cohesion: 0.12
Nodes (11): ProjectionFilters, ProjectionRequest, FareScopeManifestSchema, QueryGroupsRequestSchema, filters, item, scope, client (+3 more)

### Community 57 - "fare-data-bridge.ts"
Cohesion: 0.16
Nodes (11): FareScopeManifest, LookupPinsRequest, LookupPinsResponse, ProjectionResult, QueryGroupRequest, SelectedFarePin, CachedItem, PendingScope (+3 more)

### Community 59 - "present-boundary.tsx"
Cohesion: 0.24
Nodes (9): ScenePart, DisplayRenderNode, Props, useTravelServices(), hasLaterAcceptedScene(), AcceptedSceneBindings(), PresentBoundary(), withDisplayComponentIdentity() (+1 more)

### Community 6 - "app.py"
Cohesion: 0.14
Nodes (31): ApiError, SearchQuery, QueryApiError, BackendTestCase, _connect(), _date_value(), dispatch(), _fail() (+23 more)

### Community 60 - "DisplayContextStore"
Cohesion: 0.15
Nodes (5): FrozenDisplayContext, InputProvenance, SemanticInteraction, QueryGroupScope, DisplayContextStore

### Community 62 - "runtime-provider.tsx"
Cohesion: 0.26
Nodes (6): GenerativeChatProps, normalizeToolContinuations(), exportedMessages(), GenerativeChat(), isUIMessage(), LocalToolStatus()

### Community 63 - "createDisplayContextStore"
Cohesion: 0.18
Nodes (9): TestNode, DisplayLedgerEntry, DisplayVisibility, setup(), clone(), createDisplayContextStore(), displayFareIds(), emptyContext() (+1 more)

### Community 64 - "display-context.test.ts"
Cohesion: 0.18
Nodes (7): DisplayInspectionError, envelope(), connectedFact(), fact(), ComponentIdentitySchema, QueryGroupScopeSchema, inspectionItems

### Community 65 - "ProjectionCoordinator"
Cohesion: 0.18
Nodes (4): ProjectionResultSnapshot, QueryExecutionState, ResultKey, ProjectionCoordinator

### Community 66 - "verify_pasted_coverage.py"
Cohesion: 0.44
Nodes (11): Route, check_database(), main(), normalized(), pair(), parse_dash_line(), parse_manifest(), parse_to_line() (+3 more)

### Community 69 - "component.tsx"
Cohesion: 0.25
Nodes (8): WidgetProps, ComponentIdentity, Skeleton(), SubscribedCatalogNode(), SelectedFareCount(), controls, layouts, statuses

### Community 7 - "index.ts"
Cohesion: 0.06
Nodes (37): DatasetFieldManifest, ExecutionGuard, LegThresholdSummary, PredicateTree, QueryValue, StayAllocation, TravelFilters, ValidatedQueryIR (+29 more)

### Community 73 - "trip-planning-fixture.tsx"
Cohesion: 0.27
Nodes (4): PresentNode, getSceneMetadata(), validatePresentTree(), artifactId

### Community 76 - "component-functions.ts"
Cohesion: 0.22
Nodes (5): CatalogComponentName, ComponentFunctionDeclaration, ComponentFunction, componentFunctions, none

### Community 77 - "CATALOG_VERSION"
Cohesion: 0.25
Nodes (6): ComponentDescriptor, descriptors, legRefs, refs, hash, CATALOG_VERSION

### Community 78 - "UIStateStore"
Cohesion: 0.22
Nodes (3): ArtifactId, UIStateStore, deferredReleases

### Community 8 - "query-groups.ts"
Cohesion: 0.05
Nodes (39): FareSource, QueryErrorResponse, QueryResultIdentity, artifactId, CalendarDaysRequestSchema, CalendarDaysResultSchema, CarrierFacetsRequestSchema, CarrierFacetsResultSchema (+31 more)

### Community 9 - "query_groups.py"
Cohesion: 0.19
Nodes (35): FareSourceShape, _available_date_window(), _calendar_days(), _canonical(), _carrier_facets(), _company_ids(), _cursor_hash(), _cursor_predicate() (+27 more)

### Community 91 - "selection-date.test.ts"
Cohesion: 0.33
Nodes (6): QueryFareSelectionScope, fixture(), item(), ResultKeySchema, dates, id

### Community 105 - "spike/toolkit.tsx"
Cohesion: 0.60
Nodes (3): SpikeCard(), SpikeSurface(), generative

### Community 111 - "collapsible.tsx"
Cohesion: 0.50
Nodes (3): Collapsible(), CollapsibleContent(), CollapsibleTrigger()

### Community 30 - "assertNoBulkData"
Cohesion: 0.18
Nodes (15): currentMessage(), fits(), olderMessage(), projectNetworkHistory(), splitText(), context(), prepared(), createSnapshotTransport() (+7 more)

### Community 31 - "createFareDataBridge"
Cohesion: 0.19
Nodes (21): createFareDataBridge(), assertActive(), executeGroup(), fetchScope(), findBinding(), findBindingForScope(), findCachedFare(), getBinding() (+13 more)

### Community 34 - "check-shadcn.mjs"
Cohesion: 0.15
Nodes (20): attributesOf(), isDirectShadcnAsChild(), isProductionSource(), jsxName(), location(), main(), readJson(), scanJsx() (+12 more)

### Community 4 - "views/index.tsx"
Cohesion: 0.15
Nodes (43): Table(), TableBody(), TableCaption(), TableCell(), TableHead(), TableHeader(), TableRow(), carrierLabel() (+35 more)

### Community 43 - "thread-shell.tsx"
Cohesion: 0.13
Nodes (8): Textarea(), AssistantWorkingStatus(), randomPunIndex(), ThreadShell(), assistantWorkingPuns, partComponents, suggestions, services

### Community 51 - "field.tsx"
Cohesion: 0.15
Nodes (6): Field(), FieldLegend(), FieldSet(), Label(), Separator(), fieldVariants

### Community 53 - "run-state-proof.mjs"
Cohesion: 0.13
Nodes (12): /src/generative/data/fare-data-bridge.ts, /src/generative/state/persistence.ts, /src/generative/state/ui-state-store.ts, case0, errors, last, parts, requests (+4 more)

### Community 54 - "api.js"
Cohesion: 0.22
Nodes (13): buildSearchUrl(), displayLocation(), getJson(), locationValue(), minutesFromDuration(), normalizeLocations(), normalizeSearch(), normalizeTrip() (+5 more)

### Community 56 - "tree.ts"
Cohesion: 0.18
Nodes (10): isDatasetBoundComponent(), isLegBoundPlannerComponent(), prunePresentTree(), LEAKAGE_SENTINEL, componentKey, layouts, names, nodeSchema (+2 more)

### Community 58 - "_fail"
Cohesion: 0.45
Nodes (13): _date(), _fail(), _integer(), _object(), _parse_filters(), parse_lookup_request(), _parse_projection(), parse_query_groups_request() (+5 more)

### Community 61 - "main.tsx"
Cohesion: 0.17
Nodes (11): App(), resume(), artifactId, bridge, input, requests, root, scenes (+3 more)

### Community 71 - "present-prefix.ts"
Cohesion: 0.24
Nodes (8): scalarLimit(), validatePresentPrefix(), keys, names, scalars, scope, registeredActions, registeredSelectors

### Community 72 - "run.mjs"
Cohesion: 0.22
Nodes (7): start(), stop(), agentPort, apiPort, children, env, webPort

### Community 75 - "SearchForm"
Cohesion: 0.28
Nodes (7): normalizeText(), resolveLocation(), SearchForm(), handlePlannerKeyDown(), startPlan(), submit(), submitPlan()

### Community 87 - "ResultsPage"
Cohesion: 0.29
Nodes (4): sortTrips(), dateSequence(), formatDate(), ResultsPage()

### Community 88 - "LocationField"
Cohesion: 0.33
Nodes (5): editDistance(), isSubsequence(), LocationField(), handleKeyDown(), selectLocation()

### Community 89 - "toggle-group.tsx"
Cohesion: 0.43
Nodes (5): ToggleGroup(), ToggleGroupItem(), Toggle(), ToggleGroupContext, toggleVariants

### Community 90 - "route-calendar.test.tsx"
Cohesion: 0.38
Nodes (5): dates(), fare(), fixed(), id, window

### Community 94 - "run.ts"
Cohesion: 0.33
Nodes (4): awaiting, completion, errors, measurements

### Community 97 - "classic-search.test.tsx"
Cohesion: 0.40
Nodes (3): response(), trip(), summaries

### Community 98 - "window-retry.test.tsx"
Cohesion: 0.40
Nodes (3): binding(), scope(), id

### Community 107 - "Direct Trip Planning Fixture"
Cohesion: 0.50
Nodes (4): Validation Matrix, Deterministic Fixture Acceptance, Direct Trip Planning Fixture, Size Workspace by Sidebar Ownership

### Community 82 - "Fixed Projection Union"
Cohesion: 0.25
Nodes (8): Component Function Registry, Fixed Projection Union, 49-Component Catalog Vocabulary, Fare Scope Manifest, Bounded Ordered Route Legs, Stable Logical Scope Identity, Fixed Projection Boundary, Normalize Shifted Fare Scope Threshold

### Community 101 - "Omio Reference Assets"
Cohesion: 0.40
Nodes (4): Live Landing Page Asset Provenance, Mobile App Call-to-Action Assets, Omio Reference Assets, Non-Production Visual Reference Use

### Community 13 - "compilerOptions"
Cohesion: 0.06
Nodes (30): compilerOptions, allowJs, baseUrl, checkJs, esModuleInterop, jsx, lib, module (+22 more)

### Community 14 - "dependencies"
Cohesion: 0.07
Nodes (29): dependencies, ai, @ai-sdk/react, assistant-stream, @assistant-ui/react, @assistant-ui/react-generative-ui, cn, lucide-react (+21 more)

### Community 15 - "devDependencies"
Cohesion: 0.07
Nodes (28): devDependencies, @assistant-ui/vite, jsdom, @playwright/test, @testing-library/dom, @testing-library/jest-dom, @testing-library/react, tsx (+20 more)

### Community 29 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 36 - "Acceptance Evidence"
Cohesion: 0.11
Nodes (20): Browser flow, HTTP API, API Pagination, Backend Commit b1c8912, Backend Test Suite, Browser Captures, Browser Flow Acceptance, Coverage Parser (+12 more)

### Community 39 - "Server-Driven Generative UI Implementation Plan"
Cohesion: 0.10
Nodes (19): Acceptance criteria, Authoritative current state — 2026-10-08, Caller view, Contract sketch, Display ledger and next-turn context, Fixed server projections, Frozen query wire contract, Handback format (+11 more)

### Community 50 - "scripts"
Cohesion: 0.12
Nodes (17): scripts, agent:dev, benchmark:query, build, check:catalog, check:shadcn, dev, frontend:dev (+9 more)

### Community 55 - "catalog.ts"
Cohesion: 0.18
Nodes (11): catalogDescriptors, catalogHash, catalogVersion, componentNames, legBoundPropsSchema, nodePropsSchema, sharedPropsSchema, datasetBoundComponentNames (+3 more)

### Community 74 - "Milestones and commit boundaries"
Cohesion: 0.22
Nodes (9): 0. Preserve the clean base and journal, 1. Prove fixed SQL projections, 2. Add query contracts, client, and coordinator, 3. Bind catalog components to semantic functions, 4. Add the display ledger and inspection capture, 5. Migrate the generative runtime and delete bulk preload, 6. Prove the first user-test render, 7. Refresh graphs and hand off (+1 more)

### Community 81 - "request-schema.test.ts"
Cohesion: 0.25
Nodes (7): currentContext, displayContext, fact, inspectInput, inspectOutput, request, LIMITS

### Community 86 - "query-engine/package.json"
Cohesion: 0.29
Nodes (6): dependencies, @duckdb/duckdb-wasm, name, private, type, @duckdb/duckdb-wasm

### Community 92 - "run-completion.mjs"
Cohesion: 0.29
Nodes (6): errors, last, requests, responses, started, timers

### Community 93 - "Repository Workflow"
Cohesion: 0.40
Nodes (5): Knowledge graphs, Code Review Graph, Graphify Knowledge Graph, Repository Workflow, Graph-Guided Source Verification

### Community 99 - "package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 100 - "Download on the Apple App Store Badge"
Cohesion: 0.40
Nodes (5): Apple App Store, Apple Logo, iOS App Download, Download on the Apple App Store Badge, Trusted Platform Acquisition

### Community 103 - "Seven Day Lowest Fare Selector"
Cohesion: 0.40
Nodes (5): Seven Day Lowest Fare Selector, Bus Mode and Lowest Price Controls, Mode Table and Price Journey Time Plot, Desktop Blue Fare Comparison Partial Stream, Desktop Blue Fare Comparison Completed Stream

### Community 104 - "Signed-in Codex Provider Verification"
Cohesion: 0.40
Nodes (5): Signed-in Codex CLI Probe, Isolated Codex App-server Adapter, Server-owned Visible-turn Ledger, Signed-in Codex Provider Verification, Shared Provider and Model Parity

### Community 108 - "Huawei AppGallery Download Badge"
Cohesion: 0.50
Nodes (4): Huawei AppGallery, Mobile App Download, Huawei AppGallery Download Badge, Platform Distribution Call to Action

### Community 109 - "Machine-Readable Link"
Cohesion: 0.50
Nodes (4): Machine-Readable Link, Mobile App Acquisition, Mobile App QR Code, Cross-Device Handoff

### Community 110 - "Compass Icon"
Cohesion: 0.50
Nodes (4): Directional Navigation, Travel Discovery, Compass Icon, Explore Destinations

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
Nodes (3): Multimodal Travel Search, React Application Entry, Omio Travel Search Demo Page

### Community 117 - "Google Play"
Cohesion: 0.67
Nodes (3): Android App Distribution, Google Play, Google Play Download Badge

### Community 118 - "Mobile Ticketing"
Cohesion: 1.00
Nodes (3): Mobile Ticketing, QR Code, Mobile Ticket QR Code Icon

### Community 119 - "Visual Scan Target"
Cohesion: 0.67
Nodes (3): QR Code Scanning, Visual Scan Target, Scanner Frame

### Community 120 - "Update and Refresh"
Cohesion: 0.67
Nodes (3): Synchronization, Update and Refresh, Updates Icon

### Community 121 - "Stacked Mobile Travel View"
Cohesion: 0.67
Nodes (3): Stacked Mobile Travel View, Sticky Chat Composer Over Travel Content, Mobile Blue Fare Selection Partial Stream

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

### Community 37 - "Native Recursive Present Tree"
Cohesion: 0.10
Nodes (21): A Compatibility Main Module, Backendless assistant-ui Compiler, Native Recursive Present Tree, AssistantChatTransport Snapshot Transform, Calendar Arrangement, Compare Arrangement, Deterministic Browser Proof, Journey Arrangement (+13 more)

### Community 47 - "Null-safe Query Predicates"
Cohesion: 0.12
Nodes (18): Benchmark Browser Module, Independent DuckDB Oracle, Null-preserving Projection, Deterministic Null Sorting, Nullable Manifest Contract, Query Engine Domain Verification Suite, DuckDB-Wasm Benchmark Candidate, Python GET API Verification (+10 more)

### Community 49 - "Committed Display Ledger"
Cohesion: 0.13
Nodes (17): Source-Scoped Fare Lookup Endpoint, Batching Query Coordinator, Completed Server-Driven Implementation, Next-Turn Context Privacy Budget, Committed Display Ledger, Immutable Bounded Display Inspection, Server-Executed Fixed Query Functions, Source-Bound Opaque Cursor (+9 more)

### Community 67 - "Contributing Guide"
Cohesion: 0.31
Nodes (11): Pull Request Branch Target, Pull Request Verification, Branch Naming Convention, dev Branch, Focused Pull Requests, Hotfix Branch, main Branch, Release Branch (+3 more)

### Community 68 - "Omio Generative UI Demo"
Cohesion: 0.20
Nodes (11): Deterministic Synthetic Timetable, Query Groups Endpoint, Source-Bound Opaque Cursors, Deterministic SQLite Fare Fixture, Local Signed-In Codex Model Agent, Native React Component Composition, Persisted Conversation and Display State, Three-Process Local Runtime (+3 more)

### Community 70 - "London to Paris Bus Option"
Cohesion: 0.18
Nodes (11): London to Paris Bus Option, Cheapest Fastest and Selected Trip Summary, Selected Bus Transport Filter, Current Changes Stream Completion, Bus Fare and Selected Trip Interface, Sand and Green Travel Theme, Desktop Blue Fare Selection Partial Stream, Desktop Blue Fare Selection Completed Stream (+3 more)

### Community 83 - "Canonical Catalog Descriptor"
Cohesion: 0.25
Nodes (8): Catalog Version 1.0.0, Canonical Catalog Descriptor, Generated Schemas and Model Documentation, Expanded Vocabulary Manifest Hash, Native Compiler-valid Toolkit, Distinct Travel Catalog Primitives, Authored Nodes and Positional Props, Granular Component Semantics

### Community 84 - "49-Component Travel UI Vocabulary"
Cohesion: 0.25
Nodes (8): Child-Accepting Layout Containers, 49-Component Travel UI Vocabulary, Local Fare Filter Controls, MultiCityPlanGrid, Shared PlanningTracker Selection, Stable Logical Leg Identity, Shared Catalog and Paused-stream Proof, Shared Catalog 1.1.0

### Community 85 - "Responsive Mobile Fare Selection"
Cohesion: 0.25
Nodes (8): Selected Fastest Flight, Unselected Cheapest Bus, Stacked Mobile Fare Cards, Stacked Mobile Planning Tracker, Desktop Fare Selection Proof, Responsive Mobile Fare Selection, Selection and Tracker Consistency, Responsive Selection Continuity

### Community 95 - "Urban Travel Scene"
Cohesion: 0.40
Nodes (6): Bus, Cityscape, Train, Urban Travel Scene, App Call-to-Action Background Illustration, Intermodal Mobility

### Community 96 - "Transportation Landscape Hero"
Cohesion: 0.33
Nodes (6): Air Travel, Bus Travel, Ferry Travel, Multimodal Travel, Rail Travel, Transportation Landscape Hero

## Knowledge Gaps
- **620 isolated node(s):** `LocationSeed`, `DisplayCell`, `DisplayPayload`, `DisplayScope`, `InputOrigin` (+615 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createFareDataBridge()` connect `createFareDataBridge` to `createUIStateStore`, `browser.ts`, `components.test.tsx`, `chat-route.ts`, `trip-planning-fixture.tsx`, `routes.tsx`, `thread-shell.tsx`, `browser-tools.ts`, `snapshot-exporter.ts`, `server-query-client.ts`, `ArtifactIdSchema`, `fixed-projection-fixture.ts`, `fare-data-bridge.ts`, `request-schema.ts`, `main.tsx`, `projection-coordinator.ts`, `createDisplayContextStore`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `createProjectionCoordinator()` connect `projection-coordinator.ts` to `fare-data-bridge.ts`, `projection-coordinator.test.ts`, `createFareDataBridge`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `DatasetId` connect `query-engine.ts` to `browser.ts`, `action-router.ts`, `index.ts`, `UIStateStore`, `context.tsx`, `snapshot-exporter.ts`, `query-engine-fixture.ts`, `ArtifactIdSchema`, `fare-data-bridge.ts`, `projection-coordinator.ts`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `createUIStateStore()` (e.g. with `dispatch()` and `get()`) actually correct?**
  _`createUIStateStore()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `createFareDataBridge()` (e.g. with `executeGroup()` and `findBinding()`) actually correct?**
  _`createFareDataBridge()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `createActionRouter()` (e.g. with `.dispatch()` and `.get()`) actually correct?**
  _`createActionRouter()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `LocationSeed`, `DisplayCell`, `DisplayPayload` to the rest of the system?**
  _620 weakly-connected nodes found - possible documentation gaps or missing edges._