/**
 * The framework-neutral SDD consumer contract (spec issue product-definition-as-code/spec#41).
 *
 * An SDD integration provider knows how a particular spec-driven-development framework lays out
 * its native consumer documents; this module knows nothing about any framework. The provider
 * enumerates the expected current consumer-document population, and this module classifies each
 * document into exactly one effective scope state:
 *
 * - `bound`: the document declares a Product Definition dependency and carries citations.
 * - `exempt`: a human explicitly declared the document has no product-semantic dependency,
 *   with a non-empty human-authored reason.
 * - `unclassified`: no explicit declaration — a failure.
 *
 * Binding and exemption are explicit human declarations, exactly one per current document.
 * A citation alone is not a declaration, so it never implicitly binds, and exemption is never
 * inferred from missing citations, file names, generated content or AI assessment. Enumerating
 * the population is what stops a verifier from passing vacuously: zero discovered citations over
 * enumerated documents is a set of failures, not a success.
 *
 * Diagnostics: PRODUCT064 (unclassified document), PRODUCT065 (bound document with zero
 * citations), PRODUCT066 (invalid exemption).
 */
import { readFile } from 'node:fs/promises';
import { parseCitations } from './citations.js';
import type { CitationRecord } from './citations.js';
import type { Diagnostic } from './diagnostics.js';
import { codes } from './diagnostics.js';

/** A consumer document enumerated by an SDD integration provider. */
export interface ConsumerDocument {
  /** Repository-relative path (POSIX separators). */
  path: string;
  /** Absolute path. */
  absolutePath: string;
  /** The provider work unit this document belongs to (e.g. an OpenSpec change name). */
  change?: string;
  /** Whether this document belongs to archived or historical material. */
  archived: boolean;
  /** The provider's artifact kind for this document (e.g. proposal, specs, design, tasks). */
  artifactKind?: string;
}

/** Options for enumerating an SDD provider's consumer-document population. */
export interface EnumerateConsumerDocumentsOptions {
  /** Include archived or historical documents (default false). */
  includeArchived?: boolean;
  /** Limit enumeration to one provider work unit (e.g. one OpenSpec change). */
  change?: string;
}

/** The result of enumerating a provider's consumer-document population. */
export interface ConsumerDocumentEnumeration {
  /** Every enumerated document, current material first unless `includeArchived` reorders it. */
  documents: ConsumerDocument[];
  /** The provider workspace root, repository-relative (POSIX separators). */
  root: string;
  /** Whether archived material was included. */
  includeArchived: boolean;
  /**
   * Diagnostics raised during enumeration itself (e.g. the provider's native enumerator is
   * unavailable and a filesystem fallback was used). These gate verification like any other.
   */
  diagnostics: Diagnostic[];
}

/**
 * The reusable SDD integration-provider contract. One implementation exists per SDD framework
 * (OpenSpec first); the core package never learns framework paths or lifecycle concepts.
 */
export interface SddIntegrationProvider {
  /** Provider identifier as used by `prodshape citations verify --provider <name>`. */
  readonly name: string;
  /** Integration version, reported by population-aware verification alongside the identity. */
  readonly version: string;
  /** Whether the provider's native workspace exists at the repository root. */
  detectWorkspace(repoRoot: string): Promise<boolean>;
  /**
   * Enumerate the expected current native consumer documents, distinguishing current work from
   * archived or historical documents. Archived documents are excluded unless requested.
   */
  enumerateDocuments(
    repoRoot: string,
    options?: EnumerateConsumerDocumentsOptions,
  ): Promise<ConsumerDocumentEnumeration>;
}

/** The three effective scope states of an enumerated consumer document. */
export type ConsumerScopeState = 'bound' | 'exempt' | 'unclassified';

/** The scope-declaration values a human may write in a consumer document. */
export type ScopeDeclarationValue = 'none' | 'cited';

/** A scope declaration found in a consumer document. */
export interface ScopeDeclaration {
  /** The raw declared value as written. */
  raw: string;
  /** The recognized value, or null when the declaration is invalid. */
  value: ScopeDeclarationValue | null;
  /** The human-authored exemption reason, or null when none was written. */
  reason: string | null;
  /** The document path the declaration was found in. */
  source: string;
}

/** Match `pdac-scope: <value>` with an optional exemption reason as an HTML comment. */
const SCOPE_COMMENT_PATTERN = /<!--\s*pdac-scope:\s*(\S+)(?:\s+reason="([^"]*)")?\s*-->/;

/**
 * Scan a consumer document for a `pdac-scope` declaration, in YAML frontmatter
 * (`pdac-scope: none` with `pdac-scope-reason: <text>`) or as an HTML comment
 * (`<!-- pdac-scope: none reason="<text>" -->`).
 *
 * Returns `null` when no declaration is present. A declaration with an unrecognized value is
 * returned with `value: null` so classification can name the bad value instead of silently
 * treating the document as undeclared.
 */
export function extractScopeDeclaration(content: string, source: string): ScopeDeclaration | null {
  const recognize = (raw: string): ScopeDeclarationValue | null =>
    raw === 'none' || raw === 'cited' ? raw : null;

  // YAML frontmatter: a leading `---` block containing a `pdac-scope:` key.
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (frontmatterMatch?.[1]) {
    const lines = frontmatterMatch[1].split('\n');
    const fmLine = lines.find((l) => /^\s*pdac-scope\s*:\s*\S+/.test(l));
    if (fmLine) {
      const raw = fmLine.replace(/^\s*pdac-scope\s*:\s*/, '').trim();
      const reasonLine = lines.find((l) => /^\s*pdac-scope-reason\s*:\s*\S+/.test(l));
      const reason = reasonLine
        ? reasonLine
            .replace(/^\s*pdac-scope-reason\s*:\s*/, '')
            .trim()
            .replace(/^['"]|['"]$/g, '')
        : '';
      return { raw, value: recognize(raw), reason: reason.length > 0 ? reason : null, source };
    }
  }

  const comment = content.match(SCOPE_COMMENT_PATTERN);
  if (comment?.[1]) {
    const raw = comment[1];
    const reason = comment[2]?.trim() ?? '';
    return { raw, value: recognize(raw), reason: reason.length > 0 ? reason : null, source };
  }

  return null;
}

/** One enumerated consumer document with its effective scope state and evidence. */
export interface ClassifiedConsumerDocument {
  document: ConsumerDocument;
  /** Exactly one effective state per document. */
  state: ConsumerScopeState;
  /** The human declaration found in the document, or null when none is present. */
  declaration: ScopeDeclaration | null;
  /** The citation records parsed from the document (and its adjacent sidecar). */
  citations: CitationRecord[];
  /** Scope diagnostics for this document (empty when the state gate passes). */
  diagnostics: Diagnostic[];
  /** Carrier diagnostics (PRODUCT067) from parsing this document's citations. */
  carrierDiagnostics: Diagnostic[];
  /** True when a carrier conflict suppresses this document's citation statuses. */
  suppressed: boolean;
}

/**
 * Classify one consumer document from its declaration and parsed citations.
 *
 * - Every current document needs exactly one explicit declaration. No declaration, or one with
 *   an unrecognized value, leaves the document `unclassified` (PRODUCT064); citations alone
 *   never bind, so a tool cannot infer the declaration from them.
 * - An explicit `pdac-scope: none` makes the document `exempt`. An exemption carries a
 *   non-empty human-authored reason and no citations; violating either or both is one
 *   PRODUCT066 per document, never two.
 * - An explicit `pdac-scope: cited` makes the document `bound`; with zero citations it fails
 *   (PRODUCT065) rather than passing as if nothing were expected.
 */
export function classifyConsumerDocument(
  document: ConsumerDocument,
  declaration: ScopeDeclaration | null,
  citations: CitationRecord[],
): ClassifiedConsumerDocument {
  const carrierDiagnostics: Diagnostic[] = [];
  const suppressed = false;
  const diagnostics: Diagnostic[] = [];

  if (!declaration || declaration.value === null) {
    const detail = !declaration
      ? citations.length > 0
        ? `carries ${citations.length} citation(s) but no scope declaration`
        : 'has no scope declaration'
      : `declares the unrecognized pdac-scope value '${declaration.raw}'`;
    diagnostics.push({
      severity: 'error',
      code: codes.missingScopeDeclaration,
      message: `Consumer document is unclassified: it ${detail}; declare 'pdac-scope: cited' (bound) or 'pdac-scope: none' with a reason (exempt)`,
      file: document.path,
      field: 'scope',
    });
    return {
      document,
      state: 'unclassified',
      declaration,
      citations,
      diagnostics,
      carrierDiagnostics,
      suppressed,
    };
  }

  if (declaration.value === 'none') {
    const defects: string[] = [];
    if (!declaration.reason) defects.push('has no exemption reason');
    if (citations.length > 0) defects.push(`carries ${citations.length} citation(s)`);
    if (defects.length > 0) {
      // One PRODUCT066 per invalid exempt document, even when both conditions hold at once.
      diagnostics.push({
        severity: 'error',
        code: codes.invalidScopeDeclaration,
        message: `Invalid exemption: the document ${defects.join(' and ')}; an exemption carries a non-empty human-authored reason and no citations`,
        file: document.path,
        field: 'scope',
      });
    }
    return {
      document,
      state: 'exempt',
      declaration,
      citations,
      diagnostics,
      carrierDiagnostics,
      suppressed,
    };
  }

  if (citations.length === 0) {
    diagnostics.push({
      severity: 'error',
      code: codes.emptyBoundDocument,
      message: `Document declares 'pdac-scope: cited' but carries no citations; a bound document must cite the canonical text it depends on`,
      file: document.path,
      field: 'scope',
    });
  }
  return {
    document,
    state: 'bound',
    declaration,
    citations,
    diagnostics,
    carrierDiagnostics,
    suppressed,
  };
}

/**
 * Read, parse and classify every enumerated consumer document. The provider supplies the
 * population; this classification is framework-blind.
 */
export async function classifyConsumerDocuments(
  documents: ConsumerDocument[],
  repoRoot: string,
): Promise<ClassifiedConsumerDocument[]> {
  const classified: ClassifiedConsumerDocument[] = [];
  for (const document of documents) {
    const content = await readFile(document.absolutePath, 'utf8');
    const declaration = extractScopeDeclaration(content, document.path);
    const parsed = await parseCitations(document.absolutePath, repoRoot);
    classified.push({
      ...classifyConsumerDocument(document, declaration, parsed.records),
      carrierDiagnostics: parsed.diagnostics,
      suppressed: parsed.suppressed,
    });
  }
  return classified;
}
