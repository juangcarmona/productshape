import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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

  it('sorts the complete diagnostic set without reordering citation results', async () => {
    // Create z first so filesystem creation/discovery order cannot accidentally become the output
    // contract. Within each file, source order also differs from file -> code -> target order.
    await writeFile(
      join(workDir, 'specs', 'z-consumer.md'),
      [
        `{pdac:cite id="FR-SHORTEN-001" digest="${VALID_DIGEST}" anchor="MISSING"}`,
        `{pdac:cite id="FR-Z-NOT-FOUND" digest="${VALID_DIGEST}"}`,
        `{pdac:cite id="FR-A-NOT-FOUND" digest="${VALID_DIGEST}"}`,
        '',
      ].join('\n'),
      'utf8',
    );
    await writeFile(
      join(workDir, 'specs', 'a-consumer.md'),
      [
        `{pdac:cite id="FR-Z-UNKNOWN" digest="${VALID_DIGEST}"}`,
        '{pdac:cite id="FR-A-BAD-DIGEST" digest="invalid"}',
        '',
      ].join('\n'),
      'utf8',
    );

    const jsonResult = await run(['citations', 'verify', 'specs', '--format', 'json']);
    const payload = JSON.parse(jsonResult.out.join('\n')) as {
      citations: { id: string; source: string; line: number }[];
      diagnostics: { file: string; code: string; artifact?: string; target?: string }[];
      summary: Record<string, number>;
    };

    expect(jsonResult.code).toBe(1);
    expect(payload.citations.map(({ id, source, line }) => ({ id, source, line }))).toEqual([
      { id: 'FR-Z-UNKNOWN', source: 'specs/a-consumer.md', line: 1 },
      { id: 'FR-A-BAD-DIGEST', source: 'specs/a-consumer.md', line: 2 },
      { id: 'FR-SHORTEN-001', source: 'specs/z-consumer.md', line: 1 },
      { id: 'FR-Z-NOT-FOUND', source: 'specs/z-consumer.md', line: 2 },
      { id: 'FR-A-NOT-FOUND', source: 'specs/z-consumer.md', line: 3 },
    ]);

    const expectedOrder = [
      { file: 'specs/a-consumer.md', code: 'PRODUCT042', artifact: 'FR-A-BAD-DIGEST' },
      { file: 'specs/a-consumer.md', code: 'PRODUCT060', artifact: 'FR-Z-UNKNOWN' },
      { file: 'specs/z-consumer.md', code: 'PRODUCT060', artifact: 'FR-Z-NOT-FOUND' },
      { file: 'specs/z-consumer.md', code: 'PRODUCT060', artifact: 'FR-A-NOT-FOUND' },
      { file: 'specs/z-consumer.md', code: 'PRODUCT063', artifact: 'FR-SHORTEN-001' },
    ];
    expect(
      payload.diagnostics.map(({ file, code, artifact }) => ({ file, code, artifact })),
    ).toEqual(expectedOrder);
    expect(payload.summary).toMatchObject({
      total: 5,
      current: 0,
      stale: 0,
      tampered: 0,
      unresolved: 5,
      errors: 5,
      warnings: 0,
    });

    const textResult = await run(['citations', 'verify', 'specs']);
    const textOrder = textResult.out
      .filter((line) => /^(?:error|warning) PRODUCT\d+ /.test(line))
      .map((line) => {
        const match = /^(?:error|warning) (PRODUCT\d+) (\S+) \[([^\]]+)\]/.exec(line);
        return match ? { file: match[2], code: match[1], artifact: match[3] } : undefined;
      });
    expect(textResult.code).toBe(1);
    expect(textOrder).toEqual(expectedOrder);
  });

  it('sorts OpenSpec scope and CLI diagnostics after the complete set is collected', async () => {
    const noExecutables = join(workDir, 'no-executables');
    await mkdir(noExecutables, { recursive: true });

    const first = join(workDir, 'openspec', 'changes', 'a-change');
    const last = join(workDir, 'openspec', 'changes', 'z-change');
    await mkdir(first, { recursive: true });
    await mkdir(last, { recursive: true });
    await writeFile(join(first, 'proposal.md'), '# Undocumented consumer\n', 'utf8');
    await writeFile(
      join(last, 'proposal.md'),
      `{pdac:cite id="FR-NOT-FOUND" digest="${VALID_DIGEST}"}\n`,
      'utf8',
    );

    const originalPath = process.env.PATH;
    process.env.PATH = noExecutables;
    let result: RunResult;
    try {
      result = await run(['citations', 'verify', '--provider', 'openspec', '--format', 'json']);
    } finally {
      if (originalPath === undefined) delete process.env.PATH;
      else process.env.PATH = originalPath;
    }

    const payload = JSON.parse(result.out.join('\n')) as {
      diagnostics: { file: string; code: string }[];
      summary: Record<string, number>;
    };
    expect(result.code).toBe(1);
    expect(payload.diagnostics.map(({ file, code }) => ({ file, code }))).toEqual([
      { file: 'openspec/', code: 'PRODUCT073' },
      { file: 'openspec/changes/a-change/proposal.md', code: 'PRODUCT070' },
      { file: 'openspec/changes/z-change/proposal.md', code: 'PRODUCT060' },
    ]);
    expect(payload.summary).toMatchObject({
      totalDocuments: 2,
      bound: 1,
      unclassified: 1,
      totalCitations: 1,
      unresolved: 1,
      errors: 3,
      warnings: 0,
    });
  });
});

describe('citations verify provider tip', () => {
  const citation = `{pdac:cite id="FR-NOT-FOUND" digest="${VALID_DIGEST}"}\n`;
  const tipPattern = /^Tip: use --provider openspec/;

  it('stays silent where no OpenSpec workspace exists', async () => {
    await writeFile(join(workDir, 'specs', 'consumer.md'), citation, 'utf8');
    const result = await run(['citations', 'verify', 'specs']);
    expect(result.out.some((line) => tipPattern.test(line))).toBe(false);
  });

  it('prints where an OpenSpec workspace exists and the integration is not wired', async () => {
    await mkdir(join(workDir, 'openspec'), { recursive: true });
    await writeFile(join(workDir, 'specs', 'consumer.md'), citation, 'utf8');
    const result = await run(['citations', 'verify', 'specs']);
    expect(result.out.some((line) => tipPattern.test(line))).toBe(true);
  });

  it('stays silent once the OpenSpec integration is installed', async () => {
    await mkdir(join(workDir, 'openspec'), { recursive: true });
    await mkdir(join(workDir, '.product', 'integrations'), { recursive: true });
    await writeFile(join(workDir, '.product', 'integrations', 'openspec.json'), '{}\n', 'utf8');
    await writeFile(join(workDir, 'specs', 'consumer.md'), citation, 'utf8');
    const result = await run(['citations', 'verify', 'specs']);
    expect(result.out.some((line) => tipPattern.test(line))).toBe(false);
  });

  it('never reaches --format json output', async () => {
    await mkdir(join(workDir, 'openspec'), { recursive: true });
    await writeFile(join(workDir, 'specs', 'consumer.md'), citation, 'utf8');
    const result = await run(['citations', 'verify', 'specs', '--format', 'json']);
    expect(() => JSON.parse(result.out.join('\n'))).not.toThrow();
    expect(result.out.join('\n')).not.toContain('Tip:');
  });
});

describe('citations verify --root', () => {
  it('verifies the named repository from an unrelated working directory', async () => {
    await writeFile(
      join(workDir, 'specs', 'consumer.md'),
      `{pdac:cite id="FR-NOT-FOUND" digest="${VALID_DIGEST}"}\n`,
      'utf8',
    );
    const elsewhere = await mkdtemp(join(tmpdir(), 'prodshape-elsewhere-'));
    try {
      const out: string[] = [];
      const err: string[] = [];
      const code = await runCli(
        ['citations', 'verify', 'specs', '--root', workDir, '--format', 'json'],
        { cwd: elsewhere, out: (l) => out.push(l), err: (l) => err.push(l) },
      );
      const payload = JSON.parse(out.join('\n')) as { summary: { total: number } };
      expect(code).toBe(1);
      expect(payload.summary.total).toBe(1);
    } finally {
      await rm(elsewhere, { recursive: true, force: true });
    }
  });
});

describe('citations verify --provider openspec (scope model)', () => {
  interface ProviderPayload {
    schema: string;
    provider: string;
    documents: {
      path: string;
      state: string;
      declaration: string | null;
      citations: number;
      archived: boolean;
    }[];
    citations: { id: string; source: string; status: string }[];
    diagnostics: { file: string; code: string; severity: string }[];
    summary: Record<string, number>;
  }

  /**
   * Install a fake `openspec` CLI into the work directory's node_modules/.bin, where
   * provider enumeration looks first. It answers `--version` and `list --json` (reading the
   * real openspec/changes/ layout), so the tests are deterministic whether or not a real
   * OpenSpec CLI is installed on the machine.
   */
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
        'process.exit(1);',
      ].join('\n'),
      'utf8',
    );
    await writeFile(join(binDir, 'openspec'), `#!/bin/sh\nexec node "${scriptPath}" "$@"\n`, {
      encoding: 'utf8',
      mode: 0o755,
    });
    await writeFile(join(binDir, 'openspec.cmd'), `@node "${scriptPath}" %*\r\n`, 'utf8');
  }

  async function writeChangeDoc(change: string, file: string, content: string): Promise<void> {
    const dir = join(workDir, 'openspec', 'changes', ...change.split('/'), ...file.split('/'));
    await mkdir(join(dir, '..'), { recursive: true });
    await writeFile(dir, content, 'utf8');
  }

  async function currentDigest(id: string): Promise<string> {
    const result = await run(['inspect', id, '--format', 'json']);
    expect(result.code, result.err.join('\n')).toBe(0);
    return (JSON.parse(result.out.join('\n')) as { digest: string }).digest;
  }

  async function verifyJson(
    ...extra: string[]
  ): Promise<{ code: number; payload: ProviderPayload; raw: string }> {
    const result = await run([
      'citations',
      'verify',
      '--provider',
      'openspec',
      '--format',
      'json',
      ...extra,
    ]);
    return {
      code: result.code,
      payload: JSON.parse(result.out.join('\n')) as ProviderPayload,
      raw: result.out.join('\n'),
    };
  }

  it('passes a population where every current document is bound or exempt, keeping exemptions visible', async () => {
    await installFakeOpenSpec();
    const digest = await currentDigest('FR-SHORTEN-001');
    await writeChangeDoc(
      'add-x',
      'proposal.md',
      `---\npdac-scope: cited\n---\n\n## Why\n\n{pdac:cite id="FR-SHORTEN-001" digest="${digest}"}\n`,
    );
    await writeChangeDoc('add-x', 'design.md', `---\npdac-scope: none\n---\n\n## Design\n`);
    await writeChangeDoc('add-x', 'tasks.md', `<!-- pdac-scope: none -->\n## Tasks\n`);

    const { code, payload } = await verifyJson();
    expect(code).toBe(0);
    expect(payload.schema).toBe('product-definition-as-code/citations-provider/v1alpha1');
    expect(payload.summary).toMatchObject({
      totalDocuments: 3,
      bound: 1,
      exempt: 2,
      unclassified: 0,
      totalCitations: 1,
      current: 1,
      errors: 0,
    });
    // The exemptions pass but remain visible in the results.
    const exempt = payload.documents.filter((d) => d.state === 'exempt');
    expect(exempt.map((d) => d.path).sort()).toEqual([
      'openspec/changes/add-x/design.md',
      'openspec/changes/add-x/tasks.md',
    ]);
    expect(exempt.every((d) => d.declaration === 'none')).toBe(true);

    // Text output keeps the exemptions visible too.
    const text = await run(['citations', 'verify', '--provider', 'openspec']);
    expect(text.code).toBe(0);
    expect(text.out).toContain('exempt\topenspec/changes/add-x/design.md [add-x]\t0 citation(s)');
    expect(
      text.out.some((l) => l.includes('3 document(s): 1 bound, 2 exempt, 0 unclassified')),
    ).toBe(true);
  });

  it('turns a bound document stale when the cited canonical text changes, blocking under warnings-as-errors', async () => {
    await installFakeOpenSpec();
    const digest = await currentDigest('FR-SHORTEN-001');
    await writeChangeDoc(
      'add-x',
      'proposal.md',
      `## Why\n\n{pdac:cite id="FR-SHORTEN-001" digest="${digest}"}\n`,
    );

    const green = await verifyJson();
    expect(green.code).toBe(0);

    // The accepted product text changes: the recorded dependency must become visible.
    const artifactPath = join(
      workDir,
      'docs',
      'product',
      'model',
      'requirements',
      'functional',
      'fr-shorten-001.md',
    );
    const artifact = await readFile(artifactPath, 'utf8');
    await writeFile(artifactPath, `${artifact}\nThe requirement text moved.\n`, 'utf8');

    const stale = await verifyJson();
    expect(stale.payload.citations[0]?.status).toBe('stale');
    expect(stale.payload.diagnostics).toEqual([
      expect.objectContaining({ code: 'PRODUCT061', severity: 'warning' }),
    ]);
    // The repository's configured warning policy governs whether stale blocks.
    expect(stale.code).toBe(0);

    await mkdir(join(workDir, '.product'), { recursive: true });
    await writeFile(
      join(workDir, '.product', 'config.yaml'),
      'validation:\n  warnings-as-errors: true\n',
      'utf8',
    );
    const blocking = await verifyJson();
    expect(blocking.code).toBe(1);
    expect(blocking.payload.diagnostics).toEqual([
      expect.objectContaining({ code: 'PRODUCT061', severity: 'error' }),
    ]);
  });

  it('fails a document declared bound that carries no citations (PRODUCT074)', async () => {
    await installFakeOpenSpec();
    await writeChangeDoc('add-x', 'proposal.md', `---\npdac-scope: cited\n---\n\n## Why\n`);

    const { code, payload } = await verifyJson();
    expect(code).toBe(1);
    expect(payload.documents[0]).toMatchObject({ state: 'bound', citations: 0 });
    expect(payload.diagnostics).toEqual([
      expect.objectContaining({
        code: 'PRODUCT074',
        file: 'openspec/changes/add-x/proposal.md',
      }),
    ]);
  });

  it('fails an invalid scope declaration (PRODUCT075) and an exemption contradicted by citations', async () => {
    await installFakeOpenSpec();
    await writeChangeDoc('add-x', 'proposal.md', `---\npdac-scope: maybe\n---\n\n## Why\n`);
    await writeChangeDoc(
      'add-x',
      'design.md',
      `---\npdac-scope: none\n---\n\n{pdac:cite id="FR-NOT-FOUND" digest="${VALID_DIGEST}"}\n`,
    );

    const { code, payload } = await verifyJson();
    expect(code).toBe(1);
    const codes075 = payload.diagnostics.filter((d) => d.code === 'PRODUCT075');
    expect(codes075.map((d) => d.file).sort()).toEqual([
      'openspec/changes/add-x/design.md',
      'openspec/changes/add-x/proposal.md',
    ]);
    const byPath = new Map(payload.documents.map((d) => [d.path, d]));
    expect(byPath.get('openspec/changes/add-x/proposal.md')?.state).toBe('unclassified');
    expect(byPath.get('openspec/changes/add-x/design.md')?.state).toBe('exempt');
  });

  it('cannot pass vacuously: enumerated documents with zero discovered citations fail', async () => {
    await installFakeOpenSpec();
    await writeChangeDoc('add-x', 'proposal.md', `## Why\n\nNo citations anywhere.\n`);
    await writeChangeDoc('add-x', 'tasks.md', `## Tasks\n`);

    const { code, payload } = await verifyJson();
    expect(code).toBe(1);
    expect(payload.summary).toMatchObject({
      totalDocuments: 2,
      totalCitations: 0,
      unclassified: 2,
    });
    expect(payload.diagnostics.every((d) => d.code === 'PRODUCT070')).toBe(true);
  });

  it('passes a workspace with no current documents, reporting zero totals', async () => {
    await installFakeOpenSpec();
    await mkdir(join(workDir, 'openspec', 'changes'), { recursive: true });

    const { code, payload } = await verifyJson();
    expect(code).toBe(0);
    expect(payload.summary).toMatchObject({ totalDocuments: 0, totalCitations: 0, errors: 0 });
  });

  it('excludes archived changes by default and includes them only with --include-archived', async () => {
    await installFakeOpenSpec();
    await writeChangeDoc('add-x', 'proposal.md', `---\npdac-scope: none\n---\n\n## Why\n`);
    // The archived change would fail if it were in scope: unclassified, unresolved citation.
    await writeChangeDoc('archive/old-x', 'proposal.md', `## Why\n\nOld unclassified doc.\n`);

    const byDefault = await verifyJson();
    expect(byDefault.code).toBe(0);
    expect(byDefault.payload.documents.map((d) => d.path)).toEqual([
      'openspec/changes/add-x/proposal.md',
    ]);

    const withArchived = await verifyJson('--include-archived');
    expect(withArchived.code).toBe(1);
    const archived = withArchived.payload.documents.find((d) => d.archived);
    expect(archived).toMatchObject({
      path: 'openspec/changes/archive/old-x/proposal.md',
      state: 'unclassified',
    });
  });

  it('produces deterministic JSON output across runs', async () => {
    await installFakeOpenSpec();
    await writeChangeDoc('add-x', 'proposal.md', `---\npdac-scope: cited\n---\n\n## Why\n`);
    await writeChangeDoc('add-x', 'design.md', `---\npdac-scope: none\n---\n\n## Design\n`);

    const first = await verifyJson();
    const second = await verifyJson();
    expect(second.raw).toBe(first.raw);
  });

  it('rejects an unknown provider with exit 2', async () => {
    const result = await run(['citations', 'verify', '--provider', 'speckit']);
    expect(result.code).toBe(2);
    expect(result.err.join('\n')).toContain("Unknown provider 'speckit'");
  });

  it('fails with PRODUCT072 when no OpenSpec workspace exists', async () => {
    const { code, payload } = await verifyJson();
    expect(code).toBe(1);
    expect(payload.summary).toMatchObject({ totalDocuments: 0, totalCitations: 0 });
    expect(payload.diagnostics).toEqual([
      expect.objectContaining({ code: 'PRODUCT072', file: 'openspec/' }),
    ]);
  });
});
