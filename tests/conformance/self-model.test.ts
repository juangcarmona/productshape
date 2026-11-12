import { basename, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { listFilesRecursive, repoRoot, validateMarkdownDocument } from '../helpers.js';

const modelDir = join(repoRoot, 'docs', 'product', 'model');

const expectedIds: Record<string, string[]> = {
  actor: [
    'ACT-PRODUCT-ENGINEER',
    'ACT-REPOSITORY-MAINTAINER',
    'ACT-AI-ASSISTANT',
    // Added by CHG-SNAPSHOT-001 (Product Snapshot page).
    'ACT-PRODUCT-EXPLORER',
    // Added by CHG-ARC42-SNAPSHOT-001 (publication surfaces).
    'ACT-ENGINEERING-READER',
    'ACT-PUBLIC-READER',
  ],
  journey: [
    'JRN-ADOPT',
    // Added by CHG-SNAPSHOT-001 (Product Snapshot page).
    'JRN-SNAPSHOT',
  ],
  'use-case': [
    'UC-INIT',
    'UC-DEFINE',
    'UC-VALIDATE',
    'UC-INSPECT',
    'UC-IMPACT',
    // Added by RFC #4 (citation contract).
    'UC-CITE',
    'UC-CITATIONS-VERIFY',
    // Recovered: Product Change elaboration.
    'UC-CHANGE',
    // Added by CHG-CLI-POLISH-001 (adoption improvements).
    'UC-SCHEMA',
    'UC-FIX',
    // Added by CHG-ID-NOSUFFIX (ID-suffix migration).
    'UC-ID-MIGRATE',
    // Added by CHG-SNAPSHOT-001 (Product Snapshot page).
    'UC-SNAPSHOT',
    // Added by CHG-SPECKIT-001 (Spec Kit bridge and cited context projection).
    'UC-CONTEXT',
    'UC-SNAPSHOT-EXPLORE',
    // Added by CHG-EXPLORE-001 (ps:explore thinking partner).
    'UC-EXPLORE',
    // Added by CHG-RECOVERY-SESSIONS (deterministic brownfield recovery).
    'UC-RECOVER',
    // Added by CHG-ARC42-SNAPSHOT-001 (publication surfaces).
    'UC-ENGINEERING-PORTAL',
    'UC-PUBLIC-SITE',
  ],
  'business-rule': [
    'BR-CANONICAL',
    'BR-IDENTITY',
    // Added by CHG-ID-NOSUFFIX (ID form).
    'BR-ID-FORM',
    'BR-RELATIONSHIPS',
    'BR-CHANGE',
    'BR-SDD',
    'BR-AI',
    // Added by CHG-MUTATION-SAFETY-001 (repository mutation is contained, planned, drift-safe
    // and fails closed).
    'BR-MUTATION',
  ],
  'domain-term': [
    'TERM-PRODUCT-ARTIFACT',
    'TERM-PRODUCT-GRAPH',
    'TERM-CITATION',
    'TERM-CURRENT-PRODUCT-MODEL',
    // Added by CHG-BRAND-001 (ProductShape brand adoption).
    'TERM-METHODOLOGY',
    'TERM-REFERENCE-IMPLEMENTATION',
    // Added by CHG-SNAPSHOT-002 (progressive-disclosure Product Snapshot Explorer).
    'TERM-GRAPH-PROJECTION',
    'TERM-PRODUCT-EXPLORER',
    'TERM-FOCUSED-TOPOLOGY',
    // Added by CHG-SNAPSHOT-001 (Product Snapshot page).
    'TERM-PRODUCT-SNAPSHOT',
    // Added by CHG-ARC42-SNAPSHOT-001 (publication surfaces).
    'TERM-ARCHITECTURE-SNAPSHOT',
  ],
  'bounded-context': [
    'BC-PRODUCT-DEFINITION',
    'BC-DELIVERY-INTEGRATION',
    // Added by CHG-ARC42-SNAPSHOT-001 (publication surfaces).
    'BC-PUBLICATION',
  ],
  'functional-requirement': [
    'FR-INIT-PRESERVE',
    // Added by CHG-INIT-SDD-001 (SDD-aware initialization).
    'FR-INIT-SDD',
    'FR-PARSE',
    'FR-VALIDATE-REFERENCES',
    'FR-VALIDATE-DIAGNOSTICS',
    'FR-GRAPH',
    'FR-INSPECT',
    'FR-IMPACT',
    // Added by RFC #4 (citation contract).
    'FR-CITE',
    'FR-CITATIONS-VERIFY',
    // Recovered: Product Change elaboration.
    'FR-CHANGE-VALIDATE',
    // Apply materializes an approved change without accepting it (BR-CHANGE).
    'FR-CHANGE-APPLY',
    'FR-DISTRIBUTION',
    'FR-OPENSPEC',
    // Added by CHG-SPECKIT-001 (Spec Kit bridge and cited context projection).
    'FR-SPECKIT',
    'FR-CONTEXT',
    // Added by CHG-CLI-POLISH-001 (adoption improvements).
    'FR-SCHEMA',
    'FR-FIX',
    // Added by CHG-ID-NOSUFFIX (ID-suffix migration).
    'FR-ID-MIGRATION',
    // Added by CHG-MODEL-TRUEUP-001 (baseline corrected against shipped behaviour).
    'FR-DOCTOR',
    // Added by CHG-SNAPSHOT-001 (Product Snapshot page).
    'FR-SNAPSHOT-PAGE',
    'FR-SNAPSHOT-READER',
    // Added by CHG-EXPLORE-001 (ps:explore thinking partner).
    'FR-EXPLORE',
    // Added by CHG-SNAPSHOT-002 (progressive-disclosure Product Snapshot Explorer).
    'FR-SNAPSHOT-ORIENTATION',
    'FR-SNAPSHOT-SEARCH',
    'FR-SNAPSHOT-PROJECTIONS',
    'FR-SNAPSHOT-ADDRESSING',
    'FR-SNAPSHOT-CATALOG',
    'FR-SNAPSHOT-TOPOLOGY',
    'FR-SNAPSHOT-BUSINESS-LENS',
    // Added by CHG-RECOVERY-SESSIONS (deterministic brownfield recovery).
    'FR-RECOVER',
    // Added by CHG-RELEASE-CONTRACT-001 (executable release contract).
    'FR-RELEASE',
    // Added by CHG-ARC42-SNAPSHOT-001 (publication surfaces).
    'FR-ENGINEERING-PORTAL',
    'FR-PUBLIC-SITE',
  ],
  'quality-requirement': [
    'QR-PORTABILITY',
    'QR-DETERMINISM',
    'QR-EXPLAINABILITY',
    'QR-EXTENSIBILITY',
    // Added by CHG-SNAPSHOT-002 (progressive-disclosure Product Snapshot Explorer).
    'QR-ACCESSIBILITY',
    'QR-PRESENTATION',
    'QR-SCALABILITY',
  ],
  constraint: [
    'CON-MARKDOWN',
    'CON-NO-GRAPH-DATABASE',
    'CON-NO-WEB-UI',
    'CON-SDD-AGNOSTIC',
    'CON-PUBLIC-GENERIC',
    // Added by CHG-BRAND-001 (ProductShape brand adoption).
    'CON-BRAND',
  ],
  'structured-behaviour': [
    // Added by CHG-SB-ADOPT-001 (Structured Behaviour adoption).
    'SB-ID-REUSE-REJECTED',
    'SB-REGENERATION-RESTORES',
    'SB-TAMPERED-BEATS-STALE',
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
  illustrates: {
    types: ['use-case', 'business-rule', 'constraint'],
    onlyOn: ['structured-behaviour'],
  },
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
