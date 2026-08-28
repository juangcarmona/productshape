import { describe, expect, it } from 'vitest';
import { compileGraph } from './graph.js';
import type { LoadedArtifact } from './model.js';
import { buildTraceabilityJson } from './outputs.js';
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
      expect.objectContaining({ artifact: 'JRN-A', field: 'steps[].use-case', target: 'ACT-A' }),
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

  describe('uses-terms authorship from every permitted source kind (RFC 0072)', () => {
    const context = artifact('BC-CORE', 'bounded-context');
    const term = artifact('TERM-UNITS', 'domain-term', { 'defined-in': 'BC-CORE' });

    it.each([
      ['use-case', 'UC-USER', { 'primary-actor': 'ACT-A' }],
      ['business-rule', 'BR-USER', {}],
      ['domain-term', 'TERM-USER', { 'defined-in': 'BC-CORE' }],
      ['functional-requirement', 'FR-USER-001', {}],
      ['quality-requirement', 'QR-USER-001', {}],
      ['constraint', 'CON-USER', {}],
    ])('%s usage suppresses PRODUCT106 on the used term', (type, id, extra) => {
      const user = artifact(id, type, { ...extra, 'uses-terms': ['TERM-UNITS'] });
      const flagged = run([baseActor, context, term, user])
        .filter((d) => d.code === 'PRODUCT106')
        .map((d) => d.artifact);
      expect(flagged).not.toContain('TERM-UNITS');
    });

    it('term-to-term usage is definitional: the used term is covered, the using term is not', () => {
      const user = artifact('TERM-USER', 'domain-term', {
        'defined-in': 'BC-CORE',
        'uses-terms': ['TERM-UNITS'],
      });
      const flagged = run([context, term, user])
        .filter((d) => d.code === 'PRODUCT106')
        .map((d) => d.artifact);
      expect(flagged).toEqual(['TERM-USER']);
    });

    it('a prose mention is not usage: PRODUCT106 still fires and states the graph check', () => {
      const admirer = artifact(
        'BR-ADMIRER',
        'business-rule',
        {},
        {
          body: 'This rule leans on TERM-UNITS but never authors the edge.',
        },
      );
      const diagnostics = run([context, term, admirer]).filter((d) => d.code === 'PRODUCT106');
      expect(diagnostics).toEqual([
        expect.objectContaining({
          artifact: 'TERM-UNITS',
          message: "Domain term 'TERM-UNITS' has no incoming uses-terms relationship",
        }),
      ]);
    });

    it('an unknown uses-terms target from a new source kind is PRODUCT006', () => {
      const rule = artifact('BR-USER', 'business-rule', { 'uses-terms': ['TERM-GHOST'] });
      const diagnostics = run([rule]).filter((d) => d.code === 'PRODUCT006');
      expect(diagnostics).toEqual([
        expect.objectContaining({ artifact: 'BR-USER', field: 'uses-terms', target: 'TERM-GHOST' }),
      ]);
    });

    it('uses-terms stays out of the traceability sources projection', () => {
      // A term dependency names vocabulary the requirement needs, not a source it traces to.
      const uc = artifact('UC-A', 'use-case', { 'primary-actor': 'ACT-A' });
      const fr = artifact('FR-USER-001', 'functional-requirement', {
        'derived-from': ['UC-A'],
        'uses-terms': ['TERM-UNITS'],
      });
      const graph = compileGraph([baseActor, context, term, uc, fr]);
      const traceability = buildTraceabilityJson(graph) as {
        requirements: Record<string, { sources: string[] }>;
      };
      expect(traceability.requirements['FR-USER-001']?.sources).toEqual(['UC-A']);
    });

    it('uses-terms never narrows a product-wide constraint: no PRODUCT103 appears', () => {
      // The applies-to field decides where a constraint applies; a uses-terms dependency must
      // not cost the constraint its product-wide reachability exemption.
      const constraint = artifact('CON-USER', 'constraint', { 'uses-terms': ['TERM-UNITS'] });
      const diagnostics = run([context, term, constraint]);
      expect(diagnostics.filter((d) => d.code === 'PRODUCT103')).toEqual([]);
    });

    it('an active constraint using a retired term is PRODUCT008', () => {
      const retired = artifact('TERM-OLD', 'domain-term', {
        'defined-in': 'BC-CORE',
        status: 'retired',
      });
      const constraint = artifact('CON-USER', 'constraint', { 'uses-terms': ['TERM-OLD'] });
      const diagnostics = run([context, retired, constraint]);
      expect(diagnostics.filter((d) => d.code === 'PRODUCT008')).toHaveLength(1);
    });
  });

  describe('structured behaviour semantics (RFC 0084)', () => {
    const context = artifact('BC-CORE', 'bounded-context');
    const term = artifact('TERM-UNITS', 'domain-term', { 'defined-in': 'BC-CORE' });

    it('illustrates never counts as a business rule consumer: PRODUCT105 still fires', () => {
      // An example demonstrates the rule; it does not establish where the rule governs.
      const rule = artifact('BR-LONE', 'business-rule');
      const behaviour = artifact('SB-DEMO', 'structured-behaviour', {
        illustrates: ['BR-LONE'],
        when: 'A stimulus occurs',
        then: ['An outcome follows'],
      });
      const flagged = run([rule, behaviour])
        .filter((d) => d.code === 'PRODUCT105')
        .map((d) => d.artifact);
      expect(flagged).toEqual(['BR-LONE']);
    });

    it('a dangling applies-to is a broken reference, not consumption: PRODUCT105 still fires', () => {
      const rule = artifact('BR-DANGLING', 'business-rule', { 'applies-to': ['UC-GHOST'] });
      const diagnostics = run([rule]);
      expect(diagnostics.filter((d) => d.code === 'PRODUCT006')).toHaveLength(1);
      expect(diagnostics.filter((d) => d.code === 'PRODUCT105').map((d) => d.artifact)).toEqual([
        'BR-DANGLING',
      ]);
    });

    it('a retired use case governed-by does not suppress PRODUCT105 for an active rule', () => {
      const rule = artifact('BR-LONE', 'business-rule');
      const retiredUc = artifact('UC-OLD', 'use-case', {
        status: 'retired',
        'primary-actor': 'ACT-A',
        'governed-by': ['BR-LONE'],
      });
      const flagged = run([baseActor, rule, retiredUc])
        .filter((d) => d.code === 'PRODUCT105')
        .map((d) => d.artifact);
      expect(flagged).toEqual(['BR-LONE']);
    });

    it('a retired structured behaviour uses-terms does not suppress PRODUCT106', () => {
      const retiredBehaviour = artifact('SB-OLD', 'structured-behaviour', {
        status: 'retired',
        illustrates: ['UC-A'],
        when: 'A stimulus occurs',
        then: ['An outcome follows'],
        'uses-terms': ['TERM-UNITS'],
      });
      const uc = artifact('UC-A', 'use-case', { 'primary-actor': 'ACT-A' });
      const flagged = run([baseActor, context, term, uc, retiredBehaviour])
        .filter((d) => d.code === 'PRODUCT106')
        .map((d) => d.artifact);
      expect(flagged).toEqual(['TERM-UNITS']);
    });

    it('a non-retired structured behaviour uses-terms suppresses PRODUCT106', () => {
      const behaviour = artifact('SB-DEMO', 'structured-behaviour', {
        illustrates: ['UC-A'],
        when: 'A stimulus occurs',
        then: ['An outcome follows'],
        'uses-terms': ['TERM-UNITS'],
      });
      const uc = artifact('UC-A', 'use-case', { 'primary-actor': 'ACT-A' });
      const flagged = run([baseActor, context, term, uc, behaviour])
        .filter((d) => d.code === 'PRODUCT106')
        .map((d) => d.artifact);
      expect(flagged).not.toContain('TERM-UNITS');
    });

    it('retired rules and terms are outside the warning populations; referencing them is PRODUCT008', () => {
      const retiredRule = artifact('BR-OLD', 'business-rule', { status: 'retired' });
      const retiredTerm = artifact('TERM-OLD', 'domain-term', {
        status: 'retired',
        'defined-in': 'BC-CORE',
      });
      const behaviour = artifact('SB-DEMO', 'structured-behaviour', {
        illustrates: ['BR-OLD'],
        when: 'A stimulus occurs',
        then: ['An outcome follows'],
        'uses-terms': ['TERM-OLD'],
      });
      const diagnostics = run([context, retiredRule, retiredTerm, behaviour]);
      expect(diagnostics.filter((d) => d.code === 'PRODUCT008')).toHaveLength(2);
      expect(diagnostics.filter((d) => d.code === 'PRODUCT105')).toEqual([]);
      expect(diagnostics.filter((d) => d.code === 'PRODUCT106')).toEqual([]);
    });

    it('an unknown scenario-ref is PRODUCT006 with the exact array-member field', () => {
      const fr = artifact('FR-REF-001', 'functional-requirement', {
        'derived-from': ['UC-A'],
        verification: [{ scenario: 'inline stays valid' }, { 'scenario-ref': 'SB-GHOST' }],
      });
      const uc = artifact('UC-A', 'use-case', { 'primary-actor': 'ACT-A' });
      const diagnostics = run([baseActor, uc, fr]).filter((d) => d.code === 'PRODUCT006');
      expect(diagnostics).toEqual([
        expect.objectContaining({
          artifact: 'FR-REF-001',
          field: 'verification[].scenario-ref',
          target: 'SB-GHOST',
        }),
      ]);
    });

    it('an active requirement referencing a retired structured behaviour is PRODUCT008', () => {
      const retiredBehaviour = artifact('SB-OLD', 'structured-behaviour', {
        status: 'retired',
        illustrates: ['UC-A'],
        when: 'A stimulus occurs',
        then: ['An outcome follows'],
      });
      const uc = artifact('UC-A', 'use-case', { 'primary-actor': 'ACT-A' });
      const qr = artifact('QR-REF-001', 'quality-requirement', {
        'applies-to': ['UC-A'],
        verification: [{ 'scenario-ref': 'SB-OLD' }],
      });
      const diagnostics = run([baseActor, uc, retiredBehaviour, qr]);
      expect(
        diagnostics.filter(
          (d) => d.code === 'PRODUCT008' && d.field === 'verification[].scenario-ref',
        ),
      ).toHaveLength(1);
    });

    it('scenario-ref and illustrates edges join reachability: the requirement connects to the actor', () => {
      const uc = artifact('UC-A', 'use-case', { 'primary-actor': 'ACT-A' });
      const behaviour = artifact('SB-DEMO', 'structured-behaviour', {
        illustrates: ['UC-A'],
        when: 'A stimulus occurs',
        then: ['An outcome follows'],
      });
      const fr = artifact('FR-REF-001', 'functional-requirement', {
        verification: [{ 'scenario-ref': 'SB-DEMO' }],
      });
      const diagnostics = run([baseActor, uc, behaviour, fr]);
      expect(diagnostics.filter((d) => d.code === 'PRODUCT103')).toEqual([]);
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
