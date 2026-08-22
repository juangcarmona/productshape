/**
 * The citation contract (spec/citation-contract.md).
 *
 * A citation is a machine-verifiable reference from a consumer document (an SDD spec, a task,
 * an agent prompt file, a design doc) to canonical product text. It records the target
 * artifact `id`, a content `digest`, and an optional `anchor` (a verification scenario id).
 *
 * This module parses citations in three forms, resolves them against a loaded product model,
 * recomputes digests, and reports one status per citation: `current`, `stale`, `tampered` or
 * `unresolved`.
 *
 * Diagnostics: PRODUCT042 (invalid digest), PRODUCT060 (unresolved), PRODUCT061 (stale),
 * PRODUCT062 (tampered), PRODUCT063 (anchor not found).
 */
import { readFile } from 'node:fs/promises';
import { relative, sep } from 'node:path';
import fg from 'fast-glob';
import { parseAllDocuments } from 'yaml';
import { contentDigest, normalizeToLf } from './digest.js';
import type { Diagnostic } from './diagnostics.js';
import { codes, compareCodeUnits } from './diagnostics.js';
import type { LoadedArtifact } from './model.js';

/** The four citation statuses, per the citation contract. */
export type CitationStatus = 'current' | 'stale' | 'tampered' | 'unresolved';

/** A parsed citation record, independent of the form it was found in. */
export interface CitationRecord {
  /** Target artifact stable ID (e.g. `FR-X`). */
  id: string;
  /** Recorded content digest of the cited canonical text (`sha256:<hex>`). */
  digest: string;
  /** Optional anchor: a verification scenario id within the target artifact. */
  anchor?: string;
  /** Repository-relative path of the consumer document containing this citation. */
  source: string;
  /** 1-based line number in the source document where the citation was found. */
  line: number;
  /** The form the citation was found in. */
  form: 'inline' | 'marker-block' | 'sidecar-ledger';
  /**
   * For marker-block citations only: the embedded text between the markers (if any).
   * Used to detect tampering (PRODUCT062).
   */
  embeddedText?: string;
}

/** The result of verifying one citation against the loaded model. */
export interface CitationVerification {
  citation: CitationRecord;
  status: CitationStatus;
  /** Diagnostics for this citation (empty when `current`). */
  diagnostics: Diagnostic[];
}

/** A digest pattern for quick validation. */
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;

// --- Markdown marker-block parsing -------------------------------------------

/**
 * Marker-block citations are HTML comment delimiters carrying the citation record,
 * optionally wrapping an embedded projection of the canonical text:
 *
 * ```md
 * <!-- pdac:cite id="FR-X" digest="sha256:..." anchor="S1" -->
 * embedded canonical text here
 * <!-- /pdac:cite -->
 * ```
 */
const MARKER_OPEN = /<!--\s*pdac:cite\s+([^>]*?)\s*-->/g;
const MARKER_CLOSE = /<!--\s*\/pdac:cite\s*-->/g;

interface ParsedAttributes {
  id?: string;
  digest?: string;
  anchor?: string;
}

/** Parse the `key="value"` attributes from a marker-open comment. */
function parseAttributes(attrString: string): ParsedAttributes {
  const attrs: ParsedAttributes = {};
  const pattern = /(\w+)="([^"]*)"/g;
  for (const match of attrString.matchAll(pattern)) {
    const key = match[1];
    const value = match[2];
    if (key === 'id' || key === 'digest' || key === 'anchor') {
      attrs[key] = value;
    }
  }
  return attrs;
}

/** Extract marker-block citations from a Markdown document. */
function extractMarkerBlockCitations(content: string, source: string): CitationRecord[] {
  const records: CitationRecord[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    MARKER_OPEN.lastIndex = 0;
    const match = MARKER_OPEN.exec(line);
    if (!match) continue;
    const attrString = match[1];
    if (attrString === undefined) continue;

    const attrs = parseAttributes(attrString);
    const { id, digest } = attrs;
    if (!id || !digest) continue;

    let embeddedText: string | undefined;
    for (let j = i + 1; j < lines.length; j++) {
      const closeLine = lines[j];
      if (closeLine === undefined) continue;
      MARKER_CLOSE.lastIndex = 0;
      if (MARKER_CLOSE.test(closeLine)) {
        if (j > i + 1) {
          embeddedText = lines.slice(i + 1, j).join('\n');
        }
        break;
      }
    }

    records.push({
      id,
      digest,
      anchor: attrs.anchor,
      source,
      line: i + 1,
      form: 'marker-block',
      embeddedText,
    });
  }
  return records;
}

// --- Inline structured-reference parsing -------------------------------------

/**
 * Inline structured references are YAML-like maps on a single line, prefixed with a marker
 * so they are distinguishable from prose:
 *
 * ```md
 * {pdac:cite id="FR-X" digest="sha256:..." anchor="S1"}
 * ```
 *
 * This form is for citations that do not embed canonical text.
 */
const INLINE_PATTERN = /\{pdac:cite\s+([^}]*?)\}/g;

function extractInlineCitations(content: string, source: string): CitationRecord[] {
  const records: CitationRecord[] = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    INLINE_PATTERN.lastIndex = 0;
    for (const match of line.matchAll(INLINE_PATTERN)) {
      const attrString = match[1];
      if (attrString === undefined) continue;
      const attrs = parseAttributes(attrString);
      const { id, digest } = attrs;
      if (!id || !digest) continue;
      records.push({
        id,
        digest,
        anchor: attrs.anchor,
        source,
        line: i + 1,
        form: 'inline',
      });
    }
  }
  return records;
}

// --- YAML sidecar ledger parsing ---------------------------------------------

/**
 * Sidecar-ledger citations live in a YAML file (conventionally `citations.yaml`) alongside
 * the consumer document. Until the specification normalizes one serialization, the ledger may
 * be either a bare array of citation records or a mapping whose `citations` property is that
 * array:
 *
 * Bare array:
 *
 * ```yaml
 * - id: FR-X
 *   digest: sha256:...
 *   anchor: S1
 * ```
 *
 * Mapping:
 *
 * ```yaml
 * citations:
 *   - id: FR-X
 *     digest: sha256:...
 *     anchor: S1
 * ```
 */
function extractSidecarCitations(content: string, source: string): CitationRecord[] {
  const docs = parseAllDocuments(content);
  const records: CitationRecord[] = [];
  for (const doc of docs) {
    const data = doc.toJS();
    let entries: unknown[];
    if (Array.isArray(data)) {
      entries = data;
    } else if (typeof data === 'object' && data !== null) {
      const mappedCitations = (data as Record<string, unknown>).citations;
      if (!Array.isArray(mappedCitations)) continue;
      entries = mappedCitations;
    } else {
      continue;
    }
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (typeof entry !== 'object' || entry === null) continue;
      const id = (entry as Record<string, unknown>).id;
      const digest = (entry as Record<string, unknown>).digest;
      const anchor = (entry as Record<string, unknown>).anchor;
      if (typeof id !== 'string' || typeof digest !== 'string') continue;
      records.push({
        id,
        digest,
        anchor: typeof anchor === 'string' ? anchor : undefined,
        source,
        line: i + 1,
        form: 'sidecar-ledger',
      });
    }
  }
  return records;
}

// --- Scanning consumer documents --------------------------------------------

/** Discover consumer documents that may contain citations. */
export async function discoverConsumerDocs(rootDir: string): Promise<string[]> {
  const entries = await fg('**/*.{md,yaml,yml}', {
    cwd: rootDir,
    absolute: true,
    dot: false,
    ignore: ['**/node_modules/**'],
  });
  return entries.map((e) => e.split('/').join(sep)).sort();
}

/** Parse all citation records from a single consumer document. */
export async function parseCitations(
  absolutePath: string,
  repoRoot: string,
): Promise<CitationRecord[]> {
  const source = relative(repoRoot, absolutePath).split(sep).join('/');
  const content = await readFile(absolutePath, 'utf8');

  const records: CitationRecord[] = [];

  if (absolutePath.endsWith('.yaml') || absolutePath.endsWith('.yml')) {
    // A YAML file is either a sidecar ledger or a consumer doc with inline citations.
    // Try sidecar first (structured array); if that yields nothing, try inline (rare in YAML).
    const sidecar = extractSidecarCitations(content, source);
    if (sidecar.length > 0) {
      records.push(...sidecar);
    }
  }

  // Markdown and YAML files can both carry inline and marker-block citations.
  records.push(...extractInlineCitations(content, source));
  records.push(...extractMarkerBlockCitations(content, source));

  return records;
}

/** Scan a directory tree for consumer documents and parse all citations. */
export async function scanCitations(rootDir: string, repoRoot: string): Promise<CitationRecord[]> {
  const docs = await discoverConsumerDocs(rootDir);
  const allRecords: CitationRecord[] = [];
  for (const doc of docs) {
    allRecords.push(...(await parseCitations(doc, repoRoot)));
  }
  return allRecords;
}

// --- Verification ------------------------------------------------------------

/** Build a lookup of artifact ID → loaded artifact for citation resolution. */
export function buildArtifactIndex(artifacts: LoadedArtifact[]): Map<string, LoadedArtifact> {
  return new Map(artifacts.filter((a) => a.id).map((a) => [a.id as string, a]));
}

/**
 * Resolve a verification scenario anchor within an artifact's `verification[]` array.
 * Returns the matching scenario entry, or undefined when the anchor does not resolve.
 */
function resolveAnchor(
  artifact: LoadedArtifact,
  anchor: string,
): Record<string, unknown> | undefined {
  const verification = artifact.frontmatter.verification;
  if (!Array.isArray(verification)) return undefined;
  for (const entry of verification) {
    if (typeof entry !== 'object' || entry === null) continue;
    const scenarioId = (entry as Record<string, unknown>).id;
    if (typeof scenarioId === 'string' && scenarioId === anchor) {
      return entry as Record<string, unknown>;
    }
  }
  return undefined;
}

/**
 * Verify one citation against the loaded model. Computes exactly one status and emits
 * the appropriate diagnostics.
 */
export function verifyCitation(
  citation: CitationRecord,
  artifactIndex: Map<string, LoadedArtifact>,
): CitationVerification {
  const diagnostics: Diagnostic[] = [];

  // PRODUCT042: invalid digest format.
  if (!DIGEST_PATTERN.test(citation.digest)) {
    diagnostics.push({
      severity: 'error',
      code: codes.invalidCitationDigest,
      message: `Citation of '${citation.id}' has an invalid digest '${citation.digest}'`,
      file: citation.source,
      artifact: citation.id,
      field: 'digest',
    });
    return { citation, status: 'unresolved', diagnostics };
  }

  // PRODUCT060: unresolved — target id does not resolve.
  const artifact = artifactIndex.get(citation.id);
  if (!artifact) {
    diagnostics.push({
      severity: 'error',
      code: codes.unresolvedCitation,
      message: `Citation target '${citation.id}' does not resolve`,
      file: citation.source,
      artifact: citation.id,
    });
    return { citation, status: 'unresolved', diagnostics };
  }

  // PRODUCT063: anchor not found.
  if (citation.anchor !== undefined) {
    const scenario = resolveAnchor(artifact, citation.anchor);
    if (!scenario) {
      diagnostics.push({
        severity: 'error',
        code: codes.citationAnchorNotFound,
        message: `Anchor '${citation.anchor}' not found in '${citation.id}'`,
        file: citation.source,
        artifact: citation.id,
        field: 'anchor',
      });
      return { citation, status: 'unresolved', diagnostics };
    }
  }

  // PRODUCT062: tampered embedded projection.
  // The embedded text must be byte-identical to the canonical content at the recorded digest.
  // Faithfulness is judged against the recorded digest alone, never against the target's
  // current content, so a tampered embedding is reported even when the canonical text has
  // also moved since the citation was recorded (precedence: tampered before stale).
  if (citation.form === 'marker-block' && citation.embeddedText !== undefined) {
    const embeddedDigest = contentDigest(normalizeToLf(citation.embeddedText));
    if (embeddedDigest !== citation.digest) {
      diagnostics.push({
        severity: 'error',
        code: codes.tamperedCitation,
        message: `Embedded projection of '${citation.id}' differs from canonical content at the recorded digest`,
        file: citation.source,
        artifact: citation.id,
      });
      return { citation, status: 'tampered', diagnostics };
    }
  }

  // PRODUCT061: stale — target resolves but canonical content changed.
  if (artifact.digest !== citation.digest) {
    diagnostics.push({
      severity: 'warning',
      code: codes.staleCitation,
      message: `Citation of '${citation.id}' is stale: canonical content changed since the citation was recorded`,
      file: citation.source,
      artifact: citation.id,
    });
    return { citation, status: 'stale', diagnostics };
  }

  return { citation, status: 'current', diagnostics };
}

// --- Citation index and the affected citation set -----------------------------

/**
 * Group citation records by target artifact ID: the citation index of Change impact
 * (product-changes.md), which apply intersects with the product diff (RFC 0048).
 * Records keep their scan order within each group.
 */
export function buildCitationIndex(citations: CitationRecord[]): Map<string, CitationRecord[]> {
  const index = new Map<string, CitationRecord[]>();
  for (const citation of citations) {
    const group = index.get(citation.id);
    if (group) group.push(citation);
    else index.set(citation.id, [citation]);
  }
  return index;
}

/** One citation whose target artifact the product diff reports as changed. */
export interface AffectedCitation {
  citation: CitationRecord;
  /**
   * The status the citation will hold against the applied result, under the same precedence
   * verification applies. A forecast of the consumer's state, not a diagnostic: at apply time
   * nothing is wrong yet, so no diagnostic accompanies it (RFC 0048).
   */
  prospectiveStatus: CitationStatus;
}

/**
 * The affected citation set (RFC 0048): every citation whose target artifact appears in the
 * product diff, with the status it will hold against the applied result.
 *
 * `changedIds` are the artifact IDs the diff reports as added, modified or removed; the impact
 * is derived from the effective change, never from declared operations, so a declared operation
 * that changes nothing affects nothing. `appliedArtifacts` is the applied result the prospective
 * status is computed against — a citation of a removed artifact forecasts `unresolved`, of a
 * modified one typically `stale`.
 *
 * Ordered by consumer path, point of use, target ID and anchor, with the locale-independent
 * comparator diagnostic ordering uses, so the report is byte-identical across platforms.
 */
export function computeAffectedCitations(
  citations: CitationRecord[],
  changedIds: Iterable<string>,
  appliedArtifacts: LoadedArtifact[],
): AffectedCitation[] {
  const index = buildCitationIndex(citations);
  const appliedIndex = buildArtifactIndex(appliedArtifacts);
  const affected: AffectedCitation[] = [];
  for (const id of new Set(changedIds)) {
    for (const citation of index.get(id) ?? []) {
      affected.push({
        citation,
        prospectiveStatus: verifyCitation(citation, appliedIndex).status,
      });
    }
  }
  return affected.sort(
    (a, b) =>
      compareCodeUnits(a.citation.source, b.citation.source) ||
      a.citation.line - b.citation.line ||
      compareCodeUnits(a.citation.id, b.citation.id) ||
      compareCodeUnits(a.citation.anchor ?? '', b.citation.anchor ?? ''),
  );
}

/** Verify a set of citations against the loaded model. */
export function verifyCitations(
  citations: CitationRecord[],
  artifacts: LoadedArtifact[],
): CitationVerification[] {
  const index = buildArtifactIndex(artifacts);
  return citations.map((c) => verifyCitation(c, index));
}

// --- Cite (emit) ------------------------------------------------------------

/** Options for emitting a citation record. */
export interface CiteOptions {
  id: string;
  digest: string;
  anchor?: string;
  form: 'inline' | 'marker-block' | 'sidecar-ledger';
}

/** Emit a citation record in the requested form. */
export function emitCitation(options: CiteOptions): string {
  const attrs = [`id="${options.id}"`, `digest="${options.digest}"`];
  if (options.anchor) attrs.push(`anchor="${options.anchor}"`);
  const attrString = attrs.join(' ');

  switch (options.form) {
    case 'inline':
      return `{pdac:cite ${attrString}}`;
    case 'marker-block':
      return `<!-- pdac:cite ${attrString} -->\n<!-- /pdac:cite -->`;
    case 'sidecar-ledger':
      return `- id: ${options.id}\n  digest: ${options.digest}${options.anchor ? `\n  anchor: ${options.anchor}` : ''}`;
  }
}
