# Tasks — automate-npm-publishing

> Tasks marked ⚙️ are **operational** steps that must be performed against the npm registry,
> npmjs.com, or GitHub repository settings. They cannot be completed from the repository and are
> left unchecked as a handoff checklist. See [RELEASING.md](../../../../RELEASING.md).

## 1. Versioning foundation (Changesets)

- [x] 1.1 Add `@changesets/cli` as a root dev dependency and `.changeset/config.json`
      (independent versioning, `access: "public"`, base branch `main`, updateInternalDependencies)
- [x] 1.2 Add root `version` (`changeset version`) and `release` (`changeset publish`) scripts
- [x] 1.3 Ensure every publishable package sets `publishConfig.access: "public"` and
      `publishConfig.provenance: true`; verify `files`/`bin` are correct per package
- [x] 1.4 Add a `RELEASING.md` runbook and a CONTRIBUTING note on writing changesets

## 2. Release workflow (token mode first)

- [x] 2.1 Add `.github/workflows/release.yml` (`push: main` + `workflow_dispatch`) with an explicit
      least-privilege `permissions` block
- [x] 2.2 Job steps: checkout (full history), pnpm + Node setup, `pnpm install --frozen-lockfile`,
      `pnpm build`, `pnpm typecheck`, `pnpm test` as a publish gate
- [x] 2.3 Integrate `changesets/action` (pin by SHA): open/update the "Version Packages" PR, and
      publish via `pnpm changeset publish` when versions are ahead of npm
- [ ] 2.4 ⚙️ Run initially in token mode (`NODE_AUTH_TOKEN` from the `NPM_TOKEN` secret) and validate
      the release-PR → publish flow end to end on a low-risk package

## 3. Pre-release tracks (alpha / beta / stable)

- [x] 3.1 Document and script pre-release enter/exit (`changeset pre enter|exit alpha|beta`)
- [x] 3.2 Ensure dist-tag is derived from the version's prerelease identifier
      (`alpha`/`beta` for pre-releases, `latest` for stable)
- [x] 3.3 `workflow_dispatch` inputs to trigger a manual publish and to manage pre-release mode

## 4. Migrate to Trusted Publishing (OIDC) + provenance

- [ ] 4.1 ⚙️ Bootstrap first publish of each new `@prodshape/*` package once (token, public access) so
      its name and trusted-publisher config can be created (required — npm has no pending publisher)
- [ ] 4.2 ⚙️ Configure an npm trusted publisher per package on npmjs.com (repo + `release.yml`
      workflow, + the `npm-publish` environment for stable per OD-1)
- [ ] 4.3 ⚙️ Switch the publish job to OIDC (`id-token: write`, drop `NODE_AUTH_TOKEN`) and confirm
      provenance is emitted for every published version
- [ ] 4.4 ⚙️ Scope down / shorten expiry on the granular `NPM_TOKEN`, retaining it as documented
      fallback only

## 5. Supply-chain hardening

- [x] 5.1 Pin all third-party actions by full commit SHA; keep `--frozen-lockfile`
- [ ] 5.2 ⚙️ (OD-1) Create the protected `npm-publish` environment with required reviewers in repo
      settings — the workflow already gates the **stable** publish job on it and leaves alpha/beta
      ungated
- [x] 5.3 (OD-2) Add a PR `changeset status` check that **warns** (does not block) when changed
      packages lack a changeset
- [x] 5.4 Add a post-publish `npm audit signatures` / provenance verification step

## 6. Documentation and verification

- [x] 6.1 Finalize `RELEASING.md`: required secrets, npm configuration, release process, alpha/
      beta/stable flow, rollback (publish-forward), migration steps
- [ ] 6.2 ⚙️ Dry-run the full pipeline for a patch release of one package and confirm: only changed
      packages publish, correct dist-tag, provenance present, no committed secrets
- [x] 6.3 Confirm no product-model, methodology, or PDaC artifacts changed; CI and conformance
      remain green
