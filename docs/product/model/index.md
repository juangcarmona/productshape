# Model index

Human navigation for the current product model. This page orients; it never duplicates relationships (those live in artifact frontmatter and the derived graph) and it is not a generated index.

## Actors — who interacts with the product

- [ACT-PRODUCT-ENGINEER](actors/act-product-engineer.md) — defines and evolves product knowledge.
- [ACT-REPOSITORY-MAINTAINER](actors/act-repository-maintainer.md) — installs, configures, reviews and merges.
- [ACT-AI-ASSISTANT](actors/act-ai-assistant.md) — executes the AI skills; reasons, never rules.
- [ACT-PRODUCT-EXPLORER](actors/act-product-explorer.md) — explores the product graph interactively.

## Journeys — end-to-end outcomes

- [JRN-ADOPT-001](journeys/jrn-adopt-001.md) — adopt Product Definition as Code in a repository.
- [JRN-SNAPSHOT-001](journeys/jrn-snapshot-001.md) — explore the product graph through a snapshot.

## Use cases — concrete interactions

Adoption: [UC-INIT-001](use-cases/uc-init-001.md), [UC-DEFINE-001](use-cases/uc-define-001.md). Understanding the model: [UC-VALIDATE-001](use-cases/uc-validate-001.md), [UC-INSPECT-001](use-cases/uc-inspect-001.md), [UC-IMPACT-001](use-cases/uc-impact-001.md), [UC-SCHEMA-001](use-cases/uc-schema-001.md). Keeping it tidy: [UC-FIX-001](use-cases/uc-fix-001.md). Evolving it: [UC-CHANGE-001](use-cases/uc-change-001.md). Citing and verifying: [UC-CITE-001](use-cases/uc-cite-001.md), [UC-CITATIONS-VERIFY-001](use-cases/uc-citations-verify-001.md). Exploring: [UC-EXPLORE-001](use-cases/uc-explore-001.md). Snapshots: [UC-SNAPSHOT-001](use-cases/uc-snapshot-001.md), [UC-SNAPSHOT-EXPLORE-001](use-cases/uc-snapshot-explore-001.md).

## Business rules — what governs behaviour

- [BR-CANONICAL-001](business-rules/br-canonical-001.md) — authored artifacts are canonical.
- [BR-IDENTITY-001](business-rules/br-identity-001.md) — identity is immutable IDs, not paths.
- [BR-RELATIONSHIPS-001](business-rules/br-relationships-001.md) — reverse relationships are derived.
- [BR-CHANGE-001](business-rules/br-change-001.md) — Product Changes are overlay-validated, approved and applied; merge accepts the resulting baseline.
- [BR-SDD-001](business-rules/br-sdd-001.md) — consumers cite, never own semantics.
- [BR-AI-001](business-rules/br-ai-001.md) — deterministic validation is never delegated to AI.

## Structured behaviours

- [SB-ID-REUSE-REJECTED](behaviours/sb-id-reuse-rejected.md) — a retired ID is never reused for a different artifact.
- [SB-REGENERATION-RESTORES](behaviours/sb-regeneration-restores.md) — rebuilding derived outputs restores them identically.
- [SB-TAMPERED-BEATS-STALE](behaviours/sb-tampered-beats-stale.md) — a tampered embedding is reported even when its target also moved.

## Domain language

Bounded contexts: [BC-PRODUCT-DEFINITION](domain/bounded-contexts/bc-product-definition.md), [BC-DELIVERY-INTEGRATION](domain/bounded-contexts/bc-delivery-integration.md).

Terms: [TERM-PRODUCT-ARTIFACT](domain/terms/term-product-artifact.md), [TERM-PRODUCT-GRAPH](domain/terms/term-product-graph.md), [TERM-CURRENT-PRODUCT-MODEL](domain/terms/term-current-product-model.md), [TERM-CITATION](domain/terms/term-citation.md), [TERM-METHODOLOGY](domain/terms/term-methodology.md), [TERM-REFERENCE-IMPLEMENTATION](domain/terms/term-reference-implementation.md), [TERM-GRAPH-PROJECTION](domain/terms/term-graph-projection.md), [TERM-PRODUCT-EXPLORER](domain/terms/term-product-explorer.md), [TERM-FOCUSED-TOPOLOGY](domain/terms/term-focused-topology.md), [TERM-PRODUCT-SNAPSHOT](domain/terms/term-product-snapshot.md).

## Requirements — derived obligations

Functional: [FR-INIT-001](requirements/functional/fr-init-001.md), [FR-RELEASE-001](requirements/functional/fr-release-001.md), [FR-PARSE-001](requirements/functional/fr-parse-001.md), [FR-VALIDATE-001](requirements/functional/fr-validate-001.md), [FR-VALIDATE-002](requirements/functional/fr-validate-002.md), [FR-GRAPH-001](requirements/functional/fr-graph-001.md), [FR-INSPECT-001](requirements/functional/fr-inspect-001.md), [FR-IMPACT-001](requirements/functional/fr-impact-001.md), [FR-CHANGE-001](requirements/functional/fr-change-001.md), [FR-CITE-001](requirements/functional/fr-cite-001.md), [FR-CITATIONS-VERIFY-001](requirements/functional/fr-citations-verify-001.md), [FR-DISTRIBUTION-001](requirements/functional/fr-distribution-001.md), [FR-OPENSPEC-001](requirements/functional/fr-openspec-001.md), [FR-SCHEMA-001](requirements/functional/fr-schema-001.md), [FR-FIX-001](requirements/functional/fr-fix-001.md), [FR-DOCTOR-001](requirements/functional/fr-doctor-001.md), [FR-EXPLORE-001](requirements/functional/fr-explore-001.md), [FR-SNAPSHOT-001](requirements/functional/fr-snapshot-001.md) through [FR-SNAPSHOT-009](requirements/functional/fr-snapshot-009.md).

Quality: [QR-PORTABILITY-001](requirements/quality/qr-portability-001.md), [QR-DETERMINISM-001](requirements/quality/qr-determinism-001.md), [QR-EXPLAINABILITY-001](requirements/quality/qr-explainability-001.md), [QR-EXTENSIBILITY-001](requirements/quality/qr-extensibility-001.md), [QR-ACCESSIBILITY-001](requirements/quality/qr-accessibility-001.md), [QR-PRESENTATION-001](requirements/quality/qr-presentation-001.md), [QR-SCALABILITY-001](requirements/quality/qr-scalability-001.md).

Constraints: [CON-MARKDOWN-001](requirements/constraints/con-markdown-001.md), [CON-NO-GRAPH-DATABASE](requirements/constraints/con-no-graph-database.md), [CON-NO-WEB-UI](requirements/constraints/con-no-web-ui.md), [CON-SDD-AGNOSTIC](requirements/constraints/con-sdd-agnostic.md), [CON-PUBLIC-GENERIC](requirements/constraints/con-public-generic.md), [CON-BRAND-001](requirements/constraints/con-brand-001.md).
