import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contentDigest } from '@prodshape/core';
import {
  applyOpenSpecProductChange,
  deriveDeliveryContext,
  inspectProductModel,
  listOpenSpecProductChanges,
  validateOpenSpecProductChange,
} from '@prodshape/integration-openspec';
import {
  approve,
  BR_PRICING_V2,
  BR_PRICING_V3,
  createRepo,
  git,
  priceFloorSpec,
  SB_PRICE_FLOOR_REJECTED,
  snapshotTree,
  TERM_PRICE_FLOOR,
  writeHostedChange,
  writeNativeChange,
} from './openspec-product-helpers.js';

/**
 * The deterministic rails of the OpenSpec-hosted product workflow, end to end on a greenfield
 * fixture covering all ten artifact kinds: the accepted model is read directly and its graph
 * compiled in memory, a hosted delta validates as an overlay on the untouched baseline, apply
 * revalidates at apply time and fails closed, stable IDs survive modification, unaffected files
 * stay byte-identical, and fresh post-apply context is derived from the model on disk. No
 * OpenSpec CLI is involved: the OpenSpec-facing container behaviours live in the CLI suite.
 */

describe('openspec product workflow: accepted-model inspection', () => {
  it('reads docs/product/model directly and compiles the semantic graph in memory', async () => {
    const { root } = await createRepo();
    try {
      const inspection = await inspectProductModel(root);
      expect(inspection.artifacts).toHaveLength(10);
      expect(inspection.diagnostics).toEqual([]);
      expect(inspection.graph.nodes).toHaveLength(10);
      expect(inspection.graph.edges.length).toBeGreaterThan(8);
      expect(inspection.graph.nodeById.get('BR-PRICING-001')?.type).toBe('business-rule');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('graph traversal and impact support answer neighbourhood questions', async () => {
    const { root } = await createRepo();
    try {
      const context = await deriveDeliveryContext(root, ['BR-PRICING-001']);
      const neighbourIds = context.neighbours.map((entry) => entry.id);
      expect(neighbourIds).toContain('UC-CHECKOUT-001');
      expect(neighbourIds).toContain('SB-DISCOUNT-STACKING');
      expect(context.modelErrorFree).toBe(true);
      expect(context.impacts['BR-PRICING-001']!.questioned.length).toBeGreaterThan(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('needs no .product/generated and no .product/cache: deleting them changes nothing', async () => {
    const { root, base } = await createRepo();
    try {
      await mkdir(join(root, '.product', 'generated'), { recursive: true });
      await writeFile(join(root, '.product', 'generated', 'product-graph.json'), '{}', 'utf8');
      await mkdir(join(root, '.product', 'cache'), { recursive: true });
      await writeFile(join(root, '.product', 'cache', 'stale.json'), '{}', 'utf8');
      const withDirs = await inspectProductModel(root);

      await rm(join(root, '.product', 'generated'), { recursive: true, force: true });
      await rm(join(root, '.product', 'cache'), { recursive: true, force: true });
      const withoutDirs = await inspectProductModel(root);
      expect(withoutDirs.artifacts.map((a) => a.id)).toEqual(withDirs.artifacts.map((a) => a.id));
      expect(withoutDirs.diagnostics).toEqual(withDirs.diagnostics);

      await writeHostedChange(root, priceFloorSpec(base, { status: 'approved' }));
      const dryRun = await applyOpenSpecProductChange(root, 'chg-price-floor', { dryRun: true });
      expect(dryRun.outcome).toBe('dry-run');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe('openspec product workflow: overlay validation', () => {
  it('a valid hosted delta validates with zero diagnostics and the baseline stays byte-identical', async () => {
    const { root, base } = await createRepo();
    try {
      const before = await snapshotTree(root, 'docs/product/model');
      await writeHostedChange(root, priceFloorSpec(base));
      const result = await validateOpenSpecProductChange(root, 'chg-price-floor');
      expect(result.diagnostics).toEqual([]);
      expect(result.blocking).toEqual([]);
      expect(result.overlayArtifacts).toHaveLength(12);
      expect(await snapshotTree(root, 'docs/product/model')).toEqual(before);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('detects the normative failure classes with their exact codes', async () => {
    const { root, base } = await createRepo();
    try {
      const codesOf = async (name: string): Promise<string[]> => {
        const result = await validateOpenSpecProductChange(root, name);
        return [...new Set(result.diagnostics.map((diagnostic) => diagnostic.code))];
      };

      // Unresolved reference in a proposed artifact.
      await writeHostedChange(root, {
        ...priceFloorSpec(base),
        name: 'chg-unresolved',
        chgId: 'CHG-UNRESOLVED-001',
        proposed: {
          ...priceFloorSpec(base).proposed,
          'behaviours/sb-price-floor-rejected.md': SB_PRICE_FLOOR_REJECTED.replace(
            '- BR-PRICING-001',
            '- BR-DOES-NOT-EXIST',
          ),
        },
      });
      expect(await codesOf('chg-unresolved')).toContain('PRODUCT006');

      // Relationship targeting a disallowed artifact type.
      await writeHostedChange(root, {
        ...priceFloorSpec(base),
        name: 'chg-badtarget',
        chgId: 'CHG-BADTARGET-001',
        proposed: {
          ...priceFloorSpec(base).proposed,
          'behaviours/sb-price-floor-rejected.md': SB_PRICE_FLOOR_REJECTED.replace(
            '- BR-PRICING-001',
            '- TERM-CART',
          ),
        },
      });
      expect(await codesOf('chg-badtarget')).toContain('PRODUCT007');

      // Adding an ID that already exists: the operation error and the overlay duplicate.
      await writeHostedChange(root, {
        ...priceFloorSpec(base),
        name: 'chg-dup',
        chgId: 'CHG-DUP-001',
        operations: { add: ['BR-PRICING-001'], modify: [], remove: [] },
        proposed: { 'business-rules/br-pricing-001.md': BR_PRICING_V2 },
      });
      const dupCodes = await codesOf('chg-dup');
      expect(dupCodes).toContain('PRODUCT020');
      expect(dupCodes).toContain('PRODUCT023');

      // Modifying and removing IDs the baseline does not have.
      await writeHostedChange(root, {
        ...priceFloorSpec(base),
        name: 'chg-missing',
        chgId: 'CHG-MISSING-001',
        operations: { add: [], modify: ['BR-GHOST-001'], remove: ['TERM-GHOST-001'] },
        proposed: {
          'business-rules/br-ghost-001.md': BR_PRICING_V2.replaceAll(
            'BR-PRICING-001',
            'BR-GHOST-001',
          ),
        },
      });
      const missingCodes = await codesOf('chg-missing');
      expect(missingCodes).toContain('PRODUCT021');
      expect(missingCodes).toContain('PRODUCT022');

      // A removal that leaves dangling references in the overlay.
      await writeHostedChange(root, {
        ...priceFloorSpec(base),
        name: 'chg-dangling',
        chgId: 'CHG-DANGLING-001',
        operations: { add: [], modify: [], remove: ['TERM-CART'] },
        proposed: {},
      });
      expect(await codesOf('chg-dangling')).toContain('PRODUCT024');

      // Operations and proposed artifacts must match in both directions.
      await writeHostedChange(root, {
        ...priceFloorSpec(base),
        name: 'chg-mismatch',
        chgId: 'CHG-MISMATCH-001',
        operations: { add: ['TERM-PRICE-FLOOR'], modify: [], remove: [] },
        proposed: {
          'domain/terms/term-price-floor.md': TERM_PRICE_FLOOR,
          'behaviours/sb-price-floor-rejected.md': SB_PRICE_FLOOR_REJECTED,
        },
      });
      expect(await codesOf('chg-mismatch')).toContain('PRODUCT026');

      // A malformed Structured Behaviour is a schema violation.
      await writeHostedChange(root, {
        ...priceFloorSpec(base),
        name: 'chg-malformed-sb',
        chgId: 'CHG-MALFORMED-SB-001',
        proposed: {
          ...priceFloorSpec(base).proposed,
          'behaviours/sb-price-floor-rejected.md': SB_PRICE_FLOOR_REJECTED.replace(
            'when: The shopper checks out the cart\n',
            '',
          ),
        },
      });
      expect(await codesOf('chg-malformed-sb')).toContain('PRODUCT002');

      // A leading semantic keyword in a clause is rejected case-insensitively.
      await writeHostedChange(root, {
        ...priceFloorSpec(base),
        name: 'chg-keyword-sb',
        chgId: 'CHG-KEYWORD-SB-001',
        proposed: {
          ...priceFloorSpec(base).proposed,
          'behaviours/sb-price-floor-rejected.md': SB_PRICE_FLOOR_REJECTED.replace(
            '- A cart holds an item listed at 20 euro with a price floor of 15 euro',
            '- Given a cart holds an item listed at 20 euro',
          ),
        },
      });
      expect(await codesOf('chg-keyword-sb')).toContain('PRODUCT002');

      // An approved change with unresolved open questions reports PRODUCT108 as a warning.
      await writeHostedChange(root, {
        ...priceFloorSpec(base),
        name: 'chg-questions',
        chgId: 'CHG-QUESTIONS-001',
        status: 'approved',
        openQuestions: '- Should the floor apply to bundles too?',
      });
      const questions = await validateOpenSpecProductChange(root, 'chg-questions');
      const product108 = questions.diagnostics.filter((d) => d.code === 'PRODUCT108');
      expect(product108).toHaveLength(1);
      expect(product108[0]!.severity).toBe('warning');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('concurrency spans both containers: hosted and native changes see each other', async () => {
    const { root, base } = await createRepo();
    try {
      await writeHostedChange(root, priceFloorSpec(base));
      await writeNativeChange(root, {
        name: 'unused',
        chgId: 'CHG-NATIVE-TOUCH-001',
        title: 'Native change touching the same rule',
        status: 'draft',
        baseRevision: base,
        operations: { add: [], modify: ['BR-PRICING-001'], remove: [] },
        proposed: { 'business-rules/br-pricing-001.md': BR_PRICING_V3 },
      });
      const hosted = await validateOpenSpecProductChange(root, 'chg-price-floor');
      const concurrency = hosted.diagnostics.filter((d) => d.code === 'PRODUCT025');
      expect(concurrency.length).toBeGreaterThan(0);
      expect(concurrency.some((d) => d.change === 'CHG-PRICE-FLOOR-001')).toBe(true);
      expect(concurrency.some((d) => d.target === 'BR-PRICING-001')).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('two hosted changes with overlapping operations report against each other', async () => {
    const { root, base } = await createRepo();
    try {
      await writeHostedChange(root, priceFloorSpec(base));
      await writeHostedChange(root, {
        ...priceFloorSpec(base),
        name: 'chg-price-floor-b',
        chgId: 'CHG-PRICE-FLOOR-002',
        operations: { add: [], modify: ['BR-PRICING-001'], remove: [] },
        proposed: { 'business-rules/br-pricing-001.md': BR_PRICING_V3 },
      });
      const first = await validateOpenSpecProductChange(root, 'chg-price-floor');
      const second = await validateOpenSpecProductChange(root, 'chg-price-floor-b');
      expect(first.diagnostics.some((d) => d.code === 'PRODUCT025')).toBe(true);
      expect(second.diagnostics.some((d) => d.code === 'PRODUCT025')).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe('openspec product workflow: apply', () => {
  it('applies an approved valid delta, preserves unaffected files and stops before archiving', async () => {
    const { root, base } = await createRepo();
    try {
      await writeHostedChange(root, priceFloorSpec(base));
      await approve(root, 'chg-price-floor');
      const before = await snapshotTree(root, 'docs/product/model');

      const result = await applyOpenSpecProductChange(root, 'chg-price-floor');
      expect(result.outcome).toBe('applied');
      // The lifecycle container move belongs to openspec archive, never to apply.
      expect(result.plan.actions.every((action) => action.kind !== 'move-change')).toBe(true);
      expect(result.plan.actions.some((action) => action.kind === 'set-status')).toBe(true);

      // The modified artifact keeps its file: identity is the ID.
      const after = await snapshotTree(root, 'docs/product/model');
      expect(after.get('business-rules/br-pricing-001.md')).toBe(BR_PRICING_V2);
      expect(after.get('domain/terms/term-price-floor.md')).toBe(TERM_PRICE_FLOOR);
      expect(after.get('behaviours/sb-price-floor-rejected.md')).toBe(SB_PRICE_FLOOR_REJECTED);
      // Every other model file is byte-identical.
      for (const [relative, content] of before) {
        if (relative === 'business-rules/br-pricing-001.md') continue;
        expect(after.get(relative)).toBe(content);
      }
      expect(after.size).toBe(before.size + 2);

      // The hosted change.md was flipped to applied in place; the container was not moved.
      const changeFile = await readFile(
        join(root, 'openspec', 'changes', 'chg-price-floor', 'product', 'change.md'),
        'utf8',
      );
      expect(changeFile).toContain('status: applied');

      // The product diff is computed from the result and carries resulting digests.
      expect(result.plan.diff.modified.map((entry) => entry.id)).toEqual(['BR-PRICING-001']);
      expect(result.plan.diff.added.map((entry) => entry.id)).toEqual([
        'SB-PRICE-FLOOR-REJECTED',
        'TERM-PRICE-FLOOR',
      ]);
      expect(result.plan.diff.removed).toEqual([]);
      expect(result.plan.diff.modified[0]!.digest).toBe(contentDigest(BR_PRICING_V2));

      // The resulting accepted model validates from a fresh disk read.
      expect(result.resultingModel!.diagnostics).toEqual([]);
      expect(result.resultingModel!.artifacts).toHaveLength(12);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('an invalid untouched baseline artifact blocks apply before any write', async () => {
    const { root } = await createRepo();
    try {
      // A baseline defect in an artifact the change never touches: an unknown frontmatter key
      // (PRODUCT002) and missing required body sections (PRODUCT009). These are load-time
      // diagnostics, invisible to graph-level overlay revalidation, so they are exactly the class
      // that once slipped past apply and only surfaced in the post-write validation.
      await writeFile(
        join(root, 'docs', 'product', 'model', 'business-rules', 'br-broken.md'),
        '---\nid: BR-BROKEN-001\ntype: business-rule\ntitle: Broken untouched artifact\nstatus: active\nbogus-field: true\n---\n\n## Rule\n\nOnly one of the four required sections is present.\n',
        'utf8',
      );
      git(root, 'add', '-A');
      git(root, 'commit', '-m', 'broken baseline artifact');
      const base = git(root, 'rev-parse', '--short', 'HEAD');
      await writeHostedChange(root, priceFloorSpec(base, { status: 'approved' }));

      const modelBefore = await snapshotTree(root, 'docs/product/model');
      const changesBefore = await snapshotTree(root, 'openspec/changes');
      const result = await applyOpenSpecProductChange(root, 'chg-price-floor');

      expect(result.outcome).toBe('refused');
      const errorCodes = new Set(
        result.plan.diagnostics
          .filter((diagnostic) => diagnostic.severity === 'error')
          .map((diagnostic) => diagnostic.code),
      );
      expect(errorCodes.has('PRODUCT002')).toBe(true);
      expect(errorCodes.has('PRODUCT009')).toBe(true);
      // Nothing was written: the model, the hosted change (no status transition) and the whole
      // container tree (no archive move) are byte-identical.
      expect(await snapshotTree(root, 'docs/product/model')).toEqual(modelBefore);
      expect(await snapshotTree(root, 'openspec/changes')).toEqual(changesBefore);
      expect(changesBefore.get('chg-price-floor/product/change.md')).toContain('status: approved');
      expect(result.resultingModel).toBeUndefined();

      // The preflight surface reports the same blockers.
      const preflight = await validateOpenSpecProductChange(root, 'chg-price-floor');
      const preflightCodes = new Set(preflight.blocking.map((diagnostic) => diagnostic.code));
      expect(preflightCodes.has('PRODUCT002')).toBe(true);
      expect(preflightCodes.has('PRODUCT009')).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('refuses outside the apply-authorised state (PRODUCT028) and leaves the tree byte-identical', async () => {
    const { root, base } = await createRepo();
    try {
      await writeHostedChange(root, priceFloorSpec(base));
      const before = await snapshotTree(root, 'docs/product/model');
      const result = await applyOpenSpecProductChange(root, 'chg-price-floor');
      expect(result.outcome).toBe('refused');
      expect(result.plan.diagnostics.some((d) => d.code === 'PRODUCT028')).toBe(true);
      expect(await snapshotTree(root, 'docs/product/model')).toEqual(before);
      // No assertion anywhere about WHO performs the approving transition: any caller policy
      // that produces status approved satisfies the gate.
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('refuses on baseline drift (PRODUCT027) after a touched target', async () => {
    const { root, base } = await createRepo();
    try {
      await writeHostedChange(root, priceFloorSpec(base));
      await approve(root, 'chg-price-floor');
      // The baseline moves after the change was authored: the modify target drifts.
      const brFile = join(root, 'docs', 'product', 'model', 'business-rules', 'br-pricing-001.md');
      await writeFile(
        brFile,
        (await readFile(brFile, 'utf8')).replace('20 euro item', '25 euro item'),
        'utf8',
      );
      git(root, 'add', '-A');
      git(root, 'commit', '-m', 'baseline moved');

      const before = await snapshotTree(root, 'docs/product/model');
      const result = await applyOpenSpecProductChange(root, 'chg-price-floor');
      expect(result.outcome).toBe('refused');
      expect(result.plan.diagnostics.some((d) => d.code === 'PRODUCT027')).toBe(true);
      expect(await snapshotTree(root, 'docs/product/model')).toEqual(before);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('revalidates at apply time: a delta corrupted after a clean validate is refused', async () => {
    const { root, base } = await createRepo();
    try {
      await writeHostedChange(root, priceFloorSpec(base, { status: 'approved' }));
      const preflight = await validateOpenSpecProductChange(root, 'chg-price-floor');
      expect(preflight.blocking).toEqual([]);

      // The delta changes between the validate call and apply: apply must not trust the earlier
      // verdict.
      const sbFile = join(
        root,
        'openspec',
        'changes',
        'chg-price-floor',
        'product',
        'proposed',
        'behaviours',
        'sb-price-floor-rejected.md',
      );
      await writeFile(
        sbFile,
        SB_PRICE_FLOOR_REJECTED.replace('- BR-PRICING-001', '- BR-DOES-NOT-EXIST'),
        'utf8',
      );
      const before = await snapshotTree(root, 'docs/product/model');
      const result = await applyOpenSpecProductChange(root, 'chg-price-floor');
      expect(result.outcome).toBe('refused');
      expect(result.plan.diagnostics.some((d) => d.code === 'PRODUCT006')).toBe(true);
      expect(await snapshotTree(root, 'docs/product/model')).toEqual(before);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('a dry run preflights the full plan and writes nothing', async () => {
    const { root, base } = await createRepo();
    try {
      await writeHostedChange(root, priceFloorSpec(base, { status: 'approved' }));
      const before = await snapshotTree(root, 'docs/product/model');
      const changeBefore = await readFile(
        join(root, 'openspec', 'changes', 'chg-price-floor', 'product', 'change.md'),
        'utf8',
      );
      const result = await applyOpenSpecProductChange(root, 'chg-price-floor', { dryRun: true });
      expect(result.outcome).toBe('dry-run');
      expect(result.plan.actions.filter((action) => action.kind === 'write')).toHaveLength(3);
      expect(await snapshotTree(root, 'docs/product/model')).toEqual(before);
      expect(
        await readFile(
          join(root, 'openspec', 'changes', 'chg-price-floor', 'product', 'change.md'),
          'utf8',
        ),
      ).toBe(changeBefore);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('a second change evolves the same artifact again: found, ID preserved, never duplicated', async () => {
    const { root, base } = await createRepo();
    try {
      await writeHostedChange(root, priceFloorSpec(base, { status: 'approved' }));
      const first = await applyOpenSpecProductChange(root, 'chg-price-floor');
      expect(first.outcome).toBe('applied');
      git(root, 'add', '-A');
      git(root, 'commit', '-m', 'price floor applied');
      const secondBase = git(root, 'rev-parse', '--short', 'HEAD');

      await writeHostedChange(root, {
        name: 'chg-price-floor-tighten',
        chgId: 'CHG-PRICE-FLOOR-TIGHTEN-001',
        title: 'Charge the floor price instead of rejecting the sale',
        status: 'approved',
        baseRevision: secondBase,
        operations: { add: [], modify: ['BR-PRICING-001'], remove: [] },
        proposed: { 'business-rules/br-pricing-001.md': BR_PRICING_V3 },
      });
      const before = await snapshotTree(root, 'docs/product/model');
      const second = await applyOpenSpecProductChange(root, 'chg-price-floor-tighten');
      expect(second.outcome).toBe('applied');

      const after = await snapshotTree(root, 'docs/product/model');
      expect(after.get('business-rules/br-pricing-001.md')).toBe(BR_PRICING_V3);
      expect(after.size).toBe(before.size);
      for (const [relative, content] of before) {
        if (relative === 'business-rules/br-pricing-001.md') continue;
        expect(after.get(relative)).toBe(content);
      }
      const inspection = await inspectProductModel(root);
      expect(inspection.graph.nodes.filter((node) => node.id === 'BR-PRICING-001')).toHaveLength(1);
      expect(inspection.diagnostics).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('a request with no product impact never becomes a product change', async () => {
    const { root } = await createRepo();
    try {
      const dir = join(root, 'openspec', 'changes', 'chg-docs-clarity');
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, '.openspec.yaml'), 'schema: product\nskip_specs: true\n', 'utf8');
      await writeFile(
        join(dir, 'proposal.md'),
        '<!-- pdac-scope: none reason="no product-semantic dependency" -->\n\n# Clarify the contributing guide\n\n## No Product Delta\n\nThis request changes no product meaning; the workflow ends here.\n',
        'utf8',
      );
      expect(await listOpenSpecProductChanges(root)).toEqual([]);
      await expect(validateOpenSpecProductChange(root, 'chg-docs-clarity')).rejects.toThrow(
        "No OpenSpec product change named 'chg-docs-clarity'",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe('openspec product workflow: delivery handoff', () => {
  it('post-apply context is derived from the updated accepted model on disk', async () => {
    const { root, base } = await createRepo();
    try {
      await writeHostedChange(root, priceFloorSpec(base, { status: 'approved' }));
      const applied = await applyOpenSpecProductChange(root, 'chg-price-floor');
      expect(applied.outcome).toBe('applied');

      const context = await deriveDeliveryContext(root, [
        'BR-PRICING-001',
        'SB-PRICE-FLOOR-REJECTED',
        'TERM-PRICE-FLOOR',
      ]);
      expect(context.modelErrorFree).toBe(true);
      const byId = new Map(context.artifacts.map((entry) => [entry.id, entry]));
      // Fresh digests match the files apply wrote, proving the context reads the updated model.
      expect(byId.get('BR-PRICING-001')!.digest).toBe(contentDigest(BR_PRICING_V2));
      expect(byId.get('TERM-PRICE-FLOOR')!.digest).toBe(contentDigest(TERM_PRICE_FLOOR));
      expect(byId.get('SB-PRICE-FLOOR-REJECTED')!.digest).toBe(
        contentDigest(SB_PRICE_FLOOR_REJECTED),
      );
      expect(context.neighbours.map((entry) => entry.id)).toContain('UC-CHECKOUT-001');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
