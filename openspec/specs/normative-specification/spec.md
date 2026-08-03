# normative-specification Specification

## Purpose

The normative specification documents that fix the methodology's artifact, relationship and citation contracts.

## Requirements

### Requirement: The specification defines every artifact type normatively

The specification SHALL define, using RFC-style normative language (MUST, MUST NOT, SHOULD, SHOULD NOT, MAY), the structure and semantics of Actors, Journeys, Use Cases, Business Rules, Domain Terms, Bounded Contexts, Functional Requirements, Quality Requirements and Constraints, including required frontmatter fields and required body sections.

#### Scenario: Looking up an artifact contract

- **WHEN** an author needs the required sections of a Use Case
- **THEN** the specification repo lists its frontmatter contract and required body sections normatively

### Requirement: Identifier rules are fixed

The specification SHALL define stable immutable IDs with the fixed prefixes ACT-, JRN-, UC-, BR-, TERM-, BC-, FR-, QR- and CON-, state that IDs become immutable after first acceptance into the current model, are never reused, and are never inferred from file paths, and that file-name alignment is a warning, not an identity mechanism. Retired prefixes (CHG-, SLI-, HOF-) are never reused.

#### Scenario: Renaming an artifact file

- **WHEN** an artifact file is renamed while its `id` is unchanged
- **THEN** the specification defines the artifact's identity as unchanged and the misaligned file name as at most a warning

### Requirement: Relationship vocabulary has one canonical direction

The specification SHALL define the canonical relationship fields per source artifact type with their allowed target types, and SHALL state that reverse relationships are always derived and never manually maintained. `Domain Term.defined-in` SHALL be canonical and `Bounded Context.owns-terms` SHALL be a derived display relationship that is not authored.

#### Scenario: Authoring term ownership

- **WHEN** an author wants to express that a bounded context owns a term
- **THEN** the specification directs them to set `defined-in` on the Domain Term and states that `owns-terms` is derived

### Requirement: Canonical authority inside docs/product is explicit

The specification SHALL distinguish canonical current semantics (`docs/product/model/**/*.md`) from generated non-canonical outputs (graph files, indexes, diagrams, traceability reports). `docs/product/model/index.md` SHALL be defined as a human navigation document that never duplicates relationships. The baseline changes through exactly one operation: a human merging a validated proposed revision (a pull request).

#### Scenario: Determining whether a file may be edited by hand

- **WHEN** a contributor asks whether a generated graph file may be edited
- **THEN** the specification identifies it as generated and non-canonical

### Requirement: Lifecycle states are artifact-specific

The specification SHALL define artifact status (draft, active, deprecated, retired) as the only lifecycle enum. Retired lifecycles (Product Change status, Delivery Slice status) are never reused.

#### Scenario: Validating an artifact status value

- **WHEN** an artifact declares `status: published`
- **THEN** the specification defines this as invalid because `published` is not in the artifact lifecycle enum

### Requirement: Change-as-PR replaces the push pipeline

The specification SHALL define the baseline as the canonical product model on the repository's canonical branch, changes as native pull requests validated by full-tree structural validation (CI gate), and merging as a human decision. Tools MUST NOT merge, auto-approve or self-merge model changes. The bootstrap exception is deleted; the initial baseline enters through the same mechanism as every later change.

#### Scenario: Requesting a change

- **WHEN** a stakeholder requests a product modification
- **THEN** the specification requires a pull request and forbids silent modification of `docs/product/model`

### Requirement: The citation contract is the delivery boundary

The specification SHALL define a citation as a machine-verifiable reference from a consumer document to canonical product text, carrying the target artifact `id`, a content `digest`, and an optional `anchor` (a verification scenario id). The specification SHALL define four citation statuses (current, stale, tampered, unresolved) and the diagnostics PRODUCT042, PRODUCT060, PRODUCT061, PRODUCT062 and PRODUCT063. Consumers MUST NOT write to the canonical product model; they cite it.

#### Scenario: A consumer document cites an artifact

- **WHEN** an SDD spec cites `FR-X` with a recorded digest
- **THEN** `prodshape citations verify` computes the status and reports drift if the canonical content changed

### Requirement: Validation diagnostics are enumerated with stable codes

The specification SHALL enumerate the deterministic validation errors and warnings with stable `PRODUCT###` diagnostic codes, the machine-readable diagnostic fields (severity, code, message, source file, artifact ID, field, target ID) and the CLI exit codes 0, 1, 2 and 3. Retired codes are never reused.

#### Scenario: A tool consumes diagnostics

- **WHEN** a CI job parses validation output
- **THEN** each diagnostic carries a documented stable code and the documented fields

### Requirement: Conformance criteria are testable

The specification SHALL define what it means for a repository and for an implementation to conform, in terms that can be exercised by fixtures.

#### Scenario: Judging a fixture

- **WHEN** a fixture artifact violates a normative statement
- **THEN** the specification classifies which diagnostic the violation maps to

### Requirement: The allowed frontmatter of every document kind is documented and generated

The specification SHALL contain a frontmatter reference enumerating, for every document kind that
has a JSON Schema, each allowed property with whether it is required, its type, its permitted values
or pattern, and any constraint the schema carries. Nested properties and array elements SHALL be
enumerated alongside their parent. The reference SHALL state that frontmatter is a closed contract
and that an unrecognised property is `PRODUCT002`.

The tables SHALL be generated from the canonical schemas, not restated by hand, and a conformance
check SHALL fail when the reference and the schemas disagree. Coverage SHALL be verified in both
directions, without a hardcoded count, so that adding a schema without documenting it fails.

#### Scenario: Every schema has a documented section

- **WHEN** the conformance check compares the reference's generated regions with the loaded schemas
- **THEN** the two sets are equal, and a schema added without a section fails the check

#### Scenario: A schema change that is not regenerated fails the build

- **WHEN** a schema's enum, pattern or required set changes and the reference is not regenerated
- **THEN** the check fails naming the kind and the command that regenerates it

#### Scenario: Formatting is not mistaken for drift

- **WHEN** the reference is reformatted by the repository formatter without semantic change
- **THEN** the check still passes, because table cells are compared after normalization
