/**
 * End-to-end acceptance for the Spec Kit bridge (issue #143): a Spec Kit workspace is configured
 * with `prodshape integration add speckit`, a feature spec cites a canonical artifact, provider
 * verification reports it current, and a change to the cited artifact makes the feature spec
 * report PRODUCT061 (stale). The fixture suite always runs against the documented `.specify` +
 * `specs/<feature>/` layout; the real-workspace suite additionally drives GitHub's own `specify`
 * CLI when it is installed (CI installs it; see .github/workflows/ci.yml) and skips elsewhere,
 * mirroring how the OpenSpec consumer tests treat the `openspec` CLI.
 */
import { execFile } from 'node:child_process';
import type { Server } from 'node:http';
import { existsSync } from 'node:fs';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { runCli } from '@prodshape/cli';
import { repoRoot } from '../helpers.js';

const execFileAsync = promisify(execFile);
const isWindows = process.platform === 'win32';

/** Probe PATH for the `specify` CLI without executing anything. */
function specifyOnPath(): boolean {
  const names = isWindows ? ['specify.cmd', 'specify.exe', 'specify.bat', 'specify'] : ['specify'];
  return (process.env.PATH ?? '')
    .split(delimiter)
    .some((dir) => dir.length > 0 && names.some((name) => existsSync(join(dir, name))));
}
const hasSpecify = specifyOnPath();

interface RunResult {
  code: number;
  out: string;
  err: string;
}

async function run(argv: string[], cwd: string): Promise<RunResult> {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runCli(argv, { cwd, out: (l) => out.push(l), err: (l) => err.push(l) });
  return { code, out: out.join('\n'), err: err.join('\n') };
}

/** Copy the minimal example model into a scratch repository root. */
async function scaffoldModel(dir: string): Promise<void> {
  await mkdir(join(dir, 'docs', 'product'), { recursive: true });
  await mkdir(join(dir, '.product'), { recursive: true });
  await writeFile(join(dir, '.product', 'config.yaml'), 'version: v1alpha1\n', 'utf8');
  await cp(
    join(repoRoot, 'examples', 'minimal', 'product', 'model'),
    join(dir, 'docs', 'product', 'model'),
    {
      recursive: true,
    },
  );
}

/**
 * The shared acceptance drill, run against any Spec Kit workspace root that already has the
 * product model: install the integration, author a cited feature, verify current, change the
 * cited artifact, verify stale.
 */
async function driveCitationLifecycle(dir: string): Promise<void> {
  // Install the integration into the existing workspace.
  const add = await run(['integration', 'add', 'speckit'], dir);
  expect(add.code, add.err).toBe(0);
  expect(add.out).toContain('.specify/memory/pdac.md');
  expect(existsSync(join(dir, '.specify', 'memory', 'pdac.md'))).toBe(true);

  // Generation-time enforcement: every Spec Kit template the workspace has carries the managed
  // PDaC block after installation, so documents generated from it inherit the requirement.
  for (const template of ['spec-template.md', 'plan-template.md', 'tasks-template.md']) {
    const templatePath = join(dir, '.specify', 'templates', template);
    if (existsSync(templatePath)) {
      expect(await readFile(templatePath, 'utf8'), template).toContain('Product Grounding');
    }
  }

  // The integration never touches the constitution Spec Kit owns.
  const constitutionPath = join(dir, '.specify', 'memory', 'constitution.md');
  const constitutionBefore = existsSync(constitutionPath)
    ? await readFile(constitutionPath, 'utf8')
    : null;

  // Author one feature: a cited spec, an exempt plan, an exempt tasks file.
  const inspect = await run(['inspect', 'FR-SHORTEN-001', '--format', 'json'], dir);
  expect(inspect.code, inspect.err).toBe(0);
  const digest = (JSON.parse(inspect.out) as { digest: string }).digest;

  const featureDir = join(dir, 'specs', '001-shorten');
  await mkdir(featureDir, { recursive: true });
  await writeFile(
    join(featureDir, 'spec.md'),
    `# Feature: shorten a URL\n\nThe system issues a resolving short link for every accepted URL.\n{pdac:cite id="FR-SHORTEN-001" digest="${digest}"}\n`,
    'utf8',
  );
  await writeFile(join(featureDir, 'plan.md'), '---\npdac-scope: none\n---\n# Plan\n', 'utf8');
  await writeFile(join(featureDir, 'tasks.md'), '---\npdac-scope: none\n---\n# Tasks\n', 'utf8');

  // Current: the population is bound or exempt and the citation verifies.
  const current = await run(
    ['citations', 'verify', '--provider', 'speckit', '--format', 'json'],
    dir,
  );
  expect(current.code, current.err).toBe(0);
  const currentPayload = JSON.parse(current.out);
  expect(currentPayload.summary).toMatchObject({
    totalDocuments: 3,
    bound: 1,
    exempt: 2,
    unclassified: 0,
    current: 1,
    stale: 0,
  });

  // Change the cited artifact: the feature spec must report PRODUCT061 (stale).
  const artifactPath = join(
    dir,
    'docs',
    'product',
    'model',
    'requirements',
    'functional',
    'fr-shorten-001.md',
  );
  const artifact = await readFile(artifactPath, 'utf8');
  await writeFile(
    artifactPath,
    `${artifact}\nThe accepted meaning moved after the citation.\n`,
    'utf8',
  );

  const stale = await run(
    ['citations', 'verify', '--provider', 'speckit', '--format', 'json'],
    dir,
  );
  const stalePayload = JSON.parse(stale.out);
  expect(stalePayload.summary.stale).toBe(1);
  const codes = stalePayload.diagnostics.map((d: { code: string }) => d.code);
  expect(codes).toContain('PRODUCT061');

  if (constitutionBefore !== null) {
    expect(await readFile(constitutionPath, 'utf8')).toBe(constitutionBefore);
  }
}

describe('Spec Kit consumer conformance (fixture workspace)', () => {
  it('drives the full citation lifecycle over the documented layout', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'prodshape-speckit-fixture-'));
    try {
      await scaffoldModel(dir);
      await mkdir(join(dir, '.specify', 'memory'), { recursive: true });
      await writeFile(
        join(dir, '.specify', 'memory', 'constitution.md'),
        '# Constitution\n\nUser-owned principles.\n',
        'utf8',
      );
      await driveCitationLifecycle(dir);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('fails, never passes vacuously, when a gated document is unclassified', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'prodshape-speckit-unclassified-'));
    try {
      await scaffoldModel(dir);
      await mkdir(join(dir, '.specify'), { recursive: true });
      const featureDir = join(dir, 'specs', '001-unclassified');
      await mkdir(featureDir, { recursive: true });
      await writeFile(join(featureDir, 'spec.md'), '# No declaration, no citations\n', 'utf8');

      const result = await run(
        ['citations', 'verify', '--provider', 'speckit', '--format', 'json'],
        dir,
      );
      expect(result.code).toBe(1);
      const payload = JSON.parse(result.out);
      expect(payload.summary.unclassified).toBe(1);
      const codes = payload.diagnostics.map((d: { code: string }) => d.code);
      expect(codes).toContain('PRODUCT064');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('reports an error when no Spec Kit workspace exists', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'prodshape-speckit-noworkspace-'));
    try {
      await scaffoldModel(dir);
      const result = await run(['citations', 'verify', '--provider', 'speckit'], dir);
      expect(result.code).toBe(1);
      expect(result.out).toContain('No speckit workspace found');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe.skipIf(!hasSpecify)('pdac Spec Kit extension (real specify CLI)', () => {
  it('installs from the repository checkout and registers commands and hooks', async (ctx) => {
    const dir = await mkdtemp(join(tmpdir(), 'prodshape-speckit-ext-'));
    try {
      try {
        await execFileAsync(
          'specify',
          [
            'init',
            '--here',
            '--force',
            '--non-interactive',
            '--integration',
            'claude',
            '--ignore-agent-tools',
          ],
          { cwd: dir, maxBuffer: 10 * 1024 * 1024 },
        );
      } catch (error) {
        ctx.skip(
          `specify init failed in this environment: ${error instanceof Error ? error.message : String(error)}`,
        );
        return;
      }

      const extensionSource = join(repoRoot, 'extensions', 'speckit-pdac');
      const { stdout } = await execFileAsync(
        'specify',
        ['extension', 'add', extensionSource, '--dev'],
        { cwd: dir, maxBuffer: 10 * 1024 * 1024 },
      );
      expect(stdout).toContain('speckit.pdac.context');
      expect(stdout).toContain('speckit.pdac.verify');

      expect(existsSync(join(dir, '.specify', 'extensions', 'pdac', 'extension.yml'))).toBe(true);

      const { stdout: listed } = await execFileAsync('specify', ['extension', 'list'], {
        cwd: dir,
        maxBuffer: 10 * 1024 * 1024,
      });
      expect(listed).toContain('pdac');
      expect(listed).toContain('Hooks: 3');

      // The claude integration materializes provided commands as agent skills.
      expect(
        existsSync(join(dir, '.claude', 'skills', 'speckit-pdac-verify', 'SKILL.md')) ||
          existsSync(join(dir, '.claude', 'commands', 'speckit.pdac.verify.md')),
      ).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 120_000);

  it('installs by name from a served catalog with sha256 verification', async (ctx) => {
    const { createHash } = await import('node:crypto');
    const { createServer } = await import('node:http');

    const dir = await mkdtemp(join(tmpdir(), 'prodshape-speckit-catalog-'));
    let server: Server | undefined;
    try {
      try {
        await execFileAsync(
          'specify',
          [
            'init',
            '--here',
            '--force',
            '--non-interactive',
            '--integration',
            'claude',
            '--ignore-agent-tools',
          ],
          { cwd: dir, maxBuffer: 10 * 1024 * 1024 },
        );
      } catch (error) {
        ctx.skip(
          `specify init failed in this environment: ${error instanceof Error ? error.message : String(error)}`,
        );
        return;
      }

      // Build the archive exactly as the release workflow does. HEAD carries the committed
      // extension; the test exercises the distribution mechanics, not working-tree freshness.
      const zipPath = join(dir, 'speckit-pdac.zip');
      await execFileAsync(
        'git',
        ['archive', 'HEAD:extensions/speckit-pdac', '--format=zip', '-o', zipPath],
        { cwd: repoRoot, maxBuffer: 10 * 1024 * 1024 },
      );
      const zipBytes = await readFile(zipPath);
      const sha256 = createHash('sha256').update(zipBytes).digest('hex');

      // Serve the catalog and the archive over localhost; the specify CLI accepts plain HTTP
      // for localhost only, which is exactly the loophole this test needs. The port is assigned
      // once the server listens; requests only arrive after that.
      let port = 0;
      server = createServer((req, res) => {
        if (req.url === '/speckit-pdac.zip') {
          res.writeHead(200, { 'content-type': 'application/zip' });
          res.end(zipBytes);
          return;
        }
        if (req.url === '/catalog.json') {
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(
            JSON.stringify({
              schema_version: '1.0',
              extensions: {
                pdac: {
                  id: 'pdac',
                  name: 'Product Definition as Code (PDaC)',
                  version: '0.1.0',
                  description: 'Test catalog entry',
                  author: 'juangcarmona',
                  repository: 'https://github.com/juangcarmona/productshape',
                  license: 'Apache-2.0',
                  download_url: `http://127.0.0.1:${port}/speckit-pdac.zip`,
                  sha256: `sha256:${sha256}`,
                  tags: ['pdac'],
                },
              },
            }),
          );
          return;
        }
        res.writeHead(404);
        res.end();
      });
      await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
      const address = server.address();
      port = typeof address === 'object' && address ? address.port : 0;

      await execFileAsync(
        'specify',
        [
          'extension',
          'catalog',
          'add',
          `http://127.0.0.1:${port}/catalog.json`,
          '--name',
          'pdac-test',
          '--install-allowed',
        ],
        { cwd: dir, maxBuffer: 10 * 1024 * 1024 },
      );
      const { stdout } = await execFileAsync('specify', ['extension', 'add', 'pdac'], {
        cwd: dir,
        maxBuffer: 10 * 1024 * 1024,
      });
      expect(stdout).toContain('speckit.pdac.verify');
      expect(existsSync(join(dir, '.specify', 'extensions', 'pdac', 'extension.yml'))).toBe(true);
    } finally {
      await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
      await rm(dir, { recursive: true, force: true });
    }
  }, 120_000);
});

describe.skipIf(!hasSpecify)('Spec Kit consumer conformance (real specify init)', () => {
  it('drives the full citation lifecycle over a workspace created by the specify CLI', async (ctx) => {
    const dir = await mkdtemp(join(tmpdir(), 'prodshape-speckit-real-'));
    try {
      // `specify init` scaffolds from assets bundled in the CLI, so this needs no network. The
      // flag set is the CLI's documented non-interactive form; if a future specify version
      // changes it, skip rather than fail: the fixture suite above still guards the contract.
      try {
        await execFileAsync(
          'specify',
          [
            'init',
            '--here',
            '--force',
            '--non-interactive',
            '--integration',
            'claude',
            '--ignore-agent-tools',
          ],
          { cwd: dir, maxBuffer: 10 * 1024 * 1024 },
        );
      } catch (error) {
        ctx.skip(
          `specify init failed in this environment: ${error instanceof Error ? error.message : String(error)}`,
        );
        return;
      }
      expect(existsSync(join(dir, '.specify'))).toBe(true);

      await scaffoldModel(dir);
      await driveCitationLifecycle(dir);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 120_000);
});
