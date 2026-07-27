# 0008 — Vendor assets are generated

Status: Accepted
Date: 2026-07-25

## Context

The toolkit ships AI assets for multiple providers: Claude Code reads `.claude/`, GitHub Copilot
reads `.github/`. Maintaining hand-written copies per provider guarantees drift — a skill fixed
for one provider and forgotten for the other — and multiplies every framework change by the number
of providers. The same problem the methodology solves for product knowledge (one canonical source,
derived views) applies to the toolkit's own assets.

## Decision

The canonical AI assets live once, provider-neutrally, in the repository: `skills/` (six skills),
`commands/` (seven thin `/product:*` commands), `hooks/` (four deterministic guard descriptors)
and `templates/`. Provider files under `.claude/` and `.github/` are generated from them by the
`distribution` package, using the provider mappings exported by `integration-claude` and
`integration-copilot`.

Every generated provider file carries a managed-file header — a marker, the framework version, the
canonical source and a content hash — and is recorded in `installation.lock.json`.
`prodshape integration update` regenerates managed files; `prodshape doctor`
compares actual content hashes against the lock file and reports hand-edited (`PRODUCT051`) or
missing (`PRODUCT052`) managed files. No manually maintained provider duplicates exist.

The providers are not symmetric. Claude Code has a native hook runtime, so the Claude integration
renders executable hooks. GitHub Copilot offers no equivalent mechanism (OPEN-DECISIONS OD-002),
so the Copilot integration renders the hook expectations as documentation only; the enforcement
gap is recorded in `docs/limitations.md`.

## Consequences

Positive:

- One fix in a canonical skill reaches every provider on the next `integration update`; providers
  cannot drift apart.
- Adding a provider means writing one integration package with mapping and templates — the
  canonical assets are untouched.
- `doctor` makes hand-edits to generated files detectable instead of silently surviving until the
  next regeneration overwrites them.
- The lock file gives installations an inspectable record of what was generated, from what, at
  which version.

Negative:

- Generated files churn on framework upgrades: an `integration update` after a toolkit release can
  rewrite many `.claude/` and `.github/` files at once, producing noisy diffs in adopting
  repositories.
- Contributors must learn to edit the canonical asset, not the output. Editing a generated file is
  the intuitive move, and the cost is a `doctor` error plus losing the edit on the next update.
- Hook enforcement is asymmetric by provider: Copilot users get documented expectations, not
  deterministic guards, and may assume protection they do not have.
