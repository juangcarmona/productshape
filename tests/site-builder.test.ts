import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();
const validator = join(repoRoot, 'scripts/validate-public-site.mjs');

async function build(args: string[], root = repoRoot, env = process.env) {
  return spawnSync(process.execPath, [join(root, 'scripts/build-public-site.mjs'), ...args], {
    cwd: root,
    env,
    encoding: 'utf8',
  });
}

describe('static site publication profiles', () => {
  it('builds the public root-domain site without engineering routes', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'productshape-public-site-'));
    const output = join(directory, 'public');
    try {
      const result = await build([
        '--profile',
        'public',
        '--out',
        output,
        '--base-path',
        '/',
        '--site-origin',
        'https://productshape.dev',
      ]);
      expect(result.status, result.stderr).toBe(0);

      const [index, spanish, workflow, sitemap, robots, firstDiagram, secondDiagram] =
        await Promise.all([
          readFile(join(output, 'index.html'), 'utf8'),
          readFile(join(output, 'es/index.html'), 'utf8'),
          readFile(join(output, 'en/how-it-works/index.html'), 'utf8'),
          readFile(join(output, 'sitemap.xml'), 'utf8'),
          readFile(join(output, 'robots.txt'), 'utf8'),
          readFile(join(output, 'assets/diagrams/productshape-publication-workflow.html'), 'utf8'),
          readFile(
            join(output, 'assets/diagrams/productshape-publication-boundaries.html'),
            'utf8',
          ),
        ]);
      expect(index).toContain('https://juangcarmona.github.io/productshape/en/model/explorer.html');
      expect(index).toContain('https://juangcarmona.github.io/productshape/en/');
      expect(spanish).toContain(
        'https://juangcarmona.github.io/productshape/en/model/explorer.html',
      );
      expect(workflow).toContain('productshape-publication-workflow.html');
      expect(workflow).toContain('productshape-publication-boundaries.html');
      expect(firstDiagram).toContain('From product decisions to ProductShape publications');
      expect(secondDiagram).toContain('ProductShape products, method and publications');
      expect(sitemap).toContain('https://productshape.dev/en/');
      expect(sitemap).not.toContain('/engineering/');
      expect(sitemap).not.toContain('/model/');
      expect(robots).toContain('Sitemap: https://productshape.dev/sitemap.xml');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('builds an independent engineering portal with identified optional reports', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'productshape-engineering-site-'));
    const output = join(directory, 'portal');
    const snapshot = join(directory, 'snapshot.html');
    const report = join(directory, 'journey.html');
    const manifest = join(directory, 'manifest.json');
    try {
      await writeFile(snapshot, '<!doctype html><title>Snapshot fixture</title>');
      await writeFile(report, '<!doctype html><title>Journey fixture</title>');
      await writeFile(
        manifest,
        JSON.stringify({
          schemaVersion: 2,
          productSnapshot: { sourceRevision: 'prod1234' },
          architectureSnapshot: { sourceRevision: 'arch5678' },
          e2eReports: [
            {
              title: 'Public journey',
              path: 'journey.html',
              sourceRevision: 'abc1234',
              runId: 'run-42',
              result: 'passed',
            },
          ],
        }),
      );
      const result = await build([
        '--profile',
        'engineering',
        '--out',
        output,
        '--base-path',
        '/productshape/',
        '--site-origin',
        'https://juangcarmona.github.io',
        '--snapshot-source',
        snapshot,
        '--engineering-manifest',
        manifest,
      ]);
      expect(result.status, result.stderr).toBe(0);

      const [portal, productSnapshot, sitemap, journey, architecturePage] = await Promise.all([
        readFile(join(output, 'index.html'), 'utf8'),
        readFile(join(output, 'en/model/explorer.html'), 'utf8'),
        readFile(join(output, 'sitemap.xml'), 'utf8'),
        readFile(join(output, 'reports/journey.html'), 'utf8'),
        readFile(join(output, 'en/engineering/01-introduction-and-goals/index.html'), 'utf8'),
      ]);
      expect(productSnapshot).toContain('Snapshot fixture');
      expect(portal).toContain('abc1234');
      expect(portal).toContain('prod1234');
      expect(portal).toContain('arch5678');
      expect(portal).toContain('run-42');
      expect(portal).toContain('passed');
      expect(portal).toContain('/productshape/reports/journey.html');
      expect(portal).toContain('Architecture Snapshot');
      expect(architecturePage).toContain('href="https://productshape.dev/"');
      for (const html of [portal, architecturePage]) {
        const document = new JSDOM(html).window.document;
        const navigation = document.querySelector('#primary-navigation');
        expect(navigation?.textContent).toContain('Product Snapshot');
        expect(navigation?.textContent).toContain('Architecture Snapshot');
        expect(navigation?.textContent).toContain('Public site');
        expect(navigation?.textContent).not.toContain('Get started');
        expect(document.querySelectorAll('[data-appearance-choice]')).toHaveLength(3);
        expect(document.querySelector('.mobile-menu-toggle')?.getAttribute('aria-controls')).toBe(
          'primary-navigation',
        );
      }
      expect(productSnapshot).toBe(await readFile(snapshot, 'utf8'));
      expect(journey).toContain('Journey fixture');
      expect(sitemap).toContain(
        'https://juangcarmona.github.io/productshape/en/model/explorer.html',
      );
      expect(sitemap).not.toContain('productshape.dev');
      await expect(readFile(join(output, 'en/product/index.html'))).rejects.toThrow();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('rejects report paths that could escape the manifest directory', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'productshape-invalid-manifest-'));
    try {
      const manifest = join(directory, 'manifest.json');
      const snapshot = join(directory, 'snapshot.html');
      await writeFile(snapshot, '<!doctype html><title>Snapshot fixture</title>');
      await writeFile(
        manifest,
        JSON.stringify({
          schemaVersion: 2,
          productSnapshot: { sourceRevision: 'abc1234' },
          architectureSnapshot: { sourceRevision: 'abc1234' },
          e2eReports: [
            {
              title: 'Unsafe report',
              path: '../outside.html',
              sourceRevision: 'abc1234',
              runId: 'run-42',
              result: 'passed',
            },
          ],
        }),
      );
      const result = await build([
        '--profile',
        'engineering',
        '--out',
        join(directory, 'portal'),
        '--engineering-manifest',
        manifest,
        '--snapshot-source',
        snapshot,
      ]);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('Invalid E2E report entry');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('builds without an optional engineering manifest or E2E reports', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'productshape-no-engineering-manifest-'));
    try {
      const snapshot = join(directory, 'snapshot.html');
      const output = join(directory, 'portal');
      await writeFile(snapshot, '<!doctype html><title>Snapshot fixture</title>');
      const result = await build([
        '--profile',
        'engineering',
        '--out',
        output,
        '--snapshot-source',
        snapshot,
        '--engineering-manifest',
        join(directory, 'missing-manifest.json'),
      ]);
      expect(result.status, result.stderr).toBe(0);
      const portal = await readFile(join(output, 'index.html'), 'utf8');
      expect(portal).toContain('No E2E journey report has been published yet.');
      expect(portal).not.toContain('E2E journey report · passed');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it.each(['/', '/review/'])('validates both complete profiles at base %s', async (basePath) => {
    const directory = await mkdtemp(join(tmpdir(), 'productshape-profile-validation-'));
    try {
      const snapshot = join(directory, 'snapshot.html');
      await writeFile(snapshot, '<!doctype html><title>Standalone snapshot</title>');
      for (const profile of ['public', 'engineering']) {
        const output = join(directory, profile);
        const origin =
          profile === 'public' ? 'https://productshape.dev' : 'https://juangcarmona.github.io';
        const args = [
          '--profile',
          profile,
          '--out',
          output,
          '--base-path',
          basePath,
          '--site-origin',
          origin,
          '--snapshot-source',
          snapshot,
        ];
        const result = await build(args, repoRoot, { ...process.env, GITHUB_SHA: 'a'.repeat(40) });
        expect(result.status, result.stderr).toBe(0);
        const validation = spawnSync(
          process.execPath,
          [
            validator,
            '--dir',
            output,
            '--profile',
            profile,
            '--base-path',
            basePath,
            '--site-origin',
            origin,
          ],
          { encoding: 'utf8' },
        );
        expect(validation.status, validation.stderr).toBe(0);
        expect(validation.stdout).toContain(`Validated ${profile}`);
        const metadata = JSON.parse(await readFile(join(output, 'publication.json'), 'utf8'));
        expect(metadata.sourceRevision).toBe('a'.repeat(40));
        expect(typeof metadata.dirty).toBe('boolean');
        if (profile === 'engineering') {
          expect(await readFile(join(output, 'en/model/explorer.html'), 'utf8')).toBe(
            await readFile(snapshot, 'utf8'),
          );
          const architecture = new JSDOM(
            await readFile(join(output, 'en/engineering/index.html'), 'utf8'),
          ).window.document;
          expect(architecture.querySelectorAll('.engineering-card')).toHaveLength(12);
          expect(architecture.querySelector('[aria-current="page"]')?.textContent).toContain(
            'Architecture',
          );
        } else {
          expect(await readFile(join(output, '404.html'), 'utf8')).toContain(
            'That page is not here.',
          );
        }
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('builds public output without architecture or generated engineering inputs', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'productshape-public-independent-'));
    try {
      for (const path of [
        'scripts/build-public-site.mjs',
        'site',
        'docs/adoption',
        'docs/assets/snapshot/01-overview-desktop.png',
        'packages/cli/package.json',
      ]) {
        await mkdir(join(directory, path, '..'), { recursive: true });
        await cp(join(repoRoot, path), join(directory, path), { recursive: true });
      }
      const output = join(directory, 'output');
      const result = await build(['--profile', 'public', '--out', output], directory, {
        ...process.env,
        GITHUB_SHA: '',
      });
      expect(result.status, result.stderr).toBe(0);
      await expect(
        readFile(join(directory, 'docs/architecture/01-introduction-and-goals.md')),
      ).rejects.toThrow();
      const metadata = JSON.parse(await readFile(join(output, 'publication.json'), 'utf8'));
      expect(metadata.sourceRevision).toBeNull();
      expect(metadata.dirty).toBe(true);
      const validation = spawnSync(
        process.execPath,
        [
          validator,
          '--dir',
          output,
          '--profile',
          'public',
          '--base-path',
          '/',
          '--site-origin',
          'https://productshape.dev',
        ],
        { encoding: 'utf8' },
      );
      expect(validation.status, validation.stderr).toBe(0);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('rejects broken, leaked and mislabeled public artifacts before upload', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'productshape-invalid-public-'));
    const output = join(directory, 'output');
    try {
      const result = await build(['--profile', 'public', '--out', output]);
      expect(result.status, result.stderr).toBe(0);
      const runValidation = () =>
        spawnSync(
          process.execPath,
          [
            validator,
            '--dir',
            output,
            '--profile',
            'public',
            '--base-path',
            '/',
            '--site-origin',
            'https://productshape.dev',
          ],
          { encoding: 'utf8' },
        );
      const cases = [
        { path: '404.html', expected: 'Missing output: 404.html' },
        { path: 'assets/site.css', expected: 'Missing output: assets/site.css' },
        { path: 'assets/productshape-icon.svg', expected: 'missing local target' },
      ];
      for (const item of cases) {
        const content = await readFile(join(output, item.path));
        await rm(join(output, item.path));
        const validation = runValidation();
        expect(validation.status).not.toBe(0);
        expect(validation.stderr).toContain(item.expected);
        await writeFile(join(output, item.path), content);
      }
      const indexPath = join(output, 'en/index.html');
      const index = await readFile(indexPath, 'utf8');
      await writeFile(
        indexPath,
        index.replace(
          /<link rel="canonical" href="[^"]+">/u,
          '<link rel="canonical" href="https://incorrect.example/">',
        ),
      );
      expect(runValidation().stderr).toContain('canonical URL must be');
      await writeFile(indexPath, index);
      const sitemapPath = join(output, 'sitemap.xml');
      const sitemap = await readFile(sitemapPath, 'utf8');
      for (const invalid of [
        '<urlset></urlset>',
        sitemap.replace(/<url><loc>.*?<\/loc><\/url>/u, ''),
        sitemap.replace('https://productshape.dev/en/', 'https://incorrect.example/en/'),
      ]) {
        await writeFile(sitemapPath, invalid);
        expect(runValidation().stderr).toContain('complete publication route set');
      }
      await writeFile(sitemapPath, sitemap);
      const metadataPath = join(output, 'publication.json');
      const metadata = await readFile(metadataPath, 'utf8');
      await writeFile(
        metadataPath,
        metadata.replace('https://productshape.dev', 'https://wrong.example'),
      );
      expect(runValidation().stderr).toContain('Invalid publication metadata');
      await writeFile(metadataPath, metadata);
      await mkdir(join(output, 'en/engineering'), { recursive: true });
      await writeFile(
        join(output, 'en/engineering/index.html'),
        '<title>Leaked architecture</title>',
      );
      expect(runValidation().stderr).toContain('Engineering route leaked');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
