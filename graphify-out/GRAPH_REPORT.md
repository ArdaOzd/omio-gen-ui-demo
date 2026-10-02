# Graph Report - omio-gen-ui-demo  (2026-10-02)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 274 nodes · 435 edges · 25 communities (23 shown, 2 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 24 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `eb26f0e6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ResultsPage.jsx
- app.py
- generate_db.py
- scripts
- Acceptance Evidence
- api.js
- Synthetic Timetable Backend
- seeds.py
- Contributing Guide
- verify_pasted_coverage.py
- run.mjs
- Repository Workflow
- Urban Travel Scene
- Transportation Landscape Hero
- Download on the Apple App Store Badge
- Huawei AppGallery Download Badge
- Machine-Readable Link
- Compass Icon
- Google Play
- Mobile Ticketing
- Visual Scan Target
- Update and Refresh
- backend/__init__.py

## God Nodes (most connected - your core abstractions)
1. `search()` - 12 edges
2. `generate_database()` - 12 edges
3. `displayLocation()` - 11 edges
4. `dispatch()` - 11 edges
5. `parse_search_query()` - 11 edges
6. `BackendTestCase` - 10 edges
7. `ResultsPage()` - 10 edges
8. `LocationField()` - 9 edges
9. `_fail()` - 9 edges
10. `parse_manifest()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Pull Request Template` --semantically_similar_to--> `Contributing Guide`  [INFERRED] [semantically similar]
  .github/pull_request_template.md → CONTRIBUTING.md
- `Multimodal Travel Search` --conceptually_related_to--> `Timetable Search API`  [INFERRED]
  index.html → backend/README.md
- `Mobile App Call-to-Action Assets` --conceptually_related_to--> `Omio Travel Search Demo Page`  [INFERRED]
  public/assets/omio/SOURCES.md → index.html
- `BackendTestCase` --uses--> `ApiError`  [INFERRED]
  backend/tests/test_backend.py → backend/app.py
- `_direction()` --uses--> `RouteSeed`  [INFERRED]
  backend/generate_db.py → backend/seeds.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Dual-Graph Repository Analysis** — agents_repository_workflow, agents_code_review_graph, agents_graphify_knowledge_graph, agents_graph_guided_source_verification [EXTRACTED 1.00]
- **Acceptance Verification Layers** — verification_acceptance_database_source_coverage, verification_acceptance_http_api_acceptance, verification_acceptance_browser_flow_acceptance [EXTRACTED 1.00]
- **Source Coverage Contract Verification** — verification_acceptance_generated_sqlite_database, verification_acceptance_coverage_parser, verification_acceptance_backend_test_suite, verification_acceptance_source_contract [EXTRACTED 1.00]
- **App Call-to-Action Intermodal Scene** — public_assets_omio_app_background_app_cta_background, public_assets_omio_app_background_urban_travel_scene, public_assets_omio_app_background_bus, public_assets_omio_app_background_train, public_assets_omio_app_background_cityscape [INFERRED 0.75]
- **Multimodal Passenger Transport** — public_assets_omio_hero_air_travel, public_assets_omio_hero_rail_travel, public_assets_omio_hero_bus_travel, public_assets_omio_hero_ferry_travel [INFERRED 0.85]
- **Synthetic Multimodal Search Demo** — backend_readme_synthetic_timetable_backend, backend_readme_deterministic_synthetic_timetable, backend_readme_timetable_search_api, index_omio_travel_search_demo, index_multimodal_travel_search [INFERRED 0.95]

## Communities (25 total, 2 thin omitted)

### Community 0 - "ResultsPage.jsx"
Cohesion: 0.09
Nodes (27): displayLocation(), sortTrips(), Icon(), paths, LandingPage(), offers, transportModes, Logo() (+19 more)

### Community 1 - "app.py"
Cohesion: 0.16
Nodes (27): ApiError, _connect(), _date_value(), dispatch(), _fail(), get_locations(), get_metadata(), _integer() (+19 more)

### Community 2 - "generate_db.py"
Cohesion: 0.15
Nodes (17): _batched(), _dates(), _direction(), directional_routes(), DirectionalRoute, _fare_rows(), generate_database(), main() (+9 more)

### Community 3 - "scripts"
Cohesion: 0.09
Nodes (22): dependencies, react, react-dom, devDependencies, vite, @vitejs/plugin-react, name, private (+14 more)

### Community 4 - "Acceptance Evidence"
Cohesion: 0.11
Nodes (20): Acceptance Evidence, API Pagination, Backend Commit b1c8912, Backend Test Suite, Browser Captures, Browser flow, Browser Flow Acceptance, Coverage Parser (+12 more)

### Community 5 - "api.js"
Cohesion: 0.19
Nodes (14): buildSearchUrl(), getJson(), locationValue(), minutesFromDuration(), MODE_ORDER, modes, normalizeLocations(), normalizeSearch() (+6 more)

### Community 6 - "Synthetic Timetable Backend"
Cohesion: 0.11
Nodes (16): Atomic Database Generation, Deterministic Synthetic Timetable, Generate the database, Location, Metadata, and Search Endpoints, Run the API, Search Result Eligibility, Synthetic Timetable Backend, Test (+8 more)

### Community 7 - "seeds.py"
Cohesion: 0.24
Nodes (12): _all_routes(), _companies_for(), _distance_km(), LocationSeed, Curated route and company inputs for the deterministic fare generator., RouteSeed, _synthetic_route(), main() (+4 more)

### Community 8 - "Contributing Guide"
Cohesion: 0.27
Nodes (13): Pull Request Template, Pull Request Branch Target, Pull Request Verification, Contributing Guide, Branch Naming Convention, dev Branch, Focused Pull Requests, Hotfix Branch (+5 more)

### Community 9 - "verify_pasted_coverage.py"
Cohesion: 0.44
Nodes (11): check_database(), main(), normalized(), pair(), parse_dash_line(), parse_manifest(), parse_to_line(), Path (+3 more)

### Community 11 - "Repository Workflow"
Cohesion: 0.40
Nodes (5): Code Review Graph, Graph-Guided Source Verification, Graphify Knowledge Graph, Knowledge graphs, Repository Workflow

### Community 12 - "Urban Travel Scene"
Cohesion: 0.40
Nodes (6): App Call-to-Action Background Illustration, Bus, Cityscape, Intermodal Mobility, Train, Urban Travel Scene

### Community 13 - "Transportation Landscape Hero"
Cohesion: 0.33
Nodes (6): Air Travel, Bus Travel, Ferry Travel, Multimodal Travel, Rail Travel, Transportation Landscape Hero

### Community 14 - "Download on the Apple App Store Badge"
Cohesion: 0.40
Nodes (5): Apple App Store, Download on the Apple App Store Badge, Apple Logo, iOS App Download, Trusted Platform Acquisition

### Community 15 - "Huawei AppGallery Download Badge"
Cohesion: 0.50
Nodes (4): Huawei AppGallery Download Badge, Huawei AppGallery, Mobile App Download, Platform Distribution Call to Action

### Community 16 - "Machine-Readable Link"
Cohesion: 0.50
Nodes (4): Cross-Device Handoff, Machine-Readable Link, Mobile App Acquisition, Mobile App QR Code

### Community 17 - "Compass Icon"
Cohesion: 0.50
Nodes (4): Compass Icon, Directional Navigation, Explore Destinations, Travel Discovery

### Community 18 - "Google Play"
Cohesion: 0.67
Nodes (3): Android App Distribution, Google Play Download Badge, Google Play

### Community 19 - "Mobile Ticketing"
Cohesion: 1.00
Nodes (3): Mobile Ticketing, QR Code, Mobile Ticket QR Code Icon

### Community 20 - "Visual Scan Target"
Cohesion: 0.67
Nodes (3): QR Code Scanning, Scanner Frame, Visual Scan Target

### Community 21 - "Update and Refresh"
Cohesion: 0.67
Nodes (3): Synchronization, Update and Refresh, Updates Icon

## Knowledge Gaps
- **63 isolated node(s):** `LocationSeed`, `companyColors`, `modeLabels`, `paths`, `offers` (+58 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `generate_database()` connect `generate_db.py` to `app.py`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `displayLocation()` connect `ResultsPage.jsx` to `api.js`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `BackendTestCase` connect `generate_db.py` to `app.py`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `LocationSeed`, `companyColors`, `modeLabels` to the rest of the system?**
  _63 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ResultsPage.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09041835357624832 - nodes in this community are weakly interconnected._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Should `Acceptance Evidence` be split into smaller, more focused modules?**
  _Cohesion score 0.10952380952380952 - nodes in this community are weakly interconnected._