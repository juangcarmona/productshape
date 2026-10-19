import { describe, expect, it } from 'vitest';
import { SchemaRegistry } from './schema-registry.js';
import { compileGraph } from './graph.js';
import { validateModel } from './validate.js';
import { accountImpact } from './impact-accounting.js';
import { parseConfig } from './config.js';
import { verifyEvidence } from './verification-evidence.js';
import { validateChange } from './overlay.js';
import type { LoadedArtifact } from './model.js';
import type { LoadedChange } from './changes.js';

function artifact(
  id: string,
  type: string,
  fields: Record<string, unknown> = {},
  digest = 'sha256:' + 'a'.repeat(64),
): LoadedArtifact {
  return {
    id,
    type,
    title: id,
    status: 'active',
    digest,
    file: `${id.toLowerCase()}.md`,
    absolutePath: '',
    body: '',
    serializationVersion: 'v1alpha2',
    frontmatter: { id, type, title: id, status: 'active', ...fields },
  };
}
function change(proposed: LoadedArtifact[], unaffected: unknown[] = []): LoadedChange {
  return {
    id: 'CHG-A',
    file: 'change.md',
    dir: '.',
    body: '',
    digest: '',
    status: 'approved',
    serializationVersion: 'v1alpha2',
    operations: { add: [], modify: proposed.map((a) => a.id!), remove: [] },
    proposed,
    frontmatter: { unaffected },
    diagnostics: [],
  };
}

describe('versioned domain behaviour', () => {
  it('selects configuration explicitly and refuses a mismatched pair', () => {
    expect(parseConfig('version: v1alpha2', 'config.yaml').config.version).toBe('v1alpha2');
    expect(parseConfig('version: v1alpha1', 'config.yaml', 'v1alpha2').diagnostics).toMatchObject([
      { code: 'PRODUCT050', field: '/version' },
    ]);
  });
  it('keeps v1alpha1 BR scoping while v1alpha2 requires UC governed-by', async () => {
    const rule = artifact('BR-A', 'business-rule', { 'applies-to': ['UC-A'] });
    expect(
      (await SchemaRegistry.loadBundled()).validate(rule.type!, rule.frontmatter, rule.file),
    ).toEqual([]);
    expect(
      (await SchemaRegistry.loadBundled('v1alpha2')).validate(
        rule.type!,
        rule.frontmatter,
        rule.file,
      ),
    ).toMatchObject([{ code: 'PRODUCT002', field: '/applies-to/0' }]);
  });
  it('keeps transition relationships on the lifecycle and warns only for uncovered transitions', () => {
    const lc = artifact('LC-A', 'domain-lifecycle', {
      subject: 'TERM-A',
      states: [
        { id: 'OPEN', initial: true },
        { id: 'CLOSED', terminal: true },
      ],
      transitions: [
        {
          id: 'CLOSE',
          from: ['OPEN'],
          to: 'CLOSED',
          'initiated-by': ['ACT-A'],
          'governed-by': ['BR-A'],
        },
      ],
    });
    const artifacts = [
      lc,
      artifact('TERM-A', 'domain-term'),
      artifact('BR-A', 'business-rule'),
      artifact('ACT-A', 'actor'),
    ];
    const graph = compileGraph(artifacts);
    expect(graph.nodes.map((n) => n.id)).not.toContain('CLOSE');
    expect(graph.edges).toContainEqual({
      from: 'LC-A',
      kind: 'transitions[].governed-by',
      to: 'BR-A',
    });
    expect(validateModel(artifacts, graph).map((d) => d.code)).toEqual(['PRODUCT113']);
    artifacts.push(
      artifact('SB-A', 'structured-behaviour', {
        illustrates: ['BR-A'],
        'covers-transition': { lifecycle: 'LC-A', transition: 'CLOSE' },
      }),
    );
    expect(validateModel(artifacts, compileGraph(artifacts))).toEqual([]);
  });
  it('does not traverse or select an ambiguous local identity', () => {
    const lc = artifact('LC-A', 'domain-lifecycle', {
      states: [{ id: 'A', initial: true }, { id: 'A' }, { id: 'B' }],
      transitions: [
        { id: 'T', from: ['A'], to: 'B' },
        { id: 'T', from: ['A'], to: 'B' },
      ],
    });
    const findings = validateModel([lc], compileGraph([lc]));
    expect(findings.map((d) => [d.code, d.field])).toEqual([
      ['PRODUCT010', 'states[A].id'],
      ['PRODUCT010', 'transitions[T].id'],
    ]);
  });
});

describe('one-hop change accounting', () => {
  it('retains document errors for unchanged baseline artifacts while allowing their replacement', () => {
    const invalid = artifact('ACT-A', 'actor');
    invalid.documentDiagnostics = [
      {
        severity: 'error',
        code: 'PRODUCT002',
        file: invalid.file,
        artifact: invalid.id,
        field: '/actor-kind',
        message: 'Actor kind is required',
      },
    ];
    expect(validateChange(change([]), [invalid], []).diagnostics).toMatchObject([
      { code: 'PRODUCT002', field: '/actor-kind' },
    ]);
    const repaired = artifact('ACT-A', 'actor', { 'actor-kind': 'human' });
    expect(validateChange(change([repaired]), [invalid], []).diagnostics).toEqual([]);
  });
  it('deduplicates repeated lifecycle edge occurrences without expanding candidates transitively', () => {
    const br = artifact('BR-A', 'business-rule');
    const lc = artifact('LC-A', 'domain-lifecycle', {
      transitions: [{ 'governed-by': ['BR-A', 'BR-A'] }, { 'governed-by': ['BR-A'] }],
    });
    const fr = artifact('FR-A', 'functional-requirement', { 'derived-from': ['LC-A'] });
    const replacement = { ...br, digest: 'sha256:' + 'b'.repeat(64) };
    const result = accountImpact([br, lc, fr], [replacement, lc, fr], change([replacement]));
    expect(result.causes).toEqual([
      {
        candidate: 'LC-A',
        cause: 'BR-A',
        relationship: 'transitions[].governed-by',
        disposition: 'existing',
      },
    ]);
  });
  it('keeps a no-op modification accountable and checks each acknowledgement pin', () => {
    const br = artifact('BR-A', 'business-rule');
    const uc = artifact('UC-A', 'use-case', { 'governed-by': ['BR-A'] });
    const replacement = { ...br, digest: 'sha256:' + 'b'.repeat(64) };
    const entry = {
      id: 'UC-A',
      cause: 'BR-A',
      relationship: 'governed-by',
      digest: uc.digest,
      'cause-digest': replacement.digest,
      reason: 'Existing rule remains satisfied',
    };
    const result = accountImpact(
      [br, uc],
      [replacement, uc],
      change([replacement, uc], [entry, { ...entry, digest: replacement.digest }]),
    );
    expect(result.unresolved).toEqual([]);
    expect(result.diagnostics).toMatchObject([
      { code: 'PRODUCT033', target: 'UC-A', field: 'unaffected[2]' },
    ]);
  });
  it('distinguishes absent product scope from an explicitly empty scope', () => {
    const global = artifact('CON-A', 'constraint');
    const empty = artifact('CON-A', 'constraint', { 'applies-to': [] }, 'sha256:' + 'b'.repeat(64));
    expect(accountImpact([global], [empty], change([empty])).causes).toEqual([
      { scope: 'product', cause: 'CON-A', relationship: 'applies-to', disposition: 'removed' },
    ]);
  });
});

describe('external verification evidence', () => {
  const sb = artifact('SB-A', 'structured-behaviour');
  const claim = {
    'test-id': 'test-a',
    level: 'domain',
    outcome: 'passed',
    citations: [{ id: sb.id, digest: 'sha256:' + 'b'.repeat(64) }],
  };
  const envelope = {
    format: 'pdac-verification-evidence/v1alpha1',
    provider: 'external',
    'run-id': '42',
    revision: '1'.repeat(40),
    results: [claim],
  };
  it('preserves a passed external outcome when its citation is stale', async () => {
    const result = await verifyEvidence(JSON.stringify(envelope), 'run.json', [sb], '2'.repeat(40));
    expect(result).toMatchObject({
      runRevision: '1'.repeat(40),
      modelRevision: '2'.repeat(40),
      evidenceResults: [{ outcome: 'passed', citationStatuses: ['stale'] }],
      diagnostics: [{ code: 'PRODUCT061', entry: 1 }],
    });
  });
  it('rejects duplicate JSON keys before inspecting citations', async () => {
    const result = await verifyEvidence('{"provider":"a","provider":"b"}', 'run.json', [sb]);
    expect(result.diagnostics).toMatchObject([{ code: 'PRODUCT080' }]);
    expect(result.diagnostics[0]).not.toHaveProperty('field');
  });
  it('suppresses duplicate results without renumbering later citation entries', async () => {
    const data = {
      ...envelope,
      results: [
        claim,
        claim,
        { ...claim, 'test-id': 'test-b', citations: [{ id: 'SB-MISSING', digest: sb.digest }] },
      ],
    };
    const result = await verifyEvidence(JSON.stringify(data), 'run.json', [sb]);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'PRODUCT081', field: 'results[2].test-id' }),
        expect.objectContaining({ code: 'PRODUCT060', entry: 3 }),
      ]),
    );
  });
});
