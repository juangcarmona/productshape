import { describe, expect, it } from 'vitest';
import { compileGraph } from './graph.js';
import type { LoadedArtifact } from './model.js';
import { artifact } from './test-support.js';
import { validateModel } from './validate.js';

function run(artifacts: LoadedArtifact[]) {
  return validateModel(artifacts, compileGraph(artifacts));
}

const baseActor = artifact('ACT-A', 'actor', { 'actor-kind': 'human' });

describe('validateModel errors', () => {
  it('reports duplicate IDs on every occurrence (PRODUCT005)', () => {
    const dupA = artifact('ACT-A', 'actor', {}, { file: 'model/a1.md' });
    const dupB = artifact('ACT-A', 'actor', {}, { file: 'model/a2.md' });
    const diagnostics = run([dupA, dupB]).filter((d) => d.code === 'PRODUCT005');
    expect(diagnostics).toHaveLength(2);
  });

  it('reports unknown references with source, field and target (PRODUCT006)', () => {
    const uc = artifact('UC-A', 'use-case', {
      'primary-actor': 'ACT-A',
      'governed-by': ['BR-MISSING'],
    });
    const diagnostics = run([baseActor, uc]).filter((d) => d.code === 'PRODUCT006');
    expect(diagnostics).toEqual([
      expect.objectContaining({
        artifact: 'UC-A',
        field: 'governed-by',
        target: 'BR-MISSING',
      }),
    ]);
  });

  it('reports disallowed target types (PRODUCT007)', () => {
    const uc = artifact('UC-A', 'use-case', { 'primary-actor': 'ACT-A' });
    const journey = artifact('JRN-A', 'journey', {
      'primary-actor': 'ACT-A',
      steps: [{ 'use-case': 'ACT-A' }],
    });
    const diagnostics = run([baseActor, uc, journey]).filter((d) => d.code === 'PRODUCT007');
    expect(diagnostics).toEqual([
      expect.objectContaining({ artifact: 'JRN-A', field: 'steps', target: 'ACT-A' }),
    ]);
  });

  it('reports active references to retired artifacts (PRODUCT008)', () => {
    const retired = artifact('BR-OLD', 'business-rule', { status: 'retired' });
    const uc = artifact('UC-A', 'use-case', {
      'primary-actor': 'ACT-A',
      'governed-by': ['BR-OLD'],
    });
    const diagnostics = run([baseActor, retired, uc]);
    expect(diagnostics.filter((d) => d.code === 'PRODUCT008')).toHaveLength(1);
    expect(diagnostics.filter((d) => d.code === 'PRODUCT104')).toHaveLength(0);
  });
});

describe('validateModel warnings', () => {
  it('warns on active references to deprecated artifacts (PRODUCT104)', () => {
    const deprecated = artifact('BR-OLD', 'business-rule', { status: 'deprecated' });
    const uc = artifact('UC-A', 'use-case', {
      'primary-actor': 'ACT-A',
      'governed-by': ['BR-OLD'],
    });
    const diagnostics = run([baseActor, deprecated, uc]);
    expect(diagnostics.filter((d) => d.code === 'PRODUCT104')).toHaveLength(1);
  });

  it('warns on file-name misalignment (PRODUCT101)', () => {
    const misnamed = artifact('ACT-B', 'actor', {}, { file: 'model/wrong-name.md' });
    expect(run([misnamed]).filter((d) => d.code === 'PRODUCT101')).toHaveLength(1);
  });

  it('always reports PRODUCT102: no configuration can suppress a normative warning', () => {
    const uc = artifact('UC-LONELY', 'use-case', { 'primary-actor': 'ACT-A' });
    expect(run([baseActor, uc]).filter((d) => d.code === 'PRODUCT102')).toHaveLength(1);
  });

  it('flags unreachable requirements (PRODUCT103)', () => {
    const orphan = artifact('FR-ORPHAN-001', 'functional-requirement', {
      'derived-from': ['UC-GHOST'],
      verification: [{ scenario: 'x' }],
    });
    const connected = artifact('FR-OK-001', 'functional-requirement', {
      'derived-from': ['UC-A'],
      verification: [{ scenario: 'x' }],
    });
    const uc = artifact('UC-A', 'use-case', { 'primary-actor': 'ACT-A' });
    const diagnostics = run([baseActor, uc, orphan, connected]);
    const flagged = diagnostics.filter((d) => d.code === 'PRODUCT103').map((d) => d.artifact);
    expect(flagged).toEqual(['FR-ORPHAN-001']);
  });

  describe('low-confidence drafts (PRODUCT111)', () => {
    const provenance = (confidence: string) => ({
      source: 'src/legacy/orders.ts',
      confidence,
      'recovered-from': 'inference',
    });

    it('warns on a draft whose provenance confidence is low', () => {
      const draft = artifact('ACT-RECOVERED', 'actor', {
        status: 'draft',
        provenance: provenance('low'),
      });
      const diagnostics = run([draft]).filter((d) => d.code === 'PRODUCT111');
      expect(diagnostics).toEqual([
        expect.objectContaining({
          severity: 'warning',
          artifact: 'ACT-RECOVERED',
          field: 'provenance.confidence',
        }),
      ]);
    });

    it('stays silent for higher confidence, for accepted artifacts and with no provenance', () => {
      const confident = artifact('ACT-A', 'actor', {
        status: 'draft',
        provenance: provenance('high'),
      });
      // Accepting a low-confidence candidate into the baseline is the human decision the
      // warning exists to prompt; once made, it must not keep firing.
      const accepted = artifact('ACT-B', 'actor', {
        status: 'active',
        provenance: provenance('low'),
      });
      const greenfield = artifact('ACT-C', 'actor', { status: 'draft' });
      const diagnostics = run([confident, accepted, greenfield]);
      expect(diagnostics.filter((d) => d.code === 'PRODUCT111')).toEqual([]);
    });
  });

  it('flags orphaned rules, terms and contexts (PRODUCT105-107)', () => {
    const rule = artifact('BR-LONE', 'business-rule');
    const term = artifact('TERM-LONE', 'domain-term', { 'defined-in': 'BC-LONE' });
    const context = artifact('BC-EMPTY', 'bounded-context');
    const owningContext = artifact('BC-LONE', 'bounded-context');
    const diagnostics = run([rule, term, context, owningContext]);
    expect(diagnostics.filter((d) => d.code === 'PRODUCT105').map((d) => d.artifact)).toEqual([
      'BR-LONE',
    ]);
    expect(diagnostics.filter((d) => d.code === 'PRODUCT106').map((d) => d.artifact)).toEqual([
      'TERM-LONE',
    ]);
    expect(diagnostics.filter((d) => d.code === 'PRODUCT107').map((d) => d.artifact)).toEqual([
      'BC-EMPTY',
    ]);
  });
});
