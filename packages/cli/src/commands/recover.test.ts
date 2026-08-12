import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { CliError } from '../context.js';
import {
  runRecoverCheck,
  runRecoverEvidenceAdd,
  runRecoverMark,
  runRecoverNext,
  runRecoverQuestionAdd,
  runRecoverReport,
  runRecoverStart,
  runRecoverStatus,
} from './recover.js';

const scratchDirs: string[] = [];

afterAll(async () => {
  for (const dir of scratchDirs) await rm(dir, { recursive: true, force: true });
});

interface RunResult {
  code: number;
  out: string;
  err: string;
}

/** Run one command function with the same error contract the program loop applies. */
async function run(
  cwd: string,
  fn: (io: { cwd: string; out: (l: string) => void; err: (l: string) => void }) => Promise<number>,
): Promise<RunResult> {
  const out: string[] = [];
  const err: string[] = [];
  const io = { cwd, out: (l: string) => out.push(l), err: (l: string) => err.push(l) };
  try {
    const code = await fn(io);
    return { code, out: out.join('\n'), err: err.join('\n') };
  } catch (error) {
    if (error instanceof CliError) {
      return { code: error.exitCode, out: out.join('\n'), err: [...err, error.message].join('\n') };
    }
    throw error;
  }
}

async function makeRepo(files: Record<string, string> = {}): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'prodshape-recover-cli-'));
  scratchDirs.push(root);
  await mkdir(join(root, 'docs', 'product', 'model'), { recursive: true });
  for (const [rel, content] of Object.entries(files)) {
    const absolute = join(root, ...rel.split('/'));
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, content, 'utf8');
  }
  return root;
}

describe('recover start', () => {
  it('starts from a brief file and reports the inventory as JSON', async () => {
    const root = await makeRepo({
      'src/orders.ts': 'code\n',
      'src/legacy/old.ts': 'legacy\n',
      'brief.yaml': ['roots:', '  - src', 'exclude:', "  - 'src/legacy/**'", 'batch-size: 5'].join(
        '\n',
      ),
    });
    const result = await run(root, (io) =>
      runRecoverStart(io, { brief: 'brief.yaml', format: 'json' }),
    );
    expect(result.code, result.err).toBe(0);
    const parsed = JSON.parse(result.out) as {
      sessionId: string;
      evidence: number;
      changeDir: string;
    };
    expect(parsed.sessionId).toBe('session-001');
    // brief.yaml itself is outside the declared root, so a single source remains.
    expect(parsed.evidence).toBe(1);
    expect(parsed.changeDir).toBe('docs/product/changes/active/chg-initial');
  });

  it('rejects an invalid brief with exit code 2 and every defect listed', async () => {
    const root = await makeRepo({
      'brief.yaml': ['surprise: true', 'batch-size: none'].join('\n'),
    });
    const result = await run(root, (io) => runRecoverStart(io, { brief: 'brief.yaml' }));
    expect(result.code).toBe(2);
    expect(result.err).toContain("Unknown recovery brief key 'surprise'");
    expect(result.err).toContain("'batch-size' must be an integer");
  });

  it('refuses a repository that already has a baseline', async () => {
    const root = await makeRepo({
      'docs/product/model/actors/act-a.md': [
        '---',
        'id: ACT-A',
        'type: actor',
        'title: A',
        'status: active',
        'actor-kind: human',
        '---',
        '',
        '## Purpose',
        '',
        'x',
        '',
        '## Goals',
        '',
        'x',
        '',
        '## Responsibilities',
        '',
        'x',
        '',
        '## Boundaries',
        '',
        'x',
        '',
      ].join('\n'),
    });
    const result = await run(root, (io) => runRecoverStart(io, {}));
    expect(result.code).toBe(2);
    expect(result.err).toContain('ordinary Product Change');
  });
});

describe('the session loop through the command layer', () => {
  it('next, mark, question, check and report cooperate end to end', async () => {
    const root = await makeRepo({ 'src/orders.ts': 'code\n' });
    expect((await run(root, (io) => runRecoverStart(io, {}))).code).toBe(0);

    const next = await run(root, (io) => runRecoverNext(io, { format: 'json' }));
    expect(next.code).toBe(0);
    const batch = (JSON.parse(next.out) as { batch: { id: string; path: string }[] }).batch;
    expect(batch.map((i) => i.path)).toEqual(['src/orders.ts']);

    const question = await run(root, (io) =>
      runRecoverQuestionAdd(io, { text: 'Is this the whole product?', format: 'json' }),
    );
    expect(question.code).toBe(0);

    const mark = await run(root, (io) =>
      runRecoverMark(io, {
        source: 'E-0001',
        as: 'no-product-intent',
        reason: 'Scaffolding only',
        complete: true,
      }),
    );
    expect(mark.code, mark.err).toBe(0);
    expect(mark.out).toContain('processed');

    // The open question keeps the session incomplete; check still exits clean because open
    // work is normal, not an inconsistency.
    const check = await run(root, (io) => runRecoverCheck(io, {}));
    expect(check.code, check.err).toBe(0);
    expect(check.out).toContain('Complete: no');

    const status = await run(root, (io) => runRecoverStatus(io, { format: 'json' }));
    expect(status.code).toBe(0);
    const coverage = (
      JSON.parse(status.out) as { coverage: { completion: { criteria: Record<string, boolean> } } }
    ).coverage;
    expect(coverage.completion.criteria.questionsResolved).toBe(false);

    const report = await run(root, (io) => runRecoverReport(io, {}));
    expect(report.code).toBe(0);
    expect(report.out).toContain('report.md');
  });

  it('check exits 1 on stale evidence', async () => {
    const root = await makeRepo({ 'src/orders.ts': 'code\n' });
    await run(root, (io) => runRecoverStart(io, {}));
    await run(root, (io) =>
      runRecoverMark(io, {
        source: 'E-0001',
        as: 'no-product-intent',
        reason: 'Scaffolding',
        complete: true,
      }),
    );
    await writeFile(join(root, 'src', 'orders.ts'), 'changed\n', 'utf8');
    const check = await run(root, (io) => runRecoverCheck(io, {}));
    expect(check.code).toBe(1);
    expect(check.out).toContain('stale-evidence');
  });

  it('rejects unknown classifications and empty mark invocations', async () => {
    const root = await makeRepo({ 'src/orders.ts': 'code\n' });
    await run(root, (io) => runRecoverStart(io, {}));
    const unknown = await run(root, (io) =>
      runRecoverMark(io, { source: 'E-0001', as: 'looks-fine' }),
    );
    expect(unknown.code).toBe(2);
    expect(unknown.err).toContain("Unknown classification 'looks-fine'");
    const empty = await run(root, (io) => runRecoverMark(io, { source: 'E-0001' }));
    expect(empty.code).toBe(2);
    expect(empty.err).toContain('Nothing to record');
  });

  it('external evidence without authorisation is refused through the command layer too', async () => {
    const root = await makeRepo({ 'src/orders.ts': 'code\n' });
    await run(root, (io) => runRecoverStart(io, {}));
    const refused = await run(root, (io) =>
      runRecoverEvidenceAdd(io, { url: 'https://example.test', title: 'Docs' }),
    );
    expect(refused.code).toBe(2);
    expect(refused.err).toContain('explicit user authorisation');
    const allowed = await run(root, (io) =>
      runRecoverEvidenceAdd(io, { url: 'https://example.test', title: 'Docs', authorized: true }),
    );
    expect(allowed.code).toBe(0);
  });
});
