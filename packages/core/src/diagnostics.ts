export type DiagnosticSeverity = 'error' | 'warning';

export interface Diagnostic {
  severity: DiagnosticSeverity;
  code: string;
  message: string;
  /** Repository-relative source file, POSIX separators. */
  file: string;
  artifact?: string;
  field?: string;
  target?: string;
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
  invalidCitationDigest: 'PRODUCT042',
  unresolvedCitation: 'PRODUCT060',
  staleCitation: 'PRODUCT061',
  tamperedCitation: 'PRODUCT062',
  citationAnchorNotFound: 'PRODUCT063',
  lowConfidenceDraft: 'PRODUCT111',
  unknownAffectedArtifact: 'PRODUCT112',
} as const;

/**
 * Apply the repository's warnings-as-errors escalation. One semantic for every
 * validating command: baseline validate, change validate, handoff generation,
 * graph generation and promotion all gate on the escalated set.
 */
export function escalateWarnings(
  diagnostics: Diagnostic[],
  warningsAsErrors: boolean,
): Diagnostic[] {
  if (!warningsAsErrors) return diagnostics;
  return diagnostics.map((d) =>
    d.severity === 'warning' ? { ...d, severity: 'error' as const } : d,
  );
}

/** Deterministic ordering: by file, then code, then target. */
export function sortDiagnostics(diagnostics: Diagnostic[]): Diagnostic[] {
  return [...diagnostics].sort(
    (a, b) =>
      a.file.localeCompare(b.file) ||
      a.code.localeCompare(b.code) ||
      (a.target ?? '').localeCompare(b.target ?? ''),
  );
}
