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

Each sets `publishConfig.access: "public"` and `publishConfig.provenance: true`. Only packages that receive a changeset are versioned and published, in dependency order. The `release drift` CI job (`pnpm release-drift:check`) compares every package's shipped source with the tag of its current version and fails when they differ without a changeset naming the package, so a library never silently keeps serving code its published dependents no longer compile against.

`@prodshape/integration-openspec` is the current OpenSpec package. `@prodshape/adapter-openspec` was published by older releases and remains only for those consumers; do not add it to the current package set or new documentation.

## Required repository configuration

**Secrets**

- `NPM_TOKEN` — a **granular** npm access token, write-scoped to `@prodshape/*`, short expiry. Used only as a fallback during bootstrap and recovery; removed from steady-state use once every package has a trusted publisher. Exposed to the workflow as `NODE_AUTH_TOKEN`.
- `GITHUB_TOKEN` — provided automatically by Actions; used to open the Version Packages PR and push tags.

**Repository settings**

- _Settings → Actions → General → Workflow permissions_: enable **"Allow GitHub Actions to create and approve pull requests"**. Without it the release run fails at the "maintain version PR" step with `GitHub Actions is not permitted to create or approve pull requests` — the version branch is still force-pushed, but no Version Packages PR appears.

**Environment**

- `npm-publish` — a protected environment with required reviewers. The stable publish job, prerelease publish job, and all manual prerelease actions run inside it, so entering/exiting a train and publishing alpha/beta packages each require environment approval. Create it under _Settings → Environments_ and add reviewers before using any release path.

**npm configuration (npmjs.com)**

- For each package, add a **Trusted Publisher**: GitHub Actions, repo `juangcarmona/productshape`, workflow `release.yml`, environment `npm-publish` (for the stable job). npm has no pending-publisher concept, so a package must exist before its trusted publisher can be added — see Migration below.

## Normal (stable) release

1. Land feature PRs, each including a `pnpm changeset` describing its bump.
2. On merge to `main`, the workflow opens/updates a **"Version Packages"** PR that applies the bumps and writes `CHANGELOG.md` entries.
3. In the Version Packages PR, update the exact supported CLI version in the primary README, package README and limitations file. The release-contract check must agree with `packages/cli/package.json`; it does not follow an npm dist-tag.
4. Review and merge that PR. The resulting release commit triggers the `publish-stable` job, which (after environment approval) builds, tests, runs the packed release-contract smoke test and then runs `pnpm changeset publish` — publishing only the changed packages to the `latest` dist-tag, with provenance, and pushing git tags.

Merging the Version Packages PR **is** the release decision: never merge it while a release-blocking defect is open, even if CI is green — the PR regenerates automatically as more changesets land, so waiting costs nothing.

## Pre-release (alpha / beta)

Every manual Release workflow run first waits for approval from the protected `npm-publish` environment. No prerelease action pushes directly to protected `main`; state changes always travel through a temporary release branch and a pull request.

1. Enter a train: run the workflow manually (**Actions → Release → Run workflow**) with `task = pre-enter-alpha` (or `pre-enter-beta`), approve the environment deployment, and merge the generated PR containing `.changeset/pre.json`.
2. Continue adding changesets normally. Run the workflow with `task = publish`, approve the environment deployment, and merge the generated version PR. The merged `Version Packages (prerelease)` commit triggers the prerelease publish job, which requests its own `npm-publish` approval before publishing. Package versions become `x.y.z-alpha.N` or `x.y.z-beta.N` and Changesets publishes them under the matching `alpha` or `beta` dist-tag.
3. When ready to stabilize, run the workflow with `task = pre-exit`, approve the environment deployment, merge the generated PR removing `.changeset/pre.json`, and follow the normal stable release flow.

### Recovering a merged but unpublished prerelease

Use the manual Release workflow operation `task = publish-current-prerelease` only when a prerelease version commit is already on `main` but the corresponding npm publication stopped before `changeset publish`. This is the recovery path for a failed publish, not an alternative versioning flow. It requires `.changeset/pre.json` to remain in alpha or beta mode and always reads the exact current `main` commit.

The recovery job lists every publishable `@prodshape/*` workspace package, compares its exact committed version with npm, and writes an explicit plan to the workflow summary. It stops before npm mutation if a stable version is absent, npm is ahead, repository state is inconsistent, or no package is pending. Already-published immutable versions are skipped by `changeset publish`, so rerunning after partial publication is safe. The job runs the build, typecheck, full tests and packed release-contract smoke first, installs the pinned OpenSpec CLI for real conformance coverage, configures Git identity, publishes through the normal `pnpm changeset publish` command, pushes all generated tags, and verifies both npm versions and remote tags.

For the currently recovered `main`, the expected pending candidates are `@prodshape/cli@0.19.0-alpha.3`, `@prodshape/distribution@0.16.0-alpha.0`, `@prodshape/integration-openspec@0.6.0-alpha.3`, and `@prodshape/integration-speckit@0.4.0-alpha.0`; the other publishable workspace packages are already stable releases and must already exist on npm. Do not use this operation for unversioned changesets, stable releases, or a repository whose npm versions are newer than its committed manifests.

Prerelease dist-tags are non-default: `npm install @prodshape/<pkg>` continues to resolve `latest`, while consumers opt in with `npm install @prodshape/<pkg>@alpha` or `@beta`. Stable releases use the `latest` dist-tag.

If npm publication succeeds but tag synchronization fails, the job reports this as a repository-sync failure. Re-run the workflow after push access is restored; Changesets treats already-published npm versions as immutable and skips republishing them while the missing tags are synchronized.

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
5. Only then submit or update the Spec Kit community listing (below). It is discovery, not distribution, and its form requires a download URL that already resolves.

The workflow refuses a tag whose version does not match `extension.yml`, and the test suite keeps any catalog entry consistent with the manifest identity and its own pinned URL. `extensions/catalog.json` deliberately lags the manifest between a version bump and its release: the entry pins an archive sha256, which exists only once the release workflow has built the archive, so a version in development is never served.

### Community catalog listing (discovery)

Spec Kit's community catalog (`extensions/catalog.community.json` in [github/spec-kit](https://github.com/github/spec-kit)) is discovery-only: it makes `specify extension search` find the extension but is never an install source. Installs come from ProductShape's own catalog, which is the one that pins each release asset and its sha256.

**Submission is an issue, not a pull request.** Spec Kit's publishing guide states it explicitly: do not open a PR against `extensions/catalog.community.json`. File the [Extension Submission](https://github.com/github/spec-kit/issues/new?template=extension_submission.yml) issue form instead. A maintainer applies the `extension-submission` label during triage, which starts the automated catalog validation; the automation (`.github/skills/add-community-extension`) validates the release, writes the catalog entry and the community table row in alphabetical order, and opens the catalog pull request. Contributors cannot apply that label themselves, so there is nothing to label or re-request — the issue waits in triage. Typical review is 3-7 business days. An update to an existing listing goes through the same form, saying in the issue that it updates an existing entry.

Submit **after** the release exists: the form requires a download URL, and the automation checks that the release is reachable. The proposed catalog entry below is what the issue's "Proposed Catalog Entry" field takes; the maintainers write the final entry themselves and add `verified`, `downloads`, `stars`, `created_at` and `updated_at`.

The download URL pins the release tag rather than using the `releases/latest/download` alias. A catalog entry names one version, so an entry whose `version` says 0.2.0 and whose URL follows `latest` would start serving a different artifact than it names at the next release.

```json
"pdac": {
  "name": "Product Definition as Code (PDaC)",
  "id": "pdac",
  "description": "Ground Spec Kit features in an accepted product definition: fetch a cited context projection before specifying, then verify citations after specify, plan and tasks. Never writes the product model.",
  "author": "Juan G. Carmona (@juangcarmona)",
  "version": "0.2.0",
  "download_url": "https://github.com/juangcarmona/productshape/releases/download/speckit-pdac-v0.2.0/speckit-pdac.zip",
  "repository": "https://github.com/juangcarmona/productshape",
  "homepage": "https://pdac.dev",
  "documentation": "https://github.com/juangcarmona/productshape/blob/main/extensions/speckit-pdac/README.md",
  "changelog": "https://github.com/juangcarmona/productshape/blob/main/extensions/speckit-pdac/CHANGELOG.md",
  "license": "Apache-2.0",
  "category": "process",
  "effect": "read-write",
  "requires": {
    "speckit_version": ">=0.7.2",
    "tools": [
      {
        "name": "prodshape",
        "version": ">=0.16.0",
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

Every field above is derived from `extensions/speckit-pdac/extension.yml` and must stay identical to it. `speckit_version` is `>=0.7.2` because that is the lowest Spec Kit the extension has been installed and registered on; `prodshape` is `>=0.16.0` because `citations verify --provider speckit --format json` and the `pdac-scope` exemption carrier that `speckit.pdac.verify` depends on do not work on 0.14.0, and 0.15.0 was never published.
