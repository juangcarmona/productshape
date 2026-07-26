import { cp, mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
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

describe('prodshape validate', () => {
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
    await cp(
      join(repoRoot, 'examples', 'minimal', 'model'),
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
    expect(text).toMatch(/^delivery-slice\s+SLI-/m);
    expect(text).toContain("Run 'prodshape schema <kind>' for the full field reference.");
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
    // 59 artifacts, zero diagnostics: the CHG-BRAND-001 terms are referenced by UC-INIT-001.
    expect(result.out.at(-1)).toMatch(/0 error\(s\), 0 warning\(s\) across 59 artifact\(s\)/);
  });
});
