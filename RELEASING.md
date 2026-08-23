# Releasing

The `@prodshape/*` packages are published to npm **only from GitHub Actions** ([`.github/workflows/release.yml`](.github/workflows/release.yml)), never from a developer machine. Versioning is driven by [Changesets](https://github.com/changesets/changesets); publishing prefers npm **Trusted Publishing (OIDC)** and falls back to a scoped token while trusted publishers are being configured.

## Published packages

| Package                           | Notes                                                        |
| --------------------------------- | ------------------------------------------------------------ |
| `@prodshape/core`                 | library                                                      |
| `@prodshape/cli`                  | self-contained executable (bundles the others at build time) |
| `@prodshape/distribution`         | library                                                      |
| `@prodshape/integration-openspec` | library                                                      |
| `@prodshape/integration-speckit`  | library                                                      |
| `@prodshape/integration-claude`   | library                                                      |
| `@prodshape/integration-copilot`  | library                                                      |
| `@prodshape/integration-codex`    | library                                                      |

Each sets `publishConfig.access: "public"` and `publishConfig.provenance: true`. Only packages that receive a changeset are versioned and published, in dependency order.

`@prodshape/integration-openspec` is the current OpenSpec package. `@prodshape/adapter-openspec` was published by older releases and remains only for those consumers; do not add it to the current package set or new documentation.

## Required repository configuration

**Secrets**

- `NPM_TOKEN` — a **granular** npm access token, write-scoped to `@prodshape/*`, short expiry. Used only as a fallback during bootstrap and recovery; removed from steady-state use once every package has a trusted publisher. Exposed to the workflow as `NODE_AUTH_TOKEN`.
- `GITHUB_TOKEN` — provided automatically by Actions; used to open the Version Packages PR and push tags.

**Repository settings**

- _Settings → Actions → General → Workflow permissions_: enable **"Allow GitHub Actions to create and approve pull requests"**. Without it the release run fails at the "maintain version PR" step with `GitHub Actions is not permitted to create or approve pull requests` — the version branch is still force-pushed, but no Version Packages PR appears.

**Environment**

- `npm-publish` — a protected environment with required reviewers. The **stable** publish job runs inside it; alpha/beta trains and manual dispatch deliberately do not, so maintainer-driven prereleases are not gated on a review each time. Create it under _Settings → Environments_ and add reviewers before the first stable release.

**npm configuration (npmjs.com)**

- For each package, add a **Trusted Publisher**: GitHub Actions, repo `juangcarmona/productshape`, workflow `release.yml`, environment `npm-publish` (for the stable job). npm has no pending-publisher concept, so a package must exist before its trusted publisher can be added — see Migration below.

## Normal (stable) release

1. Land feature PRs, each including a `pnpm changeset` describing its bump.
2. On merge to `main`, the workflow opens/updates a **"Version Packages"** PR that applies the bumps and writes `CHANGELOG.md` entries.
3. In the Version Packages PR, update the exact supported CLI version in the primary README, package README and limitations file. The release-contract check must agree with `packages/cli/package.json`; it does not follow an npm dist-tag.
4. Review and merge that PR. The resulting release commit triggers the `publish-stable` job, which (after environment approval) builds, tests, runs the packed release-contract smoke test and then runs `pnpm changeset publish` — publishing only the changed packages to the `latest` dist-tag, with provenance, and pushing git tags.

Merging the Version Packages PR **is** the release decision: never merge it while a release-blocking defect is open, even if CI is green — the PR regenerates automatically as more changesets land, so waiting costs nothing.

## Pre-release (alpha / beta)

1. Enter a train: run the workflow manually (**Actions → Release → Run workflow**) with `task = pre-enter-alpha` (or `pre-enter-beta`). This commits `.changeset/pre.json` to `main`.
2. Continue adding changesets normally. Run the workflow with `task = publish` to cut prereleases; versions become `x.y.z-alpha.N` and are published under the `alpha` (or `beta`) dist-tag, so a default `npm install` never resolves a prerelease.
3. When ready to stabilize, run the workflow with `task = pre-exit`, then follow the normal stable release flow.

## Rollback (publish-forward — npm versions are immutable)

A published version can never be overwritten, and unpublish is disallowed after 72h. To recover:

```bash
# 1. Stop the bad version from being installed by default
npm dist-tag add @prodshape/<pkg>@<last-good-version> latest
# 2. Discourage its use
npm deprecate @prodshape/<pkg>@<bad-version> "Broken release — use <last-good-version> or later"
# 3. Ship a corrected version through a normal changeset + release
```

Only `npm unpublish` within the 72h window, and only for a genuinely broken or unsafe artifact. For a workflow/tooling regression, revert the offending config change and re-run via `workflow_dispatch`; the `NPM_TOKEN` fallback remains available for emergency recovery **from CI** (never from a laptop).

## Package-name compatibility

- `@prodshape/integration-openspec` is the supported library name and the one bundled by the CLI.
- `@prodshape/adapter-openspec` is a legacy published package from the earlier delivery-pipeline design. Existing consumers may remain pinned to it, but it receives no current features and must not appear as the current package in quickstarts or package tables.
- `prodshape` is the canonical binary. `product-definition` remains byte-identical through v0.x and is removed before v1; release smoke tests exercise both names.

## Releasing the pdac Spec Kit extension

The extension under `extensions/speckit-pdac/` releases independently of the npm packages, through tags:

1. Bump `version` in `extensions/speckit-pdac/extension.yml` in a normal PR and merge it.
2. Tag the merge commit and push the tag: `git tag speckit-pdac-v<version> && git push origin speckit-pdac-v<version>`.
3. The `speckit-pdac release` workflow builds `speckit-pdac.zip` with `git archive`, creates the GitHub release with the asset, and opens an automated PR that updates `extensions/catalog.json` with the new version, the pinned asset URL and the archive's sha256.
4. Merge that catalog PR. From that moment `specify extension add pdac` and `specify extension update pdac` serve the new version to everyone who added the catalog.

The workflow refuses a tag whose version does not match `extension.yml`, and the test suite keeps any catalog entry consistent with the manifest identity and its own pinned URL.

### Community catalog listing (discovery)

Spec Kit's community catalog (`extensions/catalog.community.json` in [github/spec-kit](https://github.com/github/spec-kit)) is discovery-only: it makes `specify extension search` find the extension but is never an install source. The listing is a one-time manual PR; using the `releases/latest/download` alias keeps its URL valid across our releases. Ready-to-submit entry:

```json
"pdac": {
  "name": "Product Definition as Code (PDaC)",
  "id": "pdac",
  "description": "Ground Spec Kit features in an accepted product definition kept as versioned Markdown: fetch a cited context projection before specifying, and verify citations by id and content digest after specify, plan and tasks. Deterministic and read-only over the product model.",
  "author": "Juan G. Carmona (@juangcarmona)",
  "version": "0.1.0",
  "download_url": "https://github.com/juangcarmona/productshape/releases/latest/download/speckit-pdac.zip",
  "repository": "https://github.com/juangcarmona/productshape",
  "homepage": "https://pdac.dev",
  "documentation": "https://github.com/juangcarmona/productshape/blob/main/extensions/speckit-pdac/README.md",
  "license": "Apache-2.0",
  "category": "process",
  "effect": "read-write",
  "requires": {
    "speckit_version": ">=0.2.0",
    "tools": [
      {
        "name": "prodshape",
        "version": ">=0.14.0",
        "required": true
      }
    ]
  },
  "provides": {
    "commands": 2,
    "hooks": 3
  },
  "tags": ["product", "citations", "pdac", "traceability", "governance"]
}
```
