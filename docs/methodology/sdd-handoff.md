# SDD handoff

The **Product Handoff** is where Product Definition ends and Spec-Driven Development begins: a
generated, framework-independent package containing exactly the product context one delivery
increment needs. This page explains the step for practitioners; the contract is normative in
[Handoff Contract](../specification/handoff-contract.md).

## When to generate

A handoff is generated for one **approved delivery slice** of a Product Change whose **overlay
validates**. Both conditions are enforced: the generator refuses a slice that is not `approved`,
and an overlay with validation errors has no business feeding an implementation. In the flow of
the [Change operation](change.md), this sits after slice approval and backlog projection, and
immediately before the SDD workflow starts.

## What the handoff contains

- The **work-item reference** (for example `github:owner/repo#123` — see
  [Backlog projection](backlog-projection.md)).
- The **source provenance**: repository, Git revision, Product Change and slice IDs.
- The **implemented requirements** and **affected artifacts**, by stable ID.
- The **selected artifacts** themselves — each with its path at generation time and a content
  digest — plus a generated, human-readable `product-context.md` presenting the subgraph:
  requirements with acceptance content, affected behaviour, governing rules, domain language,
  and the change's open questions.

## What it deliberately excludes

No technical design. No implementation tasks, class names, database decisions, framework choices
or deployment instructions. Those decisions belong to the SDD and implementation layers, and a
handoff that smuggled them in would be product definition overreaching into design. Equally, a
handoff never includes unrelated graph regions or the whole repository — precision is the point.

## The closure rule, in plain words

Which artifacts get included is decided by a deterministic closure rule, not by judgment. Start
from what the slice implements and affects. Follow each requirement back to what it derives from
or applies to. For every use case pulled in, bring its actors, its bounded context, its governing
rules and its terms; for every term, the context defining it. Add the journeys that pass through
an included use case (and their actors), and any constraint that names an included artifact —
plus product-wide constraints, which always apply. Then stop.

The result is the increment's neighbourhood of meaning: enough context to implement faithfully,
small enough to actually be read. Same slice, same model, same handoff — every time, on every
machine.

## Staleness, in plain words

Every artifact in a handoff carries a content digest. A handoff is **stale** when the current
canonical content of at least one referenced artifact no longer matches its digest — meaning the
product knowledge the implementation is working from has changed underneath it. The status check
names exactly which artifacts changed.

Just as important is what does _not_ stale a handoff: unrelated commits, edits to artifacts
outside the handoff, generated-file churn. Staleness is judged per referenced artifact, by
digest, never by repository activity. A handoff from three months ago whose artifacts are
untouched is `current`, and trustworthy.

## OpenSpec sidecar placement

OpenSpec is the first SDD adapter. The integration is deliberately shallow: three **sidecar
files** are placed inside the OpenSpec change directory —

- `product-handoff.yaml` — the handoff document,
- `product-context.md` — the generated readable context,
- `product-coverage.yaml` — the mapping from implemented requirements to the SDD work covering
  them, which promotion later uses as traceability evidence.

OpenSpec keeps native ownership of everything else — proposal, specs, design, tasks,
implementation, verification, archive. Its workflow is not modified, wrapped or re-skinned; the
sidecars ride along.

## What SDD may do, and must not do

The SDD side may — and should — **report back**: questions the handoff context does not answer,
contradictions discovered during implementation, gaps in the product definition. These flow into
the Product Change as open questions or follow-up changes; they are among the most valuable
signals the definition receives.

The SDD side must not **rewrite product knowledge** — canonical artifacts change only through the
Product Change workflow — and must not **trigger promotion**. Archiving an OpenSpec change never
promotes a Product Change; promotion is a separate, explicit, human decision, made after
verification, as described in [Change](change.md).
