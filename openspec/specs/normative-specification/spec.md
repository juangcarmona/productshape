# normative-specification Specification

<!-- pdac-scope: cited -->

## Purpose

The normative specification documents that fix the methodology's artifact, relationship and citation contracts.

## Requirements

### Requirement: The specification defines every artifact type normatively

The specification SHALL define, using RFC-style normative language (MUST, MUST NOT, SHOULD, SHOULD NOT, MAY), the structure and semantics of Actors, Journeys, Use Cases, Business Rules, Domain Terms, Bounded Contexts, Functional Requirements, Quality Requirements and Constraints, including required frontmatter fields and required body sections.

{pdac:cite id="TERM-METHODOLOGY" digest="sha256:9b07509aa4d8df05755689697d21d69e96a269b5e941b9a04c63fe419ac5c55a"}

{pdac:cite id="TERM-PRODUCT-ARTIFACT" digest="sha256:dfd8386de66abfef0e0384b8a81ef8bb1fb0b0756133e5cc588d382c8b179a46"}

#### Scenario: Looking up an artifact contract

- **WHEN** an author needs the required sections of a Use Case
- **THEN** the specification repo lists its frontmatter contract and required body sections normatively

### Requirement: Identifier rules are fixed

The specification SHALL define stable immutable IDs with the fixed artifact prefixes ACT-, JRN-, UC-, BR-, TERM-, BC-, FR-, QR- and CON-, and the Product Change prefix CHG-. It SHALL state that artifact IDs become immutable after first acceptance into the current model, are never reused, and are never inferred from file paths, and that file-name alignment is a warning, not an identity mechanism. Retired prefixes SLI- and HOF- are never reused.

{pdac:cite id="BR-IDENTITY-001" digest="sha256:4260c4babe1b49464e1ebe6c6aa2f1001c59b2e4c6e8e9d81781e112bfee47c4"}

#### Scenario: Renaming an artifact file

- **WHEN** an artifact file is renamed while its `id` is unchanged
- **THEN** the specification defines the artifact's identity as unchanged and the misaligned file name as at most a warning

### Requirement: Relationship vocabulary has one canonical direction

The specification SHALL define the canonical relationship fields per source artifact type with their allowed target types, and SHALL state that reverse relationships are always derived and never manually maintained. `Domain Term.defined-in` SHALL be canonical and `Bounded Context.owns-terms` SHALL be a derived display relationship that is not authored.

{pdac:cite id="BR-RELATIONSHIPS-001" digest="sha256:a6f9d40c2c1ac926149fe171660e5715b66b4e82ce8129f128eab0e6c1c7de8c"}

#### Scenario: Authoring term ownership

- **WHEN** an author wants to express that a bounded context owns a term
- **THEN** the specification directs them to set `defined-in` on the Domain Term and states that `owns-terms` is derived

### Requirement: Canonical authority inside docs/product is explicit

The specification SHALL distinguish accepted current semantics (`docs/product/model/**/*.md` on the canonical branch) from a Product Change overlay and from generated non-canonical outputs (graph files, indexes, diagrams, traceability reports). `docs/product/model/index.md` SHALL be defined as a human navigation document that never duplicates relationships. Apply MAY write the approved proposal into `docs/product/model` on a working branch, but only a human merge of the reviewed result changes the accepted baseline.

{pdac:cite id="BR-CANONICAL-001" digest="sha256:7ed6dc7c588e0b79da8e6036548cf2fd2c6a1b02a9393f467f50cb0cb02475d6"}

{pdac:cite id="TERM-CURRENT-PRODUCT-MODEL" digest="sha256:0699a1113e526f3a566b52b3f409e68933cfc23a5ac64387bc4b4a72c6211175"}

#### Scenario: Determining whether a file may be edited by hand

- **WHEN** a contributor asks whether a generated graph file may be edited
- **THEN** the specification identifies it as generated and non-canonical

### Requirement: Lifecycle states are document-specific

The specification SHALL define artifact status (draft, active, deprecated, retired) and Product Change status (draft, proposed, approved, applied, rejected, superseded) as separate lifecycle enums. Product Change status MUST NOT carry implementation, verification, release or deployment state, and no delivery lifecycle is part of the product model.

#### Scenario: Validating an artifact status value

- **WHEN** an artifact declares `status: published`
- **THEN** the specification defines this as invalid because `published` is not in the artifact lifecycle enum

### Requirement: Product Changes follow the independent lifecycle

The specification SHALL define the lifecycle as accepted baseline → proposed Product Change → overlay validation → human product approval → explicit apply on a working branch → pull-request review → human merge accepting the resulting baseline. It SHALL state that a Product Change is not a pull request, apply is not acceptance, and neither apply nor merge attests implementation, verification, release or deployment. Product-definition work and implementation work MAY share a pull request or proceed at different times, but they remain independent. Tools MUST NOT grant product approval, merge, auto-approve or self-merge model changes. `CHG-INITIAL` establishes the first baseline through the same lifecycle as every later change.

{pdac:cite id="BR-CHANGE-001" digest="sha256:e6ce08a14e1aecd91000659eb9b6642354f19ba3df3b2261324fc520b951f013"}

{pdac:cite id="UC-CHANGE-001" digest="sha256:43d756bd7c45a2357142fe8c8f310401684822a39c5a95f6dcbe48469dd5c64a"}

#### Scenario: Requesting a change

- **WHEN** a stakeholder requests a product modification
- **THEN** the specification requires a Product Change and overlay validation before product approval and apply, followed by pull-request review before merge acceptance

### Requirement: The citation contract is the delivery boundary

The specification SHALL define a citation as a machine-verifiable reference from a consumer document to canonical product text, carrying the target artifact `id`, a content `digest`, and an optional `anchor` (a verification scenario id). The specification SHALL define four citation statuses (current, stale, tampered, unresolved) and the diagnostics PRODUCT042, PRODUCT060, PRODUCT061, PRODUCT062 and PRODUCT063. Consumers MUST NOT write to the canonical product model; they cite it.

{pdac:cite id="BR-SDD-001" digest="sha256:ccbf28775b1b0f3c23e5bbc4c9252a8d7c4cd1e7328e05c4d3baa2df0b76727d"}

{pdac:cite id="TERM-CITATION" digest="sha256:3451ef0f31f948a5f3fe1a228e699cf5677aa7e6906ac48faaf48f97c1b00dcf"}

{pdac:cite id="FR-CITATIONS-VERIFY-001" digest="sha256:850eeca68d751eee955a82ceab2c42fa12aaa7d6aab22dbd62296c3716c8ab6c"}

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

The specification SHALL contain a frontmatter reference enumerating, for every document kind that has a JSON Schema, each allowed property with whether it is required, its type, its permitted values or pattern, and any constraint the schema carries. Nested properties and array elements SHALL be enumerated alongside their parent. The reference SHALL state that frontmatter is a closed contract and that an unrecognised property is `PRODUCT002`.

The tables SHALL be generated from the canonical schemas, not restated by hand, and a conformance check SHALL fail when the reference and the schemas disagree. Coverage SHALL be verified in both directions, without a hardcoded count, so that adding a schema without documenting it fails.

#### Scenario: Every schema has a documented section

- **WHEN** the conformance check compares the reference's generated regions with the loaded schemas
- **THEN** the two sets are equal, and a schema added without a section fails the check

#### Scenario: A schema change that is not regenerated fails the build

- **WHEN** a schema's enum, pattern or required set changes and the reference is not regenerated
- **THEN** the check fails naming the kind and the command that regenerates it

#### Scenario: Formatting is not mistaken for drift

- **WHEN** the reference is reformatted by the repository formatter without semantic change
- **THEN** the check still passes, because table cells are compared after normalization
