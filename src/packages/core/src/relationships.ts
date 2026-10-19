import type { ProductArtifactType } from './artifact.js';
import type { SerializationVersion } from './contract.js';

/**
 * The canonical relationship vocabulary (https://github.com/product-definition-as-code/spec/blob/main/spec/relationships.md).
 * One authored direction per relationship; every reverse view is derived.
 *
 * `field` is the vocabulary's canonical spelling and therefore the diagnostic attribution and
 * the edge kind. An array-member relationship spells the member path (`steps[].use-case`,
 * `verification[].scenario-ref`); extraction reads the named member of each entry in the
 * enclosing frontmatter array.
 */
/**
 * Which end a relationship puts in question when the other end changes
 * (spec/relationships.md, Polarity): `dependency` is authored on the artifact that builds on its
 * target, so a changed target questions the source; `governance` (`applies-to`) couples both
 * ends, so a change to either questions the other. Product Change operation edges have no
 * polarity and are not part of this vocabulary.
 */
export type RelationshipPolarity = 'dependency' | 'governance';

export interface RelationshipSpec {
  source: ProductArtifactType;
  field: string;
  targets: ProductArtifactType[];
  polarity: RelationshipPolarity;
}

const behaviourTargets: ProductArtifactType[] = ['journey', 'use-case', 'bounded-context'];

export const relationshipSpecs: RelationshipSpec[] = [
  { source: 'journey', field: 'primary-actor', targets: ['actor'], polarity: 'dependency' },
  { source: 'journey', field: 'steps[].use-case', targets: ['use-case'], polarity: 'dependency' },
  { source: 'use-case', field: 'primary-actor', targets: ['actor'], polarity: 'dependency' },
  { source: 'use-case', field: 'supporting-actors', targets: ['actor'], polarity: 'dependency' },
  {
    source: 'use-case',
    field: 'bounded-context',
    targets: ['bounded-context'],
    polarity: 'dependency',
  },
  { source: 'use-case', field: 'governed-by', targets: ['business-rule'], polarity: 'dependency' },
  { source: 'use-case', field: 'uses-terms', targets: ['domain-term'], polarity: 'dependency' },
  {
    source: 'business-rule',
    field: 'applies-to',
    targets: behaviourTargets,
    polarity: 'governance',
  },
  {
    source: 'business-rule',
    field: 'uses-terms',
    targets: ['domain-term'],
    polarity: 'dependency',
  },
  {
    source: 'domain-term',
    field: 'defined-in',
    targets: ['bounded-context'],
    polarity: 'dependency',
  },
  // Definitional dependency: understanding one definition may require another named term
  // (RFC 0072). Cycles between Domain Terms are representable and not diagnosed.
  { source: 'domain-term', field: 'uses-terms', targets: ['domain-term'], polarity: 'dependency' },
  {
    source: 'functional-requirement',
    field: 'derived-from',
    targets: ['use-case', 'business-rule', 'constraint'],
    polarity: 'dependency',
  },
  {
    source: 'functional-requirement',
    field: 'verification[].scenario-ref',
    targets: ['structured-behaviour'],
    polarity: 'dependency',
  },
  {
    source: 'functional-requirement',
    field: 'uses-terms',
    targets: ['domain-term'],
    polarity: 'dependency',
  },
  {
    source: 'quality-requirement',
    field: 'applies-to',
    targets: behaviourTargets,
    polarity: 'governance',
  },
  {
    source: 'quality-requirement',
    field: 'verification[].scenario-ref',
    targets: ['structured-behaviour'],
    polarity: 'dependency',
  },
  {
    source: 'quality-requirement',
    field: 'uses-terms',
    targets: ['domain-term'],
    polarity: 'dependency',
  },
  { source: 'constraint', field: 'applies-to', targets: behaviourTargets, polarity: 'governance' },
  { source: 'constraint', field: 'uses-terms', targets: ['domain-term'], polarity: 'dependency' },
  {
    source: 'structured-behaviour',
    field: 'illustrates',
    targets: ['use-case', 'business-rule', 'constraint'],
    polarity: 'dependency',
  },
  {
    source: 'structured-behaviour',
    field: 'uses-terms',
    targets: ['domain-term'],
    polarity: 'dependency',
  },
];

const lifecycleRelationships: RelationshipSpec[] = [
  {
    source: 'domain-lifecycle',
    field: 'subject',
    targets: ['domain-term'],
    polarity: 'dependency',
  },
  {
    source: 'domain-lifecycle',
    field: 'uses-terms',
    targets: ['domain-term'],
    polarity: 'dependency',
  },
  {
    source: 'domain-lifecycle',
    field: 'transitions[].initiated-by',
    targets: ['actor'],
    polarity: 'dependency',
  },
  {
    source: 'domain-lifecycle',
    field: 'transitions[].governed-by',
    targets: ['business-rule'],
    polarity: 'dependency',
  },
  {
    source: 'domain-lifecycle',
    field: 'transitions[].realized-by',
    targets: ['use-case'],
    polarity: 'dependency',
  },
  {
    source: 'structured-behaviour',
    field: 'covers-transition.lifecycle',
    targets: ['domain-lifecycle'],
    polarity: 'dependency',
  },
];

export const relationshipSpecsV2: RelationshipSpec[] = [
  ...relationshipSpecs.map((spec): RelationshipSpec => {
    if (spec.source === 'business-rule' && spec.field === 'applies-to') {
      return { ...spec, targets: ['journey', 'bounded-context'] };
    }
    if (
      (spec.source === 'functional-requirement' && spec.field === 'derived-from') ||
      ((spec.source === 'quality-requirement' || spec.source === 'constraint') &&
        spec.field === 'applies-to')
    ) {
      return { ...spec, targets: [...spec.targets, 'domain-lifecycle'] };
    }
    return spec;
  }),
  ...lifecycleRelationships,
];

function vocabulary(version: SerializationVersion): RelationshipSpec[] {
  return version === 'v1alpha2' ? relationshipSpecsV2 : relationshipSpecs;
}

export interface Edge {
  from: string;
  kind: string;
  to: string;
}

/** `<array>[].<member>` vocabulary spellings; capture 1 is the array key, capture 2 the member. */
const arrayMemberField = /^([a-z-]+)\[\]\.([a-z-]+)$/;

/** Extract the canonical outgoing references of one artifact's frontmatter. */
export function extractEdges(
  id: string,
  type: string,
  frontmatter: Record<string, unknown>,
  version: SerializationVersion = 'v1alpha1',
): Edge[] {
  const edges: Edge[] = [];
  for (const spec of vocabulary(version)) {
    if (spec.source !== type) continue;

    const arrayMember = arrayMemberField.exec(spec.field);
    if (arrayMember) {
      const [, key, member] = arrayMember;
      const value = frontmatter[key as string];
      if (Array.isArray(value)) {
        for (const entry of value) {
          const target = (entry as Record<string, unknown> | null)?.[member as string];
          for (const item of Array.isArray(target) ? target : [target]) {
            if (typeof item === 'string') edges.push({ from: id, kind: spec.field, to: item });
          }
        }
      }
      continue;
    }

    const value = spec.field
      .split('.')
      .reduce<unknown>(
        (value, key) =>
          typeof value === 'object' && value !== null
            ? (value as Record<string, unknown>)[key]
            : undefined,
        frontmatter,
      );
    if (value === undefined || value === null) continue;
    const targets = Array.isArray(value) ? value : [value];
    for (const target of targets) {
      if (typeof target === 'string') edges.push({ from: id, kind: spec.field, to: target });
    }
  }
  return edges;
}

export function allowedTargets(
  sourceType: string,
  field: string,
  version: SerializationVersion = 'v1alpha1',
): ProductArtifactType[] {
  const spec = vocabulary(version).find((s) => s.source === sourceType && s.field === field);
  return spec?.targets ?? [];
}

/** The polarity of one authored relationship, or undefined for a field outside the vocabulary. */
export function polarityOf(
  sourceType: string,
  field: string,
  version: SerializationVersion = 'v1alpha1',
): RelationshipPolarity | undefined {
  return vocabulary(version).find((s) => s.source === sourceType && s.field === field)?.polarity;
}
