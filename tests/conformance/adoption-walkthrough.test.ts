/**
 * The governed citation-first walkthrough, exercised from the packed CLI exactly as the
 * `@prodshape/cli` README documents it (UC-INIT-001, issue #97): kernel init, the first accepted
 * baseline through CHG-INITIAL, a verified current citation, and a stale dependency surfaced by a
 * later Product Change. A clean repository completes the loop from copied commands alone; every
 * file this test writes is the file the README shows.
 */
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '../helpers.js';

const execFileAsync = promisify(execFile);
const isWindows = process.platform === 'win32';

interface BinaryResult {
  code: number;
  stdout: string;
  stderr: string;
}

let scratch: string;
let dir: string;
let bin: string;

async function prodshape(args: string[]): Promise<BinaryResult> {
  try {
    const { stdout, stderr } = await execFileAsync(bin, args, {
      cwd: dir,
      encoding: 'utf8',
      shell: isWindows,
    });
    return { code: 0, stdout, stderr };
  } catch (error) {
    const failed = error as { code?: number; stdout?: string; stderr?: string };
    return { code: failed.code ?? 1, stdout: failed.stdout ?? '', stderr: failed.stderr ?? '' };
  }
}

async function git(...args: string[]): Promise<void> {
  await execFileAsync('git', args, { cwd: dir, encoding: 'utf8' });
}

const ACTOR = `---
id: ACT-USER
type: actor
title: 'User'
status: active
actor-kind: human
---

## Purpose

The person this product serves.

## Goals

- Get value from the product with minimal setup.

## Responsibilities

- Uses the product and reports what does not work.

## Boundaries

- Does not operate or administer the product.
`;

/** Fill a scaffolded change document's intent sections and declare its operations. */
async function authorChange(
  name: string,
  operations: string,
  outcome: string,
  approved: boolean,
): Promise<void> {
  const path = join(dir, 'docs', 'product', 'changes', 'active', name, 'change.md');
  let content = await readFile(path, 'utf8');
  content = content
    .replace('  add: []', operations.startsWith('add') ? `  add:\n    - ACT-USER` : '  add: []')
    .replace(
      '  modify: []',
      operations.startsWith('modify') ? `  modify:\n    - ACT-USER` : '  modify: []',
    )
    .replace(
      'What is wrong or missing in the current Product Definition? State the problem, not the solution.',
      'Stated in the walkthrough.',
    )
    .replace(
      'What the Product Definition says once this change is accepted. Describe the destination, not the steps.',
      outcome,
    )
    .replace('Why this outcome, and why now.', 'The walkthrough needs it.')
    .replace(
      'Which parts of the product this change touches, in product language rather than file paths.',
      'The User actor.',
    )
    .replace(
      'How a human recognises that the accepted definition expresses the intended outcome.',
      outcome,
    )
    .replace(
      'What this change explicitly does not touch, including delivery, technical design and implementation.',
      'Everything else.',
    );
  if (approved) content = content.replace('status: draft', 'status: approved');
  await writeFile(path, content, 'utf8');
}

beforeAll(async () => {
  scratch = await mkdtemp(join(tmpdir(), 'prodshape-walkthrough-'));

  await execFileAsync('npm', ['pack', '--pack-destination', scratch], {
    cwd: join(repoRoot, 'packages', 'cli'),
    encoding: 'utf8',
    shell: isWindows,
  });
  const tarball = (await readdir(scratch)).find((f) => f.endsWith('.tgz'));
  expect(tarball).toBeDefined();
  await writeFile(join(scratch, 'package.json'), '{ "name": "scratch", "private": true }\n');
  await execFileAsync('npm', ['install', '--no-audit', '--no-fund', tarball as string], {
    cwd: scratch,
    encoding: 'utf8',
    shell: isWindows,
  });
  bin = join(scratch, 'node_modules', '.bin', isWindows ? 'prodshape.cmd' : 'prodshape');

  dir = join(scratch, 'adoption');
  await mkdir(dir, { recursive: true });
  await execFileAsync('git', ['init', '-b', 'main'], { cwd: dir, encoding: 'utf8' });
  await git('config', 'user.email', 'walkthrough@example.invalid');
  await git('config', 'user.name', 'Walkthrough');
  await git('commit', '--allow-empty', '-m', 'init');
}, 180_000);

afterAll(async () => {
  await rm(scratch, { recursive: true, force: true });
});

describe('governed citation-first walkthrough (packed binary)', () => {
  it('reaches a verified current citation and then a stale one, through Product Changes only', async () => {
    // 1. Kernel init: a handful of files, no templates, no per-kind tree.
    const init = await prodshape(['init']);
    expect(init.code, init.stderr).toBe(0);
    expect(init.stdout).toContain('4 file(s) created');
    expect(init.stdout).toContain('prodshape change create CHG-INITIAL');

    // 2. Empty validation is not completed adoption.
    const empty = await prodshape(['validate']);
    expect(empty.code).toBe(0);
    expect(empty.stdout).toContain('No product definition exists yet');

    // 3. Templates stay discoverable on demand.
    const template = await prodshape(['template', 'actor']);
    expect(template.code).toBe(0);
    expect(template.stdout).toContain('type: actor');

    // 4. The first baseline arrives through CHG-INITIAL, approved by a human, applied explicitly.
    expect((await prodshape(['change', 'create', 'CHG-INITIAL'])).code).toBe(0);
    await writeFile(
      join(dir, 'docs', 'product', 'changes', 'active', 'chg-initial', 'proposed', 'act-user.md'),
      ACTOR,
      'utf8',
    );
    await authorChange('chg-initial', 'add', 'The definition names its first actor.', false);
    expect((await prodshape(['change', 'validate', 'CHG-INITIAL'])).code).toBe(0);

    // Not approved yet: apply refuses with the working tree untouched.
    const premature = await prodshape(['change', 'apply', 'CHG-INITIAL']);
    expect(premature.code).toBe(1);

    await authorChange('chg-initial', 'none', 'unused', true);
    const applied = await prodshape(['change', 'apply', 'CHG-INITIAL']);
    expect(applied.code, applied.stdout).toBe(0);
    await git('add', '-A');
    await git('commit', '-m', 'accept CHG-INITIAL');

    const populated = await prodshape(['validate']);
    expect(populated.stdout).toContain('across 1 artifact(s)');
    expect(populated.stdout).not.toContain('No product definition exists yet');

    // 5. Cite the accepted artifact from a consumer document; verify current.
    const inspect = await prodshape(['inspect', 'ACT-USER', '--format', 'json']);
    const digest = (JSON.parse(inspect.stdout) as { digest: string }).digest;
    const cite = await prodshape(['cite', '--id', 'ACT-USER', '--digest', digest]);
    expect(cite.code).toBe(0);
    await mkdir(join(dir, 'docs', 'decisions'), { recursive: true });
    await writeFile(
      join(dir, 'docs', 'decisions', 'adr-001.md'),
      `# ADR 001: single-user focus\n\n<!-- ${cite.stdout.trim()} -->\n`,
      'utf8',
    );
    const current = await prodshape(['citations', 'verify', 'docs/decisions']);
    expect(current.code, current.stdout).toBe(0);
    expect(current.stdout).toContain('1 current');

    // 6. The definition evolves through a second Product Change, never a baseline edit, and the
    //    recorded dependency goes visibly stale before any merge.
    expect((await prodshape(['change', 'create', 'CHG-USER-SCOPE'])).code).toBe(0);
    const accepted = await readFile(
      join(dir, 'docs', 'product', 'model', 'actors', 'act-user.md'),
      'utf8',
    );
    await writeFile(
      join(
        dir,
        'docs',
        'product',
        'changes',
        'active',
        'chg-user-scope',
        'proposed',
        'act-user.md',
      ),
      accepted.replace(
        'The person this product serves.',
        'The people and teams this product serves.',
      ),
      'utf8',
    );
    await authorChange('chg-user-scope', 'modify', 'The User covers people and teams.', true);
    const evolved = await prodshape(['change', 'apply', 'CHG-USER-SCOPE']);
    expect(evolved.code, evolved.stdout).toBe(0);
    expect(evolved.stdout).toContain('stale');

    const stale = await prodshape(['citations', 'verify', 'docs/decisions']);
    expect(stale.code).toBe(0);
    expect(stale.stdout).toContain('PRODUCT061');
    expect(stale.stdout).toContain('1 stale');
  }, 240_000);
});
