---
'@prodshape/core': patch
'@prodshape/cli': patch
---

Fix `prodshape fix --filenames --dry-run` writing to disk.

Recovery of a rename interrupted between its two steps ran before the dry-run check, so asking what
the command _would_ do renamed the leftover file and then reported `Dry run: nothing was changed.`
That contradicted the command's own contract (`FR-FIX-001`) and the guarantee the sibling
`init --dry-run` is built on.

Recovery is now split into `planFilenameRecovery` (read-only classification) and
`applyFilenameRecovery`, matching the plan/apply pairs used elsewhere in the toolkit. A dry run
reports `would recover <path>` and performs no rename; a pending recovery still counts toward the
non-zero exit code, so the CI gate is unaffected. `--format json` gains a `wouldRecover` field so a
planned recovery is distinguishable from a performed one.
