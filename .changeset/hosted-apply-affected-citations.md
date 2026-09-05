---
'@prodshape/core': minor
'@prodshape/integration-openspec': patch
'@prodshape/cli': minor
---

Hosted apply reports the affected citation set: every citation of a changed artifact with the status it will hold after apply, computed before any write. `prodshape speckit-product apply` and the OpenSpec bridge print it, and the result carries it as `affectedCitations`.
