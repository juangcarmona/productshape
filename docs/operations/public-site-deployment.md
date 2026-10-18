# ProductShape public-site publication

The public site and engineering portal are built separately. The public source is under `site/`; the PR workflow builds it to `dist/public-site` and stores a seven-day review artifact. GitHub Actions validates the output only. It has no Cloudflare credential and does not deploy the public site.

## Cloudflare Pages project

`wrangler.jsonc` names the Pages project `productshape` and points its output directory to `dist/public-site`, following the Raccord repository's direct-upload Pages convention. Before the first preview or production upload, confirm that the Cloudflare project name and deployment mode match the owner's account. Raccord's checked-in operations record says its current project is manually deployed and its PR workflow does not produce a hosted preview; do not assume Git integration or preview deployments are configured for ProductShape.

To build a review artifact locally, run:

```bash
node scripts/build-public-site.mjs --profile public --out dist/public-site --base-path / --site-origin https://productshape.dev
```

After Cloudflare project access and preview policy are confirmed by the owner, a preview can be uploaded with the Cloudflare Wrangler Pages command for the selected preview branch. Production publication and `productshape.dev` custom-domain activation remain explicit owner-controlled operations. Do not add a Cloudflare token to GitHub Actions or change DNS records from this repository. Confirm the proposed domain association in Cloudflare before activation, then verify HTTPS, site content, links, locale switching, responsive layout and the separation from the engineering portal.

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

For the engineering portal, restore the last successful GitHub Pages artifact or revert the publisher change. For the public site, restore the previous successful Cloudflare Pages deployment or upload the last known-good output. Leave the custom-domain binding and DNS unchanged during a content rollback.
