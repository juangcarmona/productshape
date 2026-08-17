# methodology-docs Specification

## Purpose

The manifesto and methodology documentation that explain Product Definition as Code to adopters.

## Requirements

### Requirement: Methodology overview is explainable in under five minutes

The documentation SHALL provide an overview (`docs/methodology/overview.md`) that explains the product graph, the artifact families, the three operations (Define, Recover, Change) and the flow from Product Definition to SDD implementation, readable in under five minutes.

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

#### Scenario: Establishing a new product model

- **WHEN** a reader consults `docs/methodology/define.md` for a greenfield product
- **THEN** the document directs them through `CHG-INITIAL` without a direct-baseline exception

### Requirement: The manifesto states the founding position

The repository SHALL contain `docs/manifesto.md` stating the central assertions — the relationships are the methodology; authored artifacts are the source of truth and the graph is compiled from them — without marketing claims or invented benchmarks.

#### Scenario: Reading the founding position

- **WHEN** a reader opens `docs/manifesto.md`
- **THEN** the central assertions and the boundary between Product Definition and SDD are stated plainly

### Requirement: Adoption guides cover the four entry paths

The documentation SHALL provide adoption guides for greenfield products, brownfield products, existing repositories and existing OpenSpec repositories.

#### Scenario: Adopting in a repository that already uses OpenSpec

- **WHEN** a maintainer of an OpenSpec repository reads `docs/adoption/existing-openspec-repository.md`
- **THEN** the guide explains what Product Definition adds, what OpenSpec keeps owning, and the order of adoption steps
