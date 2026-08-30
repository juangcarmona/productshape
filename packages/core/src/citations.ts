/**
 * The citation contract (spec/citation-contract.md).
 *
 * A citation is a machine-verifiable reference from a consumer document (an SDD spec, a task,
 * an agent prompt file, a design doc) to canonical product text. It records the target
 * artifact `id`, a content `digest`, and an optional `anchor` (a verification scenario id).
 *
 * This module parses and enforces the citation carriers: the canonical comment payload with its
 * closed attribute grammar, the adjacent mapping-form sidecar validated against the normative
 * sidecar schema, and the legacy brace and bare-sequence forms as explicitly non-conforming
 * reader extensions. A consumer document uses exactly one carrier; a malformed payload candidate,
 * a malformed sidecar file, a sidecar without its consumer file, or a consumer using both
 * carriers produces PRODUCT067 instead of disappearing as prose. It then resolves citations
 * against a loaded product model and reports one status per citation: `current`, `stale`,
 * `tampered` or `unresolved`.
 *
 * Diagnostics: PRODUCT042 (invalid digest), PRODUCT060 (unresolved), PRODUCT061 (stale),
 * PRODUCT062 (tampered), PRODUCT063 (anchor not found), PRODUCT067 (malformed carrier).
 */
import { readFile, readdir } from 'node:fs/promises';
import { basename, dirname, join, relative, sep } from 'node:path';
import fg from 'fast-glob';
import { parseAllDocuments } from 'yaml';
import { productArtifactIdPattern } from './artifact.js';
import { collectForbiddenYamlFeatures } from './yaml-strict.js';
import type { YamlFeatureViolation } from './yaml-strict.js';
import { contentDigest, normalizeToLf } from './digest.js';
import type { Diagnostic } from './diagnostics.js';
import { codes, compareCodePoints } from './diagnostics.js';
import type { LoadedArtifact } from './model.js';

/** The four citation statuses, per the citation contract. */
export type CitationStatus = 'current' | 'stale' | 'tampered' | 'unresolved';

/** A parsed citation record, independent of the form it was found in. */
export interface CitationRecord {
  /** Target artifact stable ID (e.g. `FR-X`). */
  id: string;
  /** Recorded whole-artifact digest of the cited canonical text (`sha256:<hex>`). */
  digest: string;
  /** Optional anchor: a verification scenario id within the target artifact. */
  anchor?: string;
  /** Repository-relative path of the consumer document containing this citation. */
  source: string;
  /**
   * One-based point of use: the source-document line for payload forms, or the entry position
   * within the sidecar's `citations` sequence for the sidecar ledger.
   */
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

// --- Citation carriers ---------------------------------------------------------

/**
 * The closed payload attribute grammar (citation contract): `id`, `digest` and an optional
 * `anchor`, in that order, double-quoted with no escape syntax, and nothing else. Unknown,
 * repeated or out-of-order attributes are invalid.
 */
const STRICT_ATTRS = /^id="([^"\r\n]+)"[ \t]+digest="([^"\r\n]+)"(?:[ \t]+anchor="([^"\r\n]+)")?$/;

const TOKEN = 'pdac:cite';

const MARKER_CLOSE = /<!--\s*\/pdac:cite\s*-->/;

/** One PRODUCT067: a carrier defect that must not disappear as prose. */
function carrierDiagnostic(
  file: string,
  message: string,
  location: { line?: number; entry?: number; target?: string } = {},
): Diagnostic {
  return { severity: 'error', code: codes.malformedCitationCarrier, message, file, ...location };
}

/** What payload scanning found in one consumer document. */
interface PayloadScan {
  records: CitationRecord[];
  diagnostics: Diagnostic[];
}

/**
 * Scan text lines for the exact `pdac:cite` token followed by payload-like `id=` text. A valid
 * candidate becomes a record: a comment payload followed by a `<!-- /pdac:cite -->` marker embeds
 * a projection (marker block); any other valid payload is an inline record, including the legacy
 * brace form `{pdac:cite ...}`, which stays an explicitly non-conforming reader extension. A
 * malformed candidate produces PRODUCT067 rather than disappearing as prose.
 */
function extractPayloadCitations(content: string, source: string): PayloadScan {
  const records: CitationRecord[] = [];
  const diagnostics: Diagnostic[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined || !line.includes(TOKEN)) continue;

    let from = 0;
    for (;;) {
      const at = line.indexOf(TOKEN, from);
      if (at === -1) break;
      from = at + TOKEN.length;

      const before = line.slice(0, at);
      // The closing marker ('/pdac:cite', slash glued to the token) carries no payload of its
      // own; a comment wrapper like '// ' keeps its trailing space and stays a candidate.
      if (before.endsWith('/')) continue;
      const after = line.slice(at + TOKEN.length);
      // The token without payload-like text stays prose (e.g. this sentence).
      if (!/id=/.test(after)) continue;

      // Delimit the attribute text by the enclosing carrier syntax: the legacy brace form, the
      // host comment closer, or the line end.
      const braceForm = before.endsWith('{');
      let attrText = after;
      if (braceForm) {
        const close = after.indexOf('}');
        attrText = close === -1 ? after : after.slice(0, close);
      } else {
        const close = after.indexOf('-->');
        attrText = close === -1 ? after : after.slice(0, close);
      }

      const match = STRICT_ATTRS.exec(attrText.trim());
      if (!match) {
        const idGuess = /id="([^"\r\n]+)"/.exec(attrText)?.[1];
        diagnostics.push(
          carrierDiagnostic(
            source,
            'Malformed citation payload: the closed grammar is id="…" digest="…" with an optional anchor="…", in that order, double-quoted, and nothing else',
            { line: i + 1, ...(idGuess ? { target: idGuess } : {}) },
          ),
        );
        continue;
      }

      const id = match[1] as string;
      const digest = match[2] as string;
      const anchor = match[3];

      // A comment payload embeds a projection when a closing marker follows before the next
      // payload; otherwise it is a plain payload citation.
      let embeddedText: string | undefined;
      let form: CitationRecord['form'] = 'inline';
      if (!braceForm && before.includes('<!--')) {
        for (let j = i + 1; j < lines.length; j++) {
          const ahead = lines[j];
          if (ahead === undefined) continue;
          if (MARKER_CLOSE.test(ahead)) {
            form = 'marker-block';
            // The line ending immediately before the closing marker belongs to the projection.
            embeddedText = `${lines.slice(i + 1, j).join('\n')}\n`;
            break;
          }
          if (ahead.includes(TOKEN) && !MARKER_CLOSE.test(ahead)) break;
        }
      }

      records.push({
        id,
        digest,
        anchor,
        source,
        line: i + 1,
        form,
        ...(embeddedText === undefined ? {} : { embeddedText }),
      });
    }
  }

  return { records, diagnostics };
}

// --- YAML sidecar ledger parsing ---------------------------------------------

const SIDECAR_SUFFIXES = ['.citations.yml', '.citations.yaml'];

/** Whether a path names an adjacent citation sidecar (`<stem>.citations.yml`). */
export function isCitationSidecar(path: string): boolean {
  const name = basename(path);
  return SIDECAR_SUFFIXES.some((suffix) => name.endsWith(suffix) && name.length > suffix.length);
}

/** The consumer files a sidecar could belong to: `<stem>` or `<stem>.<extension>` siblings. */
async function consumerCandidatesFor(sidecarAbsolute: string): Promise<string[]> {
  const name = basename(sidecarAbsolute);
  const suffix = SIDECAR_SUFFIXES.find((candidate) => name.endsWith(candidate)) as string;
  const stem = name.slice(0, -suffix.length);
  const dir = dirname(sidecarAbsolute);
  let siblings: string[];
  try {
    siblings = await readdir(dir);
  } catch {
    return [];
  }
  return siblings
    .filter(
      (sibling) =>
        (sibling === stem || sibling.startsWith(`${stem}.`)) &&
        sibling !== name &&
        !isCitationSidecar(sibling),
    )
    .map((sibling) => join(dir, sibling));
}

/**
 * Parse and validate a sidecar ledger against the normative `citation-sidecar` schema: one YAML
 * document, exactly one top-level `citations` key holding a non-empty sequence of closed records,
 * with duplicate keys, aliases, anchors, tags and merge keys forbidden. The former bare sequence
 * remains accepted as an explicitly non-conforming reader extension. A malformed sidecar file
 * produces one PRODUCT067, never one per failed schema keyword, and contributes no records.
 */
function parseSidecarLedger(content: string, source: string): PayloadScan {
  const invalid = (message: string, entry?: number): PayloadScan => ({
    records: [],
    diagnostics: [carrierDiagnostic(source, message, entry === undefined ? {} : { entry })],
  });

  let documents;
  try {
    documents = parseAllDocuments(content);
  } catch (cause) {
    return invalid(
      `Sidecar is not valid YAML: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }
  const parseErrors = documents.flatMap((doc) => doc.errors);
  if (parseErrors.length > 0) {
    return invalid(`Sidecar is not valid YAML: ${parseErrors[0]?.message ?? 'parse error'}`);
  }
  if (documents.length !== 1) {
    return invalid('Sidecar must be exactly one YAML document');
  }
  const document = documents[0];
  const features: YamlFeatureViolation[] = [];
  if (document) collectForbiddenYamlFeatures(document.contents, '', features);
  const feature = features[0];
  if (feature) {
    const plural = feature.feature === 'alias' ? 'aliases' : `${feature.feature}s`;
    return invalid(`Sidecar must not use YAML ${plural}`);
  }

  const data: unknown = document ? document.toJS() : undefined;
  let entries: unknown[];
  if (Array.isArray(data)) {
    // The legacy bare sequence: accepted as a non-conforming reader extension.
    entries = data;
  } else if (typeof data === 'object' && data !== null) {
    const record = data as Record<string, unknown>;
    const keys = Object.keys(record);
    if (keys.length !== 1 || keys[0] !== 'citations' || !Array.isArray(record.citations)) {
      return invalid(
        "Sidecar must be a mapping with exactly one 'citations' key holding a sequence of citation records",
      );
    }
    entries = record.citations;
  } else {
    return invalid(
      "Sidecar must be a mapping with exactly one 'citations' key holding a sequence of citation records",
    );
  }
  if (entries.length === 0) {
    return invalid("Sidecar 'citations' must be a non-empty sequence");
  }

  const records: CitationRecord[] = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      return invalid(`Sidecar entry ${i + 1} is not a citation record`, i + 1);
    }
    const record = entry as Record<string, unknown>;
    const extraneous = Object.keys(record).filter(
      (key) => key !== 'id' && key !== 'digest' && key !== 'anchor',
    );
    // Value validity (digest format, id resolution) belongs to verification, which reports
    // PRODUCT042 and PRODUCT060 per record; the carrier gate checks record closure only.
    if (
      typeof record.id !== 'string' ||
      typeof record.digest !== 'string' ||
      (record.anchor !== undefined && typeof record.anchor !== 'string') ||
      extraneous.length > 0
    ) {
      return invalid(`Sidecar entry ${i + 1} is not a closed citation record`, i + 1);
    }
    records.push({
      id: record.id,
      digest: record.digest,
      anchor: record.anchor as string | undefined,
      source,
      line: i + 1,
      form: 'sidecar-ledger',
    });
  }
  return { records, diagnostics: [] };
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

/** One consumer's parsed citations plus the carrier diagnostics the parse produced. */
export interface ParsedConsumer {
  records: CitationRecord[];
  diagnostics: Diagnostic[];
  /**
   * True when a carrier conflict (payloads and an adjacent sidecar at once) suppresses the
   * citation-status verification of this consumer's records until the conflict is resolved.
   * The records stay listed so the document still counts as carrying citations.
   */
  suppressed: boolean;
}

/**
 * Parse one consumer document's citations under the carrier contract. A consumer uses exactly
 * one carrier: payloads in the document, or the adjacent `<stem>.citations.yml` sidecar. Using
 * both is one PRODUCT067 against the consumer file, with the records' statuses suppressed. A
 * sidecar given directly must have its corresponding consumer file.
 */
export async function parseCitations(
  absolutePath: string,
  repoRoot: string,
): Promise<ParsedConsumer> {
  const source = relative(repoRoot, absolutePath).split(sep).join('/');
  const content = await readFile(absolutePath, 'utf8');

  if (isCitationSidecar(absolutePath)) {
    const parsed = parseSidecarLedger(content, source);
    const consumers = await consumerCandidatesFor(absolutePath);
    if (consumers.length === 0) {
      return {
        records: [],
        diagnostics: [
          ...parsed.diagnostics,
          carrierDiagnostic(source, 'Sidecar has no corresponding consumer file'),
        ],
        suppressed: false,
      };
    }
    return { ...parsed, suppressed: false };
  }

  const payload = extractPayloadCitations(content, source);
  const sidecarAbsolute = SIDECAR_SUFFIXES.map((suffix) => {
    const dir = dirname(absolutePath);
    const name = basename(absolutePath);
    const dot = name.lastIndexOf('.');
    const stem = dot > 0 ? name.slice(0, dot) : name;
    return join(dir, `${stem}${suffix}`);
  });
  let sidecarPath: string | undefined;
  for (const candidate of sidecarAbsolute) {
    try {
      await readFile(candidate, 'utf8');
      sidecarPath = candidate;
      break;
    } catch {
      // No sidecar under this suffix.
    }
  }

  if (sidecarPath !== undefined && payload.records.length > 0) {
    // Exactly one carrier per consumer: the conflict is reported once against the consumer file
    // and the citation statuses of both carriers stay suppressed until it is resolved.
    return {
      records: payload.records,
      diagnostics: [
        ...payload.diagnostics,
        carrierDiagnostic(
          source,
          'Consumer document uses both carriers: comment payloads and an adjacent citation sidecar; keep exactly one',
        ),
      ],
      suppressed: true,
    };
  }

  if (sidecarPath !== undefined) {
    const sidecarSource = relative(repoRoot, sidecarPath).split(sep).join('/');
    const sidecarContent = await readFile(sidecarPath, 'utf8');
    const parsed = parseSidecarLedger(sidecarContent, sidecarSource);
    return {
      records: parsed.records,
      diagnostics: [...payload.diagnostics, ...parsed.diagnostics],
      suppressed: false,
    };
  }

  return { ...payload, suppressed: false };
}

/** A directory scan's citations and the carrier diagnostics found along the way. */
export interface CitationScan {
  records: CitationRecord[];
  diagnostics: Diagnostic[];
}

/**
 * Scan a directory tree for consumer documents and parse all citations. A sidecar whose consumer
 * document is itself in the scan is read through that consumer, so its records count once; a
 * sidecar whose consumer lives outside the scanned formats is read directly; a sidecar with no
 * consumer at all is a carrier defect. A consumer in carrier conflict contributes its diagnostic
 * but no verifiable records.
 */
export async function scanCitations(rootDir: string, repoRoot: string): Promise<CitationScan> {
  const docs = await discoverConsumerDocs(rootDir);
  const docSet = new Set(docs);
  const records: CitationRecord[] = [];
  const diagnostics: Diagnostic[] = [];

  for (const doc of docs) {
    if (isCitationSidecar(doc)) {
      const consumers = await consumerCandidatesFor(doc);
      if (consumers.some((consumer) => docSet.has(consumer))) continue;
      const parsed = await parseCitations(doc, repoRoot);
      records.push(...parsed.records);
      diagnostics.push(...parsed.diagnostics);
      continue;
    }
    const parsed = await parseCitations(doc, repoRoot);
    diagnostics.push(...parsed.diagnostics);
    if (!parsed.suppressed) records.push(...parsed.records);
  }

  return { records, diagnostics };
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
 * Contract attribution for a citation diagnostic: the cited ID goes in `target` exactly as
 * authored (never `artifact`, which resolution alone could establish), and the point of use is
 * the payload `line` or the sidecar `entry`.
 */
function citationAttribution(
  citation: CitationRecord,
): Pick<Diagnostic, 'target' | 'line' | 'entry'> {
  return citation.form === 'sidecar-ledger'
    ? { target: citation.id, entry: citation.line }
    : { target: citation.id, line: citation.line };
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
      ...citationAttribution(citation),
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
      ...citationAttribution(citation),
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
        ...citationAttribution(citation),
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
        ...citationAttribution(citation),
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
      ...citationAttribution(citation),
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
      compareCodePoints(a.citation.source, b.citation.source) ||
      a.citation.line - b.citation.line ||
      compareCodePoints(a.citation.id, b.citation.id) ||
      compareCodePoints(a.citation.anchor ?? '', b.citation.anchor ?? ''),
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
  /** `inline` is a compatibility alias that is rewritten to the canonical payload form. */
  form: 'payload' | 'inline' | 'marker-block' | 'sidecar-ledger';
}

/** Emit a citation record in the requested form. */
export function emitCitation(options: CiteOptions): string {
  const anchorId = /^[A-Z0-9]+(-[A-Z0-9]+)*$/;
  if (!productArtifactIdPattern.test(options.id))
    throw new Error(`Invalid citation artifact id '${options.id}'`);
  if (!DIGEST_PATTERN.test(options.digest))
    throw new Error(`Invalid citation digest '${options.digest}'`);
  if (options.anchor !== undefined && !anchorId.test(options.anchor)) {
    throw new Error(`Invalid citation anchor '${options.anchor}'`);
  }

  const attrs = [`id="${options.id}"`, `digest="${options.digest}"`];
  if (options.anchor) attrs.push(`anchor="${options.anchor}"`);
  const attrString = attrs.join(' ');

  switch (options.form) {
    case 'payload':
    case 'inline':
      return `pdac:cite ${attrString}`;
    case 'marker-block':
      throw new Error(
        'marker-block writing requires the whole artifact projection; emit a payload and let the caller supply its native comment wrapper',
      );
    case 'sidecar-ledger':
      return `citations:\n  - id: ${options.id}\n    digest: ${options.digest}${options.anchor ? `\n    anchor: ${options.anchor}` : ''}`;
    default:
      throw new Error(`Invalid citation form '${String(options.form)}'`);
  }
}
