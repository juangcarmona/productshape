import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runCli } from '@prodshape/cli';
import {
  checkIntegrations,
  fileDigest,
  loadBundledAssets,
  lockSchemaId,
  writeLock,
} from '@prodshape/distribution';
import { claudeRenderer } from '@prodshape/integration-claude';
import { copilotRenderer } from '@prodshape/integration-copilot';
import { listFilesRecursive, repoRoot, toPosix } from '../helpers.js';

let workDir: string;

/** `.claude/commands/ps/<name>.md` or `.github/prompts/ps-<name>.prompt.md`. */
function isShorthandPath(path: string): boolean {
  return path.includes('/commands/ps/') || path.includes('/prompts/ps-');
}

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
    for (const dir of ['skills', 'commands', 'templates']) {
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

  it('loads five skills, six commands and ten templates', async () => {
    const assets = await loadBundledAssets();
    expect(assets.skills).toHaveLength(5);
    expect(assets.commands).toHaveLength(6);
    expect(assets.templates).toHaveLength(10);
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

  it('generates no ps aliases by default', async () => {
    const assets = { ...(await loadBundledAssets()), version: '0.0.0-test' };
    for (const renderer of [claudeRenderer, copilotRenderer]) {
      const paths = renderer.render(assets).map((f) => f.path);
      expect.soft(paths.filter(isShorthandPath), renderer.provider).toEqual([]);
      // The canonical namespace is never conditional.
      expect
        .soft(
          paths.some((p) => p.includes('product')),
          renderer.provider,
        )
        .toBe(true);
    }
  });

  it('generates ps aliases with identical content when opted in', async () => {
    const assets = { ...(await loadBundledAssets()), version: '0.0.0-test' };
    for (const renderer of [claudeRenderer, copilotRenderer]) {
      const files = renderer.render(assets, { shorthandCommands: true });
      const shorthand = files.filter((f) => isShorthandPath(f.path));
      // Structural typing accepts a renderer that ignores the option, so the compiler cannot
      // catch one that forgets it: assert behaviourally that the option changes the output.
      expect.soft(shorthand, renderer.provider).toHaveLength(assets.commands.length);
      for (const alias of shorthand) {
        const canonical = files.find(
          (f) => !isShorthandPath(f.path) && f.content === alias.content,
        );
        expect.soft(canonical, `${renderer.provider}: ${alias.path}`).toBeDefined();
      }
    }
  });

  it('shorthand output is stable', async () => {
    const assets = { ...(await loadBundledAssets()), version: '0.0.0-test' };
    const claude = claudeRenderer.render(assets, { shorthandCommands: true });
    await expect(claude.map((f) => f.path).join('\n')).toMatchFileSnapshot(
      '__snapshots__/claude-file-index-shorthand.txt',
    );
    const copilot = copilotRenderer.render(assets, { shorthandCommands: true });
    await expect(copilot.map((f) => f.path).join('\n')).toMatchFileSnapshot(
      '__snapshots__/copilot-file-index-shorthand.txt',
    );
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

describe('integration diagnostic ordering', () => {
  it('uses explicit UTF-16 code-unit order instead of locale collation', async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'prodshape-integration-diagnostics-'));
    const paths = [
      'managed/ä.md',
      'managed/Z.md',
      'managed/a.md',
      'managed/A.md',
      'managed/10.md',
      'managed/2.md',
      'managed/_.md',
      'managed/-.md',
    ];
    try {
      await writeLock(scratch, {
        schema: lockSchemaId,
        version: '0.0.0-test',
        providers: {
          probe: {
            files: Object.fromEntries(paths.map((path) => [path, fileDigest('expected\n')])),
          },
        },
      });
      for (const path of paths) {
        const absolute = join(scratch, ...path.split('/'));
        await mkdir(dirname(absolute), { recursive: true });
        await writeFile(absolute, 'tampered\n', 'utf8');
      }

      expect((await checkIntegrations(scratch)).map((diagnostic) => diagnostic.file)).toEqual([
        'managed/-.md',
        'managed/10.md',
        'managed/2.md',
        'managed/A.md',
        'managed/Z.md',
        'managed/_.md',
        'managed/a.md',
        'managed/ä.md',
      ]);
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  });
});

describe('init --dry-run', () => {
  it('reports what it would create and writes nothing', async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'prodshape-dryrun-'));
    try {
      const result = await run(['init', '--ai', 'copilot', '--dry-run'], scratch);
      expect(result.code).toBe(0);
      expect(result.out).toContain('Would create');
      expect(result.out).toContain('docs/product/model/actors/.gitkeep');
      expect(result.out).toContain('.github/prompts/product-impact.prompt.md');
      expect(result.out).toContain('Would overwrite (0)');
      expect(result.out).toContain('Conflicts (0)');
      expect(result.out).toContain('Dry run: nothing was changed.');
      expect(await listFilesRecursive(scratch, '')).toEqual([]);
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  });

  it('reports the same file count that applying it produces', async () => {
    // The point of the plan/apply split: a dry run that could disagree with the real run would be
    // worse than no dry run at all.
    const scratch = await mkdtemp(join(tmpdir(), 'prodshape-dryrun-parity-'));
    try {
      const dry = await run(['init', '--ai', 'copilot', '--dry-run'], scratch);
      const planned = Number(/Would create \((\d+)\)/.exec(dry.out)?.[1]);
      const real = await run(['init', '--ai', 'copilot'], scratch);
      const applied = Number(/\((\d+) file\(s\) created\)/.exec(real.out)?.[1]);
      expect(planned).toBe(applied);
      expect(await listFilesRecursive(scratch, '')).toHaveLength(planned);
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  });

  it('answers the populated-repository question: preserve and regenerate, never overwrite', async () => {
    // The question that blocked a real adoption: does init refuse outright, or destroy things?
    const scratch = await mkdtemp(join(tmpdir(), 'prodshape-dryrun-populated-'));
    try {
      await run(['init', '--ai', 'copilot'], scratch);
      const again = await run(['init', '--ai', 'copilot', '--dry-run'], scratch);
      expect(again.code).toBe(0);
      expect(again.out).toContain('Would preserve');
      expect(again.out).toContain('Would regenerate');
      expect(again.out).toContain('Would overwrite (0)');
      expect(again.out).toContain('Conflicts (0)');
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  });

  it('reports a conflict, and exits 1, without writing', async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'prodshape-dryrun-conflict-'));
    try {
      const claimed = join(scratch, '.github', 'prompts', 'product-impact.prompt.md');
      await mkdir(dirname(claimed), { recursive: true });
      await writeFile(claimed, 'my own prompt\n', 'utf8');

      const result = await run(['init', '--ai', 'copilot', '--dry-run'], scratch);
      expect(result.code).toBe(1);
      expect(result.out).toContain('Conflicts (1)');
      expect(result.out).toContain('.github/prompts/product-impact.prompt.md');
      expect(await readFile(claimed, 'utf8')).toBe('my own prompt\n');
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  });
});

describe('init SDD detection and --sdd', () => {
  it('reports no detection in an empty repository and suggests pairing later', async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'prodshape-sdd-none-'));
    try {
      const result = await run(['init'], scratch);
      expect(result.code).toBe(0);
      expect(result.out).toContain('SDD frameworks:');
      expect(result.out).toContain('detected: none');
      expect(result.out).toContain('Pair with an SDD framework when ready');
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  });

  it('detects an OpenSpec workspace, installs nothing without a choice, and recommends the wiring and recovery', async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'prodshape-sdd-brownfield-'));
    try {
      await mkdir(join(scratch, 'openspec'), { recursive: true });
      const result = await run(['init'], scratch);
      expect(result.code).toBe(0);
      expect(result.out).toContain(
        'detected: OpenSpec (openspec/ present; ProductShape integration not installed)',
      );
      expect(result.out).toContain('prodshape integration add openspec');
      expect(result.out).toContain('Brownfield: recover the product definition');
      await expect(
        readFile(join(scratch, '.product', 'integrations', 'openspec.json'), 'utf8'),
      ).rejects.toThrow();
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  });

  it('--sdd none opts out without the pairing suggestion', async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'prodshape-sdd-optout-'));
    try {
      const result = await run(['init', '--sdd', 'none'], scratch);
      expect(result.code).toBe(0);
      expect(result.out).toContain('detected: none');
      expect(result.out).not.toContain('Pair with an SDD framework when ready');
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  });

  it('--sdd kiro prints setup guidance instead of attempting an install', async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'prodshape-sdd-kiro-'));
    try {
      const result = await run(['init', '--sdd', 'kiro'], scratch);
      expect(result.code).toBe(0);
      expect(result.out).toContain('Kiro is set up from its own tooling');
      expect(result.out).toContain('kiro.dev');
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  });

  it('rejects an unsupported framework with exit 2 and no changes', async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'prodshape-sdd-bogus-'));
    try {
      const result = await run(['init', '--sdd', 'bogus'], scratch);
      expect(result.code).toBe(2);
      expect(result.err).toContain(
        "Unknown SDD framework 'bogus' (supported: openspec, kiro, speckit, none)",
      );
      expect(await listFilesRecursive(scratch, '')).toEqual([]);
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  });

  it('--sdd openspec --dry-run describes the SDD actions, runs nothing and writes nothing', async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'prodshape-sdd-dryrun-'));
    try {
      const result = await run(['init', '--sdd', 'openspec', '--dry-run'], scratch);
      expect(result.code).toBe(0);
      expect(result.out).toContain('SDD plan (dry run):');
      expect(result.out).toContain('would create an OpenSpec workspace');
      expect(result.out).toContain('would merge PDaC guidance into openspec/config.yaml');
      expect(result.out).toContain('would write .product/integrations/openspec.json');
      expect(await listFilesRecursive(scratch, '')).toEqual([]);
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  });

  it('prompts on a detected workspace and declining installs nothing', async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'prodshape-sdd-decline-'));
    try {
      await mkdir(join(scratch, 'openspec'), { recursive: true });
      const questions: string[] = [];
      const out: string[] = [];
      const code = await runCli(['init'], {
        cwd: scratch,
        out: (l) => out.push(l),
        err: () => {},
        prompt: async (question) => {
          questions.push(question);
          return 'n';
        },
      });
      expect(code).toBe(0);
      // Asked once, not once per detected marker. Other prompts in the same run (the ignore rules)
      // are a separate decision, so the count is taken over this question alone.
      expect(questions.filter((q) => q.includes('OpenSpec workspace detected'))).toHaveLength(1);
      await expect(
        readFile(join(scratch, '.product', 'integrations', 'openspec.json'), 'utf8'),
      ).rejects.toThrow();
      expect(out.join('\n')).toContain('prodshape integration add openspec');
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  });

  it('offers the framework menu when nothing is detected and honours the selection', async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'prodshape-sdd-menu-'));
    try {
      const questions: string[] = [];
      const out: string[] = [];
      const code = await runCli(['init'], {
        cwd: scratch,
        out: (l) => out.push(l),
        err: () => {},
        prompt: async (question) => {
          questions.push(question);
          return '2';
        },
      });
      expect(code).toBe(0);
      expect(questions[0]).toContain('Choose [1-4');
      const output = out.join('\n');
      expect(output).toContain('1) OpenSpec');
      expect(output).toContain('Kiro is set up from its own tooling');
      await expect(
        readFile(join(scratch, '.product', 'integrations', 'openspec.json'), 'utf8'),
      ).rejects.toThrow();
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  });

  it('doctor points at the integration when a workspace exists without it', async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'prodshape-sdd-doctor-'));
    try {
      await run(['init'], scratch);
      await mkdir(join(scratch, 'openspec'), { recursive: true });
      const result = await run(['doctor'], scratch);
      expect(result.code).toBe(0);
      expect(result.out).toContain(
        'OpenSpec workspace detected; integration not installed (informational; run: prodshape integration add openspec)',
      );
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  });
});

describe('shorthand command aliases', () => {
  it('init generates none by default and --shorthand persists the choice', async () => {
    const off = await mkdtemp(join(tmpdir(), 'prodshape-shorthand-off-'));
    const on = await mkdtemp(join(tmpdir(), 'prodshape-shorthand-on-'));
    try {
      await run(['init', '--ai', 'copilot'], off);
      const offPaths = (await listFilesRecursive(join(off, '.github', 'prompts'), '.md')).map((f) =>
        toPosix(f),
      );
      expect(offPaths.filter((p) => p.includes('/ps-'))).toEqual([]);
      expect(offPaths.some((p) => p.includes('/product-'))).toBe(true);
      expect(await readFile(join(off, '.product', 'config.yaml'), 'utf8')).toContain(
        'shorthand-commands: false',
      );

      await run(['init', '--ai', 'copilot', '--shorthand'], on);
      const onPaths = (await listFilesRecursive(join(on, '.github', 'prompts'), '.md')).map((f) =>
        toPosix(f),
      );
      expect(onPaths.filter((p) => p.includes('/ps-'))).toHaveLength(6);
      // Persisted, not just applied: `integration update` re-renders from configuration.
      expect(await readFile(join(on, '.product', 'config.yaml'), 'utf8')).toContain(
        'shorthand-commands: true',
      );
      const update = await run(['integration', 'update'], on);
      expect(update.code).toBe(0);
      expect(
        (await listFilesRecursive(join(on, '.github', 'prompts'), '.md')).filter((f) =>
          toPosix(f).includes('/ps-'),
        ),
      ).toHaveLength(6);
    } finally {
      await rm(off, { recursive: true, force: true });
      await rm(on, { recursive: true, force: true });
    }
  });

  it('opting out removes the aliases it previously generated', async () => {
    // Without this, dropping the aliases from the lock would strand them on disk forever: they
    // would no longer be checked by `integration update --check`, and nothing would delete them.
    const scratch = await mkdtemp(join(tmpdir(), 'prodshape-shorthand-migrate-'));
    try {
      await run(['init', '--ai', 'copilot', '--shorthand'], scratch);
      const prompts = join(scratch, '.github', 'prompts');
      expect(
        (await listFilesRecursive(prompts, '.md')).filter((f) => toPosix(f).includes('/ps-')),
      ).toHaveLength(6);

      const config = join(scratch, '.product', 'config.yaml');
      const current = await readFile(config, 'utf8');
      await writeFile(
        config,
        current.replace('shorthand-commands: true', 'shorthand-commands: false'),
        'utf8',
      );

      const update = await run(['integration', 'update'], scratch);
      expect(update.code).toBe(0);
      expect(update.out).toContain('Removed 6 managed file(s)');
      expect(
        (await listFilesRecursive(prompts, '.md')).filter((f) => toPosix(f).includes('/ps-')),
      ).toEqual([]);

      const check = await run(['integration', 'update', '--check'], scratch);
      expect(check.code).toBe(0);
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  });

  it('leaves a hand-edited alias in place rather than deleting it', async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'prodshape-shorthand-edited-'));
    try {
      await run(['init', '--ai', 'copilot', '--shorthand'], scratch);
      const edited = join(scratch, '.github', 'prompts', 'ps-change.prompt.md');
      await writeFile(edited, 'my own version\n', 'utf8');

      const config = join(scratch, '.product', 'config.yaml');
      const current = await readFile(config, 'utf8');
      await writeFile(
        config,
        current.replace('shorthand-commands: true', 'shorthand-commands: false'),
        'utf8',
      );

      const update = await run(['integration', 'update', '--force'], scratch);
      expect(update.code).toBe(0);
      // Deletion is digest-guarded: we only remove what we can prove is ours and unmodified.
      expect(await readFile(edited, 'utf8')).toBe('my own version\n');
      expect(update.out).toContain('Removed 5 managed file(s)');
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  });
});

describe('init --flat', () => {
  it('omits the per-kind subdirectories but keeps a validatable model directory', async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'prodshape-flat-'));
    try {
      const result = await run(['init', '--flat'], scratch);
      expect(result.code).toBe(0);
      const files = (await listFilesRecursive(scratch, '.gitkeep')).map((f) =>
        toPosix(f).slice(toPosix(scratch).length + 1),
      );
      expect(files).toContain('docs/product/model/.gitkeep');
      expect(files.filter((f) => f.startsWith('docs/product/model/'))).toHaveLength(1);
      // Change lifecycle states are not taxonomy: discovery, validation and apply read them.
      expect(files).toContain('docs/product/model/.gitkeep');

      const validate = await run(['validate'], scratch);
      expect(validate.code).toBe(0);
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  });
});

describe('init and managed-file lifecycle (end to end)', () => {
  it('init creates the consumer structure with integrations and next steps', async () => {
    const result = await run(['init', '--ai', 'claude,copilot'], workDir);
    expect(result.err).toBe('');
    expect(result.code).toBe(0);
    expect(result.out).toContain('Next steps:');
    expect(result.out).toContain(
      'Create CHG-INITIAL under docs/product/changes/active/chg-initial/',
    );
    expect(result.out).toContain('prodshape change validate CHG-INITIAL');
    expect(result.out).toContain('prodshape change apply CHG-INITIAL --dry-run');
    expect(result.out).toContain('its merge accepts the initial baseline. Apply does not.');
    expect(result.out).toContain(
      'Implementation may share that pull request or follow later; Product Change status never reports delivery.',
    );
    expect(result.out).not.toContain('Author your initial product model under docs/product/model');

    const config = await readFile(join(workDir, '.product', 'config.yaml'), 'utf8');
    expect(config).toContain('- claude');
    expect(config).not.toContain('provider: openspec');
    await readFile(join(workDir, 'docs', 'product', 'README.md'), 'utf8');
    await readFile(join(workDir, '.product', 'templates', 'actor.md'), 'utf8');
    await readFile(join(workDir, '.claude', 'skills', 'define-product', 'SKILL.md'), 'utf8');
    await readFile(join(workDir, '.github', 'prompts', 'product-impact.prompt.md'), 'utf8');
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
    await rm(join(workDir, '.github', 'skills', 'audit-product-model', 'SKILL.md'));
    const missing = await run(['integration', 'update', '--check'], workDir);
    expect(missing.out).toContain('PRODUCT052');
    const diagnostics = await checkIntegrations(workDir);
    expect(diagnostics.map((d) => d.code)).toContain('PRODUCT051');
    // Repair for later tests: regeneration over drift needs explicit --force.
    const repair = await run(['integration', 'update', '--force'], workDir);
    expect(repair.code).toBe(0);
  });

  it('integration update refuses to regenerate over hand-edited files without --force', async () => {
    const managed = join(workDir, '.claude', 'commands', 'product', 'audit.md');
    const original = await readFile(managed, 'utf8');
    const tampered = `${original}\nuser edit that must not be lost\n`;
    await writeFile(managed, tampered, 'utf8');
    const lockBefore = await readFile(join(workDir, '.product', 'installation.lock.json'), 'utf8');

    const refused = await run(['integration', 'update'], workDir);
    expect(refused.code).toBe(1);
    expect(refused.err).toContain('Refusing to overwrite');
    expect(refused.err).toContain('.claude/commands/product/audit.md');
    // Nothing was destroyed: the edit survives and the lock is untouched.
    expect(await readFile(managed, 'utf8')).toBe(tampered);
    expect(await readFile(join(workDir, '.product', 'installation.lock.json'), 'utf8')).toBe(
      lockBefore,
    );

    const forced = await run(['integration', 'update', '--force'], workDir);
    expect(forced.code).toBe(0);
    expect(await readFile(managed, 'utf8')).toBe(original);
  });

  it('integration add refuses to claim files it does not own', async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'product-definition-collide-'));
    try {
      const init = await run(['init'], scratch);
      expect(init.code).toBe(0);
      const userFile = join(scratch, '.claude', 'skills', 'define-product', 'SKILL.md');
      await mkdir(dirname(userFile), { recursive: true });
      await writeFile(userFile, 'my own skill\n', 'utf8');

      const refused = await run(['integration', 'add', 'claude'], scratch);
      expect(refused.code).toBe(1);
      expect(refused.err).toContain('Refusing to overwrite');
      expect(await readFile(userFile, 'utf8')).toBe('my own skill\n');

      const forced = await run(['integration', 'add', 'claude', '--force'], scratch);
      expect(forced.code).toBe(0);
      expect(await readFile(userFile, 'utf8')).toContain('MANAGED FILE');
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  });

  it('doctor reports a healthy repository after repair', async () => {
    const result = await run(['doctor'], workDir);
    expect(result.out).toContain('ok   managed files');
    expect(result.out).toContain('framework version');
    expect(result.code).toBe(0);
  });

  it('doctor reports clean after init', async () => {
    const result = await run(['doctor'], workDir);
    expect(result.out).toContain('ok   configuration');
    expect(result.out).not.toContain('FAIL configuration');
  });
});
