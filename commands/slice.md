# /product:slice

Propose delivery increments for an approved Product Change.

Use the `slice-product-change` skill.

- Slice by vertical product outcome, never by technical layer.
- Declare coverage (full, or partial with a precise scope), dependencies, verification and
  out-of-scope for every slice; write them as drafts under the change's `slices/`.
- Run `product-definition change validate <CHG-ID>` before completion.
- Stop and present the slicing rationale. A human approves each slice.
