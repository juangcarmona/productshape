import { chmod, cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runCli } from '../program.js';

const repoRoot = fileURLToPath(new URL('../../../..', import.meta.url));

let workDir: string;

async function run(argv: string[]): Promise<{ code: number; out: string[]; err: string[] }> {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runCli(argv, {
    cwd: workDir,
    out: (l) => out.push(l),
    err: (l) => err.push(l),
  });
  return { code, out, err };
}

async function driftJson(...extra: string[]) {
  const result = await run(['drift', '--format', 'json', ...extra]);
  return { code: result.code, payload: JSON.parse(result.out.join('\n')) };
}

/** A no-op `openspec` shim so provider enumeration uses the CLI path deterministically. */
async function installFakeOpenSpec(): Promise<void> {
  const binDir = join(workDir, 'node_modules', '.bin');
  await mkdir(binDir, { recursive: true });
  const scriptPath = join(binDir, 'openspec.js');
  await writeFile(
    scriptPath,
    [
      "const { readdirSync } = require('node:fs');",
      'const args = process.argv.slice(2);',
      "if (args[0] === '--version') { console.log('9.9.9'); process.exit(0); }",
      "if (args[0] === 'list') {",
      '  let names = [];',
      '  try {',
      "    names = readdirSync('openspec/changes', { withFileTypes: true })",
      "      .filter((e) => e.isDirectory() && e.name !== 'archive')",
      '      .map((e) => e.name)',
      '      .sort();',
      '  } catch {}',
      '  console.log(JSON.stringify({ changes: names.map((name) => ({ name })) }));',
      '  process.exit(0);',
      '}',
      'process.exit(2);',
    ].join('\n'),
    'utf8',
  );
  const shim = join(binDir, 'openspec');
  await writeFile(shim, `#!/bin/sh\nexec node "${scriptPath}" "$@"\n`, 'utf8');
  await chmod(shim, 0o755);
  await writeFile(`${shim}.cmd`, `@echo off\r\nnode "${scriptPath}" %*\r\n`, 'utf8');
}

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'prodshape-drift-'));
  await mkdir(join(workDir, 'docs', 'product'), { recursive: true });
  await mkdir(join(workDir, '.product'), { recursive: true });
  await writeFile(join(workDir, '.product', 'config.yaml'), 'version: v1alpha1\n', 'utf8');
  await cp(
    join(repoRoot, 'examples', 'minimal', 'product', 'model'),
    join(workDir, 'docs', 'product', 'model'),
    { recursive: true },
  );
  await mkdir(join(workDir, 'openspec'), { recursive: true });
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

describe('drift (recursive scan)', () => {
  it('lists recorded drift warnings with per-id resolution and exits 0', async () => {
    await mkdir(join(workDir, 'openspec', 'changes', 'add-x'), { recursive: true });
    await writeFile(
      join(workDir, 'openspec', 'changes', 'add-x', 'proposal.md'),
      [
        '## Product definition drift',
        '',
        '<!-- pdac-drift ids="FR-SHORTEN-001, FR-MISSING-001" summary="PBI exceeds the accepted rule" -->',
        '',
      ].join('\n'),
      'utf8',
    );

    const { code, payload } = await driftJson();
    expect(code).toBe(0);
    expect(payload.schema).toBe('product-definition-as-code/drift/v1alpha1');
    expect(payload.drift).toEqual([
      expect.objectContaining({
        source: 'openspec/changes/add-x/proposal.md',
        line: 3,
        ids: [
          { id: 'FR-SHORTEN-001', resolves: true },
          { id: 'FR-MISSING-001', resolves: false },
        ],
        summary: 'PBI exceeds the accepted rule',
        malformed: false,
      }),
    ]);
    expect(payload.summary).toMatchObject({ total: 1, documents: 1, unknownIds: 1, malformed: 0 });
  });

  it('reports zero drift as a clean, passing listing', async () => {
    const { code, payload } = await driftJson();
    expect(code).toBe(0);
    expect(payload.summary).toMatchObject({ total: 0, documents: 0 });
  });

  it('does not read the marker syntax quoted in openspec/config.yaml as a recorded warning', async () => {
    await writeFile(
      join(workDir, 'openspec', 'config.yaml'),
      [
        'rules:',
        '  proposal:',
        '    - Record drift with the marker `<!-- pdac-drift ids="<ID>" summary="<one line>" -->` on its own line.',
      ].join('\n'),
      'utf8',
    );
    const { code, payload } = await driftJson();
    expect(code).toBe(0);
    expect(payload.summary.total).toBe(0);
  });

  it('fails with exit 2 when the configured consumer root is missing', async () => {
    await rm(join(workDir, 'openspec'), { recursive: true, force: true });
    const result = await run(['drift']);
    expect(result.code).toBe(2);
    expect(result.err.join('\n')).toContain('citations.consumer-roots');
  });
});

describe('drift --provider openspec', () => {
  it('enumerates current and archived changes, tagging archived material', async () => {
    await installFakeOpenSpec();
    for (const [dir, file] of [
      [join('changes', 'add-x'), 'proposal.md'],
      [join('changes', 'archive', 'old-x'), 'proposal.md'],
    ] as const) {
      await mkdir(join(workDir, 'openspec', dir), { recursive: true });
      await writeFile(
        join(workDir, 'openspec', dir, file),
        '<!-- pdac-drift ids="FR-SHORTEN-001" summary="recorded divergence" -->\n',
        'utf8',
      );
    }

    const { code, payload } = await driftJson('--provider', 'openspec');
    expect(code).toBe(0);
    expect(payload.drift).toEqual([
      expect.objectContaining({ change: 'add-x', archived: false }),
      expect.objectContaining({ change: 'old-x', archived: true }),
    ]);

    const text = await run(['drift', '--provider', 'openspec']);
    expect(text.out.some((l) => l.includes('(archived) [old-x]'))).toBe(true);
    expect(text.out.at(-1)).toContain('2 drift warning(s) across 2 document(s)');
  });

  it('rejects an unknown provider with exit 2', async () => {
    const result = await run(['drift', '--provider', 'nonesuch']);
    expect(result.code).toBe(2);
    expect(result.err.join('\n')).toContain("Unknown provider 'nonesuch'");
    expect(result.err.join('\n')).toContain('openspec, speckit');
  });
});
