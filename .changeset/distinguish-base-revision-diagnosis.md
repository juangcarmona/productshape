---
'@prodshape/core': patch
---

Fix PRODUCT027 reporting "changed since base-revision" when the base-revision could not be resolved at all (outside a Git repository, a shallow clone, or an ambiguous or missing revision). The diagnostic now distinguishes an unresolvable base-revision from a base-revision that resolved but whose recorded content digest differs, and states which one occurred.
