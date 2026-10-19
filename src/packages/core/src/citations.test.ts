import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildCitationIndex,
  computeAffectedCitations,
  emitCitation,
  parseCitations,
  type CitationRecord,
} from './citations.js';
import { contentDigest } from './digest.js';
import type { LoadedArtifact } from './model.js';

const DIGEST_A = 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const DIGEST_B = 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

let workDir: string;

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'prodshape-sidecars-'));
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

describe('YAML sidecar citation parsing', () => {
  it('preserves support for a bare-array ledger as a reader extension', async () => {
    const sidecar = join(workDir, 'notes.citations.yaml');
    await writeFile(join(workDir, 'notes.md'), '# Notes\n', 'utf8');
    await writeFile(sidecar, `- id: FR-ONE\n  digest: ${DIGEST_A}\n  anchor: S1\n`, 'utf8');

    const parsed = await parseCitations(sidecar, workDir);

    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.records).toEqual([
      expect.objectContaining({
        id: 'FR-ONE',
        digest: DIGEST_A,
        anchor: 'S1',
        form: 'sidecar-ledger',
      }),
    ]);
  });

  it('returns multiple valid records from a citations mapping in source order', async () => {
    const sidecar = join(workDir, 'spec-fixture.citations.yml');
    await writeFile(join(workDir, 'spec-fixture.md'), '# Fixture\n', 'utf8');
    await writeFile(
      sidecar,
      `citations:\n  - id: FR-ONE\n    digest: ${DIGEST_A}\n  - id: FR-TWO\n    digest: ${DIGEST_B}\n    anchor: S2\n`,
      'utf8',
    );

    const parsed = await parseCitations(sidecar, workDir);

    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.records.map(({ id, digest, anchor }) => ({ id, digest, anchor }))).toEqual([
      { id: 'FR-ONE', digest: DIGEST_A, anchor: undefined },
      { id: 'FR-TWO', digest: DIGEST_B, anchor: 'S2' },
    ]);
  });

  it('reports one PRODUCT067 for a malformed sidecar, never one per defect', async () => {
    const sidecar = join(workDir, 'broken.citations.yml');
    await writeFile(join(workDir, 'broken.md'), '# Broken\n', 'utf8');
    await writeFile(
      sidecar,
      `citations:\n  - id: FR-VALID\n    digest: ${DIGEST_A}\n  - id: FR-NO-DIGEST\n  - not-a-record\nunrelated: true\n`,
      'utf8',
    );

    const parsed = await parseCitations(sidecar, workDir);
    expect(parsed.records).toEqual([]);
    expect(parsed.diagnostics).toEqual([
      expect.objectContaining({ code: 'PRODUCT067', file: 'broken.citations.yml' }),
    ]);
  });

  it.each([
    ['an empty citations sequence', 'citations: []\n', undefined],
    [
      'a mapping without the citations key',
      `references:\n  - id: FR-X\n    digest: ${DIGEST_A}\n`,
      undefined,
    ],
    [
      'an extra top-level key',
      `citations:\n  - id: FR-X\n    digest: ${DIGEST_A}\nnotes: hand-written\n`,
      undefined,
    ],
    [
      'a non-closed record',
      `citations:\n  - id: FR-X\n    digest: ${DIGEST_A}\n    extra: field\n`,
      1,
    ],
    [
      'a YAML anchor and alias',
      `citations:\n  - &a\n    id: FR-X\n    digest: ${DIGEST_A}\n  - *a\n`,
      undefined,
    ],
    [
      'two YAML documents',
      `citations:\n  - id: FR-X\n    digest: ${DIGEST_A}\n---\ncitations: []\n`,
      undefined,
    ],
  ])('rejects a sidecar with %s as one PRODUCT067', async (_label, content, entry) => {
    const sidecar = join(workDir, 'case.citations.yml');
    await writeFile(join(workDir, 'case.md'), '# Case\n', 'utf8');
    await writeFile(sidecar, content, 'utf8');

    const parsed = await parseCitations(sidecar, workDir);
    expect(parsed.records).toEqual([]);
    expect(parsed.diagnostics).toHaveLength(1);
    expect(parsed.diagnostics[0]).toMatchObject({
      code: 'PRODUCT067',
      file: 'case.citations.yml',
      ...(entry === undefined ? {} : { entry }),
    });
  });

  it('reports a sidecar whose consumer file is missing', async () => {
    const sidecar = join(workDir, 'orphan.citations.yml');
    await writeFile(sidecar, `citations:\n  - id: FR-X\n    digest: ${DIGEST_A}\n`, 'utf8');

    const parsed = await parseCitations(sidecar, workDir);
    expect(parsed.records).toEqual([]);
    expect(parsed.diagnostics).toEqual([
      expect.objectContaining({
        code: 'PRODUCT067',
        file: 'orphan.citations.yml',
        message: expect.stringContaining('no corresponding consumer file'),
      }),
    ]);
  });

  it('reads a consumer document through its adjacent sidecar', async () => {
    const consumer = join(workDir, 'feature.md');
    await writeFile(consumer, '# Feature with no payloads\n', 'utf8');
    await writeFile(
      join(workDir, 'feature.citations.yml'),
      `citations:\n  - id: FR-ONE\n    digest: ${DIGEST_A}\n`,
      'utf8',
    );

    const parsed = await parseCitations(consumer, workDir);
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.suppressed).toBe(false);
    expect(parsed.records).toEqual([
      expect.objectContaining({
        id: 'FR-ONE',
        source: 'feature.citations.yml',
        form: 'sidecar-ledger',
        line: 1,
      }),
    ]);
  });

  it('reports a carrier conflict once and suppresses both carriers', async () => {
    const consumer = join(workDir, 'both.md');
    await writeFile(consumer, `<!-- pdac:cite id="FR-ONE" digest="${DIGEST_A}" -->\n`, 'utf8');
    await writeFile(
      join(workDir, 'both.citations.yml'),
      `citations:\n  - id: FR-TWO\n    digest: ${DIGEST_B}\n`,
      'utf8',
    );

    const parsed = await parseCitations(consumer, workDir);
    expect(parsed.suppressed).toBe(true);
    expect(parsed.diagnostics).toEqual([
      expect.objectContaining({
        code: 'PRODUCT067',
        file: 'both.md',
        message: expect.stringContaining('both carriers'),
      }),
    ]);
    // The records stay listed so the document still counts as carrying citations.
    expect(parsed.records.map((r) => r.id)).toEqual(['FR-ONE']);
  });
});

describe('canonical citation writing', () => {
  it('emits the exact carrier-independent payload grammar', () => {
    expect(emitCitation({ id: 'FR-ONE', digest: DIGEST_A, anchor: 'S1', form: 'payload' })).toBe(
      `pdac:cite id="FR-ONE" digest="${DIGEST_A}" anchor="S1"`,
    );
  });

  it('rewrites the legacy inline writer request to the canonical payload', () => {
    expect(emitCitation({ id: 'FR-ONE', digest: DIGEST_A, form: 'inline' })).toBe(
      `pdac:cite id="FR-ONE" digest="${DIGEST_A}"`,
    );
  });

  it('emits the canonical mapping-form sidecar', () => {
    expect(
      emitCitation({ id: 'FR-ONE', digest: DIGEST_A, anchor: 'S1', form: 'sidecar-ledger' }),
    ).toBe(`citations:\n  - id: FR-ONE\n    digest: ${DIGEST_A}\n    anchor: S1`);
  });

  it('does not emit an empty marker block or invalid record', () => {
    expect(() => emitCitation({ id: 'FR-ONE', digest: DIGEST_A, form: 'marker-block' })).toThrow(
      'whole artifact projection',
    );
    expect(() => emitCitation({ id: 'FR-ONE', digest: 'invalid', form: 'payload' })).toThrow(
      'Invalid citation digest',
    );
  });

  it('accepts every product artifact kind, structured behaviours included (issue #206)', () => {
    expect(emitCitation({ id: 'SB-CHECKOUT-HAPPY-PATH', digest: DIGEST_A, form: 'payload' })).toBe(
      `pdac:cite id="SB-CHECKOUT-HAPPY-PATH" digest="${DIGEST_A}"`,
    );
    expect(() => emitCitation({ id: 'CHG-INITIAL', digest: DIGEST_A, form: 'payload' })).toThrow(
      'Invalid citation artifact id',
    );
  });
});

describe('canonical payload parsing', () => {
  it('discovers the same payload inside different native comment wrappers', async () => {
    const consumer = join(workDir, 'consumer.md');
    await writeFile(
      consumer,
      [
        `<!-- pdac:cite id="FR-ONE" digest="${DIGEST_A}" -->`,
        `# pdac:cite id="FR-TWO" digest="${DIGEST_B}" anchor="S2"`,
        `// pdac:cite id="BR-THREE" digest="${DIGEST_A}"`,
      ].join('\n'),
      'utf8',
    );

    const parsed = await parseCitations(consumer, workDir);
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.records.map(({ id, anchor, line }) => ({ id, anchor, line }))).toEqual([
      { id: 'FR-ONE', anchor: undefined, line: 1 },
      { id: 'FR-TWO', anchor: 'S2', line: 2 },
      { id: 'BR-THREE', anchor: undefined, line: 3 },
    ]);
  });

  it('still reads a marker block with its embedded projection', async () => {
    const consumer = join(workDir, 'block.md');
    await writeFile(
      consumer,
      [
        `<!-- pdac:cite id="FR-ONE" digest="${DIGEST_A}" -->`,
        'embedded canonical text',
        '<!-- /pdac:cite -->',
        '',
      ].join('\n'),
      'utf8',
    );

    const parsed = await parseCitations(consumer, workDir);
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.records).toEqual([
      expect.objectContaining({
        id: 'FR-ONE',
        form: 'marker-block',
        embeddedText: 'embedded canonical text\n',
      }),
    ]);
  });

  it.each([
    ['out-of-order attributes', `<!-- pdac:cite digest="${DIGEST_A}" id="FR-ONE" -->`],
    ['a repeated attribute', `<!-- pdac:cite id="FR-ONE" id="FR-TWO" digest="${DIGEST_A}" -->`],
    ['an unknown attribute', `<!-- pdac:cite id="FR-ONE" digest="${DIGEST_A}" note="x" -->`],
    ['single-quoted values', `<!-- pdac:cite id='FR-ONE' digest='${DIGEST_A}' -->`],
    ['a missing digest', '<!-- pdac:cite id="FR-ONE" -->'],
  ])('reports a malformed payload candidate with %s as PRODUCT067', async (_label, line) => {
    const consumer = join(workDir, 'bad.md');
    await writeFile(consumer, `# Doc\n\n${line}\n`, 'utf8');

    const parsed = await parseCitations(consumer, workDir);
    expect(parsed.records).toEqual([]);
    expect(parsed.diagnostics).toEqual([
      expect.objectContaining({ code: 'PRODUCT067', file: 'bad.md', line: 3 }),
    ]);
  });

  it('names the cited target when the malformed candidate still carries a parseable id', async () => {
    const consumer = join(workDir, 'named.md');
    await writeFile(consumer, `<!-- pdac:cite id="FR-ONE" anchor="S1" -->\n`, 'utf8');

    const parsed = await parseCitations(consumer, workDir);
    expect(parsed.diagnostics).toEqual([
      expect.objectContaining({ code: 'PRODUCT067', target: 'FR-ONE', line: 1 }),
    ]);
  });

  it('leaves the token without payload-like text as prose', async () => {
    const consumer = join(workDir, 'prose.md');
    await writeFile(consumer, 'The pdac:cite payload grammar is documented elsewhere.\n', 'utf8');

    const parsed = await parseCitations(consumer, workDir);
    expect(parsed.records).toEqual([]);
    expect(parsed.diagnostics).toEqual([]);
  });
});

describe('citation index and the affected citation set (RFC 0048)', () => {
  function record(overrides: Partial<CitationRecord> & Pick<CitationRecord, 'id'>): CitationRecord {
    return { digest: DIGEST_A, source: 'specs/one.md', line: 1, form: 'inline', ...overrides };
  }

  function artifact(id: string, body: string): LoadedArtifact {
    return {
      file: `model/${id.toLowerCase()}.md`,
      absolutePath: `/model/${id.toLowerCase()}.md`,
      frontmatter: {},
      body,
      digest: contentDigest(body),
      id,
    };
  }

  it('groups records by target artifact ID, keeping scan order within a group', () => {
    const first = record({ id: 'FR-ONE', line: 3 });
    const second = record({ id: 'FR-ONE', line: 1, source: 'specs/two.md' });
    const other = record({ id: 'FR-TWO' });
    const index = buildCitationIndex([first, second, other]);

    expect([...index.keys()]).toEqual(['FR-ONE', 'FR-TWO']);
    expect(index.get('FR-ONE')).toEqual([first, second]);
  });

  it('intersects the index with the changed IDs and forecasts against the applied result', () => {
    const applied = artifact('FR-CHANGED', 'the new canonical text');
    const untouched = artifact('FR-UNTOUCHED', 'unchanged text');
    const citations = [
      record({ id: 'FR-CHANGED', digest: contentDigest('the old canonical text') }),
      record({ id: 'FR-UNTOUCHED', digest: untouched.digest, line: 2 }),
      record({ id: 'FR-REMOVED', line: 3 }),
    ];

    const affected = computeAffectedCitations(
      citations,
      ['FR-CHANGED', 'FR-REMOVED'],
      [applied, untouched],
    );

    // The untouched target is not in the diff, so its citation is not affected. A citation of a
    // modified artifact forecasts stale; of a removed artifact, unresolved.
    expect(
      affected.map(({ citation, prospectiveStatus }) => ({ id: citation.id, prospectiveStatus })),
    ).toEqual([
      { id: 'FR-CHANGED', prospectiveStatus: 'stale' },
      { id: 'FR-REMOVED', prospectiveStatus: 'unresolved' },
    ]);
  });

  it('forecasts current for a citation already recorded against the proposed content', () => {
    const applied = artifact('FR-CHANGED', 'the new canonical text');
    const affected = computeAffectedCitations(
      [record({ id: 'FR-CHANGED', digest: applied.digest })],
      ['FR-CHANGED'],
      [applied],
    );
    expect(affected.map((a) => a.prospectiveStatus)).toEqual(['current']);
  });

  it('orders the set by consumer path, point of use, target ID and anchor', () => {
    const applied = artifact('FR-A', 'moved');
    const citations = [
      record({ id: 'FR-B', source: 'specs/two.md', line: 9 }),
      record({ id: 'FR-B', source: 'specs/one.md', line: 12 }),
      record({ id: 'FR-A', source: 'specs/one.md', line: 12, anchor: 'S2' }),
      record({ id: 'FR-A', source: 'specs/one.md', line: 12, anchor: 'S1' }),
      record({ id: 'FR-A', source: 'specs/one.md', line: 2 }),
    ];

    const affected = computeAffectedCitations(citations, ['FR-B', 'FR-A'], [applied]);

    expect(
      affected.map(
        ({ citation }) =>
          `${citation.source}:${citation.line} ${citation.id}#${citation.anchor ?? ''}`,
      ),
    ).toEqual([
      'specs/one.md:2 FR-A#',
      'specs/one.md:12 FR-A#S1',
      'specs/one.md:12 FR-A#S2',
      'specs/one.md:12 FR-B#',
      'specs/two.md:9 FR-B#',
    ]);
  });

  it('reports an empty set for a diff nothing cites', () => {
    expect(computeAffectedCitations([record({ id: 'FR-ONE' })], ['FR-OTHER'], [])).toEqual([]);
  });
});
