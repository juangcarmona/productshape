---
'@prodshape/core': patch
'@prodshape/cli': patch
---

Fix `change apply --dry-run` skipping the entire preflight. The preflight (reading every write source, confirming every delete target, verifying the archive destination is absent) lived only inside `executeApply`, which a dry run never called, so a dry run could report "Would apply" for a plan that would fail immediately for real — for example when the archive destination already exists. `executeApply`'s preflight is now a separate exported `preflightApply`, and `--dry-run` runs it too, so it reports the identical refusal a real apply would while still writing nothing.
