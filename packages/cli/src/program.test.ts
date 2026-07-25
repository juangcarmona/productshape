import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runCli } from './program.js';

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));

interface RunResult {
  code: number;
  out: string[];
  err: string[];
}

async function run(argv: string[], cwd: string): Promise<RunResult> {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runCli(argv, { cwd, out: (l) => out.push(l), err: (l) => err.push(l) });
  return { code, out, err };
}

let workDir: string;

beforeAll(async () => {
  // A standalone consumer-shaped repository built from examples/minimal.
  workDir = await mkdtemp(join(tmpdir(), 'product-definition-cli-'));
  await mkdir(join(workDir, 'docs', 'product'), { recursive: true });
  await cp(
    join(repoRoot, 'examples', 'minimal', 'model'),
    join(workDir, 'docs', 'product', 'model'),
    {
      recursive: true,
    },
  );
});

afterAll(async () => {
  await rm(workDir, { recursive: true, force: true });
});

describe('product-definition validate', () => {
  it('exits 0 on the minimal example', async () => {
    const result = await run(['validate'], workDir);
    expect(result.err).toEqual([]);
    expect(result.code).toBe(0);
    expect(result.out.at(-1)).toMatch(/0 error\(s\), 0 warning\(s\)/);
  });

  it('emits machine-readable diagnostics with --format json', async () => {
    const result = await run(['validate', '--format', 'json'], workDir);
    expect(result.code).toBe(0);
    const parsed = JSON.parse(result.out.join('\n')) as { diagnostics: unknown[] };
    expect(parsed.diagnostics).toEqual([]);
  });

  it('exits 1 on validation errors', async () => {
    const brokenDir = join(workDir, 'docs', 'product', 'model', 'use-cases');
    const brokenFile = join(brokenDir, 'uc-broken-001.md');
    await writeFile(
      brokenFile,
      [
        '---',
        'id: UC-BROKEN-001',
        'type: use-case',
        'title: Broken',
        'status: active',
        'primary-actor: ACT-GHOST',
        '---',
        '',
        '## Goal',
        'x',
        '## Trigger',
        'x',
        '## Preconditions',
        'x',
        '## Main Flow',
        'x',
        '## Alternative Flows',
        'x',
        '## Failure Conditions',
        'x',
        '## Postconditions',
        'x',
        '',
      ].join('\n'),
      'utf8',
    );
    const result = await run(['validate'], workDir);
    await rm(brokenFile);
    expect(result.code).toBe(1);
    expect(result.out.join('\n')).toContain('PRODUCT006');
  });

  it('exits 2 outside a product repository', async () => {
    const emptyDir = await mkdtemp(join(tmpdir(), 'product-definition-empty-'));
    const result = await run(['validate'], emptyDir);
    await rm(emptyDir, { recursive: true, force: true });
    expect(result.code).toBe(2);
  });

  it('exits 2 on invalid configuration', async () => {
    const badDir = await mkdtemp(join(tmpdir(), 'product-definition-badcfg-'));
    await mkdir(join(badDir, '.product'), { recursive: true });
    await writeFile(join(badDir, '.product', 'config.yaml'), 'plugins:\n  - nope\n', 'utf8');
    const result = await run(['validate'], badDir);
    await rm(badDir, { recursive: true, force: true });
    expect(result.code).toBe(2);
    expect(result.err.join('\n')).toContain('PRODUCT050');
  });
});

describe('product-definition graph / inspect / impact', () => {
  it('graph prints a summary and writes generated outputs', async () => {
    const result = await run(['graph'], workDir);
    expect(result.code).toBe(0);
    expect(result.out[0]).toMatch(/9 node\(s\), \d+ edge\(s\)/);
  });

  it('graph --format mermaid emits mermaid', async () => {
    const result = await run(['graph', '--format', 'mermaid'], workDir);
    expect(result.code).toBe(0);
    expect(result.out.join('\n')).toMatch(/^flowchart LR/);
  });

  it('inspect shows outgoing and derived incoming relationships', async () => {
    const result = await run(['inspect', 'BC-SHORTENING'], workDir);
    expect(result.code).toBe(0);
    const text = result.out.join('\n');
    expect(text).toContain('TERM-SHORT-LINK defined-in -> this');
    expect(text).toContain('owns-terms (derived): TERM-SHORT-LINK');
  });

  it('inspect exits 1 on an unknown ID', async () => {
    const result = await run(['inspect', 'UC-GHOST-001'], workDir);
    expect(result.code).toBe(1);
    expect(result.err.join('\n')).toContain('UC-GHOST-001');
  });

  it('impact distinguishes direct from transitive', async () => {
    const result = await run(['impact', 'BR-VALID-URL-001', '--direction', 'incoming'], workDir);
    expect(result.code).toBe(0);
    const text = result.out.join('\n');
    expect(text).toMatch(/direct \(\d+\):[\s\S]*UC-SHORTEN-001/);
    expect(text).toMatch(/transitive \(\d+\):[\s\S]*JRN-SHARE-001/);
  });

  it('impact rejects an invalid direction with exit 2', async () => {
    const result = await run(['impact', 'BR-VALID-URL-001', '--direction', 'sideways'], workDir);
    expect(result.code).toBe(2);
  });

  it('unknown commands exit 2', async () => {
    const result = await run(['definitely-not-a-command'], workDir);
    expect(result.code).toBe(2);
  });
});

describe('self-application', () => {
  it('validates this repository with exit 0', async () => {
    const result = await run(['validate'], repoRoot);
    expect(result.code).toBe(0);
    // 59 artifacts and 2 accepted PRODUCT106 term warnings after CHG-BRAND-001 promotion.
    expect(result.out.at(-1)).toMatch(/0 error\(s\), 2 warning\(s\) across 59 artifact\(s\)/);
  });
});
