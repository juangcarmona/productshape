# Handoff Contract

A **Product Handoff** is the framework-independent contract between Product Definition and an SDD
framework. It selects the product subgraph relevant to one delivery increment and records enough
provenance to detect staleness. Handoffs and Product Context documents are **generated and
non-canonical**.

A handoff MUST contain product context and traceability. It MUST NOT contain technical design,
implementation tasks, class names, database decisions, framework choices, deployment instructions
or any other decision owned by the SDD and implementation layers.

## Handoff document

Schema `product-definition-as-code/handoff/v1alpha1`:

```yaml
schema: product-definition-as-code/handoff/v1alpha1
id: HOF-GITHUB-123
generated-at: 2026-01-01T10:00:00Z
work-item:
  provider: github
  repository: owner/repository
  id: '123'
  title: Generate framework-independent Product Handoffs
source:
  repository: owner/repository
  revision: <git-commit-sha>
  product-change: CHG-HANDOFF-001
  delivery-slice: SLI-HANDOFF-001
implements:
  - FR-HANDOFF-001
affects:
  - ACT-PRODUCT-ENGINEER
  - UC-HANDOFF-001
artifacts:
  - id: FR-HANDOFF-001
    type: functional-requirement
    path: docs/product/changes/active/chg-handoff-001/proposed/requirements/functional/fr-handoff-001.md
    digest: sha256:<hex>
context:
  path: product-context.md
  digest: sha256:<hex>
```

- `artifacts[].path` is the repository-relative path (POSIX separators) of the artifact at
  generation time; identity remains the ID, not the path.
- Digests are `sha256:<hex>` over the artifact's UTF-8 content with line endings normalized to LF.
- `source.revision` records the Git commit the handoff was generated from.

## Generation rules

The generator:

1. MUST start from an `approved` delivery slice of a validated Product Change overlay.
2. MUST resolve all artifacts named by the slice's `implements` and `affects`.
3. MUST include the upstream product context selected by the **closure rule** below.
4. MUST NOT include unrelated graph regions or reproduce the entire product repository.
5. MUST record artifact paths, content digests and the source Git revision.
6. MUST generate a readable `product-context.md` marked as generated and non-canonical.

### Closure rule

The included subgraph is computed deterministically:

- Start set: the slice's `implements` targets and `affects` targets.
- Expand Functional Requirements via `derived-from`; Quality Requirements and Constraints via
  `applies-to`.
- Expand each included Use Case via `primary-actor`, `supporting-actors`, `bounded-context`,
  `governed-by` and `uses-terms`.
- Expand each included Domain Term via `defined-in`.
- Add (one incoming hop) every Journey whose `steps` include an included Use Case, and that
  journey's `primary-actor`.
- Add every Constraint whose `applies-to` names an included artifact, and every product-wide
  Constraint.
- Do not expand further.

Artifacts are resolved overlay-first: a proposed future-state artifact of the handoff's Product
Change takes precedence over its baseline counterpart.

## Product Context

`product-context.md` presents the selected subgraph for human and AI consumption: the work item,
the implemented requirements with their acceptance content, the affected behaviour, governing
rules, domain language and open questions of the Product Change. It MUST begin with a generated
marker naming the handoff ID and MUST NOT introduce content absent from the canonical sources.

## Status and staleness

`prodshape handoff status <path>` reports one of:

| Status                        | Meaning                                                                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `current`                     | Every referenced artifact's recomputed digest matches the handoff.                                                               |
| `stale`                       | At least one referenced artifact's content changed; the report names each stale artifact.                                        |
| `invalid`                     | The handoff document is malformed, references unknown artifacts, or its digests cannot be interpreted.                           |
| `source-revision-unavailable` | A referenced artifact is absent from the working tree and `source.revision` cannot be resolved (for example in a shallow clone). |

Digest recomputation resolves artifacts overlay-first from the working tree; if a path is gone
(for example after promotion), the content at `source.revision` is used. Staleness is judged
exclusively by the digests of referenced artifacts: unrelated commits, unrelated artifact edits and
generated-file churn MUST NOT make a handoff stale.

## SDD boundary

SDD frameworks consume handoffs; they retain native ownership of their own artifacts and workflow.
SDD MAY report questions and contradictions back to Product Definition. SDD MUST NOT silently
rewrite canonical product knowledge, and archiving an SDD change MUST NOT promote a Product Change.
