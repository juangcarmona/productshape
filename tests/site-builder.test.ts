import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();
const builder = join(repoRoot, 'scripts/build-public-site.mjs');

async function build(args: string[]) {
  return spawnSync(process.execPath, [builder, ...args], {
    cwd: repoRoot,
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
      expect(architecturePage).toContain('href="https://productshape.dev/en/product/"');
      expect(architecturePage).toContain('href="https://productshape.dev/es/"');
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
});
