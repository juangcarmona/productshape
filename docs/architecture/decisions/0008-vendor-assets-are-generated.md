# 0008 — Vendor assets are generated

Status: Accepted Date: 2026-07-25

## Context

The toolkit ships AI assets for multiple providers: Claude Code reads `.claude/`, GitHub Copilot reads `.github/`. Maintaining hand-written copies per provider guarantees drift — a skill fixed for one provider and forgotten for the other — and multiplies every framework change by the number of providers. The same problem the methodology solves for product knowledge (one canonical source, derived views) applies to the toolkit's own assets.

## Decision

The canonical AI assets live once, provider-neutrally, in the repository: `skills/` (five skills), `commands/` (six thin `/product:*` commands) and `templates/`. The push-pipeline hooks were retired by RFC #4. Provider files under `.claude/`, `.github/` and `.agents/` are generated from them by the `distribution` package, using the provider mappings exported by `integration-claude`, `integration-copilot` and `integration-codex`.

Every generated provider file carries a managed-file header — a marker, the framework version, the canonical source and a content hash — and is recorded in `installation.lock.json`. `prodshape integration update` regenerates managed files; `prodshape doctor` compares actual content hashes against the lock file and reports hand-edited (`PRODUCT051`) or missing (`PRODUCT052`) managed files. No manually maintained provider duplicates exist.

The providers are not symmetric. Claude Code has a native hook runtime. GitHub Copilot and Codex-compatible agents offer no equivalent mechanism (OPEN-DECISIONS OD-002); the enforcement gap is recorded in `docs/limitations.md`. The push-pipeline hooks were retired by RFC #4, so no hooks are currently shipped.

Ownership extends to absence. A managed file the current assets and configuration no longer produce is removed, conditional on its content still matching the recorded hash; a file that has diverged is kept and reported instead. Without this a file dropped from the lock would persist unreferenced and unchecked — never regenerated, never reported as drifted, indistinguishable from something the user wrote — which is a worse outcome than deleting it.

A rendering choice may make the output set depend on repository configuration as well as on the canonical assets: the `/ps:*` command aliases are generated only when the repository opts in. Such a choice is recorded in configuration rather than passed per invocation, because regeneration reads configuration and would otherwise silently reverse a decision the repository had already made. It is the interaction between this and removal above that makes opting out safe.

[ADR 0009](0009-reference-documentation-is-generated.md) extends the same principle to reference documentation: vendor assets are derived from canonical assets, and reference documentation is derived from the contracts.

## Consequences

Positive:

- One fix in a canonical skill reaches every provider on the next `integration update`; providers cannot drift apart.
- Adding a provider means writing one integration package with mapping and templates — the canonical assets are untouched.
- `doctor` makes hand-edits to generated files detectable instead of silently surviving until the next regeneration overwrites them.
- The lock file gives installations an inspectable record of what was generated, from what, at which version.

Negative:

- Generated files churn on framework upgrades: an `integration update` after a toolkit release can rewrite many `.claude/` and `.github/` files at once, producing noisy diffs in adopting repositories.
- Contributors must learn to edit the canonical asset, not the output. Editing a generated file is the intuitive move, and the cost is a `doctor` error plus losing the edit on the next update.
- Hook enforcement is asymmetric by provider: Copilot users get documented expectations, not deterministic guards, and may assume protection they do not have.
