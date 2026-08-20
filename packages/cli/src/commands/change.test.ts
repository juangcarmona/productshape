/**
 * The Product Change contract end to end, over a real Git repository.
 *
 * Git is not a detail here: `base-revision` names a commit and PRODUCT027 compares the baseline
 * against that commit, so a fixture without history could not exercise drift at all.
 */
import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { contentDigestBytes } from '@prodshape/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runCli } from '../program.js';

const exec = promisify(execFile);
const repoRoot = fileURLToPath(new URL('../../../..', import.meta.url));

/**
 * Each test gets its own repository with its own history, because the drift test commits and a
 * shared fixture would leak that commit into every test after it. Five git invocations plus a
 * tree copy is slow on a cold Windows runner, so hooks and tests both get room. The default 10s
 * is a bound on process spawning here, not a signal that anything is stuck.
 */
vi.setConfig({ hookTimeout: 60_000, testTimeout: 60_000 });

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

  it('reports overlapping changes that are both missing an id as PRODUCT025', async () => {
    // Self-exclusion used to compare `id`, so two id-less changes skipped each other
    // (undefined === undefined) and a real overlap disappeared behind the missing-id defect.
    // Identity is the change document, so both are now compared.
    const first = await writeChange({
      id: undefined,
      dir: 'chg-first',
      modify: ['BR-VALID-URL-001'],
    });
    const second = await writeChange({
      id: undefined,
      dir: 'chg-second',
      modify: ['BR-VALID-URL-001'],
    });
    for (const dir of [first, second]) {
      const changePath = join(workDir, 'docs', 'product', 'changes', 'active', dir, 'change.md');
      // Drop the id line: the frontmatter is otherwise complete.
      const document = await readFile(changePath, 'utf8');
      await writeFile(changePath, document.replace(/^id: .*\n/m, ''), 'utf8');
      await proposeArtifact(
        dir,
        'business-rules',
        'BR-VALID-URL-001',
        businessRule('BR-VALID-URL-001', `Changed by ${dir}`, 'UC-SHORTEN-001'),
      );
    }

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

  /**
   * PRODUCT108's trigger is syntactic: any Markdown list item under `## Open Questions` counts,
   * whatever it says. The rule has to be reproducible from bytes alone, so a second implementation
   * reading the same section reaches the same verdict.
   */
  async function validateWithOpenQuestions(
    openQuestions: string,
    status = 'approved',
  ): Promise<RunResult> {
    const dir = await writeChange({ status, add: ['BR-PROBE-001'], openQuestions });
    await proposeArtifact(
      dir,
      'business-rules',
      'BR-PROBE-001',
      businessRule('BR-PROBE-001', 'A probe rule', 'UC-SHORTEN-001'),
    );
    return run(['change', 'validate']);
  }

  it.each([
    ['a dash bullet', '- Should the rule also cover relative URLs?'],
    ['an asterisk bullet', '* Should the rule also cover relative URLs?'],
    ['a plus bullet', '+ Should the rule also cover relative URLs?'],
    ['an ordered item', '1. Should the rule also cover relative URLs?'],
    ['a parenthesised ordered item', '1) Should the rule also cover relative URLs?'],
    ['a nested item', 'Context.\n\n  - Nested, and still a question.'],
    ['an unchecked task item', '- [ ] Should the rule also cover relative URLs?'],
    // A checked box is not an answer: nothing in the syntax says who checked it or what they
    // decided, so the item stays a question until it is removed.
    ['a checked task item', '- [x] Decided, allegedly.'],
    ['a content-free item', '-'],
  ])('warns (PRODUCT108) on %s under Open Questions', async (_label, openQuestions) => {
    const result = await validateWithOpenQuestions(openQuestions);
    expect(result.code).toBe(0);
    expect(result.out.join('\n')).toContain('PRODUCT108');
  });

  it.each([
    ['the None. sentinel', 'None.'],
    ['an empty section', ''],
    ['prose that mentions a dash mid-sentence', 'Nothing open - the reviewer settled it.'],
  ])('stays silent on %s: prose is not a question', async (_label, openQuestions) => {
    const result = await validateWithOpenQuestions(openQuestions);
    expect(result.code).toBe(0);
    expect(result.out.join('\n')).not.toContain('PRODUCT108');
  });

  it('ignores a list item inside a fenced code block: an example is not a question', async () => {
    // A change documenting `- [ ] item` in a code sample has not thereby left a question open.
    const result = await validateWithOpenQuestions(
      ['None.', '', '```markdown', '- [ ] An example task, not a question.', '```'].join('\n'),
    );
    expect(result.code).toBe(0);
    expect(result.out.join('\n')).not.toContain('PRODUCT108');
  });

  it('still reports a real question alongside a fenced code block', async () => {
    const result = await validateWithOpenQuestions(
      ['- Should the rule cover relative URLs?', '', '```', '- not a question', '```'].join('\n'),
    );
    expect(result.out.join('\n')).toContain('PRODUCT108');
  });

  it('does not read a "### Open Questions" subsection of an earlier section', async () => {
    // The section heading must anchor to a line start and to exactly two hashes. A `###`
    // subsection of an earlier section is not this change's Open Questions section, and its list
    // items are not its questions — matching it reported a question the change had answered.
    const dir = await writeChange({ status: 'approved', add: ['BR-PROBE-001'] });
    await proposeArtifact(
      dir,
      'business-rules',
      'BR-PROBE-001',
      businessRule('BR-PROBE-001', 'A probe rule', 'UC-SHORTEN-001'),
    );
    const changePath = join(workDir, 'docs', 'product', 'changes', 'active', dir, 'change.md');
    const document = await readFile(changePath, 'utf8');
    // The subsection lands under `## Problem`, ahead of the real `## Open Questions` (which says
    // `None.`), so a loose match reaches it first.
    await writeFile(
      changePath,
      document.replace(
        '## Problem\n\nProbe.\n',
        '## Problem\n\nProbe.\n\n### Open Questions\n\n- Belongs to the subsection, not the section.\n',
      ),
      'utf8',
    );

    const result = await run(['change', 'validate']);
    expect(result.out.join('\n')).not.toContain('PRODUCT108');
  });

  it('stays silent while the change is not approved: the section is a working list', async () => {
    const result = await validateWithOpenQuestions('- Still thinking about this one.', 'proposed');
    expect(result.out.join('\n')).not.toContain('PRODUCT108');
  });

  it('reports PRODUCT108 on every validation, not only at the transition', async () => {
    // State-based, so validating the same approved change twice reports it twice. Nothing about
    // the warning depends on knowing when the status changed.
    await validateWithOpenQuestions('- Should the rule also cover relative URLs?');
    const again = await run(['change', 'validate']);
    expect(again.out.join('\n')).toContain('PRODUCT108');
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

  /** A change in a status that does not authorize apply, with its proposed artifact in place. */
  async function unapprovedChange(status: string): Promise<void> {
    const dir = await writeChange({ status, add: ['BR-PROBE-001'] });
    await proposeArtifact(
      dir,
      'business-rules',
      'BR-PROBE-001',
      businessRule('BR-PROBE-001', 'A probe rule', 'UC-SHORTEN-001'),
    );
  }

  /** A consumer document, placed outside the product definition. */
  async function writeConsumer(relPath: string, content: string): Promise<void> {
    const path = join(workDir, ...relPath.split('/'));
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, 'utf8');
  }

  /** The current digest of a baseline model artifact, as a recorded citation would carry it. */
  async function modelDigest(relPath: string): Promise<string> {
    return contentDigestBytes(
      await readFile(join(workDir, 'docs', 'product', 'model', ...relPath.split('/'))),
    );
  }

  /** One consumer citing the artifact approvedChange modifies and the one it removes. */
  async function citingConsumer(): Promise<void> {
    await writeConsumer(
      'specs/shortening.md',
      [
        '# Shortening',
        '',
        `{pdac:cite id="BR-VALID-URL-001" digest="${await modelDigest('business-rules/br-valid-url-001.md')}"}`,
        `{pdac:cite id="CON-NO-TRACKING" digest="${await modelDigest('requirements/constraints/con-no-tracking.md')}"}`,
        '',
      ].join('\n'),
    );
  }

  it.each(['draft', 'proposed', 'applied', 'rejected', 'superseded'])(
    'refuses a change in status %s with PRODUCT028, exit 1 and the tree untouched',
    async (status) => {
      await unapprovedChange(status);
      const before = await git('status', '--porcelain');
      const result = await run(['change', 'apply', 'CHG-PROBE-001']);
      // Exit 1, not 2: the invocation is well formed, the finding is about the model.
      expect(result.code).toBe(1);
      expect(result.err.join('\n')).toContain('PRODUCT028');
      // The precondition is checked before anything is written.
      expect(await git('status', '--porcelain')).toBe(before);
      await expect(
        stat(join(workDir, 'docs', 'product', 'model', 'business-rules', 'br-probe-001.md')),
      ).rejects.toThrow();
    },
  );

  it('reports PRODUCT028 as a diagnostic in the JSON form', async () => {
    await unapprovedChange('proposed');
    const result = await run(['change', 'apply', 'CHG-PROBE-001', '--format', 'json']);
    expect(result.code).toBe(1);
    const payload = JSON.parse(result.out.join('\n')) as {
      applied: boolean;
      diagnostics: { code: string; severity: string; field?: string }[];
    };
    expect(payload.applied).toBe(false);
    const diagnostic = payload.diagnostics.find((d) => d.code === 'PRODUCT028');
    expect(diagnostic).toMatchObject({ severity: 'error', field: 'status' });
  });

  it('orders an appended PRODUCT028 before a later-file overlay diagnostic', async () => {
    const dir = await writeChange({ status: 'draft' });
    await proposeArtifact(
      dir,
      'business-rules',
      'BR-PROBE-001',
      businessRule('BR-PROBE-001', 'An unclaimed proposal', 'UC-SHORTEN-001'),
    );
    const before = await git('status', '--porcelain');

    const result = await run(['change', 'apply', 'CHG-PROBE-001', '--format', 'json']);
    const payload = JSON.parse(result.out.join('\n')) as {
      applied: boolean;
      diagnostics: { file: string; code: string; target?: string }[];
    };

    expect(result.code).toBe(1);
    expect(payload.applied).toBe(false);
    expect(payload.diagnostics.map(({ file, code, target }) => ({ file, code, target }))).toEqual([
      {
        file: 'docs/product/changes/active/chg-probe-001/change.md',
        code: 'PRODUCT028',
        target: undefined,
      },
      {
        file: 'docs/product/changes/active/chg-probe-001/proposed/business-rules/br-probe-001.md',
        code: 'PRODUCT026',
        target: undefined,
      },
    ]);
    expect(await git('status', '--porcelain')).toBe(before);
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

  it('carries an impact kind on every diff entry, and no digest on a removal', async () => {
    await approvedChange();
    const result = await run(['change', 'apply', 'CHG-PROBE-001', '--dry-run', '--format', 'json']);
    expect(result.code).toBe(0);
    const { diff } = JSON.parse(result.out.join('\n')) as {
      diff: Record<
        'added' | 'modified' | 'removed',
        { id: string; kind: string; digest?: string }[]
      >;
    };

    const digest = /^sha256:[0-9a-f]{64}$/;
    expect(diff.added).toEqual([
      expect.objectContaining({ kind: 'added', digest: expect.stringMatching(digest) }),
    ]);
    expect(diff.modified).toEqual([
      expect.objectContaining({ kind: 'modified', digest: expect.stringMatching(digest) }),
    ]);
    // A removal leaves no content, so there is nothing to digest.
    expect(diff.removed).toEqual([expect.objectContaining({ kind: 'removed' })]);
    expect(diff.removed[0]).not.toHaveProperty('digest');

    // The human-readable form carries the same three facts per entry.
    const [added] = diff.added;
    const [removed] = diff.removed;
    const text = (await run(['change', 'apply', 'CHG-PROBE-001', '--dry-run'])).out.join('\n');
    expect(text).toContain(`${removed?.id}\tremoved\t-`);
    expect(text).toContain(`${added?.id}\tadded\t${added?.digest}`);
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

  it('orders PRODUCT027 before later-file overlay diagnostics on a dry-run refusal', async () => {
    const dir = await writeChange({
      status: 'approved',
      modify: ['BR-VALID-URL-001'],
      remove: ['ACT-VISITOR'],
    });
    await proposeArtifact(
      dir,
      'business-rules',
      'BR-VALID-URL-001',
      businessRule('BR-VALID-URL-001', 'Only valid absolute URLs are shortened', 'UC-SHORTEN-001'),
    );

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
    await git('commit', '-m', 'baseline and change diverge');
    const before = await git('status', '--porcelain');

    const result = await run(['change', 'apply', 'CHG-PROBE-001', '--dry-run', '--format', 'json']);
    const payload = JSON.parse(result.out.join('\n')) as {
      applied: boolean;
      diagnostics: { file: string; code: string; target?: string }[];
    };

    expect(result.code).toBe(1);
    expect(payload.applied).toBe(false);
    expect(payload.diagnostics.map(({ file, code, target }) => ({ file, code, target }))).toEqual([
      {
        file: 'docs/product/model/business-rules/br-valid-url-001.md',
        code: 'PRODUCT027',
        target: 'BR-VALID-URL-001',
      },
      {
        file: 'docs/product/model/journeys/jrn-share-001.md',
        code: 'PRODUCT024',
        target: 'ACT-VISITOR',
      },
      {
        file: 'docs/product/model/use-cases/uc-shorten-001.md',
        code: 'PRODUCT024',
        target: 'ACT-VISITOR',
      },
    ]);
    expect(await git('status', '--porcelain')).toBe(before);
  });

  it('does not treat an addition as drift: an addition has nothing to compare against', async () => {
    // Drift covers operations.modify and operations.remove only. BR-PROBE-001 has no baseline file
    // at base-revision, so there is no digest to differ; an ID that appeared since would be
    // PRODUCT020 from the overlay instead. Committing an unrelated baseline edit first proves the
    // baseline genuinely moved without making the addition drift.
    const dir = await writeChange({ status: 'approved', add: ['BR-PROBE-001'] });
    await proposeArtifact(
      dir,
      'business-rules',
      'BR-PROBE-001',
      businessRule('BR-PROBE-001', 'A probe rule', 'UC-SHORTEN-001'),
    );
    const untouched = join(
      workDir,
      'docs',
      'product',
      'model',
      'business-rules',
      'br-valid-url-001.md',
    );
    const current = await readFile(untouched, 'utf8');
    await writeFile(
      untouched,
      current.replace('## Rationale', '## Rationale\n\nUnrelated.\n'),
      'utf8',
    );
    await git('add', '-A');
    await git('commit', '-m', 'an artifact the change does not touch moves');

    const result = await run(['change', 'apply', 'CHG-PROBE-001']);
    expect(result.err.join('\n')).not.toContain('PRODUCT027');
    expect(result.code).toBe(0);
  });

  it('judges drift by content digest: a formatting-only commit is not drift', async () => {
    await approvedChange();
    // Digests normalize CRLF and CR to LF, so rewriting a baseline artifact with CRLF endings and
    // committing it moves the file in Git without changing its normalized content.
    const target = join(
      workDir,
      'docs',
      'product',
      'model',
      'business-rules',
      'br-valid-url-001.md',
    );
    const current = await readFile(target, 'utf8');
    await writeFile(target, current.replace(/\r?\n/g, '\r\n'), 'utf8');
    await git('add', '-A');
    await git('commit', '-m', 'line endings only');

    const result = await run(['change', 'apply', 'CHG-PROBE-001', '--dry-run']);
    expect(result.err.join('\n')).not.toContain('PRODUCT027');
    expect(result.code).toBe(0);
  });

  it('--dry-run runs the full preflight (issue #61): an occupied archive destination fails instead of reporting "Would apply"', async () => {
    await approvedChange();
    // Simulate the archive destination already being occupied (e.g. a prior partial apply left it
    // behind). A real apply would refuse at the preflight, before writing anything; a dry run must
    // report the identical refusal rather than a clean "Would apply".
    await mkdir(join(workDir, 'docs', 'product', 'changes', 'completed', 'chg-probe-001'), {
      recursive: true,
    });
    const before = await git('status', '--porcelain');

    const dryRun = await run(['change', 'apply', 'CHG-PROBE-001', '--dry-run']);
    expect(dryRun.code).not.toBe(0);
    expect(dryRun.out.join('\n')).not.toContain('Would apply');
    expect(await git('status', '--porcelain')).toBe(before);

    // A real apply against the same repository state fails the same way.
    const real = await run(['change', 'apply', 'CHG-PROBE-001']);
    expect(real.code).toBe(dryRun.code);
    expect(await git('status', '--porcelain')).toBe(before);
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

  it('--dry-run reports the affected citation set with location and prospective status', async () => {
    await approvedChange();
    await citingConsumer();
    const before = await git('status', '--porcelain');

    const result = await run(['change', 'apply', 'CHG-PROBE-001', '--dry-run']);
    expect(result.code).toBe(0);
    const text = result.out.join('\n');
    expect(text).toContain('Affected citations: 2');
    // A citation of a modified artifact forecasts stale; of a removed artifact, unresolved.
    expect(text).toContain('specs/shortening.md:3\tBR-VALID-URL-001\tstale');
    expect(text).toContain('specs/shortening.md:4\tCON-NO-TRACKING\tunresolved');
    // The report is recomputed output: reporting it writes nothing (RFC 0048).
    expect(await git('status', '--porcelain')).toBe(before);
  });

  it('--dry-run carries the affected citation set in the JSON form', async () => {
    await approvedChange();
    await citingConsumer();

    const result = await run(['change', 'apply', 'CHG-PROBE-001', '--dry-run', '--format', 'json']);
    expect(result.code).toBe(0);
    const payload = JSON.parse(result.out.join('\n')) as {
      affectedCitations: {
        id: string;
        source: string;
        line: number;
        form: string;
        prospectiveStatus: string;
      }[];
    };
    expect(payload.affectedCitations).toEqual([
      {
        id: 'BR-VALID-URL-001',
        source: 'specs/shortening.md',
        line: 3,
        form: 'inline',
        prospectiveStatus: 'stale',
      },
      {
        id: 'CON-NO-TRACKING',
        source: 'specs/shortening.md',
        line: 4,
        form: 'inline',
        prospectiveStatus: 'unresolved',
      },
    ]);
  });

  it('apply reports the affected citation set identically to its dry run', async () => {
    await approvedChange();
    await citingConsumer();

    // Everything from the count line onward, minus the closing dry-run/applied sentence.
    const affectedBlock = (lines: string[]): string[] =>
      lines.slice(
        lines.findIndex((line) => line.startsWith('Affected citations:')),
        -1,
      );

    const dryRun = await run(['change', 'apply', 'CHG-PROBE-001', '--dry-run']);
    const applied = await run(['change', 'apply', 'CHG-PROBE-001']);
    expect(applied.code).toBe(0);
    expect(affectedBlock(applied.out)).toEqual(affectedBlock(dryRun.out));
    expect(affectedBlock(applied.out)[0]).toBe('Affected citations: 2');
  });

  it('states an explicit zero when no citations are affected', async () => {
    // Absence of impact is a claim the reviewer relies on; silence is not (RFC 0048).
    await approvedChange();
    const text = await run(['change', 'apply', 'CHG-PROBE-001', '--dry-run']);
    expect(text.code).toBe(0);
    expect(text.out).toContain('Affected citations: 0');

    const json = await run(['change', 'apply', 'CHG-PROBE-001', '--dry-run', '--format', 'json']);
    const payload = JSON.parse(json.out.join('\n')) as { affectedCitations: unknown[] };
    expect(payload.affectedCitations).toEqual([]);
  });

  it('does not affect citations of a declared modification that changes nothing', async () => {
    // Impact derives from the effective change: a byte-identical modify is absent from the diff,
    // so a current citation of the declared target must not be reported as affected.
    const dir = await writeChange({ status: 'approved', modify: ['BR-VALID-URL-001'] });
    const unchanged = await readFile(
      join(workDir, 'docs', 'product', 'model', 'business-rules', 'br-valid-url-001.md'),
      'utf8',
    );
    await proposeArtifact(dir, 'business-rules', 'BR-VALID-URL-001', unchanged);
    await writeConsumer(
      'specs/still-current.md',
      `{pdac:cite id="BR-VALID-URL-001" digest="${await modelDigest('business-rules/br-valid-url-001.md')}"}\n`,
    );

    const result = await run(['change', 'apply', 'CHG-PROBE-001', '--dry-run']);
    expect(result.code).toBe(0);
    expect(result.out).toContain('Affected citations: 0');
  });

  it('orders affected citations deterministically across consumers and forms', async () => {
    await approvedChange();
    const digest = await modelDigest('business-rules/br-valid-url-001.md');
    // Written in reverse of the expected order, so the order below is sorted, not incidental.
    await writeConsumer('specs/citations.yaml', `- id: BR-VALID-URL-001\n  digest: ${digest}\n`);
    await writeConsumer(
      'specs/b.md',
      `{pdac:cite id="BR-VALID-URL-001" digest="${digest}"}\n\n{pdac:cite id="BR-VALID-URL-001" digest="${digest}"}\n`,
    );
    await writeConsumer('specs/a.md', `{pdac:cite id="BR-VALID-URL-001" digest="${digest}"}\n`);

    const result = await run(['change', 'apply', 'CHG-PROBE-001', '--dry-run', '--format', 'json']);
    expect(result.code).toBe(0);
    const payload = JSON.parse(result.out.join('\n')) as {
      affectedCitations: { source: string; line: number; form: string }[];
    };
    expect(
      payload.affectedCitations.map(({ source, line, form }) => ({ source, line, form })),
    ).toEqual([
      { source: 'specs/a.md', line: 1, form: 'inline' },
      { source: 'specs/b.md', line: 1, form: 'inline' },
      { source: 'specs/b.md', line: 3, form: 'inline' },
      { source: 'specs/citations.yaml', line: 1, form: 'sidecar-ledger' },
    ]);

    // The sidecar's point of use is its ledger entry, not a file line.
    const text = (await run(['change', 'apply', 'CHG-PROBE-001', '--dry-run'])).out.join('\n');
    expect(text).toContain('specs/citations.yaml entry 1\tBR-VALID-URL-001\tstale');
  });
});

describe('change create', () => {
  it('scaffolds a draft that change validate accepts, based on the repository HEAD', async () => {
    const created = await run(['change', 'create', 'CHG-SCAFFOLD-001']);
    expect(created.err).toEqual([]);
    expect(created.code).toBe(0);
    expect(created.out[0]).toBe(
      `Created docs/product/changes/active/chg-scaffold-001/change.md (status draft, base-revision ${await git('rev-parse', 'HEAD')})`,
    );

    const content = await readFile(
      join(workDir, 'docs', 'product', 'changes', 'active', 'chg-scaffold-001', 'change.md'),
      'utf8',
    );
    expect(content).toContain('id: CHG-SCAFFOLD-001');
    expect(content).toContain('status: draft');
    expect(content).toContain(`base-revision: '${await git('rev-parse', 'HEAD')}'`);
    expect(content).toContain("title: 'Scaffold 001'");

    const validated = await run(['change', 'validate', 'CHG-SCAFFOLD-001']);
    expect(validated.code).toBe(0);
    expect(validated.out.join('\n')).toContain('0 error(s), 0 warning(s)');
  });

  it('emits the created record with --format json and honours --title', async () => {
    const result = await run([
      'change',
      'create',
      'CHG-SCAFFOLD-002',
      '--title',
      'Rename the probe',
      '--format',
      'json',
    ]);
    expect(result.code).toBe(0);
    const parsed = JSON.parse(result.out.join('\n')) as {
      created: { id: string; title: string; status: string; baseRevision: string; path: string };
    };
    expect(parsed.created).toEqual({
      id: 'CHG-SCAFFOLD-002',
      title: 'Rename the probe',
      status: 'draft',
      baseRevision: await git('rev-parse', 'HEAD'),
      path: 'docs/product/changes/active/chg-scaffold-002/change.md',
    });
  });

  it('falls back to the CHG-INITIAL sentinel base-revision outside Git history', async () => {
    await rm(join(workDir, '.git'), { recursive: true, force: true });
    const result = await run(['change', 'create', 'CHG-SCAFFOLD-003']);
    expect(result.code).toBe(0);
    const content = await readFile(
      join(workDir, 'docs', 'product', 'changes', 'active', 'chg-scaffold-003', 'change.md'),
      'utf8',
    );
    expect(content).toContain("base-revision: '0000000'");
  });

  it('refuses to overwrite an existing change with exit 2', async () => {
    await writeChange({ id: 'CHG-PROBE-001' });
    const result = await run(['change', 'create', 'CHG-PROBE-001']);
    expect(result.code).toBe(2);
    expect(result.err.join('\n')).toContain("change 'CHG-PROBE-001' already exists");
  });

  it('refuses an ID that does not match the change ID grammar with exit 2', async () => {
    const result = await run(['change', 'create', 'chg-lowercase-001']);
    expect(result.code).toBe(2);
    expect(result.err.join('\n')).toContain("invalid change ID 'chg-lowercase-001'");
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

  it('archives a superseded change under superseded/, not rejected/', async () => {
    // One directory per terminal status: a change that was overtaken was not refused, and
    // `superseded` is reachable from `approved`, so filing it under rejected/ would record a
    // decision nobody made.
    await writeChange({ status: 'superseded' });
    const result = await run(['change', 'archive', 'CHG-PROBE-001']);
    expect(result.code).toBe(0);
    expect(result.out.join('\n')).toContain('changes/superseded/chg-probe-001/change.md');
    const changes = join(workDir, 'docs', 'product', 'changes');
    await expect(
      stat(join(changes, 'superseded', 'chg-probe-001', 'change.md')),
    ).resolves.toBeDefined();
    await expect(stat(join(changes, 'rejected', 'chg-probe-001'))).rejects.toThrow();
  });

  it('lists a superseded change in the history with --all', async () => {
    await writeChange({ status: 'superseded' });
    expect((await run(['change', 'archive', 'CHG-PROBE-001'])).code).toBe(0);
    const result = await run(['change', 'list', '--all', '--format', 'json']);
    expect(result.code).toBe(0);
    const { changes } = JSON.parse(result.out.join('\n')) as {
      changes: { id: string; state: string; status: string }[];
    };
    expect(changes).toEqual([
      expect.objectContaining({ id: 'CHG-PROBE-001', state: 'superseded', status: 'superseded' }),
    ]);
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
