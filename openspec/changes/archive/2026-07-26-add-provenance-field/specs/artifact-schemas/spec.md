# artifact-schemas — delta

## ADDED Requirements

### Requirement: Artifacts may record the evidence behind recovered knowledge

Every artifact schema SHALL accept an optional `provenance` object, defined once in the common schema
and referenced by each kind. When present it SHALL require `source` (a non-empty string naming a
file, URL, ticket or interview) and `confidence` (`high`, `medium` or `low`), and MAY carry
`recovered-from` (`observation`, `inference`, `interview` or `documentation`). The object SHALL be
closed: an unrecognised sub-field SHALL be rejected with `PRODUCT002`.

`provenance` SHALL NOT be required by any kind: an artifact authored from intent has no evidence to
cite. It SHALL NOT be accepted on the Product Change document, whose proposed artifacts carry it
instead.

Provenance records evidence, not authorship. It SHALL NOT be used to carry author, owner, date,
version or review metadata, which remain forbidden.

#### Scenario: Recovered artifact carries provenance

- **WHEN** an artifact declares `provenance` with a source and a confidence
- **THEN** it validates with no diagnostics

#### Scenario: Unrecognised sub-field rejected

- **WHEN** an artifact declares a `provenance` sub-field the schema does not define
- **THEN** validation reports `PRODUCT002` rather than ignoring the property

#### Scenario: Evidence without a confidence rejected

- **WHEN** an artifact declares `provenance.source` but omits `provenance.confidence`
- **THEN** validation reports `PRODUCT002`
