import { basename, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { listFilesRecursive, repoRoot, validateMarkdownDocument } from '../helpers.js';

const modelDir = join(repoRoot, 'docs', 'product', 'model');

const expectedIds: Record<string, string[]> = {
  actor: [
    'ACT-PRODUCT-ENGINEER',
    'ACT-REPOSITORY-MAINTAINER',
    'ACT-AI-ASSISTANT',
    'ACT-PRODUCT-EXPLORER',
  ],
  journey: ['JRN-ADOPT-001', 'JRN-SNAPSHOT-001'],
  'use-case': [
    'UC-INIT-001',
    'UC-DEFINE-001',
    'UC-VALIDATE-001',
    'UC-INSPECT-001',
    'UC-IMPACT-001',
    'UC-CITE-001',
    'UC-CITATIONS-VERIFY-001',
    'UC-CHANGE-001',
    'UC-SCHEMA-001',
    'UC-FIX-001',
    'UC-SNAPSHOT-001',
    'UC-SNAPSHOT-EXPLORE-001',
    'UC-EXPLORE-001',
  ],
  'business-rule': [
    'BR-CANONICAL-001',
    'BR-IDENTITY-001',
    'BR-RELATIONSHIPS-001',
    'BR-CHANGE-001',
    'BR-SDD-001',
    'BR-AI-001',
  ],
  'domain-term': [
    'TERM-PRODUCT-ARTIFACT',
    'TERM-PRODUCT-GRAPH',
    'TERM-PRODUCT-CONTEXT',
    'TERM-CURRENT-PRODUCT-MODEL',
    'TERM-METHODOLOGY',
    'TERM-REFERENCE-IMPLEMENTATION',
    'TERM-GRAPH-PROJECTION',
    'TERM-PRODUCT-EXPLORER',
    'TERM-FOCUSED-TOPOLOGY',
    'TERM-PRODUCT-SNAPSHOT',
  ],
  'bounded-context': ['BC-PRODUCT-DEFINITION', 'BC-DELIVERY-INTEGRATION'],
  'functional-requirement': [
    'FR-INIT-001',
    'FR-PARSE-001',
    'FR-VALIDATE-001',
    'FR-VALIDATE-002',
    'FR-GRAPH-001',
    'FR-INSPECT-001',
    'FR-IMPACT-001',
    'FR-CITE-001',
    'FR-CITATIONS-VERIFY-001',
    'FR-CHANGE-001',
    'FR-CHANGE-002',
    'FR-DISTRIBUTION-001',
    'FR-OPENSPEC-001',
    'FR-SCHEMA-001',
    'FR-FIX-001',
    'FR-DOCTOR-001',
    'FR-SNAPSHOT-001',
    'FR-SNAPSHOT-002',
    'FR-EXPLORE-001',
    'FR-SNAPSHOT-003',
    'FR-SNAPSHOT-004',
    'FR-SNAPSHOT-005',
    'FR-SNAPSHOT-006',
    'FR-SNAPSHOT-008',
    'FR-SNAPSHOT-009',
  ],
  'quality-requirement': [
    'QR-PORTABILITY-001',
    'QR-DETERMINISM-001',
    'QR-EXPLAINABILITY-001',
    'QR-EXTENSIBILITY-001',
    'QR-ACCESSIBILITY-001',
    'QR-PRESENTATION-001',
    'QR-SCALABILITY-001',
  ],
  constraint: [
    'CON-MARKDOWN-001',
    'CON-NO-GRAPH-DATABASE',
    'CON-NO-WEB-UI',
    'CON-SDD-AGNOSTIC',
    'CON-PUBLIC-GENERIC',
    'CON-BRAND-001',
  ],
};

/** Canonical relationship fields and their allowed target types (https://github.com/product-definition-as-code/spec/blob/main/spec/relationships.md). */
const referenceFields: Record<string, { types: string[]; onlyOn?: string[] }> = {
  'primary-actor': { types: ['actor'] },
  'supporting-actors': { types: ['actor'] },
  'bounded-context': { types: ['bounded-context'], onlyOn: ['use-case'] },
  'governed-by': { types: ['business-rule'] },
  'uses-terms': { types: ['domain-term'] },
  'applies-to': { types: ['journey', 'use-case', 'bounded-context'] },
  'defined-in': { types: ['bounded-context'] },
  'derived-from': { types: ['use-case', 'business-rule', 'constraint'] },
};

async function loadModel() {
  const files = await listFilesRecursive(modelDir, '.md');
  const documents = [];
  for (const file of files) {
    if (basename(file) === 'index.md') continue;
    documents.push(await validateMarkdownDocument(file));
  }
  return documents;
}

describe('self-hosted product model', () => {
  it('every artifact parses, schema-validates and carries its required sections', async () => {
    for (const doc of await loadModel()) {
      expect.soft(doc.diagnostics, doc.file).toEqual([]);
    }
  });

  it('contains exactly the founding artifact inventory, all active', async () => {
    const documents = await loadModel();
    const byType = new Map<string, string[]>();
    for (const doc of documents) {
      const type = String(doc.frontmatter.type);
      const id = String(doc.frontmatter.id);
      byType.set(type, [...(byType.get(type) ?? []), id]);
      expect.soft(doc.frontmatter.status, id).toBe('active');
    }
    for (const [type, ids] of Object.entries(expectedIds)) {
      expect.soft(byType.get(type)?.sort(), type).toEqual([...ids].sort());
    }
    const allIds = documents.map((d) => String(d.frontmatter.id));
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it('entered through CHG-INITIAL, which accounts for every artifact in the model', async () => {
    // The archived initialisation change is the record of how this Product Definition came to
    // exist. If it and the model disagree, one of them is lying about what the product is.
    const change = await validateMarkdownDocument(
      join(repoRoot, 'docs', 'product', 'changes', 'completed', 'chg-initial', 'change.md'),
    );
    expect(change.diagnostics, change.file).toEqual([]);
    expect(change.frontmatter.id).toBe('CHG-INITIAL');
    expect(change.frontmatter.status).toBe('applied');

    const operations = change.frontmatter.operations as {
      add: string[];
      modify: string[];
      remove: string[];
    };
    const modelIds = (await loadModel()).map((d) => String(d.frontmatter.id));
    expect([...operations.add].sort()).toEqual([...modelIds].sort());
    expect(operations.modify).toEqual([]);
    expect(operations.remove).toEqual([]);
  });

  it('every relationship reference resolves to an allowed target type', async () => {
    const documents = await loadModel();
    const typeById = new Map(
      documents.map((d) => [String(d.frontmatter.id), String(d.frontmatter.type)]),
    );

    for (const doc of documents) {
      const sourceType = String(doc.frontmatter.type);
      const check = (field: string, value: unknown) => {
        const spec = referenceFields[field];
        if (!spec || (spec.onlyOn && !spec.onlyOn.includes(sourceType))) return;
        const targets = Array.isArray(value) ? value : [value];
        for (const target of targets) {
          if (typeof target !== 'string') continue;
          const targetType = typeById.get(target);
          expect.soft(targetType, `${doc.file}: ${field} -> ${target}`).toBeDefined();
          if (targetType) {
            expect.soft(spec.types, `${doc.file}: ${field} -> ${target}`).toContain(targetType);
          }
        }
      };

      for (const [field, value] of Object.entries(doc.frontmatter)) {
        if (field === 'steps' && Array.isArray(value)) {
          for (const step of value) {
            const target = (step as Record<string, unknown>)['use-case'];
            expect
              .soft(typeById.get(String(target)), `${doc.file}: steps -> ${String(target)}`)
              .toBe('use-case');
          }
        } else {
          check(field, value);
        }
      }
    }
  });

  it('classifies the AI assistant as a non-human actor', async () => {
    const documents = await loadModel();
    const assistant = documents.find((d) => d.frontmatter.id === 'ACT-AI-ASSISTANT');
    expect(assistant?.frontmatter['actor-kind']).not.toBe('human');
  });

  it('aligns every file name with its artifact ID', async () => {
    for (const doc of await loadModel()) {
      const id = String(doc.frontmatter.id);
      expect.soft(basename(doc.file), id).toBe(`${id.toLowerCase()}.md`);
    }
  });
});
