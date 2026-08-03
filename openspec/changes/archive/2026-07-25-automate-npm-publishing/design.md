# Design — automate-npm-publishing

## Context

The workspace is a pnpm monorepo (`pnpm@11`, Node ≥22) with six publishable packages under the `@prodshape/*` scope: `core`, `cli`, `distribution`, `adapter-openspec`, `integration-claude`, `integration-copilot`. Only `@prodshape/cli` is currently on npm (`0.1.0-alpha.1`), published manually with a granular access token. The CLI is bundled with esbuild and vendors its workspace dependencies, so its published `package.json` lists only external runtime deps; the other five are conventional library packages that will carry real inter-package `dependencies` once published and therefore must be released in dependency order.

Constraints from the brief, treated as hard requirements: publishing happens only in GitHub Actions; never from a laptop; auth via GitHub Secrets / OIDC with nothing committed; scoped-public packages with correct first-publish access; subsequent releases fully hands-off; only changed packages publish; alpha/beta/stable tracks; current npm + GitHub best practices for supply-chain security. This design is release-engineering only and does not touch the product model, the methodology, or any PDaC concept.

## Goals / Non-Goals

**Goals:**

- One authoritative, reproducible path from "merge to `main`" to "packages on npm".
- Zero long-lived publish credentials in steady state; provenance on every published version.
- Independent, dependency-ordered publishing of only the packages that changed.
- First-class alpha / beta / stable tracks with correct npm dist-tags.
- A documented migration from the current manual token flow, plus rollback.

**Non-Goals:**

- No change to package runtime code, CLI behavior, bundling, or the self-hosted product baseline.
- No new product-model artifacts, spec-baseline edits, or methodology changes.
- No automated _major_ version policy or deprecation automation (manual for v0.x).
- No publishing to registries other than the public npm registry.

## Decisions

### D1 — Versioning tool: **Changesets** (over semantic-release / manual)

**Chosen: Changesets (`@changesets/cli`).**

| Option | Fit for this repo | Trade-offs |
| --- | --- | --- |
| **Changesets** ✅ | Purpose-built for multi-package monorepos; per-package independent versions; contributor writes an intent file per change; "release PR" model gives a human review gate; first-class pnpm support; per-package changelogs; native pre-release (alpha/beta) mode. | Requires a `.changeset/*.md` per change (mitigated by an optional CI reminder); version bump is intent-declared, not inferred. |
| **semantic-release** ❌ | Strong for a _single_ package with strict Conventional Commits. Monorepo support needs `semantic-release-monorepo`/multi-config glue; couples versioning to commit-message discipline; no natural review gate before publish; independent versioning across six packages is awkward. | Heavier config; commit-convention lock-in; weaker monorepo story. |
| **Manual (`pnpm -r publish` + hand-edited versions)** ❌ | Zero new deps. | Exactly today's problem: error-prone, no changelog automation, no changed-package selection, easy to mis-order dependencies. |

**Rationale.** Changesets matches a pnpm monorepo with independent versions and gives an explicit human-reviewed "Version Packages" PR — valuable while the product is pre-1.0 and package boundaries still move. It computes the changed set and the correct bump per package from the declared changesets, and bumps internal `workspace:*` dependents automatically.

### D2 — Release trigger: **Changesets release PR merged to `main`** (primary), `workflow_dispatch` (escape hatch)

Evaluation of the four candidate triggers:

| Trigger | Verdict | Reasoning |
| --- | --- | --- |
| **Version changes via Changesets release PR** | ✅ **Primary** | The `changesets/action` runs on push to `main`: if unreleased changesets exist it opens/updates a **"Version Packages"** PR (applies bumps, writes changelogs, deletes consumed changesets). Merging that PR triggers the same workflow, which now finds versions ahead of npm and **publishes**. Effectively a "version-change" trigger with a built-in review gate. Most maintainable — one file, one mental model, changelog + tags for free. |
| **Git tags** | ⚠️ Secondary | Clean and auditable, but in a monorepo you need per-package tags (`@prodshape/core@1.2.0`); Changesets _creates_ these tags on publish, so tags become an **output**, not the trigger. Driving publish from manually pushed tags reintroduces manual, error-prone steps. |
| **GitHub Releases** | ⚠️ Secondary | Nice for human-facing notes, but one GitHub Release maps poorly onto N independently versioned packages. Better generated _from_ the release PR than used as the trigger. |
| **Manual `workflow_dispatch`** | ✅ **Kept as fallback** | Explicit, controlled runs for the bootstrap window, for re-running a failed publish, and for entering/exiting pre-release mode. Not the day-to-day path, but the safety valve. |

**Rationale.** The release-PR model gives determinism (publish only reflects reviewed version bumps), a natural approval gate, and free changelog + tag generation, while `workflow_dispatch` covers bootstrap and recovery.

### D3 — alpha / beta / stable via Changesets **pre-release mode** + npm **dist-tags**

- **Stable**: normal mode. Publish to the default `latest` dist-tag.
- **alpha / beta**: `pnpm changeset pre enter alpha` (or `beta`) puts the repo in pre mode; versions become `x.y.z-alpha.N`, and the workflow publishes with `--tag alpha` / `--tag beta` so `npm install @prodshape/cli` never silently pulls a pre-release. `pnpm changeset pre exit` returns to stable. Entering/exiting pre mode is done via a short-lived branch or `workflow_dispatch`, keeping `main` intent explicit.
- Dist-tag mapping is derived from the version's prerelease identifier, so no per-package manual tagging is required.

### D4 — Authentication: **npm Trusted Publishing (OIDC)** primary, granular token fallback

- **Primary — Trusted Publishing (OIDC).** npm supports GitHub Actions OIDC trusted publishers: the workflow exchanges a short-lived `id-token` for publish rights, so **no npm token lives in CI**. Each `@prodshape/*` package gets a trusted-publisher entry on npmjs.com bound to this repo
  - the `release.yml` workflow (+ environment, if used). This is the current npm/GitHub best practice and it **auto-enables provenance**.
- **Fallback — granular token.** A single `NPM_TOKEN` GitHub Secret (granular, write-scoped to `@prodshape/*`, short expiry) is retained for: (a) the bootstrap window before every package's trusted publisher is configured, and (b) any recovery run. `NODE_AUTH_TOKEN` is wired via `actions/setup-node`'s `.npmrc` handling. It is never committed and is removed from steady-state use once OIDC covers all packages.
- **Nuance — first publish of a _new_ package.** Trusted publishing needs the package/trusted publisher to exist first. New packages are bootstrapped once with the token (with `--access public`), then switched to OIDC for all subsequent releases — mirroring the migration already begun for `@prodshape/cli`.

### D5 — Changed-package selection & dependency ordering

Changesets publishes only packages whose version is ahead of the registry (i.e. those that received a changeset), and `changeset version` bumps internal dependents automatically. Publishing uses `changeset publish` (topologically ordered) rather than a blind `pnpm -r publish`, so `core` publishes before `cli`/`distribution` that depend on it. `--access public` on each package (via `publishConfig`) guarantees scoped packages are public on first publish.

### D6 — Supply-chain hardening (npm + GitHub best practices)

- **Provenance attestations**: `publishConfig.provenance: true` (or `NPM_CONFIG_PROVENANCE=true`) so every version ships a Sigstore-backed provenance statement linking artifact → repo → commit → workflow. Automatic under OIDC.
- **Trusted publishing (OIDC)**: see D4 — removes the long-lived-token attack surface.
- **Least privilege**: workflow default `permissions: {}`; the publish job grants only `id-token: write` (OIDC), `contents: write` (release PR, tags, changelog commits) and `pull-requests: write` (open/update the release PR). No org-wide or write-all tokens.
- **Immutable releases**: rely on npm's immutability — a published version can never be overwritten; unpublish is disallowed after 72h. Combined with provenance this gives tamper evidence. Rollback is therefore _publish-forward_ (see Migration Plan), never mutate-in-place.
- **Pinned, minimal actions**: third-party actions pinned by full commit SHA; `pnpm install --frozen-lockfile`; build + test + typecheck must pass before the publish step; optional `npm audit signatures` verification post-publish.
- **Package signing**: npm does not offer separate maintainer GPG package signing; **provenance attestations are the recommended integrity mechanism** and are adopted. No additional signing scheme is introduced.

### D7 — Workflow shape (single `release.yml`)

One workflow, triggered on `push: main` and `workflow_dispatch`:

1. checkout (full history for changelog), setup pnpm + Node, `pnpm install --frozen-lockfile`.
2. `pnpm build`, `pnpm typecheck`, `pnpm test` — publish is gated on a green build.
3. `changesets/action`: if changesets are pending → open/update the Version Packages PR; if versions are ahead of npm → run the publish step (`pnpm changeset publish`) with OIDC + provenance, then push git tags.
4. `workflow_dispatch` inputs allow a manual publish and pre-mode enter/exit.

## Risks / Trade-offs

- **OIDC not yet configured for a package when a release runs** → publish fails or silently skips. _Mitigation_: token fallback during bootstrap; a doctor/checklist item verifying each package's trusted-publisher entry before retiring the token.
- **Contributor forgets a changeset** → a real change ships no version bump. _Mitigation_: optional `changeset status`/`--since` check in PR CI that warns (not blocks) when changed packages lack a changeset.
- **Wrong dependency publish order** breaks installs (dependent references an unpublished version). _Mitigation_: `changeset publish` publishes in topological order and only bumps what changed.
- **Accidental `latest` tag for a pre-release** poisons default installs. _Mitigation_: dist-tag derived from the version's prerelease identifier; pre-mode is explicit and reviewed.
- **Leaked or over-scoped fallback token** → unauthorized publish. _Mitigation_: granular, `@prodshape/*`-only, short expiry, single secret, retired once OIDC is universal; provenance makes unauthorized publishes detectable.
- **Bundled CLI vs. library packages diverge** (CLI vendors deps; others declare them). _Mitigation_: keep `changeset publish` as the single publish command for all; verify the CLI's `files`/`bin` and the libraries' `dependencies` in a pre-publish sanity check.
- **GitHub Actions supply-chain (compromised action)** → malicious publish. _Mitigation_: pin actions by SHA, least-privilege permissions, and a protected `npm-publish` environment with required reviewers on the **stable** publish job (OD-1).

## Migration Plan

1. **Introduce Changesets** — add `.changeset/config.json` (independent versioning, `access: public`, base branch `main`), root `version`/`release` scripts, and a `CONTRIBUTING`/`RELEASING` note. No version changes yet.
2. **Add `release.yml`** running in **token mode** first (`NODE_AUTH_TOKEN` from `NPM_TOKEN` secret), verifying build/test gating and the release-PR flow end to end on a low-risk package.
3. **Bootstrap remaining packages** — first publish each new `@prodshape/*` package once (token, `--access public`) so the package name and its trusted-publisher config can be created. This one-time token publish is **required** because npm has no pending-publisher support (OD-4).
4. **Configure Trusted Publishing** on npmjs.com for every package (repo + `release.yml` workflow,
   - the `npm-publish` environment for stable, per OD-1); enable provenance.
5. **Switch `release.yml` to OIDC** (`id-token: write`, drop `NODE_AUTH_TOKEN` from the publish step); keep the token secret only as a documented fallback.
6. **Scope down / retire the manual token** — reduce the granular token to fallback-only, shorten expiry; document that steady-state releases use no long-lived credential.

**Rollback strategy (publish-forward, because npm versions are immutable):**

- _Bad version published_: `npm deprecate @prodshape/pkg@x.y.z "reason"`, move the `latest` dist-tag back to the last good version (`npm dist-tag add @prodshape/pkg@good latest`), then ship a fixed patch via a normal changeset. Unpublish only within the 72h window and only for a genuinely broken/unsafe artifact.
- _Workflow/tooling regression_: revert the `release.yml` / config change; re-run via `workflow_dispatch`; the token fallback remains available for emergency manual recovery from CI (never from a laptop).

## Resolved Decisions

All four questions were resolved with the maintainer on 2026-07-25.

- **OD-1 — RESOLVED: Protected environment for stable only.** The publish job runs inside a GitHub Actions protected environment (`npm-publish`) with required reviewers **for stable (`latest`) releases**; `alpha`/`beta` releases publish without environment approval to keep pre-release iteration fast. The trusted-publisher config therefore binds repo + `release.yml` + the `npm-publish` environment for stable.
- **OD-2 — RESOLVED: Warn, do not block, during v0.x.** A `changeset status` check on PRs that touch package source comments/warns when no changeset is present but does not fail CI. Revisit at 1.0.
- **OD-3 — RESOLVED: `CHANGELOG.md` only for v0.x.** Changesets writes per-package `CHANGELOG.md` and pushes git tags; no GitHub Releases are generated. Revisit at 1.0.
- **OD-4 — RESOLVED (constrained by npm): token bootstrap once, then OIDC.** The preferred "pending trusted publisher, no token" path is **not available on npm** — verified against the [official npm trusted-publishing docs](https://docs.npmjs.com/trusted-publishers/) and current guidance: unlike PyPI, npm has **no pending-publisher concept** and requires a package to already exist before a trusted publisher can be attached to its settings page. Therefore each new `@prodshape/*` package is first-published exactly once with the granular token (public access) to create the package, its trusted publisher is then configured, and every subsequent release uses OIDC + provenance. This matches the path already used for `@prodshape/cli` and still reaches a token-free steady state (see D4 and the Migration Plan). No open questions remain.
