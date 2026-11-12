import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyIdSuffixMigration,
  contentDigest,
  openRepository,
  planIdSuffixMigration,
} from '@prodshape/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runCli } from '../program.js';

const repoRoot = fileURLToPath(new URL('../../../../..', import.meta.url));

/** The suffixed form this fixture starts from, as adopters of 0.22 and earlier have it. */
const suffixed: Record<string, string> = {
  'BR-VALID-URL': 'BR-VALID-URL-001',
  'FR-SHORTEN': 'FR-SHORTEN-001',
  'JRN-SHARE': 'JRN-SHARE-001',
  'QR-RESOLVE': 'QR-RESOLVE-001',
  'UC-SHORTEN': 'UC-SHORTEN-001',
};

let workDir: string;

interface RunResult {
  code: number;
  out: string[];
  err: string[];
}

async function run(
  argv: string[],
  prompt?: (question: string) => Promise<string>,
): Promise<RunResult> {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runCli(argv, {
    cwd: workDir,
    out: (line) => out.push(line),
    err: (line) => err.push(line),
    ...(prompt ? { prompt } : {}),
  });
  return { code, out, err };
}

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else files.push(path);
  }
  return files.sort();
}

/** Every file with its content: the whole observable state of the repository. */
async function snapshot(): Promise<Record<string, string>> {
  const state: Record<string, string> = {};
  for (const file of await walk(workDir)) {
    state[file.slice(workDir.length + 1)] = await readFile(file, 'utf8');
  }
  return state;
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(join(workDir, path));
    return true;
  } catch {
    return false;
  }
}

/** Re-create the pre-0.24 shape of the minimal example: numeric suffixes on five artifacts. */
async function reintroduceSuffixes(): Promise<void> {
  const modelDir = join(workDir, 'docs', 'product', 'model');
  for (const file of await walk(modelDir)) {
    let text = await readFile(file, 'utf8');
    for (const [bare, old] of Object.entries(suffixed)) {
      text = text.split(bare).join(old);
      text = text.split(bare.toLowerCase()).join(old.toLowerCase());
    }
    let target = file;
    for (const [bare, old] of Object.entries(suffixed)) {
      if (file.endsWith(`${bare.toLowerCase()}.md`)) {
        target = file.replace(`${bare.toLowerCase()}.md`, `${old.toLowerCase()}.md`);
      }
    }
    await writeFile(file, text, 'utf8');
    if (target !== file) await rename(file, target);
  }
}

async function digestOf(path: string): Promise<string> {
  return contentDigest(await readFile(join(workDir, path), 'utf8'));
}

async function writeCitations(): Promise<void> {
  await mkdir(join(workDir, 'specs'), { recursive: true });
  const fr = await digestOf('docs/product/model/requirements/functional/fr-shorten-001.md');
  const br = await digestOf('docs/product/model/business-rules/br-valid-url-001.md');
  await writeFile(
    join(workDir, 'specs', 'inline.md'),
    `# Shorten\n\n{pdac:cite id="FR-SHORTEN-001" digest="${fr}"}\n\nSee UC-SHORTEN-001 for the flow.\n`,
    'utf8',
  );
  await writeFile(join(workDir, 'specs', 'ledger.md'), '# Ledger consumer\n', 'utf8');
  await writeFile(
    join(workDir, 'specs', 'ledger.citations.yml'),
    `citations:\n  - id: BR-VALID-URL-001\n    digest: ${br}\n`,
    'utf8',
  );
}

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'prodshape-id-migration-'));
  await mkdir(join(workDir, '.product'), { recursive: true });
  await writeFile(
    join(workDir, '.product', 'config.yaml'),
    'version: v1alpha1\nextensions:\n  prodshape:\n    citations:\n      consumer-roots:\n        - specs\n',
    'utf8',
  );
  await mkdir(join(workDir, 'docs', 'product'), { recursive: true });
  await cp(
    join(repoRoot, 'examples', 'minimal', 'product', 'model'),
    join(workDir, 'docs', 'product', 'model'),
    { recursive: true },
  );
  await reintroduceSuffixes();
  await writeCitations();
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

describe('fixture', () => {
  it('starts valid with current citations and five suffixed IDs', async () => {
    expect((await run(['validate'])).code).toBe(0);
    const cites = await run(['citations', 'verify', 'specs']);
    expect(cites.out.join('\n')).toContain('2 current');
    expect(await exists('docs/product/model/use-cases/uc-shorten-001.md')).toBe(true);
  });
});

describe('fix --id-suffixes: consent', () => {
  it('is a dry run when not interactive and no flag is passed: nothing changes', async () => {
    const before = await snapshot();
    const result = await run(['fix', '--id-suffixes']);
    expect(result.code).toBe(0);
    expect(result.out.join('\n')).toContain('UC-SHORTEN-001 -> UC-SHORTEN');
    expect(result.out.join('\n')).toContain('Nothing was changed');
    expect(await snapshot()).toEqual(before);
  });

  it('--dry-run reports the plan, changes nothing and exits 1 so it can gate a pipeline', async () => {
    const before = await snapshot();
    const result = await run(['fix', '--id-suffixes', '--dry-run', '--apply-id-migration']);
    expect(result.code).toBe(1);
    expect(result.out.join('\n')).toContain('Dry run: nothing was changed.');
    expect(await snapshot()).toEqual(before);
  });

  it('changes nothing when an interactive adopter refuses', async () => {
    const before = await snapshot();
    const questions: string[] = [];
    const result = await run(['fix', '--id-suffixes'], async (question) => {
      questions.push(question);
      return 'n';
    });
    expect(result.code).toBe(0);
    expect(questions).toHaveLength(1);
    expect(result.out.join('\n')).toContain('Migration declined');
    expect(await snapshot()).toEqual(before);
  });

  it('applies when an interactive adopter agrees', async () => {
    const result = await run(['fix', '--id-suffixes'], async () => 'yes');
    expect(result.code).toBe(0);
    expect(await exists('docs/product/model/use-cases/uc-shorten.md')).toBe(true);
  });

  it('is also offered by integration update, and applies only with the explicit flag', async () => {
    const before = await snapshot();
    const plain = await run(['integration', 'update']);
    expect(plain.out.join('\n')).toContain('UC-SHORTEN-001 -> UC-SHORTEN');
    expect(await exists('docs/product/model/use-cases/uc-shorten-001.md')).toBe(true);
    expect(Object.keys(await snapshot()).filter((f) => f.startsWith('docs/'))).toEqual(
      Object.keys(before).filter((f) => f.startsWith('docs/')),
    );

    const applied = await run(['integration', 'update', '--apply-id-migration']);
    expect(applied.code).toBe(0);
    expect(await exists('docs/product/model/use-cases/uc-shorten.md')).toBe(true);
  });
});

describe('fix --id-suffixes --apply-id-migration', () => {
  it('renames where nothing collides, across frontmatter, relationships and file names', async () => {
    const result = await run(['fix', '--id-suffixes', '--apply-id-migration']);
    expect(result.code).toBe(0);

    for (const [bare, old] of Object.entries(suffixed)) {
      const dir = bare.startsWith('BR')
        ? 'business-rules'
        : bare.startsWith('JRN')
          ? 'journeys'
          : bare.startsWith('UC')
            ? 'use-cases'
            : bare.startsWith('FR')
              ? 'requirements/functional'
              : 'requirements/quality';
      expect(await exists(`docs/product/model/${dir}/${bare.toLowerCase()}.md`)).toBe(true);
      expect(await exists(`docs/product/model/${dir}/${old.toLowerCase()}.md`)).toBe(false);
    }

    const uc = await readFile(
      join(workDir, 'docs', 'product', 'model', 'use-cases', 'uc-shorten.md'),
      'utf8',
    );
    expect(uc).toContain('id: UC-SHORTEN\n');
    expect(uc).toContain('BR-VALID-URL');
    expect(uc).not.toMatch(/-001\b/);

    expect((await run(['validate'])).code).toBe(0);
  });

  it('re-pins current citations in payloads and sidecars, and the prose around them', async () => {
    await run(['fix', '--id-suffixes', '--apply-id-migration']);

    const inline = await readFile(join(workDir, 'specs', 'inline.md'), 'utf8');
    expect(inline).toContain('id="FR-SHORTEN"');
    expect(inline).toContain('See UC-SHORTEN for the flow.');
    expect(inline).toContain(
      `digest="${await digestOf('docs/product/model/requirements/functional/fr-shorten.md')}"`,
    );
    const ledger = await readFile(join(workDir, 'specs', 'ledger.citations.yml'), 'utf8');
    expect(ledger).toContain('id: BR-VALID-URL\n');

    const cites = await run(['citations', 'verify', 'specs']);
    expect(cites.code).toBe(0);
    expect(cites.out.join('\n')).toContain('2 current, 0 stale');
  });

  it('does not launder a citation that was already stale', async () => {
    const stale = `sha256:${'1'.repeat(64)}`;
    await writeFile(
      join(workDir, 'specs', 'stale.md'),
      `{pdac:cite id="QR-RESOLVE-001" digest="${stale}"}\n`,
      'utf8',
    );
    const result = await run(['fix', '--id-suffixes', '--apply-id-migration']);
    expect(result.code).toBe(0);
    const text = await readFile(join(workDir, 'specs', 'stale.md'), 'utf8');
    expect(text).toContain('id="QR-RESOLVE"');
    expect(text).toContain(stale);
    expect(result.out.join('\n')).toContain('1 citation(s) that were already stale');
  });

  it('never renames into a collision: the colliding set keeps its numbers and is reported', async () => {
    const dir = join(workDir, 'docs', 'product', 'model', 'requirements', 'functional');
    const original = await readFile(join(dir, 'fr-shorten-001.md'), 'utf8');
    await writeFile(
      join(dir, 'fr-shorten-002.md'),
      original.replace('id: FR-SHORTEN-001', 'id: FR-SHORTEN-002'),
      'utf8',
    );

    const result = await run(['fix', '--id-suffixes', '--apply-id-migration']);
    expect(result.code).toBe(0);
    expect(result.out.join('\n')).toContain('FR-SHORTEN-001, FR-SHORTEN-002');

    expect(await exists('docs/product/model/requirements/functional/fr-shorten-001.md')).toBe(true);
    expect(await exists('docs/product/model/requirements/functional/fr-shorten-002.md')).toBe(true);
    expect(await exists('docs/product/model/requirements/functional/fr-shorten.md')).toBe(false);
    // The rest still migrated; the kept IDs keep their own ID but their references follow.
    expect(await exists('docs/product/model/use-cases/uc-shorten.md')).toBe(true);
    const fr = await readFile(join(dir, 'fr-shorten-001.md'), 'utf8');
    expect(fr).toContain('id: FR-SHORTEN-001\n');
    expect(fr).toContain('UC-SHORTEN');
    expect(fr).not.toContain('UC-SHORTEN-001');
    expect((await run(['validate'])).code).toBe(0);
  });

  it('keeps an ID whose bare form already belongs to another artifact', async () => {
    const dir = join(workDir, 'docs', 'product', 'model', 'requirements', 'functional');
    const original = await readFile(join(dir, 'fr-shorten-001.md'), 'utf8');
    await writeFile(
      join(dir, 'fr-shorten.md'),
      original.replace('id: FR-SHORTEN-001', 'id: FR-SHORTEN'),
      'utf8',
    );
    const result = await run(['fix', '--id-suffixes', '--apply-id-migration']);
    expect(result.out.join('\n')).toContain('already exists');
    expect(await exists('docs/product/model/requirements/functional/fr-shorten-001.md')).toBe(true);
  });

  it('is idempotent: a second run finds nothing to change', async () => {
    await run(['fix', '--id-suffixes', '--apply-id-migration']);
    const after = await snapshot();
    const again = await run(['fix', '--id-suffixes', '--apply-id-migration']);
    expect(again.code).toBe(0);
    expect(again.out.join('\n')).toContain('No artifact ID carries a numeric suffix.');
    expect(await snapshot()).toEqual(after);
  });

  it('updates the overlay of a live Product Change, but not completed history', async () => {
    const live = join(workDir, 'docs', 'product', 'changes', 'active', 'chg-tweak');
    await mkdir(join(live, 'proposed', 'use-cases'), { recursive: true });
    const ucPath = join(workDir, 'docs', 'product', 'model', 'use-cases', 'uc-shorten-001.md');
    const proposedUc = await readFile(ucPath, 'utf8');
    await writeFile(join(live, 'proposed', 'use-cases', 'uc-shorten-001.md'), proposedUc, 'utf8');
    await writeFile(
      join(live, 'change.md'),
      `---
id: CHG-TWEAK
type: product-change
title: Tweak the shortener
status: proposed
base-revision: '0000000'
operations:
  add: []
  modify:
    - UC-SHORTEN-001
  remove: []
---

## Problem

p

## Intended Product Outcome

o

## Rationale

r

## Affected Product Areas

UC-SHORTEN-001.

## Open Questions

None.

## Product Acceptance

a

## Out of Scope

s
`,
      'utf8',
    );
    const history = join(workDir, 'docs', 'product', 'changes', 'completed', 'chg-old');
    await mkdir(history, { recursive: true });
    await writeFile(join(history, 'change.md'), 'Applied UC-SHORTEN-001 long ago.\n', 'utf8');

    expect((await run(['change', 'validate', 'CHG-TWEAK'])).code).toBe(0);
    await run(['fix', '--id-suffixes', '--apply-id-migration']);

    const change = await readFile(join(live, 'change.md'), 'utf8');
    expect(change).toContain('    - UC-SHORTEN\n');
    expect(
      await exists('docs/product/changes/active/chg-tweak/proposed/use-cases/uc-shorten.md'),
    ).toBe(true);
    expect(await readFile(join(history, 'change.md'), 'utf8')).toContain('UC-SHORTEN-001');
    expect((await run(['change', 'validate', 'CHG-TWEAK'])).code).toBe(0);
  });
});

describe('rollback', () => {
  it('restores every file and name when validation fails after the writes', async () => {
    const before = await snapshot();
    const repo = await openRepository(workDir);
    const result = await applyIdSuffixMigration(repo, {
      afterWrite: async () => {
        throw new Error('simulated failure');
      },
    });
    expect(result.applied).toBe(false);
    expect(result.rolledBack).toContain('simulated failure');
    expect(await snapshot()).toEqual(before);
  });

  it('refuses to overwrite a file that already holds the target name', async () => {
    const dir = join(workDir, 'docs', 'product', 'model', 'use-cases');
    await mkdir(join(dir, 'uc-shorten.md'), { recursive: true });
    const before = await snapshot();
    const repo = await openRepository(workDir);
    await expect(applyIdSuffixMigration(repo)).rejects.toThrow(/already exists/);
    expect(await snapshot()).toEqual(before);
  });
});

describe('plan', () => {
  it('is pure: planning twice gives the same plan and writes nothing', async () => {
    const repo = await openRepository(workDir);
    const before = await snapshot();
    const a = await planIdSuffixMigration(repo);
    const b = await planIdSuffixMigration(repo);
    expect(a).toEqual(b);
    expect(a.renames).toHaveLength(5);
    expect(a.collisions).toEqual([]);
    expect(a.citationUpdates.map((u) => u.file).sort()).toEqual([
      'specs/inline.md',
      'specs/ledger.citations.yml',
    ]);
    expect(await snapshot()).toEqual(before);
  });
});

describe('doctor', () => {
  it('mentions suffixed IDs informationally without failing', async () => {
    const result = await run(['doctor']);
    expect(result.out.join('\n')).toContain('id suffixes: 5 artifact ID(s)');
    expect(result.out.join('\n')).not.toContain('FAIL id suffixes');
  });
});
