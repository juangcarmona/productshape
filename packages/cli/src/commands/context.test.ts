import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runCli } from '../program.js';

const repoRoot = fileURLToPath(new URL('../../../..', import.meta.url));

interface RunResult {
  code: number;
  out: string[];
  err: string[];
}

let workDir: string;

async function run(argv: string[]): Promise<RunResult> {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runCli(argv, {
    cwd: workDir,
    out: (l) => out.push(l),
    err: (l) => err.push(l),
  });
  return { code, out, err };
}

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'prodshape-context-'));
  await mkdir(join(workDir, 'docs', 'product'), { recursive: true });
  await cp(
    join(repoRoot, 'examples', 'minimal', 'model'),
    join(workDir, 'docs', 'product', 'model'),
    { recursive: true },
  );
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

describe('context', () => {
  it('renders the requested artifact with a ready inline citation and the related listing', async () => {
    const result = await run(['context', 'FR-SHORTEN-001']);
    expect(result.code).toBe(0);
    const text = result.out.join('\n');

    expect(text).toContain('# Product context: FR-SHORTEN-001');
    expect(text).toMatch(/\{pdac:cite id="FR-SHORTEN-001" digest="sha256:[0-9a-f]{64}"\}/);
    // The projection announces itself as derived and non-canonical.
    expect(text).toContain('Derived, non-canonical projection');
    // The structural neighborhood is listed with its own ready citations.
    expect(text).toContain('## Related artifacts');
    expect(text).toMatch(/UC-SHORTEN-001.*\{pdac:cite id="UC-SHORTEN-001"/);
  });

  it('emits citations that verify as current against the model they were generated from', async () => {
    const result = await run(['context', 'FR-SHORTEN-001', 'BR-VALID-URL-001']);
    expect(result.code).toBe(0);

    await mkdir(join(workDir, 'specs'), { recursive: true });
    await writeFile(join(workDir, 'specs', 'context.md'), result.out.join('\n'), 'utf8');

    const verify = await run(['citations', 'verify', 'specs', '--format', 'json']);
    expect(verify.code).toBe(0);
    const payload = JSON.parse(verify.out.join('\n'));
    expect(payload.summary.total).toBeGreaterThanOrEqual(2);
    expect(payload.summary.current).toBe(payload.summary.total);
    expect(payload.summary.stale).toBe(0);
    expect(payload.summary.unresolved).toBe(0);
  });

  it('is deterministic for a given model state', async () => {
    const first = await run(['context', 'FR-SHORTEN-001', '--format', 'json']);
    const second = await run(['context', 'FR-SHORTEN-001', '--format', 'json']);
    expect(first.out.join('\n')).toBe(second.out.join('\n'));

    const payload = JSON.parse(first.out.join('\n'));
    expect(payload.schema).toBe('product-definition-as-code/context/v1alpha1');
    expect(payload.requested[0]).toMatchObject({ id: 'FR-SHORTEN-001' });
    expect(typeof payload.requested[0].body).toBe('string');
    expect(payload.related.length).toBeGreaterThan(0);
  });

  it('rejects an unknown artifact ID', async () => {
    const result = await run(['context', 'FR-DOES-NOT-EXIST']);
    expect(result.code).toBe(1);
    expect(result.err.join('\n')).toContain("Unknown artifact ID 'FR-DOES-NOT-EXIST'");
  });

  it('rejects an invalid depth', async () => {
    const result = await run(['context', 'FR-SHORTEN-001', '--depth', 'zero']);
    expect(result.code).toBe(2);
    expect(result.err.join('\n')).toContain("Invalid --depth 'zero'");
  });
});
