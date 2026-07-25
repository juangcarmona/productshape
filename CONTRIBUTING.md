# Contributing

Thank you for your interest in Product Definition as Code.

This project is in an early bootstrap phase (v0.1). The methodology, specification and toolkit are
being built in the open, and the repository defines itself with its own methodology
(see `docs/product/`).

## Ground rules

- **The specification is normative.** Changes to artifact semantics, identifiers, relationships or
  lifecycle states must update `docs/specification/` and, when they change the current product,
  go through a Product Change under `docs/product/changes/`.
- **Markdown and authored YAML under `docs/product` are canonical.** Generated files
  (`.product/generated/`, provider integration files with a managed header) must never be edited
  by hand.
- **Deterministic core, AI reasoning separated.** Structural validation logic belongs in
  `packages/core`; semantic reasoning belongs in `skills/`. Do not blur that boundary.
- **Small dependency set.** New runtime dependencies need a strong justification; see the approved
  list in `docs/architecture/overview.md`.

## Development setup

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Node >= 22 (the current Node.js LTS lines) and pnpm (see `packageManager` in `package.json`) are
required.

## Making changes

1. Open an issue describing the problem or proposal first for anything non-trivial.
2. For changes to the product definition itself, follow the Change operation described in
   `docs/methodology/change.md`.
3. Keep commits scoped and messages in conventional-commit style
   (`docs:`, `feat(core):`, `test:`, ...).
4. All checks (`lint`, `typecheck`, `test`, `build`) must pass.

## Releasing published packages

The `@prodshape/*` packages are versioned with [Changesets](https://github.com/changesets/changesets)
and published from GitHub Actions — never from a local machine. If your change affects a published
package, add a changeset in the same PR:

```bash
pnpm changeset
```

Choose the affected packages and bump type and write a short, user-facing summary. Only packages
that receive a changeset are released. A non-blocking CI check reminds you when a changeset is
missing. The full release process, pre-release (alpha/beta) tracks and rollback are documented in
[RELEASING.md](RELEASING.md).

## Unresolved decisions

Deliberately open decisions are tracked in [OPEN-DECISIONS.md](OPEN-DECISIONS.md). Please do not
open pull requests that resolve them unilaterally (for example, introducing an acronym or brand).

## Code of conduct

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to
uphold it.
