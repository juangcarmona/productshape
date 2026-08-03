# snapshot-generation — delta

## ADDED Requirements

### Requirement: The Reader preserves and names navigation context

Relationship links on the artifact detail SHALL carry the active catalog state, so following an edge preserves the discovery in progress. The detail SHALL name the discovery it returns to — the active kind, status, context, filter and query — visibly and retraceably in one step; without an active discovery it SHALL offer the full catalog.

#### Scenario: Following an edge keeps the discovery

- **WHEN** a reader with an active query and filters follows a relationship link
- **THEN** the address of the target artifact carries the same catalog state

#### Scenario: The way back is named

- **WHEN** an artifact is read during an active discovery
- **THEN** the detail names that discovery and returning resumes it exactly
