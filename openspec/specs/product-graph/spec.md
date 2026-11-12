<!-- pdac-scope: cited -->

# product-graph Specification

## Purpose

Compilation of the typed product graph from Markdown artifacts, with derived reverse relationships.

## Requirements

### Requirement: The graph is compiled deterministically from canonical files

The graph compiler SHALL build nodes (id, type, title, status, path, content digest) and typed directed edges from artifact frontmatter alone, derive incoming indexes for every canonical relationship (including a bounded context's owned terms from `defined-in`), sort nodes and edges deterministically, and rebuild from scratch on every run.

{pdac:cite id="FR-GRAPH" digest="sha256:10923dd52d4516418f26c2edef6f367e3b06b945adbcc9b4423cbbe403320a9d"}

{pdac:cite id="BR-RELATIONSHIPS" digest="sha256:948608d2a917204d7aab5042dcfe4a4731b805163d54d546a6d1ee38c6954102"}

#### Scenario: Determinism across runs

- **WHEN** `product-definition graph` runs twice on identical content
- **THEN** the generated outputs are byte-identical

#### Scenario: Derived ownership

- **WHEN** a domain term declares `defined-in: BC-X`
- **THEN** the compiled graph lists the term among BC-X's derived owned terms without any authored field

### Requirement: Generated outputs are versioned and non-canonical

`product-definition graph` SHALL write `product-graph.json` (carrying a versioned schema identifier), `product-index.json`, `traceability.json` and `product-graph.mmd` under the configured generated root, and these files SHALL be reproducible and never required as input.

{pdac:cite id="BR-CANONICAL" digest="sha256:efd03de6c8d94b59bf2843d3ce20cde9446c36050b7d34cc16b42ce548ed8084"}

#### Scenario: Rebuild after deletion

- **WHEN** the generated directory is deleted and `graph` runs again
- **THEN** all outputs are regenerated identically

### Requirement: Mermaid output is a convenience view

`product-definition graph --format mermaid` SHALL emit a Mermaid diagram of nodes and typed edges. It is a convenience view only.

#### Scenario: Mermaid emission

- **WHEN** `graph --format mermaid` runs on a valid model
- **THEN** the output is parseable Mermaid flowchart text naming artifact IDs
