import { describe, expect, it } from 'vitest';
import {
  computeIdRenames,
  hasNumericSuffix,
  rewriteIds,
  stripNumericSuffix,
} from './id-migration.js';

describe('stripNumericSuffix', () => {
  it('removes a trailing numeric segment from PREFIX-NAME-NNN', () => {
    expect(stripNumericSuffix('FR-CITE-001')).toBe('FR-CITE');
    expect(stripNumericSuffix('UC-SNAPSHOT-EXPLORE-001')).toBe('UC-SNAPSHOT-EXPLORE');
    expect(stripNumericSuffix('FR-HTTP-2')).toBe('FR-HTTP');
  });

  it('leaves IDs without a numeric tail, and IDs that would lose their name, alone', () => {
    expect(stripNumericSuffix('FR-CITE')).toBeUndefined();
    expect(stripNumericSuffix('FR-001')).toBeUndefined();
    expect(stripNumericSuffix('FR-HTTP2')).toBeUndefined();
    expect(hasNumericSuffix('CON-NO-GRAPH-DATABASE')).toBe(false);
    expect(hasNumericSuffix('CHG-ADD-CITE-001')).toBe(false);
  });
});

describe('computeIdRenames', () => {
  it('strips the suffix where nothing collides', () => {
    const { renames, collisions } = computeIdRenames([
      'UC-IMPACT-001',
      'BR-IDENTITY-001',
      'ACT-ADMIN',
    ]);
    expect(renames).toEqual([
      { from: 'BR-IDENTITY-001', to: 'BR-IDENTITY', kind: 'strip' },
      { from: 'UC-IMPACT-001', to: 'UC-IMPACT', kind: 'strip' },
    ]);
    expect(collisions).toEqual([]);
  });

  it('keeps every member of a set that would collapse into one ID', () => {
    const { renames, collisions } = computeIdRenames([
      'FR-INIT-001',
      'FR-INIT-002',
      'FR-OTHER-001',
    ]);
    expect(renames.map((r) => r.from)).toEqual(['FR-OTHER-001']);
    expect(collisions).toEqual([
      { base: 'FR-INIT', ids: ['FR-INIT-001', 'FR-INIT-002'], reason: 'shared-base' },
    ]);
  });

  it('keeps an ID whose bare form already exists', () => {
    const { renames, collisions } = computeIdRenames(['FR-INIT', 'FR-INIT-001']);
    expect(renames).toEqual([]);
    expect(collisions[0]).toMatchObject({ base: 'FR-INIT', reason: 'base-exists' });
  });

  it('never renames across prefixes: the same name under two prefixes is not a collision', () => {
    const { renames, collisions } = computeIdRenames(['UC-FIX-001', 'FR-FIX-001']);
    expect(renames).toHaveLength(2);
    expect(collisions).toEqual([]);
  });

  it('honours an explicit name for a colliding set and rejects a taken or invalid one', () => {
    const ids = ['FR-INIT-001', 'FR-INIT-002', 'FR-TAKEN'];
    expect(
      computeIdRenames(ids, { 'FR-INIT-001': 'FR-INIT-PRESERVE', 'FR-INIT-002': 'FR-INIT-SDD' })
        .renames,
    ).toEqual([
      { from: 'FR-INIT-001', to: 'FR-INIT-PRESERVE', kind: 'override' },
      { from: 'FR-INIT-002', to: 'FR-INIT-SDD', kind: 'override' },
    ]);
    const taken = computeIdRenames(ids, { 'FR-INIT-001': 'FR-TAKEN' });
    expect(taken.collisions[0]).toMatchObject({ reason: 'target-taken' });
    const invalid = computeIdRenames(ids, { 'FR-INIT-001': 'not an id' });
    expect(invalid.collisions[0]).toMatchObject({ reason: 'target-taken' });
  });

  it('is idempotent: renamed IDs produce no further renames', () => {
    const first = computeIdRenames(['FR-A-001', 'FR-B-001', 'FR-C-001', 'FR-C-002']);
    const after = first.renames.map((r) => r.to).concat(first.collisions.flatMap((c) => c.ids));
    const second = computeIdRenames(after);
    expect(second.renames).toEqual([]);
  });
});

describe('rewriteIds', () => {
  const map = new Map([
    ['FR-CITE-001', 'FR-CITE'],
    ['FR-CITE-0010', 'FR-ELSEWHERE'],
    ['UC-A-001', 'UC-A'],
  ]);

  it('rewrites whole tokens, only once, and counts them', () => {
    const { text, mentions } = rewriteIds('FR-CITE-001, (UC-A-001) and `FR-CITE-001`.', map);
    expect(text).toBe('FR-CITE, (UC-A) and `FR-CITE`.');
    expect(mentions).toBe(3);
  });

  it('does not touch longer IDs that merely start with an old ID', () => {
    expect(rewriteIds('FR-CITE-001-EXTRA and XFR-CITE-001', map).mentions).toBe(0);
    expect(rewriteIds('FR-CITE-0010', map).text).toBe('FR-ELSEWHERE');
  });

  it('follows file names in links', () => {
    expect(rewriteIds('[x](fr-cite-001.md)', map).text).toBe('[x](fr-cite.md)');
  });

  it('does not chain one rename into the next', () => {
    const chain = new Map([
      ['FR-X-001', 'FR-X'],
      ['FR-X', 'FR-Y'],
    ]);
    expect(rewriteIds('FR-X-001', chain).text).toBe('FR-X');
  });
});
