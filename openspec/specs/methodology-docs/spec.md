# methodology-docs Specification

<!-- pdac-scope: cited -->

## Purpose

The manifesto and methodology documentation that explain Product Definition as Code to adopters.

## Requirements

### Requirement: Methodology overview is explainable in under five minutes

The documentation SHALL provide an overview (`docs/methodology/overview.md`) that explains the product graph, the artifact families, the three operations (Define, Recover, Change) and the flow from Product Definition to SDD implementation, readable in under five minutes.

{pdac:cite id="QR-EXPLAINABILITY-001" digest="sha256:d791810ec7b98dc4f411d2b839f0d123396c27e27accdb8a88ef6d3c41e2debc"}

{pdac:cite id="TERM-METHODOLOGY" digest="sha256:9b07509aa4d8df05755689697d21d69e96a269b5e941b9a04c63fe419ac5c55a"}

#### Scenario: A newcomer reads the overview

- **WHEN** a reader with no prior context reads `docs/methodology/overview.md`
- **THEN** they can name the artifact families, the three operations and the lifecycle from accepted baseline through Product Change, overlay validation, product approval, apply and merge acceptance without consulting other documents

### Requirement: Each methodology operation has a dedicated document

The documentation SHALL describe each part of the methodology in its own document: product graph, define, recover and change. Change guidance SHALL distinguish Product Change intent, applied definition, pull-request acceptance and independently paced implementation work.

#### Scenario: Locating operation guidance

- **WHEN** a product engineer needs to run the Change operation
- **THEN** `docs/methodology/change.md` describes the operation end to end, including where human approval is required

### Requirement: The Define methodology uses the Product Change lifecycle for the initial baseline

The Define documentation SHALL state that `CHG-INITIAL` proposes the complete first Product Definition against an empty baseline, validates as an overlay, receives human product approval, is applied explicitly on a working branch and is accepted only when a human merges the reviewed result. Every subsequent semantic evolution MUST use the same Product Change lifecycle.

{pdac:cite id="BR-CHANGE-001" digest="sha256:e6ce08a14e1aecd91000659eb9b6642354f19ba3df3b2261324fc520b951f013"}

#### Scenario: Establishing a new product model

- **WHEN** a reader consults `docs/methodology/define.md` for a greenfield product
- **THEN** the document directs them through `CHG-INITIAL` without a direct-baseline exception

### Requirement: The manifesto states the founding position

The repository SHALL contain `docs/manifesto.md` stating the central assertions — the relationships are the methodology; authored artifacts are the source of truth and the graph is compiled from them — without marketing claims or invented benchmarks.

{pdac:cite id="BR-CANONICAL-001" digest="sha256:7ed6dc7c588e0b79da8e6036548cf2fd2c6a1b02a9393f467f50cb0cb02475d6"}

{pdac:cite id="BR-RELATIONSHIPS-001" digest="sha256:a6f9d40c2c1ac926149fe171660e5715b66b4e82ce8129f128eab0e6c1c7de8c"}

#### Scenario: Reading the founding position

- **WHEN** a reader opens `docs/manifesto.md`
- **THEN** the central assertions and the boundary between Product Definition and SDD are stated plainly

### Requirement: Adoption guides cover the four entry paths

The documentation SHALL provide adoption guides for greenfield products, brownfield products, existing repositories and existing OpenSpec repositories.

{pdac:cite id="JRN-ADOPT-001" digest="sha256:25fc9ac1d42c5bff2cbfa2bc79321ce19196acd33ee0485e47b79d42cb7650f7"}

#### Scenario: Adopting in a repository that already uses OpenSpec

- **WHEN** a maintainer of an OpenSpec repository reads `docs/adoption/existing-openspec-repository.md`
- **THEN** the guide explains what Product Definition adds, what OpenSpec keeps owning, and the order of adoption steps
