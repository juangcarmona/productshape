---
description: Continue and graph-refine the named ProductShape Product Change in place.
---

# Refine Product Change

Resolve the named container under `.specify/productshape/changes/<name>/` and re-read `change.md`, the proposed artifacts, `proposal.md` and `impact.json`. Refine in place: edit `change.md` and the proposed artifacts directly, then run `prodshape speckit-product refine <name>` to refresh `impact.json` from the declared operations. Record working memory with `--note "<text>"`. Use `--input <file>` (JSON with rationale, open questions, out of scope, checked and excluded artifact ids) when the clarification pass produces structured results. Keep checked-and-excluded neighbours visible, preserve human decisions as rationale, and do not create a second lifecycle. Update only that container; never approve, apply, archive, or edit the accepted model.
