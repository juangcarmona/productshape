import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { SchemaRegistry, compileGraph, loadModel, type HandoffDocument } from '@prodshape/core';
import { repoRoot } from '../helpers.js';

/**
 * The end-to-end traceability fixture: the complete chain from actor to promoted
 * baseline must stay demonstrable in this repository (founding success condition).
 *
 * ACT-PRODUCT-ENGINEER -> JRN-SDD-HANDOFF-001 -> UC-COVERAGE-001 -> BR-SDD-001
 *   -> FR-COVERAGE-001 -> CHG-TRACEABILITY-001 -> SLI-TRACEABILITY-001
 *   -> HOF-GITHUB-1 -> OpenSpec change -> specification -> implementation
 *   -> automated verification -> explicit promotion into the current model.
 */

const completedChangeDir = join(
  repoRoot,
  'docs',
  'product',
  'changes',
  'completed',
  'chg-traceability-001',
);
// The delivered SDD change was archived by OpenSpec's own lifecycle; the sidecars travel with it.
const sddChangeDir = join(
  repoRoot,
  'openspec',
  'changes',
  'archive',
  '2026-07-25-add-coverage-validation',
);

describe('verified end-to-end traceability chain', () => {
  it('walks from the actor to the implemented requirement in the promoted baseline', async () => {
    const registry = await SchemaRegistry.loadBundled();
    const model = await loadModel(join(repoRoot, 'docs', 'product', 'model'), repoRoot, registry);
    const graph = compileGraph(model.artifacts);

    // Actor -> Journey (primary-actor) -> Use Case (steps).
    const journeyEdges = graph.outgoing.get('JRN-SDD-HANDOFF-001') ?? [];
    expect(journeyEdges).toContainEqual({
      from: 'JRN-SDD-HANDOFF-001',
      kind: 'primary-actor',
      to: 'ACT-PRODUCT-ENGINEER',
    });
    expect(journeyEdges).toContainEqual({
      from: 'JRN-SDD-HANDOFF-001',
      kind: 'steps',
      to: 'UC-COVERAGE-001',
    });

    // Use Case -> Business Rule (governed-by).
    expect(graph.outgoing.get('UC-COVERAGE-001')).toContainEqual({
      from: 'UC-COVERAGE-001',
      kind: 'governed-by',
      to: 'BR-SDD-001',
    });

    // Requirement -> Use Case and Rule (derived-from), in the promoted baseline.
    const requirementEdges = graph.outgoing.get('FR-COVERAGE-001') ?? [];
    expect(requirementEdges).toContainEqual({
      from: 'FR-COVERAGE-001',
      kind: 'derived-from',
      to: 'UC-COVERAGE-001',
    });
    expect(requirementEdges).toContainEqual({
      from: 'FR-COVERAGE-001',
      kind: 'derived-from',
      to: 'BR-SDD-001',
    });
  });

  it('preserves the promoted Product Change with its slice and history', async () => {
    const change = await readFile(join(completedChangeDir, 'change.md'), 'utf8');
    expect(change).toContain('id: CHG-TRACEABILITY-001');
    expect(change).toContain('status: implemented');
    const slice = parse(
      await readFile(join(completedChangeDir, 'slices', 'sli-traceability-001.yaml'), 'utf8'),
    ) as { id: string; status: string; implements: { requirement: string }[] };
    expect(slice.id).toBe('SLI-TRACEABILITY-001');
    expect(slice.status).toBe('completed');
    expect(slice.implements[0]?.requirement).toBe('FR-COVERAGE-001');
    // The change is gone from active/.
    await expect(
      access(join(repoRoot, 'docs', 'product', 'changes', 'active', 'chg-traceability-001')),
    ).rejects.toThrow();
  });

  it('links the backlog reference, handoff, SDD change, specification and verification', async () => {
    const handoff = parse(
      await readFile(join(sddChangeDir, 'product-handoff.yaml'), 'utf8'),
    ) as HandoffDocument;
    expect(handoff.id).toBe('HOF-GITHUB-1');
    expect(handoff['work-item'].provider).toBe('github');
    expect(handoff['work-item'].id).toBe('1');
    expect(handoff.source['product-change']).toBe('CHG-TRACEABILITY-001');
    expect(handoff.source['delivery-slice']).toBe('SLI-TRACEABILITY-001');
    expect(handoff.implements).toEqual(['FR-COVERAGE-001']);

    const coverage = parse(await readFile(join(sddChangeDir, 'product-coverage.yaml'), 'utf8')) as {
      handoff: string;
      requirements: Record<
        string,
        { status: string; specification: string[]; verification: string[] }
      >;
    };
    expect(coverage.handoff).toBe('HOF-GITHUB-1');
    const entry = coverage.requirements['FR-COVERAGE-001'];
    expect(entry?.status).toBe('covered');
    for (const evidence of [...(entry?.specification ?? []), ...(entry?.verification ?? [])]) {
      await access(join(repoRoot, ...evidence.split('/')));
    }

    // The specification names the product requirement it implements.
    const spec = await readFile(
      join(sddChangeDir, 'specs', 'requirement-coverage', 'spec.md'),
      'utf8',
    );
    expect(spec).toContain('FR-COVERAGE-001');
    // Native OpenSpec artifacts coexist with the sidecars, untouched in ownership.
    await access(join(sddChangeDir, 'proposal.md'));
    await access(join(sddChangeDir, 'tasks.md'));
  });
});
