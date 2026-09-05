---
'@prodshape/integration-speckit': minor
'@prodshape/cli': minor
---

`prodshape speckit-product refine <name>` no longer requires a JSON file: it refreshes `impact.json` from the edited change, `--note` appends working memory to `proposal.md`, and `--input` remains for structured refinements. Recorded checked and excluded ids are preserved across refreshes.
