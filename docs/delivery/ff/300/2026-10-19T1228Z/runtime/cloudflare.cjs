/* eslint-disable @typescript-eslint/no-require-imports -- Portable CommonJS replay scripts load a caller-selected Playwright installation. */
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const root = process.env.SITE_REPO;
assert.ok(root, 'SITE_REPO is required');
const out = process.env.RUNTIME_EVIDENCE_DIR || __dirname;
const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
assert.equal(
  execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim(),
  '',
  'Capture from a clean implementation checkout',
);
const digest = (value) => crypto.createHash('sha256').update(value).digest('hex');
async function inventory(dir, rel = '') {
  let all = [];
  for (const f of await fs.readdir(path.join(dir, rel), { withFileTypes: true })) {
    const p = path.join(rel, f.name);
    if (f.isDirectory()) all.push(...(await inventory(dir, p)));
    else {
      const data = await fs.readFile(path.join(dir, p));
      all.push({ path: p, bytes: data.length, sha256: digest(data) });
    }
  }
  return all.sort((a, b) => a.path.localeCompare(b.path));
}
(async () => {
  const publicDir = path.join(root, 'dist/public-site'),
    engineeringDir = path.join(root, '_site');
  const publicMeta = JSON.parse(
    await fs.readFile(path.join(publicDir, 'publication.json'), 'utf8'),
  );
  const engineeringMeta = JSON.parse(
    await fs.readFile(path.join(engineeringDir, 'publication.json'), 'utf8'),
  );
  for (const m of [publicMeta, engineeringMeta]) {
    assert.equal(m.sourceRevision, sha);
    assert.equal(m.dirty, false);
  }
  let checks = [];
  for (const pathname of [
    '/',
    '/en/',
    '/es/',
    '/en/product/',
    '/en/guides/greenfield/',
    '/assets/site.css',
    '/publication.json',
    '/missing-page',
    '/en/engineering/',
    '/en/model/explorer.html',
  ]) {
    const r = await fetch('http://127.0.0.1:8788' + pathname);
    const text = await r.text();
    const expected = ['/missing-page', '/en/engineering/', '/en/model/explorer.html'].includes(
      pathname,
    )
      ? 404
      : 200;
    assert.equal(r.status, expected, pathname);
    if (expected === 404) assert.ok(text.includes('That page is not here.'));
    checks.push({
      path: pathname,
      status: r.status,
      expected,
      custom404: expected === 404 ? text.includes('That page is not here.') : null,
      passed: true,
    });
  }
  for (const [url, file] of [
    ['http://127.0.0.1:8788/assets/site.css', path.join(publicDir, 'assets/site.css')],
    ['http://127.0.0.1:8788/publication.json', path.join(publicDir, 'publication.json')],
    [
      'http://127.0.0.1:8789/productshape/en/model/explorer.html',
      path.join(engineeringDir, 'en/model/explorer.html'),
    ],
  ]) {
    const data = Buffer.from(await (await fetch(url)).arrayBuffer());
    assert.equal(
      digest(data),
      digest(await fs.readFile(file)),
      `served artifact differs from source: ${url}`,
    );
  }
  const snapshot = await fs.readFile(path.join(root, '.product/generated/snapshot.html'));
  assert.equal(
    digest(snapshot),
    digest(await fs.readFile(path.join(engineeringDir, 'en/model/explorer.html'))),
  );
  const result = {
    kind: 'local Cloudflare Pages runtime, not a hosted deployment',
    wranglerVersion: '4.151.2',
    sourceRevision: sha,
    sourceDirty: false,
    observedAt: new Date().toISOString(),
    public: publicMeta,
    engineering: engineeringMeta,
    checks,
    snapshotByteEquality: true,
    publicFiles: await inventory(publicDir),
    engineeringFiles: await inventory(engineeringDir),
  };
  await fs.writeFile(
    path.join(out, 'cloudflare-results.json'),
    JSON.stringify(result, null, 2) + '\n',
  );
  console.log(
    `Passed ${checks.length} Cloudflare runtime routes; clean ${sha}; served asset hashes and Snapshot byte equality match.`,
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
