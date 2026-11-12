# Model index

Human navigation for the current product model. This page orients; it never duplicates relationships (those live in artifact frontmatter and the derived graph) and it is not a generated index.

## Actors — who interacts with the product

- [ACT-PRODUCT-ENGINEER](actors/act-product-engineer.md) — defines and evolves product knowledge.
- [ACT-REPOSITORY-MAINTAINER](actors/act-repository-maintainer.md) — installs, configures, reviews and merges.
- [ACT-AI-ASSISTANT](actors/act-ai-assistant.md) — executes the AI skills; reasons, never rules.
- [ACT-PRODUCT-EXPLORER](actors/act-product-explorer.md) — explores the product graph interactively.

## Journeys — end-to-end outcomes

- [JRN-ADOPT](journeys/jrn-adopt.md) — adopt Product Definition as Code in a repository.
- [JRN-SNAPSHOT](journeys/jrn-snapshot.md) — explore the product graph through a snapshot.

## Use cases — concrete interactions

Adoption: [UC-INIT](use-cases/uc-init.md), [UC-DEFINE](use-cases/uc-define.md). Understanding the model: [UC-VALIDATE](use-cases/uc-validate.md), [UC-INSPECT](use-cases/uc-inspect.md), [UC-IMPACT](use-cases/uc-impact.md), [UC-SCHEMA](use-cases/uc-schema.md). Keeping it tidy: [UC-FIX](use-cases/uc-fix.md). Evolving it: [UC-CHANGE](use-cases/uc-change.md). Citing and verifying: [UC-CITE](use-cases/uc-cite.md), [UC-CITATIONS-VERIFY](use-cases/uc-citations-verify.md). Exploring: [UC-EXPLORE](use-cases/uc-explore.md). Snapshots: [UC-SNAPSHOT](use-cases/uc-snapshot.md), [UC-SNAPSHOT-EXPLORE](use-cases/uc-snapshot-explore.md).

## Business rules — what governs behaviour

- [BR-CANONICAL](business-rules/br-canonical.md) — authored artifacts are canonical.
- [BR-IDENTITY](business-rules/br-identity.md) — identity is immutable IDs, not paths.
- [BR-RELATIONSHIPS](business-rules/br-relationships.md) — reverse relationships are derived.
- [BR-CHANGE](business-rules/br-change.md) — Product Changes are overlay-validated, approved and applied; merge accepts the resulting baseline.
- [BR-SDD](business-rules/br-sdd.md) — consumers cite, never own semantics.
- [BR-AI](business-rules/br-ai.md) — deterministic validation is never delegated to AI.
- [BR-MUTATION](business-rules/br-mutation.md) — repository mutation is contained, planned, drift-safe and fails closed.

## Structured behaviours

- [SB-ID-REUSE-REJECTED](behaviours/sb-id-reuse-rejected.md) — a retired ID is never reused for a different artifact.
- [SB-REGENERATION-RESTORES](behaviours/sb-regeneration-restores.md) — rebuilding derived outputs restores them identically.
- [SB-TAMPERED-BEATS-STALE](behaviours/sb-tampered-beats-stale.md) — a tampered embedding is reported even when its target also moved.

## Domain language

Bounded contexts: [BC-PRODUCT-DEFINITION](domain/bounded-contexts/bc-product-definition.md), [BC-DELIVERY-INTEGRATION](domain/bounded-contexts/bc-delivery-integration.md).

Terms: [TERM-PRODUCT-ARTIFACT](domain/terms/term-product-artifact.md), [TERM-PRODUCT-GRAPH](domain/terms/term-product-graph.md), [TERM-CURRENT-PRODUCT-MODEL](domain/terms/term-current-product-model.md), [TERM-CITATION](domain/terms/term-citation.md), [TERM-METHODOLOGY](domain/terms/term-methodology.md), [TERM-REFERENCE-IMPLEMENTATION](domain/terms/term-reference-implementation.md), [TERM-GRAPH-PROJECTION](domain/terms/term-graph-projection.md), [TERM-PRODUCT-EXPLORER](domain/terms/term-product-explorer.md), [TERM-FOCUSED-TOPOLOGY](domain/terms/term-focused-topology.md), [TERM-PRODUCT-SNAPSHOT](domain/terms/term-product-snapshot.md).

## Requirements — derived obligations

Functional: [FR-INIT-PRESERVE](requirements/functional/fr-init-preserve.md), [FR-RELEASE](requirements/functional/fr-release.md), [FR-PARSE](requirements/functional/fr-parse.md), [FR-VALIDATE-REFERENCES](requirements/functional/fr-validate-references.md), [FR-VALIDATE-DIAGNOSTICS](requirements/functional/fr-validate-diagnostics.md), [FR-GRAPH](requirements/functional/fr-graph.md), [FR-INSPECT](requirements/functional/fr-inspect.md), [FR-IMPACT](requirements/functional/fr-impact.md), [FR-CHANGE-VALIDATE](requirements/functional/fr-change-validate.md), [FR-CITE](requirements/functional/fr-cite.md), [FR-CITATIONS-VERIFY](requirements/functional/fr-citations-verify.md), [FR-DISTRIBUTION](requirements/functional/fr-distribution.md), [FR-OPENSPEC](requirements/functional/fr-openspec.md), [FR-SCHEMA](requirements/functional/fr-schema.md), [FR-FIX](requirements/functional/fr-fix.md), [FR-DOCTOR](requirements/functional/fr-doctor.md), [FR-EXPLORE](requirements/functional/fr-explore.md), [FR-SNAPSHOT-PAGE](requirements/functional/fr-snapshot-page.md) through [FR-SNAPSHOT-TOPOLOGY](requirements/functional/fr-snapshot-topology.md), and [FR-SNAPSHOT-BUSINESS-LENS](requirements/functional/fr-snapshot-business-lens.md).

Quality: [QR-PORTABILITY](requirements/quality/qr-portability.md), [QR-DETERMINISM](requirements/quality/qr-determinism.md), [QR-EXPLAINABILITY](requirements/quality/qr-explainability.md), [QR-EXTENSIBILITY](requirements/quality/qr-extensibility.md), [QR-ACCESSIBILITY](requirements/quality/qr-accessibility.md), [QR-PRESENTATION](requirements/quality/qr-presentation.md), [QR-SCALABILITY](requirements/quality/qr-scalability.md).

Constraints: [CON-MARKDOWN](requirements/constraints/con-markdown.md), [CON-NO-GRAPH-DATABASE](requirements/constraints/con-no-graph-database.md), [CON-NO-WEB-UI](requirements/constraints/con-no-web-ui.md), [CON-SDD-AGNOSTIC](requirements/constraints/con-sdd-agnostic.md), [CON-PUBLIC-GENERIC](requirements/constraints/con-public-generic.md), [CON-BRAND](requirements/constraints/con-brand.md).
