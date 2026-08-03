export const productArtifactTypes = [
  'actor',
  'journey',
  'use-case',
  'business-rule',
  'domain-term',
  'bounded-context',
  'functional-requirement',
  'quality-requirement',
  'constraint',
] as const;

export type ProductArtifactType = (typeof productArtifactTypes)[number];

/** Markdown-authored document types (product artifacts plus the change-draft definition). */
export const markdownDocumentTypes = [...productArtifactTypes, 'product-change'] as const;

export type MarkdownDocumentType = (typeof markdownDocumentTypes)[number];

export const idPrefixByType: Record<MarkdownDocumentType, string> = {
  actor: 'ACT',
  journey: 'JRN',
  'use-case': 'UC',
  'business-rule': 'BR',
  'domain-term': 'TERM',
  'bounded-context': 'BC',
  'functional-requirement': 'FR',
  'quality-requirement': 'QR',
  constraint: 'CON',
  'product-change': 'CHG',
};

export const requiredBodySections: Record<MarkdownDocumentType, string[]> = {
  actor: ['Purpose', 'Goals', 'Responsibilities', 'Boundaries'],
  journey: [
    'Intended Outcome',
    'Entry Conditions',
    'Journey Narrative',
    'Variants and Branches',
    'Completion Conditions',
  ],
  'use-case': [
    'Goal',
    'Trigger',
    'Preconditions',
    'Main Flow',
    'Alternative Flows',
    'Failure Conditions',
    'Postconditions',
  ],
  'business-rule': ['Rule', 'Rationale', 'Examples', 'Exceptions'],
  'domain-term': ['Definition', 'Distinguish From', 'Usage'],
  'bounded-context': ['Responsibility', 'Language', 'Boundaries', 'External Relationships'],
  'functional-requirement': ['Requirement', 'Rationale', 'Acceptance Scenarios'],
  'quality-requirement': ['Requirement', 'Measurement', 'Verification'],
  constraint: ['Constraint', 'Rationale', 'Consequences'],
  'product-change': [
    'Intent',
    'Affected Artifacts',
    'Open Questions',
    'Out of Scope',
  ],
};

export function isMarkdownDocumentType(value: unknown): value is MarkdownDocumentType {
  return typeof value === 'string' && (markdownDocumentTypes as readonly string[]).includes(value);
}

/** Where each artifact type lives inside the model directory. */
export const modelSubdirByType: Record<string, string> = {
  actor: 'actors',
  journey: 'journeys',
  'use-case': 'use-cases',
  'business-rule': 'business-rules',
  'domain-term': 'domain/terms',
  'bounded-context': 'domain/bounded-contexts',
  'functional-requirement': 'requirements/functional',
  'quality-requirement': 'requirements/quality',
  constraint: 'requirements/constraints',
};

/**
 * The file name an artifact with this ID must have. Single source of truth for the
 * PRODUCT101 warning and for `prodshape fix --filenames`, so the check and the fix
 * cannot disagree.
 */
export function expectedFileName(id: string): string {
  return `${id.toLowerCase()}.md`;
}

export interface ParsedArtifact {
  file: string;
  frontmatter: Record<string, unknown>;
  body: string;
}
