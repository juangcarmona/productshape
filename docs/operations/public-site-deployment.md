# ProductShape public-site deployment

Cloudflare Pages owns the public site's Git build and deployment. GitHub Actions does not build, upload, or deploy the public site. The separate GitHub Pages workflow is only for the engineering portal.

The repository-level Pages configuration in `wrangler.jsonc` names the project `productshape` and sets `dist/public-site` as the output directory. Configure the existing Cloudflare Pages Git integration to use the repository root, `pnpm run build:public-site`, and that output directory, with `main` as the production branch. Cloudflare preview deployments provide pull-request previews. Do not add a GitHub deployment workflow or Cloudflare credential to this repository.

When diagnosing a failed Cloudflare build, inspect the complete build log, including the build command after dependency installation. A log excerpt that ends during dependency installation does not identify the failing command or cause. The checked-in `wrangler.jsonc` describes the project/output; it does not prove the live Cloudflare settings.

## Build and review locally

Public generation and validation use Node 22 or newer and the workspace dependencies for the Astro shell; no generated Product Snapshot or architecture input is needed:

```bash
pnpm install --frozen-lockfile
pnpm run build:public-site
node src/scripts/validate-public-site.mjs --dir dist/public-site --profile public --base-path / --site-origin https://productshape.dev
node src/scripts/check-public-site-browser.mjs --dir dist/public-site --profile public --base-path / --evidence-dir dist/public-site-browser
python3 -m http.server 4173 --directory dist/public-site
```

Open `http://localhost:4173/`, `/en/`, `/es/`, a product/adoption deep link and `404.html`; inspect light/dark/system appearance and mobile navigation. Python's server is a file preview, not proof of Cloudflare routing. To test Pages routing locally without an account or upload:

The browser check above is the repeatable runtime evidence path. It also captures desktop screenshots for the public home and Archify routes and compares the representative Astro shell HTML against a freshly built legacy compatibility baseline. The engineering workflow runs the check against its `/productshape/` base path and uploads a separate evidence artifact. Both checks require Chromium; a local environment without it must record the limitation rather than claim visual verification.

```bash
npx wrangler@4.151.2 pages dev dist/public-site --port 8788
```

Open `http://localhost:8788/en/product/`; unknown paths including `/en/engineering/` and `/en/model/explorer.html` must return HTTP 404 and the custom not-found page. A top-level `404.html` is required: without it Cloudflare Pages treats the site as an SPA and may serve the home page for unknown routes. See [serving pages](https://developers.cloudflare.com/pages/configuration/serving-pages/).

`publication.json` records schema version, profile, base path, origin, generating CLI version, full source revision and dirty state. In GitHub Actions the builder uses `GITHUB_SHA`; elsewhere it reads the checked-out Git revision. A local dirty checkout is labelled dirty; an unversioned copy has a null source revision and is dirty. Review output with those limits in mind. Use the Cloudflare preview for the exact reviewed commit. Metadata has no build timestamp so identical inputs/source state remain reproducible.

## Cloudflare previews and production

Cloudflare Pages builds pull requests as preview deployments and deploys `main` to production through its Git integration. Review the actual Cloudflare preview and build logs there. The source build in this repository is not evidence of a hosted preview or production deployment. Keep custom-domain and DNS changes within Cloudflare and outside repository automation.

## Engineering portal

`.github/workflows/snapshot.yml` remains the serialized GitHub Pages publisher. It builds the CLI, generates the self-model Product Snapshot, assembles only engineering outputs and deploys to the repository's Pages site. A successful portal publication does not deploy the public domain.

The workflow writes `.product/generated/engineering/manifest.json` for the build. Schema version 2 records the source revision for the generated Product Snapshot and the Architecture Snapshot assembled from this repository's `docs/architecture/` sources. Both revisions identify the checkout used by the workflow.

### Optional E2E reports

A future E2E pipeline may add reports to `.product/generated/engineering/manifest.json` using this shape:

```json
{
  "schemaVersion": 2,
  "productSnapshot": { "sourceRevision": "full source commit SHA" },
  "architectureSnapshot": { "sourceRevision": "full source commit SHA" },
  "e2eReports": [
    {
      "title": "Adoption journey",
      "path": "e2e/adoption-journey.html",
      "sourceRevision": "full source commit SHA",
      "runId": "workflow run identity",
      "result": "passed"
    }
  ]
}
```

Keep the two snapshot source revisions in the manifest. Place each E2E report at the path named by its entry, relative to the manifest directory. Allowed results are `passed`, `failed`, `cancelled` and `unknown`. The builder copies only listed files and displays the recorded source revision, run identity and result. When no manifest is present, it uses the current checkout revision for the snapshots and omits E2E report cards. A pipeline must not publish reports containing secrets or non-public test data.

## Rollback

Revert the public-site source change and let the Cloudflare Git integration build and deploy the reverted commit. Use Cloudflare's deployment history for a prior known-good version when needed. Keep domain binding and DNS unchanged during a content rollback.

Cloudflare references above were checked on 2026-10-19. Project/account state is intentionally not claimed here.
