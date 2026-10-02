# Graph Report - omio-gen-ui-demo  (2026-10-02)

## Corpus Check
- Corpus is ~42,250 words - fits in a single context window. You may not need a graph.

## Summary
- 362 nodes · 569 edges · 26 communities (24 shown, 2 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 36 edges (avg confidence: 0.86)
- Token cost: 20,184 input · 12,553 output

## Community Hubs (Navigation)
- React Travel Search UI
- Browser-Local Generative UI
- Browser-Local Generative UI
- Fare Database Generator
- Backend Search API Tests
- Frontend Package Configuration
- Acceptance Verification
- Demo Data and Assets
- Source Coverage Verification
- Contribution Workflow
- Development Runtime Orchestration
- Knowledge Graph Workflow
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
- Backend Package

## God Nodes (most connected - your core abstractions)
1. `Generative UI Feature Fit Rubric` - 14 edges
2. `TravelPlan` - 13 edges
3. `search()` - 12 edges
4. `generate_database()` - 12 edges
5. `displayLocation()` - 11 edges
6. `dispatch()` - 11 edges
7. `parse_search_query()` - 11 edges
8. `Interactive Conversational Travel UI Evaluation` - 11 edges
9. `BackendTestCase` - 10 edges
10. `ResultsPage()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Pull Request Template` --semantically_similar_to--> `Contributing Guide`  [INFERRED] [semantically similar]
  .github/pull_request_template.md → CONTRIBUTING.md
- `Multimodal Travel Search` --conceptually_related_to--> `Timetable Search API`  [INFERRED]
  index.html → backend/README.md
- `Mobile App Call-to-Action Assets` --conceptually_related_to--> `Omio Travel Search Demo Page`  [INFERRED]
  public/assets/omio/SOURCES.md → index.html
- `BackendTestCase` --uses--> `ApiError`  [INFERRED]
  backend/tests/test_backend.py → backend/app.py
- `A2UI surface protocol role` --semantically_similar_to--> `A2UI Feature Evaluation`  [INFERRED] [semantically similar]
  docs/research/browser-local-generative-ui-decision.md → docs/research/interactive-travel-ui-evaluation.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Authoritative Conversational Planner Flow** — docs_research_interactive_travel_ui_evaluation_travelplan, docs_research_interactive_travel_ui_evaluation_direct_command_flow, docs_research_interactive_travel_ui_evaluation_pricequote, docs_research_interactive_travel_ui_evaluation_conversationartifact, docs_research_interactive_travel_ui_evaluation_recommended_architecture [EXTRACTED 1.00]
- **Browser-local artifact state flow** — docs_research_browser_local_generative_ui_decision_fare_store, docs_research_browser_local_generative_ui_decision_ui_state_store, docs_research_browser_local_generative_ui_decision_streaming_ui_state_revision_policy, docs_research_browser_local_generative_ui_decision_trusted_selector_action_registry, docs_research_browser_local_generative_ui_decision_compact_context_snapshot, docs_research_browser_local_generative_ui_decision_bounded_agent_tools [EXTRACTED 1.00]
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

### Community 0 - "React Travel Search UI"
Cohesion: 0.07
Nodes (41): buildSearchUrl(), displayLocation(), getJson(), locationValue(), minutesFromDuration(), MODE_ORDER, modes, normalizeLocations() (+33 more)

### Community 1 - "Browser-Local Generative UI"
Cohesion: 0.07
Nodes (45): Artifact state isolation, assistant-ui native present stack, Bounded agent tools, Browser-demo evaluation rubric, Browser-local demo scope, Compact current-context snapshot, Dataset coverage contract, Browser-local generative travel UI decision (+37 more)

### Community 2 - "Browser-Local Generative UI"
Cohesion: 0.08
Nodes (40): A2UI surface protocol role, AG-UI transport role, Ant Design X chat role, CopilotKit Dynamic A2UI alternative, Google Generative UI research role, json-render substitute renderer, OpenUI reactive program alternative, Thirteen-repository comparison (+32 more)

### Community 3 - "Fare Database Generator"
Cohesion: 0.10
Nodes (29): _batched(), _dates(), _direction(), directional_routes(), DirectionalRoute, _fare_rows(), generate_database(), main() (+21 more)

### Community 4 - "Backend Search API Tests"
Cohesion: 0.16
Nodes (27): ApiError, _connect(), _date_value(), dispatch(), _fail(), get_locations(), get_metadata(), _integer() (+19 more)

### Community 5 - "Frontend Package Configuration"
Cohesion: 0.09
Nodes (22): dependencies, react, react-dom, devDependencies, vite, @vitejs/plugin-react, name, private (+14 more)

### Community 6 - "Acceptance Verification"
Cohesion: 0.11
Nodes (20): Acceptance Evidence, API Pagination, Backend Commit b1c8912, Backend Test Suite, Browser Captures, Browser flow, Browser Flow Acceptance, Coverage Parser (+12 more)

### Community 7 - "Demo Data and Assets"
Cohesion: 0.11
Nodes (16): Atomic Database Generation, Deterministic Synthetic Timetable, Generate the database, Location, Metadata, and Search Endpoints, Run the API, Search Result Eligibility, Synthetic Timetable Backend, Test (+8 more)

### Community 8 - "Source Coverage Verification"
Cohesion: 0.44
Nodes (11): check_database(), main(), normalized(), pair(), parse_dash_line(), parse_manifest(), parse_to_line(), Path (+3 more)

### Community 9 - "Contribution Workflow"
Cohesion: 0.31
Nodes (11): Pull Request Template, Pull Request Branch Target, Pull Request Verification, Contributing Guide, Branch Naming Convention, dev Branch, Focused Pull Requests, Hotfix Branch (+3 more)

### Community 11 - "Knowledge Graph Workflow"
Cohesion: 0.40
Nodes (5): Code Review Graph, Graph-Guided Source Verification, Graphify Knowledge Graph, Knowledge graphs, Repository Workflow

### Community 12 - "App CTA Illustration"
Cohesion: 0.40
Nodes (6): App Call-to-Action Background Illustration, Bus, Cityscape, Intermodal Mobility, Train, Urban Travel Scene

### Community 13 - "Travel Hero Illustration"
Cohesion: 0.33
Nodes (6): Air Travel, Bus Travel, Ferry Travel, Multimodal Travel, Rail Travel, Transportation Landscape Hero

### Community 14 - "Apple App Store Badge"
Cohesion: 0.40
Nodes (5): Apple App Store, Download on the Apple App Store Badge, Apple Logo, iOS App Download, Trusted Platform Acquisition

### Community 15 - "Demo Overview"
Cohesion: 0.40
Nodes (5): Backend API Contract, Deterministic Synthetic Fares, One Million Fare SQLite Database, Omio Generative UI Demo, Original Visual Asset Sources

### Community 16 - "Huawei AppGallery Badge"
Cohesion: 0.50
Nodes (4): Huawei AppGallery Download Badge, Huawei AppGallery, Mobile App Download, Platform Distribution Call to Action

### Community 17 - "App QR Handoff"
Cohesion: 0.50
Nodes (4): Cross-Device Handoff, Machine-Readable Link, Mobile App Acquisition, Mobile App QR Code

### Community 18 - "Travel Discovery Icon"
Cohesion: 0.50
Nodes (4): Compass Icon, Directional Navigation, Explore Destinations, Travel Discovery

### Community 19 - "Google Play Badge"
Cohesion: 0.67
Nodes (3): Android App Distribution, Google Play Download Badge, Google Play

### Community 20 - "Mobile Ticket Icon"
Cohesion: 1.00
Nodes (3): Mobile Ticketing, QR Code, Mobile Ticket QR Code Icon

### Community 21 - "QR Scanner Frame"
Cohesion: 0.67
Nodes (3): QR Code Scanning, Scanner Frame, Visual Scan Target

### Community 22 - "Update Icon"
Cohesion: 0.67
Nodes (3): Synchronization, Update and Refresh, Updates Icon

## Knowledge Gaps
- **77 isolated node(s):** `LocationSeed`, `MODE_ORDER`, `DEFAULT_SEARCH`, `paths`, `offers` (+72 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Generative UI Feature Fit Rubric` connect `Browser-Local Generative UI` to `Browser-Local Generative UI`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `Interactive Conversational Travel UI Evaluation` connect `Browser-Local Generative UI` to `Browser-Local Generative UI`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **What connects `LocationSeed`, `MODE_ORDER`, `DEFAULT_SEARCH` to the rest of the system?**
  _77 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `React Travel Search UI` be split into smaller, more focused modules?**
  _Cohesion score 0.0677555958862674 - nodes in this community are weakly interconnected._
- **Should `Browser-Local Generative UI` be split into smaller, more focused modules?**
  _Cohesion score 0.06767676767676768 - nodes in this community are weakly interconnected._
- **Should `Browser-Local Generative UI` be split into smaller, more focused modules?**
  _Cohesion score 0.07564102564102564 - nodes in this community are weakly interconnected._
- **Should `Fare Database Generator` be split into smaller, more focused modules?**
  _Cohesion score 0.10256410256410256 - nodes in this community are weakly interconnected._