# Runtime evidence replay

Captured from clean implementation source `0c6d2af436efcd01d655fcdb4af2d712d86257f7`, before evidence files were added. `cloudflare-results.json` records dirty:false manifests, the full source SHA, served/disk SHA256 equality and complete output inventories. No hosted deployment or account state is asserted.

Tools observed: Google Chrome for Testing156.0.8078.4, Playwright1.63.0, Wrangler4.151.2, Linux. `check.cjs` produced12 rendered cases plus two shortcut checks (six surfaces × desktop light/narrow dark), source/navigation checks, all12 architecture paths, explicit/system appearance tests, mobile Enter/Escape/focus return and Snapshot URL-only state. Portal `/` and `?` shortcuts opened Snapshot search/help. `layout.cjs` produced60 cases across320/390/416/417/544/545/1024/1216/1217/1280/1440/1441px, checking document/overview width, control bounds and local matrix scrolling. Both overview tables retain native accessible table roles. `snapshot-interaction.cjs` adds four offline file-URL cases at320/390px in light/dark, exercising all existing header controls by keyboard, search/Escape focus return, every appearance mode/system response, URL restoration and empty browser storage/cookies/network requests. `cloudflare.cjs` checks10 HTTP routes, custom404, provenance and artifact hashes.

The root and executor inspected the captured screenshots: shared public/engineering shell, complete theme controls, compact portal cards, architecture reading/navigation and locally scrollable narrow Snapshot tables. Earlier clipping/overflow/readability findings were corrected before this capture. Images intentionally show local snapshots; source identity comes from the JSON receipt rather than a claim of production publication.

## Rebuild a clean source checkout

From the current repository, keep this evidence path and create an isolated replay worktree. Use an unused temporary path; do not overlay unrelated files.

```bash
EVIDENCE_SOURCE="$PWD/docs/delivery/ff/300/2026-10-19T1228Z/runtime"
git worktree add --detach /tmp/productshape-300-replay 0c6d2af436efcd01d655fcdb4af2d712d86257f7
cd /tmp/productshape-300-replay
pnpm install --frozen-lockfile
pnpm build
node packages/cli/dist/bin.js graph --format html --product-url https://productshape.dev
node scripts/build-public-site.mjs --profile public --out dist/public-site --base-path / --site-origin https://productshape.dev
node scripts/build-public-site.mjs --profile engineering --out _site --base-path /productshape/ --site-origin https://juangcarmona.github.io
node scripts/validate-public-site.mjs --dir dist/public-site --profile public --base-path / --site-origin https://productshape.dev
node scripts/validate-public-site.mjs --dir _site --profile engineering --base-path /productshape/ --site-origin https://juangcarmona.github.io
```

Use pnpm11.1.0 and Node22.22.1 or the configured Node24 toolchain. Do not set GITHUB_SHA to a different revision. Generated output is ignored, so the source checkout remains clean.

## Serve both prepared outputs

In one terminal, from the replay checkout:

```bash
npx wrangler@4.151.2 pages dev dist/public-site --port 8788
```

In another terminal, mount the engineering subpath through a temporary server root:

```bash
mkdir -p /tmp/productshape-300-replay-server
ln -s /tmp/productshape-300-replay/_site /tmp/productshape-300-replay-server/productshape
python3 -m http.server 8789 --directory /tmp/productshape-300-replay-server
```

These commands serve locally; they do not upload or deploy.

## Run the captured assertions

Install the isolated browser dependency and its Chromium (or point CHROMIUM_PATH at an existing compatible Chromium):

```bash
npm install --prefix /tmp/productshape-300-replay-browser --ignore-scripts playwright@1.63.0
node /tmp/productshape-300-replay-browser/node_modules/playwright/cli.js install chromium
export PLAYWRIGHT_MODULE=/tmp/productshape-300-replay-browser/node_modules/playwright
export CHROMIUM_PATH=$(node -e 'console.log(require(process.env.PLAYWRIGHT_MODULE).chromium.executablePath())')
export SITE_REPO=/tmp/productshape-300-replay
export RUNTIME_EVIDENCE_DIR=/tmp/productshape-300-replayed-evidence
mkdir -p "$RUNTIME_EVIDENCE_DIR"
node "$EVIDENCE_SOURCE/check.cjs"
node "$EVIDENCE_SOURCE/layout.cjs"
node "$EVIDENCE_SOURCE/cloudflare.cjs"
node "$EVIDENCE_SOURCE/snapshot-interaction.cjs"
```

Keep EVIDENCE_SOURCE set to this committed directory when changing shells. Results and screenshots go outside the source checkout. The Cloudflare receipt intentionally refuses a dirty source tree; to reproduce the historical source identity, run it against the recorded implementation worktree rather than the later evidence-only head. The other scripts use local ports8788/8789 as above. Retained artifacts do not replace the future owner-run hosted/domain checks in the operations runbook.
