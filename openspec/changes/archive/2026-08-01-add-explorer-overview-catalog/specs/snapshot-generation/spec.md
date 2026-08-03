# snapshot-generation — delta

## ADDED Requirements

### Requirement: Catalog discovery state is addressable and preserved

The catalog's active query and filters SHALL be part of the page address, serialized in a fixed order so identical states produce identical addresses. Filter and query changes SHALL re-address the page in place without adding history entries. Opening an artifact from the catalog SHALL preserve the active state, and returning SHALL resume it. Filters SHALL exist only for canonical fields — artifact type, status, and bounded context where the model declares one.

#### Scenario: A discovery is shareable

- **WHEN** a query-and-filter state's address is opened in a fresh window from local disk
- **THEN** the same result set appears in the same order and the controls reflect the state

#### Scenario: Open and return resumes

- **WHEN** a reader opens a result from a narrowed catalog and navigates back to the list
- **THEN** the query, filters and result set are as they were left

#### Scenario: Filtering never floods history

- **WHEN** several filters and a query are changed in sequence
- **THEN** the address reflects each state and the history length is unchanged

### Requirement: The orientation view offers family entry points and global search

Each artifact kind on the orientation view SHALL be an entry point into the catalog narrowed to that family, and a global search control SHALL be available on the first screen, landing in the catalog with the query live.

#### Scenario: Family entry

- **WHEN** a kind is selected on the orientation view
- **THEN** the catalog opens filtered to that kind, with the filter control reflecting it

#### Scenario: Search from the first screen

- **WHEN** a query is submitted from the orientation view's search control
- **THEN** the catalog opens with that query active and its results displayed
