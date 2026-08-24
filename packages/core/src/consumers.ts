/**
 * The framework-neutral SDD consumer contract (spec issue product-definition-as-code/spec#41).
 *
 * An SDD integration provider knows how a particular spec-driven-development framework lays out
 * its native consumer documents; this module knows nothing about any framework. The provider
 * enumerates the expected current consumer-document population, and this module classifies each
 * document into exactly one effective scope state:
 *
 * - `bound`: the document declares a Product Definition dependency and carries citations.
 * - `exempt`: a human explicitly declared the document has no product-semantic dependency.
 * - `unclassified`: neither binding nor exemption is declared — a failure.
 *
 * Binding and exemption are human declarations. A citation placed in the document is the binding
 * declaration; exemption is never inferred from missing citations. Enumerating the population is
 * what stops a verifier from passing vacuously: zero discovered citations over enumerated
 * documents is a set of failures, not a success.
 *
 * Diagnostics: PRODUCT064 (unclassified document), PRODUCT065 (bound document with zero
 * citations), PRODUCT066 (invalid scope declaration).
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
  /** The document path the declaration was found in. */
  source: string;
}

/** Match `pdac-scope: <value>` as an HTML comment anywhere in the document. */
const SCOPE_COMMENT_PATTERN = /<!--\s*pdac-scope:\s*(\S+)\s*-->/;

/**
 * Scan a consumer document for a `pdac-scope` declaration, in YAML frontmatter
 * (`pdac-scope: none`) or as an HTML comment (`<!-- pdac-scope: none -->`).
 *
 * Returns `null` when no declaration is present. A declaration with an unrecognized value is
 * returned with `value: null` so classification can report it (PRODUCT066) instead of silently
 * treating the document as undeclared.
 */
export function extractScopeDeclaration(content: string, source: string): ScopeDeclaration | null {
  // YAML frontmatter: a leading `---` block containing a `pdac-scope:` key.
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (frontmatterMatch?.[1]) {
    const fmLine = frontmatterMatch[1].split('\n').find((l) => /^\s*pdac-scope\s*:\s*\S+/.test(l));
    if (fmLine) {
      const raw = fmLine.replace(/^\s*pdac-scope\s*:\s*/, '').trim();
      return { raw, value: raw === 'none' || raw === 'cited' ? raw : null, source };
    }
  }

  const comment = content.match(SCOPE_COMMENT_PATTERN);
  if (comment?.[1]) {
    const raw = comment[1];
    return { raw, value: raw === 'none' || raw === 'cited' ? raw : null, source };
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
  /** The citation records parsed from the document. */
  citations: CitationRecord[];
  /** Scope diagnostics for this document (empty when the state gate passes). */
  diagnostics: Diagnostic[];
}

/**
 * Classify one consumer document from its declaration and parsed citations.
 *
 * - An explicit `pdac-scope: none` makes the document `exempt`; if it nevertheless carries
 *   citations the exemption is invalid (PRODUCT066) — a human must resolve the contradiction.
 * - An explicit `pdac-scope: cited` makes the document `bound`; with zero citations it fails
 *   (PRODUCT065) rather than passing as if nothing were expected.
 * - Without a declaration, at least one citation binds the document (the citation itself is the
 *   human's dependency declaration); zero citations leave it `unclassified` (PRODUCT064).
 * - An unrecognized `pdac-scope` value is reported (PRODUCT066) and classifies nothing.
 */
export function classifyConsumerDocument(
  document: ConsumerDocument,
  declaration: ScopeDeclaration | null,
  citations: CitationRecord[],
): ClassifiedConsumerDocument {
  const diagnostics: Diagnostic[] = [];

  if (declaration && declaration.value === null) {
    diagnostics.push({
      severity: 'error',
      code: codes.invalidScopeDeclaration,
      message: `Invalid pdac-scope value '${declaration.raw}': expected 'none' (exempt) or 'cited' (bound)`,
      file: document.path,
      field: 'scope',
    });
    return { document, state: 'unclassified', declaration, citations, diagnostics };
  }

  if (declaration?.value === 'none') {
    if (citations.length > 0) {
      diagnostics.push({
        severity: 'error',
        code: codes.invalidScopeDeclaration,
        message: `Document declares 'pdac-scope: none' but carries ${citations.length} citation(s); remove the exemption or the citations`,
        file: document.path,
        field: 'scope',
      });
    }
    return { document, state: 'exempt', declaration, citations, diagnostics };
  }

  if (declaration?.value === 'cited') {
    if (citations.length === 0) {
      diagnostics.push({
        severity: 'error',
        code: codes.emptyBoundDocument,
        message: `Document declares 'pdac-scope: cited' but carries no citations; a bound document must cite the canonical text it depends on`,
        file: document.path,
        field: 'scope',
      });
    }
    return { document, state: 'bound', declaration, citations, diagnostics };
  }

  if (citations.length > 0) {
    return { document, state: 'bound', declaration, citations, diagnostics };
  }

  diagnostics.push({
    severity: 'error',
    code: codes.missingScopeDeclaration,
    message: `Consumer document is unclassified: declare 'pdac-scope: none' (exempt) or bind it with at least one PDaC citation`,
    file: document.path,
    field: 'scope',
  });
  return { document, state: 'unclassified', declaration, citations, diagnostics };
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
    const citations = await parseCitations(document.absolutePath, repoRoot);
    classified.push(classifyConsumerDocument(document, declaration, citations));
  }
  return classified;
}
