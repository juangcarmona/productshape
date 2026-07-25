# Product Handoff (Closure Warning)

## MODIFIED Requirements

### Requirement: Staleness is judged per referenced artifact

`product-definition handoff status <path>` SHALL report `current` when every referenced
artifact's recomputed digest matches, `stale` naming each changed artifact, `invalid` for
malformed handoffs or unresolvable digests (PRODUCT041/PRODUCT042), and
`source-revision-unavailable` when content is gone from the working tree and `source.revision`
cannot be resolved. Digest recomputation SHALL resolve overlay-first from the working tree and
fall back to the content at `source.revision`. When the handoff's Product Change and slice are
still active, status SHALL additionally recompute the closure and warn (PRODUCT110) about listed
artifacts outside it.

#### Scenario: Relevant edit stales the handoff

- **WHEN** an artifact listed in the handoff is edited after generation
- **THEN** status reports stale and names that artifact

#### Scenario: Unrelated edit does not stale the handoff

- **WHEN** artifacts not listed in the handoff are edited or new commits land
- **THEN** status still reports current

#### Scenario: Tampered artifact list

- **WHEN** a handoff lists an artifact outside its slice's recomputed closure while the change is still active
- **THEN** status reports warning PRODUCT110 naming the artifact
