# normative-specification Specification

## Purpose
TBD - created by archiving change establish-product-definition-foundation. Update Purpose after archive.
## Requirements
### Requirement: The specification defines every artifact type normatively

The specification SHALL define, using RFC-style normative language (MUST, MUST NOT, SHOULD, SHOULD NOT, MAY), the structure and semantics of Actors, Journeys, Use Cases, Business Rules, Domain Terms, Bounded Contexts, Functional Requirements, Quality Requirements, Constraints, Product Changes, Delivery Slices and Product Handoffs, including required frontmatter fields and required body sections.

#### Scenario: Looking up an artifact contract

- **WHEN** an author needs the required sections of a Use Case
- **THEN** `docs/specification/artifacts.md` lists its frontmatter contract and required body sections normatively

### Requirement: Identifier rules are fixed

The specification SHALL define stable immutable IDs with the fixed prefixes ACT-, JRN-, UC-, BR-, TERM-, BC-, FR-, QR-, CON-, CHG-, SLI- and HOF-, state that IDs become immutable after first acceptance into the current model, are never reused, and are never inferred from file paths, and that file-name alignment is a warning, not an identity mechanism.

#### Scenario: Renaming an artifact file

- **WHEN** an artifact file is renamed while its `id` is unchanged
- **THEN** the specification defines the artifact's identity as unchanged and the misaligned file name as at most a warning

### Requirement: Relationship vocabulary has one canonical direction

The specification SHALL define the canonical relationship fields per source artifact type with their allowed target types, and SHALL state that reverse relationships are always derived and never manually maintained. `Domain Term.defined-in` SHALL be canonical and `Bounded Context.owns-terms` SHALL be a derived display relationship that is not authored.

#### Scenario: Authoring term ownership

- **WHEN** an author wants to express that a bounded context owns a term
- **THEN** the specification directs them to set `defined-in` on the Domain Term and states that `owns-terms` is derived

### Requirement: Canonical authority inside docs/product is explicit

The specification SHALL distinguish canonical current semantics (`docs/product/model/**/*.md`), canonical proposed change definitions (`changes/active/**/change.md`), canonical proposed future-state artifacts (`changes/active/**/proposed/**/*.md`), authoritative delivery decomposition (`changes/active/**/slices/*.yaml`) and generated non-canonical outputs (handoffs, context documents, graph files, indexes, diagrams, traceability reports). `docs/product/model/index.md` SHALL be defined as a human navigation document that never duplicates relationships.

#### Scenario: Determining whether a file may be edited by hand

- **WHEN** a contributor asks whether `product-context.md` may be edited
- **THEN** the specification identifies it as generated and non-canonical

### Requirement: Lifecycle states are schema-specific

The specification SHALL define three separate lifecycles — artifact status (draft, active, deprecated, retired), Product Change status (draft, proposed, approved, in-progress, implemented, rejected, superseded) and Delivery Slice status (draft, proposed, approved, in-progress, completed, cancelled) — and SHALL NOT define a shared generic status enum.

#### Scenario: Validating a slice status value

- **WHEN** a Delivery Slice declares `status: retired`
- **THEN** the specification defines this as invalid because `retired` belongs to the artifact lifecycle only

### Requirement: Product Change semantics are separated from the current model

The specification SHALL define Product Changes as explicit deltas (add, modify, remove) with complete proposed future-state artifacts, validated as an overlay against the baseline, promoted only explicitly, and SHALL include the initial-baseline bootstrap exception.

#### Scenario: Requesting a change

- **WHEN** a stakeholder requests a product modification after the baseline is accepted
- **THEN** the specification requires a Product Change and forbids silent modification of `docs/product/model`

### Requirement: Validation diagnostics are enumerated with stable codes

The specification SHALL enumerate the deterministic validation errors and warnings with stable `PRODUCT###` diagnostic codes, the machine-readable diagnostic fields (severity, code, message, source file, artifact ID, field, target ID) and the CLI exit codes 0, 1, 2 and 3.

#### Scenario: A tool consumes diagnostics

- **WHEN** a CI job parses validation output
- **THEN** each diagnostic carries a documented stable code and the documented fields

### Requirement: Conformance criteria are testable

The specification SHALL define what it means for a repository and for an implementation to conform, in terms that can be exercised by fixtures.

#### Scenario: Judging a fixture

- **WHEN** a fixture artifact violates a normative statement
- **THEN** `docs/specification/conformance.md` classifies which diagnostic the violation maps to

