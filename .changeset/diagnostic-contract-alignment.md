---
'@prodshape/core': minor
'@prodshape/cli': minor
---

Align diagnostics with the frozen PDaC validation contract. Diagnostics gain `change`, `line` and `entry`; a Product Change ID now appears in `change` and a cited ID in `target` with its payload line or sidecar entry, never in `artifact`. Ordering is by file, then line and entry (absent before present, numerically), then code, field, target, artifact and change. `PRODUCT002` emits once per distinct invalid instance path, `PRODUCT003` carries `field: type` and the consumer scope diagnostics carry `field: scope`.
