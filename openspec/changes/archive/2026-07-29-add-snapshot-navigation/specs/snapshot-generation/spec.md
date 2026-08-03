## ADDED Requirements

### Requirement: Relationships are navigable in both directions

On an artifact's rendered view, every reference to another artifact SHALL be a link that navigates to the referenced artifact — both the relationships the artifact's frontmatter declares (outgoing) and the derived reverse views computed from the rest of the model (incoming, "referenced by"). The reader SHALL NOT need to know which side authored the edge.

#### Scenario: Outgoing reference is a link

- **WHEN** a reader views a use case that declares a governing business rule
- **THEN** the rule's mention is a link that navigates to the rule's rendered view

#### Scenario: Derived incoming reference is a link

- **WHEN** a reader views a use case from which a functional requirement derives
- **THEN** the requirement appears in a "referenced by" view as a link, although no authored file states that edge on the use case

### Requirement: Graph visualization with node-selection highlighting

The page SHALL include a graph visualization conveying the model's overall shape. Selecting a node SHALL show or highlight that artifact's relationships (its neighborhood) and SHALL provide navigation to the artifact's rendered view.

#### Scenario: Reader grasps the model's shape

- **WHEN** a reader opens the visualization
- **THEN** the model's artifacts and their connections are presented visually

#### Scenario: Selecting a node highlights its neighborhood

- **WHEN** a reader selects one node in the visualization
- **THEN** that artifact's relationships are visually highlighted and its rendered view is one navigation away

### Requirement: Offline client-side search

The page SHALL provide search over artifact IDs, titles and body content, working entirely client-side with no network access, from the same single self-contained file.

#### Scenario: Search by ID, title and content offline

- **WHEN** the browser is offline and the reader searches for an artifact's ID, a word from its title, or a term from its body
- **THEN** the matching artifacts are returned as navigable results

### Requirement: Navigation additions preserve the generation contract

The embedded script and data serving navigation, visualization and search SHALL be part of the single self-contained file, SHALL reference no external resources, SHALL offer no capability to create, edit, annotate or approve anything, and SHALL preserve deterministic generation: identical model content still yields a byte-identical file.

#### Scenario: Still one deterministic self-contained file

- **WHEN** the snapshot is generated twice from identical model content
- **THEN** the two files are byte-identical, and the page functions fully from local disk with networking disabled

#### Scenario: Still read-only

- **WHEN** the page's interactive features are exercised
- **THEN** nothing creates, edits or approves product knowledge; interactivity is limited to presentation
