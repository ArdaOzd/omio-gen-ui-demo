# Graph Report - omio-gen-ui-demo  (2026-10-03)

## Corpus Check
- 41 files · ~56,003 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 425 nodes · 606 edges · 34 communities (32 shown, 2 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 24 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `dc14f22f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ResultsPage.jsx
- Generative UI Feature Fit Rubric
- Browser-local generative travel UI decision
- generate_db.py
- app.py
- scripts
- Acceptance Evidence
- Timetable Search API
- verify_pasted_coverage.py
- Contributing Guide
- run.mjs
- Repository Workflow
- Urban Travel Scene
- Transportation Landscape Hero
- Download on the Apple App Store Badge
- Omio Generative UI Demo
- Huawei AppGallery Download Badge
- Machine-Readable Link
- Compass Icon
- Google Play
- Mobile Ticketing
- Visual Scan Target
- Update and Refresh
- backend/__init__.py
- tests/__init__.py
- vite.config.js
- Generative travel UI A/B implementation plan
- Repository details
- Phased implementation DAG
- Community 29
- Community 30
- Community 31

## God Nodes (most connected - your core abstractions)
1. `Generative travel UI A/B implementation plan` - 18 edges
2. `generate_database()` - 14 edges
3. `Repository details` - 14 edges
4. `Generative UI Feature Fit Rubric` - 14 edges
5. `BackendTestCase` - 13 edges
6. `Interactive Conversational Travel UI Evaluation` - 13 edges
7. `Browser-local generative travel UI decision` - 13 edges
8. `search()` - 12 edges
9. `TravelPlan` - 12 edges
10. `displayLocation()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Pull Request Template` --semantically_similar_to--> `Contributing Guide`  [INFERRED] [semantically similar]
  .github/pull_request_template.md → CONTRIBUTING.md
- `Mobile App Call-to-Action Assets` --conceptually_related_to--> `Omio Travel Search Demo Page`  [INFERRED]
  public/assets/omio/SOURCES.md → index.html
- `Ten Million Synthetic Fares` --conceptually_related_to--> `Deterministic Database Generation`  [INFERRED]
  README.md → backend/README.md
- `Project Command Set` --references--> `Synthetic Timetable Backend`  [EXTRACTED]
  README.md → backend/README.md
- `BackendTestCase` --uses--> `ApiError`  [INFERRED]
  backend/tests/test_backend.py → backend/app.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Authoritative Conversational Planner Flow** — docs_research_interactive_travel_ui_evaluation_travelplan, docs_research_interactive_travel_ui_evaluation_direct_command_flow, docs_research_interactive_travel_ui_evaluation_pricequote, docs_research_interactive_travel_ui_evaluation_conversationartifact, docs_research_interactive_travel_ui_evaluation_recommended_architecture [EXTRACTED 1.00]
- **Dual-Graph Repository Analysis** — agents_repository_workflow, agents_code_review_graph, agents_graphify_knowledge_graph, agents_graph_guided_source_verification [EXTRACTED 1.00]
- **Acceptance Verification Layers** — verification_acceptance_database_source_coverage, verification_acceptance_http_api_acceptance, verification_acceptance_browser_flow_acceptance [EXTRACTED 1.00]
- **Source Coverage Contract Verification** — verification_acceptance_generated_sqlite_database, verification_acceptance_coverage_parser, verification_acceptance_backend_test_suite, verification_acceptance_source_contract [EXTRACTED 1.00]
- **App Call-to-Action Intermodal Scene** — public_assets_omio_app_background_app_cta_background, public_assets_omio_app_background_urban_travel_scene, public_assets_omio_app_background_bus, public_assets_omio_app_background_train, public_assets_omio_app_background_cityscape [INFERRED 0.75]
- **Multimodal Passenger Transport** — public_assets_omio_hero_air_travel, public_assets_omio_hero_rail_travel, public_assets_omio_hero_bus_travel, public_assets_omio_hero_ferry_travel [INFERRED 0.85]
- **Synthetic Timetable Demo System** — readme_omio_generative_ui_demo, readme_synthetic_fare_database, backend_readme_synthetic_timetable_backend, backend_readme_deterministic_database_generation, backend_readme_search_api [INFERRED 0.85]
- **Semantic Travel Component Catalog** — docs_research_interactive_travel_ui_evaluation_semantic_vocabulary, docs_research_interactive_travel_ui_evaluation_travelplan, docs_research_interactive_travel_ui_evaluation_travelleg, docs_research_interactive_travel_ui_evaluation_pricequote [INFERRED 0.95]

## Communities (34 total, 2 thin omitted)

### Community 0 - "ResultsPage.jsx"
Cohesion: 0.07
Nodes (41): buildSearchUrl(), displayLocation(), getJson(), locationValue(), minutesFromDuration(), MODE_ORDER, modes, normalizeLocations() (+33 more)

### Community 1 - "Generative UI Feature Fit Rubric"
Cohesion: 0.09
Nodes (32): _batched(), _cell_weight(), _dates(), _direction(), directional_routes(), DirectionalRoute, _fare_noise(), _fare_rows() (+24 more)

### Community 2 - "Browser-local generative travel UI decision"
Cohesion: 0.05
Nodes (39): Database Verification, Deterministic Database Generation, European Capital Coverage, Fare Search Contract, Generate the database, Generated Inventory Disclaimer, Complete Route Day Coverage, Run the API (+31 more)

### Community 3 - "generate_db.py"
Cohesion: 0.06
Nodes (39): Interactive Conversational Travel UI Evaluation, A2UI Feature Evaluation, Travel Planner Acceptance Gates, AG-UI Feature Evaluation, LangChain Agent Chat UI Feature Evaluation, Ant Design X Feature Evaluation, assistant-ui Feature Evaluation, Chainlit Feature Evaluation (+31 more)

### Community 4 - "app.py"
Cohesion: 0.16
Nodes (27): ApiError, _connect(), _date_value(), dispatch(), _fail(), get_locations(), get_metadata(), _integer() (+19 more)

### Community 5 - "scripts"
Cohesion: 0.09
Nodes (22): dependencies, react, react-dom, devDependencies, vite, @vitejs/plugin-react, name, private (+14 more)

### Community 6 - "Acceptance Evidence"
Cohesion: 0.09
Nodes (22): Agent context and tool contracts, AI SDK plus json-render, Alternatives and tradeoffs, assistant-ui shell with json-render, Browser `FareStore`, Browser-local generative travel UI decision, Component catalog versus generated HTML or React, CopilotKit with Dynamic A2UI (+14 more)

### Community 7 - "Timetable Search API"
Cohesion: 0.11
Nodes (20): Acceptance Evidence, API Pagination, Backend Commit b1c8912, Backend Test Suite, Browser Captures, Browser flow, Browser Flow Acceptance, Coverage Parser (+12 more)

### Community 8 - "verify_pasted_coverage.py"
Cohesion: 0.44
Nodes (11): check_database(), main(), normalized(), pair(), parse_dash_line(), parse_manifest(), parse_to_line(), Path (+3 more)

### Community 9 - "Contributing Guide"
Cohesion: 0.31
Nodes (11): Pull Request Template, Pull Request Branch Target, Pull Request Verification, Contributing Guide, Branch Naming Convention, dev Branch, Focused Pull Requests, Hotfix Branch (+3 more)

### Community 10 - "run.mjs"
Cohesion: 0.18
Nodes (11): Completion audit, Current repository baseline, Decisions, risks, and fallback order, End-state experience, Exact repository change map, Fresh-context startup checklist, Fresh implementation starter prompt, Generative travel UI A/B implementation plan (+3 more)

### Community 11 - "Repository Workflow"
Cohesion: 0.25
Nodes (8): Package ownership index, Phase 0: compatibility and shared contracts, Phase 1: browser-local application spine, Phase 2: shared experience and chat, Phase 3: Version A vertical slice, Phase 4: Version B parity and genuine reactivity, Phase 5: comparison and decision, Phased implementation DAG

### Community 12 - "Urban Travel Scene"
Cohesion: 0.25
Nodes (7): Multimodal Travel Search, Omio Travel Search Demo Page, React Application Entry, Live Landing Page Asset Provenance, Mobile App Call-to-Action Assets, Non-Production Visual Reference Use, Omio Reference Assets

### Community 13 - "Transportation Landscape Hero"
Cohesion: 0.29
Nodes (7): Bounded agent tools, Browser data and state, Chat, artifacts, and persistence, Realistic data volume and query engine, Shared architecture, Shared contracts, Synthetic price and itinerary rules

### Community 14 - "Download on the Apple App Store Badge"
Cohesion: 0.29
Nodes (7): Guidance and repair, Program and artifact contract, QueryIR, Runtime choice, Static and runtime limits, Version B: agent-authored reactive wiring, Version B proof

### Community 16 - "Huawei AppGallery Download Badge"
Cohesion: 0.40
Nodes (5): Code Review Graph, Graph-Guided Source Verification, Graphify Knowledge Graph, Knowledge graphs, Repository Workflow

### Community 17 - "Machine-Readable Link"
Cohesion: 0.40
Nodes (6): App Call-to-Action Background Illustration, Bus, Cityscape, Intermodal Mobility, Train, Urban Travel Scene

### Community 18 - "Compass Icon"
Cohesion: 0.33
Nodes (6): Air Travel, Bus Travel, Ferry Travel, Multimodal Travel, Rail Travel, Transportation Landscape Hero

### Community 19 - "Google Play"
Cohesion: 0.40
Nodes (5): A/B comparison protocol, Controlled conditions, Hard gates, Measures and decision record, Task suite

### Community 20 - "Mobile Ticketing"
Cohesion: 0.40
Nodes (5): Contract and privacy-boundary tests, Data, query, and state tests, Repeatable commands, Stream and component tests, Verification strategy

### Community 21 - "Visual Scan Target"
Cohesion: 0.40
Nodes (5): Graph ownership, Integration topology, Ports, processes, and generated artifacts, Swarm, worktree, commit, and PR protocol, Worker packet and ownership

### Community 22 - "Update and Refresh"
Cohesion: 0.40
Nodes (5): Local bindings and actions, Runtime choice, Tree contract, Version A: assistant-ui component composition, Version A proof

### Community 23 - "backend/__init__.py"
Cohesion: 0.40
Nodes (5): Apple App Store, Download on the Apple App Store Badge, Apple Logo, iOS App Download, Trusted Platform Acquisition

### Community 24 - "tests/__init__.py"
Cohesion: 0.50
Nodes (4): Huawei AppGallery Download Badge, Huawei AppGallery, Mobile App Download, Platform Distribution Call to Action

### Community 25 - "vite.config.js"
Cohesion: 0.50
Nodes (4): Cross-Device Handoff, Machine-Readable Link, Mobile App Acquisition, Mobile App QR Code

### Community 26 - "Generative travel UI A/B implementation plan"
Cohesion: 0.50
Nodes (4): Compass Icon, Directional Navigation, Explore Destinations, Travel Discovery

### Community 27 - "Repository details"
Cohesion: 0.67
Nodes (3): Android App Distribution, Google Play Download Badge, Google Play

### Community 28 - "Phased implementation DAG"
Cohesion: 1.00
Nodes (3): Mobile Ticketing, QR Code, Mobile Ticket QR Code Icon

### Community 29 - "Community 29"
Cohesion: 0.67
Nodes (3): QR Code Scanning, Scanner Frame, Visual Scan Target

### Community 30 - "Community 30"
Cohesion: 0.67
Nodes (3): Synchronization, Update and Refresh, Updates Icon

## Knowledge Gaps
- **169 isolated node(s):** `LocationSeed`, `MODE_ORDER`, `DEFAULT_SEARCH`, `paths`, `offers` (+164 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Generative travel UI A/B implementation plan` connect `run.mjs` to `generate_db.py`, `Repository Workflow`, `Transportation Landscape Hero`, `Download on the Apple App Store Badge`, `Google Play`, `Mobile Ticketing`, `Visual Scan Target`, `Update and Refresh`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Why does `Browser-local generative travel UI decision` connect `Acceptance Evidence` to `generate_db.py`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **What connects `LocationSeed`, `MODE_ORDER`, `DEFAULT_SEARCH` to the rest of the system?**
  _169 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ResultsPage.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0677555958862674 - nodes in this community are weakly interconnected._
- **Should `Generative UI Feature Fit Rubric` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `Browser-local generative travel UI decision` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._
- **Should `generate_db.py` be split into smaller, more focused modules?**
  _Cohesion score 0.06341463414634146 - nodes in this community are weakly interconnected._