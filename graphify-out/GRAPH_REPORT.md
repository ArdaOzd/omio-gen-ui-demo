# Graph Report - omio-gen-ui-demo  (2026-10-02)

## Corpus Check
- 33 files · ~26,283 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 253 nodes · 412 edges · 24 communities (22 shown, 2 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 24 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Frontend Search Experience
- Backend Search API
- Timetable Data Generation
- Frontend Build Configuration
- Product Documentation
- Frontend API Integration
- Repository Contribution Workflow
- Data Coverage Verification
- Local Development Runner
- Agent Graph Workflow
- Database Verification
- App CTA Illustration
- Travel Hero Illustration
- Apple Store Badge
- AppGallery Badge
- App Download QR
- Travel Compass Icon
- Google Play Badge
- Mobile Ticket Icon
- QR Scanner Frame
- Updates Icon
- Backend Package Metadata

## God Nodes (most connected - your core abstractions)
1. `search()` - 12 edges
2. `generate_database()` - 12 edges
3. `parse_search_query()` - 11 edges
4. `dispatch()` - 11 edges
5. `displayLocation()` - 11 edges
6. `BackendTestCase` - 10 edges
7. `ResultsPage()` - 10 edges
8. `Contributing Guide` - 9 edges
9. `_fail()` - 9 edges
10. `LocationField()` - 9 edges

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
- **Dual-Graph Repository Analysis** — agents_repository_workflow, agents_code_review_graph, agents_graphify_knowledge_graph, agents_graph_guided_source_verification [EXTRACTED 1.00]
- **Synthetic Multimodal Search Demo** — backend_readme_synthetic_timetable_backend, backend_readme_deterministic_synthetic_timetable, backend_readme_timetable_search_api, index_omio_travel_search_demo, index_multimodal_travel_search [INFERRED 0.95]
- **App Call-to-Action Intermodal Scene** — public_assets_omio_app_background_app_cta_background, public_assets_omio_app_background_urban_travel_scene, public_assets_omio_app_background_bus, public_assets_omio_app_background_train, public_assets_omio_app_background_cityscape [INFERRED 0.75]
- **Multimodal Passenger Transport** — public_assets_omio_hero_air_travel, public_assets_omio_hero_rail_travel, public_assets_omio_hero_bus_travel, public_assets_omio_hero_ferry_travel [INFERRED 0.85]

## Communities (24 total, 2 thin omitted)

### Community 0 - "Frontend Search Experience"
Cohesion: 0.09
Nodes (28): displayLocation(), modes, sortTrips(), Icon(), paths, LandingPage(), offers, transportModes (+20 more)

### Community 1 - "Backend Search API"
Cohesion: 0.15
Nodes (28): ApiError, _connect(), _date_value(), dispatch(), _fail(), get_locations(), get_metadata(), _integer() (+20 more)

### Community 2 - "Timetable Data Generation"
Cohesion: 0.13
Nodes (23): _batched(), _dates(), _direction(), directional_routes(), DirectionalRoute, _fare_rows(), generate_database(), main() (+15 more)

### Community 3 - "Frontend Build Configuration"
Cohesion: 0.09
Nodes (22): dependencies, react, react-dom, devDependencies, vite, @vitejs/plugin-react, name, private (+14 more)

### Community 4 - "Product Documentation"
Cohesion: 0.11
Nodes (16): Atomic Database Generation, Deterministic Synthetic Timetable, Generate the database, Location, Metadata, and Search Endpoints, Run the API, Search Result Eligibility, Synthetic Timetable Backend, Test (+8 more)

### Community 5 - "Frontend API Integration"
Cohesion: 0.21
Nodes (13): buildSearchUrl(), getJson(), locationValue(), minutesFromDuration(), MODE_ORDER, normalizeLocations(), normalizeSearch(), normalizeTrip() (+5 more)

### Community 6 - "Repository Contribution Workflow"
Cohesion: 0.27
Nodes (13): Pull Request Template, Pull Request Branch Target, Pull Request Verification, Contributing Guide, Branch Naming Convention, dev Branch, Focused Pull Requests, Hotfix Branch (+5 more)

### Community 7 - "Data Coverage Verification"
Cohesion: 0.44
Nodes (11): check_database(), main(), normalized(), pair(), parse_dash_line(), parse_manifest(), parse_to_line(), Path (+3 more)

### Community 9 - "Agent Graph Workflow"
Cohesion: 0.40
Nodes (5): Code Review Graph, Graph-Guided Source Verification, Graphify Knowledge Graph, Knowledge graphs, Repository Workflow

### Community 10 - "Database Verification"
Cohesion: 0.53
Nodes (5): main(), Path, Verify a generated timetable database against its schema and source manifest., _require(), verify_database()

### Community 11 - "App CTA Illustration"
Cohesion: 0.40
Nodes (6): App Call-to-Action Background Illustration, Bus, Cityscape, Intermodal Mobility, Train, Urban Travel Scene

### Community 12 - "Travel Hero Illustration"
Cohesion: 0.33
Nodes (6): Air Travel, Bus Travel, Ferry Travel, Multimodal Travel, Rail Travel, Transportation Landscape Hero

### Community 13 - "Apple Store Badge"
Cohesion: 0.40
Nodes (5): Apple App Store, Download on the Apple App Store Badge, Apple Logo, iOS App Download, Trusted Platform Acquisition

### Community 14 - "AppGallery Badge"
Cohesion: 0.50
Nodes (4): Huawei AppGallery Download Badge, Huawei AppGallery, Mobile App Download, Platform Distribution Call to Action

### Community 15 - "App Download QR"
Cohesion: 0.50
Nodes (4): Cross-Device Handoff, Machine-Readable Link, Mobile App Acquisition, Mobile App QR Code

### Community 16 - "Travel Compass Icon"
Cohesion: 0.50
Nodes (4): Compass Icon, Directional Navigation, Explore Destinations, Travel Discovery

### Community 17 - "Google Play Badge"
Cohesion: 0.67
Nodes (3): Android App Distribution, Google Play Download Badge, Google Play

### Community 18 - "Mobile Ticket Icon"
Cohesion: 1.00
Nodes (3): Mobile Ticketing, QR Code, Mobile Ticket QR Code Icon

### Community 19 - "QR Scanner Frame"
Cohesion: 0.67
Nodes (3): QR Code Scanning, Scanner Frame, Visual Scan Target

### Community 20 - "Updates Icon"
Cohesion: 0.67
Nodes (3): Synchronization, Update and Refresh, Updates Icon

## Knowledge Gaps
- **55 isolated node(s):** `Knowledge graphs`, `Generate the database`, `Run the API`, `Test`, `Pull Request Verification` (+50 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `generate_database()` connect `Timetable Data Generation` to `Backend Search API`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `displayLocation()` connect `Frontend Search Experience` to `Frontend API Integration`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `BackendTestCase` connect `Backend Search API` to `Timetable Data Generation`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `Knowledge graphs`, `Generate the database`, `Run the API` to the rest of the system?**
  _55 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Frontend Search Experience` be split into smaller, more focused modules?**
  _Cohesion score 0.08717948717948718 - nodes in this community are weakly interconnected._
- **Should `Backend Search API` be split into smaller, more focused modules?**
  _Cohesion score 0.14603174603174604 - nodes in this community are weakly interconnected._
- **Should `Timetable Data Generation` be split into smaller, more focused modules?**
  _Cohesion score 0.1330049261083744 - nodes in this community are weakly interconnected._