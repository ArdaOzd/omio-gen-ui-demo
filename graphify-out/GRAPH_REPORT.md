# Graph Report - omio-gen-ui-demo  (2026-10-02)

## Corpus Check
- Corpus is ~54,300 words - fits in a single context window. You may not need a graph.

## Summary
- 389 nodes · 622 edges · 26 communities (24 shown, 2 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 36 edges (avg confidence: 0.86)
- Token cost: 20,184 input · 12,553 output

## Graph Freshness
- Built from commit: `e6f718d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Fare Database Generator
- Backend Search API Tests
- Source Coverage Verification
- React Travel Search UI
- Development Runtime Orchestration
- Knowledge Graph Workflow
- Backend Package
- Frontend Package Configuration
- Acceptance Verification
- Demo Data and Assets
- Browser-Local Generative UI
- Browser-Local Generative UI
- App CTA Illustration
- Travel Hero Illustration
- Apple App Store Badge
- Demo Overview
- Huawei AppGallery Badge
- App QR Handoff
- Travel Discovery Icon
- Google Play Badge
- Mobile Ticket Icon
- QR Scanner Frame
- Update Icon
- Contribution Workflow

## God Nodes (most connected - your core abstractions)
1. `Generative travel UI A/B implementation plan` - 27 edges
2. `Generative UI Feature Fit Rubric` - 14 edges
3. `TravelPlan` - 13 edges
4. `generate_database()` - 12 edges
5. `search()` - 12 edges
6. `displayLocation()` - 11 edges
7. `dispatch()` - 11 edges
8. `parse_search_query()` - 11 edges
9. `Browser-local generative travel UI decision` - 11 edges
10. `Interactive Conversational Travel UI Evaluation` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Pull Request Template` --semantically_similar_to--> `Contributing Guide`  [INFERRED] [semantically similar]
  .github/pull_request_template.md → CONTRIBUTING.md
- `Multimodal Travel Search` --conceptually_related_to--> `Timetable Search API`  [INFERRED]
  index.html → backend/README.md
- `Mobile App Call-to-Action Assets` --conceptually_related_to--> `Omio Travel Search Demo Page`  [INFERRED]
  public/assets/omio/SOURCES.md → index.html
- `BackendTestCase` --uses--> `ApiError`  [INFERRED]
  backend/tests/test_backend.py → backend/app.py
- `Compact current-context snapshot` --conceptually_related_to--> `Active Plan and Historical Conversation State`  [INFERRED]
  docs/research/browser-local-generative-ui-decision.md → docs/research/interactive-travel-ui-evaluation.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Authoritative Conversational Planner Flow** — docs_research_interactive_travel_ui_evaluation_travelplan, docs_research_interactive_travel_ui_evaluation_direct_command_flow, docs_research_interactive_travel_ui_evaluation_pricequote, docs_research_interactive_travel_ui_evaluation_conversationartifact, docs_research_interactive_travel_ui_evaluation_recommended_architecture [EXTRACTED 1.00]
- **Browser-local artifact state flow** — docs_research_browser_local_generative_ui_decision_fare_store, docs_research_browser_local_generative_ui_decision_ui_state_store, docs_research_browser_local_generative_ui_decision_streaming_ui_state_revision_policy, docs_research_browser_local_generative_ui_decision_trusted_selector_action_registry, docs_research_browser_local_generative_ui_decision_compact_context_snapshot, docs_research_browser_local_generative_ui_decision_bounded_agent_tools [EXTRACTED 1.00]
- **A/B generative renderer comparison** — docs_plans_generative_ui_ab_implementation_plan_version_a, docs_plans_generative_ui_ab_implementation_plan_version_b, docs_plans_generative_ui_ab_implementation_plan_query_ir, docs_plans_generative_ui_ab_implementation_plan_ab_protocol, docs_plans_generative_ui_ab_implementation_plan_hard_gates [EXTRACTED 1.00]
- **Incremental swarm implementation delivery** — docs_plans_generative_ui_ab_implementation_plan_repository_map, docs_plans_generative_ui_ab_implementation_plan_phased_dag, docs_plans_generative_ui_ab_implementation_plan_package_ownership, docs_plans_generative_ui_ab_implementation_plan_swarm_protocol, docs_plans_generative_ui_ab_implementation_plan_graph_ownership, docs_plans_generative_ui_ab_implementation_plan_completion_audit [EXTRACTED 1.00]
- **Shared browser-local generative UI flow** — docs_plans_generative_ui_ab_implementation_plan_shared_architecture, docs_plans_generative_ui_ab_implementation_plan_browser_state, docs_plans_generative_ui_ab_implementation_plan_bounded_tools, docs_plans_generative_ui_ab_implementation_plan_artifact_persistence, docs_plans_generative_ui_ab_implementation_plan_component_catalog [EXTRACTED 1.00]
- **Declarative Composition Options** — docs_research_generative_ui_resources_json_render, docs_research_generative_ui_resources_openui, docs_research_generative_ui_resources_a2ui [EXTRACTED 1.00]
- **Controlled Rendering Options** — docs_research_generative_ui_resources_vercel_ai_sdk, docs_research_generative_ui_resources_copilotkit_framework, docs_research_generative_ui_resources_assistant_ui, docs_research_generative_ui_resources_chainlit [EXTRACTED 1.00]
- **Dual-Graph Repository Analysis** — agents_repository_workflow, agents_code_review_graph, agents_graphify_knowledge_graph, agents_graph_guided_source_verification [EXTRACTED 1.00]
- **Generated UI renderer decision space** — docs_research_browser_local_generative_ui_decision_assistant_ui_native_present, docs_research_browser_local_generative_ui_decision_openui_reactive_program, docs_research_browser_local_generative_ui_decision_json_render_substitute_renderer, docs_research_browser_local_generative_ui_decision_granular_component_catalog, docs_research_browser_local_generative_ui_decision_generated_code_tradeoff [EXTRACTED 1.00]
- **Acceptance Verification Layers** — verification_acceptance_database_source_coverage, verification_acceptance_http_api_acceptance, verification_acceptance_browser_flow_acceptance [EXTRACTED 1.00]
- **Source Coverage Contract Verification** — verification_acceptance_generated_sqlite_database, verification_acceptance_coverage_parser, verification_acceptance_backend_test_suite, verification_acceptance_source_contract [EXTRACTED 1.00]
- **App Call-to-Action Intermodal Scene** — public_assets_omio_app_background_app_cta_background, public_assets_omio_app_background_urban_travel_scene, public_assets_omio_app_background_bus, public_assets_omio_app_background_train, public_assets_omio_app_background_cityscape [INFERRED 0.75]
- **Multimodal Passenger Transport** — public_assets_omio_hero_air_travel, public_assets_omio_hero_rail_travel, public_assets_omio_hero_bus_travel, public_assets_omio_hero_ferry_travel [INFERRED 0.85]
- **Semantic Travel Component Catalog** — docs_research_interactive_travel_ui_evaluation_semantic_vocabulary, docs_research_interactive_travel_ui_evaluation_travelplan, docs_research_interactive_travel_ui_evaluation_travelleg, docs_research_interactive_travel_ui_evaluation_pricequote [INFERRED 0.95]
- **Synthetic Multimodal Search Demo** — backend_readme_synthetic_timetable_backend, backend_readme_deterministic_synthetic_timetable, backend_readme_timetable_search_api, index_omio_travel_search_demo, index_multimodal_travel_search [INFERRED 0.95]

## Communities (26 total, 2 thin omitted)

### Community 3 - "Fare Database Generator"
Cohesion: 0.10
Nodes (29): DirectionalRoute, LocationSeed, RouteSeed, BackendTestCase, _batched(), _dates(), _direction(), directional_routes() (+21 more)

### Community 4 - "Backend Search API Tests"
Cohesion: 0.16
Nodes (27): ApiError, SearchQuery, _connect(), _date_value(), dispatch(), _fail(), get_locations(), get_metadata() (+19 more)

### Community 8 - "Source Coverage Verification"
Cohesion: 0.44
Nodes (11): Route, check_database(), main(), normalized(), pair(), parse_dash_line(), parse_manifest(), parse_to_line() (+3 more)

### Community 0 - "React Travel Search UI"
Cohesion: 0.07
Nodes (41): buildSearchUrl(), displayLocation(), getJson(), locationValue(), minutesFromDuration(), normalizeLocations(), normalizeSearch(), normalizeTrip() (+33 more)

### Community 11 - "Knowledge Graph Workflow"
Cohesion: 0.40
Nodes (5): Knowledge graphs, Code Review Graph, Graphify Knowledge Graph, Repository Workflow, Graph-Guided Source Verification

### Community 5 - "Frontend Package Configuration"
Cohesion: 0.09
Nodes (22): dependencies, react, react-dom, devDependencies, vite, @vitejs/plugin-react, name, private (+14 more)

### Community 6 - "Acceptance Verification"
Cohesion: 0.11
Nodes (20): Browser flow, HTTP API, API Pagination, Backend Commit b1c8912, Backend Test Suite, Browser Captures, Browser Flow Acceptance, Coverage Parser (+12 more)

### Community 7 - "Demo Data and Assets"
Cohesion: 0.11
Nodes (16): Generate the database, Run the API, Test, Deterministic Synthetic Timetable, Location, Metadata, and Search Endpoints, Timetable Search API, Live Landing Page Asset Provenance, Mobile App Call-to-Action Assets (+8 more)

### Community 1 - "Browser-Local Generative UI"
Cohesion: 0.05
Nodes (72): assistant-ui, Controlled A/B comparison protocol, Chat artifact and persistence policy, Verified repository baseline, Bounded browser agent tools, FareDataBridge and UIStateStore, Requirement completion audit, Canonical shared component catalog (+64 more)

### Community 2 - "Browser-Local Generative UI"
Cohesion: 0.08
Nodes (40): A2UI, AG-UI, Agent Transport, Ant Design X, Chainlit, Controlled Tool Rendering, CopilotKit Framework, CopilotKit Generative UI Guide (+32 more)

### Community 12 - "App CTA Illustration"
Cohesion: 0.40
Nodes (6): Bus, Cityscape, Train, Urban Travel Scene, App Call-to-Action Background Illustration, Intermodal Mobility

### Community 13 - "Travel Hero Illustration"
Cohesion: 0.33
Nodes (6): Air Travel, Bus Travel, Ferry Travel, Multimodal Travel, Rail Travel, Transportation Landscape Hero

### Community 14 - "Apple App Store Badge"
Cohesion: 0.40
Nodes (5): Apple App Store, Apple Logo, iOS App Download, Download on the Apple App Store Badge, Trusted Platform Acquisition

### Community 15 - "Demo Overview"
Cohesion: 0.40
Nodes (5): Deterministic Synthetic Fares, One Million Fare SQLite Database, Backend API Contract, Omio Generative UI Demo, Original Visual Asset Sources

### Community 16 - "Huawei AppGallery Badge"
Cohesion: 0.50
Nodes (4): Huawei AppGallery, Mobile App Download, Huawei AppGallery Download Badge, Platform Distribution Call to Action

### Community 17 - "App QR Handoff"
Cohesion: 0.50
Nodes (4): Machine-Readable Link, Mobile App Acquisition, Mobile App QR Code, Cross-Device Handoff

### Community 18 - "Travel Discovery Icon"
Cohesion: 0.50
Nodes (4): Directional Navigation, Travel Discovery, Compass Icon, Explore Destinations

### Community 19 - "Google Play Badge"
Cohesion: 0.67
Nodes (3): Android App Distribution, Google Play, Google Play Download Badge

### Community 20 - "Mobile Ticket Icon"
Cohesion: 1.00
Nodes (3): Mobile Ticketing, QR Code, Mobile Ticket QR Code Icon

### Community 21 - "QR Scanner Frame"
Cohesion: 0.67
Nodes (3): QR Code Scanning, Visual Scan Target, Scanner Frame

### Community 22 - "Update Icon"
Cohesion: 0.67
Nodes (3): Synchronization, Update and Refresh, Updates Icon

### Community 9 - "Contribution Workflow"
Cohesion: 0.31
Nodes (11): Pull Request Branch Target, Pull Request Verification, Branch Naming Convention, dev Branch, Focused Pull Requests, Hotfix Branch, main Branch, Release Branch (+3 more)

## Knowledge Gaps
- **79 isolated node(s):** `LocationSeed`, `MODE_ORDER`, `DEFAULT_SEARCH`, `paths`, `offers` (+74 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.