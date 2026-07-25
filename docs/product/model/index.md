# Model index

Human navigation for the current product model. This page orients; it never duplicates
relationships (those live in artifact frontmatter and the derived graph) and it is not a
generated index.

## Actors — who interacts with the product

- [ACT-PRODUCT-ENGINEER](actors/act-product-engineer.md) — defines and evolves product knowledge.
- [ACT-REPOSITORY-MAINTAINER](actors/act-repository-maintainer.md) — installs, configures,
  approves and promotes.
- [ACT-AI-ASSISTANT](actors/act-ai-assistant.md) — executes the AI skills; reasons, never rules.

## Journeys — end-to-end outcomes

- [JRN-ADOPT-001](journeys/jrn-adopt-001.md) — adopt Product Definition as Code in a repository.
- [JRN-CHANGE-001](journeys/jrn-change-001.md) — evolve an existing product definition.
- [JRN-SDD-HANDOFF-001](journeys/jrn-sdd-handoff-001.md) — deliver one increment through an SDD
  workflow.

## Use cases — concrete interactions

Adoption: [UC-INIT-001](use-cases/uc-init-001.md), [UC-DEFINE-001](use-cases/uc-define-001.md).
Understanding the model: [UC-VALIDATE-001](use-cases/uc-validate-001.md),
[UC-INSPECT-001](use-cases/uc-inspect-001.md), [UC-IMPACT-001](use-cases/uc-impact-001.md).
Evolving it: [UC-CHANGE-001](use-cases/uc-change-001.md), [UC-SLICE-001](use-cases/uc-slice-001.md).
Delivering: [UC-HANDOFF-001](use-cases/uc-handoff-001.md),
[UC-HANDOFF-STATUS-001](use-cases/uc-handoff-status-001.md),
[UC-PROMOTE-001](use-cases/uc-promote-001.md).

## Business rules — what governs behaviour

- [BR-CANONICAL-001](business-rules/br-canonical-001.md) — authored artifacts are canonical.
- [BR-IDENTITY-001](business-rules/br-identity-001.md) — identity is immutable IDs, not paths.
- [BR-RELATIONSHIPS-001](business-rules/br-relationships-001.md) — reverse relationships are
  derived.
- [BR-CHANGE-001](business-rules/br-change-001.md) — no baseline modification before promotion.
- [BR-SDD-001](business-rules/br-sdd-001.md) — SDD consumes context, never owns semantics.
- [BR-AI-001](business-rules/br-ai-001.md) — deterministic validation is never delegated to AI.

## Domain language

Bounded contexts: [BC-PRODUCT-DEFINITION](domain/bounded-contexts/bc-product-definition.md),
[BC-DELIVERY-INTEGRATION](domain/bounded-contexts/bc-delivery-integration.md).

Terms: [TERM-PRODUCT-ARTIFACT](domain/terms/term-product-artifact.md),
[TERM-PRODUCT-GRAPH](domain/terms/term-product-graph.md),
[TERM-CURRENT-PRODUCT-MODEL](domain/terms/term-current-product-model.md),
[TERM-PRODUCT-CHANGE](domain/terms/term-product-change.md),
[TERM-DELIVERY-SLICE](domain/terms/term-delivery-slice.md),
[TERM-PRODUCT-HANDOFF](domain/terms/term-product-handoff.md),
[TERM-PRODUCT-CONTEXT](domain/terms/term-product-context.md).

## Requirements — derived obligations

Functional: [FR-INIT-001](requirements/functional/fr-init-001.md),
[FR-PARSE-001](requirements/functional/fr-parse-001.md),
[FR-VALIDATE-001](requirements/functional/fr-validate-001.md),
[FR-VALIDATE-002](requirements/functional/fr-validate-002.md),
[FR-GRAPH-001](requirements/functional/fr-graph-001.md),
[FR-INSPECT-001](requirements/functional/fr-inspect-001.md),
[FR-IMPACT-001](requirements/functional/fr-impact-001.md),
[FR-CHANGE-OVERLAY-001](requirements/functional/fr-change-overlay-001.md),
[FR-SLICE-VALIDATE-001](requirements/functional/fr-slice-validate-001.md),
[FR-HANDOFF-001](requirements/functional/fr-handoff-001.md),
[FR-HANDOFF-STALE-001](requirements/functional/fr-handoff-stale-001.md),
[FR-PROMOTE-001](requirements/functional/fr-promote-001.md),
[FR-DISTRIBUTION-001](requirements/functional/fr-distribution-001.md),
[FR-OPENSPEC-001](requirements/functional/fr-openspec-001.md),
[FR-COVERAGE-001](requirements/functional/fr-coverage-001.md).

Quality: [QR-PORTABILITY-001](requirements/quality/qr-portability-001.md),
[QR-DETERMINISM-001](requirements/quality/qr-determinism-001.md),
[QR-EXPLAINABILITY-001](requirements/quality/qr-explainability-001.md),
[QR-EXTENSIBILITY-001](requirements/quality/qr-extensibility-001.md).

Constraints: [CON-MARKDOWN-001](requirements/constraints/con-markdown-001.md),
[CON-NO-GRAPH-DATABASE](requirements/constraints/con-no-graph-database.md),
[CON-NO-WEB-UI](requirements/constraints/con-no-web-ui.md),
[CON-SDD-AGNOSTIC](requirements/constraints/con-sdd-agnostic.md),
[CON-PUBLIC-GENERIC](requirements/constraints/con-public-generic.md).
