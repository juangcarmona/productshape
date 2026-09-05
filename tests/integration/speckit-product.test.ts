import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { repoRoot } from '../helpers.js';
import { defaultRecoveryBrief } from '@prodshape/core';
import {
  applySpecKitProductChange,
  archiveSpecKitProductChange,
  createSpecKitProductChange,
  completeSpecKitRecoveryRound,
  listSpecKitProductChanges,
  nextSpecKitRecoveryBatch,
  recordSpecKitRecoveryBatch,
  refineSpecKitProductChange,
  startOrResumeSpecKitRecovery,
  startSpecKitRecovery,
  validateSpecKitProductChange,
  writeSpecKitRecoveryCandidate,
} from '@prodshape/integration-speckit';

async function workspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'prodshape-speckit-product-'));
  await mkdir(join(root, '.product'), { recursive: true });
  await writeFile(join(root, '.product', 'config.yaml'), 'version: v1alpha1\n', 'utf8');
  await mkdir(join(root, '.specify', 'memory'), { recursive: true });
  await cp(
    join(repoRoot, 'examples', 'minimal', 'product', 'model'),
    join(root, 'docs', 'product', 'model'),
    { recursive: true },
  );
  return root;
}

describe('Spec Kit PRODUCT adapter', () => {
  it('ships a separate Spec Kit extension command family', async () => {
    const manifest = parse(
      await readFile(join(repoRoot, 'extensions', 'speckit-pdac-product', 'extension.yml'), 'utf8'),
    ) as {
      extension: { id: string };
      requires: { speckit_version: string };
      provides: { commands: { name: string; file: string }[] };
    };
    expect(manifest.extension.id).toBe('pdac-product');
    expect(manifest.requires.speckit_version).toBe('>=1.0.4');
    expect(manifest.provides.commands).toHaveLength(6);
    expect(manifest.provides.commands.map((command) => command.name)).toContain(
      'speckit.pdac-product.change',
    );
  });

  it('keeps multiple named changes in an adapter-owned area and validates from disk', async () => {
    const root = await workspace();
    try {
      await createSpecKitProductChange(root, 'checkout-copy');
      await createSpecKitProductChange(root, 'billing-copy');
      expect((await listSpecKitProductChanges(root)).map((c) => c.name)).toEqual([
        'billing-copy',
        'checkout-copy',
      ]);
      const checked = await validateSpecKitProductChange(root, 'checkout-copy');
      expect(checked.change.id).toBe('CHG-CHECKOUT-COPY-001');
      expect(
        checked.diagnostics.every((d) => d.file?.includes('docs/product/changes/active') !== true),
      ).toBe(true);
      expect(
        existsSync(join(root, '.specify', 'productshape', 'changes', 'checkout-copy', 'change.md')),
      ).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('refuses unauthorized apply without changing the model or hosted state', async () => {
    const root = await workspace();
    try {
      await createSpecKitProductChange(root, 'safe-change');
      const change = join(root, '.specify', 'productshape', 'changes', 'safe-change', 'change.md');
      const before = await readFile(change, 'utf8');
      const model = join(root, 'docs', 'product', 'model');
      const modelBefore = await readFile(join(model, 'actors', 'act-visitor.md'), 'utf8');
      const result = await applySpecKitProductChange(root, 'safe-change');
      expect(result.outcome).toBe('refused');
      expect(await readFile(change, 'utf8')).toBe(before);
      expect(await readFile(join(model, 'actors', 'act-visitor.md'), 'utf8')).toBe(modelBefore);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('persists recovery under the Spec Kit area and resumes without chat state', async () => {
    const root = await workspace();
    try {
      await rm(join(root, 'docs', 'product', 'model'), { recursive: true, force: true });
      await startSpecKitRecovery(root, 'first-round');
      const resumed = await nextSpecKitRecoveryBatch(root, 'first-round', 1);
      expect(resumed.session.state.sessionId).toBe('first-round');
      expect(resumed.session.state.changeDir).toBe(
        '.specify/productshape/recoveries/first-round/product',
      );
      expect(
        existsSync(
          join(root, '.specify', 'productshape', 'recoveries', 'first-round', 'state.json'),
        ),
      ).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('records one bounded recovery round and persists its recommendation', async () => {
    const root = await workspace();
    try {
      await rm(join(root, 'docs', 'product', 'model'), { recursive: true, force: true });
      const started = await startOrResumeSpecKitRecovery(root, 'bounded-round');
      const resumed = await startOrResumeSpecKitRecovery(root, 'bounded-round');
      expect(resumed.state.sessionId).toBe(started.state.sessionId);
      const batch = await nextSpecKitRecoveryBatch(root, 'bounded-round', 1);
      const item = batch.batch[0];
      if (item) {
        await recordSpecKitRecoveryBatch(root, 'bounded-round', {
          findings: [
            {
              source: item.id,
              classification: 'no-product-intent',
              reason: 'Test fixture source is not product intent.',
              complete: true,
            },
          ],
        });
      }
      const candidatePath = await writeSpecKitRecoveryCandidate(
        root,
        'bounded-round',
        'requirements/functional/fr-recovered-001.md',
        '---\nid: FR-RECOVERED-001\ntype: functional-requirement\ntitle: Recovered\nstatus: draft\n---\n\n## Requirement\n\nRecovered outcome.\n',
      );
      expect(candidatePath).toContain(
        '.specify/productshape/recoveries/bounded-round/product/proposed',
      );
      const round = await completeSpecKitRecoveryRound(root, 'bounded-round', 1);
      expect(round.recommendation).toContain('Resolve');
      expect(round.coverage.candidates.total).toBe(1);
      expect(
        existsSync(
          join(root, '.specify', 'productshape', 'recoveries', 'bounded-round', 'report.md'),
        ),
      ).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('persists recovery provenance, questions, retractions, coverage and drift outcomes', async () => {
    const root = await workspace();
    try {
      await rm(join(root, 'docs', 'product', 'model'), { recursive: true, force: true });
      await mkdir(join(root, 'legacy'), { recursive: true });
      const evidencePath = join(root, 'legacy', 'notes.md');
      await writeFile(evidencePath, '# Legacy evidence\n', 'utf8');
      const started = await startSpecKitRecovery(root, 'evidence-ledger', {
        ...defaultRecoveryBrief(),
        roots: ['legacy'],
        include: ['**/*.md'],
        batchSize: 1,
      });
      const item = (await nextSpecKitRecoveryBatch(root, 'evidence-ledger', 1)).batch[0];
      expect(item?.authorization).toBe('brief');
      expect(item?.path).toBe('legacy/notes.md');
      const withQuestion = await recordSpecKitRecoveryBatch(root, 'evidence-ledger', {
        questions: [
          {
            text: 'Does this legacy behavior remain intended?',
            context: item?.id,
            options: ['yes', 'no'],
            recommendation: 'Ask the product owner.',
          },
        ],
        leads: [
          { description: 'Review the legacy decision record.', source: item?.id, kind: 'repo' },
        ],
        findings: [
          {
            source: item?.id ?? '',
            classification: 'question',
            question: 'Q-0001',
            note: 'Meaning requires product confirmation.',
          },
        ],
        familyProbes: [{ family: 'actor', note: 'No actor candidate was found in this evidence.' }],
      });
      expect(withQuestion.questions.questions[0]?.id).toBe('Q-0001');
      expect(withQuestion.leads.leads[0]?.source).toBe(item?.id);
      expect(withQuestion.state.familyProbes.actor?.outcome).toBe('none-found');

      const retracted = await recordSpecKitRecoveryBatch(root, 'evidence-ledger', {
        retractions: [{ source: item?.id ?? '', last: true }],
      });
      expect(retracted.inventory.items[0]?.findings).toEqual([]);
      expect(retracted.inventory.items[0]?.status).toBe('pending');
      await recordSpecKitRecoveryBatch(root, 'evidence-ledger', {
        findings: [
          {
            source: item?.id ?? '',
            classification: 'no-product-intent',
            reason: 'Historical note is not a product decision.',
            complete: true,
          },
        ],
      });
      await writeSpecKitRecoveryCandidate(
        root,
        'evidence-ledger',
        'requirements/functional/fr-ledger-001.md',
        '---\nid: FR-LEDGER-001\ntype: functional-requirement\ntitle: Ledger\nstatus: draft\nprovenance:\n  source:\n    - E-0001\n  confidence: low\n---\n\n## Requirement\n\nCandidate meaning.\n',
      );
      const complete = await completeSpecKitRecoveryRound(root, 'evidence-ledger', 1);
      expect(complete.outcome).toBe('insufficient-evidence');
      expect(complete.coverage.sources.processed).toBe(1);
      expect(complete.coverage.classifications['no-product-intent']).toBe(1);
      expect(complete.coverage.leads.open).toBe(1);
      expect(complete.coverage.questions.open).toBe(1);
      expect(complete.coverage.families.actor).toBe('none-found');
      expect(complete.coverage.candidates.total).toBe(1);
      expect(complete.coverage.completion.complete).toBe(false);

      await writeFile(evidencePath, '# Legacy evidence changed\n', 'utf8');
      const drifted = await completeSpecKitRecoveryRound(root, 'evidence-ledger', 1);
      expect(drifted.outcome).toBe('needs-work');
      expect(drifted.issues.some((issue) => issue.code.includes('stale'))).toBe(true);
      expect(started.state.changeId).toBe('CHG-INITIAL');
      expect(
        existsSync(
          join(root, '.specify', 'productshape', 'recoveries', 'evidence-ledger', 'coverage.json'),
        ),
      ).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('refines one hosted change with working memory and persisted impact exclusions', async () => {
    const root = await workspace();
    try {
      await createSpecKitProductChange(root, 'same-change');
      const result = await refineSpecKitProductChange(root, 'same-change', {
        workingMemory: 'Human clarification: keep the outcome narrow.',
        rationale: 'The clarified outcome is testable and bounded.',
        openQuestions: ['Which actor owns the final decision?'],
        outOfScope: ['Implementation details'],
        checkedArtifactIds: ['UC-SHORTEN-001'],
        excludedArtifactIds: ['ACT-VISITOR-001'],
      });
      expect(await readFile(result.proposal, 'utf8')).toContain('Human clarification');
      const impact = JSON.parse(await readFile(join(result.change.dir, 'impact.json'), 'utf8')) as {
        checked: string[];
        excluded: string[];
      };
      expect(impact.checked).toEqual(['UC-SHORTEN-001']);
      expect(impact.excluded).toEqual(['ACT-VISITOR-001']);
      expect(result.change.body).toContain('Which actor owns the final decision?');
      expect(result.change.body).toContain('Implementation details');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('archives only an applied change and leaves the accepted model untouched', async () => {
    const root = await workspace();
    try {
      await createSpecKitProductChange(root, 'archive-me');
      const change = join(root, '.specify', 'productshape', 'changes', 'archive-me', 'change.md');
      const content = await readFile(change, 'utf8');
      await writeFile(change, content.replace('status: draft', 'status: applied'), 'utf8');
      expect(await archiveSpecKitProductChange(root, 'archive-me')).toContain(
        '.specify/productshape/archive/archive-me',
      );
      expect(existsSync(join(root, '.specify', 'productshape', 'changes', 'archive-me'))).toBe(
        false,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('applies a valid authorized delta into the accepted model, then archives separately', async () => {
    const root = await workspace();
    try {
      await createSpecKitProductChange(root, 'add-outcome');
      const dir = join(root, '.specify', 'productshape', 'changes', 'add-outcome');
      const change = join(dir, 'change.md');
      const manifest = await readFile(change, 'utf8');
      await writeFile(
        change,
        manifest
          .replace('status: draft', 'status: approved')
          .replace('id: CHG-ADD-OUTCOME-001', 'id: CHG-INITIAL')
          .replace('  add: []', '  add:\n    - FR-ADDED-001'),
        'utf8',
      );
      await mkdir(join(dir, 'proposed', 'requirements', 'functional'), { recursive: true });
      await writeFile(
        join(dir, 'proposed', 'requirements', 'functional', 'fr-added-001.md'),
        `---\nid: FR-ADDED-001\ntype: functional-requirement\ntitle: Added outcome\nstatus: active\nderived-from:\n  - UC-SHORTEN-001\nverification:\n  - scenario: The added outcome is observable\n---\n\n## Requirement\n\nThe product delivers the added outcome.\n\n## Rationale\n\nIt is needed.\n\n## Acceptance Scenarios\n\nThe outcome is observable.\n`,
        'utf8',
      );
      const applied = await applySpecKitProductChange(root, 'add-outcome');
      expect(applied.outcome).toBe('applied');
      expect(
        existsSync(
          join(root, 'docs', 'product', 'model', 'requirements', 'functional', 'fr-added-001.md'),
        ),
      ).toBe(true);
      expect(await readFile(change, 'utf8')).toContain('status: applied');
      expect(applied.resultingModel).toBeDefined();
      expect(applied.resultingModel!.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      expect(applied.resultingModel!.artifacts.map((a) => a.id)).toContain('FR-ADDED-001');
      await archiveSpecKitProductChange(root, 'add-outcome');
      expect(
        existsSync(
          join(root, 'docs', 'product', 'model', 'requirements', 'functional', 'fr-added-001.md'),
        ),
      ).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('refuses with the host-neutral authorisation message', async () => {
    const root = await workspace();
    try {
      await createSpecKitProductChange(root, 'not-yet');
      const result = await applySpecKitProductChange(root, 'not-yet', { dryRun: true });
      expect(result.outcome).toBe('refused');
      const gate = result.plan.diagnostics.find((d) => d.code === 'PRODUCT028');
      expect(gate?.message).toContain("caller's authorisation policy");
      expect(gate?.message).not.toMatch(/human|by hand/i);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  /** Point a hosted change at BR-VALID-URL-001 with an unchanged proposed copy of the rule. */
  async function touchValidUrlRule(root: string, name: string): Promise<string> {
    const dir = join(root, '.specify', 'productshape', 'changes', name);
    const changeFile = join(dir, 'change.md');
    const manifest = await readFile(changeFile, 'utf8');
    await writeFile(
      changeFile,
      manifest.replace('  modify: []', '  modify:\n    - BR-VALID-URL-001'),
      'utf8',
    );
    await mkdir(join(dir, 'proposed', 'business-rules'), { recursive: true });
    await cp(
      join(root, 'docs', 'product', 'model', 'business-rules', 'br-valid-url-001.md'),
      join(dir, 'proposed', 'business-rules', 'br-valid-url-001.md'),
    );
    return changeFile;
  }

  it('an applied but unarchived hosted change is inert for concurrency', async () => {
    const root = await workspace();
    try {
      await createSpecKitProductChange(root, 'done');
      await createSpecKitProductChange(root, 'next');
      const doneFile = await touchValidUrlRule(root, 'done');
      await touchValidUrlRule(root, 'next');

      const live = await validateSpecKitProductChange(root, 'next');
      expect(live.diagnostics.some((d) => d.code === 'PRODUCT025')).toBe(true);

      await writeFile(
        doneFile,
        (await readFile(doneFile, 'utf8')).replace('status: draft', 'status: applied'),
        'utf8',
      );
      const inert = await validateSpecKitProductChange(root, 'next');
      expect(inert.diagnostics.filter((d) => d.code === 'PRODUCT025')).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('concurrency spans the native changes/active container', async () => {
    const root = await workspace();
    try {
      await createSpecKitProductChange(root, 'hosted-touch');
      await touchValidUrlRule(root, 'hosted-touch');
      const nativeDir = join(root, 'docs', 'product', 'changes', 'active', 'chg-native-touch-001');
      await mkdir(join(nativeDir, 'proposed', 'business-rules'), { recursive: true });
      await writeFile(
        join(nativeDir, 'change.md'),
        `---\nid: CHG-NATIVE-TOUCH-001\ntype: product-change\ntitle: Native change touching the same rule\nstatus: draft\nbase-revision: '0000000'\noperations:\n  add: []\n  modify:\n    - BR-VALID-URL-001\n  remove: []\n---\n\n## Problem\n\nNative.\n\n## Intended Product Outcome\n\nNative.\n\n## Rationale\n\nNative.\n\n## Affected Product Areas\n\nBR-VALID-URL-001.\n\n## Open Questions\n\nNone.\n\n## Product Acceptance\n\nNone.\n\n## Out of Scope\n\nNone.\n`,
        'utf8',
      );
      await cp(
        join(root, 'docs', 'product', 'model', 'business-rules', 'br-valid-url-001.md'),
        join(nativeDir, 'proposed', 'business-rules', 'br-valid-url-001.md'),
      );
      const result = await validateSpecKitProductChange(root, 'hosted-touch');
      const overlaps = result.diagnostics.filter((d) => d.code === 'PRODUCT025');
      expect(overlaps.length).toBeGreaterThan(0);
      expect(overlaps.some((d) => d.message.includes('CHG-NATIVE-TOUCH-001'))).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
