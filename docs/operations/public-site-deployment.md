# ProductShape public-site publication

The public site at `productshape.dev` and GitHub Pages engineering portal have separate outputs and publication controls. GitHub Actions builds and validates the public directory, then retains a seven-day artifact. It has no Cloudflare credential and does not upload, publish or configure DNS. Preparation of an artifact is not production publication.

## Build and review locally

Public generation and validation use Node 22 or newer and the workspace dependencies for the Astro shell; no generated Product Snapshot or architecture input is needed:

```bash
pnpm install --frozen-lockfile
node src/scripts/build-public-site.mjs --profile public --out dist/public-site --base-path / --site-origin https://productshape.dev
node src/scripts/validate-public-site.mjs --dir dist/public-site --profile public --base-path / --site-origin https://productshape.dev
node src/scripts/check-public-site-browser.mjs --dir dist/public-site --profile public --base-path / --evidence-dir dist/public-site-browser
python3 -m http.server 4173 --directory dist/public-site
```

Open `http://localhost:4173/`, `/en/`, `/es/`, a product/adoption deep link and `404.html`; inspect light/dark/system appearance and mobile navigation. Python's server is a file preview, not proof of Cloudflare routing. To test Pages routing locally without an account or upload:

The browser check above is the repeatable runtime evidence path. It also captures desktop screenshots for the public home and Archify routes and compares the representative Astro shell HTML against a freshly built legacy compatibility baseline. The engineering workflow runs the same check against its `/productshape/` base path and uploads a separate evidence artifact. Both checks require the Chromium runtime installed by the workspace dependency; a local environment without it must record the limitation rather than claim visual verification.

```bash
npx wrangler@4.151.2 pages dev dist/public-site --port 8788
```

Open `http://localhost:8788/en/product/`; unknown paths including `/en/engineering/` and `/en/model/explorer.html` must return HTTP 404 and the custom not-found page. A top-level `404.html` is required: without it Cloudflare Pages treats the site as an SPA and may serve the home page for unknown routes. See [serving pages](https://developers.cloudflare.com/pages/configuration/serving-pages/).

`publication.json` records schema version, profile, base path, origin, generating CLI version, full source revision and dirty state. CI records `GITHUB_SHA`, including a PR merge revision when that is the checked-out source. A local dirty checkout is labelled dirty; an unversioned copy has a null source revision and is dirty. Review output with those limits in mind. For a release candidate, use a retained clean CI artifact or rebuild a clean reviewed commit. Metadata has no build timestamp so identical inputs/source state remain reproducible.

## Download the exact reviewed artifact

Find the successful **Public site** workflow run for the intended source in GitHub Actions. It retains `productshape-public-site-<workflow source SHA>` for seven days; the artifact's SHA may be the PR merge revision rather than its branch head. Use its exact displayed name and run ID:

```bash
gh run download RUN_ID --repo juangcarmona/productshape --name ARTIFACT_NAME --dir dist/public-site
node src/scripts/validate-public-site.mjs --dir dist/public-site --profile public --base-path / --site-origin https://productshape.dev
```

Download into an empty directory so older files cannot contaminate the artifact. GitHub's downloaded artifact ZIP has the upload directory's **contents at the archive root**:

```text
index.html
404.html
publication.json
robots.txt
sitemap.xml
assets/
en/
es/
```

Do not wrap these in `dist/` or `public-site/` when creating a dashboard ZIP. The same `dist/public-site` directory is Wrangler's folder input. Keep the reviewed artifact, its `publication.json` and successful run URL before retention expires. Do not rebuild an old artifact from a newer checkout and call it the reviewed build.

## Choose the existing Cloudflare project mode

Before any owner-authorized upload, sign into the intended account and inspect Workers & Pages. `wrangler.jsonc` provides the repository default project name `productshape` and output directory `dist/public-site`; it does not prove a project or account exists. Confirm project name, current mode and configured production branch. No credentials belong in this repository or its workflows.

Cloudflare [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/) supports prebuilt folders or ZIPs in the dashboard, and folders through Wrangler. A Direct Upload project cannot later switch to Git integration in the same project. An existing Git-integrated project can receive manual Wrangler deployments, but cannot use dashboard drag-and-drop. Retain its current mode unless the owner explicitly decides otherwise; do not recreate an existing project to follow these instructions.

For a new project, the owner chooses the mode deliberately. Creating a Direct Upload project can be done in the dashboard or, after account authentication, with `npx wrangler@4.151.2 pages project create productshape --production-branch main`. This is an owner operation, not a command run by the build or this implementation.

## Future owner-authorized preview and production upload

These steps require a separate publication instruction from the owner. No hosted preview is implied by a GitHub artifact.

For a **Direct Upload dashboard project**, use its upload/create-deployment action and supply the validated folder or correctly rooted ZIP. Choose the intended preview/production environment offered by that project; use Wrangler below when an explicit preview branch is needed. Verify the resulting deployment URL, source metadata and routes before promoting or uploading to production.

For a **Wrangler upload**, use the validated directory, the confirmed project name and a preview branch distinct from its production branch. Wrangler accepts a folder, not a ZIP. With a clean source-identified artifact, first read and validate its recorded revision:

```bash
PUBLIC_SOURCE_REVISION=$(node --input-type=module -e "import { readFileSync } from 'node:fs'; const m=JSON.parse(readFileSync('dist/public-site/publication.json','utf8')); if(m.dirty || !/^[a-f0-9]{40}$/.test(m.sourceRevision || '')) throw new Error('Use a clean reviewed artifact'); console.log(m.sourceRevision)") &&
npx wrangler@4.151.2 pages deploy dist/public-site --project-name productshape --branch review-300 --commit-hash "$PUBLIC_SOURCE_REVISION" --commit-dirty=false
```

The assignment must succeed before running the upload. Confirm `review-300` is not the configured production branch. See the official [Pages command reference](https://developers.cloudflare.com/workers/wrangler/commands/pages/). Authenticate using the owner's normal Cloudflare flow; do not issue credentials as part of preparing this repository.

Inspect the returned hosted preview: root, English/Spanish navigation, product and adoption deep links, assets, unknown routes returning HTTP 404, appearance/mobile controls, publication metadata, canonical URLs and links to available engineering outputs. Preview canonicals intentionally name `https://productshape.dev`, the future production origin; preview publication does not activate that domain.

After explicit owner approval, deploy the same reviewed folder with the confirmed production branch, for example `--branch main` when `main` is the project's production branch. Retain the deployment URL/ID, artifact source revision and verification result. This production command is deliberately not part of any GitHub workflow.

## Future productshape.dev activation

Custom-domain activation is a separate owner action after the Pages production deployment is verified. In the intended project, choose **Custom domains → Set up a domain** and associate `productshape.dev`. For this apex domain, the zone must belong to the same Cloudflare account and use Cloudflare nameservers. Follow the dashboard's zone/nameserver instructions if those prerequisites are not met; verify the current registrar/zone state rather than assuming it.

Associate the domain with Pages before manually creating a CNAME: a CNAME alone does not create the Pages association and can cause HTTP 522. Follow the documented [custom-domain process](https://developers.cloudflare.com/pages/configuration/custom-domains/). No DNS or registrar change is performed by repository scripts.

After the owner completes activation, verify DNS resolution, HTTPS/TLS, canonical origin, root/deep links, Spanish routes, the custom 404, theme/mobile controls and the GitHub Pages engineering links. Until then, report domain/hosted checks as pending; local and CI artifacts only prove the prepared output.

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

For engineering, restore the last successful GitHub Pages artifact or revert the publisher change. For the public site, the owner can restore a prior known-good production deployment through the Cloudflare dashboard when that action is available, or upload the previously retained and validated folder to the confirmed production branch. Verify its source metadata and repeat the hosted checks. Keep domain binding and DNS unchanged during content rollback. If an artifact has expired, rebuild the recorded clean reviewed source and validate it before owner upload; label it a rebuild, not the original retained artifact.

Cloudflare references above were checked on 2026-10-19. Project/account state is intentionally not claimed here.
