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
  'structured-behaviour',
] as const;

export type ProductArtifactType = (typeof productArtifactTypes)[number];

/** Markdown-authored document types (product artifacts plus the Product Change definition). */
export const markdownDocumentTypes = [...productArtifactTypes, 'product-change'] as const;

export type MarkdownDocumentType = (typeof markdownDocumentTypes)[number];

/** The ID prefix of each Markdown document type, without the trailing hyphen. */
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
  'structured-behaviour': 'SB',
  'product-change': 'CHG',
};

/**
 * Matches the ID of any product artifact kind (never a Product Change). Derived from
 * {@link idPrefixByType} so a new artifact kind can never be forgotten here, the way `SB` was
 * when this pattern lived as a literal (issue #206).
 */
export const productArtifactIdPattern = new RegExp(
  `^(${productArtifactTypes.map((type) => idPrefixByType[type]).join('|')})-[A-Z0-9]+(-[A-Z0-9]+)*$`,
);

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
  'functional-requirement': ['Requirement', 'Rationale'],
  'quality-requirement': ['Requirement', 'Measurement'],
  constraint: ['Constraint', 'Rationale', 'Consequences'],
  'structured-behaviour': ['Intent', 'Boundaries'],
  'product-change': [
    'Problem',
    'Intended Product Outcome',
    'Rationale',
    'Affected Product Areas',
    'Open Questions',
    'Product Acceptance',
    'Out of Scope',
  ],
};

export function isProductArtifactType(value: unknown): value is ProductArtifactType {
  return typeof value === 'string' && (productArtifactTypes as readonly string[]).includes(value);
}

export function isMarkdownDocumentType(value: unknown): value is MarkdownDocumentType {
  return typeof value === 'string' && (markdownDocumentTypes as readonly string[]).includes(value);
}

/**
 * The ID prefix for a document kind, or `undefined` when the kind is not a Markdown document.
 *
 * The lookup for callers that hold a wider type than `MarkdownDocumentType`: they neither cast nor
 * fall back to an empty string.
 */
export function idPrefixFor(kind: string): string | undefined {
  return isMarkdownDocumentType(kind) ? idPrefixByType[kind] : undefined;
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
  'structured-behaviour': 'behaviours',
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
