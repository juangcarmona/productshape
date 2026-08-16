import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseCitations } from './citations.js';

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
