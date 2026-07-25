import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { repoRoot } from '../helpers.js';

const execFileAsync = promisify(execFile);

export async function git(cwd: string, ...args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { cwd, encoding: 'utf8' });
  return stdout.trim();
}

/** A temp Git repository seeded with the minimal example as its product baseline. */
export async function createLifecycleRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'product-definition-lifecycle-'));
  await mkdir(join(root, 'docs', 'product', 'changes', 'active'), { recursive: true });
  await cp(join(repoRoot, 'examples', 'minimal', 'model'), join(root, 'docs', 'product', 'model'), {
    recursive: true,
  });
  await git(root, 'init', '-b', 'main');
  await git(root, 'config', 'user.email', 'test@example.org');
  await git(root, 'config', 'user.name', 'Lifecycle Test');
  await git(root, 'config', 'core.autocrlf', 'false');
  await git(root, 'add', '-A');
  await git(root, 'commit', '-m', 'baseline');
  return root;
}

export async function write(root: string, relPath: string, content: string): Promise<void> {
  const target = join(root, ...relPath.split('/'));
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content, 'utf8');
}

export async function read(root: string, relPath: string): Promise<string> {
  return readFile(join(root, ...relPath.split('/')), 'utf8');
}

export function useCaseDoc(id: string, extraFrontmatter = ''): string {
  return [
    '---',
    `id: ${id}`,
    'type: use-case',
    `title: ${id} title`,
    'status: active',
    'primary-actor: ACT-VISITOR',
    'bounded-context: BC-SHORTENING',
    'governed-by:',
    '  - BR-VALID-URL-001',
    'uses-terms:',
    '  - TERM-SHORT-LINK',
    ...(extraFrontmatter ? [extraFrontmatter] : []),
    '---',
    '',
    '## Goal',
    'Annotate a short link with a note.',
    '## Trigger',
    'The visitor adds a note.',
    '## Preconditions',
    'A short link exists.',
    '## Main Flow',
    '1. The visitor submits a note for a short link.',
    '## Alternative Flows',
    'None.',
    '## Failure Conditions',
    'Invalid notes are rejected.',
    '## Postconditions',
    'The note is attached.',
    '',
  ].join('\n');
}

export function functionalRequirementDoc(id: string, derivedFrom: string[]): string {
  return [
    '---',
    `id: ${id}`,
    'type: functional-requirement',
    `title: ${id} title`,
    'status: active',
    'derived-from:',
    ...derivedFrom.map((d) => `  - ${d}`),
    'verification:',
    '  - scenario: A note can be attached and read back',
    '---',
    '',
    '## Requirement',
    'The product MUST attach notes to short links.',
    '## Rationale',
    'Notes make shared links understandable.',
    '## Acceptance Scenarios',
    'A note round-trips.',
    '',
  ].join('\n');
}

export function journeyDoc(id: string, steps: string[]): string {
  return [
    '---',
    `id: ${id}`,
    'type: journey',
    'title: Share a long address as a short link',
    'status: active',
    'primary-actor: ACT-VISITOR',
    'steps:',
    ...steps.map((s) => `  - use-case: ${s}`),
    '---',
    '',
    '## Intended Outcome',
    'A visitor shares an annotated short link.',
    '## Entry Conditions',
    'The visitor has a URL to share.',
    '## Journey Narrative',
    'The visitor shortens, annotates and shares.',
    '## Variants and Branches',
    'None.',
    '## Completion Conditions',
    'The short link resolves and shows its note.',
    '',
  ].join('\n');
}

export function changeDoc(options: {
  id: string;
  status: string;
  baseRevision: string;
  add?: string[];
  modify?: string[];
  remove?: string[];
  openQuestions?: string;
}): string {
  const section = (name: string, values?: string[]) =>
    values && values.length > 0
      ? [`  ${name}:`, ...values.map((v) => `    - ${v}`)]
      : [`  ${name}: []`];
  return [
    '---',
    `id: ${options.id}`,
    'type: product-change',
    `title: ${options.id} title`,
    `status: ${options.status}`,
    `base-revision: ${options.baseRevision}`,
    'operations:',
    ...section('add', options.add),
    ...section('modify', options.modify),
    ...section('remove', options.remove),
    '---',
    '',
    '## Problem',
    'Shared links lack context.',
    '## Intended Product Outcome',
    'Visitors can annotate links.',
    '## Rationale',
    'Notes travel with the link.',
    '## Affected Product Areas',
    'Shortening.',
    '## Open Questions',
    options.openQuestions ?? 'None.',
    '## Product Acceptance',
    'Annotated links resolve with their notes.',
    '## Out of Scope',
    'Editing notes.',
    '',
  ].join('\n');
}

export function sliceDoc(options: {
  id: string;
  change: string;
  status: string;
  requirement: string;
  coverage?: string;
  scope?: string;
  affects?: string[];
  dependsOn?: string[];
}): string {
  return [
    'schema: product-definition-as-code/delivery-slice/v1alpha1',
    `id: ${options.id}`,
    `title: ${options.id} title`,
    `status: ${options.status}`,
    `product-change: ${options.change}`,
    'outcome: A visitor can annotate a short link.',
    'implements:',
    `  - requirement: ${options.requirement}`,
    `    coverage: ${options.coverage ?? 'full'}`,
    ...(options.scope ? [`    scope: ${options.scope}`] : []),
    ...(options.affects && options.affects.length > 0
      ? ['affects:', ...options.affects.map((a) => `  - ${a}`)]
      : ['affects: []']),
    ...(options.dependsOn && options.dependsOn.length > 0
      ? ['depends-on:', ...options.dependsOn.map((d) => `  - ${d}`)]
      : ['depends-on: []']),
    'verification:',
    '  - A note can be attached through the product surface.',
    'out-of-scope:',
    '  - Note editing.',
    '',
  ].join('\n');
}
