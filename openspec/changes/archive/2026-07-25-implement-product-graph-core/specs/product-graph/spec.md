# Product Graph

## ADDED Requirements

### Requirement: The graph is compiled deterministically from canonical files

The graph compiler SHALL build nodes (id, type, title, status, path, content digest) and typed directed edges from artifact frontmatter alone, derive incoming indexes for every canonical relationship (including a bounded context's owned terms from `defined-in`), sort nodes and edges deterministically, and rebuild from scratch on every run.

#### Scenario: Determinism across runs

- **WHEN** `product-definition graph` runs twice on identical content
- **THEN** the generated outputs are byte-identical

#### Scenario: Derived ownership

- **WHEN** a domain term declares `defined-in: BC-X`
- **THEN** the compiled graph lists the term among BC-X's derived owned terms without any authored field

### Requirement: Generated outputs are versioned and non-canonical

`product-definition graph` SHALL write `product-graph.json` (carrying a versioned schema identifier), `product-index.json`, `traceability.json` and `product-graph.mmd` under the configured generated root, and these files SHALL be reproducible and never required as input.

#### Scenario: Rebuild after deletion

- **WHEN** the generated directory is deleted and `graph` runs again
- **THEN** all outputs are regenerated identically

### Requirement: Mermaid output is a convenience view

`product-definition graph --format mermaid` SHALL emit a Mermaid diagram of nodes and typed edges. It is a convenience view only.

#### Scenario: Mermaid emission

- **WHEN** `graph --format mermaid` runs on a valid model
- **THEN** the output is parseable Mermaid flowchart text naming artifact IDs
