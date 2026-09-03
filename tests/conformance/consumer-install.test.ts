/**
 * Consumer-conformance tests: build, pack, install into a clean repository, and verify
 * that every provider integration produces discoverable, self-contained skills with
 * resolving references, and that the OpenSpec integration is real and verifiable.
 *
 * These tests are the acceptance evidence that a repository installed from the packed
 * npm artifact receives discoverable, self-contained skills and a real, verifiable
 * OpenSpec integration. Snapshot tests alone are not sufficient.
 */
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { access, cp, mkdtemp, readFile, readdir, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runCli } from '@prodshape/cli';
import { repoRoot } from '../helpers.js';

const execFileAsync = promisify(execFile);
const isWindows = process.platform === 'win32';

/**
 * The OpenSpec integration tests drive the real `openspec` CLI (`@fission-ai/openspec`), which is a
 * peer tool, not a dependency of this package: CI installs it (see `.github/workflows/`), but the
 * publish path in `release.yml` deliberately does not, and neither will an arbitrary machine. Probe
 * PATH once — without executing anything, so a CLI-flag change cannot make the probe lie — and skip
 * the OpenSpec-dependent suites when it is absent rather than fail the whole run on a missing
 * external binary. The suites still run in full wherever `openspec` is installed.
 */
function openspecOnPath(): boolean {
  const names = isWindows
    ? ['openspec.cmd', 'openspec.exe', 'openspec.bat', 'openspec']
    : ['openspec'];
  return (process.env.PATH ?? '')
    .split(delimiter)
    .some((dir) => dir.length > 0 && names.some((name) => existsSync(join(dir, name))));
}
const hasOpenspec = openspecOnPath();

let scratch: string;
let tarball: string;

async function run(argv: string[], cwd: string) {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runCli(argv, { cwd, out: (l) => out.push(l), err: (l) => err.push(l) });
  return { code, out: out.join('\n'), err: err.join('\n') };
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readDirRecursive(dir: string): Promise<string[]> {
  const results: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true, recursive: true });
    for (const entry of entries) {
      if (entry.isFile()) {
        results.push(join(entry.parentPath, entry.name));
      }
    }
  } catch {
    // dir doesn't exist
  }
  return results.sort();
}

beforeAll(async () => {
  scratch = await mkdtemp(join(tmpdir(), 'prodshape-conformance-'));

  const cliDir = join(repoRoot, 'packages', 'cli');
  await execFileAsync('npm', ['pack', '--pack-destination', scratch], {
    cwd: cliDir,
    encoding: 'utf8',
    shell: isWindows,
  });
  tarball = (await readdir(scratch)).find((f) => f.endsWith('.tgz'))!;
  expect(tarball).toBeDefined();

  await writeFile(join(scratch, 'package.json'), '{ "name": "scratch", "private": true }\n');
  await execFileAsync('npm', ['install', '--no-audit', '--no-fund', tarball], {
    cwd: scratch,
    encoding: 'utf8',
    shell: isWindows,
  });
}, 180_000);

afterAll(async () => {
  await rm(scratch, { recursive: true, force: true });
});

describe('packed artifact installation', () => {
  it('installs the prodshape binary', async () => {
    const binDir = join(scratch, 'node_modules', '.bin');
    const entries = await readdir(binDir);
    expect(entries.some((e) => e.startsWith('prodshape'))).toBe(true);
  });

  it('prodshape --help works', async () => {
    const bin = join(scratch, 'node_modules', '.bin', isWindows ? 'prodshape.cmd' : 'prodshape');
    const { stdout } = await execFileAsync(bin, ['--help'], {
      cwd: scratch,
      encoding: 'utf8',
      shell: isWindows,
    });
    expect(stdout).toContain('ProductShape');
  });
});

describe('Claude-only installation', () => {
  let claudeDir: string;

  beforeAll(async () => {
    claudeDir = await mkdtemp(join(tmpdir(), 'prodshape-claude-'));
    const result = await run(['init', '--ai', 'claude'], claudeDir);
    expect(result.code, result.err).toBe(0);
  });

  afterAll(async () => {
    await rm(claudeDir, { recursive: true, force: true });
  });

  it('creates .claude/skills/<name>/SKILL.md for every skill', async () => {
    const skillsDir = join(claudeDir, '.claude', 'skills');
    const entries = await readdir(skillsDir);
    expect(entries.sort()).toEqual(
      [
        'analyze-product-change',
        'audit-product-model',
        'bind-consumers',
        'define-product',
        'explore-product',
        'recover-product',
        'refine-product',
      ].sort(),
    );
    for (const name of entries) {
      const skillFile = join(skillsDir, name, 'SKILL.md');
      expect(await exists(skillFile), `${name}/SKILL.md`).toBe(true);
    }
  });

  it('places references inside the skill directory', async () => {
    const defineDir = join(claudeDir, '.claude', 'skills', 'define-product');
    const refDir = join(defineDir, 'references');
    expect(await exists(refDir)).toBe(true);
    const refs = await readdir(refDir);
    expect(refs.length).toBeGreaterThan(0);
  });

  it('installs the graph-guided refine contract from the packed artifact', async () => {
    const skill = await readFile(
      join(claudeDir, '.claude', 'skills', 'refine-product', 'SKILL.md'),
      'utf8',
    );
    expect(skill).toContain('existing hosted product change identified by the host adapter');
    expect(skill).toContain('references/host-adapter.md');
    expect(skill).toContain('host adapter');
    expect(skill).toContain('impact polarity');
    expect(skill).toContain('Ask exactly one question at a time');
    expect(skill).toContain('same hosted change');
    expect(skill).toContain('must never approve, apply or archive');
    expect(skill.toLowerCase()).not.toContain('openspec');
    expect(skill).not.toContain('docs/product/changes/active/<chg-id>');
  });

  it('creates .claude/commands/product/<name>.md for every command', async () => {
    const commandsDir = join(claudeDir, '.claude', 'commands', 'product');
    const entries = await readdir(commandsDir);
    expect(entries.map((e) => e.replace('.md', '')).sort()).toEqual(
      ['audit', 'bind', 'change', 'define', 'explore', 'impact', 'recover', 'refine'].sort(),
    );
  });

  it('every skill reference resolves relative to the skill directory', async () => {
    const skillsDir = join(claudeDir, '.claude', 'skills');
    const skillDirs = await readdir(skillsDir);
    for (const skillName of skillDirs) {
      const skillDir = join(skillsDir, skillName);
      const skillContent = await readFile(join(skillDir, 'SKILL.md'), 'utf8');
      // Check that references to references/ resolve
      const refMatches = skillContent.matchAll(/references\/([^\s)`*]+)/g);
      for (const match of refMatches) {
        const refPath = join(skillDir, 'references', match[1]);
        expect(await exists(refPath), `${skillName}: reference ${match[1]}`).toBe(true);
      }
    }
  });

  it('no installed asset references ProductShape source-only dogfood files', async () => {
    const allFiles = await readDirRecursive(join(claudeDir, '.claude'));
    for (const file of allFiles) {
      const content = await readFile(file, 'utf8');
      // Skills must not reference specific dogfood documentation files that don't exist
      // in consumer installations. Mentions of the model directory path itself are fine.
      expect(content, `${file}: should not reference docs/methodology/`).not.toContain(
        'docs/methodology/',
      );
      expect(content, `${file}: should not reference docs/specification/`).not.toContain(
        'docs/specification/',
      );
      // Only flag specific file references to docs/product/model/ (like .md files), not
      // the directory path itself which is a legitimate instruction.
      expect(content, `${file}: should not reference specific model files`).not.toMatch(
        /docs\/product\/model\/[^\s`*]+\.(md|yaml)/,
      );
      expect(content, `${file}: should not reference remote spec repo`).not.toContain(
        'github.com/product-definition-as-code/spec/blob/main',
      );
    }
  });

  it('generated instructions can resolve the CLI executable', async () => {
    // The managed header says "run: prodshape integration update" — prodshape must be available
    const bin = join(scratch, 'node_modules', '.bin', isWindows ? 'prodshape.cmd' : 'prodshape');
    expect(await exists(bin)).toBe(true);
  });
});

describe('Copilot-only installation', () => {
  let copilotDir: string;

  beforeAll(async () => {
    copilotDir = await mkdtemp(join(tmpdir(), 'prodshape-copilot-'));
    const result = await run(['init', '--ai', 'copilot'], copilotDir);
    expect(result.code, result.err).toBe(0);
  });

  afterAll(async () => {
    await rm(copilotDir, { recursive: true, force: true });
  });

  it('creates .github/skills/<name>/SKILL.md (directory-based, not flat)', async () => {
    const skillsDir = join(copilotDir, '.github', 'skills');
    const entries = await readdir(skillsDir);
    expect(entries.sort()).toEqual(
      [
        'analyze-product-change',
        'audit-product-model',
        'bind-consumers',
        'define-product',
        'explore-product',
        'recover-product',
        'refine-product',
      ].sort(),
    );
    for (const name of entries) {
      const skillFile = join(skillsDir, name, 'SKILL.md');
      expect(await exists(skillFile), `${name}/SKILL.md`).toBe(true);
    }
  });

  it('places references inside the skill directory (not in a separate -references dir)', async () => {
    const defineDir = join(copilotDir, '.github', 'skills', 'define-product');
    const refDir = join(defineDir, 'references');
    expect(await exists(refDir)).toBe(true);
    const refs = await readdir(refDir);
    expect(refs.length).toBeGreaterThan(0);
  });

  it('does NOT create flat .github/skills/<name>.md files', async () => {
    const flatSkill = join(copilotDir, '.github', 'skills', 'define-product.md');
    expect(await exists(flatSkill)).toBe(false);
  });
});

describe('Codex-compatible installation', () => {
  let codexDir: string;

  beforeAll(async () => {
    codexDir = await mkdtemp(join(tmpdir(), 'prodshape-codex-'));
    const result = await run(['init', '--ai', 'codex'], codexDir);
    expect(result.code, result.err).toBe(0);
  });

  afterAll(async () => {
    await rm(codexDir, { recursive: true, force: true });
  });

  it('creates .agents/skills/<name>/SKILL.md for every skill', async () => {
    const skillsDir = join(codexDir, '.agents', 'skills');
    const entries = await readdir(skillsDir);
    expect(entries.sort()).toEqual(
      [
        'analyze-product-change',
        'audit-product-model',
        'bind-consumers',
        'define-product',
        'explore-product',
        'recover-product',
        'refine-product',
      ].sort(),
    );
    for (const name of entries) {
      const skillFile = join(skillsDir, name, 'SKILL.md');
      expect(await exists(skillFile), `${name}/SKILL.md`).toBe(true);
    }
  });

  it('places references inside the skill directory', async () => {
    const defineDir = join(codexDir, '.agents', 'skills', 'define-product');
    const refDir = join(defineDir, 'references');
    expect(await exists(refDir)).toBe(true);
    const refs = await readdir(refDir);
    expect(refs.length).toBeGreaterThan(0);
  });
});

describe('collision detection and file preservation', () => {
  it('detects collisions and preserves pre-existing user files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'prodshape-collision-'));
    try {
      // Create a user-authored file at a path the installer would write
      await mkdir(join(dir, '.claude', 'skills', 'define-product'), { recursive: true });
      await writeFile(
        join(dir, '.claude', 'skills', 'define-product', 'SKILL.md'),
        '---\nname: define-product\ndescription: My custom skill\n---\n# My custom content\n',
      );

      // init should fail with a conflict (error goes to stderr)
      const result = await run(['init', '--ai', 'claude'], dir);
      expect(result.code).not.toBe(0);
      // The conflict is reported in stderr (InstallConflictError → CliError)
      const combined = `${result.out}\n${result.err}`;
      expect(combined).toContain('Refusing to overwrite');

      // The user file should be preserved
      const content = await readFile(
        join(dir, '.claude', 'skills', 'define-product', 'SKILL.md'),
        'utf8',
      );
      expect(content).toContain('My custom content');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('--force overwrites conflicting files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'prodshape-force-'));
    try {
      await mkdir(join(dir, '.claude', 'skills', 'define-product'), { recursive: true });
      await writeFile(
        join(dir, '.claude', 'skills', 'define-product', 'SKILL.md'),
        '---\nname: define-product\ndescription: My custom skill\n---\n# My custom content\n',
      );

      const result = await run(['init', '--ai', 'claude', '--force'], dir);
      expect(result.code, result.err).toBe(0);

      const content = await readFile(
        join(dir, '.claude', 'skills', 'define-product', 'SKILL.md'),
        'utf8',
      );
      expect(content).not.toContain('My custom content');
      expect(content).toContain('MANAGED FILE');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe.skipIf(!hasOpenspec)('OpenSpec integration', () => {
  let openspecDir: string;

  beforeAll(async () => {
    openspecDir = await mkdtemp(join(tmpdir(), 'prodshape-openspec-'));
    // Initialize ProductShape first
    await run(['init'], openspecDir);
    // Initialize OpenSpec (creates openspec/ directory structure)
    await execFileAsync('openspec', ['init', '--tools', 'none'], {
      cwd: openspecDir,
      encoding: 'utf8',
      shell: isWindows,
    });
  });

  afterAll(async () => {
    await rm(openspecDir, { recursive: true, force: true });
  });

  it('integration add openspec creates config and metadata', async () => {
    const result = await run(['integration', 'add', 'openspec'], openspecDir);
    expect(result.code, result.err).toBe(0);

    // Config should exist and contain PDaC context
    const configPath = join(openspecDir, 'openspec', 'config.yaml');
    expect(await exists(configPath)).toBe(true);
    const config = await readFile(configPath, 'utf8');
    expect(config).toContain('pdac:context');

    // Metadata should exist
    const metaPath = join(openspecDir, '.product', 'integrations', 'openspec.json');
    expect(await exists(metaPath)).toBe(true);
  });

  it('integration add openspec is idempotent', async () => {
    const configPath = join(openspecDir, 'openspec', 'config.yaml');
    const configBefore = await readFile(configPath, 'utf8');

    const result = await run(['integration', 'add', 'openspec'], openspecDir);
    expect(result.code, result.err).toBe(0);

    const configAfter = await readFile(configPath, 'utf8');
    expect(configAfter).toBe(configBefore);
  });

  it('integration check reports healthy', async () => {
    const result = await run(['integration', 'check'], openspecDir);
    expect(result.code, result.err).toBe(0);
  });

  it('unrelated OpenSpec configuration survives update', async () => {
    const configPath = join(openspecDir, 'openspec', 'config.yaml');
    // Add a user-authored rule
    let config = await readFile(configPath, 'utf8');
    // Add a user rule to proposal
    config = config.replace(
      'rules:\n  proposal:',
      'rules:\n  proposal:\n    - My custom rule that must survive\n',
    );
    await writeFile(configPath, config);

    const result = await run(['integration', 'update', 'openspec'], openspecDir);
    expect(result.code, result.err).toBe(0);

    config = await readFile(configPath, 'utf8');
    expect(config).toContain('My custom rule that must survive');
  });

  it('integration remove cleans up', async () => {
    const result = await run(['integration', 'remove', 'openspec'], openspecDir);
    expect(result.code, result.err).toBe(0);

    // Metadata should be gone
    const metaPath = join(openspecDir, '.product', 'integrations', 'openspec.json');
    expect(await exists(metaPath)).toBe(false);

    // Config should still exist but without PDaC context
    const configPath = join(openspecDir, 'openspec', 'config.yaml');
    if (await exists(configPath)) {
      const config = await readFile(configPath, 'utf8');
      expect(config).not.toContain('pdac:context');
    }
  });
});

describe.skipIf(!hasOpenspec)('SDD-aware init (one-command OpenSpec adoption)', () => {
  it('init --sdd openspec wires an existing workspace in one run and recommends recovery', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'prodshape-init-sdd-brown-'));
    try {
      await execFileAsync('openspec', ['init', '--tools', 'none'], {
        cwd: dir,
        encoding: 'utf8',
        shell: isWindows,
      });
      const result = await run(['init', '--sdd', 'openspec'], dir);
      expect(result.code, result.err).toBe(0);
      expect(result.out).toContain('detected: OpenSpec');
      expect(result.out).toContain('Installed OpenSpec integration');
      expect(result.out).toContain('Brownfield: recover the product definition');
      expect(await exists(join(dir, '.product', 'integrations', 'openspec.json'))).toBe(true);
      const config = await readFile(join(dir, 'openspec', 'config.yaml'), 'utf8');
      expect(config).toContain('pdac:context');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('init --sdd openspec bootstraps a workspace when none exists', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'prodshape-init-sdd-green-'));
    try {
      const result = await run(['init', '--sdd', 'openspec'], dir);
      expect(result.code, result.err).toBe(0);
      expect(result.out).toContain('Created OpenSpec workspace');
      expect(result.out).toContain('Installed OpenSpec integration');
      // Greenfield: nothing to recover from, so no recovery recommendation.
      expect(result.out).not.toContain('Brownfield: recover');
      expect(await exists(join(dir, 'openspec', 'config.yaml'))).toBe(true);
      expect(await exists(join(dir, '.product', 'integrations', 'openspec.json'))).toBe(true);
      const check = await run(['integration', 'check'], dir);
      expect(check.code, check.out).toBe(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 60_000);

  it('a prompted yes on a detected workspace installs the integration', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'prodshape-init-sdd-prompt-'));
    try {
      await execFileAsync('openspec', ['init', '--tools', 'none'], {
        cwd: dir,
        encoding: 'utf8',
        shell: isWindows,
      });
      const questions: string[] = [];
      const out: string[] = [];
      const code = await runCli(['init'], {
        cwd: dir,
        out: (l) => out.push(l),
        err: () => {},
        prompt: async (question) => {
          questions.push(question);
          return '';
        },
      });
      expect(code).toBe(0);
      expect(questions[0]).toContain('OpenSpec workspace detected');
      expect(await exists(join(dir, '.product', 'integrations', 'openspec.json'))).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('brownfield recovery session (packed binary)', () => {
  let consumerDir: string;
  let bin: string;

  const actorCandidate = [
    '---',
    'id: ACT-SHOPPER',
    'type: actor',
    'title: Shopper',
    'status: draft',
    'actor-kind: human',
    'provenance:',
    '  source: src/orders.ts (checkout flow)',
    '  confidence: high',
    '  recovered-from: observation',
    '---',
    '',
    '## Purpose',
    '',
    'Buys things.',
    '',
    '## Goals',
    '',
    'Complete a purchase.',
    '',
    '## Responsibilities',
    '',
    'Provides payment and address details.',
    '',
    '## Boundaries',
    '',
    'Never edits the catalogue.',
    '',
  ].join('\n');

  const initialChange = [
    '---',
    'id: CHG-INITIAL',
    'type: product-change',
    'title: Establish the first Product Definition',
    'status: draft',
    "base-revision: '0000000'",
    'operations:',
    '  add:',
    '    - ACT-SHOPPER',
    '  modify: []',
    '  remove: []',
    '---',
    '',
    '## Problem',
    '',
    'The system shipped without a product definition.',
    '',
    '## Intended Product Outcome',
    '',
    'A reviewable initial baseline recovered from evidence.',
    '',
    '## Rationale',
    '',
    'Initialisation uses the same mechanism as every later change.',
    '',
    '## Affected Product Areas',
    '',
    'The whole model.',
    '',
    '## Open Questions',
    '',
    'None.',
    '',
    '## Product Acceptance',
    '',
    'The overlay validates and a human accepts the pull request.',
    '',
    '## Out of Scope',
    '',
    'Delivery design.',
    '',
  ].join('\n');

  interface BinaryResult {
    code: number;
    stdout: string;
    stderr: string;
  }

  async function prodshape(args: string[], cwd: string): Promise<BinaryResult> {
    try {
      const { stdout, stderr } = await execFileAsync(bin, args, {
        cwd,
        encoding: 'utf8',
        shell: isWindows,
      });
      return { code: 0, stdout, stderr };
    } catch (error) {
      const failed = error as { code?: number; stdout?: string; stderr?: string };
      return { code: failed.code ?? 1, stdout: failed.stdout ?? '', stderr: failed.stderr ?? '' };
    }
  }

  beforeAll(async () => {
    consumerDir = await mkdtemp(join(tmpdir(), 'prodshape-recovery-e2e-'));
    bin = join(scratch, 'node_modules', '.bin', isWindows ? 'prodshape.cmd' : 'prodshape');
    const init = await prodshape(['init'], consumerDir);
    expect(init.code, init.stderr).toBe(0);
    await mkdir(join(consumerDir, 'src'), { recursive: true });
    await writeFile(
      join(consumerDir, 'src', 'orders.ts'),
      'export const limit = 10_000;\n',
      'utf8',
    );
    await writeFile(
      join(consumerDir, 'brief.yaml'),
      ['scope: The ordering subsystem', 'roots:', '  - src', 'batch-size: 5'].join('\n'),
      'utf8',
    );
  });

  afterAll(async () => {
    await rm(consumerDir, { recursive: true, force: true });
  });

  it('runs a complete, resumable session where every step is a separate process', async () => {
    const start = await prodshape(
      ['recover', 'start', '--brief', 'brief.yaml', '--format', 'json'],
      consumerDir,
    );
    expect(start.code, start.stderr).toBe(0);
    const started = JSON.parse(start.stdout) as { sessionId: string; evidence: number };
    expect(started.sessionId).toBe('session-001');
    expect(started.evidence).toBe(1);

    const next = await prodshape(['recover', 'next', '--format', 'json'], consumerDir);
    expect(next.code, next.stderr).toBe(0);
    const batch = (JSON.parse(next.stdout) as { batch: { id: string; path: string }[] }).batch;
    expect(batch.map((i) => i.path)).toEqual(['src/orders.ts']);

    // The skill's job happens here: author the change and its candidate from the evidence.
    const changeDir = join(consumerDir, 'docs', 'product', 'changes', 'active', 'chg-initial');
    await mkdir(join(changeDir, 'proposed', 'actors'), { recursive: true });
    await writeFile(join(changeDir, 'change.md'), initialChange, 'utf8');
    await writeFile(
      join(changeDir, 'proposed', 'actors', 'act-shopper.md'),
      actorCandidate,
      'utf8',
    );

    const mark = await prodshape(
      [
        'recover',
        'mark',
        '--source',
        'E-0001',
        '--as',
        'represented',
        '--artifacts',
        'ACT-SHOPPER',
        '--complete',
      ],
      consumerDir,
    );
    expect(mark.code, mark.stderr).toBe(0);

    for (const family of [
      'journey',
      'use-case',
      'business-rule',
      'domain-term',
      'bounded-context',
      'functional-requirement',
      'quality-requirement',
      'constraint',
      'structured-behaviour',
    ]) {
      const probe = await prodshape(
        [
          'recover',
          'family',
          family,
          '--none-found',
          '--note',
          'Single-file fixture holds no such evidence',
        ],
        consumerDir,
      );
      expect(probe.code, probe.stderr).toBe(0);
    }

    const check = await prodshape(['recover', 'check', '--format', 'json'], consumerDir);
    expect(check.code, check.stderr).toBe(0);
    const checked = JSON.parse(check.stdout) as {
      issues: { severity: string }[];
      coverage: { completion: { complete: boolean } };
    };
    expect(checked.issues.filter((i) => i.severity === 'error')).toEqual([]);
    expect(checked.coverage.completion.complete).toBe(true);

    // Evidence drift is caught, requires explicit acknowledgement, and heals.
    await writeFile(
      join(consumerDir, 'src', 'orders.ts'),
      'export const limit = 20_000;\n',
      'utf8',
    );
    const drifted = await prodshape(['recover', 'check'], consumerDir);
    expect(drifted.code).toBe(1);
    expect(drifted.stdout).toContain('stale-evidence');
    const remark = await prodshape(
      [
        'recover',
        'mark',
        '--source',
        'E-0001',
        '--as',
        'represented',
        '--artifacts',
        'ACT-SHOPPER',
        '--complete',
        '--accept-changed',
      ],
      consumerDir,
    );
    expect(remark.code, remark.stderr).toBe(0);
    const healed = await prodshape(['recover', 'check'], consumerDir);
    expect(healed.code, healed.stdout).toBe(0);

    const report = await prodshape(['recover', 'report'], consumerDir);
    expect(report.code, report.stderr).toBe(0);
    const reportContent = await readFile(
      join(consumerDir, '.product', 'generated', 'recovery', 'session-001', 'report.md'),
      'utf8',
    );
    expect(reportContent).toContain('## Non-acceptance statement');
    expect(reportContent).toContain('ACT-SHOPPER');

    const status = await prodshape(['recover', 'status', '--format', 'json'], consumerDir);
    expect(status.code, status.stderr).toBe(0);
    const finalState = JSON.parse(status.stdout) as {
      coverage: { completion: { complete: boolean } };
    };
    expect(finalState.coverage.completion.complete).toBe(true);

    // The accepted model stayed empty: recovery proposed, it never wrote the baseline.
    const modelFiles = await readDirRecursive(join(consumerDir, 'docs', 'product', 'model'));
    expect(modelFiles.filter((f) => f.endsWith('.md'))).toEqual([]);
  });

  it('refuses to misuse CHG-INITIAL when a baseline already exists', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'prodshape-recovery-refuse-'));
    try {
      const init = await prodshape(['init'], dir);
      expect(init.code, init.stderr).toBe(0);
      await mkdir(join(dir, 'docs', 'product', 'model', 'actors'), { recursive: true });
      await writeFile(
        join(dir, 'docs', 'product', 'model', 'actors', 'act-shopper.md'),
        actorCandidate.replace('status: draft', 'status: active'),
        'utf8',
      );
      const refused = await prodshape(['recover', 'start'], dir);
      expect(refused.code).toBe(2);
      expect(refused.stderr).toContain('ordinary Product Change');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe.skipIf(!hasOpenspec)('OpenSpec citation enforcement (packed binary)', () => {
  let dir: string;
  let bin: string;

  interface BinaryResult {
    code: number;
    stdout: string;
    stderr: string;
  }

  async function prodshape(args: string[]): Promise<BinaryResult> {
    try {
      const { stdout, stderr } = await execFileAsync(bin, args, {
        cwd: dir,
        encoding: 'utf8',
        shell: isWindows,
      });
      return { code: 0, stdout, stderr };
    } catch (error) {
      const failed = error as { code?: number; stdout?: string; stderr?: string };
      return { code: failed.code ?? 1, stdout: failed.stdout ?? '', stderr: failed.stderr ?? '' };
    }
  }

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'prodshape-openspec-e2e-'));
    bin = join(scratch, 'node_modules', '.bin', isWindows ? 'prodshape.cmd' : 'prodshape');
    const init = await prodshape(['init']);
    expect(init.code, init.stderr).toBe(0);
    // A minimal accepted Product Definition to cite.
    await rm(join(dir, 'docs', 'product', 'model'), { recursive: true, force: true });
    await cp(
      join(repoRoot, 'examples', 'minimal', 'product', 'model'),
      join(dir, 'docs', 'product', 'model'),
      {
        recursive: true,
      },
    );
    await execFileAsync('openspec', ['init', '--tools', 'none'], {
      cwd: dir,
      encoding: 'utf8',
      shell: isWindows,
    });
  }, 120_000);

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('drives add integration → current citation → drift → blocking verification', async () => {
    // 1. Add the integration: it installs the guidance, states the exact provider-aware
    //    verification command, and installs the CI-ready example.
    const add = await prodshape(['integration', 'add', 'openspec']);
    expect(add.code, add.stderr).toBe(0);
    expect(add.stdout).toContain('npx prodshape citations verify --provider openspec');
    const ciExample = await readFile(
      join(dir, '.product', 'integrations', 'openspec.ci.yml'),
      'utf8',
    );
    expect(ciExample).toContain('citations verify --provider openspec');

    // 2. A current change with an unclassified document fails before anything is declared.
    const changeDir = join(dir, 'openspec', 'changes', 'add-shortening');
    await mkdir(changeDir, { recursive: true });
    const inspect = await prodshape(['inspect', 'FR-SHORTEN-001', '--format', 'json']);
    expect(inspect.code, inspect.stderr).toBe(0);
    const digest = (JSON.parse(inspect.stdout) as { digest: string }).digest;
    await writeFile(
      join(changeDir, 'proposal.md'),
      `<!-- pdac-scope: cited -->\n\n## Why\n\nImplements link shortening.\n\n{pdac:cite id="FR-SHORTEN-001" digest="${digest}"}\n`,
      'utf8',
    );
    await writeFile(join(changeDir, 'tasks.md'), '## Tasks\n\n- [ ] Implement\n', 'utf8');
    const unclassified = await prodshape([
      'citations',
      'verify',
      '--provider',
      'openspec',
      '--format',
      'json',
    ]);
    expect(unclassified.code).toBe(1);
    expect(unclassified.stderr).toBe('');
    expect(
      (JSON.parse(unclassified.stdout) as { diagnostics: { code: string }[] }).diagnostics.map(
        (diagnostic) => diagnostic.code,
      ),
    ).toContain('PRODUCT064');

    // 3. A human declares the exemption; the population is fully bound or exempt and passes.
    await writeFile(
      join(changeDir, 'tasks.md'),
      '<!-- pdac-scope: none reason="task list carries no product semantics" -->\n## Tasks\n\n- [ ] Implement\n',
      'utf8',
    );
    const green = await prodshape(['citations', 'verify', '--provider', 'openspec']);
    expect(green.code, green.stdout).toBe(0);
    expect(green.stdout).toContain('1 bound, 1 exempt, 0 unclassified');
    expect(green.stdout).toContain('1 current, 0 stale');

    // 4. The canonical product text changes (as an applied Product Change would): the recorded
    //    dependency becomes visible as stale, governed by the configured warning policy.
    const artifact = join(
      dir,
      'docs',
      'product',
      'model',
      'requirements',
      'functional',
      'fr-shorten-001.md',
    );
    await writeFile(
      artifact,
      `${await readFile(artifact, 'utf8')}\nThe accepted requirement text moved.\n`,
      'utf8',
    );
    const stale = await prodshape(['citations', 'verify', '--provider', 'openspec']);
    expect(stale.code, stale.stdout).toBe(0);
    expect(stale.stdout).toContain('PRODUCT061');

    // 5. With the repository's stale policy escalated, verification blocks.
    await writeFile(
      join(dir, '.product', 'config.yaml'),
      'version: v1alpha1\nvalidation:\n  warnings-as-errors: true\n',
      'utf8',
    );
    const blocking = await prodshape(['citations', 'verify', '--provider', 'openspec']);
    expect(blocking.code).toBe(1);
    expect(blocking.stdout).toContain('PRODUCT061');

    // 6. The review loop: the definition remains correct, so the consumer's citation is
    //    renewed deliberately against the current digest, and the gate goes green again.
    const renewed = await prodshape(['inspect', 'FR-SHORTEN-001', '--format', 'json']);
    const renewedDigest = (JSON.parse(renewed.stdout) as { digest: string }).digest;
    await writeFile(
      join(changeDir, 'proposal.md'),
      `<!-- pdac-scope: cited -->\n\n## Why\n\nImplements link shortening.\n\n{pdac:cite id="FR-SHORTEN-001" digest="${renewedDigest}"}\n`,
      'utf8',
    );
    const recovered = await prodshape(['citations', 'verify', '--provider', 'openspec']);
    expect(recovered.code, recovered.stdout).toBe(0);
  }, 120_000);
});

describe.skipIf(!hasOpenspec)('doctor detects broken integrations', () => {
  it('doctor fails when OpenSpec integration is recorded but config is absent', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'prodshape-doctor-'));
    try {
      // Initialize ProductShape + OpenSpec
      await run(['init'], dir);
      await execFileAsync('openspec', ['init', '--tools', 'none'], {
        cwd: dir,
        encoding: 'utf8',
        shell: isWindows,
      });
      await run(['integration', 'add', 'openspec'], dir);

      // Delete the OpenSpec config to break the integration
      const configPath = join(dir, 'openspec', 'config.yaml');
      await rm(configPath, { force: true });

      const result = await run(['doctor'], dir);
      expect(result.code).not.toBe(0);
      expect(result.out).toContain('FAIL');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
