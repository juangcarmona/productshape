export type DiagnosticSeverity = 'error' | 'warning';

export interface Diagnostic {
  severity: DiagnosticSeverity;
  code: string;
  message: string;
  /** Repository-relative source file, POSIX separators. */
  file: string;
  /** ID of the Product Artifact the diagnostic is about; never a Product Change or unresolved ID. */
  artifact?: string;
  /** ID of the Product Change the diagnostic is about. */
  change?: string;
  field?: string;
  /** Referenced, operated-on or cited ID exactly as authored, whether or not it resolves. */
  target?: string;
  /** One-based consumer-file line carrying a citation payload. */
  line?: number;
  /** One-based citation entry within a sidecar's `citations` sequence. */
  entry?: number;
}

/**
 * Stable diagnostic codes. The user-facing contract is the table in
 * docs/specification/validation.md; the two must change together.
 */
export const codes = {
  invalidFrontmatter: 'PRODUCT001',
  schemaViolation: 'PRODUCT002',
  unknownArtifactType: 'PRODUCT003',
  idPrefixMismatch: 'PRODUCT004',
  duplicateId: 'PRODUCT005',
  unknownReference: 'PRODUCT006',
  disallowedTargetType: 'PRODUCT007',
  activeReferencesRetired: 'PRODUCT008',
  missingBodySection: 'PRODUCT009',
  additionAlreadyExists: 'PRODUCT020',
  modificationTargetMissing: 'PRODUCT021',
  removalTargetMissing: 'PRODUCT022',
  overlayDuplicateId: 'PRODUCT023',
  removalLeavesDanglingReference: 'PRODUCT024',
  concurrentChangeOverlap: 'PRODUCT025',
  operationProposedMismatch: 'PRODUCT026',
  baselineRevisionIncompatible: 'PRODUCT027',
  applyStatusNotApproved: 'PRODUCT028',
  invalidCitationDigest: 'PRODUCT042',
  unresolvedCitation: 'PRODUCT060',
  staleCitation: 'PRODUCT061',
  tamperedCitation: 'PRODUCT062',
  citationAnchorNotFound: 'PRODUCT063',
  missingScopeDeclaration: 'PRODUCT064',
  unsupportedOpenSpecStore: 'PRODUCT067',
  openSpecRootUnresolved: 'PRODUCT068',
  openSpecCliMissing: 'PRODUCT069',
  emptyBoundDocument: 'PRODUCT065',
  invalidScopeDeclaration: 'PRODUCT066',
  approvedWithOpenQuestions: 'PRODUCT108',
  lowConfidenceDraft: 'PRODUCT111',
} as const;

/**
 * The diagnostics that make a command fail: every error, plus every warning when the repository
 * escalates warnings to a failing result. One semantic for every validating command: baseline
 * validate, change validate, apply and graph generation all gate on this set.
 *
 * `validation.warnings-as-errors` changes the command result only. The emitted severity stays
 * `warning`, so a machine-readable report carries the same diagnostics with the option on or off;
 * the configuration contract forbids rewriting severity.
 */
export function blockingDiagnostics(
  diagnostics: Diagnostic[],
  warningsAsErrors: boolean,
): Diagnostic[] {
  return diagnostics.filter((d) => d.severity === 'error' || warningsAsErrors);
}

/** Compare strings lexicographically by UTF-16 code unit, independent of locale and ICU data. */
export function compareCodeUnits(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

/** Compare optional one-based positions numerically, absent before present. */
function compareOptionalNumbers(left: number | undefined, right: number | undefined): number {
  if (left === undefined) return right === undefined ? 0 : -1;
  if (right === undefined) return 1;
  return left - right;
}

/**
 * Deterministic ordering: by `file`, then `line` (absent before present), then `entry` (absent
 * before present), then `code`, `field`, `target`, `artifact` and `change`, comparing absent
 * strings as empty strings. Numeric fields sort numerically.
 */
export function sortDiagnostics(diagnostics: Diagnostic[]): Diagnostic[] {
  return [...diagnostics].sort(
    (a, b) =>
      compareCodeUnits(a.file ?? '', b.file ?? '') ||
      compareOptionalNumbers(a.line, b.line) ||
      compareOptionalNumbers(a.entry, b.entry) ||
      compareCodeUnits(a.code, b.code) ||
      compareCodeUnits(a.field ?? '', b.field ?? '') ||
      compareCodeUnits(a.target ?? '', b.target ?? '') ||
      compareCodeUnits(a.artifact ?? '', b.artifact ?? '') ||
      compareCodeUnits(a.change ?? '', b.change ?? ''),
  );
}
