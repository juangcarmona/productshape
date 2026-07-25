# product-handoff Specification

## Purpose

TBD - created by archiving change implement-product-change-and-handoff. Update Purpose after archive.

## Requirements

### Requirement: Handoffs generate deterministically from approved slices

The handoff generator SHALL produce `product-handoff.yaml` and `product-context.md` from an
approved slice of a validated overlay (via
`product-definition handoff create --change <CHG> --slice <SLI> --work-item <ref> --out <dir>`),
selecting the subgraph by the closure rule in `docs/specification/handoff-contract.md`, recording
repository-relative artifact paths, content digests (sha256, LF-normalized) and the source Git
revision, resolving artifacts overlay-first.

#### Scenario: Closure includes upstream context

- **WHEN** a slice implements a requirement derived from a use case
- **THEN** the handoff includes the requirement, the use case, its actors, rules, terms, bounded
  context, containing journeys and product-wide constraints — and nothing from unrelated regions

#### Scenario: Non-approved slice refused

- **WHEN** handoff create runs against a slice whose status is proposed
- **THEN** the command fails with PRODUCT040 and generates nothing

#### Scenario: Context is marked generated

- **WHEN** product-context.md is generated
- **THEN** it begins with a generated marker naming the handoff ID and its digest is recorded in
  the handoff

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
