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
  workDir = await mkdtemp(join(tmpdir(), 'prodshape-citations-'));
  await mkdir(join(workDir, 'docs', 'product'), { recursive: true });
  await cp(
    join(repoRoot, 'examples', 'minimal', 'model'),
    join(workDir, 'docs', 'product', 'model'),
    { recursive: true },
  );
  await mkdir(join(workDir, 'specs'), { recursive: true });
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

describe('citations verify --format json', () => {
  it('carries the diagnostics array so PRODUCT062 is reachable by a machine reader', async () => {
    // The recorded digest matches neither the embedded block nor the target's current content:
    // tampered and stale at once. Precedence requires tampered, PRODUCT062, and no PRODUCT061.
    const recordedDigest =
      'sha256:2222222222222222222222222222222222222222222222222222222222222222';
    const consumerContent = `<!-- pdac:cite id="FR-SHORTEN-001" digest="${recordedDigest}" -->
This is not the canonical requirement text.
<!-- /pdac:cite -->
`;
    await writeFile(join(workDir, 'specs', 'consumer.md'), consumerContent, 'utf8');

    const result = await run(['citations', 'verify', 'specs', '--format', 'json']);
    const payload = JSON.parse(result.out.join('\n'));

    expect(Array.isArray(payload.diagnostics)).toBe(true);
    const codes = payload.diagnostics.map((d: { code: string }) => d.code);
    expect(codes).toContain('PRODUCT062');
    expect(codes).not.toContain('PRODUCT061');
    expect(payload.citations[0].status).toBe('tampered');
    expect(result.code).toBe(1);
  });
});
