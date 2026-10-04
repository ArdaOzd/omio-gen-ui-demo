# Graph Report - omio-gen-ui-demo  (2026-10-05)

## Corpus Check
- 288 files · ~682,533 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1896 nodes · 3656 edges · 164 communities (137 shown, 27 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 110 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `967de22f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- app.py
- ResultsPage.jsx
- createFareDataBridge
- component.tsx
- verify-handlers.mjs
- snapshot-exporter.ts
- Shared scalar catalog contract
- renderer.tsx
- Repository details
- catalog-stories/spike/main.tsx
- index.ts
- context.tsx
- persistence.test.ts
- fare-data-bridge.ts
- Source document
- compilerOptions
- transport.ts
- chat-route.ts
- scene-completion.test.ts
- run-matrix.mjs
- b/toolkit.tsx
- chat-continuation.test.ts
- Source document
- devDependencies
- dependencies
- worker-client.ts
- matrix.mjs
- browser.ts
- a/toolkit.tsx
- Acceptance Evidence
- package.mjs
- framework-compatibility.md
- routes.tsx
- task-gates.mjs
- Current generative-ui-ab-ledger document
- scripts
- validate-program.ts
- source-analysis.mjs
- request-schema.ts
- library.tsx
- Generative UI Feature Fit Rubric
- resume-followup.mjs
- runtime-provider.tsx
- registration-lifecycle.test.ts
- Source document
- a/spike/main.tsx
- openui-runtime.test.tsx
- run-state-proof.mjs
- semantic-gates.mjs
- form.mjs
- verify-workflow.mjs
- Browser-local generative travel UI decision
- verify_pasted_coverage.py
- Contributing Guide
- Generative travel UI A/B implementation plan
- catalog-extension/spike/main.tsx
- Current comparison-decision document
- scripts/run.mjs
- London to Paris synthetic fare-list view
- London to Paris synthetic fare-list view
- London to Paris synthetic fare-list view
- Calendar, comparison and fare-list view
- Calendar, comparison and fare-list view
- Calendar, comparison and fare-list view
- Route, timeline and fare-list view
- Route, timeline and fare-list view
- Route, timeline and fare-list view
- verify-conditions.mjs
- generative-ui-ab-implementation-plan.md
- query-engine.ts
- study.tsx
- Selection-count view within a conversation
- Phased implementation DAG
- continuation-history.test.ts
- verify-timeline.mjs
- query-engine/package.json
- Current generative-ui-ab-implementation-plan document
- Shared architecture
- Current browser-local-generative-ui-decision document
- Current generative-ui-resources document
- catalog-stories/tsconfig.json
- descriptors.ts
- run-environment.mjs
- QueryWorker
- run-completion.mjs
- ModelProcess
- Repository Workflow
- run.ts
- Synthetic Timetable Backend
- Version B: agent-authored reactive wiring
- Alternatives and tradeoffs
- Urban Travel Scene
- Transportation Landscape Hero
- Generative UI repositories and patterns for the Omio demo
- catalog-stories/run-browser.mjs
- Source document
- location-catalog.ts
- Selected fare count catalog extension
- Generative UI implementation ledger
- A/B comparison protocol
- Verification strategy
- Swarm, worktree, commit, and PR protocol
- Version A: assistant-ui component composition
- run-multicity-proof.mts
- package.json
- Download on the Apple App Store Badge
- snapshot-resources.test.ts
- run-query-benchmark.mjs
- spike/toolkit.tsx
- Omio Reference Assets
- catalog.test.tsx
- Original checkout LOCAL alignment
- Browser query engine decision
- install-graphify-hooks.sh
- test-graphify-hooks.sh
- Historical travel interface capture
- Historical travel interface capture
- Historical travel interface capture
- Historical travel interface capture
- Historical travel interface capture
- Historical travel interface capture
- Huawei AppGallery Download Badge
- Machine-Readable Link
- Compass Icon
- a/run-live.mjs
- Local query engine benchmark report
- Study continuation at requested stop
- Distinct travel catalog primitives
- Google Play
- Mobile Ticketing
- Visual Scan Target
- Update and Refresh
- b/run-live.mjs
- verify-availability.py
- @assistant-ui/vite
- backend/__init__.py
- query-null-semantics.md
- @testing-library/react
- vitest
- playwright.config.ts
- catalog.md
- run-browser-proof.mjs
- replay-live.mjs
- catalog-extension/README.md
- catalog-extension/run-browser.mjs
- Selected fare count spike mount
- catalog-stories/README.md
- Responsive story mount
- study/README.md
- review/README.md
- vite.config.js

## God Nodes (most connected - your core abstractions)
1. `createFareDataBridge()` - 54 edges
2. `createUIStateStore()` - 44 edges
3. `Shared scalar catalog contract` - 42 edges
4. `ArtifactIdSchema` - 41 edges
5. `assertNoBulkData()` - 27 edges
6. `createActionRouter()` - 23 edges
7. `FareRowSchema` - 21 edges
8. `ReactiveScene()` - 20 edges
9. `cellRun()` - 19 edges
10. `parseQuery()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `Pull Request Template` --semantically_similar_to--> `Contributing Guide`  [INFERRED] [semantically similar]
  .github/pull_request_template.md → CONTRIBUTING.md
- `capture()` --calls--> `exportAgentContext()`  [EXTRACTED]
  verification/generative-ui/a/spike/main.tsx → src/generative/state/snapshot-exporter.ts
- `transport` --calls--> `assertNoBulkData()`  [EXTRACTED]
  verification/generative-ui/catalog-stories/spike/main.tsx → src/generative/contracts/privacy.ts
- `handleChat()` --calls--> `assertNoBulkData()`  [EXTRACTED]
  agent/chat-route.ts → src/generative/contracts/privacy.ts
- `handleChat()` --calls--> `validatePresentTree()`  [EXTRACTED]
  agent/chat-route.ts → src/generative/variants/a/tree.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Authoritative Conversational Planner Flow** — docs_research_interactive_travel_ui_evaluation_travelplan, docs_research_interactive_travel_ui_evaluation_direct_command_flow, docs_research_interactive_travel_ui_evaluation_pricequote, docs_research_interactive_travel_ui_evaluation_conversationartifact, docs_research_interactive_travel_ui_evaluation_recommended_architecture [EXTRACTED 1.00]
- **Dual-Graph Repository Analysis** — agents_repository_workflow, agents_code_review_graph, agents_graphify_knowledge_graph, agents_graph_guided_source_verification [EXTRACTED 1.00]
- **Acceptance Verification Layers** — verification_acceptance_database_source_coverage, verification_acceptance_http_api_acceptance, verification_acceptance_browser_flow_acceptance [EXTRACTED 1.00]
- **Source Coverage Contract Verification** — verification_acceptance_generated_sqlite_database, verification_acceptance_coverage_parser, verification_acceptance_backend_test_suite, verification_acceptance_source_contract [EXTRACTED 1.00]
- **App Call-to-Action Intermodal Scene** — public_assets_omio_app_background_app_cta_background, public_assets_omio_app_background_urban_travel_scene, public_assets_omio_app_background_bus, public_assets_omio_app_background_train, public_assets_omio_app_background_cityscape [INFERRED 0.75]
- **Multimodal Passenger Transport** — public_assets_omio_hero_air_travel, public_assets_omio_hero_rail_travel, public_assets_omio_hero_bus_travel, public_assets_omio_hero_ferry_travel [INFERRED 0.85]
- **Semantic Travel Component Catalog** — docs_research_interactive_travel_ui_evaluation_semantic_vocabulary, docs_research_interactive_travel_ui_evaluation_travelplan, docs_research_interactive_travel_ui_evaluation_travelleg, docs_research_interactive_travel_ui_evaluation_pricequote [INFERRED 0.95]
- **Synthetic Multimodal Search Demo** — backend_readme_synthetic_timetable_backend, backend_readme_deterministic_synthetic_timetable, backend_readme_timetable_search_api, index_omio_travel_search_demo, index_multimodal_travel_search [INFERRED 0.95]

## Communities (164 total, 27 thin omitted)

### Community 0 - "app.py"
Cohesion: 0.06
Nodes (62): ApiError, _connect(), _date_value(), dispatch(), _fail(), get_locations(), get_metadata(), _integer() (+54 more)

### Community 1 - "ResultsPage.jsx"
Cohesion: 0.06
Nodes (44): buildSearchUrl(), displayLocation(), getJson(), locationValue(), minutesFromDuration(), MODE_ORDER, modes, normalizeLocations() (+36 more)

### Community 2 - "createFareDataBridge"
Cohesion: 0.09
Nodes (34): request(), ArtifactErrorBoundary, id, DatasetManifest, FareId, createFareDataBridge(), fixture(), rows (+26 more)

### Community 3 - "component.tsx"
Cohesion: 0.15
Nodes (40): controls, layouts, statuses, carrierLabel(), cityLabel(), departure(), duration(), money() (+32 more)

### Community 4 - "verify-handlers.mjs"
Cohesion: 0.08
Nodes (28): /src/generative/data/fare-data-bridge.ts, /src/generative/contracts/index.ts, /src/generative/state/persistence.ts, /src/generative/contracts/privacy.ts, captured, diagnostics, errors, failed (+20 more)

### Community 5 - "snapshot-exporter.ts"
Cohesion: 0.26
Nodes (11): AgentContextEnvelope, BoundedFareFact, CompactArtifactSnapshot, OlderArtifactSummary, captureAgentContext(), envelope(), exportAgentContext(), ExportInput (+3 more)

### Community 6 - "Shared scalar catalog contract"
Cohesion: 0.04
Nodes (45): Append-only B positional schema, ArtifactSkeleton, Callout, Canonical catalog identity, Carousel, CarrierFilter, CheapestFastest, CitySequence (+37 more)

### Community 7 - "renderer.tsx"
Cohesion: 0.10
Nodes (25): TravelProvider(), id, setup(), fixture(), names, id, request, artifactId (+17 more)

### Community 8 - "Repository details"
Cohesion: 0.14
Nodes (14): 10. vercel-labs/json-render, 11. GenerativeUI/GenerativeUI.github.io, 12. ant-design/x, 13. thesysdev/openui, 1. CopilotKit/generative-ui, 2. CopilotKit/CopilotKit, 3. assistant-ui/assistant-ui, 4. vercel/ai (+6 more)

### Community 9 - "catalog-stories/spike/main.tsx"
Cohesion: 0.06
Nodes (36): CoverageLoadStatus, Coverage, empty, emptyRouteStoryNames, explicitStates, queryStoryNames, selectedFactStoryNames, storyInventory (+28 more)

### Community 10 - "index.ts"
Cohesion: 0.06
Nodes (41): ArtifactId, ArtifactIdSchema, ArtifactUIStateSchema, CompactArtifactSnapshotSchema, CompactSummarySchema, Coverage, CoverageRequest, DatasetFieldManifest (+33 more)

### Community 11 - "context.tsx"
Cohesion: 0.20
Nodes (10): TravelContext, ArtifactUIState, FareDataBridge, requestsFor(), legDate(), legKey(), legRequest(), legState() (+2 more)

### Community 12 - "persistence.test.ts"
Cohesion: 0.22
Nodes (5): createArtifactStore(), PersistedThread, request, row, ThreadStorage

### Community 13 - "fare-data-bridge.ts"
Cohesion: 0.16
Nodes (19): load(), cancel(), finish(), abortError(), coverageKey(), FarePage, LoadedResource, loadResource() (+11 more)

### Community 14 - "Source document"
Cohesion: 0.07
Nodes (30): Blinded twenty-four-item human sample, Final source freeze before calls, Global fixture versus loaded coverage, Historical stop and later authorized resume, No fabricated review capability, Source-backed handler semantics, Source document, Whole-cell machine matrix preparation (+22 more)

### Community 15 - "compilerOptions"
Cohesion: 0.07
Nodes (28): agent, benchmarks/query-engine, *.config.ts, DOM, DOM.Iterable, ES2022, node, src (+20 more)

### Community 16 - "transport.ts"
Cohesion: 0.19
Nodes (12): HISTORY_LIMITS, currentMessage(), fits(), olderMessage(), projectNetworkHistory(), splitText(), context(), prepared() (+4 more)

### Community 17 - "chat-route.ts"
Cohesion: 0.10
Nodes (26): keys, names, scalarLimit(), scalars, scope, validatePresentPrefix(), bDefinitions, catalogDescriptors (+18 more)

### Community 18 - "scene-completion.test.ts"
Cohesion: 0.20
Nodes (15): handleChat(), CODEX_DEVELOPER_INSTRUCTIONS, ChatRequest, request, ack(), artifact, other, acceptTurn() (+7 more)

### Community 19 - "run-matrix.mjs"
Cohesion: 0.20
Nodes (24): getSceneMetadata(), assertModeOutput(), assertRecoveryHealthy(), assertSelectedJourney(), budgets, checkNoChat(), chooseFare(), ensurePressed() (+16 more)

### Community 20 - "b/toolkit.tsx"
Cohesion: 0.08
Nodes (24): hasLaterAcceptedScene(), ScenePart, inspect(), validateReactiveProgram(), bInstructions, bToolkit, ComposeSceneInputSchema, hasAcceptedRepairAfter() (+16 more)

### Community 21 - "chat-continuation.test.ts"
Cohesion: 0.11
Nodes (20): {decision}, servers, CODEX_MODEL, CODEX_REASONING_EFFORT, codexDecision(), Decision, DecisionDelta, DecisionSchema (+12 more)

### Community 22 - "Source document"
Cohesion: 0.08
Nodes (26): Current query selection capability, Granular independently arranged primitives, Inclusive date window and real retry, Keyboard tab semantics, Later-date selection intent, Ranked and authored grouped comparisons, Selected itinerary facts and separate total, Source document (+18 more)

### Community 23 - "devDependencies"
Cohesion: 0.08
Nodes (25): jsdom, devDependencies, jsdom, @playwright/test, @testing-library/dom, @testing-library/jest-dom, @testing-library/user-event, tsx (+17 more)

### Community 24 - "dependencies"
Cohesion: 0.09
Nodes (23): ai, @ai-sdk/react, assistant-stream, @assistant-ui/ai-sdk, @assistant-ui/react, @assistant-ui/react-generative-ui, @openuidev/lang-core, @openuidev/react-lang (+15 more)

### Community 25 - "worker-client.ts"
Cohesion: 0.13
Nodes (15): index, BoundedQueryResult, DatasetId, QueryIR, scalar, WorkerRequest, WorkerResponse, WorkerResponseSchema (+7 more)

### Community 26 - "matrix.mjs"
Cohesion: 0.15
Nodes (17): assertFixture(), assertRuntime(), buildMatrix(), cacheConditions, canResume(), summarize(), runtime, scenarios (+9 more)

### Community 27 - "browser.ts"
Cohesion: 0.14
Nodes (20): base, benchmarkRows(), csvRows(), expected(), id, longTasks, Metric, percentile() (+12 more)

### Community 28 - "a/toolkit.tsx"
Cohesion: 0.09
Nodes (21): generative, library, Travel UI evidence capture: 0-1280-blue-partial, Travel UI evidence capture: 0-1280-blue, Travel UI evidence capture: 0-360-blue-partial, Travel UI evidence capture: 0-360-blue, Travel UI evidence capture: 0-360-sand-partial, Travel UI evidence capture: 0-360-sand (+13 more)

### Community 29 - "Acceptance Evidence"
Cohesion: 0.11
Nodes (20): Acceptance Evidence, API Pagination, Backend Commit b1c8912, Backend Test Suite, Browser Captures, Browser flow, Browser Flow Acceptance, Coverage Parser (+12 more)

### Community 30 - "package.mjs"
Cohesion: 0.14
Nodes (14): destination, directory, packet, records, [source,output,participant], dimensions, validateReviewExport(), buildReviewPackage() (+6 more)

### Community 31 - "framework-compatibility.md"
Cohesion: 0.11
Nodes (13): Resolved generative UI framework compatibility, Commands, Native A compatibility evidence, Observed API boundaries, Provider probe, Shared catalog and paused-stream proof, Live native composition evidence, Signed-in Codex provider verification (+5 more)

### Community 32 - "routes.tsx"
Cohesion: 0.12
Nodes (14): Implemented comparison demo and evidence matrix, Forty shared granular travel descriptors, CONTRACT_VERSION, io, createIndexedDBStorage(), descriptor, ThreadConflictError, GenerativeChooser (+6 more)

### Community 33 - "task-gates.mjs"
Cohesion: 0.16
Nodes (21): oracleFacts(), createSourceOracle(), assert(), assertFacetApplied(), assertRearrangement(), assertTaskData(), extremum(), field() (+13 more)

### Community 34 - "Current generative-ui-ab-ledger document"
Cohesion: 0.11
Nodes (18): 227 tests and45 offline checks, 238 tests and45 offline checks, 277 Vitest tests and57 offline study review checks, Actually merged PR2 through17, Actually merged PR2 through18, Actually merged PR2 through19, Actually merged PR2 through24, CSS light surfaces own theme foreground (+10 more)

### Community 35 - "scripts"
Cohesion: 0.12
Nodes (17): scripts, agent:dev, benchmark:query, build, check:catalog, dev, experiment:live, frontend:dev (+9 more)

### Community 36 - "validate-program.ts"
Cohesion: 0.25
Nodes (9): RuntimeVariablesSchema, bComponentPropsSchema(), Binding, BindingSchema, bPropsSchema, bSchemaLibrary, value, names (+1 more)

### Community 37 - "source-analysis.mjs"
Cohesion: 0.17
Nodes (9): analyzeAuthorshipCorpus(), analyzeSource(), conditionalBranch(), conditionalChildren(), inspect(), componentNames, layoutNames, b() (+1 more)

### Community 38 - "request-schema.ts"
Cohesion: 0.12
Nodes (21): ErrorOutput, id, MessageSchema, parseChatRequest(), parseToolInput(), parseToolOutput(), PartSchema, RequestSchema (+13 more)

### Community 39 - "library.tsx"
Cohesion: 0.17
Nodes (13): ValidatedQueryIR, bLibrary, BoundNode(), HostBoundNode(), Props, Binding, context, SceneQueryProvider (+5 more)

### Community 40 - "Generative UI Feature Fit Rubric"
Cohesion: 0.07
Nodes (39): Interactive Conversational Travel UI Evaluation, A2UI Feature Evaluation, Travel Planner Acceptance Gates, AG-UI Feature Evaluation, LangChain Agent Chat UI Feature Evaluation, Ant Design X Feature Evaluation, assistant-ui Feature Evaluation, Chainlit Feature Evaluation (+31 more)

### Community 41 - "resume-followup.mjs"
Cohesion: 0.14
Nodes (13): /verification/generative-ui/b/user-itinerary/resume-client.jsx, accepted, captured, errors, last, newAccepted, oldIds, prior (+5 more)

### Community 42 - "runtime-provider.tsx"
Cohesion: 0.13
Nodes (16): CatalogNode(), TravelServices, useTravelServices(), CanonicalMessagesContext, completedLocalToolIndices(), completedNarrativeIndices(), localToolNames, scene (+8 more)

### Community 43 - "registration-lifecycle.test.ts"
Cohesion: 0.16
Nodes (4): deferred(), request, scenario(), createLocalQueryEngine()

### Community 44 - "Source document"
Cohesion: 0.15
Nodes (13): Atomic verified database generation, Bounded fare search API, Global calendar versus cache coverage, Preserved v2 read-only profile, Source document, Strict current source verification, Synthetic timetable, Explicit null sort ordering (+5 more)

### Community 45 - "a/spike/main.tsx"
Cohesion: 0.15
Nodes (12): App(), artifactId, bridge, capture(), input, requests, resume(), root (+4 more)

### Community 46 - "openui-runtime.test.tsx"
Cohesion: 0.19
Nodes (11): CompactState, CompactValue, HostStateRenderer(), HostStateRendererProps, projectState(), Command, library, Mode (+3 more)

### Community 47 - "run-state-proof.mjs"
Cohesion: 0.15
Nodes (10): /src/generative/state/ui-state-store.ts, case0, errors, last, parts, requests, result, secondView (+2 more)

### Community 48 - "semantic-gates.mjs"
Cohesion: 0.15
Nodes (19): currentScope(), field(), implies(), same(), sourceQueries(), descriptor, gate(), query (+11 more)

### Community 49 - "form.mjs"
Cohesion: 0.21
Nodes (12): activate(), byToken, draft, find(), frame, notes, packet, ratingInputs (+4 more)

### Community 50 - "verify-workflow.mjs"
Cohesion: 0.15
Nodes (9): startReviewServer(), prepareItem(), fixture, health, original, packet, records, results (+1 more)

### Community 51 - "Browser-local generative travel UI decision"
Cohesion: 0.12
Nodes (16): Agent context and tool contracts, Browser `FareStore`, Browser-local generative travel UI decision, Component catalog versus generated HTML or React, Current application and data boundary, Decision to make, Demo moments the catalog must support, Evaluation rubric (+8 more)

### Community 52 - "verify_pasted_coverage.py"
Cohesion: 0.44
Nodes (11): check_database(), main(), normalized(), pair(), parse_dash_line(), parse_manifest(), parse_to_line(), Path (+3 more)

### Community 53 - "Contributing Guide"
Cohesion: 0.31
Nodes (11): Pull Request Template, Pull Request Branch Target, Pull Request Verification, Contributing Guide, Branch Naming Convention, dev Branch, Focused Pull Requests, Hotfix Branch (+3 more)

### Community 54 - "Generative travel UI A/B implementation plan"
Cohesion: 0.18
Nodes (11): Completion audit, Current repository baseline, Decisions, risks, and fallback order, End-state experience, Exact repository change map, Fresh-context startup checklist, Fresh implementation starter prompt, Generative travel UI A/B implementation plan (+3 more)

### Community 55 - "catalog-extension/spike/main.tsx"
Cohesion: 0.15
Nodes (11): App(), artifactId, bridge, input, requests, resume(), root, scenes (+3 more)

### Community 56 - "Current comparison-decision document"
Cohesion: 0.18
Nodes (11): Current comparison-decision document, Current source-equivalent benchmark measurement, Diagnostic versus final benchmark measurement, Human acceptance before variant removal, JS heap scope and unmeasured Duck cancellation, No variant removal and no raw-failure reclassification, Optional human comparative ratings remain uncollected, Retain both implementations pending evidence (+3 more)

### Community 57 - "scripts/run.mjs"
Cohesion: 0.22
Nodes (7): agentPort, apiPort, children, env, start(), stop(), webPort

### Community 58 - "London to Paris synthetic fare-list view"
Cohesion: 0.40
Nodes (5): London to Paris synthetic fare-list view, Visible chat composer with Send and Stop controls, Cheapest €19.72, fastest €30.17 and synthetic-total €19.72 cards are visible. The Selected button has an orange outline in the captured image., Date, selected Bus mode and Lowest price controls are visible., A fare list has a selected €19.72 bus and many Select buttons with identifier-style Carrier labels.

### Community 59 - "London to Paris synthetic fare-list view"
Cohesion: 0.40
Nodes (5): London to Paris synthetic fare-list view, Visible chat composer with Send and Stop controls, Cheapest €19.72, fastest €30.17 and synthetic-total €19.72 cards are visible. The Selected button has an orange outline in the captured image., Date, selected Bus mode and Lowest price controls are visible., A fare list has a selected €19.72 bus and many Select buttons with identifier-style Carrier labels.

### Community 60 - "London to Paris synthetic fare-list view"
Cohesion: 0.40
Nodes (5): London to Paris synthetic fare-list view, Visible chat composer with Send and Stop controls, Cheapest €19.72, fastest €30.17 and synthetic-total €19.72 cards are visible. The Selected button has an orange outline in the captured image., Date, selected Bus mode and Lowest price controls are visible., A fare list has a selected €19.72 bus and many Select buttons with identifier-style Carrier labels.

### Community 61 - "Calendar, comparison and fare-list view"
Cohesion: 0.40
Nodes (5): Calendar, comparison and fare-list view, Visible chat composer with Send and Stop controls, The fare list has a selected €19.72 bus and additional choices with identifier-style Carrier labels. The Selected button has an orange outline in the captured image., October 9–15 day tiles show prices and counts; Fri 9 Oct is highlighted., A Bus comparison row, price-versus-travel-time scatterplot, date/mode/price/duration/direct/sort controls are visible.

### Community 62 - "Calendar, comparison and fare-list view"
Cohesion: 0.40
Nodes (5): Calendar, comparison and fare-list view, Visible chat composer with Send and Stop controls, The fare list has a selected €19.72 bus and additional choices with identifier-style Carrier labels. The Selected button has an orange outline in the captured image., October 9–15 day tiles show prices and counts; Fri 9 Oct is highlighted., A Bus comparison row, price-versus-travel-time scatterplot, date/mode/price/duration/direct/sort controls are visible.

### Community 63 - "Calendar, comparison and fare-list view"
Cohesion: 0.40
Nodes (5): Calendar, comparison and fare-list view, Visible chat composer with Send and Stop controls, The fare list has a selected €19.72 bus and additional choices with identifier-style Carrier labels. The Selected button has an orange outline in the captured image., October 9–15 day tiles show prices and counts; Fri 9 Oct is highlighted., A Bus comparison row, price-versus-travel-time scatterplot, date/mode/price/duration/direct/sort controls are visible.

### Community 64 - "Route, timeline and fare-list view"
Cohesion: 0.40
Nodes (5): Route, timeline and fare-list view, Visible chat composer with Send and Stop controls, A selected €19.72 fare, more bus cards and synthetic total €19.72 are visible. The Selected button has an orange outline in the captured image., A schematic line connects London and Paris with text distinguishing it from a geographic map., A journey timeline shows a London-to-Paris bus; date, selected Bus, direct and sort controls appear.

### Community 65 - "Route, timeline and fare-list view"
Cohesion: 0.40
Nodes (5): Route, timeline and fare-list view, Visible chat composer with Send and Stop controls, A selected €19.72 fare, more bus cards and synthetic total €19.72 are visible. The Selected button has an orange outline in the captured image., A schematic line connects London and Paris with text distinguishing it from a geographic map., A journey timeline shows a London-to-Paris bus; date, selected Bus, direct and sort controls appear.

### Community 66 - "Route, timeline and fare-list view"
Cohesion: 0.40
Nodes (5): Route, timeline and fare-list view, Visible chat composer with Send and Stop controls, A selected €19.72 fare, more bus cards and synthetic total €19.72 are visible. The Selected button has an orange outline in the captured image., A schematic line connects London and Paris with text distinguishing it from a geographic map., A journey timeline shows a London-to-Paris bus; date, selected Bus, direct and sort controls appear.

### Community 67 - "verify-conditions.mjs"
Cohesion: 0.24
Nodes (7): conditionScope, observeCondition(), base, resource, warm(), health, results

### Community 68 - "generative-ui-ab-implementation-plan.md"
Cohesion: 0.25
Nodes (3): Omio generative UI demo, Run locally, Verify and compare

### Community 69 - "query-engine.ts"
Cohesion: 0.16
Nodes (14): AllowedFareField, DatasetRevision, DatasetRevisionSchema, PredicateTree, compare(), defaults, executeQuery(), matches() (+6 more)

### Community 70 - "study.tsx"
Cohesion: 0.36
Nodes (6): assignment(), ratingDimensions, scenarios, withheldPrompt(), Study(), GenerativeRoute()

### Community 71 - "Selection-count view within a conversation"
Cohesion: 0.22
Nodes (9): Selection-count view within a conversation, Visible chat composer with Send and Stop controls, Resume stream, Inspect evidence, Retry and Send/Stop controls are visible., The visible conversation has Before the view and After the view prose., A synthetic bus fare dropdown is followed by the text 1 selected fare., Trip selection-count card, The card displays 1 selected fare., A Trip panel contains Choose a fare and a synthetic bus fare dropdown. (+1 more)

### Community 72 - "Phased implementation DAG"
Cohesion: 0.25
Nodes (8): Package ownership index, Phase 0: compatibility and shared contracts, Phase 1: browser-local application spine, Phase 2: shared experience and chat, Phase 3: Version A vertical slice, Phase 4: Version B parity and genuine reactivity, Phase 5: comparison and decision, Phased implementation DAG

### Community 74 - "verify-timeline.mjs"
Cohesion: 0.17
Nodes (7): FakeWorker, instrument(), fixture, native, proof, result, runtime

### Community 75 - "query-engine/package.json"
Cohesion: 0.29
Nodes (6): dependencies, @duckdb/duckdb-wasm, name, private, type, @duckdb/duckdb-wasm

### Community 76 - "Current generative-ui-ab-implementation-plan document"
Cohesion: 0.29
Nodes (7): 277 Vitest twelve Python fifty-seven offline checks, Confirmed repairs reviewed after frozen collection, Current generative-ui-ab-implementation-plan document, Diagnostic96 baseline53passes43failures, Latest desktop delivery scope supersedes historical starter limits, No further mobile work, Optional human winner remains unperformed

### Community 77 - "Shared architecture"
Cohesion: 0.29
Nodes (7): Bounded agent tools, Browser data and state, Chat, artifacts, and persistence, Realistic data volume and query engine, Shared architecture, Shared contracts, Synthetic price and itinerary rules

### Community 78 - "Current browser-local-generative-ui-decision document"
Cohesion: 0.29
Nodes (7): Browser-owned fare rows and per-artifact UI state, Compact atomic request-time snapshot, Current browser-local-generative-ui-decision document, Historical qualitative framework rubric, Native assistant-ui composition versus OpenUI reactive alternative, Synthetic demo excludes booking authority, Trusted granular catalog and narrow bounded tools

### Community 79 - "Current generative-ui-resources document"
Cohesion: 0.29
Nodes (7): Agent transport versus renderer capability, Controlled rendering versus declarative composition, Current generative-ui-resources document, No installation or benchmark claim, Open-ended HTML generation tradeoffs, Primary-source-only research method, Thirteen-repository dated research inventory

### Community 80 - "catalog-stories/tsconfig.json"
Cohesion: 0.29
Nodes (6): inventory.ts, spike/main.tsx, ../../../tsconfig.json, exclude, extends, include

### Community 81 - "descriptors.ts"
Cohesion: 0.29
Nodes (5): descriptors, refs, hash, CATALOG_VERSION, ComponentDescriptor

### Community 82 - "run-environment.mjs"
Cohesion: 0.53
Nodes (4): collectRunEnvironment(), command(), root, saveRunEnvironment()

### Community 83 - "QueryWorker"
Cohesion: 0.48
Nodes (3): request(), cancel(), QueryWorker

### Community 84 - "run-completion.mjs"
Cohesion: 0.29
Nodes (6): errors, last, requests, responses, started, timers

### Community 86 - "Repository Workflow"
Cohesion: 0.40
Nodes (5): Code Review Graph, Graph-Guided Source Verification, Graphify Knowledge Graph, Knowledge graphs, Repository Workflow

### Community 87 - "run.ts"
Cohesion: 0.33
Nodes (4): awaiting, completion, errors, measurements

### Community 88 - "Synthetic Timetable Backend"
Cohesion: 0.20
Nodes (10): Atomic Database Generation, Deterministic Synthetic Timetable, Generate the database, Location, Metadata, and Search Endpoints, Run the API, Search Result Eligibility, Synthetic Timetable Backend, Test (+2 more)

### Community 89 - "Version B: agent-authored reactive wiring"
Cohesion: 0.33
Nodes (6): Guidance and repair, Program and artifact contract, QueryIR, Static and runtime limits, Version B: agent-authored reactive wiring, Version B proof

### Community 90 - "Alternatives and tradeoffs"
Cohesion: 0.33
Nodes (6): AI SDK plus json-render, Alternatives and tradeoffs, assistant-ui shell with json-render, CopilotKit with Dynamic A2UI, OpenUI reactive program, Tambo composite or interactable components

### Community 91 - "Urban Travel Scene"
Cohesion: 0.40
Nodes (6): App Call-to-Action Background Illustration, Bus, Cityscape, Intermodal Mobility, Train, Urban Travel Scene

### Community 92 - "Transportation Landscape Hero"
Cohesion: 0.33
Nodes (6): Air Travel, Bus Travel, Ferry Travel, Multimodal Travel, Rail Travel, Transportation Landscape Hero

### Community 93 - "Generative UI repositories and patterns for the Omio demo"
Cohesion: 0.25
Nodes (8): Adjacent and excluded projects, Architecture taxonomy, Comparison matrix, Conclusions, Generative UI repositories and patterns for the Omio demo, Practical experiment plan, Primary source index, Scope and method

### Community 95 - "Source document"
Cohesion: 0.33
Nodes (6): Historical fifteen-case replay claim, Isolated genuine-source native replay, Keyboard responsive row-boundary checks, Retain exact authored source, Source document, Validated isolated restore helper

### Community 96 - "location-catalog.ts"
Cohesion: 0.60
Nodes (3): loadLocationCatalog(), locationsSchema, selectLocations()

### Community 97 - "Selected fare count catalog extension"
Cohesion: 0.40
Nodes (4): Contract and ownership, Cost and boundary proof, Generator and compatibility, Selected fare count catalog extension

### Community 98 - "Generative UI implementation ledger"
Cohesion: 0.40
Nodes (4): Every package, Generative UI implementation ledger, Owners, worktrees and publication, Verification scope and remaining work

### Community 99 - "A/B comparison protocol"
Cohesion: 0.40
Nodes (5): A/B comparison protocol, Controlled conditions, Hard gates, Measures and decision record, Task suite

### Community 100 - "Verification strategy"
Cohesion: 0.40
Nodes (5): Contract and privacy-boundary tests, Data, query, and state tests, Repeatable commands, Stream and component tests, Verification strategy

### Community 101 - "Swarm, worktree, commit, and PR protocol"
Cohesion: 0.40
Nodes (5): Graph ownership, Integration topology, Ports, processes, and generated artifacts, Swarm, worktree, commit, and PR protocol, Worker packet and ownership

### Community 102 - "Version A: assistant-ui component composition"
Cohesion: 0.40
Nodes (5): Local bindings and actions, Runtime choice, Tree contract, Version A: assistant-ui component composition, Version A proof

### Community 103 - "run-multicity-proof.mts"
Cohesion: 0.25
Nodes (6): PersistedThreadSchema, errors, record, requests, scene, state

### Community 104 - "package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 105 - "Download on the Apple App Store Badge"
Cohesion: 0.40
Nodes (5): Apple App Store, Download on the Apple App Store Badge, Apple Logo, iOS App Download, Trusted Platform Acquisition

### Community 106 - "snapshot-resources.test.ts"
Cohesion: 0.43
Nodes (6): createThreadPersistence(), parsePersistedThread(), id, request, restoredContextFixture(), source()

### Community 108 - "spike/toolkit.tsx"
Cohesion: 0.60
Nodes (3): SpikeCard(), SpikeSurface(), generative

### Community 109 - "Omio Reference Assets"
Cohesion: 0.33
Nodes (6): Omio Travel Search Demo Page, React Application Entry, Live Landing Page Asset Provenance, Mobile App Call-to-Action Assets, Non-Production Visual Reference Use, Omio Reference Assets

### Community 110 - "catalog.test.tsx"
Cohesion: 0.50
Nodes (4): artifactId, fare(), PendingQueryProbe(), setup()

### Community 111 - "Original checkout LOCAL alignment"
Cohesion: 0.67
Nodes (3): Diagnostic baseline and optional follow-up, Canonical semantic graph authority, Original checkout LOCAL alignment

### Community 112 - "Browser query engine decision"
Cohesion: 0.40
Nodes (4): Browser query engine decision, Domain verification, Measurement, Reproduce

### Community 116 - "Historical travel interface capture"
Cohesion: 0.40
Nodes (5): Historical travel interface capture, Fare picker focus ring, Historical text encoding artifacts, Mode comparison table, Selected trip and synthetic total

### Community 117 - "Historical travel interface capture"
Cohesion: 0.40
Nodes (5): Historical travel interface capture, Fare picker focus ring, Historical text encoding artifacts, Mode comparison table, Selected trip and synthetic total

### Community 118 - "Historical travel interface capture"
Cohesion: 0.40
Nodes (5): Historical travel interface capture, Fare picker focus ring, Historical text encoding artifacts, Mode comparison table, Selected trip and synthetic total

### Community 119 - "Historical travel interface capture"
Cohesion: 0.40
Nodes (5): Historical travel interface capture, Date and sort controls, Departure day price calendar, Historical text encoding artifacts, Selected journey timeline

### Community 120 - "Historical travel interface capture"
Cohesion: 0.40
Nodes (5): Historical travel interface capture, Date and sort controls, Departure day price calendar, Historical text encoding artifacts, Selected journey timeline

### Community 121 - "Historical travel interface capture"
Cohesion: 0.40
Nodes (5): Historical travel interface capture, Date and sort controls, Departure day price calendar, Historical text encoding artifacts, Selected journey timeline

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

### Community 148 - "Study continuation at requested stop"
Cohesion: 0.50
Nodes (3): Authorized resume, October 4, 2026, Resume after explicit authorization, Study continuation at requested stop

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
- **787 isolated node(s):** `{decision}`, `servers`, `mocks`, `valid`, `DecisionSchema` (+782 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `FareDataBridge` connect `context.tsx` to `component.tsx`?**
  _High betweenness centrality (0.000) - this node is a cross-community bridge._
- **Why does `createFareDataBridge()` connect `createFareDataBridge` to `registration-lifecycle.test.ts`, `fare-data-bridge.ts`?**
  _High betweenness centrality (0.000) - this node is a cross-community bridge._
- **Why does `UIStateStore` connect `index.ts` to `component.tsx`, `renderer.tsx`?**
  _High betweenness centrality (0.000) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `createUIStateStore()` (e.g. with `dispatch()` and `get()`) actually correct?**
  _`createUIStateStore()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `{decision}`, `servers`, `mocks` to the rest of the system?**
  _787 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `app.py` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._
- **Should `ResultsPage.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06093189964157706 - nodes in this community are weakly interconnected._

## Original LOCAL integration provenance

Graph JSON parses with 1896 nodes, 3656 directed edges and0 dangling endpoints. Hash-verified canonical571 reuse and localAST refresh are complete. Differing original-source semantic coverage and late local status edits remain explicitly partial; canonical571 is the full semantic authority. Original967 graphs/proofs are preserved under ignored `artifacts/original-local-integration-2026-10-05/premerge/` and in Git history. No model calls or mobile work were performed.
