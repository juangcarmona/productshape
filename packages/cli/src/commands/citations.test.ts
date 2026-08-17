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

const VALID_DIGEST = 'sha256:0000000000000000000000000000000000000000000000000000000000000000';

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

  it('retains recursive directory verification', async () => {
    await writeFile(
      join(workDir, 'specs', 'consumer.md'),
      `{pdac:cite id="FR-NOT-FOUND" digest="${VALID_DIGEST}"}\n`,
      'utf8',
    );

    const result = await run(['citations', 'verify', 'specs', '--format', 'json']);
    const payload = JSON.parse(result.out.join('\n'));

    expect(result.code).toBe(1);
    expect(payload.summary.total).toBe(1);
    expect(payload.citations[0]).toMatchObject({
      id: 'FR-NOT-FOUND',
      source: 'specs/consumer.md',
      status: 'unresolved',
    });
  });

  it('verifies exactly one Markdown consumer when given a file target', async () => {
    const target = join('specs', 'consumer.md');
    await writeFile(
      join(workDir, target),
      `{pdac:cite id="FR-NOT-FOUND" digest="${VALID_DIGEST}"}\n`,
      'utf8',
    );

    const result = await run(['citations', 'verify', target, '--format', 'json']);
    const payload = JSON.parse(result.out.join('\n'));

    expect(result.code).toBe(1);
    expect(payload.summary.total).toBe(1);
    expect(payload.citations[0].source).toBe('specs/consumer.md');
    expect(result.err.join('\n')).not.toMatch(/ENOTDIR|internal error/i);
  });

  it.each(['yaml', 'yml'])(
    'verifies exactly one .%s sidecar when given a file target',
    async (ext) => {
      const target = join('specs', `spec-fixture.citations.${ext}`);
      await writeFile(
        join(workDir, target),
        `citations:\n  - id: FR-NOT-FOUND\n    digest: ${VALID_DIGEST}\n`,
        'utf8',
      );

      const result = await run(['citations', 'verify', target, '--format', 'json']);
      const payload = JSON.parse(result.out.join('\n'));

      expect(result.code).toBe(1);
      expect(payload.summary.total).toBe(1);
      expect(payload.citations[0]).toMatchObject({
        id: 'FR-NOT-FOUND',
        source: `specs/spec-fixture.citations.${ext}`,
        form: 'sidecar-ledger',
        status: 'unresolved',
      });
      expect(result.err.join('\n')).not.toMatch(/ENOTDIR|internal error/i);
    },
  );

  it('fails with exit 2 and a controlled message when the target is missing', async () => {
    const target = join('specs', 'missing.md');
    const result = await run(['citations', 'verify', target, '--format', 'json']);

    expect(result.code).toBe(2);
    expect(result.err.join('\n')).toContain(`Citation target not found: '${target}'`);
    expect(result.err.join('\n')).not.toMatch(/ENOTDIR|internal error/i);
  });

  it('fails with exit 2 and a controlled message for an unsupported file type', async () => {
    const target = join('specs', 'consumer.txt');
    await writeFile(join(workDir, target), 'not a supported consumer document\n', 'utf8');

    const result = await run(['citations', 'verify', target, '--format', 'json']);

    expect(result.code).toBe(2);
    expect(result.err.join('\n')).toContain("Unsupported citation target file type '.txt'");
    expect(result.err.join('\n')).not.toMatch(/ENOTDIR|internal error/i);
  });

  it('discovers and checks a specification-shaped citations mapping', async () => {
    await writeFile(
      join(workDir, 'specs', 'spec-fixture.citations.yml'),
      `citations:\n  - id: FR-NOT-FOUND\n    digest: ${VALID_DIGEST}\n    anchor: S1\n`,
      'utf8',
    );

    const result = await run(['citations', 'verify', 'specs', '--format', 'json']);
    const payload = JSON.parse(result.out.join('\n'));

    expect(result.code).toBe(1);
    expect(payload.summary.total).toBe(1);
    expect(payload.summary.unresolved).toBe(1);
    expect(payload.citations[0]).toMatchObject({
      id: 'FR-NOT-FOUND',
      source: 'specs/spec-fixture.citations.yml',
      form: 'sidecar-ledger',
      status: 'unresolved',
    });
    expect(payload.diagnostics).toEqual([
      expect.objectContaining({ code: 'PRODUCT060', file: 'specs/spec-fixture.citations.yml' }),
    ]);
  });
});
