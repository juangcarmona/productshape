---
'@prodshape/cli': patch
'@prodshape/distribution': patch
---

Honor explicit PDaC serialization selection when generating initialization configuration. Preserve the configured contract on repeated initialization and reject conflicting selections before writing.
