---
'@prodshape/distribution': minor
'@prodshape/integration-claude': minor
'@prodshape/integration-copilot': minor
'@prodshape/cli': minor
---

Add `ps:explore` — a product-graph-aware thinking partner before `ps:change`.

**New skill: `explore-product`.** Before committing to a Product Change, engineers can invoke
`/ps:explore` (or `/product:explore`) to clarify a fuzzy idea against the existing product model.
The skill reads the full product graph upfront, reasons from a high-altitude structural view to
surface gaps, inconsistencies, and affected artifacts, and ends with an explicit offer to hand off
to `ps:change`. When the model is absent or minimal it explains ProductShape's artifact vocabulary
instead (greenfield mode). If `ps:change` detects that a request is ambiguous, it warns the user
and recommends `ps:explore` before proceeding.

This fills the missing entry point in the ProductShape workflow: product engineers previously had
no guided way to explore a fuzzy idea before `ps:change` required a well-formed request.
