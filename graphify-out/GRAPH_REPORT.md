# Graph Report - omio-gen-ui-demo  (2026-10-02)

## Corpus Check
- Corpus is ~42,159 words - fits in a single context window. You may not need a graph.

## Summary
- 362 nodes · 544 edges · 28 communities (26 shown, 2 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 24 edges (avg confidence: 0.85)
- Token cost: 20,184 input · 12,553 output

## Community Hubs (Navigation)
- React Travel Search UI
- Fare Database Generator
- Travel Planner Architecture
- Backend Search API Tests
- Browser-Local Generative UI
- Frontend Package Configuration
- Acceptance Verification
- Generative UI Frameworks
- Demo Data and Assets
- Source Coverage Verification
- Contribution Workflow
- Development Runtime Orchestration
- Knowledge Graph Workflow
- App CTA Illustration
- Travel Hero Illustration
- Apple App Store Badge
- Demo Data and Assets
- Demo Overview
- Huawei AppGallery Badge
- App QR Handoff
- Travel Discovery Icon
- Google Play Badge
- Mobile Ticket Icon
- QR Scanner Frame
- Update Icon
- Backend Package

## God Nodes (most connected - your core abstractions)
1. `Generative UI Feature Fit Rubric` - 14 edges
2. `search()` - 12 edges
3. `generate_database()` - 12 edges
4. `TravelPlan` - 12 edges
5. `parse_search_query()` - 11 edges
6. `dispatch()` - 11 edges
7. `displayLocation()` - 11 edges
8. `Interactive Conversational Travel UI Evaluation` - 11 edges
9. `BackendTestCase` - 10 edges
10. `ResultsPage()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Pull Request Template` --semantically_similar_to--> `Contributing Guide`  [INFERRED] [semantically similar]
  .github/pull_request_template.md → CONTRIBUTING.md
- `Multimodal Travel Search` --conceptually_related_to--> `Timetable Search API`  [INFERRED]
  index.html → backend/README.md
- `BackendTestCase` --uses--> `ApiError`  [INFERRED]
  backend/tests/test_backend.py → backend/app.py
- `Pull Request Branch Target` --conceptually_related_to--> `dev Branch`  [EXTRACTED]
  .github/pull_request_template.md → CONTRIBUTING.md
- `Pull Request Branch Target` --conceptually_related_to--> `main Branch`  [EXTRACTED]
  .github/pull_request_template.md → CONTRIBUTING.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Dual-Graph Repository Analysis** — agents_repository_workflow, agents_code_review_graph, agents_graphify_knowledge_graph, agents_graph_guided_source_verification [EXTRACTED 1.00]
- **Controlled Rendering Options** — docs_research_generative_ui_resources_vercel_ai_sdk, docs_research_generative_ui_resources_copilotkit_framework, docs_research_generative_ui_resources_assistant_ui, docs_research_generative_ui_resources_chainlit [EXTRACTED 1.00]
- **Declarative Composition Options** — docs_research_generative_ui_resources_json_render, docs_research_generative_ui_resources_openui, docs_research_generative_ui_resources_a2ui [EXTRACTED 1.00]
- **Acceptance Verification Layers** — verification_acceptance_database_source_coverage, verification_acceptance_http_api_acceptance, verification_acceptance_browser_flow_acceptance [EXTRACTED 1.00]
- **Source Coverage Contract Verification** — verification_acceptance_generated_sqlite_database, verification_acceptance_coverage_parser, verification_acceptance_backend_test_suite, verification_acceptance_source_contract [EXTRACTED 1.00]
- **App Call-to-Action Intermodal Scene** — public_assets_omio_app_background_app_cta_background, public_assets_omio_app_background_urban_travel_scene, public_assets_omio_app_background_bus, public_assets_omio_app_background_train, public_assets_omio_app_background_cityscape [INFERRED 0.75]
- **Multimodal Passenger Transport** — public_assets_omio_hero_air_travel, public_assets_omio_hero_rail_travel, public_assets_omio_hero_bus_travel, public_assets_omio_hero_ferry_travel [INFERRED 0.85]
- **Authoritative Conversational Planner Flow** — docs_research_interactive_travel_ui_evaluation_travelplan, docs_research_interactive_travel_ui_evaluation_direct_command_flow, docs_research_interactive_travel_ui_evaluation_pricequote, docs_research_interactive_travel_ui_evaluation_conversationartifact, docs_research_interactive_travel_ui_evaluation_recommended_architecture [EXTRACTED 1.00]
- **Semantic Travel Component Catalog** — docs_research_interactive_travel_ui_evaluation_semantic_vocabulary, docs_research_interactive_travel_ui_evaluation_travelplan, docs_research_interactive_travel_ui_evaluation_travelleg, docs_research_interactive_travel_ui_evaluation_pricequote [INFERRED 0.95]
- **Browser-local artifact state flow** — docs_research_browser_local_generative_ui_decision_fare_store, docs_research_browser_local_generative_ui_decision_ui_state_store, docs_research_browser_local_generative_ui_decision_streaming_ui_state_revision_policy, docs_research_browser_local_generative_ui_decision_trusted_selector_action_registry, docs_research_browser_local_generative_ui_decision_compact_context_snapshot, docs_research_browser_local_generative_ui_decision_bounded_agent_tools [EXTRACTED 1.00]
- **Generated UI renderer decision space** — docs_research_browser_local_generative_ui_decision_assistant_ui_native_present, docs_research_browser_local_generative_ui_decision_openui_reactive_program, docs_research_browser_local_generative_ui_decision_json_render_substitute_renderer, docs_research_browser_local_generative_ui_decision_granular_component_catalog, docs_research_browser_local_generative_ui_decision_generated_code_tradeoff [EXTRACTED 1.00]

## Communities (28 total, 2 thin omitted)

### Community 0 - "React Travel Search UI"
Cohesion: 0.07
Nodes (41): buildSearchUrl(), displayLocation(), getJson(), locationValue(), minutesFromDuration(), MODE_ORDER, modes, normalizeLocations() (+33 more)

### Community 1 - "Fare Database Generator"
Cohesion: 0.10
Nodes (29): _batched(), _dates(), _direction(), directional_routes(), DirectionalRoute, _fare_rows(), generate_database(), main() (+21 more)

### Community 2 - "Travel Planner Architecture"
Cohesion: 0.07
Nodes (39): Interactive Conversational Travel UI Evaluation, A2UI Feature Evaluation, Travel Planner Acceptance Gates, AG-UI Feature Evaluation, LangChain Agent Chat UI Feature Evaluation, Ant Design X Feature Evaluation, assistant-ui Feature Evaluation, Chainlit Feature Evaluation (+31 more)

### Community 3 - "Backend Search API Tests"
Cohesion: 0.16
Nodes (27): ApiError, _connect(), _date_value(), dispatch(), _fail(), get_locations(), get_metadata(), _integer() (+19 more)

### Community 4 - "Browser-Local Generative UI"
Cohesion: 0.11
Nodes (26): A2UI surface protocol role, AG-UI transport role, Ant Design X chat role, Artifact state isolation, assistant-ui native present stack, Bounded agent tools, Browser-demo evaluation rubric, Browser-local demo scope (+18 more)

### Community 5 - "Frontend Package Configuration"
Cohesion: 0.09
Nodes (22): dependencies, react, react-dom, devDependencies, vite, @vitejs/plugin-react, name, private (+14 more)

### Community 6 - "Acceptance Verification"
Cohesion: 0.11
Nodes (20): Acceptance Evidence, API Pagination, Backend Commit b1c8912, Backend Test Suite, Browser Captures, Browser flow, Browser Flow Acceptance, Coverage Parser (+12 more)

### Community 7 - "Generative UI Frameworks"
Cohesion: 0.13
Nodes (20): A2UI, AG-UI, Agent Transport, Ant Design X, assistant-ui, Chainlit, Controlled Tool Rendering, CopilotKit Framework (+12 more)

### Community 8 - "Demo Data and Assets"
Cohesion: 0.15
Nodes (12): Atomic Database Generation, Deterministic Synthetic Timetable, Generate the database, Location, Metadata, and Search Endpoints, Run the API, Search Result Eligibility, Synthetic Timetable Backend, Test (+4 more)

### Community 9 - "Source Coverage Verification"
Cohesion: 0.44
Nodes (11): check_database(), main(), normalized(), pair(), parse_dash_line(), parse_manifest(), parse_to_line(), Path (+3 more)

### Community 10 - "Contribution Workflow"
Cohesion: 0.31
Nodes (11): Pull Request Template, Pull Request Branch Target, Pull Request Verification, Contributing Guide, Branch Naming Convention, dev Branch, Focused Pull Requests, Hotfix Branch (+3 more)

### Community 12 - "Knowledge Graph Workflow"
Cohesion: 0.40
Nodes (5): Code Review Graph, Graph-Guided Source Verification, Graphify Knowledge Graph, Knowledge graphs, Repository Workflow

### Community 13 - "App CTA Illustration"
Cohesion: 0.40
Nodes (6): App Call-to-Action Background Illustration, Bus, Cityscape, Intermodal Mobility, Train, Urban Travel Scene

### Community 14 - "Travel Hero Illustration"
Cohesion: 0.33
Nodes (6): Air Travel, Bus Travel, Ferry Travel, Multimodal Travel, Rail Travel, Transportation Landscape Hero

### Community 15 - "Apple App Store Badge"
Cohesion: 0.40
Nodes (5): Apple App Store, Download on the Apple App Store Badge, Apple Logo, iOS App Download, Trusted Platform Acquisition

### Community 16 - "Demo Data and Assets"
Cohesion: 0.40
Nodes (4): Live Landing Page Asset Provenance, Mobile App Call-to-Action Assets, Non-Production Visual Reference Use, Omio Reference Assets

### Community 17 - "Demo Overview"
Cohesion: 0.40
Nodes (5): Backend API Contract, Deterministic Synthetic Fares, One Million Fare SQLite Database, Omio Generative UI Demo, Original Visual Asset Sources

### Community 18 - "Huawei AppGallery Badge"
Cohesion: 0.50
Nodes (4): Huawei AppGallery Download Badge, Huawei AppGallery, Mobile App Download, Platform Distribution Call to Action

### Community 19 - "App QR Handoff"
Cohesion: 0.50
Nodes (4): Cross-Device Handoff, Machine-Readable Link, Mobile App Acquisition, Mobile App QR Code

### Community 20 - "Travel Discovery Icon"
Cohesion: 0.50
Nodes (4): Compass Icon, Directional Navigation, Explore Destinations, Travel Discovery

### Community 21 - "Google Play Badge"
Cohesion: 0.67
Nodes (3): Android App Distribution, Google Play Download Badge, Google Play

### Community 22 - "Mobile Ticket Icon"
Cohesion: 1.00
Nodes (3): Mobile Ticketing, QR Code, Mobile Ticket QR Code Icon

### Community 23 - "QR Scanner Frame"
Cohesion: 0.67
Nodes (3): QR Code Scanning, Scanner Frame, Visual Scan Target

### Community 24 - "Update Icon"
Cohesion: 0.67
Nodes (3): Synchronization, Update and Refresh, Updates Icon

## Knowledge Gaps
- **97 isolated node(s):** `LocationSeed`, `name`, `version`, `private`, `type` (+92 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `LocationSeed`, `name`, `version` to the rest of the system?**
  _97 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `React Travel Search UI` be split into smaller, more focused modules?**
  _Cohesion score 0.0677555958862674 - nodes in this community are weakly interconnected._
- **Should `Fare Database Generator` be split into smaller, more focused modules?**
  _Cohesion score 0.10256410256410256 - nodes in this community are weakly interconnected._
- **Should `Travel Planner Architecture` be split into smaller, more focused modules?**
  _Cohesion score 0.06612685560053981 - nodes in this community are weakly interconnected._
- **Should `Browser-Local Generative UI` be split into smaller, more focused modules?**
  _Cohesion score 0.11384615384615385 - nodes in this community are weakly interconnected._
- **Should `Frontend Package Configuration` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Should `Acceptance Verification` be split into smaller, more focused modules?**
  _Cohesion score 0.10952380952380952 - nodes in this community are weakly interconnected._