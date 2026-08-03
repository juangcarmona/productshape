# Automate npm Publishing

## Why

The first package (`@prodshape/cli` `0.1.0-alpha.1`) was published by hand from a developer's laptop using a long-lived granular npm access token. That does not scale to a six-package pnpm monorepo, ties releases to one machine and one person's credentials, and leaves a long-lived secret in circulation. We need a secure, repeatable, machine-independent release pipeline before the next set of packages goes public. This is an implementation and release-engineering concern only — it changes how the repository ships, not what the product is, and introduces **no** change to the product model, the methodology, or any Product Definition as Code concept.

## What Changes

- Adopt **Changesets** as the versioning and changelog tool for the workspace (`.changeset/`, independent per-package versions, "only changed packages" release selection).
- Add a **GitHub Actions release pipeline** that publishes to npm entirely from CI, never from a developer machine.
- Adopt **npm Trusted Publishing (OIDC)** as the primary authentication mechanism (no long-lived npm token in CI), with **npm provenance attestations** emitted automatically on every publish.
- Keep a **granular-token fallback path** (`NODE_AUTH_TOKEN` from a GitHub Secret) documented for the bootstrap window and for any package whose trusted-publisher config is not yet in place.
- Support a **three-track release strategy** — `alpha`, `beta`, and `stable` — using Changesets pre-release mode plus dist-tags, driven by a Changesets "Version Packages" release PR merged to `main`, with `workflow_dispatch` as a manual escape hatch.
- Publish **only the packages that actually changed**, with correct scoped-public access on first publish and no manual intervention on subsequent releases.
- Document the **required repository secrets, npm configuration, release process, rollback strategy, migration plan, and risks/mitigations**.

This change adds workflow, configuration, and documentation. It does **not** modify any package's runtime code, the CLI behavior, or the self-hosted product baseline.

## Capabilities

### New Capabilities

- `release-publishing`: Deterministic, machine-independent publishing of the workspace's public npm packages from GitHub Actions — versioning source of truth, changed-package selection, release triggers and tracks (alpha/beta/stable), authentication, supply-chain guarantees (OIDC trusted publishing, provenance, least privilege, immutability), and rollback.

### Modified Capabilities

<!-- None. This change is release-engineering only and does not alter any product-model,
     methodology, or PDaC capability spec. -->

## Impact

- **New**: `.changeset/config.json`, `.github/workflows/release.yml`, per-package `publishConfig.access: public` and `publishConfig.provenance: true` where missing, a `RELEASING.md` (or equivalent) release runbook, and root `release`/`version` scripts.
- **npm registry**: trusted-publisher configuration created on npmjs.com for each `@prodshape/*` package; the manual granular token is scoped down and retired once OIDC is live.
- **GitHub repository**: Actions permissions and (optionally) an `npm-publish` environment; a single `NPM_TOKEN` secret retained only as fallback.
- **No secrets committed to the repository.** No product-model files, spec baselines, or methodology docs change. CI (`ci.yml`, `conformance.yml`) is unaffected except for an optional gate ensuring changed packages carry a changeset.
- **Package name mapping** (user brief → actual workspace names): `@prodshape/openspec` → `@prodshape/adapter-openspec`, `@prodshape/claude` → `@prodshape/integration-claude`, `@prodshape/copilot` → `@prodshape/integration-copilot`; plus `@prodshape/core`, `@prodshape/cli`, `@prodshape/distribution`.
