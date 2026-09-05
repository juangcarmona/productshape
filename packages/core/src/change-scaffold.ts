import { requiredBodySections } from './artifact.js';

/** The reserved id of the change that establishes a product's first definition. */
export const INITIAL_CHANGE_ID = 'CHG-INITIAL';

/** Base revision of a change created where no Git history exists: satisfies the schema, names no commit. */
export const NO_BASELINE_REVISION = '0000000';

const sectionGuidance: Record<string, string> = {
  Problem:
    'What is wrong or missing in the current Product Definition? State the problem, not the solution.',
  'Intended Product Outcome':
    'What the Product Definition says once this change is accepted. Describe the destination, not the steps.',
  Rationale: 'Why this outcome, and why now.',
  'Affected Product Areas':
    'Which parts of the product this change touches, in product language rather than file paths.',
  'Open Questions': 'None.',
  'Product Acceptance':
    'How a human recognises that the accepted definition expresses the intended outcome.',
  'Out of Scope':
    'What this change explicitly does not touch, including delivery, technical design and implementation.',
};

/** 'CHG-ADD-CITE-001' -> 'Add cite 001'. */
export function defaultChangeTitle(id: string): string {
  const words = id
    .split('-')
    .slice(1)
    .map((word) => word.toLowerCase());
  const first = words[0] ?? '';
  return [first.charAt(0).toUpperCase() + first.slice(1), ...words.slice(1)].join(' ');
}

function yamlSingleQuoted(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

export function scaffoldChangeDocument(id: string, title: string, baseRevision: string): string {
  const body = requiredBodySections['product-change'].flatMap((section) => [
    `## ${section}`,
    '',
    sectionGuidance[section] ?? 'TODO.',
    '',
  ]);
  return [
    '---',
    `id: ${id}`,
    'type: product-change',
    `title: ${yamlSingleQuoted(title)}`,
    'status: draft',
    `base-revision: '${baseRevision}'`,
    'operations:',
    '  add: []',
    '  modify: []',
    '  remove: []',
    '---',
    '',
    ...body,
  ].join('\n');
}
