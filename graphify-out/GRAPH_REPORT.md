# Graph Report - omio-gen-ui-demo  (2026-10-02)

## Corpus Check
- 2 files · ~37,731 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 333 nodes · 521 edges · 26 communities (24 shown, 2 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Frontend Search Flow
- Backend Search API
- Generative UI Research
- Timetable Generation
- Interactive Planner Architecture
- Frontend Dependencies
- Acceptance Evidence
- Project and Backend Docs
- Repository Workflow
- Coverage Verification
- Database Verification
- Development Runner
- Knowledge Graph Workflow
- Urban Travel Art
- Transport Hero Art
- Apple Store Badge
- Huawei App Gallery
- QR App Handoff
- Destination Compass
- Google Play Badge
- Mobile Ticket Icon
- Scanner Frame
- Update Icon
- Backend Package

## God Nodes (most connected - your core abstractions)
1. `Generative UI Feature Fit Rubric` - 14 edges
2. `search()` - 12 edges
3. `generate_database()` - 12 edges
4. `TravelPlan` - 12 edges
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
- `Pull Request Branch Target` --conceptually_related_to--> `dev Branch`  [EXTRACTED]
  .github/pull_request_template.md → CONTRIBUTING.md
- `Pull Request Branch Target` --conceptually_related_to--> `main Branch`  [EXTRACTED]
  .github/pull_request_template.md → CONTRIBUTING.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Acceptance Verification Layers** — verification_acceptance_database_source_coverage, verification_acceptance_http_api_acceptance, verification_acceptance_browser_flow_acceptance [EXTRACTED 1.00]
- **Source Coverage Contract Verification** — verification_acceptance_generated_sqlite_database, verification_acceptance_coverage_parser, verification_acceptance_backend_test_suite, verification_acceptance_source_contract [EXTRACTED 1.00]
- **Authoritative Conversational Planner Flow** — docs_research_interactive_travel_ui_evaluation_travelplan, docs_research_interactive_travel_ui_evaluation_direct_command_flow, docs_research_interactive_travel_ui_evaluation_pricequote, docs_research_interactive_travel_ui_evaluation_conversationartifact, docs_research_interactive_travel_ui_evaluation_recommended_architecture [EXTRACTED 1.00]
- **Semantic Travel Component Catalog** — docs_research_interactive_travel_ui_evaluation_semantic_vocabulary, docs_research_interactive_travel_ui_evaluation_travelplan, docs_research_interactive_travel_ui_evaluation_travelleg, docs_research_interactive_travel_ui_evaluation_pricequote [INFERRED 0.95]
- **Declarative Composition Options** — docs_research_generative_ui_resources_json_render, docs_research_generative_ui_resources_openui, docs_research_generative_ui_resources_a2ui [EXTRACTED 1.00]
- **Controlled Rendering Options** — docs_research_generative_ui_resources_vercel_ai_sdk, docs_research_generative_ui_resources_copilotkit_framework, docs_research_generative_ui_resources_assistant_ui, docs_research_generative_ui_resources_chainlit [EXTRACTED 1.00]
- **Dual-Graph Repository Analysis** — agents_repository_workflow, agents_code_review_graph, agents_graphify_knowledge_graph, agents_graph_guided_source_verification [EXTRACTED 1.00]
- **App Call-to-Action Intermodal Scene** — public_assets_omio_app_background_app_cta_background, public_assets_omio_app_background_urban_travel_scene, public_assets_omio_app_background_bus, public_assets_omio_app_background_train, public_assets_omio_app_background_cityscape [INFERRED 0.75]
- **Multimodal Passenger Transport** — public_assets_omio_hero_air_travel, public_assets_omio_hero_rail_travel, public_assets_omio_hero_bus_travel, public_assets_omio_hero_ferry_travel [INFERRED 0.85]
- **Synthetic Multimodal Search Demo** — backend_readme_synthetic_timetable_backend, backend_readme_deterministic_synthetic_timetable, backend_readme_timetable_search_api, index_omio_travel_search_demo, index_multimodal_travel_search [INFERRED 0.95]

## Communities (26 total, 2 thin omitted)

### Community 0 - "Frontend Search Flow"
Cohesion: 0.07
Nodes (41): buildSearchUrl(), displayLocation(), getJson(), locationValue(), minutesFromDuration(), MODE_ORDER, modes, normalizeLocations() (+33 more)

### Community 1 - "Backend Search API"
Cohesion: 0.15
Nodes (28): ApiError, _connect(), _date_value(), dispatch(), _fail(), get_locations(), get_metadata(), _integer() (+20 more)

### Community 2 - "Generative UI Research"
Cohesion: 0.09
Nodes (32): A2UI, AG-UI, Agent Transport, Ant Design X, Chainlit, Controlled Tool Rendering, CopilotKit Framework, CopilotKit Generative UI Guide (+24 more)

### Community 3 - "Timetable Generation"
Cohesion: 0.14
Nodes (23): _batched(), _dates(), _direction(), directional_routes(), DirectionalRoute, _fare_rows(), generate_database(), main() (+15 more)

### Community 4 - "Interactive Planner Architecture"
Cohesion: 0.10
Nodes (27): assistant-ui, Interactive Conversational Travel UI Evaluation, Travel Planner Acceptance Gates, assistant-ui Feature Evaluation, Explicit Requirement Completion Audit, ConversationArtifact, Current Omio Demo Baseline, Assistant UI Native Composition Decision (+19 more)

### Community 5 - "Frontend Dependencies"
Cohesion: 0.09
Nodes (22): dependencies, react, react-dom, devDependencies, vite, @vitejs/plugin-react, name, private (+14 more)

### Community 6 - "Acceptance Evidence"
Cohesion: 0.11
Nodes (20): Acceptance Evidence, API Pagination, Backend Commit b1c8912, Backend Test Suite, Browser Captures, Browser flow, Browser Flow Acceptance, Coverage Parser (+12 more)

### Community 7 - "Project and Backend Docs"
Cohesion: 0.11
Nodes (16): Atomic Database Generation, Deterministic Synthetic Timetable, Generate the database, Location, Metadata, and Search Endpoints, Run the API, Search Result Eligibility, Synthetic Timetable Backend, Test (+8 more)

### Community 8 - "Repository Workflow"
Cohesion: 0.27
Nodes (13): Pull Request Template, Pull Request Branch Target, Pull Request Verification, Contributing Guide, Branch Naming Convention, dev Branch, Focused Pull Requests, Hotfix Branch (+5 more)

### Community 9 - "Coverage Verification"
Cohesion: 0.44
Nodes (11): check_database(), main(), normalized(), pair(), parse_dash_line(), parse_manifest(), parse_to_line(), Path (+3 more)

### Community 10 - "Database Verification"
Cohesion: 0.43
Nodes (5): main(), Path, Verify a generated timetable database against its schema and source manifest., _require(), verify_database()

### Community 12 - "Knowledge Graph Workflow"
Cohesion: 0.40
Nodes (5): Code Review Graph, Graph-Guided Source Verification, Graphify Knowledge Graph, Knowledge graphs, Repository Workflow

### Community 13 - "Urban Travel Art"
Cohesion: 0.40
Nodes (6): App Call-to-Action Background Illustration, Bus, Cityscape, Intermodal Mobility, Train, Urban Travel Scene

### Community 14 - "Transport Hero Art"
Cohesion: 0.33
Nodes (6): Air Travel, Bus Travel, Ferry Travel, Multimodal Travel, Rail Travel, Transportation Landscape Hero

### Community 15 - "Apple Store Badge"
Cohesion: 0.40
Nodes (5): Apple App Store, Download on the Apple App Store Badge, Apple Logo, iOS App Download, Trusted Platform Acquisition

### Community 16 - "Huawei App Gallery"
Cohesion: 0.50
Nodes (4): Huawei AppGallery Download Badge, Huawei AppGallery, Mobile App Download, Platform Distribution Call to Action

### Community 17 - "QR App Handoff"
Cohesion: 0.50
Nodes (4): Cross-Device Handoff, Machine-Readable Link, Mobile App Acquisition, Mobile App QR Code

### Community 18 - "Destination Compass"
Cohesion: 0.50
Nodes (4): Compass Icon, Directional Navigation, Explore Destinations, Travel Discovery

### Community 19 - "Google Play Badge"
Cohesion: 0.67
Nodes (3): Android App Distribution, Google Play Download Badge, Google Play

### Community 20 - "Mobile Ticket Icon"
Cohesion: 1.00
Nodes (3): Mobile Ticketing, QR Code, Mobile Ticket QR Code Icon

### Community 21 - "Scanner Frame"
Cohesion: 0.67
Nodes (3): QR Code Scanning, Scanner Frame, Visual Scan Target

### Community 22 - "Update Icon"
Cohesion: 0.67
Nodes (3): Synchronization, Update and Refresh, Updates Icon

## Knowledge Gaps
- **70 isolated node(s):** `LocationSeed`, `MODE_ORDER`, `DEFAULT_SEARCH`, `paths`, `offers` (+65 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Generative UI Feature Fit Rubric` connect `Generative UI Research` to `Interactive Planner Architecture`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `Interactive Conversational Travel UI Evaluation` connect `Interactive Planner Architecture` to `Generative UI Research`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `LocationSeed`, `MODE_ORDER`, `DEFAULT_SEARCH` to the rest of the system?**
  _70 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Frontend Search Flow` be split into smaller, more focused modules?**
  _Cohesion score 0.0677555958862674 - nodes in this community are weakly interconnected._
- **Should `Backend Search API` be split into smaller, more focused modules?**
  _Cohesion score 0.14603174603174604 - nodes in this community are weakly interconnected._
- **Should `Generative UI Research` be split into smaller, more focused modules?**
  _Cohesion score 0.09274193548387097 - nodes in this community are weakly interconnected._
- **Should `Timetable Generation` be split into smaller, more focused modules?**
  _Cohesion score 0.1402116402116402 - nodes in this community are weakly interconnected._