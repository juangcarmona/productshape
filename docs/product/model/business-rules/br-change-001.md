---
id: BR-CHANGE-001
type: business-rule
title: The Product Definition evolves only through applied and accepted Product Changes
status: active
applies-to:
  - BC-PRODUCT-DEFINITION
---

## Rule

The Product Definition MUST NOT be modified except by applying an approved Product Change that is then accepted through human review. A Product Change is a semantic delta of additions, modifications and removals, elaborated under `docs/product/changes/active/`, validated as an overlay on the baseline, and applied by an explicit human-triggered operation. A pull request reviews and accepts a Product Change; it is not the Product Change. Tools MUST NOT approve a change, apply one implicitly, merge, auto-approve or self-merge.

## Rationale

Git records that files changed. It does not record that the product changed, or what that meant. Representing evolution as a Product Change keeps the reason, the intended outcome and the open questions attached to the delta itself, which is also the only unit a product diff and its impact analysis can attach to.

Separating apply from acceptance is what keeps the boundary honest. Apply materializes a proposal and proves it is structurally sound; it decides nothing about whether the product should say this. A tool that treated a successful apply as acceptance would be deciding product intent, which is the one thing it must never do.

## Examples

- A stakeholder reports an urgent contradiction in an active business rule. Even under time pressure the correction is a Product Change: urgency changes the review pace, not the mechanism.
- An engineer elaborates a change with the `analyze-product-change` skill, which writes `change.md` and the complete proposed artifacts. `prodshape change validate` compiles the overlay and reports it clean, a human sets `status: approved`, and `prodshape change apply` writes the result and archives the change.
- A reviewer reads the pull request to see the exact resulting state of every affected artifact. The canonical branch still carries the previous definition until the merge lands.

## Exceptions

None. The first Product Definition enters through `CHG-INITIAL`, the same mechanism as every later change.
