import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  addEvidence,
  addLead,
  addQuestion,
  answerQuestion,
  checkRecoverySession,
  deferQuestion,
  loadRecoverySession,
  markEvidence,
  markEvidenceBulk,
  markFamilyProbe,
  nextBatch,
  resolveLead,
  scanCandidates,
  snapshotEvidence,
  startRecoverySession,
  buildRecoveryReport,
  computeCoverage,
  unmarkEvidence,
  writeRecoveryReport,
} from './recovery-session.js';
import {
  defaultRecoveryBrief,
  RecoveryStateError,
  readRecoverySessionFiles,
  type RecoveryBrief,
} from './recovery.js';
import { openRepository, type ProductRepository } from './repository.js';
import { productArtifactTypes } from './artifact.js';

const clock = { now: () => '2026-08-12T00:00:00.000Z' };
const scratchDirs: string[] = [];

afterAll(async () => {
  for (const dir of scratchDirs) await rm(dir, { recursive: true, force: true });
});

async function makeRepo(files: Record<string, string> = {}): Promise<ProductRepository> {
  const root = await mkdtemp(join(tmpdir(), 'prodshape-recovery-'));
  scratchDirs.push(root);
  await mkdir(join(root, 'docs', 'product', 'model'), { recursive: true });
  for (const [rel, content] of Object.entries(files)) {
    const absolute = join(root, ...rel.split('/'));
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, content, 'utf8');
  }
  return openRepository(root);
}

function brief(overrides: Partial<RecoveryBrief> = {}): RecoveryBrief {
  return { ...defaultRecoveryBrief(), ...overrides };
}

const actorCandidate = [
  '---',
  'id: ACT-SHOPPER',
  'type: actor',
  'title: Shopper',
  'status: draft',
  'actor-kind: human',
  'provenance:',
  '  source: src/orders.ts (checkout flow)',
  '  confidence: high',
  '  recovered-from: observation',
  '---',
  '',
  '## Purpose',
  '',
  'Buys things.',
  '',
  '## Goals',
  '',
  'Complete a purchase.',
  '',
  '## Responsibilities',
  '',
  'Provides payment and address details.',
  '',
  '## Boundaries',
  '',
  'Never edits the catalogue.',
  '',
].join('\n');

const initialChange = [
  '---',
  'id: CHG-INITIAL',
  'type: product-change',
  'title: Establish the first Product Definition',
  'status: draft',
  "base-revision: '0000000'",
  'operations:',
  '  add:',
  '    - ACT-SHOPPER',
  '  modify: []',
  '  remove: []',
  '---',
  '',
  '## Problem',
  '',
  'The system shipped without a product definition.',
  '',
  '## Intended Product Outcome',
  '',
  'A reviewable initial baseline recovered from evidence.',
  '',
  '## Rationale',
  '',
  'Initialisation uses the same mechanism as every later change.',
  '',
  '## Affected Product Areas',
  '',
  'The whole model; it did not exist before this change.',
  '',
  '## Open Questions',
  '',
  'None.',
  '',
  '## Product Acceptance',
  '',
  'The overlay validates without errors and a human accepts the pull request.',
  '',
  '## Out of Scope',
  '',
  'Delivery design.',
  '',
].join('\n');

async function writeCandidateAndChange(repo: ProductRepository): Promise<void> {
  const changeDir = join(repo.root, 'docs', 'product', 'changes', 'active', 'chg-initial');
  await mkdir(join(changeDir, 'proposed', 'actors'), { recursive: true });
  await writeFile(join(changeDir, 'change.md'), initialChange, 'utf8');
  await writeFile(join(changeDir, 'proposed', 'actors', 'act-shopper.md'), actorCandidate, 'utf8');
}

describe('startRecoverySession', () => {
  it('inventories the declared scope deterministically', async () => {
    const files = {
      'src/orders.ts': 'export const limit = 10_000;\n',
      'src/refunds.ts': 'export const days = 30;\n',
      'docs/help.md': '# Help\n',
      'docs/product/model/.gitkeep': '',
      '.product/config.yaml': 'version: v1alpha1\n',
    };
    const first = await startRecoverySession(await makeRepo(files), {
      cliVersion: '0.0.0-test',
      clock,
    });
    const second = await startRecoverySession(await makeRepo(files), {
      cliVersion: '0.0.0-test',
      clock,
    });
    const shape = (session: typeof first) =>
      session.inventory.items.map((i) => ({ id: i.id, path: i.path, digest: i.digest }));
    expect(shape(first)).toEqual(shape(second));
    const paths = first.inventory.items.map((i) => i.path);
    // The product definition tree and .product/ are the output side, never evidence.
    expect(paths).toContain('src/orders.ts');
    expect(paths).toContain('docs/help.md');
    expect(paths.some((p) => p?.startsWith('docs/product/'))).toBe(false);
    expect(paths.some((p) => p?.startsWith('.product/'))).toBe(false);
  });

  it('applies exclude and forbidden rules and registers brief externals', async () => {
    const repo = await makeRepo({
      'src/orders.ts': 'code\n',
      'src/legacy/old.ts': 'legacy\n',
      'ops/.env': 'SECRET=1\n',
      'notes/interview.md': 'The refund window is 30 days, says the operator.\n',
    });
    const session = await startRecoverySession(repo, {
      cliVersion: '0.0.0-test',
      clock,
      brief: brief({
        exclude: ['src/legacy/**'],
        externalSources: [
          { url: 'https://example.test/help', title: 'Help centre' },
          { file: 'notes/interview.md', title: 'Operator interview' },
        ],
      }),
    });
    const paths = session.inventory.items.map((i) => i.path ?? i.url);
    expect(paths).toContain('src/orders.ts');
    expect(paths).not.toContain('src/legacy/old.ts');
    expect(paths).not.toContain('ops/.env');
    expect(paths).toContain('https://example.test/help');
    const external = session.inventory.items.filter((i) => i.kind !== 'repo-file');
    expect(external.map((i) => i.authorization)).toEqual(['brief', 'brief']);
    const url = external.find((i) => i.kind === 'external-url');
    expect(url?.digest).toBeUndefined();
  });

  it('refuses when an accepted baseline already exists', async () => {
    const repo = await makeRepo({
      'docs/product/model/actors/act-someone.md': actorCandidate.replace(
        'status: draft',
        'status: active',
      ),
    });
    await expect(startRecoverySession(repo, { cliVersion: '0.0.0-test', clock })).rejects.toThrow(
      /ordinary Product Change/,
    );
  });

  it('refuses when CHG-INITIAL was already applied, even over an empty model', async () => {
    const repo = await makeRepo({
      'docs/product/changes/completed/chg-initial/change.md': initialChange,
    });
    await expect(startRecoverySession(repo, { cliVersion: '0.0.0-test', clock })).rejects.toThrow(
      /already applied/,
    );
  });

  it('refuses to reuse an existing session id', async () => {
    const repo = await makeRepo({ 'src/a.ts': 'a\n' });
    await startRecoverySession(repo, { cliVersion: '0.0.0-test', clock, sessionId: 'session-001' });
    await expect(
      startRecoverySession(repo, { cliVersion: '0.0.0-test', clock, sessionId: 'session-001' }),
    ).rejects.toThrow(/already exists/);
  });
});

describe('batches and marking', () => {
  it('returns bounded batches in stable order', async () => {
    const repo = await makeRepo({
      'src/a.ts': 'a\n',
      'src/b.ts': 'b\n',
      'src/c.ts': 'c\n',
    });
    const session = await startRecoverySession(repo, {
      cliVersion: '0.0.0-test',
      clock,
      brief: brief({ batchSize: 2 }),
    });
    const batch = nextBatch(session);
    expect(batch).toHaveLength(2);
    expect(batch.map((i) => i.id)).toEqual(['E-0001', 'E-0002']);
    expect(nextBatch(session, 1)).toHaveLength(1);
  });

  it('enforces the finding contracts', async () => {
    const repo = await makeRepo({ 'src/a.ts': 'a\n' });
    const session = await startRecoverySession(repo, { cliVersion: '0.0.0-test', clock });

    await expect(
      markEvidence(repo, session, { source: 'E-0001', classification: 'represented', clock }),
    ).rejects.toThrow(/--artifacts/);
    await expect(
      markEvidence(repo, session, { source: 'E-0001', classification: 'out-of-scope', clock }),
    ).rejects.toThrow(/--reason/);
    await expect(
      markEvidence(repo, session, { source: 'E-0001', classification: 'question', clock }),
    ).rejects.toThrow(/question add/);
    await expect(
      markEvidence(repo, session, { source: 'E-0001', complete: true, clock }),
    ).rejects.toThrow(/no findings/);
    await expect(
      markEvidence(repo, session, { source: 'E-0001', exclude: true, clock }),
    ).rejects.toThrow(/--reason/);

    const marked = await markEvidence(repo, session, {
      source: 'src/a.ts',
      classification: 'no-product-intent',
      reason: 'Build plumbing only',
      complete: true,
      clock,
    });
    expect(marked.status).toBe('processed');
    expect(marked.findings).toHaveLength(1);
  });

  it('records contradictions with their linked question', async () => {
    const repo = await makeRepo({ 'src/a.ts': 'a\n' });
    const session = await startRecoverySession(repo, { cliVersion: '0.0.0-test', clock });
    const question = await addQuestion(repo, session, {
      text: 'Docs say 5000, code enforces 10000; which is the product intent?',
      clock,
    });
    const marked = await markEvidence(repo, session, {
      source: 'E-0001',
      classification: 'contradiction',
      note: 'README limit disagrees with the enforced limit',
      question: question.id,
      clock,
    });
    expect(marked.findings[0]?.question).toBe(question.id);
  });
});

describe('resume and invalidation', () => {
  it('a fresh load sees exactly the persisted state', async () => {
    const repo = await makeRepo({ 'src/a.ts': 'a\n', 'src/b.ts': 'b\n' });
    const started = await startRecoverySession(repo, { cliVersion: '0.0.0-test', clock });
    await markEvidence(repo, started, {
      source: 'E-0001',
      classification: 'no-product-intent',
      reason: 'plumbing',
      complete: true,
      clock,
    });
    await addLead(repo, started, { description: 'grep for refund rules', kind: 'repo', clock });

    const resumed = await loadRecoverySession(repo, started.state.sessionId);
    expect(resumed.state).toEqual(started.state);
    expect(resumed.inventory).toEqual(started.inventory);
    expect(resumed.leads).toEqual(started.leads);
    expect(resumed.questions).toEqual(started.questions);
  });

  it('a changed processed file goes stale and needs --accept-changed', async () => {
    const repo = await makeRepo({ 'src/a.ts': 'a\n' });
    const session = await startRecoverySession(repo, { cliVersion: '0.0.0-test', clock });
    await markEvidence(repo, session, {
      source: 'E-0001',
      classification: 'no-product-intent',
      reason: 'plumbing',
      complete: true,
      clock,
    });

    await writeFile(join(repo.root, 'src', 'a.ts'), 'changed\n', 'utf8');
    const result = await checkRecoverySession(repo, session, clock);
    expect(result.issues.some((i) => i.code === 'stale-evidence')).toBe(true);
    expect(session.inventory.items[0]?.status).toBe('stale');
    expect(result.coverage.completion.criteria.noStaleEvidence).toBe(false);

    await expect(
      markEvidence(repo, session, {
        source: 'E-0001',
        classification: 'no-product-intent',
        reason: 'still plumbing',
        complete: true,
        clock,
      }),
    ).rejects.toThrow(/--accept-changed/);

    const remarked = await markEvidence(repo, session, {
      source: 'E-0001',
      classification: 'no-product-intent',
      reason: 'still plumbing',
      complete: true,
      acceptChanged: true,
      clock,
    });
    expect(remarked.status).toBe('processed');
    expect(remarked.findings).toHaveLength(1);
  });

  it('new files join the inventory, deleted files go missing, restored files recover', async () => {
    const repo = await makeRepo({ 'src/a.ts': 'a\n' });
    const session = await startRecoverySession(repo, { cliVersion: '0.0.0-test', clock });
    await markEvidence(repo, session, {
      source: 'E-0001',
      classification: 'no-product-intent',
      reason: 'plumbing',
      complete: true,
      clock,
    });

    await writeFile(join(repo.root, 'src', 'b.ts'), 'new\n', 'utf8');
    let result = await checkRecoverySession(repo, session, clock);
    expect(result.issues.some((i) => i.code === 'new-evidence')).toBe(true);
    expect(session.inventory.items.map((i) => i.path)).toContain('src/b.ts');

    await rm(join(repo.root, 'src', 'a.ts'));
    result = await checkRecoverySession(repo, session, clock);
    expect(result.issues.some((i) => i.code === 'missing-evidence')).toBe(true);

    await writeFile(join(repo.root, 'src', 'a.ts'), 'a\n', 'utf8');
    result = await checkRecoverySession(repo, session, clock);
    expect(session.inventory.items.find((i) => i.path === 'src/a.ts')?.status).toBe('processed');
  });

  it('corrupted state is refused with a reconciliation message', async () => {
    const repo = await makeRepo({ 'src/a.ts': 'a\n' });
    const session = await startRecoverySession(repo, { cliVersion: '0.0.0-test', clock });
    await writeFile(join(session.dir, 'state.json'), '{ "schema": "nope" ', 'utf8');
    await expect(readRecoverySessionFiles(session.dir, session.relDir)).rejects.toThrow(
      RecoveryStateError,
    );
  });
});

describe('external and user-provided evidence', () => {
  it('external sources require explicit authorisation', async () => {
    const repo = await makeRepo({ 'src/a.ts': 'a\n' });
    const session = await startRecoverySession(repo, { cliVersion: '0.0.0-test', clock });
    await expect(
      addEvidence(repo, session, { url: 'https://example.test', title: 'Docs', clock }),
    ).rejects.toThrow(/explicit user authorisation/);
    const added = await addEvidence(repo, session, {
      url: 'https://example.test',
      title: 'Docs',
      authorized: true,
      clock,
    });
    expect(added.kind).toBe('external-url');
    expect(added.authorization).toBe('user');
  });

  it('snapshots freeze external content and make it hash-checkable', async () => {
    const repo = await makeRepo({ 'src/a.ts': 'a\n' });
    const session = await startRecoverySession(repo, { cliVersion: '0.0.0-test', clock });
    const added = await addEvidence(repo, session, {
      url: 'https://example.test/pricing',
      title: 'Pricing page',
      authorized: true,
      clock,
    });
    const fetched = join(repo.root, 'downloaded.html');
    await writeFile(fetched, '<h1>Pricing</h1>\n', 'utf8');
    const snapshotted = await snapshotEvidence(repo, session, added.id, fetched, clock);
    expect(snapshotted.digest).toMatch(/^sha256:/);
    expect(snapshotted.snapshot).toBe(`evidence/${added.id.toLowerCase()}.snapshot`);

    // Tampering with the frozen copy is staleness like any other.
    await writeFile(
      join(session.dir, 'evidence', `${added.id.toLowerCase()}.snapshot`),
      'other',
      'utf8',
    );
    const result = await checkRecoverySession(repo, session, clock);
    expect(result.issues.some((i) => i.code === 'stale-evidence' && i.source === added.id)).toBe(
      true,
    );
  });

  it('inline user knowledge is stored in the session and hashed', async () => {
    const repo = await makeRepo({ 'src/a.ts': 'a\n' });
    const session = await startRecoverySession(repo, { cliVersion: '0.0.0-test', clock });
    const added = await addEvidence(repo, session, {
      text: 'The operator confirms refunds close after 30 days.',
      title: 'Operator statement',
      clock,
    });
    expect(added.kind).toBe('user-input');
    expect(added.digest).toMatch(/^sha256:/);
    const stored = await readFile(
      join(session.dir, 'evidence', `${added.id.toLowerCase()}.md`),
      'utf8',
    );
    expect(stored).toContain('30 days');
  });
});

describe('candidates, doctrine enforcement and completion', () => {
  it('flags mappings to candidates that do not exist under CHG-INITIAL', async () => {
    const repo = await makeRepo({ 'src/a.ts': 'a\n' });
    const session = await startRecoverySession(repo, { cliVersion: '0.0.0-test', clock });
    await markEvidence(repo, session, {
      source: 'E-0001',
      classification: 'represented',
      artifacts: ['ACT-GHOST'],
      complete: true,
      clock,
    });
    const result = await checkRecoverySession(repo, session, clock);
    expect(result.issues.some((i) => i.code === 'unresolved-candidate')).toBe(true);
    expect(result.coverage.completion.criteria.outputOnlyChgInitial).toBe(false);
  });

  it('flags candidates without provenance or not in draft status', async () => {
    const repo = await makeRepo({ 'src/orders.ts': 'code\n' });
    const session = await startRecoverySession(repo, { cliVersion: '0.0.0-test', clock });
    const changeDir = join(repo.root, 'docs', 'product', 'changes', 'active', 'chg-initial');
    await mkdir(join(changeDir, 'proposed', 'actors'), { recursive: true });
    await writeFile(join(changeDir, 'change.md'), initialChange, 'utf8');
    const bare = actorCandidate
      .replace('status: draft', 'status: active')
      .replace(/provenance:[\s\S]*?recovered-from: observation\n/, '');
    await writeFile(join(changeDir, 'proposed', 'actors', 'act-shopper.md'), bare, 'utf8');

    const result = await checkRecoverySession(repo, session, clock);
    expect(result.issues.some((i) => i.code === 'candidate-without-provenance')).toBe(true);
    expect(result.issues.some((i) => i.code === 'candidate-not-draft')).toBe(true);
  });

  it('flags edits to the accepted model as a doctrine violation', async () => {
    const repo = await makeRepo({ 'src/a.ts': 'a\n' });
    const session = await startRecoverySession(repo, { cliVersion: '0.0.0-test', clock });
    await mkdir(join(repo.root, 'docs', 'product', 'model', 'actors'), { recursive: true });
    await writeFile(
      join(repo.root, 'docs', 'product', 'model', 'actors', 'act-sneaky.md'),
      actorCandidate,
      'utf8',
    );
    const result = await checkRecoverySession(repo, session, clock);
    expect(result.issues.some((i) => i.code === 'model-modified')).toBe(true);
    expect(result.coverage.completion.criteria.modelUntouched).toBe(false);
  });

  it('a full loop reaches verified completion', async () => {
    const repo = await makeRepo({ 'src/orders.ts': 'export const limit = 10_000;\n' });
    const session = await startRecoverySession(repo, { cliVersion: '0.0.0-test', clock });

    expect(nextBatch(session).map((i) => i.id)).toEqual(['E-0001']);
    await writeCandidateAndChange(repo);
    await markEvidence(repo, session, {
      source: 'E-0001',
      classification: 'represented',
      artifacts: ['ACT-SHOPPER'],
      complete: true,
      clock,
    });
    for (const family of productArtifactTypes) {
      if (family === 'actor') continue;
      await markFamilyProbe(
        repo,
        session,
        family,
        `No ${family} evidence in the single source file`,
        clock,
      );
    }
    const lead = await addLead(repo, session, {
      description: 'check the README',
      kind: 'repo',
      clock,
    });
    await resolveLead(repo, session, lead.id, 'No README exists', clock);
    const question = await addQuestion(repo, session, {
      text: 'Is the limit 10000 by intent?',
      clock,
    });
    await answerQuestion(repo, session, question.id, 'Yes, confirmed by the user', clock);

    const result = await checkRecoverySession(repo, session, clock);
    expect(result.issues.filter((i) => i.severity === 'error')).toEqual([]);
    expect(result.coverage.completion.complete).toBe(true);

    const candidates = await scanCandidates(repo, session.state);
    expect(candidates.map((c) => c.id)).toEqual(['ACT-SHOPPER']);
  });

  it('open questions, open leads and unprobed families block completion', async () => {
    const repo = await makeRepo({ 'src/orders.ts': 'code\n' });
    const session = await startRecoverySession(repo, { cliVersion: '0.0.0-test', clock });
    await writeCandidateAndChange(repo);
    await markEvidence(repo, session, {
      source: 'E-0001',
      classification: 'represented',
      artifacts: ['ACT-SHOPPER'],
      complete: true,
      clock,
    });
    await addLead(repo, session, { description: 'unfollowed lead', kind: 'repo', clock });
    await addQuestion(repo, session, { text: 'unanswered question', clock });

    const result = await checkRecoverySession(repo, session, clock);
    const criteria = result.coverage.completion.criteria;
    expect(criteria.leadsResolved).toBe(false);
    expect(criteria.questionsResolved).toBe(false);
    expect(criteria.familiesProbed).toBe(false);
    expect(result.coverage.completion.complete).toBe(false);

    // A deferred question with a reason counts as resolved; silence does not.
    const question = session.questions.questions[0];
    expect(question).toBeDefined();
    await deferQuestion(repo, session, question!.id, 'Waiting for the operations team', clock);
    const after = await computeCoverage(
      repo,
      session,
      await scanCandidates(repo, session.state),
      clock,
    );
    expect(after.completion.criteria.questionsResolved).toBe(true);
  });
});

describe('leads', () => {
  it('tracks leads of every source kind until each is resolved', async () => {
    const repo = await makeRepo({ 'src/a.ts': 'a\n' });
    const session = await startRecoverySession(repo, { cliVersion: '0.0.0-test', clock });
    const repoLead = await addLead(repo, session, {
      description: 'The orders module imports a pricing engine nobody mentioned',
      source: 'E-0001',
      kind: 'repo',
      clock,
    });
    const externalLead = await addLead(repo, session, {
      description: 'The README links a public help centre that may state refund policy',
      kind: 'external',
      clock,
    });
    const userLead = await addLead(repo, session, {
      description: 'Ask the operator who approves refunds above the limit',
      kind: 'user',
      clock,
    });
    expect(session.leads.leads.map((l) => l.kind)).toEqual(['repo', 'external', 'user']);

    let coverage = await computeCoverage(
      repo,
      session,
      await scanCandidates(repo, session.state),
      clock,
    );
    expect(coverage.leads.open).toBe(3);
    expect(coverage.completion.criteria.leadsResolved).toBe(false);

    await resolveLead(repo, session, repoLead.id, 'Pricing engine is dead code, excluded', clock);
    await resolveLead(repo, session, externalLead.id, 'User declined external access', clock);
    await resolveLead(repo, session, userLead.id, 'Operator answered; recorded as evidence', clock);
    coverage = await computeCoverage(
      repo,
      session,
      await scanCandidates(repo, session.state),
      clock,
    );
    expect(coverage.completion.criteria.leadsResolved).toBe(true);
  });
});

describe('report', () => {
  it('carries the non-acceptance statement, mappings and external usage', async () => {
    const repo = await makeRepo({ 'src/orders.ts': 'code\n' });
    const session = await startRecoverySession(repo, { cliVersion: '0.0.0-test', clock });
    await writeCandidateAndChange(repo);
    await markEvidence(repo, session, {
      source: 'E-0001',
      classification: 'represented',
      artifacts: ['ACT-SHOPPER'],
      complete: true,
      clock,
    });
    const added = await addEvidence(repo, session, {
      text: 'Refund window is 30 days.',
      title: 'Operator statement',
      clock,
    });
    await markEvidence(repo, session, {
      source: added.id,
      classification: 'duplicate',
      artifacts: ['ACT-SHOPPER'],
      note: 'Confirms the shopper actor',
      complete: true,
      clock,
    });
    await checkRecoverySession(repo, session, clock);

    const { path } = await writeRecoveryReport(repo, session, clock);
    expect(path).toBe(`${session.relDir}/report.md`);
    const report = await readFile(join(session.dir, 'report.md'), 'utf8');
    expect(report).toContain('## Non-acceptance statement');
    expect(report).toContain('ACT-SHOPPER');
    expect(report).toContain('E-0001');
    expect(report).toContain('Operator statement');
    expect(report).toContain('docs/product/changes/active/chg-initial');

    const coverage = await computeCoverage(
      repo,
      session,
      await scanCandidates(repo, session.state),
      clock,
    );
    const rendered = buildRecoveryReport(
      session,
      coverage,
      await scanCandidates(repo, session.state),
    );
    expect(rendered).toContain('Complete:');
  });
});

describe('artifact id validation at mark time', () => {
  it('rejects the space-joined shape an unquoted PowerShell list produces, persisting nothing', async () => {
    const repo = await makeRepo({ 'src/a.ts': 'a\n' });
    const session = await startRecoverySession(repo, { cliVersion: '0.0.0-test', clock });
    await expect(
      markEvidence(repo, session, {
        source: 'E-0001',
        classification: 'represented',
        artifacts: ['ACT-SHOPPER TERM-ORDER BR-LIMIT'],
        clock,
      }),
    ).rejects.toThrow(/quote the list/);
    const reloaded = await loadRecoverySession(repo, session.state.sessionId);
    expect(reloaded.inventory.items[0]?.findings).toHaveLength(0);
  });

  it('accepts every artifact kind prefix, structured behaviours included', async () => {
    const repo = await makeRepo({ 'src/a.ts': 'a\n' });
    const session = await startRecoverySession(repo, { cliVersion: '0.0.0-test', clock });
    const marked = await markEvidence(repo, session, {
      source: 'E-0001',
      classification: 'represented',
      artifacts: ['SB-CHECKOUT-HAPPY-PATH', 'UC-CHECKOUT'],
      clock,
    });
    expect(marked.findings[0]?.artifacts).toEqual(['SB-CHECKOUT-HAPPY-PATH', 'UC-CHECKOUT']);
  });
});

describe('bulk marking', () => {
  it('applies one identical finding to every pending glob match in a single write', async () => {
    const repo = await makeRepo({
      'src/a.cs': 'a\n',
      'src/b.cs': 'b\n',
      'docs/readme.md': 'docs\n',
    });
    const session = await startRecoverySession(repo, { cliVersion: '0.0.0-test', clock });
    const items = await markEvidenceBulk(repo, session, {
      globs: ['src/**'],
      classification: 'no-product-intent',
      reason: 'Implementation code: corroborates candidates, defines no product behaviour',
      complete: true,
      clock,
    });
    expect(items.map((i) => i.path).sort()).toEqual(['src/a.cs', 'src/b.cs']);
    const reloaded = await loadRecoverySession(repo, session.state.sessionId);
    expect(
      reloaded.inventory.items
        .filter((i) => i.status === 'processed')
        .map((i) => i.path)
        .sort(),
    ).toEqual(['src/a.cs', 'src/b.cs']);
    expect(reloaded.inventory.items.find((i) => i.path === 'docs/readme.md')?.status).toBe(
      'pending',
    );
  });

  it('is all-or-nothing: one unmarkable source refuses the whole selection', async () => {
    const repo = await makeRepo({ 'src/a.ts': 'a\n', 'src/b.ts': 'b\n' });
    const session = await startRecoverySession(repo, { cliVersion: '0.0.0-test', clock });
    await markEvidence(repo, session, {
      source: 'E-0001',
      exclude: true,
      reason: 'Out of the product boundary',
      clock,
    });
    await expect(
      markEvidenceBulk(repo, session, {
        sources: ['E-0001', 'E-0002'],
        classification: 'no-product-intent',
        reason: 'Plumbing',
        complete: true,
        clock,
      }),
    ).rejects.toThrow(/nothing was changed/);
    const reloaded = await loadRecoverySession(repo, session.state.sessionId);
    expect(reloaded.inventory.items.find((i) => i.id === 'E-0002')?.findings).toHaveLength(0);
  });

  it('refuses a selection that matches nothing instead of succeeding vacuously', async () => {
    const repo = await makeRepo({ 'src/a.ts': 'a\n' });
    const session = await startRecoverySession(repo, { cliVersion: '0.0.0-test', clock });
    await expect(
      markEvidenceBulk(repo, session, {
        globs: ['nowhere/**'],
        classification: 'no-product-intent',
        reason: 'Plumbing',
        clock,
      }),
    ).rejects.toThrow(/matches no markable evidence/);
  });
});

describe('unmark', () => {
  it('retracts the last finding and returns the source to pending', async () => {
    const repo = await makeRepo({ 'src/a.ts': 'a\n' });
    const session = await startRecoverySession(repo, { cliVersion: '0.0.0-test', clock });
    await markEvidence(repo, session, {
      source: 'E-0001',
      classification: 'no-product-intent',
      reason: 'Plumbing',
      complete: true,
      clock,
    });
    const item = await unmarkEvidence(repo, session, { source: 'E-0001', last: true, clock });
    expect(item.status).toBe('pending');
    expect(item.findings).toHaveLength(0);
    expect(item.processedAt).toBeUndefined();
    const reloaded = await loadRecoverySession(repo, session.state.sessionId);
    expect(reloaded.inventory.items[0]?.status).toBe('pending');
  });

  it('retracts by 1-based index and validates the selector contract', async () => {
    const repo = await makeRepo({ 'src/a.ts': 'a\n' });
    const session = await startRecoverySession(repo, { cliVersion: '0.0.0-test', clock });
    await markEvidence(repo, session, {
      source: 'E-0001',
      classification: 'no-product-intent',
      reason: 'First finding',
      clock,
    });
    await markEvidence(repo, session, {
      source: 'E-0001',
      classification: 'represented',
      artifacts: ['ACT-SHOPPER'],
      clock,
    });
    await expect(unmarkEvidence(repo, session, { source: 'E-0001', clock })).rejects.toThrow(
      /exactly one of/,
    );
    await expect(
      unmarkEvidence(repo, session, { source: 'E-0001', last: true, all: true, clock }),
    ).rejects.toThrow(/exactly one of/);
    await expect(
      unmarkEvidence(repo, session, { source: 'E-0001', index: 3, clock }),
    ).rejects.toThrow(/between 1 and 2/);
    const item = await unmarkEvidence(repo, session, { source: 'E-0001', index: 1, clock });
    expect(item.findings).toHaveLength(1);
    expect(item.findings[0]?.classification).toBe('represented');
  });

  it('refuses sources with nothing to retract and keeps staleness visible', async () => {
    const repo = await makeRepo({ 'src/a.ts': 'a\n', 'src/b.ts': 'b\n' });
    const session = await startRecoverySession(repo, { cliVersion: '0.0.0-test', clock });
    await expect(
      unmarkEvidence(repo, session, { source: 'E-0001', all: true, clock }),
    ).rejects.toThrow(/no findings/);

    await markEvidence(repo, session, {
      source: 'E-0001',
      classification: 'no-product-intent',
      reason: 'Plumbing',
      complete: true,
      clock,
    });
    await writeFile(join(repo.root, 'src', 'a.ts'), 'changed\n', 'utf8');
    await checkRecoverySession(repo, session);
    expect(session.inventory.items[0]?.status).toBe('stale');
    const item = await unmarkEvidence(repo, session, { source: 'E-0001', all: true, clock });
    expect(item.status).toBe('stale');
    expect(item.findings).toHaveLength(0);
  });
});

describe('evidence tiers', () => {
  it('orders the inventory tier by tier, unmatched sources last', async () => {
    const repo = await makeRepo({
      'src/a.ts': 'a\n',
      'docs/spec.md': 'spec\n',
      'readme.md': 'readme\n',
      'openspec/specs/checkout.md': 'checkout\n',
    });
    const session = await startRecoverySession(repo, {
      cliVersion: '0.0.0-test',
      clock,
      brief: brief({
        tiers: [
          { name: 'sdd-specs', globs: ['openspec/**'] },
          { name: 'docs', globs: ['docs/**', '*.md'] },
        ],
      }),
    });
    expect(session.inventory.items.map((i) => i.path)).toEqual([
      'openspec/specs/checkout.md',
      'docs/spec.md',
      'readme.md',
      'src/a.ts',
    ]);
  });

  it('a brief without tiers keeps the plain path order', async () => {
    const repo = await makeRepo({ 'src/a.ts': 'a\n', 'docs/spec.md': 'spec\n' });
    const session = await startRecoverySession(repo, { cliVersion: '0.0.0-test', clock });
    expect(session.inventory.items.map((i) => i.path)).toEqual(['docs/spec.md', 'src/a.ts']);
  });
});
