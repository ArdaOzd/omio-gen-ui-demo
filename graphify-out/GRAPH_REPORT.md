# Graph Report - omio-gen-ui-demo  (2026-10-02)

## Corpus Check
- Corpus is ~252 words - fits in a single context window. You may not need a graph.

## Summary
- 13 nodes · 21 edges · 3 communities
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Branch Workflow
- Branch Workflow
- Branch Workflow

## God Nodes (most connected - your core abstractions)
1. `Contributing Guide` - 9 edges
2. `dev Branch` - 6 edges
3. `main Branch` - 5 edges
4. `Repository README` - 4 edges
5. `Pull Request Template` - 3 edges
6. `Hotfix Branch` - 3 edges
7. `Release Branch` - 3 edges
8. `Pull Request Branch Target` - 3 edges
9. `Routine Working Branches` - 2 edges
10. `Omio Generative UI Demo` - 1 edges

## Surprising Connections (you probably didn't know these)
- `Pull Request Template` --semantically_similar_to--> `Contributing Guide`  [INFERRED] [semantically similar]
  .github/pull_request_template.md → CONTRIBUTING.md
- `Repository README` --references--> `Contributing Guide`  [EXTRACTED]
  README.md → CONTRIBUTING.md
- `Repository README` --references--> `dev Branch`  [EXTRACTED]
  README.md → CONTRIBUTING.md
- `Pull Request Branch Target` --conceptually_related_to--> `main Branch`  [EXTRACTED]
  .github/pull_request_template.md → CONTRIBUTING.md
- `Pull Request Branch Target` --conceptually_related_to--> `dev Branch`  [EXTRACTED]
  .github/pull_request_template.md → CONTRIBUTING.md

## Communities (3 total, 0 thin omitted)

### Community 0 - "Branch Workflow"
Cohesion: 0.47
Nodes (6): Contributing Guide, Branch Naming Convention, dev Branch, Focused Pull Requests, Release Branch, Routine Working Branches

### Community 1 - "Branch Workflow"
Cohesion: 0.50
Nodes (4): Hotfix Branch, main Branch, Repository README, Omio Generative UI Demo

### Community 2 - "Branch Workflow"
Cohesion: 0.67
Nodes (3): Pull Request Template, Pull Request Branch Target, Pull Request Verification

## Knowledge Gaps
- **4 isolated node(s):** `Omio Generative UI Demo`, `Branch Naming Convention`, `Focused Pull Requests`, `Pull Request Verification`
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Contributing Guide` connect `Branch Workflow` to `Branch Workflow`, `Branch Workflow`?**
  _High betweenness centrality (0.574) - this node is a cross-community bridge._
- **Why does `Pull Request Template` connect `Branch Workflow` to `Branch Workflow`?**
  _High betweenness centrality (0.182) - this node is a cross-community bridge._
- **Why does `Repository README` connect `Branch Workflow` to `Branch Workflow`?**
  _High betweenness centrality (0.170) - this node is a cross-community bridge._
- **What connects `Omio Generative UI Demo`, `Branch Naming Convention`, `Focused Pull Requests` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._