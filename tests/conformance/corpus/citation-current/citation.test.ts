import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  SchemaRegistry,
  contentDigest,
  parseCitations,
  verifyCitations,
  loadModel,
} from '@prodshape/core';
import { repoRoot } from '../../../helpers.js';

const corpusDir = join(repoRoot, 'tests', 'conformance', 'corpus', 'citation-current');
const modelDir = join(corpusDir, 'model');

async function loadCorpusModel() {
  const registry = await SchemaRegistry.load(join(repoRoot, 'schemas'));
  return loadModel(modelDir, repoRoot, registry);
}

describe('citation contract — citation-current corpus', () => {
  it('resolves a current citation to the matching artifact', async () => {
    const { artifacts } = await loadCorpusModel();
    const fr = artifacts.find((a) => a.id === 'FR-AVAILABILITY-001');
    expect(fr).toBeDefined();

    // Build a consumer document with a current inline citation.
    const digest = fr!.digest;
    const consumerContent = `{pdac:cite id="FR-AVAILABILITY-001" digest="${digest}"}`;
    const consumerPath = join(corpusDir, 'consumer-inline.md');
    const { writeFile } = await import('node:fs/promises');
    await writeFile(consumerPath, consumerContent, 'utf8');

    const citations = await parseCitations(consumerPath, repoRoot);
    expect(citations).toHaveLength(1);
    expect(citations[0].form).toBe('inline');

    const verifications = verifyCitations(citations, artifacts);
    expect(verifications).toHaveLength(1);
    expect(verifications[0].status).toBe('current');
    expect(verifications[0].diagnostics).toEqual([]);
  });

  it('reports stale when the canonical content changed', async () => {
    const { artifacts } = await loadCorpusModel();
    const fr = artifacts.find((a) => a.id === 'FR-AVAILABILITY-001');
    expect(fr).toBeDefined();

    // A digest that does not match the current content.
    const staleDigest = 'sha256:0000000000000000000000000000000000000000000000000000000000000000';
    const consumerContent = `{pdac:cite id="FR-AVAILABILITY-001" digest="${staleDigest}"}`;
    const consumerPath = join(corpusDir, 'consumer-stale.md');
    const { writeFile } = await import('node:fs/promises');
    await writeFile(consumerPath, consumerContent, 'utf8');

    const citations = await parseCitations(consumerPath, repoRoot);
    const verifications = verifyCitations(citations, artifacts);
    expect(verifications[0].status).toBe('stale');
    expect(verifications[0].diagnostics.map((d) => d.code)).toContain('PRODUCT061');
  });

  it('reports unresolved when the target id does not resolve', async () => {
    const { artifacts } = await loadCorpusModel();
    const digest = contentDigest('nonexistent');
    const consumerContent = `{pdac:cite id="FR-NONEXISTENT-001" digest="${digest}"}`;
    const consumerPath = join(corpusDir, 'consumer-unresolved.md');
    const { writeFile } = await import('node:fs/promises');
    await writeFile(consumerPath, consumerContent, 'utf8');

    const citations = await parseCitations(consumerPath, repoRoot);
    const verifications = verifyCitations(citations, artifacts);
    expect(verifications[0].status).toBe('unresolved');
    expect(verifications[0].diagnostics.map((d) => d.code)).toContain('PRODUCT060');
  });

  it('reports anchor not found when the anchor does not resolve', async () => {
    const { artifacts } = await loadCorpusModel();
    const fr = artifacts.find((a) => a.id === 'FR-AVAILABILITY-001');
    expect(fr).toBeDefined();

    const digest = fr!.digest;
    const consumerContent = `{pdac:cite id="FR-AVAILABILITY-001" digest="${digest}" anchor="S99"}`;
    const consumerPath = join(corpusDir, 'consumer-anchor-missing.md');
    const { writeFile } = await import('node:fs/promises');
    await writeFile(consumerPath, consumerContent, 'utf8');

    const citations = await parseCitations(consumerPath, repoRoot);
    const verifications = verifyCitations(citations, artifacts);
    expect(verifications[0].status).toBe('unresolved');
    expect(verifications[0].diagnostics.map((d) => d.code)).toContain('PRODUCT063');
  });

  it('resolves a current citation with a valid anchor', async () => {
    const { artifacts } = await loadCorpusModel();
    const fr = artifacts.find((a) => a.id === 'FR-AVAILABILITY-001');
    expect(fr).toBeDefined();

    const digest = fr!.digest;
    const consumerContent = `{pdac:cite id="FR-AVAILABILITY-001" digest="${digest}" anchor="S1"}`;
    const consumerPath = join(corpusDir, 'consumer-anchor-valid.md');
    const { writeFile } = await import('node:fs/promises');
    await writeFile(consumerPath, consumerContent, 'utf8');

    const citations = await parseCitations(consumerPath, repoRoot);
    const verifications = verifyCitations(citations, artifacts);
    expect(verifications[0].status).toBe('current');
    expect(verifications[0].diagnostics).toEqual([]);
  });

  it('parses marker-block citations with embedded text', async () => {
    const { artifacts } = await loadCorpusModel();
    const fr = artifacts.find((a) => a.id === 'FR-AVAILABILITY-001');
    expect(fr).toBeDefined();

    const digest = fr!.digest;
    const consumerContent = `<!-- pdac:cite id="FR-AVAILABILITY-001" digest="${digest}" anchor="S1" -->
The applicant MUST provide availability information.
<!-- /pdac:cite -->`;
    const consumerPath = join(corpusDir, 'consumer-marker-block.md');
    const { writeFile } = await import('node:fs/promises');
    await writeFile(consumerPath, consumerContent, 'utf8');

    const citations = await parseCitations(consumerPath, repoRoot);
    expect(citations).toHaveLength(1);
    expect(citations[0].form).toBe('marker-block');
    expect(citations[0].embeddedText).toBeDefined();
  });

  it('parses sidecar-ledger citations from a YAML file', async () => {
    const { artifacts } = await loadCorpusModel();
    const fr = artifacts.find((a) => a.id === 'FR-AVAILABILITY-001');
    expect(fr).toBeDefined();

    const digest = fr!.digest;
    const consumerContent = `- id: FR-AVAILABILITY-001
  digest: ${digest}
  anchor: S1`;
    const consumerPath = join(corpusDir, 'citations.yaml');
    const { writeFile } = await import('node:fs/promises');
    await writeFile(consumerPath, consumerContent, 'utf8');

    const citations = await parseCitations(consumerPath, repoRoot);
    expect(citations).toHaveLength(1);
    expect(citations[0].form).toBe('sidecar-ledger');

    const verifications = verifyCitations(citations, artifacts);
    expect(verifications[0].status).toBe('current');
  });

  it('reports tampered when an embedded projection differs from canonical', async () => {
    const { artifacts } = await loadCorpusModel();
    const fr = artifacts.find((a) => a.id === 'FR-AVAILABILITY-001');
    expect(fr).toBeDefined();

    const digest = fr!.digest;
    // The embedded text is NOT the canonical content, but the digest matches the artifact.
    const consumerContent = `<!-- pdac:cite id="FR-AVAILABILITY-001" digest="${digest}" -->
This is NOT the canonical text.
<!-- /pdac:cite -->`;
    const consumerPath = join(corpusDir, 'consumer-tampered.md');
    const { writeFile } = await import('node:fs/promises');
    await writeFile(consumerPath, consumerContent, 'utf8');

    const citations = await parseCitations(consumerPath, repoRoot);
    const verifications = verifyCitations(citations, artifacts);
    expect(verifications[0].status).toBe('tampered');
    expect(verifications[0].diagnostics.map((d) => d.code)).toContain('PRODUCT062');
  });

  it('reports invalid digest format with PRODUCT042', async () => {
    const { artifacts } = await loadCorpusModel();
    const consumerContent = `{pdac:cite id="FR-AVAILABILITY-001" digest="not-a-digest"}`;
    const consumerPath = join(corpusDir, 'consumer-invalid-digest.md');
    const { writeFile } = await import('node:fs/promises');
    await writeFile(consumerPath, consumerContent, 'utf8');

    const citations = await parseCitations(consumerPath, repoRoot);
    const verifications = verifyCitations(citations, artifacts);
    expect(verifications[0].status).toBe('unresolved');
    expect(verifications[0].diagnostics.map((d) => d.code)).toContain('PRODUCT042');
  });
});
