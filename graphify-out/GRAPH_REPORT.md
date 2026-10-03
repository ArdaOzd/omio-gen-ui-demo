# Graph Report - omio-gen-ui-demo  (2026-10-03)

## Corpus Check
- 217 files · ~493,975 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1263 nodes · 2444 edges · 111 communities (92 shown, 19 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 91 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `04ddaa7e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ResultsPage.jsx
- component.tsx
- routes.tsx
- scripts
- app.py
- Repository details
- TravelPlan
- index.ts
- catalog-extension/spike/main.tsx
- devDependencies
- compilerOptions
- run-matrix.mjs
- ui-state-store.ts
- Generative UI Feature Fit Rubric
- tree.ts
- Browser-local generative travel UI decision
- a/toolkit.tsx
- Acceptance Evidence
- assertNoBulkData
- resource-loader.ts
- b/toolkit.tsx
- request-schema.ts
- scene-completion.test.ts
- a/spike/main.tsx
- DatasetId
- resume-followup.mjs
- renderer.tsx
- worker-client.ts
- library.tsx
- codex-provider.ts
- browser.ts
- openui-runtime.test.tsx
- thread-shell.tsx
- action-router.ts
- verify_pasted_coverage.py
- Contributing Guide
- Generative travel UI A/B implementation plan
- query-engine.ts
- run.mjs
- chat-route.ts
- createFareDataBridge
- Interactive Conversational Travel UI Evaluation
- request
- repair.ts
- Phased implementation DAG
- validate-program.ts
- query-engine/package.json
- Shared architecture
- study.tsx
- search-client.ts
- descriptors.ts
- run-completion.mjs
- Repository Workflow
- run.ts
- Version B: agent-authored reactive wiring
- Urban Travel Scene
- Transportation Landscape Hero
- Alternatives and tradeoffs
- Native A compatibility evidence
- location-catalog.ts
- A/B comparison protocol
- Verification strategy
- Swarm, worktree, commit, and PR protocol
- Version A: assistant-ui component composition
- Download on the Apple App Store Badge
- Omio Generative UI Demo
- run-query-benchmark.mjs
- context.tsx
- spike/toolkit.tsx
- Published OpenUI runtime compatibility
- Browser query engine decision
- Huawei AppGallery Download Badge
- Machine-Readable Link
- Compass Icon
- a/run-live.mjs
- Google Play
- Mobile Ticketing
- Visual Scan Target
- Update and Refresh
- b/run-live.mjs
- verify-availability.py
- backend/__init__.py
- playwright.config.ts
- catalog.md
- live/README.md
- run-browser-proof.mjs
- replay-live.mjs
- codex-provider.md
- vite.config.js
- continuation-history.test.ts
- Selected fare count catalog extension
- Generative UI implementation ledger
- Current Omio Demo Baseline
- Ownership and data flow
- catalog-primitive-semantics.md
- catalog-extension/README.md
- run-browser.mjs
- study/README.md
- install-graphify-hooks.sh
- test-graphify-hooks.sh

## God Nodes (most connected - your core abstractions)
1. `createFareDataBridge()` - 32 edges
2. `createUIStateStore()` - 31 edges
3. `ArtifactIdSchema` - 30 edges
4. `assertNoBulkData()` - 21 edges
5. `Generative travel UI A/B implementation plan` - 18 edges
6. `scripts` - 17 edges
7. `useTravelQuery()` - 17 edges
8. `handleChat()` - 16 edges
9. `search()` - 16 edges
10. `cityLabel()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Pull Request Template` --semantically_similar_to--> `Contributing Guide`  [INFERRED] [semantically similar]
  .github/pull_request_template.md → CONTRIBUTING.md
- `cellRun()` --indirect_call--> `fixture()`  [INFERRED]
  verification/generative-ui/study/run-matrix.mjs → src/generative/state/persistence.test.ts
- `handleChat()` --calls--> `assertNoBulkData()`  [EXTRACTED]
  agent/chat-route.ts → src/generative/contracts/privacy.ts
- `handleChat()` --calls--> `validatePresentTree()`  [EXTRACTED]
  agent/chat-route.ts → src/generative/variants/a/tree.ts
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

## Communities (111 total, 19 thin omitted)

### Community 0 - "ResultsPage.jsx"
Cohesion: 0.07
Nodes (41): buildSearchUrl(), displayLocation(), getJson(), locationValue(), minutesFromDuration(), MODE_ORDER, modes, normalizeLocations() (+33 more)

### Community 1 - "component.tsx"
Cohesion: 0.15
Nodes (38): PendingQueryProbe(), ArtifactErrorBoundary, controls, layouts, statuses, cityLabel(), departure(), duration() (+30 more)

### Community 2 - "routes.tsx"
Cohesion: 0.08
Nodes (25): Implemented comparison demo and evidence matrix, Paused demo continuation handoff, Signed-in Codex local travel comparison, Forty shared granular travel descriptors, ArtifactId, CATALOG_VERSION, CONTRACT_VERSION, createServices() (+17 more)

### Community 3 - "scripts"
Cohesion: 0.04
Nodes (44): ai, @ai-sdk/react, assistant-stream, @assistant-ui/ai-sdk, @assistant-ui/react, @assistant-ui/react-generative-ui, @openuidev/lang-core, @openuidev/react-lang (+36 more)

### Community 4 - "app.py"
Cohesion: 0.07
Nodes (58): ApiError, _connect(), _date_value(), dispatch(), _fail(), get_locations(), get_metadata(), _integer() (+50 more)

### Community 5 - "Repository details"
Cohesion: 0.05
Nodes (38): Atomic Database Generation, Deterministic Synthetic Timetable, Generate the database, Location, Metadata, and Search Endpoints, Run the API, Search Result Eligibility, Synthetic Timetable Backend, Test (+30 more)

### Community 6 - "TravelPlan"
Cohesion: 0.16
Nodes (14): assistant-ui Feature Evaluation, ConversationArtifact, Assistant UI Native Composition Decision, Direct Plan Command and Requote Flow, PlanPatch, Recommended assistant-ui Travel Planner Architecture, Semantic Travel Component Vocabulary, Complete Generative Travel UI Solution Options (+6 more)

### Community 7 - "index.ts"
Cohesion: 0.08
Nodes (32): BoundedFareFactSchema, CompactArtifactSnapshot, CompactSummarySchema, CoverageRequestSchema, DatasetFieldManifest, DatasetFieldManifestSchema, DatasetIdSchema, DatasetManifestSchema (+24 more)

### Community 8 - "catalog-extension/spike/main.tsx"
Cohesion: 0.15
Nodes (11): App(), artifactId, bridge, input, requests, resume(), root, scenes (+3 more)

### Community 9 - "devDependencies"
Cohesion: 0.06
Nodes (31): @assistant-ui/vite, jsdom, devDependencies, @assistant-ui/vite, jsdom, @playwright/test, @testing-library/dom, @testing-library/jest-dom (+23 more)

### Community 10 - "compilerOptions"
Cohesion: 0.07
Nodes (28): agent, benchmarks/query-engine, *.config.ts, DOM, DOM.Iterable, ES2022, node, src (+20 more)

### Community 11 - "run-matrix.mjs"
Cohesion: 0.06
Nodes (48): /src/generative/data/fare-data-bridge.ts, /src/generative/contracts/index.ts, /src/generative/state/persistence.ts, /src/generative/state/ui-state-store.ts, captured, diagnostics, errors, failed (+40 more)

### Community 12 - "ui-state-store.ts"
Cohesion: 0.11
Nodes (14): ArtifactUIState, ArtifactUIStateSchema, CompactArtifactSnapshotSchema, CoverageRequest, DispatchResult, UICommand, UICommandPatchSchema, UIStateRevisionSchema (+6 more)

### Community 13 - "Generative UI Feature Fit Rubric"
Cohesion: 0.15
Nodes (13): A2UI Feature Evaluation, AG-UI Feature Evaluation, LangChain Agent Chat UI Feature Evaluation, Ant Design X Feature Evaluation, Chainlit Feature Evaluation, CopilotKit Feature Evaluation, CopilotKit Generative UI Guide Evaluation, Generative UI Feature Fit Rubric (+5 more)

### Community 14 - "tree.ts"
Cohesion: 0.13
Nodes (14): keys, names, scope, validatePresentPrefix(), getSceneMetadata(), layouts, names, nodeSchema (+6 more)

### Community 15 - "Browser-local generative travel UI decision"
Cohesion: 0.17
Nodes (12): Agent context and tool contracts, Browser-local generative travel UI decision, Component catalog versus generated HTML or React, Current application and data boundary, Decision to make, Demo moments the catalog must support, Evaluation rubric, Experience and acceptance scenarios (+4 more)

### Community 16 - "a/toolkit.tsx"
Cohesion: 0.09
Nodes (21): generative, library, Travel UI evidence capture: 0-1280-blue-partial, Travel UI evidence capture: 0-1280-blue, Travel UI evidence capture: 0-360-blue-partial, Travel UI evidence capture: 0-360-blue, Travel UI evidence capture: 0-360-sand-partial, Travel UI evidence capture: 0-360-sand (+13 more)

### Community 17 - "Acceptance Evidence"
Cohesion: 0.11
Nodes (20): Acceptance Evidence, API Pagination, Backend Commit b1c8912, Backend Test Suite, Browser Captures, Browser flow, Browser Flow Acceptance, Coverage Parser (+12 more)

### Community 18 - "assertNoBulkData"
Cohesion: 0.13
Nodes (18): {decision}, servers, request(), createSnapshotTransport(), snapshotRequest(), messages, AgentContextEnvelope, AgentContextEnvelopeSchema (+10 more)

### Community 19 - "resource-loader.ts"
Cohesion: 0.15
Nodes (17): load(), cancel(), finish(), abortError(), coverageKey(), FarePage, LoadedResource, loadResource() (+9 more)

### Community 20 - "b/toolkit.tsx"
Cohesion: 0.10
Nodes (22): hasLaterAcceptedScene(), ScenePart, PresentBoundary(), Props, prunePresentTree(), bInstructions, ComposeSceneInputSchema, hasAcceptedRepairAfter() (+14 more)

### Community 21 - "request-schema.ts"
Cohesion: 0.15
Nodes (15): ErrorOutput, FareFactHistorySchema, id, LegacyBoundedFareFactSchema, MessageSchema, parseChatRequest(), parseToolInput(), parseToolOutput() (+7 more)

### Community 22 - "scene-completion.test.ts"
Cohesion: 0.22
Nodes (14): handleChat(), CODEX_DEVELOPER_INSTRUCTIONS, ChatRequest, ack(), artifact, other, acceptTurn(), getAcceptedScenes() (+6 more)

### Community 23 - "a/spike/main.tsx"
Cohesion: 0.17
Nodes (11): App(), artifactId, bridge, input, requests, resume(), root, scenes (+3 more)

### Community 24 - "DatasetId"
Cohesion: 0.36
Nodes (3): DatasetId, QueryResource, LocalQueryEngine

### Community 25 - "resume-followup.mjs"
Cohesion: 0.14
Nodes (13): /verification/generative-ui/b/user-itinerary/resume-client.jsx, accepted, captured, errors, last, newAccepted, oldIds, prior (+5 more)

### Community 26 - "renderer.tsx"
Cohesion: 0.26
Nodes (11): QueryIR, QueryIRSchema, RuntimeVariablesSchema, evaluateQueryArguments(), findQueryStatement(), Program, rememberQueryResult(), adaptQueryResult() (+3 more)

### Community 27 - "worker-client.ts"
Cohesion: 0.16
Nodes (13): index, scalar, WorkerRequest, WorkerResponse, WorkerResponseSchema, createLocalQueryEngine(), createWorkerQueryEngine(), receive() (+5 more)

### Community 28 - "library.tsx"
Cohesion: 0.21
Nodes (10): BoundNode(), Props, Binding, context, SceneQueryProvider, useSceneQuery(), parseAction(), Owner (+2 more)

### Community 29 - "codex-provider.ts"
Cohesion: 0.24
Nodes (9): CODEX_MODEL, CODEX_REASONING_EFFORT, codexDecision(), Decision, DecisionDelta, DecisionSchema, readString(), port (+1 more)

### Community 30 - "browser.ts"
Cohesion: 0.18
Nodes (12): base, expected(), id, longTasks, Metric, percentile(), Report, rightId (+4 more)

### Community 31 - "openui-runtime.test.tsx"
Cohesion: 0.19
Nodes (11): CompactState, CompactValue, HostStateRenderer(), HostStateRendererProps, projectState(), Command, library, Mode (+3 more)

### Community 32 - "thread-shell.tsx"
Cohesion: 0.25
Nodes (7): useTravelServices(), CanonicalMessagesContext, completedNarrativeIndices(), AssistantNarrative(), partComponents, suggestions, ThreadShell()

### Community 33 - "action-router.ts"
Cohesion: 0.17
Nodes (15): Coverage, DatasetManifest, FareDataBridge, CoverageLoadStatus, covers(), createActionRouter(), requestsFor(), signature() (+7 more)

### Community 34 - "verify_pasted_coverage.py"
Cohesion: 0.44
Nodes (11): check_database(), main(), normalized(), pair(), parse_dash_line(), parse_manifest(), parse_to_line(), Path (+3 more)

### Community 35 - "Contributing Guide"
Cohesion: 0.31
Nodes (11): Pull Request Template, Pull Request Branch Target, Pull Request Verification, Contributing Guide, Branch Naming Convention, dev Branch, Focused Pull Requests, Hotfix Branch (+3 more)

### Community 36 - "Generative travel UI A/B implementation plan"
Cohesion: 0.18
Nodes (11): Completion audit, Current repository baseline, Decisions, risks, and fallback order, End-state experience, Exact repository change map, Fresh-context startup checklist, Fresh implementation starter prompt, Generative travel UI A/B implementation plan (+3 more)

### Community 37 - "query-engine.ts"
Cohesion: 0.29
Nodes (9): AllowedFareField, DatasetRevision, compare(), defaults, executeQuery(), matches(), QueryLimits, QueryResources (+1 more)

### Community 38 - "run.mjs"
Cohesion: 0.22
Nodes (7): agentPort, apiPort, children, env, start(), stop(), webPort

### Community 39 - "chat-route.ts"
Cohesion: 0.33
Nodes (7): bDefinitions, catalogDescriptors, catalogHash, catalogVersion, componentNames, orderedPropertyNames, aPrompt

### Community 40 - "createFareDataBridge"
Cohesion: 0.14
Nodes (17): fare(), setup(), TravelServices, setup(), scene, setup(), GenerativeChat(), GenerativeChatProps (+9 more)

### Community 41 - "Interactive Conversational Travel UI Evaluation"
Cohesion: 0.33
Nodes (7): Interactive Conversational Travel UI Evaluation, Travel Planner Acceptance Gates, Explicit Requirement Completion Audit, Travel Duration and Stay Semantics, Proposed Evidence Plan, Interactive Conversational Travel Planner, Incremental TypeScript Boundary Migration

### Community 42 - "request"
Cohesion: 0.48
Nodes (3): request(), cancel(), QueryWorker

### Community 43 - "repair.ts"
Cohesion: 0.57
Nodes (3): withOneRepair(), knownMessages, validationReason()

### Community 44 - "Phased implementation DAG"
Cohesion: 0.25
Nodes (8): Package ownership index, Phase 0: compatibility and shared contracts, Phase 1: browser-local application spine, Phase 2: shared experience and chat, Phase 3: Version A vertical slice, Phase 4: Version B parity and genuine reactivity, Phase 5: comparison and decision, Phased implementation DAG

### Community 45 - "validate-program.ts"
Cohesion: 0.18
Nodes (13): sharedPropsSchema, bLibrary, bComponentPropsSchema(), Binding, BindingSchema, bPropsSchema, bSchemaLibrary, value (+5 more)

### Community 46 - "query-engine/package.json"
Cohesion: 0.29
Nodes (6): dependencies, @duckdb/duckdb-wasm, name, private, type, @duckdb/duckdb-wasm

### Community 47 - "Shared architecture"
Cohesion: 0.29
Nodes (7): Bounded agent tools, Browser data and state, Chat, artifacts, and persistence, Realistic data volume and query engine, Shared architecture, Shared contracts, Synthetic price and itinerary rules

### Community 48 - "study.tsx"
Cohesion: 0.27
Nodes (8): assignment(), ratingDimensions, scenarios, withheldPrompt(), Study(), GenerativeChooser, GenerativeRoute, Study

### Community 49 - "search-client.ts"
Cohesion: 0.24
Nodes (7): PageSource, createSearchPageSource(), responseSchema, rowSchema, input, outbound, server

### Community 50 - "descriptors.ts"
Cohesion: 0.33
Nodes (4): descriptors, refs, hash, ComponentDescriptor

### Community 51 - "run-completion.mjs"
Cohesion: 0.29
Nodes (6): errors, last, requests, responses, started, timers

### Community 52 - "Repository Workflow"
Cohesion: 0.40
Nodes (5): Code Review Graph, Graph-Guided Source Verification, Graphify Knowledge Graph, Knowledge graphs, Repository Workflow

### Community 53 - "run.ts"
Cohesion: 0.33
Nodes (4): awaiting, completion, errors, measurements

### Community 54 - "Version B: agent-authored reactive wiring"
Cohesion: 0.33
Nodes (6): Guidance and repair, Program and artifact contract, QueryIR, Static and runtime limits, Version B: agent-authored reactive wiring, Version B proof

### Community 55 - "Urban Travel Scene"
Cohesion: 0.40
Nodes (6): App Call-to-Action Background Illustration, Bus, Cityscape, Intermodal Mobility, Train, Urban Travel Scene

### Community 56 - "Transportation Landscape Hero"
Cohesion: 0.33
Nodes (6): Air Travel, Bus Travel, Ferry Travel, Multimodal Travel, Rail Travel, Transportation Landscape Hero

### Community 57 - "Alternatives and tradeoffs"
Cohesion: 0.33
Nodes (6): AI SDK plus json-render, Alternatives and tradeoffs, assistant-ui shell with json-render, CopilotKit with Dynamic A2UI, OpenUI reactive program, Tambo composite or interactable components

### Community 58 - "Native A compatibility evidence"
Cohesion: 0.33
Nodes (5): Commands, Native A compatibility evidence, Observed API boundaries, Provider probe, Shared catalog and paused-stream proof

### Community 59 - "location-catalog.ts"
Cohesion: 0.60
Nodes (3): loadLocationCatalog(), locationsSchema, selectLocations()

### Community 60 - "A/B comparison protocol"
Cohesion: 0.40
Nodes (5): A/B comparison protocol, Controlled conditions, Hard gates, Measures and decision record, Task suite

### Community 61 - "Verification strategy"
Cohesion: 0.40
Nodes (5): Contract and privacy-boundary tests, Data, query, and state tests, Repeatable commands, Stream and component tests, Verification strategy

### Community 62 - "Swarm, worktree, commit, and PR protocol"
Cohesion: 0.40
Nodes (5): Graph ownership, Integration topology, Ports, processes, and generated artifacts, Swarm, worktree, commit, and PR protocol, Worker packet and ownership

### Community 63 - "Version A: assistant-ui component composition"
Cohesion: 0.40
Nodes (5): Local bindings and actions, Runtime choice, Tree contract, Version A: assistant-ui component composition, Version A proof

### Community 64 - "Download on the Apple App Store Badge"
Cohesion: 0.40
Nodes (5): Apple App Store, Download on the Apple App Store Badge, Apple Logo, iOS App Download, Trusted Platform Acquisition

### Community 65 - "Omio Generative UI Demo"
Cohesion: 0.40
Nodes (5): Backend API Contract, Deterministic Synthetic Fares, One Million Fare SQLite Database, Omio Generative UI Demo, Original Visual Asset Sources

### Community 67 - "context.tsx"
Cohesion: 0.19
Nodes (15): artifactId, CatalogNode(), TravelContext, TravelProvider(), id, artifactId, otherId, ArtifactIdSchema (+7 more)

### Community 68 - "spike/toolkit.tsx"
Cohesion: 0.60
Nodes (3): SpikeCard(), SpikeSurface(), generative

### Community 69 - "Published OpenUI runtime compatibility"
Cohesion: 0.40
Nodes (4): Commands and outcomes, Continuation and outstanding gates, Published OpenUI runtime compatibility, Verified public interfaces

### Community 70 - "Browser query engine decision"
Cohesion: 0.40
Nodes (4): Browser query engine decision, Domain verification, Measurement, Reproduce

### Community 71 - "Huawei AppGallery Download Badge"
Cohesion: 0.50
Nodes (4): Huawei AppGallery Download Badge, Huawei AppGallery, Mobile App Download, Platform Distribution Call to Action

### Community 72 - "Machine-Readable Link"
Cohesion: 0.50
Nodes (4): Cross-Device Handoff, Machine-Readable Link, Mobile App Acquisition, Mobile App QR Code

### Community 73 - "Compass Icon"
Cohesion: 0.50
Nodes (4): Compass Icon, Directional Navigation, Explore Destinations, Travel Discovery

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

### Community 91 - "Selected fare count catalog extension"
Cohesion: 0.40
Nodes (4): Contract and ownership, Cost and boundary proof, Generator and compatibility, Selected fare count catalog extension

### Community 100 - "Generative UI implementation ledger"
Cohesion: 0.40
Nodes (4): Every package, Generative UI implementation ledger, Owners, worktrees and publication, Verification scope and remaining work

### Community 101 - "Current Omio Demo Baseline"
Cohesion: 0.40
Nodes (5): Current Omio Demo Baseline, Direct Filter Transfer Gap, Undefined Fare Unit and Monetary Total, PriceQuote, Single Route Search Limitation

### Community 102 - "Ownership and data flow"
Cohesion: 0.50
Nodes (4): Browser `FareStore`, Ownership and data flow, Per-artifact `UIStateStore`, Trusted selectors, bindings, and actions

## Knowledge Gaps
- **504 isolated node(s):** `{decision}`, `servers`, `DecisionSchema`, `DecisionDelta`, `locationsSchema` (+499 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createUIStateStore()` connect `createFareDataBridge` to `action-router.ts`, `routes.tsx`, `context.tsx`, `catalog-extension/spike/main.tsx`, `ui-state-store.ts`, `assertNoBulkData`, `scene-completion.test.ts`, `a/spike/main.tsx`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `validateReactiveProgram()` connect `validate-program.ts` to `context.tsx`, `run-matrix.mjs`, `assertNoBulkData`, `b/toolkit.tsx`, `request-schema.ts`, `renderer.tsx`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `assertNoBulkData()` connect `assertNoBulkData` to `routes.tsx`, `index.ts`, `chat-route.ts`, `createFareDataBridge`, `validate-program.ts`, `tree.ts`, `request-schema.ts`, `scene-completion.test.ts`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `createUIStateStore()` (e.g. with `dispatch()` and `get()`) actually correct?**
  _`createUIStateStore()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `{decision}`, `servers`, `DecisionSchema` to the rest of the system?**
  _504 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ResultsPage.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06892230576441102 - nodes in this community are weakly interconnected._
- **Should `component.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1468599033816425 - nodes in this community are weakly interconnected._