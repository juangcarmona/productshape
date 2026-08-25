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

const caseDir = join(repoRoot, 'tests', 'conformance', 'cases', 'citation-current');
const modelDir = join(caseDir, 'model');

async function loadCaseModel() {
  const registry = await SchemaRegistry.load(join(repoRoot, 'schemas'));
  return loadModel(modelDir, repoRoot, registry);
}

describe('citation contract for the citation-current test case', () => {
  it('resolves a current citation to the matching artifact', async () => {
    const { artifacts } = await loadCaseModel();
    const fr = artifacts.find((a) => a.id === 'FR-AVAILABILITY-001');
    expect(fr).toBeDefined();

    const digest = fr!.digest;
    const consumerContent = `{pdac:cite id="FR-AVAILABILITY-001" digest="${digest}"}`;
    const consumerPath = join(caseDir, 'consumer-inline.md');
    const { writeFile } = await import('node:fs/promises');
    await writeFile(consumerPath, consumerContent, 'utf8');

    const { records: citations } = await parseCitations(consumerPath, repoRoot);
    expect(citations).toHaveLength(1);
    expect(citations[0].form).toBe('inline');

    const verifications = verifyCitations(citations, artifacts);
    expect(verifications).toHaveLength(1);
    expect(verifications[0].status).toBe('current');
    expect(verifications[0].diagnostics).toEqual([]);
  });

  it('reports stale when the canonical content changed', async () => {
    const { artifacts } = await loadCaseModel();
    const fr = artifacts.find((a) => a.id === 'FR-AVAILABILITY-001');
    expect(fr).toBeDefined();

    // A digest that does not match the current content.
    const staleDigest = 'sha256:0000000000000000000000000000000000000000000000000000000000000000';
    const consumerContent = `{pdac:cite id="FR-AVAILABILITY-001" digest="${staleDigest}"}`;
    const consumerPath = join(caseDir, 'consumer-stale.md');
    const { writeFile } = await import('node:fs/promises');
    await writeFile(consumerPath, consumerContent, 'utf8');

    const { records: citations } = await parseCitations(consumerPath, repoRoot);
    const verifications = verifyCitations(citations, artifacts);
    expect(verifications[0].status).toBe('stale');
    expect(verifications[0].diagnostics.map((d) => d.code)).toContain('PRODUCT061');
  });

  it('reports unresolved when the target id does not resolve', async () => {
    const { artifacts } = await loadCaseModel();
    const digest = contentDigest('nonexistent');
    const consumerContent = `{pdac:cite id="FR-NONEXISTENT-001" digest="${digest}"}`;
    const consumerPath = join(caseDir, 'consumer-unresolved.md');
    const { writeFile } = await import('node:fs/promises');
    await writeFile(consumerPath, consumerContent, 'utf8');

    const { records: citations } = await parseCitations(consumerPath, repoRoot);
    const verifications = verifyCitations(citations, artifacts);
    expect(verifications[0].status).toBe('unresolved');
    expect(verifications[0].diagnostics.map((d) => d.code)).toContain('PRODUCT060');
  });

  it('reports anchor not found when the anchor does not resolve', async () => {
    const { artifacts } = await loadCaseModel();
    const fr = artifacts.find((a) => a.id === 'FR-AVAILABILITY-001');
    expect(fr).toBeDefined();

    const digest = fr!.digest;
    const consumerContent = `{pdac:cite id="FR-AVAILABILITY-001" digest="${digest}" anchor="S99"}`;
    const consumerPath = join(caseDir, 'consumer-anchor-missing.md');
    const { writeFile } = await import('node:fs/promises');
    await writeFile(consumerPath, consumerContent, 'utf8');

    const { records: citations } = await parseCitations(consumerPath, repoRoot);
    const verifications = verifyCitations(citations, artifacts);
    expect(verifications[0].status).toBe('unresolved');
    expect(verifications[0].diagnostics.map((d) => d.code)).toContain('PRODUCT063');
  });

  it('resolves a current citation with a valid anchor', async () => {
    const { artifacts } = await loadCaseModel();
    const fr = artifacts.find((a) => a.id === 'FR-AVAILABILITY-001');
    expect(fr).toBeDefined();

    const digest = fr!.digest;
    const consumerContent = `{pdac:cite id="FR-AVAILABILITY-001" digest="${digest}" anchor="S1"}`;
    const consumerPath = join(caseDir, 'consumer-anchor-valid.md');
    const { writeFile } = await import('node:fs/promises');
    await writeFile(consumerPath, consumerContent, 'utf8');

    const { records: citations } = await parseCitations(consumerPath, repoRoot);
    const verifications = verifyCitations(citations, artifacts);
    expect(verifications[0].status).toBe('current');
    expect(verifications[0].diagnostics).toEqual([]);
  });

  it('parses marker-block citations with embedded text', async () => {
    const { artifacts } = await loadCaseModel();
    const fr = artifacts.find((a) => a.id === 'FR-AVAILABILITY-001');
    expect(fr).toBeDefined();

    const digest = fr!.digest;
    const consumerContent = `<!-- pdac:cite id="FR-AVAILABILITY-001" digest="${digest}" anchor="S1" -->
The applicant MUST provide availability information.
<!-- /pdac:cite -->`;
    const consumerPath = join(caseDir, 'consumer-marker-block.md');
    const { writeFile } = await import('node:fs/promises');
    await writeFile(consumerPath, consumerContent, 'utf8');

    const { records: citations } = await parseCitations(consumerPath, repoRoot);
    expect(citations).toHaveLength(1);
    expect(citations[0].form).toBe('marker-block');
    expect(citations[0].embeddedText).toBeDefined();
  });

  it('parses sidecar-ledger citations from a YAML file', async () => {
    const { artifacts } = await loadCaseModel();
    const fr = artifacts.find((a) => a.id === 'FR-AVAILABILITY-001');
    expect(fr).toBeDefined();

    const digest = fr!.digest;
    const consumerContent = `- id: FR-AVAILABILITY-001
  digest: ${digest}
  anchor: S1`;
    const consumerPath = join(caseDir, 'ledger.citations.yaml');
    const { writeFile } = await import('node:fs/promises');
    await writeFile(consumerPath, consumerContent, 'utf8');

    const { records: citations } = await parseCitations(consumerPath, repoRoot);
    expect(citations).toHaveLength(1);
    expect(citations[0].form).toBe('sidecar-ledger');

    const verifications = verifyCitations(citations, artifacts);
    expect(verifications[0].status).toBe('current');
  });

  it('reports tampered when an embedded projection differs from canonical', async () => {
    const { artifacts } = await loadCaseModel();
    const fr = artifacts.find((a) => a.id === 'FR-AVAILABILITY-001');
    expect(fr).toBeDefined();

    const digest = fr!.digest;
    // The embedded text is NOT the canonical content, but the digest matches the artifact.
    const consumerContent = `<!-- pdac:cite id="FR-AVAILABILITY-001" digest="${digest}" -->
This is NOT the canonical text.
<!-- /pdac:cite -->`;
    const consumerPath = join(caseDir, 'consumer-tampered.md');
    const { writeFile } = await import('node:fs/promises');
    await writeFile(consumerPath, consumerContent, 'utf8');

    const { records: citations } = await parseCitations(consumerPath, repoRoot);
    const verifications = verifyCitations(citations, artifacts);
    expect(verifications[0].status).toBe('tampered');
    expect(verifications[0].diagnostics.map((d) => d.code)).toContain('PRODUCT062');
  });

  it('reports tampered, not stale, when the embedded projection differs and the canonical content has also moved', async () => {
    const { artifacts } = await loadCaseModel();
    const fr = artifacts.find((a) => a.id === 'FR-AVAILABILITY-001');
    expect(fr).toBeDefined();

    // The recorded digest matches neither the embedded block nor the artifact's current
    // content: the citation is both tampered and stale. Tampered MUST win.
    const recordedDigest = 'sha256:1111111111111111111111111111111111111111111111111111111111111111';
    expect(recordedDigest).not.toBe(fr!.digest);
    const consumerContent = `<!-- pdac:cite id="FR-AVAILABILITY-001" digest="${recordedDigest}" -->
This is NOT the canonical text.
<!-- /pdac:cite -->`;
    const consumerPath = join(caseDir, 'consumer-tampered-and-stale.md');
    const { writeFile } = await import('node:fs/promises');
    await writeFile(consumerPath, consumerContent, 'utf8');

    const { records: citations } = await parseCitations(consumerPath, repoRoot);
    const verifications = verifyCitations(citations, artifacts);
    expect(verifications[0].status).toBe('tampered');
    const codes = verifications[0].diagnostics.map((d) => d.code);
    expect(codes).toContain('PRODUCT062');
    expect(codes).not.toContain('PRODUCT061');
  });

  it('reports invalid digest format with PRODUCT042', async () => {
    const { artifacts } = await loadCaseModel();
    const consumerContent = `{pdac:cite id="FR-AVAILABILITY-001" digest="not-a-digest"}`;
    const consumerPath = join(caseDir, 'consumer-invalid-digest.md');
    const { writeFile } = await import('node:fs/promises');
    await writeFile(consumerPath, consumerContent, 'utf8');

    const { records: citations } = await parseCitations(consumerPath, repoRoot);
    const verifications = verifyCitations(citations, artifacts);
    expect(verifications[0].status).toBe('unresolved');
    expect(verifications[0].diagnostics.map((d) => d.code)).toContain('PRODUCT042');
  });
});
