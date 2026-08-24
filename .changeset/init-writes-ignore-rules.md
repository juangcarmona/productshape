---
'@prodshape/distribution': minor
'@prodshape/cli': minor
---

`init` can now write the regenerable-output rules into `.gitignore` instead of only recommending them. It never does so unasked: `--gitignore` requests it, an interactive run asks first, and a non-interactive run without the option writes nothing. The write is additive and idempotent, existing content is preserved exactly, a rule already present in an equivalent form is not repeated, and the generated rule follows the configured `generated.root`. `--dry-run` reports the outcome as `Would extend` and performs none of it. The printed next steps now also state which parts of the installation belong in version control, so ignoring `.product/` wholesale stops looking like the tidy answer.
