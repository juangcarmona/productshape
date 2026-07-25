# Releasing

The `@prodshape/*` packages are published to npm **only from GitHub Actions**
([`.github/workflows/release.yml`](.github/workflows/release.yml)), never from a developer machine.
Versioning is driven by [Changesets](https://github.com/changesets/changesets); publishing prefers
npm **Trusted Publishing (OIDC)** and falls back to a scoped token while trusted publishers are
being configured.

## Published packages

| Package                          | Notes                                                        |
| -------------------------------- | ------------------------------------------------------------ |
| `@prodshape/core`                | library                                                      |
| `@prodshape/cli`                 | self-contained executable (bundles the others at build time) |
| `@prodshape/distribution`        | library                                                      |
| `@prodshape/adapter-openspec`    | library                                                      |
| `@prodshape/integration-claude`  | library                                                      |
| `@prodshape/integration-copilot` | library                                                      |

Each sets `publishConfig.access: "public"` and `publishConfig.provenance: true`. Only packages
that receive a changeset are versioned and published, in dependency order.

## Required repository configuration

**Secrets**

- `NPM_TOKEN` — a **granular** npm access token, write-scoped to `@prodshape/*`, short expiry.
  Used only as a fallback during bootstrap and recovery; removed from steady-state use once every
  package has a trusted publisher. Exposed to the workflow as `NODE_AUTH_TOKEN`.
- `GITHUB_TOKEN` — provided automatically by Actions; used to open the Version Packages PR and
  push tags.

**Environment**

- `npm-publish` — a protected environment with required reviewers. The **stable** publish job runs
  inside it; alpha/beta and manual dispatch do not (OD-1). Create it under
  _Settings → Environments_ and add reviewers before the first stable release.

**npm configuration (npmjs.com)**

- For each package, add a **Trusted Publisher**: GitHub Actions, repo `juangcarmona/productshape`,
  workflow `release.yml`, environment `npm-publish` (for the stable job). npm has no
  pending-publisher concept, so a package must exist before its trusted publisher can be added —
  see Migration below.

## Normal (stable) release

1. Land feature PRs, each including a `pnpm changeset` describing its bump.
2. On merge to `main`, the workflow opens/updates a **"Version Packages"** PR that applies the
   bumps and writes `CHANGELOG.md` entries.
3. Review and merge that PR. The resulting release commit triggers the `publish-stable` job, which
   (after environment approval) builds, tests and runs `pnpm changeset publish` — publishing only
   the changed packages to the `latest` dist-tag, with provenance, and pushing git tags.

## Pre-release (alpha / beta)

1. Enter a train: run the workflow manually (**Actions → Release → Run workflow**) with
   `task = pre-enter-alpha` (or `pre-enter-beta`). This commits `.changeset/pre.json` to `main`.
2. Continue adding changesets normally. Run the workflow with `task = publish` to cut prereleases;
   versions become `x.y.z-alpha.N` and are published under the `alpha` (or `beta`) dist-tag, so a
   default `npm install` never resolves a prerelease.
3. When ready to stabilize, run the workflow with `task = pre-exit`, then follow the normal stable
   release flow.

## Rollback (publish-forward — npm versions are immutable)

A published version can never be overwritten, and unpublish is disallowed after 72h. To recover:

```bash
# 1. Stop the bad version from being installed by default
npm dist-tag add @prodshape/<pkg>@<last-good-version> latest
# 2. Discourage its use
npm deprecate @prodshape/<pkg>@<bad-version> "Broken release — use <last-good-version> or later"
# 3. Ship a corrected version through a normal changeset + release
```

Only `npm unpublish` within the 72h window, and only for a genuinely broken or unsafe artifact.
For a workflow/tooling regression, revert the offending config change and re-run via
`workflow_dispatch`; the `NPM_TOKEN` fallback remains available for emergency recovery **from CI**
(never from a laptop).

## Migration from manual publishing

1. **Changesets in place** — `.changeset/config.json`, root `version`/`release` scripts and the
   `@changesets/cli` dev dependency (done in this change).
2. **Release workflow in token mode** — with `NPM_TOKEN` set, validate the release-PR → publish
   flow on a low-risk package.
3. **Bootstrap each new package once** — because npm has no pending-publisher support, first-publish
   every not-yet-published `@prodshape/*` package a single time (token, public access) so its name
   and trusted-publisher configuration can be created. `@prodshape/cli` is already published.
4. **Configure Trusted Publishing** for every package on npmjs.com (repo + `release.yml` +
   `npm-publish` environment) and confirm provenance appears on the next publish.
5. **Switch to OIDC** — with trusted publishers configured, publishes use OIDC automatically; the
   `NODE_AUTH_TOKEN` fallback is ignored.
6. **Retire the token** — scope the granular `NPM_TOKEN` down to fallback-only and shorten its
   expiry once OIDC covers all packages.
