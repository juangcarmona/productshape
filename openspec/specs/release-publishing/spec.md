# release-publishing Specification

## Purpose

The npm release pipeline for the `@prodshape/*` packages: CI-only publishing, Changesets-driven
versioning, GitHub-managed credentials, and the alpha/beta/stable release tracks.

## Requirements

### Requirement: Publishing runs only in GitHub Actions

The workspace's public npm packages SHALL be published exclusively from a GitHub Actions workflow.
No release step SHALL depend on a developer's local machine or local credentials, and the
documented release process SHALL contain no manual `npm publish` from a workstation for
steady-state releases.

#### Scenario: Release from CI

- **WHEN** a release is initiated through the sanctioned trigger
- **THEN** the GitHub Actions release workflow performs the build, version resolution and publish,
  and the packages appear on npm without any local publish command

#### Scenario: No local publish path in steady state

- **WHEN** the release process documentation is followed
- **THEN** every publish action occurs inside GitHub Actions, and local publishing is described
  only as an emergency fallback executed against CI-managed credentials, never as routine

### Requirement: Authentication uses GitHub-managed credentials with no committed secrets

Publish authentication SHALL use GitHub-managed credentials — OIDC Trusted Publishing as the
primary mechanism and a GitHub Secret (`NPM_TOKEN` exposed as `NODE_AUTH_TOKEN`) as fallback. No
npm token, `.npmrc` auth line, or other secret SHALL be committed to the repository.

#### Scenario: OIDC publish without a stored token

- **WHEN** a package with a configured trusted publisher is released
- **THEN** the workflow authenticates via the GitHub OIDC `id-token` and publishes without a
  long-lived npm token present in the job

#### Scenario: No secret in the repository

- **WHEN** the repository tree is scanned for credentials
- **THEN** no npm auth token or registry credential is found in tracked files, and any token used
  originates from GitHub Secrets injected at runtime

### Requirement: Scoped packages are published public, correctly on first publish

Every `@prodshape/*` package SHALL be published with public access. The configuration SHALL make
the first publish of a new scoped package public without a manual flag, and subsequent releases
SHALL require no manual access intervention.

#### Scenario: First publish of a new scoped package

- **WHEN** a not-yet-published `@prodshape/*` package is released for the first time
- **THEN** it is published with public access derived from its `publishConfig`, without a manually
  typed `--access public` at release time

#### Scenario: Subsequent release needs no manual step

- **WHEN** an already-published package is released again
- **THEN** it publishes with public access automatically and no operator intervention

### Requirement: Only changed packages are published

A release SHALL publish only the packages whose version is ahead of the npm registry as a result
of a declared version bump. Packages without a pending change SHALL NOT be republished, and
internal dependents SHALL be version-bumped and published in dependency order.

#### Scenario: Unchanged package is skipped

- **WHEN** a release runs and only one package received a version bump
- **THEN** only that package (and any dependents whose version was consequently bumped) is
  published, and unchanged packages are left at their existing registry versions

#### Scenario: Dependency-ordered publish

- **WHEN** a package and a package that depends on it are both released
- **THEN** the depended-upon package publishes before its dependent, so no published version
  references an unpublished dependency

### Requirement: Releases support alpha, beta and stable tracks

The pipeline SHALL support alpha, beta and stable release tracks. Pre-release versions SHALL be
published under a non-default dist-tag (`alpha` / `beta`) so that a default install never resolves
to a pre-release, and stable versions SHALL be published under the `latest` dist-tag.

#### Scenario: Alpha release under a pre-release tag

- **WHEN** the repository is in alpha pre-release mode and a release runs
- **THEN** the published version carries an `-alpha.N` identifier and is tagged `alpha`, and
  `npm install <pkg>` (no tag) still resolves the current stable version

#### Scenario: Stable release under latest

- **WHEN** a stable release runs outside pre-release mode
- **THEN** the published version has no pre-release identifier and is tagged `latest`

### Requirement: The release trigger is a reviewed version change with a manual fallback

The primary release trigger SHALL be the merge of a version/changelog change (a Changesets
"Version Packages" release PR) into the main branch. A manual `workflow_dispatch` trigger SHALL
exist as a controlled fallback for bootstrap and recovery.

#### Scenario: Publish on merged version PR

- **WHEN** the release PR that applies version bumps and changelogs is merged to the main branch
- **THEN** the workflow detects versions ahead of npm and publishes the affected packages

#### Scenario: Manual dispatch fallback

- **WHEN** an operator triggers the workflow manually with the documented inputs
- **THEN** the workflow can publish or manage pre-release mode without waiting for a release PR

### Requirement: Every published version carries provenance

Every published package version SHALL include an npm provenance attestation linking the artifact
to the source repository, commit and workflow run.

#### Scenario: Provenance attached

- **WHEN** a package version is published by the workflow
- **THEN** the npm registry records a provenance attestation for that version, verifiable via npm's
  provenance/signature verification

### Requirement: The publish job uses least-privilege permissions

The release workflow SHALL declare least-privilege permissions, granting the publish job only the
scopes it needs (`id-token: write` for OIDC, `contents: write` for tags/changelog, and
`pull-requests: write` for the release PR) and defaulting all other permissions to none.

#### Scenario: Minimal token scopes

- **WHEN** the release workflow definition is inspected
- **THEN** it sets an explicit minimal `permissions` block and grants no broader write access than
  publishing, tagging and release-PR management require

### Requirement: Releases are immutable with a publish-forward rollback

Published versions SHALL be treated as immutable; recovery from a bad release SHALL be achieved by
deprecating and/or re-pointing dist-tags and publishing a corrected version, not by overwriting an
existing version.

#### Scenario: Recover from a bad publish

- **WHEN** a broken version has been published
- **THEN** the documented rollback deprecates it and/or moves the `latest` dist-tag to the last
  good version and ships a corrected version, without mutating the published artifact
