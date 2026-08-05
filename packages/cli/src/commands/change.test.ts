/**
 * The Product Change contract end to end, over a real Git repository.
 *
 * Git is not a detail here: `base-revision` names a commit and PRODUCT027 compares the baseline
 * against that commit, so a fixture without history could not exercise drift at all.
 */
import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runCli } from '../program.js';

const exec = promisify(execFile);
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

async function git(...args: string[]): Promise<string> {
  const { stdout } = await exec('git', args, { cwd: workDir });
  return stdout.trim();
}

const SECTIONS = [
  'Problem',
  'Intended Product Outcome',
  'Rationale',
  'Affected Product Areas',
  'Open Questions',
  'Product Acceptance',
  'Out of Scope',
];

interface ChangeSpec {
  id?: string;
  status?: string;
  baseRevision?: string;
  add?: string[];
  modify?: string[];
  remove?: string[];
  openQuestions?: string;
  dir?: string;
}

function changeDocument(spec: ChangeSpec, baseRevision: string): string {
  const list = (ids: string[] | undefined): string[] =>
    ids && ids.length > 0 ? ids.map((id) => `    - ${id}`) : [];
  const body = SECTIONS.flatMap((section) => [
    `## ${section}`,
    '',
    section === 'Open Questions' ? (spec.openQuestions ?? 'None.') : 'Probe.',
    '',
  ]);
  return [
    '---',
    `id: ${spec.id ?? 'CHG-PROBE-001'}`,
    'type: product-change',
    'title: Probe',
    `status: ${spec.status ?? 'draft'}`,
    `base-revision: '${spec.baseRevision ?? baseRevision}'`,
    'operations:',
    `  add:${spec.add?.length ? '' : ' []'}`,
    ...list(spec.add),
    `  modify:${spec.modify?.length ? '' : ' []'}`,
    ...list(spec.modify),
    `  remove:${spec.remove?.length ? '' : ' []'}`,
    ...list(spec.remove),
    '---',
    '',
    ...body,
  ].join('\n');
}

/** A complete proposed artifact, laid out under the change's proposed/ directory. */
async function proposeArtifact(
  changeDir: string,
  subdir: string,
  id: string,
  content: string,
): Promise<void> {
  const dir = join(workDir, 'docs', 'product', 'changes', 'active', changeDir, 'proposed', subdir);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, `${id.toLowerCase()}.md`), content, 'utf8');
}

function businessRule(id: string, title: string, appliesTo: string): string {
  return [
    '---',
    `id: ${id}`,
    'type: business-rule',
    `title: ${title}`,
    'status: active',
    'applies-to:',
    `  - ${appliesTo}`,
    '---',
    '',
    '## Rule',
    '',
    'The service does the thing the title describes.',
    '',
    '## Rationale',
    '',
    'Because the product says so.',
    '',
    '## Examples',
    '',
    'One example.',
    '',
    '## Exceptions',
    '',
    'None.',
    '',
  ].join('\n');
}

async function writeChange(spec: ChangeSpec = {}): Promise<string> {
  const dirName = spec.dir ?? (spec.id ?? 'CHG-PROBE-001').toLowerCase();
  const dir = join(workDir, 'docs', 'product', 'changes', 'active', dirName);
  await mkdir(dir, { recursive: true });
  const head = await git('rev-parse', 'HEAD');
  await writeFile(join(dir, 'change.md'), changeDocument(spec, head), 'utf8');
  return dirName;
}

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'prodshape-change-'));
  await mkdir(join(workDir, 'docs', 'product'), { recursive: true });
  await cp(
    join(repoRoot, 'examples', 'minimal', 'model'),
    join(workDir, 'docs', 'product', 'model'),
    {
      recursive: true,
    },
  );
  await git('init', '--initial-branch=main');
  await git('config', 'user.email', 'probe@example.org');
  await git('config', 'user.name', 'Probe');
  await git('add', '-A');
  await git('commit', '-m', 'baseline');
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

describe('change validate', () => {
  it('accepts a change whose operations and proposed artifacts agree', async () => {
    const dir = await writeChange({ add: ['BR-PROBE-001'] });
    await proposeArtifact(
      dir,
      'business-rules',
      'BR-PROBE-001',
      businessRule('BR-PROBE-001', 'A probe rule', 'UC-SHORTEN-001'),
    );
    const result = await run(['change', 'validate']);
    expect(result.out.join('\n')).toContain('0 error(s)');
    expect(result.code).toBe(0);
  });

  it('reports an addition that already exists as PRODUCT020', async () => {
    const dir = await writeChange({ add: ['BR-VALID-URL-001'] });
    await proposeArtifact(
      dir,
      'business-rules',
      'BR-VALID-URL-001',
      businessRule('BR-VALID-URL-001', 'Duplicated', 'UC-SHORTEN-001'),
    );
    const result = await run(['change', 'validate']);
    expect(result.code).toBe(1);
    expect(result.out.join('\n')).toContain('PRODUCT020');
  });

  it('reports a modification of an absent artifact as PRODUCT021', async () => {
    const dir = await writeChange({ modify: ['BR-GHOST-001'] });
    await proposeArtifact(
      dir,
      'business-rules',
      'BR-GHOST-001',
      businessRule('BR-GHOST-001', 'A ghost', 'UC-SHORTEN-001'),
    );
    const result = await run(['change', 'validate']);
    expect(result.code).toBe(1);
    expect(result.out.join('\n')).toContain('PRODUCT021');
  });

  it('reports a removal of an absent artifact as PRODUCT022', async () => {
    await writeChange({ remove: ['BR-GHOST-001'] });
    const result = await run(['change', 'validate']);
    expect(result.code).toBe(1);
    expect(result.out.join('\n')).toContain('PRODUCT022');
  });

  it('reports an overlay duplicate as PRODUCT023', async () => {
    // Two proposed artifacts carrying the same ID: legal as files, a duplicate in the overlay.
    const dir = await writeChange({ add: ['BR-PROBE-001'] });
    await proposeArtifact(
      dir,
      'business-rules',
      'BR-PROBE-001',
      businessRule('BR-PROBE-001', 'A probe rule', 'UC-SHORTEN-001'),
    );
    await proposeArtifact(
      dir,
      'business-rules',
      'BR-PROBE-001-COPY',
      businessRule('BR-PROBE-001', 'The same ID again', 'UC-SHORTEN-001'),
    );
    const result = await run(['change', 'validate']);
    expect(result.code).toBe(1);
    expect(result.out.join('\n')).toContain('PRODUCT023');
  });

  it('reports a removal that strands a reference as PRODUCT024', async () => {
    // UC-SHORTEN-001 is the primary actor's use case and BR-VALID-URL-001 applies to it.
    await writeChange({ remove: ['UC-SHORTEN-001'] });
    const result = await run(['change', 'validate']);
    expect(result.code).toBe(1);
    expect(result.out.join('\n')).toContain('PRODUCT024');
  });

  it('reports overlapping concurrent changes as PRODUCT025', async () => {
    const first = await writeChange({ id: 'CHG-FIRST-001', modify: ['BR-VALID-URL-001'] });
    await proposeArtifact(
      first,
      'business-rules',
      'BR-VALID-URL-001',
      businessRule('BR-VALID-URL-001', 'Changed by the first change', 'UC-SHORTEN-001'),
    );
    const second = await writeChange({ id: 'CHG-SECOND-001', modify: ['BR-VALID-URL-001'] });
    await proposeArtifact(
      second,
      'business-rules',
      'BR-VALID-URL-001',
      businessRule('BR-VALID-URL-001', 'Changed by the second change', 'UC-SHORTEN-001'),
    );
    const result = await run(['change', 'validate']);
    expect(result.code).toBe(1);
    expect(result.out.join('\n')).toContain('PRODUCT025');
  });

  it('reports an operation with no proposed artifact as PRODUCT026', async () => {
    await writeChange({ add: ['BR-PROBE-001'] });
    const result = await run(['change', 'validate']);
    expect(result.code).toBe(1);
    expect(result.out.join('\n')).toContain('PRODUCT026');
  });

  it('reports a proposed artifact no operation names as PRODUCT026', async () => {
    const dir = await writeChange({});
    await proposeArtifact(
      dir,
      'business-rules',
      'BR-PROBE-001',
      businessRule('BR-PROBE-001', 'Unclaimed', 'UC-SHORTEN-001'),
    );
    const result = await run(['change', 'validate']);
    expect(result.code).toBe(1);
    expect(result.out.join('\n')).toContain('PRODUCT026');
  });

  it('warns (PRODUCT108) when an approved change still lists open questions', async () => {
    const dir = await writeChange({
      status: 'approved',
      add: ['BR-PROBE-001'],
      openQuestions: '- Should the rule also cover relative URLs?',
    });
    await proposeArtifact(
      dir,
      'business-rules',
      'BR-PROBE-001',
      businessRule('BR-PROBE-001', 'A probe rule', 'UC-SHORTEN-001'),
    );
    const result = await run(['change', 'validate']);
    expect(result.code).toBe(0);
    expect(result.out.join('\n')).toContain('PRODUCT108');
  });

  it('leaves the baseline alone: prodshape validate ignores live changes', async () => {
    await writeChange({ add: ['BR-PROBE-001'] }); // PRODUCT026 under change validate.
    const result = await run(['validate']);
    expect(result.code).toBe(0);
    expect(result.out.at(-1)).toMatch(/0 error\(s\), 0 warning\(s\)/);
  });

  it('exits 2 on an unknown change ID', async () => {
    const result = await run(['change', 'validate', 'CHG-GHOST-001']);
    expect(result.code).toBe(2);
    expect(result.err.join('\n')).toContain('CHG-GHOST-001');
  });
});

describe('change apply', () => {
  /** An approved change adding one rule, modifying another and removing a third. */
  async function approvedChange(): Promise<string> {
    const dir = await writeChange({
      status: 'approved',
      add: ['BR-PROBE-001'],
      modify: ['BR-VALID-URL-001'],
      remove: ['CON-NO-TRACKING'],
    });
    await proposeArtifact(
      dir,
      'business-rules',
      'BR-PROBE-001',
      businessRule('BR-PROBE-001', 'A probe rule', 'UC-SHORTEN-001'),
    );
    await proposeArtifact(
      dir,
      'business-rules',
      'BR-VALID-URL-001',
      businessRule(
        'BR-VALID-URL-001',
        'Only well-formed absolute URLs are shortened, restated',
        'UC-SHORTEN-001',
      ),
    );
    return dir;
  }

  it('refuses a change that is not approved', async () => {
    const dir = await writeChange({ status: 'proposed', add: ['BR-PROBE-001'] });
    await proposeArtifact(
      dir,
      'business-rules',
      'BR-PROBE-001',
      businessRule('BR-PROBE-001', 'A probe rule', 'UC-SHORTEN-001'),
    );
    const result = await run(['change', 'apply', 'CHG-PROBE-001']);
    expect(result.code).toBe(1);
    expect(result.err.join('\n')).toContain("requires status 'approved'");
  });

  it('--dry-run reports the plan and the diff without writing anything', async () => {
    await approvedChange();
    const before = await git('status', '--porcelain');
    const result = await run(['change', 'apply', 'CHG-PROBE-001', '--dry-run']);
    expect(result.code).toBe(0);
    const text = result.out.join('\n');
    expect(text).toContain('Would apply CHG-PROBE-001');
    expect(text).toContain('Product diff: 1 added, 1 modified, 1 removed');
    expect(text).toContain('Dry run: nothing was written.');
    expect(await git('status', '--porcelain')).toBe(before);
  });

  it('writes the model, archives the change and commits nothing', async () => {
    await approvedChange();
    const result = await run(['change', 'apply', 'CHG-PROBE-001']);
    expect(result.code).toBe(0);

    const model = join(workDir, 'docs', 'product', 'model');
    expect(await readFile(join(model, 'business-rules', 'br-probe-001.md'), 'utf8')).toContain(
      'BR-PROBE-001',
    );
    expect(await readFile(join(model, 'business-rules', 'br-valid-url-001.md'), 'utf8')).toContain(
      'restated',
    );
    await expect(
      stat(join(model, 'requirements', 'constraints', 'con-no-tracking.md')),
    ).rejects.toThrow();

    const archived = join(
      workDir,
      'docs',
      'product',
      'changes',
      'completed',
      'chg-probe-001',
      'change.md',
    );
    expect(await readFile(archived, 'utf8')).toContain('status: applied');
    await expect(
      stat(join(workDir, 'docs', 'product', 'changes', 'active', 'chg-probe-001')),
    ).rejects.toThrow();

    // Applied is not accepted: the working tree carries the change, Git records no commit.
    expect(await git('log', '--oneline')).toBe(
      (await git('log', '--oneline', '-1')).split('\n')[0],
    );
    expect(await git('status', '--porcelain')).not.toBe('');
  });

  it('leaves a change that removes a referenced artifact unapplied', async () => {
    // CON-NO-TRACKING is removed above without stranding anything; UC-SHORTEN-001 is referenced.
    const dir = await writeChange({
      status: 'approved',
      remove: ['UC-SHORTEN-001'],
      dir: 'chg-probe-001',
    });
    expect(dir).toBe('chg-probe-001');
    const result = await run(['change', 'apply', 'CHG-PROBE-001']);
    expect(result.code).toBe(1);
    expect(result.err.join('\n')).toContain('PRODUCT024');
    await expect(
      stat(join(workDir, 'docs', 'product', 'model', 'use-cases', 'uc-shorten-001.md')),
    ).resolves.toBeDefined();
  });

  it('refuses to apply when the baseline moved under the change (PRODUCT027)', async () => {
    await approvedChange();
    // The baseline drifts: an artifact the change modifies is edited and committed after the
    // change recorded its base-revision.
    const target = join(
      workDir,
      'docs',
      'product',
      'model',
      'business-rules',
      'br-valid-url-001.md',
    );
    const current = await readFile(target, 'utf8');
    await writeFile(
      target,
      current.replace('## Rationale', '## Rationale\n\nEdited upstream.\n'),
      'utf8',
    );
    await git('add', '-A');
    await git('commit', '-m', 'baseline moves');

    const result = await run(['change', 'apply', 'CHG-PROBE-001']);
    expect(result.code).toBe(1);
    expect(result.err.join('\n')).toContain('PRODUCT027');
    await expect(
      stat(join(workDir, 'docs', 'product', 'model', 'business-rules', 'br-probe-001.md')),
    ).rejects.toThrow();
  });

  it('reports a declared modification that changes nothing as no diff entry', async () => {
    // Intent and effective change may legitimately disagree: a modification whose proposed text
    // is byte-identical to the baseline changes nothing, and must not send citations stale.
    const dir = await writeChange({ status: 'approved', modify: ['BR-VALID-URL-001'] });
    const unchanged = await readFile(
      join(workDir, 'docs', 'product', 'model', 'business-rules', 'br-valid-url-001.md'),
      'utf8',
    );
    await proposeArtifact(dir, 'business-rules', 'BR-VALID-URL-001', unchanged);
    const result = await run(['change', 'apply', 'CHG-PROBE-001', '--dry-run']);
    expect(result.code).toBe(0);
    expect(result.out.join('\n')).toContain('Product diff: 0 added, 0 modified, 0 removed');
  });
});

describe('change list and archive', () => {
  it('lists live changes with their operation counts', async () => {
    await writeChange({ add: ['BR-PROBE-001'], modify: ['BR-VALID-URL-001'] });
    const result = await run(['change', 'list']);
    expect(result.code).toBe(0);
    expect(result.out.join('\n')).toMatch(/active\s+draft\s+CHG-PROBE-001\s+\+1 ~1 -0/);
  });

  it('archives a rejected change into the change history', async () => {
    await writeChange({ status: 'rejected' });
    const result = await run(['change', 'archive', 'CHG-PROBE-001']);
    expect(result.code).toBe(0);
    await expect(
      stat(join(workDir, 'docs', 'product', 'changes', 'rejected', 'chg-probe-001', 'change.md')),
    ).resolves.toBeDefined();
  });

  it('refuses to archive a change that was not withdrawn', async () => {
    await writeChange({ status: 'approved' });
    const result = await run(['change', 'archive', 'CHG-PROBE-001']);
    expect(result.code).toBe(2);
    expect(result.err.join('\n')).toContain("'rejected' or 'superseded'");
  });

  it('treats archived changes as inert: they never reach validation', async () => {
    // An archived change whose additions are already in the model would be PRODUCT020 if it were
    // still live. Archives are history, so nothing is reported.
    const dir = join(workDir, 'docs', 'product', 'changes', 'completed', 'chg-old-001');
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, 'change.md'),
      changeDocument(
        { id: 'CHG-OLD-001', status: 'applied', add: ['BR-VALID-URL-001'] },
        '0000000',
      ),
      'utf8',
    );
    const result = await run(['change', 'validate']);
    expect(result.code).toBe(0);
    expect(result.out.join('\n')).not.toContain('PRODUCT020');
  });
});
