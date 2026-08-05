# Open Decisions

This file lists only the decisions that are currently **open**. Each entry says why the decision matters and the interim position held until it is made.

When a decision is made, its entry is **removed** — not marked "resolved" and kept. The decision then lives in the one artifact that enforces it: a product constraint for product decisions, the code and configuration for implementation decisions, or the Git history for the reasoning. It is never duplicated back into this file, so this list stays short and true to its name. Entry IDs are stable and are not renumbered when an entry is removed; other documents may reference them.

## OD-007: Validation of nested configuration keys

**Why it matters:** `.product/config.yaml` rejects unknown **top-level** keys as `PRODUCT050`, but keys nested inside `product`, `generated`, `integrations` and `validation` are read by name and otherwise ignored. A misspelling such as `shorthand-command` or `warnings-as-error` therefore does nothing at all, silently: the repository behaves as though the setting were absent, and no diagnostic says why. The narrower the setting's effect, the longer that goes unnoticed.

**Interim position:** Unknown nested keys are ignored. The configuration reference lists every accepted key per section and warns that misspellings are silent, and a conformance test round-trips the configuration `init` generates through the parser so the two cannot disagree. Whether to reject unknown nested keys — and whether that is a `PRODUCT050` error or a new warning, given it would fail repositories that currently carry harmless extra keys — is deferred.

## OD-008: Depth of installation-lock verification

**Why it matters:** `integration update --check` verifies that every path the installation lock records exists and still matches its digest (`PRODUCT051` / `PRODUCT052`). It does not verify that the lock equals what the currently installed toolkit _would_ render. A lock that is internally consistent but stale relative to the renderer therefore passes.

**Interim position:** The gap is currently unreachable for consumers: managed files are committed, so there is nothing to install in a fresh checkout; canonical assets ship inside the package and cannot be edited in place; and a framework-version mismatch is already reported by `doctor`. An npm-ci-style `install --frozen` was considered for this release and deferred as redundant on those grounds. If a second renderer or user-supplied canonical assets ever land, the right shape is a re-render comparison inside the existing `--check`, not a new command.
