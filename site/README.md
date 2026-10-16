# ProductShape public site

The site is a buildless static source under `site/`. Localized page copy lives in `content/en.json` and `content/es.json`; shared presentation is in `assets/site.css`. `scripts/build-public-site.mjs` assembles localized pages, turns the twelve canonical arc42 Markdown sections into navigable pages, and includes the generated Product Snapshot.

Build it after the CLI workspace build and snapshot generation:

```bash
node packages/cli/dist/bin.js graph --format html
node scripts/build-public-site.mjs --out _site --base-path /productshape/
```

Use `--base-path / --site-origin https://example.com` when serving the built output at a domain root, such as Cloudflare Pages or a custom domain. The GitHub Pages project site uses `/productshape/` and the default GitHub Pages origin.

The website is informational and static. The product model explorer is copied from `.product/generated/snapshot.html`; it is not edited in the site source. The first implementation is the reuse pilot. Extract shared components only after the ProductShape, Raccord, and DomusMind needs have been compared.
