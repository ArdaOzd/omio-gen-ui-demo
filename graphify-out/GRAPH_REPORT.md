# Graph Report - omio-gen-ui-demo  (2026-10-03)

## Corpus Check
- 230 files · ~965,408 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1277 nodes · 2515 edges · 112 communities (92 shown, 20 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 90 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a4248aa6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ResultsPage.jsx
- component.tsx
- routes.tsx
- dependencies
- app.py
- Repository details
- TravelPlan
- index.ts
- scripts
- devDependencies
- compilerOptions
- run-matrix.mjs
- ui-state-store.ts
- context.tsx
- tree.ts
- Browser-local generative travel UI decision
- a/toolkit.tsx
- Acceptance Evidence
- assertNoBulkData
- fare-data-bridge.ts
- b/toolkit.tsx
- request-schema.ts
- scene-completion.test.ts
- a/spike/main.tsx
- worker-client.ts
- resume-followup.mjs
- catalog-extension/spike/main.tsx
- Generative UI Feature Fit Rubric
- renderer.tsx
- codex-provider.ts
- browser.ts
- openui-runtime.test.tsx
- thread-shell.tsx
- Interactive Conversational Travel UI Evaluation
- verify_pasted_coverage.py
- Contributing Guide
- Generative travel UI A/B implementation plan
- query-engine.ts
- scripts/run.mjs
- validate-program.ts
- createFareDataBridge
- selected-fare-count.test.tsx
- createWorkerQueryEngine
- chat-route.ts
- Phased implementation DAG
- run-multicity-proof.mts
- query-engine/package.json
- Shared architecture
- runtime-provider.tsx
- present-boundary.tsx
- Alternatives and tradeoffs
- run-completion.mjs
- Repository Workflow
- run.ts
- Version B: agent-authored reactive wiring
- Urban Travel Scene
- Transportation Landscape Hero
- Selected fare count catalog extension
- Native A compatibility evidence
- location-catalog.ts
- A/B comparison protocol
- Verification strategy
- Swarm, worktree, commit, and PR protocol
- Version A: assistant-ui component composition
- Download on the Apple App Store Badge
- Omio Generative UI Demo
- run-query-benchmark.mjs
- ArtifactIdSchema
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
- Generative UI implementation ledger
- Current Omio Demo Baseline
- package.json
- Ownership and data flow
- Distinct travel catalog primitives
- @assistant-ui/vite
- @testing-library/react
- vitest
- catalog-extension/README.md
- run-browser.mjs
- resume-artifacts/README.md
- study/README.md

## God Nodes (most connected - your core abstractions)
1. `createFareDataBridge()` - 36 edges
2. `createUIStateStore()` - 34 edges
3. `ArtifactIdSchema` - 32 edges
4. `assertNoBulkData()` - 21 edges
5. `createActionRouter()` - 21 edges
6. `Generative travel UI A/B implementation plan` - 18 edges
7. `scripts` - 17 edges
8. `useTravelQuery()` - 17 edges
9. `cityLabel()` - 17 edges
10. `handleChat()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Pull Request Template` --semantically_similar_to--> `Contributing Guide`  [INFERRED] [semantically similar]
  .github/pull_request_template.md → CONTRIBUTING.md
- `capture()` --calls--> `exportAgentContext()`  [EXTRACTED]
  verification/generative-ui/a/spike/main.tsx → src/generative/state/snapshot-exporter.ts
- `capture()` --calls--> `exportAgentContext()`  [EXTRACTED]
  verification/generative-ui/catalog-extension/spike/main.tsx → src/generative/state/snapshot-exporter.ts
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

## Communities (112 total, 20 thin omitted)

### Community 0 - "ResultsPage.jsx"
Cohesion: 0.07
Nodes (41): buildSearchUrl(), displayLocation(), getJson(), locationValue(), minutesFromDuration(), MODE_ORDER, modes, normalizeLocations() (+33 more)

### Community 1 - "component.tsx"
Cohesion: 0.15
Nodes (37): PendingQueryProbe(), ArtifactErrorBoundary, controls, layouts, statuses, cityLabel(), departure(), duration() (+29 more)

### Community 2 - "routes.tsx"
Cohesion: 0.06
Nodes (32): Implemented comparison demo and evidence matrix, Paused demo continuation handoff, Signed-in Codex local travel comparison, TravelServices, descriptors, refs, hash, Forty shared granular travel descriptors (+24 more)

### Community 3 - "dependencies"
Cohesion: 0.09
Nodes (23): ai, @ai-sdk/react, assistant-stream, @assistant-ui/ai-sdk, @assistant-ui/react, @assistant-ui/react-generative-ui, @openuidev/lang-core, @openuidev/react-lang (+15 more)

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
Cohesion: 0.07
Nodes (26): AllowedFareField, BoundedFareFact, CompactArtifactSnapshot, CompactSummarySchema, Coverage, DatasetFieldManifestSchema, DatasetRevision, DateSchema (+18 more)

### Community 8 - "scripts"
Cohesion: 0.12
Nodes (17): scripts, agent:dev, benchmark:query, build, check:catalog, dev, experiment:live, frontend:dev (+9 more)

### Community 9 - "devDependencies"
Cohesion: 0.08
Nodes (25): jsdom, devDependencies, jsdom, @playwright/test, @testing-library/dom, @testing-library/jest-dom, @testing-library/user-event, tsx (+17 more)

### Community 10 - "compilerOptions"
Cohesion: 0.07
Nodes (28): agent, benchmarks/query-engine, *.config.ts, DOM, DOM.Iterable, ES2022, node, src (+20 more)

### Community 11 - "run-matrix.mjs"
Cohesion: 0.05
Nodes (53): /src/generative/data/fare-data-bridge.ts, /src/generative/contracts/index.ts, /src/generative/state/persistence.ts, /src/generative/contracts/privacy.ts, /src/generative/state/ui-state-store.ts, captured, diagnostics, errors (+45 more)

### Community 12 - "ui-state-store.ts"
Cohesion: 0.13
Nodes (11): CompactArtifactSnapshotSchema, parseQuery(), UIStateRevisionSchema, UIStateStore, first, request, second, createBrowserTools() (+3 more)

### Community 13 - "context.tsx"
Cohesion: 0.14
Nodes (21): TravelContext, id, ArtifactUIState, CoverageRequest, DispatchResult, FareDataBridge, FareRow, UICommand (+13 more)

### Community 14 - "tree.ts"
Cohesion: 0.15
Nodes (14): keys, names, scope, validatePresentPrefix(), LIMITS, getSceneMetadata(), layouts, names (+6 more)

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
Cohesion: 0.15
Nodes (12): {decision}, servers, request(), AgentContextEnvelope, AgentContextEnvelopeSchema, CoverageSchema, parseAgentContext(), assertNoBulkData() (+4 more)

### Community 19 - "fare-data-bridge.ts"
Cohesion: 0.15
Nodes (20): DatasetFieldManifest, DatasetManifest, load(), cancel(), finish(), abortError(), coverageKey(), FarePage (+12 more)

### Community 20 - "b/toolkit.tsx"
Cohesion: 0.10
Nodes (17): bInstructions, ComposeSceneInputSchema, hasAcceptedRepairAfter(), SceneToolFrame(), semanticSchema, Travel UI evidence capture: case-0, Travel UI evidence capture: case-1, B authored-program evidence, 2026-10-02 (+9 more)

### Community 21 - "request-schema.ts"
Cohesion: 0.15
Nodes (12): ErrorOutput, id, MessageSchema, PartSchema, RequestSchema, revision, TOOL_NAMES, ToolSchema (+4 more)

### Community 22 - "scene-completion.test.ts"
Cohesion: 0.26
Nodes (12): handleChat(), ChatRequest, request, ack(), artifact, other, acceptTurn(), getAcceptedScenes() (+4 more)

### Community 23 - "a/spike/main.tsx"
Cohesion: 0.15
Nodes (12): App(), artifactId, bridge, capture(), input, requests, resume(), root (+4 more)

### Community 24 - "worker-client.ts"
Cohesion: 0.14
Nodes (15): index, BoundedQueryResult, DatasetId, QueryIR, scalar, WorkerRequest, WorkerResponse, WorkerResponseSchema (+7 more)

### Community 25 - "resume-followup.mjs"
Cohesion: 0.14
Nodes (13): /verification/generative-ui/b/user-itinerary/resume-client.jsx, accepted, captured, errors, last, newAccepted, oldIds, prior (+5 more)

### Community 26 - "catalog-extension/spike/main.tsx"
Cohesion: 0.14
Nodes (12): App(), artifactId, bridge, capture(), input, requests, resume(), root (+4 more)

### Community 27 - "Generative UI Feature Fit Rubric"
Cohesion: 0.15
Nodes (13): A2UI Feature Evaluation, AG-UI Feature Evaluation, LangChain Agent Chat UI Feature Evaluation, Ant Design X Feature Evaluation, Chainlit Feature Evaluation, CopilotKit Feature Evaluation, CopilotKit Generative UI Guide Evaluation, Generative UI Feature Fit Rubric (+5 more)

### Community 28 - "renderer.tsx"
Cohesion: 0.10
Nodes (26): ArtifactUIStateSchema, QueryIRSchema, RuntimeVariablesSchema, UICommandPatchSchema, ValidatedQueryIR, bLibrary, BoundNode(), Props (+18 more)

### Community 29 - "codex-provider.ts"
Cohesion: 0.17
Nodes (13): CODEX_DEVELOPER_INSTRUCTIONS, CODEX_MODEL, CODEX_REASONING_EFFORT, codexDecision(), Decision, DecisionDelta, DecisionSchema, readString() (+5 more)

### Community 30 - "browser.ts"
Cohesion: 0.18
Nodes (12): base, expected(), id, longTasks, Metric, percentile(), Report, rightId (+4 more)

### Community 31 - "openui-runtime.test.tsx"
Cohesion: 0.19
Nodes (11): CompactState, CompactValue, HostStateRenderer(), HostStateRendererProps, projectState(), Command, library, Mode (+3 more)

### Community 32 - "thread-shell.tsx"
Cohesion: 0.23
Nodes (9): useTravelServices(), CanonicalMessagesContext, completedLocalToolIndices(), completedNarrativeIndices(), localToolNames, AssistantNarrative(), partComponents, suggestions (+1 more)

### Community 33 - "Interactive Conversational Travel UI Evaluation"
Cohesion: 0.33
Nodes (7): Interactive Conversational Travel UI Evaluation, Travel Planner Acceptance Gates, Explicit Requirement Completion Audit, Travel Duration and Stay Semantics, Proposed Evidence Plan, Interactive Conversational Travel Planner, Incremental TypeScript Boundary Migration

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
Cohesion: 0.21
Nodes (11): DatasetRevisionSchema, compare(), defaults, executeQuery(), matches(), QueryLimits, QueryResources, datasetId (+3 more)

### Community 38 - "scripts/run.mjs"
Cohesion: 0.22
Nodes (7): agentPort, apiPort, children, env, start(), stop(), webPort

### Community 39 - "validate-program.ts"
Cohesion: 0.15
Nodes (16): bDefinitions, catalogDescriptors, catalogHash, catalogVersion, componentNames, orderedPropertyNames, sharedPropsSchema, bComponentPropsSchema() (+8 more)

### Community 40 - "createFareDataBridge"
Cohesion: 0.14
Nodes (22): artifactId, fare(), setup(), CatalogNode(), id, setup(), scene, setup() (+14 more)

### Community 41 - "selected-fare-count.test.tsx"
Cohesion: 0.31
Nodes (6): TravelProvider(), artifactId, otherId, FareIdSchema, createSyntheticRows(), id

### Community 42 - "createWorkerQueryEngine"
Cohesion: 0.31
Nodes (6): createLocalQueryEngine(), createWorkerQueryEngine(), receive(), request(), cancel(), QueryWorker

### Community 43 - "chat-route.ts"
Cohesion: 0.38
Nodes (5): withOneRepair(), parseToolInput(), knownMessages, validationReason(), aPrompt

### Community 44 - "Phased implementation DAG"
Cohesion: 0.25
Nodes (8): Package ownership index, Phase 0: compatibility and shared contracts, Phase 1: browser-local application spine, Phase 2: shared experience and chat, Phase 3: Version A vertical slice, Phase 4: Version B parity and genuine reactivity, Phase 5: comparison and decision, Phased implementation DAG

### Community 45 - "run-multicity-proof.mts"
Cohesion: 0.22
Nodes (7): CoverageRequestSchema, PersistedThreadSchema, errors, record, requests, scene, state

### Community 46 - "query-engine/package.json"
Cohesion: 0.29
Nodes (6): dependencies, @duckdb/duckdb-wasm, name, private, type, @duckdb/duckdb-wasm

### Community 47 - "Shared architecture"
Cohesion: 0.29
Nodes (7): Bounded agent tools, Browser data and state, Chat, artifacts, and persistence, Realistic data volume and query engine, Shared architecture, Shared contracts, Synthetic price and itinerary rules

### Community 48 - "runtime-provider.tsx"
Cohesion: 0.21
Nodes (6): normalizeToolContinuations(), GenerativeChat(), GenerativeChatProps, createSnapshotTransport(), snapshotRequest(), messages

### Community 49 - "present-boundary.tsx"
Cohesion: 0.39
Nodes (5): hasLaterAcceptedScene(), ScenePart, PresentBoundary(), Props, prunePresentTree()

### Community 50 - "Alternatives and tradeoffs"
Cohesion: 0.33
Nodes (6): AI SDK plus json-render, Alternatives and tradeoffs, assistant-ui shell with json-render, CopilotKit with Dynamic A2UI, OpenUI reactive program, Tambo composite or interactable components

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

### Community 57 - "Selected fare count catalog extension"
Cohesion: 0.40
Nodes (4): Contract and ownership, Cost and boundary proof, Generator and compatibility, Selected fare count catalog extension

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

### Community 67 - "ArtifactIdSchema"
Cohesion: 0.29
Nodes (6): ArtifactId, ArtifactIdSchema, createArtifactStore(), fixture(), request, row

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

### Community 90 - "Generative UI implementation ledger"
Cohesion: 0.40
Nodes (4): Every package, Generative UI implementation ledger, Owners, worktrees and publication, Verification scope and remaining work

### Community 91 - "Current Omio Demo Baseline"
Cohesion: 0.40
Nodes (5): Current Omio Demo Baseline, Direct Filter Transfer Gap, Undefined Fare Unit and Monetary Total, PriceQuote, Single Route Search Limitation

### Community 100 - "package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 101 - "Ownership and data flow"
Cohesion: 0.50
Nodes (4): Browser `FareStore`, Ownership and data flow, Per-artifact `UIStateStore`, Trusted selectors, bindings, and actions

## Knowledge Gaps
- **504 isolated node(s):** `{decision}`, `servers`, `DecisionSchema`, `DecisionDelta`, `locationsSchema` (+499 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `validateReactiveProgram()` connect `validate-program.ts` to `selected-fare-count.test.tsx`, `chat-route.ts`, `run-matrix.mjs`, `assertNoBulkData`, `b/toolkit.tsx`, `request-schema.ts`, `renderer.tsx`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `assertNoBulkData()` connect `assertNoBulkData` to `routes.tsx`, `validate-program.ts`, `chat-route.ts`, `ui-state-store.ts`, `tree.ts`, `runtime-provider.tsx`, `request-schema.ts`, `scene-completion.test.ts`, `codex-provider.ts`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `ArtifactIdSchema` connect `ArtifactIdSchema` to `component.tsx`, `routes.tsx`, `index.ts`, `createFareDataBridge`, `selected-fare-count.test.tsx`, `ui-state-store.ts`, `context.tsx`, `runtime-provider.tsx`, `present-boundary.tsx`, `assertNoBulkData`, `b/toolkit.tsx`, `request-schema.ts`, `scene-completion.test.ts`, `a/spike/main.tsx`, `catalog-extension/spike/main.tsx`, `renderer.tsx`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `createUIStateStore()` (e.g. with `dispatch()` and `get()`) actually correct?**
  _`createUIStateStore()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `createActionRouter()` (e.g. with `.getManifest()` and `.load()`) actually correct?**
  _`createActionRouter()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `{decision}`, `servers`, `DecisionSchema` to the rest of the system?**
  _504 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ResultsPage.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06892230576441102 - nodes in this community are weakly interconnected._