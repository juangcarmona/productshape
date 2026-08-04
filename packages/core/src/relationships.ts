import type { ProductArtifactType } from './artifact.js';

/**
 * The canonical relationship vocabulary (https://github.com/product-definition-as-code/spec/blob/main/spec/relationships.md).
 * One authored direction per relationship; every reverse view is derived.
 */
export interface RelationshipSpec {
  source: ProductArtifactType;
  field: string;
  targets: ProductArtifactType[];
}

const behaviourTargets: ProductArtifactType[] = ['journey', 'use-case', 'bounded-context'];

export const relationshipSpecs: RelationshipSpec[] = [
  { source: 'journey', field: 'primary-actor', targets: ['actor'] },
  { source: 'journey', field: 'steps', targets: ['use-case'] },
  { source: 'use-case', field: 'primary-actor', targets: ['actor'] },
  { source: 'use-case', field: 'supporting-actors', targets: ['actor'] },
  { source: 'use-case', field: 'bounded-context', targets: ['bounded-context'] },
  { source: 'use-case', field: 'governed-by', targets: ['business-rule'] },
  { source: 'use-case', field: 'uses-terms', targets: ['domain-term'] },
  { source: 'business-rule', field: 'applies-to', targets: behaviourTargets },
  { source: 'domain-term', field: 'defined-in', targets: ['bounded-context'] },
  {
    source: 'functional-requirement',
    field: 'derived-from',
    targets: ['use-case', 'business-rule', 'constraint'],
  },
  { source: 'quality-requirement', field: 'applies-to', targets: behaviourTargets },
  { source: 'constraint', field: 'applies-to', targets: behaviourTargets },
];

export interface Edge {
  from: string;
  kind: string;
  to: string;
}

/** Extract the canonical outgoing references of one artifact's frontmatter. */
export function extractEdges(
  id: string,
  type: string,
  frontmatter: Record<string, unknown>,
): Edge[] {
  const edges: Edge[] = [];
  for (const spec of relationshipSpecs) {
    if (spec.source !== type) continue;
    const value = frontmatter[spec.field];
    if (value === undefined || value === null) continue;

    if (spec.field === 'steps') {
      if (Array.isArray(value)) {
        for (const step of value) {
          const target = (step as Record<string, unknown>)?.['use-case'];
          if (typeof target === 'string') edges.push({ from: id, kind: 'steps', to: target });
        }
      }
      continue;
    }

    const targets = Array.isArray(value) ? value : [value];
    for (const target of targets) {
      if (typeof target === 'string') edges.push({ from: id, kind: spec.field, to: target });
    }
  }
  return edges;
}

export function allowedTargets(sourceType: string, field: string): ProductArtifactType[] {
  const spec = relationshipSpecs.find((s) => s.source === sourceType && s.field === field);
  return spec?.targets ?? [];
}
