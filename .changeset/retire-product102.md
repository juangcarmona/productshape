---
'@prodshape/core': minor
'@prodshape/cli': minor
'@prodshape/distribution': patch
---

Retire `PRODUCT102`. RFC 0112 made Journey context optional for a Use Case, so an active Use Case outside every Journey is no longer a warning. The pinned specification moves to `b3f44d2` (45 conformance cases; `use-case-without-journey` asserts the absence) and the audit skill's diagnostic list drops the code.
