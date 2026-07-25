import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runCli } from '@product-definition-as-code/cli';
import { checkIntegrations, loadBundledAssets } from '@product-definition-as-code/distribution';
import { claudeRenderer } from '@product-definition-as-code/integration-claude';
import { copilotRenderer } from '@product-definition-as-code/integration-copilot';
import { listFilesRecursive, repoRoot, toPosix } from '../helpers.js';

let workDir: string;

async function run(argv: string[], cwd: string) {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runCli(argv, { cwd, out: (l) => out.push(l), err: (l) => err.push(l) });
  return { code, out: out.join('\n'), err: err.join('\n') };
}

beforeAll(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'product-definition-dist-'));
});

afterAll(async () => {
  await rm(workDir, { recursive: true, force: true });
});

describe('bundled assets', () => {
  it('are byte-identical to the canonical repository assets', async () => {
    for (const dir of ['skills', 'commands', 'hooks', 'templates']) {
      const canonical = await listFilesRecursive(join(repoRoot, dir), '');
      expect(canonical.length, dir).toBeGreaterThan(0);
      for (const file of canonical) {
        const relative = toPosix(file).slice(toPosix(repoRoot).length + 1);
        const bundled = join(
          repoRoot,
          'packages',
          'distribution',
          'assets',
          ...relative.split('/'),
        );
        expect(await readFile(bundled, 'utf8'), relative).toBe(await readFile(file, 'utf8'));
      }
    }
  });

  it('loads six skills, seven commands, four hooks and thirteen templates', async () => {
    const assets = await loadBundledAssets();
    expect(assets.skills).toHaveLength(6);
    expect(assets.commands).toHaveLength(7);
    expect(assets.hooks).toHaveLength(4);
    expect(assets.templates).toHaveLength(13);
    expect(assets.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('provider renderers', () => {
  it('claude output is stable', async () => {
    const assets = { ...(await loadBundledAssets()), version: '0.0.0-test' };
    const files = claudeRenderer.render(assets);
    const index = files.map((f) => f.path).join('\n');
    await expect(index).toMatchFileSnapshot('__snapshots__/claude-file-index.txt');
    const command = files.find((f) => f.path === '.claude/commands/product/change.md');
    await expect(command?.content).toMatchFileSnapshot('__snapshots__/claude-command-change.md');
    const hooks = files.find((f) => f.path === '.claude/hooks/product-definition.json');
    await expect(hooks?.content).toMatchFileSnapshot('__snapshots__/claude-hooks.json');
  });

  it('copilot output is stable', async () => {
    const assets = { ...(await loadBundledAssets()), version: '0.0.0-test' };
    const files = copilotRenderer.render(assets);
    const index = files.map((f) => f.path).join('\n');
    await expect(index).toMatchFileSnapshot('__snapshots__/copilot-file-index.txt');
    const hookDoc = files.find((f) => f.path === '.github/hooks/verify-traceability.md');
    await expect(hookDoc?.content).toMatchFileSnapshot('__snapshots__/copilot-hook-doc.md');
  });

  it('rendered skill content preserves canonical meaning (frontmatter + sections intact)', async () => {
    const assets = await loadBundledAssets();
    const files = claudeRenderer.render(assets);
    const skill = files.find((f) => f.path === '.claude/skills/define-product/SKILL.md');
    expect(skill?.content).toMatch(/^---\nname: define-product\n/);
    expect(skill?.content).toContain('MANAGED FILE');
    for (const section of ['## Purpose', '## Forbidden actions', '## Completion checks']) {
      expect(skill?.content).toContain(section);
    }
  });
});

describe('init and managed-file lifecycle (end to end)', () => {
  it('init creates the consumer structure with integrations and next steps', async () => {
    const result = await run(['init', '--ai', 'claude,copilot', '--sdd', 'openspec'], workDir);
    expect(result.err).toBe('');
    expect(result.code).toBe(0);
    expect(result.out).toContain('Next steps:');

    const config = await readFile(join(workDir, '.product', 'config.yaml'), 'utf8');
    expect(config).toContain('- claude');
    expect(config).toContain('provider: openspec');
    await readFile(join(workDir, 'docs', 'product', 'README.md'), 'utf8');
    await readFile(join(workDir, '.product', 'templates', 'actor.md'), 'utf8');
    await readFile(join(workDir, '.claude', 'skills', 'define-product', 'SKILL.md'), 'utf8');
    await readFile(join(workDir, '.github', 'prompts', 'product-change.prompt.md'), 'utf8');
    const lock = JSON.parse(
      await readFile(join(workDir, '.product', 'installation.lock.json'), 'utf8'),
    ) as { providers: Record<string, { files: Record<string, string> }> };
    expect(Object.keys(lock.providers).sort()).toEqual(['claude', 'copilot']);
  });

  it('init never overwrites user files without --force', async () => {
    const readmePath = join(workDir, 'docs', 'product', 'README.md');
    await writeFile(readmePath, 'user content\n', 'utf8');
    const result = await run(['init', '--ai', 'claude'], workDir);
    expect(result.code).toBe(0);
    expect(result.out).toContain('Preserved existing files');
    expect(await readFile(readmePath, 'utf8')).toBe('user content\n');
  });

  it('integration update is reproducible and --check is clean after it', async () => {
    const update = await run(['integration', 'update'], workDir);
    expect(update.code).toBe(0);
    const check = await run(['integration', 'update', '--check'], workDir);
    expect(check.code).toBe(0);
    expect(check.out).toContain('All managed integration files match');
  });

  it('manual edits are detected as PRODUCT051 and missing files as PRODUCT052', async () => {
    const managed = join(workDir, '.claude', 'commands', 'product', 'audit.md');
    const original = await readFile(managed, 'utf8');
    await writeFile(managed, `${original}\ntampered\n`, 'utf8');
    const drift = await run(['integration', 'update', '--check'], workDir);
    expect(drift.code).toBe(1);
    expect(drift.out).toContain('PRODUCT051');
    await rm(join(workDir, '.github', 'skills', 'audit-product-model.md'));
    const missing = await run(['integration', 'update', '--check'], workDir);
    expect(missing.out).toContain('PRODUCT052');
    const diagnostics = await checkIntegrations(workDir);
    expect(diagnostics.map((d) => d.code)).toContain('PRODUCT051');
    // Repair for later tests.
    const repair = await run(['integration', 'update'], workDir);
    expect(repair.code).toBe(0);
  });

  it('doctor reports a healthy repository after repair', async () => {
    const result = await run(['doctor'], workDir);
    expect(result.out).toContain('ok   managed files');
    // The openspec workspace is configured but absent in this synthetic repo.
    expect(result.out).toContain('FAIL sdd workspace');
    expect(result.code).toBe(1);
  });
});
