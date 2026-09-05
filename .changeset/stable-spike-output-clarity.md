---
'@prodshape/core': patch
'@prodshape/cli': patch
'@prodshape/distribution': patch
'@prodshape/integration-openspec': patch
'@prodshape/integration-speckit': patch
---

Output clarity fixes found by the 0.19.0 consumer spikes: hosted `apply --dry-run` reports the projected resulting model; the affected-citation forecast skips the applying change's own container and the host archive; `speckit-product refine` lists the files it wrote; `change validate` counts accepted artifacts explicitly; `integration remove` separates deleted files from files restored to their pre-PDaC content; `doctor` no longer reports "no integrations installed" next to a healthy SDD integration; the citation guidance states that a task depending on a rule's parameter cites the rule itself.
