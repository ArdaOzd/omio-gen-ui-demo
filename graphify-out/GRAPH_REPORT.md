# Graph Report - omio-gen-ui-demo  (2026-10-03)

## Corpus Check
- 237 files · ~485,913 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1183 nodes · 2070 edges · 100 communities (85 shown, 15 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 90 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- src · api.js
- Travel catalog
- Travel state
- package.json
- backend · app.py
- docs · research · generative-ui-resources.md
- docs · research · interactive-travel-ui-evaluation.md
- Travel contracts
- backend · generate_db.py
- package.json
- tsconfig.json
- Evidence run-state-proof.mjs
- Travel data
- Travel state
- Travel variants
- docs · research · browser-local-generative-ui-decision.md
- Evidence a
- verification · acceptance.md
- Travel contracts
- Travel data
- Evidence b
- Model agent · request-schema.ts
- Model agent · turn-budget.ts
- Evidence a
- Travel query
- Evidence b
- Travel variants
- Travel query
- Travel variants
- Model agent · codex-provider.ts
- benchmarks · query-engine · browser.ts
- tests · compatibility · openui-runtime.test.tsx
- Travel chat
- Travel contracts
- verification · verify_pasted_coverage.py
- CONTRIBUTING.md
- docs · plans · generative-ui-ab-implementation-plan.md
- Travel query
- scripts · run.mjs
- Travel catalog
- Travel variants
- Travel data
- Travel query
- Model agent · validation-reason.ts
- docs · plans · generative-ui-ab-implementation-plan.md
- Travel variants
- benchmarks · query-engine · package.json
- docs · plans · generative-ui-ab-implementation-plan.md
- Travel chat
- Travel variants
- Travel variants
- Evidence a
- AGENTS.md
- benchmarks · query-engine · run.ts
- docs · plans · generative-ui-ab-implementation-plan.md
- public · assets · omio
- public · assets · omio
- Travel catalog
- Evidence a
- Model agent · location-catalog.ts
- docs · plans · generative-ui-ab-implementation-plan.md
- docs · plans · generative-ui-ab-implementation-plan.md
- docs · plans · generative-ui-ab-implementation-plan.md
- docs · plans · generative-ui-ab-implementation-plan.md
- public · assets · omio
- README.md
- scripts · run-query-benchmark.mjs
- Travel state
- Evidence a
- Evidence openui-compatibility-2026-10-02.md
- Evidence query-engine-2026-10-02.md
- public · assets · omio
- public · assets · omio
- public · assets · omio
- Evidence a
- public · assets · omio
- public · assets · omio
- public · assets · omio
- public · assets · omio
- Evidence b
- Evidence b
- backend · __init__.py
- playwright.config.ts
- Travel catalog
- Evidence a
- Evidence a
- Evidence b
- Evidence codex-provider.md
- vite.config.js
- Shared travel support
- Shared travel support

## God Nodes (most connected - your core abstractions)
1. `createUIStateStore()` - 20 edges
2. `Generative travel UI A/B implementation plan` - 18 edges
3. `assertNoBulkData()` - 17 edges
4. `scripts` - 17 edges
5. `search()` - 16 edges
6. `dispatch()` - 15 edges
7. `createActionRouter()` - 14 edges
8. `compilerOptions` - 14 edges
9. `Repository details` - 14 edges
10. `Generative UI Feature Fit Rubric` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Pull Request Template` --semantically_similar_to--> `Contributing Guide`  [INFERRED] [semantically similar]
  .github/pull_request_template.md → CONTRIBUTING.md
- `capture()` --calls--> `exportAgentContext()`  [EXTRACTED]
  verification/generative-ui/a/spike/main.tsx → src/generative/state/snapshot-exporter.ts
- `run()` --calls--> `createSyntheticRows()`  [EXTRACTED]
  benchmarks/query-engine/browser.ts → src/generative/data/synthetic-source.ts
- `parseToolInput()` --calls--> `validatePresentTree()`  [EXTRACTED]
  agent/request-schema.ts → src/generative/variants/a/tree.ts
- `parseChatRequest()` --calls--> `parseAgentContext()`  [EXTRACTED]
  agent/request-schema.ts → src/generative/contracts/index.ts

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

## Communities (100 total, 15 thin omitted)

### Community 0 - "src · api.js"
Cohesion: 0.07
Nodes (41): buildSearchUrl(), displayLocation(), getJson(), locationValue(), minutesFromDuration(), MODE_ORDER, modes, normalizeLocations() (+33 more)

### Community 1 - "Travel catalog"
Cohesion: 0.09
Nodes (40): artifactId, fare(), setup(), ArtifactErrorBoundary, CatalogNode(), controls, layouts, statuses (+32 more)

### Community 2 - "Travel state"
Cohesion: 0.06
Nodes (31): Implemented comparison demo and evidence matrix, Paused demo continuation handoff, Signed-in Codex local travel comparison, Forty shared granular travel descriptors, assignment(), ratingDimensions, scenarios, withheldPrompt() (+23 more)

### Community 3 - "package.json"
Cohesion: 0.04
Nodes (44): ai, @ai-sdk/react, assistant-stream, @assistant-ui/ai-sdk, @assistant-ui/react, @assistant-ui/react-generative-ui, @openuidev/lang-core, @openuidev/react-lang (+36 more)

### Community 4 - "backend · app.py"
Cohesion: 0.13
Nodes (30): ApiError, _connect(), _date_value(), dispatch(), _fail(), get_locations(), get_metadata(), _integer() (+22 more)

### Community 5 - "docs · research · generative-ui-resources.md"
Cohesion: 0.05
Nodes (38): Atomic Database Generation, Deterministic Synthetic Timetable, Generate the database, Location, Metadata, and Search Endpoints, Run the API, Search Result Eligibility, Synthetic Timetable Backend, Test (+30 more)

### Community 6 - "docs · research · interactive-travel-ui-evaluation.md"
Cohesion: 0.06
Nodes (39): Interactive Conversational Travel UI Evaluation, A2UI Feature Evaluation, Travel Planner Acceptance Gates, AG-UI Feature Evaluation, LangChain Agent Chat UI Feature Evaluation, Ant Design X Feature Evaluation, assistant-ui Feature Evaluation, Chainlit Feature Evaluation (+31 more)

### Community 7 - "Travel contracts"
Cohesion: 0.09
Nodes (31): BoundedFareFact, BoundedFareFactSchema, CompactArtifactSnapshot, CompactSummarySchema, ComponentDescriptor, CONTRACT_VERSION, CoverageRequestSchema, DatasetFieldManifest (+23 more)

### Community 8 - "backend · generate_db.py"
Cohesion: 0.12
Nodes (28): _batched(), _dates(), _direction(), directional_routes(), DirectionalRoute, _fare_rows(), generate_database(), main() (+20 more)

### Community 9 - "package.json"
Cohesion: 0.07
Nodes (30): @assistant-ui/vite, jsdom, devDependencies, @assistant-ui/vite, jsdom, @playwright/test, @testing-library/dom, @testing-library/jest-dom (+22 more)

### Community 10 - "tsconfig.json"
Cohesion: 0.07
Nodes (28): agent, benchmarks/query-engine, *.config.ts, DOM, DOM.Iterable, ES2022, node, src (+20 more)

### Community 11 - "Evidence run-state-proof.mjs"
Cohesion: 0.08
Nodes (23): /src/generative/data/fare-data-bridge.ts, /src/generative/contracts/index.ts, /src/generative/state/persistence.ts, /src/generative/state/ui-state-store.ts, captured, diagnostics, errors, failed (+15 more)

### Community 12 - "Travel data"
Cohesion: 0.12
Nodes (20): FareIdSchema, FareRow, UIStateRevisionSchema, first, request, second, createFareDataBridge(), createSyntheticRows() (+12 more)

### Community 13 - "Travel state"
Cohesion: 0.16
Nodes (17): ArtifactUIState, Coverage, CoverageRequest, DatasetManifest, FareDataBridge, CoverageLoadStatus, covers(), createActionRouter() (+9 more)

### Community 14 - "Travel variants"
Cohesion: 0.12
Nodes (16): keys, names, scope, validatePresentPrefix(), LIMITS, getSceneMetadata(), layouts, names (+8 more)

### Community 15 - "docs · research · browser-local-generative-ui-decision.md"
Cohesion: 0.09
Nodes (22): Agent context and tool contracts, AI SDK plus json-render, Alternatives and tradeoffs, assistant-ui shell with json-render, Browser `FareStore`, Browser-local generative travel UI decision, Component catalog versus generated HTML or React, CopilotKit with Dynamic A2UI (+14 more)

### Community 16 - "Evidence a"
Cohesion: 0.09
Nodes (21): generative, library, Travel UI evidence capture: 0-1280-blue-partial, Travel UI evidence capture: 0-1280-blue, Travel UI evidence capture: 0-360-blue-partial, Travel UI evidence capture: 0-360-blue, Travel UI evidence capture: 0-360-sand-partial, Travel UI evidence capture: 0-360-sand (+13 more)

### Community 17 - "verification · acceptance.md"
Cohesion: 0.11
Nodes (20): Acceptance Evidence, API Pagination, Backend Commit b1c8912, Backend Test Suite, Browser Captures, Browser flow, Browser Flow Acceptance, Coverage Parser (+12 more)

### Community 18 - "Travel contracts"
Cohesion: 0.19
Nodes (12): createSnapshotTransport(), snapshotRequest(), messages, AgentContextEnvelopeSchema, CoverageSchema, parseAgentContext(), assertNoBulkData(), forbidden (+4 more)

### Community 19 - "Travel data"
Cohesion: 0.16
Nodes (16): load(), cancel(), finish(), abortError(), coverageKey(), FarePage, LoadedResource, loadResource() (+8 more)

### Community 20 - "Evidence b"
Cohesion: 0.12
Nodes (15): bInstructions, ComposeSceneInputSchema, semanticSchema, Travel UI evidence capture: case-0, Travel UI evidence capture: case-1, B authored-program evidence, 2026-10-02, Travel UI evidence capture: replay-0, Travel UI evidence capture: replay-1 (+7 more)

### Community 21 - "Model agent · request-schema.ts"
Cohesion: 0.15
Nodes (13): {decision}, servers, ErrorOutput, id, MessageSchema, parseChatRequest(), parseToolOutput(), PartSchema (+5 more)

### Community 22 - "Model agent · turn-budget.ts"
Cohesion: 0.23
Nodes (11): ChatRequest, request, ack(), artifact, other, acceptTurn(), getAcceptedScenes(), ledger (+3 more)

### Community 23 - "Evidence a"
Cohesion: 0.14
Nodes (13): FareRowSchema, App(), artifactId, bridge, capture(), input, requests, resume() (+5 more)

### Community 24 - "Travel query"
Cohesion: 0.23
Nodes (7): index, BoundedQueryResult, DatasetId, QueryIR, QueryResource, LocalQueryEngine, Measured TypeScript versus DuckDB engine decision

### Community 25 - "Evidence b"
Cohesion: 0.14
Nodes (13): /verification/generative-ui/b/user-itinerary/resume-client.jsx, accepted, captured, errors, last, newAccepted, oldIds, prior (+5 more)

### Community 26 - "Travel variants"
Cohesion: 0.27
Nodes (11): useTravelServices(), QueryIRSchema, RuntimeVariablesSchema, evaluateQueryArguments(), findQueryStatement(), Program, rememberQueryResult(), adaptQueryResult() (+3 more)

### Community 27 - "Travel query"
Cohesion: 0.20
Nodes (9): DatasetRevisionSchema, scalar, WorkerRequest, WorkerResponse, WorkerResponseSchema, id, query, requests (+1 more)

### Community 28 - "Travel variants"
Cohesion: 0.18
Nodes (9): Props, Binding, context, SceneQueryProvider, useSceneQuery(), parseAction(), Owner, owners (+1 more)

### Community 29 - "Model agent · codex-provider.ts"
Cohesion: 0.21
Nodes (11): handleChat(), CODEX_DEVELOPER_INSTRUCTIONS, CODEX_MODEL, codexDecision(), Decision, DecisionDelta, DecisionSchema, readString() (+3 more)

### Community 30 - "benchmarks · query-engine · browser.ts"
Cohesion: 0.18
Nodes (12): base, expected(), id, longTasks, Metric, percentile(), Report, rightId (+4 more)

### Community 31 - "tests · compatibility · openui-runtime.test.tsx"
Cohesion: 0.19
Nodes (11): CompactState, CompactValue, HostStateRenderer(), HostStateRendererProps, projectState(), Command, library, Mode (+3 more)

### Community 32 - "Travel chat"
Cohesion: 0.23
Nodes (8): TravelServices, CanonicalMessagesContext, completedNarrativeIndices(), GenerativeChatProps, AssistantNarrative(), partComponents, suggestions, ThreadShell()

### Community 33 - "Travel contracts"
Cohesion: 0.18
Nodes (8): ArtifactUIStateSchema, CATALOG_VERSION, CompactArtifactSnapshotSchema, DispatchResult, UICommand, UICommandPatchSchema, UIStateStore, ProgramBinding

### Community 34 - "verification · verify_pasted_coverage.py"
Cohesion: 0.44
Nodes (11): check_database(), main(), normalized(), pair(), parse_dash_line(), parse_manifest(), parse_to_line(), Path (+3 more)

### Community 35 - "CONTRIBUTING.md"
Cohesion: 0.31
Nodes (11): Pull Request Template, Pull Request Branch Target, Pull Request Verification, Contributing Guide, Branch Naming Convention, dev Branch, Focused Pull Requests, Hotfix Branch (+3 more)

### Community 36 - "docs · plans · generative-ui-ab-implementation-plan.md"
Cohesion: 0.18
Nodes (11): Completion audit, Current repository baseline, Decisions, risks, and fallback order, End-state experience, Exact repository change map, Fresh-context startup checklist, Fresh implementation starter prompt, Generative travel UI A/B implementation plan (+3 more)

### Community 37 - "Travel query"
Cohesion: 0.25
Nodes (10): AllowedFareField, DatasetRevision, PredicateTree, compare(), defaults, executeQuery(), matches(), QueryLimits (+2 more)

### Community 38 - "scripts · run.mjs"
Cohesion: 0.22
Nodes (7): agentPort, apiPort, children, env, start(), stop(), webPort

### Community 39 - "Travel catalog"
Cohesion: 0.22
Nodes (8): bDefinitions, catalogDescriptors, catalogHash, catalogVersion, componentNames, orderedPropertyNames, sharedPropsSchema, aPrompt

### Community 40 - "Travel variants"
Cohesion: 0.20
Nodes (4): scene, bToolkit, hasAcceptedRepairAfter(), SceneToolFrame()

### Community 41 - "Travel data"
Cohesion: 0.24
Nodes (7): PageSource, createSearchPageSource(), responseSchema, rowSchema, input, outbound, server

### Community 42 - "Travel query"
Cohesion: 0.31
Nodes (6): createLocalQueryEngine(), createWorkerQueryEngine(), receive(), request(), cancel(), QueryWorker

### Community 43 - "Model agent · validation-reason.ts"
Cohesion: 0.50
Nodes (4): withOneRepair(), parseToolInput(), knownMessages, validationReason()

### Community 44 - "docs · plans · generative-ui-ab-implementation-plan.md"
Cohesion: 0.25
Nodes (8): Package ownership index, Phase 0: compatibility and shared contracts, Phase 1: browser-local application spine, Phase 2: shared experience and chat, Phase 3: Version A vertical slice, Phase 4: Version B parity and genuine reactivity, Phase 5: comparison and decision, Phased implementation DAG

### Community 45 - "Travel variants"
Cohesion: 0.29
Nodes (7): bLibrary, bComponentPropsSchema(), Binding, BindingSchema, bPropsSchema, bSchemaLibrary, value

### Community 46 - "benchmarks · query-engine · package.json"
Cohesion: 0.29
Nodes (6): dependencies, @duckdb/duckdb-wasm, name, private, type, @duckdb/duckdb-wasm

### Community 47 - "docs · plans · generative-ui-ab-implementation-plan.md"
Cohesion: 0.29
Nodes (7): Bounded agent tools, Browser data and state, Chat, artifacts, and persistence, Realistic data volume and query engine, Shared architecture, Shared contracts, Synthetic price and itinerary rules

### Community 49 - "Travel variants"
Cohesion: 0.43
Nodes (4): hasLaterAcceptedScene(), ScenePart, PresentBoundary(), Props

### Community 50 - "Travel variants"
Cohesion: 0.48
Nodes (4): inspect(), names, validateReactiveProgram(), programs

### Community 51 - "Evidence a"
Cohesion: 0.29
Nodes (6): errors, last, requests, responses, started, timers

### Community 52 - "AGENTS.md"
Cohesion: 0.40
Nodes (5): Code Review Graph, Graph-Guided Source Verification, Graphify Knowledge Graph, Knowledge graphs, Repository Workflow

### Community 53 - "benchmarks · query-engine · run.ts"
Cohesion: 0.33
Nodes (4): awaiting, completion, errors, measurements

### Community 54 - "docs · plans · generative-ui-ab-implementation-plan.md"
Cohesion: 0.33
Nodes (6): Guidance and repair, Program and artifact contract, QueryIR, Static and runtime limits, Version B: agent-authored reactive wiring, Version B proof

### Community 55 - "public · assets · omio"
Cohesion: 0.40
Nodes (6): App Call-to-Action Background Illustration, Bus, Cityscape, Intermodal Mobility, Train, Urban Travel Scene

### Community 56 - "public · assets · omio"
Cohesion: 0.33
Nodes (6): Air Travel, Bus Travel, Ferry Travel, Multimodal Travel, Rail Travel, Transportation Landscape Hero

### Community 57 - "Travel catalog"
Cohesion: 0.40
Nodes (3): descriptors, refs, hash

### Community 58 - "Evidence a"
Cohesion: 0.33
Nodes (5): Commands, Native A compatibility evidence, Observed API boundaries, Provider probe, Shared catalog and paused-stream proof

### Community 59 - "Model agent · location-catalog.ts"
Cohesion: 0.60
Nodes (3): loadLocationCatalog(), locationsSchema, selectLocations()

### Community 60 - "docs · plans · generative-ui-ab-implementation-plan.md"
Cohesion: 0.40
Nodes (5): A/B comparison protocol, Controlled conditions, Hard gates, Measures and decision record, Task suite

### Community 61 - "docs · plans · generative-ui-ab-implementation-plan.md"
Cohesion: 0.40
Nodes (5): Contract and privacy-boundary tests, Data, query, and state tests, Repeatable commands, Stream and component tests, Verification strategy

### Community 62 - "docs · plans · generative-ui-ab-implementation-plan.md"
Cohesion: 0.40
Nodes (5): Graph ownership, Integration topology, Ports, processes, and generated artifacts, Swarm, worktree, commit, and PR protocol, Worker packet and ownership

### Community 63 - "docs · plans · generative-ui-ab-implementation-plan.md"
Cohesion: 0.40
Nodes (5): Local bindings and actions, Runtime choice, Tree contract, Version A: assistant-ui component composition, Version A proof

### Community 64 - "public · assets · omio"
Cohesion: 0.40
Nodes (5): Apple App Store, Download on the Apple App Store Badge, Apple Logo, iOS App Download, Trusted Platform Acquisition

### Community 65 - "README.md"
Cohesion: 0.40
Nodes (5): Backend API Contract, Deterministic Synthetic Fares, One Million Fare SQLite Database, Omio Generative UI Demo, Original Visual Asset Sources

### Community 67 - "Travel state"
Cohesion: 0.60
Nodes (3): ArtifactId, ArtifactIdSchema, createArtifactStore()

### Community 68 - "Evidence a"
Cohesion: 0.60
Nodes (3): SpikeCard(), SpikeSurface(), generative

### Community 69 - "Evidence openui-compatibility-2026-10-02.md"
Cohesion: 0.40
Nodes (4): Commands and outcomes, Continuation and outstanding gates, Published OpenUI runtime compatibility, Verified public interfaces

### Community 70 - "Evidence query-engine-2026-10-02.md"
Cohesion: 0.40
Nodes (4): Browser query engine decision, Domain verification, Measurement, Reproduce

### Community 71 - "public · assets · omio"
Cohesion: 0.50
Nodes (4): Huawei AppGallery Download Badge, Huawei AppGallery, Mobile App Download, Platform Distribution Call to Action

### Community 72 - "public · assets · omio"
Cohesion: 0.50
Nodes (4): Cross-Device Handoff, Machine-Readable Link, Mobile App Acquisition, Mobile App QR Code

### Community 73 - "public · assets · omio"
Cohesion: 0.50
Nodes (4): Compass Icon, Directional Navigation, Explore Destinations, Travel Discovery

### Community 75 - "public · assets · omio"
Cohesion: 0.67
Nodes (3): Android App Distribution, Google Play Download Badge, Google Play

### Community 76 - "public · assets · omio"
Cohesion: 1.00
Nodes (3): Mobile Ticketing, QR Code, Mobile Ticket QR Code Icon

### Community 77 - "public · assets · omio"
Cohesion: 0.67
Nodes (3): QR Code Scanning, Scanner Frame, Visual Scan Target

### Community 78 - "public · assets · omio"
Cohesion: 0.67
Nodes (3): Synchronization, Update and Refresh, Updates Icon

## Knowledge Gaps
- **476 isolated node(s):** `CoverageLoadStatus`, `FarePage`, `LoadedResource`, `PageInput`, `SceneCompletion` (+471 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createUIStateStore()` connect `Travel data` to `Travel catalog`, `Travel state`, `Travel contracts`, `Travel variants`, `Travel state`, `Travel contracts`, `Model agent · request-schema.ts`, `Model agent · turn-budget.ts`, `Evidence a`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `createUIStateStore()` (e.g. with `dispatch()` and `get()`) actually correct?**
  _`createUIStateStore()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CoverageLoadStatus`, `FarePage`, `LoadedResource` to the rest of the system?**
  _476 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `src · api.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06892230576441102 - nodes in this community are weakly interconnected._
- **Should `Travel catalog` be split into smaller, more focused modules?**
  _Cohesion score 0.08521870286576169 - nodes in this community are weakly interconnected._
- **Should `Travel state` be split into smaller, more focused modules?**
  _Cohesion score 0.06471631205673758 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._
