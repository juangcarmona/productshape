---
id: BR-CHANGE-001
type: business-rule
title: Product-model changes happen through validated pull requests
status: active
applies-to:
  - BC-PRODUCT-DEFINITION
---

## Rule

The baseline changes through exactly one operation: a human merging a validated proposed revision (a pull request). Every semantic evolution of the product definition MUST be a pull request that passes `prodshape validate` (CI gate) before merge. Tools MUST NOT merge, auto-approve or self-merge model changes. A change draft (`CHG-` artifact) MAY be used to structure the intent, affected artifacts and open questions during drafting, but the draft is not a delivery mechanism — the PR is.

## Rationale

The current product model is the record of what the product is, as accepted today. If proposed ideas could edit it directly, the baseline would stop distinguishing "defined and accepted" from "under discussion". Representing evolution as pull requests keeps proposals reviewable and versioned: each PR carries the actual model edits, the change draft carries the intent and open questions, and `prodshape validate` checks the full tree before merge. Merging is a deliberate, auditable, human act — not a side effect of editing.

## Examples

- A stakeholder reports an urgent contradiction in an active business rule. Even under time pressure, the correction is a pull request, validated before merge — urgency changes the review pace, not the mechanism.
- An engineer drafts a change using the `analyze-product-change` skill, which creates a `change.md` draft and proposed artifacts in the working tree. The engineer opens a PR; the draft is context for the review, not a delivery artifact.
- A reviewer inspects the PR diff to see the exact future state of every affected artifact, while the baseline (the main branch) remains unchanged until merge.

## Exceptions

None. The initial baseline enters through the same mechanism as every later change: a reviewed merge into an empty model.
