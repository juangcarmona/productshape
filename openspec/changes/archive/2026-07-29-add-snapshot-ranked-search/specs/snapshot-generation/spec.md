# snapshot-generation — delta

## MODIFIED Requirements

### Requirement: Offline client-side search

The page SHALL provide search over artifact identifiers, titles, kinds and body content, working entirely client-side with no network access, from the same single self-contained file.

Results SHALL be ranked in this order of precedence: exact identifier match; identifier prefix match; exact or prefix title match; title substring match; body content match. A query equal to an artifact's identifier SHALL place that artifact first. Ordering SHALL be total, so identical queries against identical model content produce identical result order.

Each result SHALL identify its artifact by identifier, title and kind. Where a result was produced by a body match, it SHALL show a snippet of the matching content, escaped so authored content cannot become markup or executable.

If the page limits how many results it displays, it SHALL state how many matches exist in total, and SHALL NOT display a lower-ranked match in place of a higher-ranked one. Truncation SHALL never be silent.

Search SHALL be fully operable from the keyboard: reaching the field, moving through results, selecting a result and clearing the query. Selecting a result SHALL make its artifact the page's single selected artifact. Clearing the query SHALL return the reader to browsing without discarding the artifact they had selected. A query matching no artifact SHALL produce an explicit no-results state that names the query rather than an empty list.

#### Scenario: An exact identifier lands first

- **WHEN** the reader types an artifact's identifier exactly
- **THEN** that artifact is the first result

#### Scenario: Identifiers outrank titles, and titles outrank bodies

- **WHEN** the reader types a string that matches some identifiers by prefix, some titles, and some bodies
- **THEN** the identifier-prefix matches appear above the title matches, which appear above the body-only matches

#### Scenario: Title matches are not crowded out by body matches

- **WHEN** the reader searches for a word that appears in many bodies and in several titles
- **THEN** the artifacts whose titles match appear above those matched only in their bodies

#### Scenario: Matching by kind

- **WHEN** the reader types the name of an artifact kind
- **THEN** artifacts of that kind are returned

#### Scenario: Body matches show a safe snippet

- **WHEN** a result was produced by a phrase inside an artifact's body, and that body also contains markup-like authored text
- **THEN** the result shows a snippet containing the phrase, and any markup-like text in it is displayed as text rather than parsed or executed

#### Scenario: Truncation is stated, never silent

- **WHEN** a query matches more artifacts than the page displays
- **THEN** the page states the total number of matches, and every result shown outranks every result omitted

#### Scenario: Search is operable by keyboard alone

- **WHEN** the reader reaches the field, moves through the results, selects one and clears the query using only the keyboard
- **THEN** each step works, and the selected result becomes the page's single selected artifact

#### Scenario: Clearing keeps the selection

- **WHEN** the reader clears a query after having selected an artifact
- **THEN** browsing resumes and that artifact is still selected

#### Scenario: Nothing matches, said plainly

- **WHEN** a query matches no artifact
- **THEN** the page states that nothing matches and repeats the query it searched for

#### Scenario: Deterministic ordering

- **WHEN** the same query is run against two snapshots generated from identical model content
- **THEN** the results appear in identical order
