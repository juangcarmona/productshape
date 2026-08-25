import { access, cp, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
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
  await mkdir(join(workDir, '.product'), { recursive: true });
  await writeFile(join(workDir, '.product', 'config.yaml'), 'version: v1alpha1\n', 'utf8');
  await cp(
    join(repoRoot, 'examples', 'minimal', 'product', 'model'),
    join(workDir, 'docs', 'product', 'model'),
    {
      recursive: true,
    },
  );
});

afterAll(async () => {
  await rm(workDir, { recursive: true, force: true });
});

describe('prodshape cite', () => {
  const digest = 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

  it('emits the canonical payload by default and canonical mapping sidecar on request', async () => {
    const payload = await run(['cite', '--id', 'FR-ONE', '--digest', digest], workDir);
    expect(payload).toEqual({
      code: 0,
      err: [],
      out: [`pdac:cite id="FR-ONE" digest="${digest}"`],
    });

    const sidecar = await run(
      ['cite', '--id', 'FR-ONE', '--digest', digest, '--anchor', 'S1', '--form', 'sidecar-ledger'],
      workDir,
    );
    expect(sidecar.code).toBe(0);
    expect(sidecar.out.join('\n')).toBe(
      `citations:\n  - id: FR-ONE\n    digest: ${digest}\n    anchor: S1`,
    );
  });

  it('refuses to emit an unverifiable empty marker block', async () => {
    const result = await run(
      ['cite', '--id', 'FR-ONE', '--digest', digest, '--form', 'marker-block'],
      workDir,
    );
    expect(result.code).toBe(2);
    expect(result.err.join('\n')).toContain('whole artifact projection');
    expect(result.out).toEqual([]);
  });
});

describe('prodshape validate', () => {
  it('--version prints the CLI package version and exits 0', async () => {
    const packageJson = JSON.parse(
      await readFile(join(repoRoot, 'packages', 'cli', 'package.json'), 'utf8'),
    ) as { version: string };
    const result = await run(['--version'], workDir);
    expect(result.code).toBe(0);
    expect(result.err).toEqual([]);
    expect(result.out).toEqual([packageJson.version]);

    const short = await run(['-v'], workDir);
    expect(short.code).toBe(0);
    expect(short.out).toEqual([packageJson.version]);
  });

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

  it('--root validates the named repository instead of discovering upward', async () => {
    // The working directory is unrelated: only the explicit root decides what is validated.
    const elsewhere = await mkdtemp(join(tmpdir(), 'product-definition-elsewhere-'));
    try {
      const result = await run(['validate', '--root', workDir], elsewhere);
      expect(result.err).toEqual([]);
      expect(result.code).toBe(0);
      expect(result.out.at(-1)).toMatch(/0 error\(s\), 0 warning\(s\)/);
    } finally {
      await rm(elsewhere, { recursive: true, force: true });
    }
  });

  it('change validate accepts --root like validate: conformance fixtures run in a plain working copy', async () => {
    const elsewhere = await mkdtemp(join(tmpdir(), 'product-definition-elsewhere-'));
    try {
      const result = await run(['change', 'validate', '--root', workDir], elsewhere);
      expect(result.code).toBe(0);
    } finally {
      await rm(elsewhere, { recursive: true, force: true });
    }
  });

  it('reports an invalid configuration as JSON on stdout under --format json', async () => {
    // The configuration contract promises PRODUCT050 in machine-readable output too; a runner
    // parsing stdout must not be left with an empty document and a text-only stderr.
    const broken = await mkdtemp(join(tmpdir(), 'product-definition-brokencfg-'));
    try {
      await mkdir(join(broken, '.product'), { recursive: true });
      await writeFile(join(broken, '.product', 'config.yaml'), 'version: v9\n', 'utf8');
      const result = await run(['validate', '--root', broken, '--format', 'json'], workDir);
      expect(result.code).toBe(2);
      const parsed = JSON.parse(result.out.join('\n')) as {
        diagnostics: { code: string; field?: string }[];
      };
      expect(parsed.diagnostics).toEqual([
        expect.objectContaining({ code: 'PRODUCT050', field: 'version' }),
      ]);
    } finally {
      await rm(broken, { recursive: true, force: true });
    }
  });

  it('--root keeps examples/minimal directly runnable as a self-contained repository', async () => {
    const result = await run(
      ['validate', '--root', join(repoRoot, 'examples', 'minimal')],
      workDir,
    );
    expect(result.err).toEqual([]);
    expect(result.code).toBe(0);
    expect(result.out.at(-1)).toMatch(/0 error\(s\), 0 warning\(s\) across 9 artifact\(s\)/);
  });

  it('--root refuses a directory that is not a product repository with exit 2', async () => {
    const empty = await mkdtemp(join(tmpdir(), 'product-definition-empty-'));
    try {
      const result = await run(['validate', '--root', empty], workDir);
      expect(result.code).toBe(2);
      expect(result.err.join('\n')).toContain('No product repository at');
    } finally {
      await rm(empty, { recursive: true, force: true });
    }
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

  it('writes nothing: generation is opt-in', async () => {
    // A read-only verdict must not mutate the tree to produce it. Writing generated files as a
    // side effect left untracked `.product/` directories wherever validate ran, including inside
    // other repositories' conformance fixtures.
    const cleanDir = await mkdtemp(join(tmpdir(), 'product-definition-readonly-'));
    try {
      await mkdir(join(cleanDir, 'docs', 'product'), { recursive: true });
      await mkdir(join(cleanDir, '.product'), { recursive: true });
      await writeFile(join(cleanDir, '.product', 'config.yaml'), 'version: v1alpha1\n', 'utf8');
      await cp(
        join(repoRoot, 'examples', 'minimal', 'product', 'model'),
        join(cleanDir, 'docs', 'product', 'model'),
        { recursive: true },
      );

      const result = await run(['validate'], cleanDir);
      expect(result.code).toBe(0);
      await expect(access(join(cleanDir, '.product', 'generated'))).rejects.toThrow();

      // --write-generated refreshes them on request.
      const written = await run(['validate', '--write-generated'], cleanDir);
      expect(written.code).toBe(0);
      const diagnostics = await readFile(
        join(cleanDir, '.product', 'generated', 'diagnostics.json'),
        'utf8',
      );
      expect(JSON.parse(diagnostics)).toMatchObject({ diagnostics: [] });
    } finally {
      await rm(cleanDir, { recursive: true, force: true });
    }
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

describe('prodshape graph / inspect / impact', () => {
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

  it('graph --format html writes one self-contained snapshot and reports its path', async () => {
    const result = await run(['graph', '--format', 'html'], workDir);
    expect(result.code).toBe(0);
    expect(result.out.at(-1)).toMatch(/snapshot\.html$/);
    const snapshotPath = join(workDir, '.product', 'generated', 'snapshot.html');
    const html = await readFile(snapshotPath, 'utf8');
    // Every artifact of the model is contained in the file (the graph summary reports 9 nodes),
    // carried as inert data rather than rendered into the opening document.
    const open = '<script id="snapshot-data" type="application/json">';
    const dataStart = html.indexOf(open) + open.length;
    const data = JSON.parse(
      html.slice(dataStart, html.indexOf('</script>', dataStart)).replaceAll('\\u003c', '<'),
    ) as { artifacts: { id: string }[]; edges: unknown[] };
    expect(data.artifacts.length).toBe(9);
    expect(html).toMatch(/revision (unavailable|[0-9a-f]{40})/);
    // The opening document orients without exposing the whole product model: no artifact body, no graph.
    const opening = html.slice(html.indexOf('<body'), html.indexOf('<script id='));
    expect(opening).toContain('Product Snapshot');
    expect(opening).toContain('Relationships by kind');
    expect(opening).not.toContain('<circle');
    expect(opening).not.toContain('<svg');
    // Self-contained and read-only: the inert data block and the application block, nothing else.
    expect((html.match(/<script/g) ?? []).length).toBe(2);
    expect(html).toContain(open);
    expect(html).not.toContain('src=');
    expect(html).not.toContain('<link');
    expect(html).not.toContain('<form');
    // Relationships and the whole-model graph are reachable, built on demand from that data.
    expect(html).toContain('Referenced by (derived)');
    expect(html).toContain('id="graph-host"');
  });

  it('graph --format html is byte-identical across regenerations', async () => {
    const snapshotPath = join(workDir, '.product', 'generated', 'snapshot.html');
    await run(['graph', '--format', 'html'], workDir);
    const first = await readFile(snapshotPath, 'utf8');
    await rm(snapshotPath);
    await run(['graph', '--format', 'html'], workDir);
    const second = await readFile(snapshotPath, 'utf8');
    expect(second).toBe(first);
    expect(first).not.toContain('\r');
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

describe('prodshape fix --filenames', () => {
  // Its own working directory: the shared workDir above is order-dependent.
  let fixDir: string;

  beforeAll(async () => {
    fixDir = await mkdtemp(join(tmpdir(), 'prodshape-fix-'));
    await mkdir(join(fixDir, 'docs', 'product'), { recursive: true });
    await mkdir(join(fixDir, '.product'), { recursive: true });
    await writeFile(join(fixDir, '.product', 'config.yaml'), 'version: v1alpha1\n', 'utf8');
    await cp(
      join(repoRoot, 'examples', 'minimal', 'product', 'model'),
      join(fixDir, 'docs', 'product', 'model'),
      {
        recursive: true,
      },
    );
  });

  afterAll(async () => {
    await rm(fixDir, { recursive: true, force: true });
  });

  it('reports nothing to do on an aligned model, and exits 0', async () => {
    const result = await run(['fix', '--filenames'], fixDir);
    expect(result.code).toBe(0);
    expect(result.out.join('\n')).toContain('0 fix(es)');
  });

  it('requires a fixer to be named, with exit 2', async () => {
    const result = await run(['fix'], fixDir);
    expect(result.code).toBe(2);
    expect(result.err.join('\n')).toContain('--filenames');
  });

  it('renames a misnamed file and clears the PRODUCT101 warning', async () => {
    const model = join(fixDir, 'docs', 'product', 'model', 'use-cases');
    await rename(join(model, 'uc-shorten-001.md'), join(model, 'renamed-by-hand.md'));

    const before = await run(['validate'], fixDir);
    expect(before.out.join('\n')).toContain('PRODUCT101');

    // --dry-run exits 1 when anything would change, so it works as a CI gate on filename drift.
    const dry = await run(['fix', '--filenames', '--dry-run'], fixDir);
    expect(dry.code).toBe(1);
    expect(dry.out.join('\n')).toContain('Dry run: nothing was changed.');
    expect(dry.out.join('\n')).toContain('renamed-by-hand.md -> ');

    const fixed = await run(['fix', '--filenames'], fixDir);
    expect(fixed.code).toBe(0);
    expect(fixed.out.join('\n')).toMatch(/Renamed 1 file\(s\)/);

    const after = await run(['validate'], fixDir);
    expect(after.code).toBe(0);
    expect(after.out.join('\n')).not.toContain('PRODUCT101');
  });

  it('is idempotent: a second run changes nothing', async () => {
    const again = await run(['fix', '--filenames'], fixDir);
    expect(again.code).toBe(0);
    expect(again.out.join('\n')).toContain('0 fix(es)');
  });

  it('does not recover an interrupted rename during a dry run', async () => {
    // Regression: recovery used to run before the dry-run check, so asking what would happen
    // renamed the file and then printed "Dry run: nothing was changed."
    const model = join(fixDir, 'docs', 'product', 'model', 'use-cases');
    const destination = join(model, 'uc-shorten-001.md');
    const leftover = `${destination}.prodshape-fix-tmp`;
    await rename(destination, leftover);

    const dry = await run(['fix', '--filenames', '--dry-run'], fixDir);
    expect(dry.out.join('\n')).toContain('would recover');
    expect(dry.out.join('\n')).toContain('Dry run: nothing was changed.');
    // Anything pending, including a recovery, keeps the CI gate non-zero.
    expect(dry.code).toBe(1);
    // The claim the output makes must be true: the file is untouched.
    await access(leftover);
    await expect(access(destination)).rejects.toThrow();

    // The same state, applied for real, completes the rename.
    const applied = await run(['fix', '--filenames'], fixDir);
    expect(applied.code).toBe(0);
    expect(applied.out.join('\n')).toContain(
      'recovered docs/product/model/use-cases/uc-shorten-001.md',
    );
    await access(destination);
    await expect(access(leftover)).rejects.toThrow();
  });

  it('completes a rename interrupted between its two steps', async () => {
    const model = join(fixDir, 'docs', 'product', 'model', 'use-cases');
    const destination = join(model, 'uc-shorten-001.md');
    // Simulate a crash after the first rename: the file sits at its temporary name, which encodes
    // where it was going. Discovery globs *.md, so the artifact is currently missing.
    await rename(destination, `${destination}.prodshape-fix-tmp`);

    const result = await run(['fix', '--filenames'], fixDir);
    expect(result.code).toBe(0);
    expect(result.out.join('\n')).toContain(
      'recovered docs/product/model/use-cases/uc-shorten-001.md',
    );

    const validate = await run(['validate'], fixDir);
    expect(validate.code).toBe(0);
  });

  it('emits a machine-readable plan with --format json', async () => {
    const result = await run(['fix', '--filenames', '--format', 'json'], fixDir);
    expect(result.code).toBe(0);
    const parsed = JSON.parse(result.out.join('\n')) as {
      schema: string;
      fixes: unknown[];
      blocked: unknown[];
    };
    expect(parsed.schema).toBe('product-definition-as-code/fix-plan/v1alpha1');
    expect(parsed.fixes).toEqual([]);
    expect(parsed.blocked).toEqual([]);
  });
});

describe('prodshape schema', () => {
  it('lists every kind with its ID prefix', async () => {
    const result = await run(['schema'], workDir);
    expect(result.code).toBe(0);
    const text = result.out.join('\n');
    expect(text).toMatch(/^actor\s+ACT-\s+Actor frontmatter$/m);
    expect(text).toMatch(/^functional-requirement\s+FR-/m);
    expect(text).toContain("Run 'prodshape schema <kind>' for the full field reference.");
  });

  it('lists a Product Change under its own prefix', async () => {
    const result = await run(['schema'], workDir);
    expect(result.code).toBe(0);
    const text = result.out.join('\n');
    expect(text).toMatch(/^product-change\s+CHG-\s+Product change frontmatter$/m);
  });

  it('resolves a kind by its ID prefix alias', async () => {
    const result = await run(['schema', 'chg'], workDir);
    expect(result.code).toBe(0);
    expect(result.out.join('\n')).toContain('product-change');
  });

  it('prints the field reference for a kind', async () => {
    const result = await run(['schema', 'use-case'], workDir);
    expect(result.code).toBe(0);
    const text = result.out.join('\n');
    expect(text).toContain('use-case (UC-)');
    expect(text).toContain('primary-actor');
    expect(text).toContain('provenance.confidence');
    expect(text).toContain('Required body sections: Goal, Trigger');
    expect(text).toContain('Unknown properties are rejected (PRODUCT002).');
  });

  it('accepts an ID prefix as an alias, case-insensitively', async () => {
    for (const alias of ['ACT', 'act']) {
      const result = await run(['schema', alias], workDir);
      expect(result.code).toBe(0);
      expect(result.out[0]).toBe('actor (ACT-)');
    }
  });

  it('emits a schema-identified descriptor with --format json', async () => {
    const result = await run(['schema', 'actor', '--format', 'json'], workDir);
    expect(result.code).toBe(0);
    const parsed = JSON.parse(result.out.join('\n')) as {
      schema: string;
      kind: string;
      fields: { name: string; required: boolean }[];
    };
    expect(parsed.schema).toBe('product-definition-as-code/frontmatter-reference/v1alpha1');
    expect(parsed.kind).toBe('actor');
    expect(parsed.fields.find((f) => f.name === 'provenance')).toMatchObject({ required: false });
  });

  it('rejects an unknown kind with exit 2 and lists what is known', async () => {
    const result = await run(['schema', 'usecase'], workDir);
    expect(result.code).toBe(2);
    expect(result.err.join('\n')).toMatch(/Unknown kind 'usecase'\. Known kinds: actor,/);
  });

  it('works outside a product repository', async () => {
    // The moment someone needs this is before `init`, deciding what to author. Requiring a
    // repository would make the command useless exactly then.
    const empty = await mkdtemp(join(tmpdir(), 'prodshape-schema-empty-'));
    try {
      const result = await run(['schema', 'actor'], empty);
      expect(result.err).toEqual([]);
      expect(result.code).toBe(0);
      expect(result.out[0]).toBe('actor (ACT-)');
    } finally {
      await rm(empty, { recursive: true, force: true });
    }
  });
});

describe('self-application', () => {
  it('validates this repository with exit 0', async () => {
    const result = await run(['validate'], repoRoot);
    expect(result.code).toBe(0);
    // Zero errors; the self-model carries known PRODUCT102 journey-coverage debt, which the
    // contract forbids configuration from suppressing.
    expect(result.out.at(-1)).toMatch(/0 error\(s\), \d+ warning\(s\) across \d+ artifact\(s\)/);
  });
});
