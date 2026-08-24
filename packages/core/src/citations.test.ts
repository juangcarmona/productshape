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
  it('preserves support for a bare-array ledger', async () => {
    const sidecar = join(workDir, 'citations.yaml');
    await writeFile(sidecar, `- id: FR-ONE\n  digest: ${DIGEST_A}\n  anchor: S1\n`, 'utf8');

    const citations = await parseCitations(sidecar, workDir);

    expect(citations).toEqual([
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
    await writeFile(
      sidecar,
      `citations:\n  - id: FR-ONE\n    digest: ${DIGEST_A}\n  - id: FR-TWO\n    digest: ${DIGEST_B}\n    anchor: S2\n`,
      'utf8',
    );

    const citations = await parseCitations(sidecar, workDir);

    expect(citations.map(({ id, digest, anchor }) => ({ id, digest, anchor }))).toEqual([
      { id: 'FR-ONE', digest: DIGEST_A, anchor: undefined },
      { id: 'FR-TWO', digest: DIGEST_B, anchor: 'S2' },
    ]);
  });

  it('ignores malformed entries and unrelated mapping properties', async () => {
    const malformed = join(workDir, 'malformed.yaml');
    await writeFile(
      malformed,
      `citations:\n  - id: FR-VALID\n    digest: ${DIGEST_A}\n  - id: FR-NO-DIGEST\n  - id: 42\n    digest: ${DIGEST_B}\n  - not-a-record\nunrelated:\n  - id: FR-UNRELATED\n    digest: ${DIGEST_B}\n`,
      'utf8',
    );

    const citations = await parseCitations(malformed, workDir);
    expect(citations.map((citation) => citation.id)).toEqual(['FR-VALID']);

    const unrelated = join(workDir, 'unrelated.yml');
    await writeFile(
      unrelated,
      `references:\n  - id: FR-UNRELATED\n    digest: ${DIGEST_B}\nid: FR-ROOT\ndigest: ${DIGEST_A}\n`,
      'utf8',
    );

    await expect(parseCitations(unrelated, workDir)).resolves.toEqual([]);
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

    const citations = await parseCitations(consumer, workDir);
    expect(citations.map(({ id, anchor, line }) => ({ id, anchor, line }))).toEqual([
      { id: 'FR-ONE', anchor: undefined, line: 1 },
      { id: 'FR-TWO', anchor: 'S2', line: 2 },
      { id: 'BR-THREE', anchor: undefined, line: 3 },
    ]);
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
