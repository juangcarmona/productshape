# /product:change

Turn a requested product modification into an explicit Product Change.

Read the requested change and the current product definition graph. Use the
`analyze-product-change` skill.

- Create or update one Product Change under `docs/product/changes/active/<chg-id>/` with complete
  proposed future-state artifacts. Do not modify `docs/product/model`.
- Run `prodshape change validate <CHG-ID>` before completion; fix structural errors.
- Stop with explicit product questions when semantic decisions are missing. Approval is a human
  decision.
