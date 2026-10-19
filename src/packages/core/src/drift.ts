/**
 * Recorded product-definition drift warnings (FR-OPENSPEC-001).
 *
 * A consumer that finds its change's goals contradicting or exceeding the accepted product
 * definition records the divergence in its proposal under a drift note carrying a
 * machine-readable marker:
 *
 *     <!-- pdac-drift ids="BR-REFUND-001, FR-REFUND-002" summary="PBI wants 14 days; the rule says 30" -->
 *
 * This module parses and scans those markers so the product can enumerate every recorded drift
 * warning across the consumer-document population. Enumeration is a report and never a gate:
 * parsing emits no diagnostics, and a malformed marker is returned flagged rather than dropped,
 * so a typo surfaces in the listing instead of hiding the warning it was meant to carry.
 */
import { readFile } from 'node:fs/promises';
import { relative, sep } from 'node:path';
import { discoverConsumerDocs } from './citations.js';

/** One recorded drift warning, parsed from a consumer document. */
export interface DriftRecord {
  /** The product artifact IDs the marker names (may be empty when malformed). */
  ids: string[];
  /** The one-line human summary of the divergence, when the marker carries one. */
  summary?: string;
  /** Repository-relative path of the consumer document (POSIX separators). */
  source: string;
  /** 1-based line number of the marker. */
  line: number;
  /** The marker is missing its required `ids` attribute or names no IDs. */
  malformed: boolean;
}

/**
 * Match a drift marker occupying a line of its own, capturing its attribute text. The contract
 * requires the marker on its own line; anchoring the whole line keeps a mention of the marker
 * inside prose or configuration (e.g. the merged rules quoting its syntax) from being read as a
 * recorded warning.
 */
const DRIFT_MARKER = /^\s*<!--\s*pdac-drift\b([^>]*?)-->\s*$/;

function attribute(attrs: string, name: string): string | undefined {
  const match = new RegExp(`${name}="([^"]*)"`).exec(attrs);
  return match?.[1];
}

/**
 * Parse every drift marker in a consumer document's content. The marker contract is one marker
 * on a line of its own; `ids` is a comma- or whitespace-separated list of artifact IDs.
 */
export function parseDriftMarkers(content: string, source: string): DriftRecord[] {
  const records: DriftRecord[] = [];
  const lines = content.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const match = DRIFT_MARKER.exec(lines[index] as string);
    if (!match) continue;
    const attrs = match[1] ?? '';
    const idsRaw = attribute(attrs, 'ids');
    const ids = (idsRaw ?? '')
      .split(/[\s,]+/)
      .map((id) => id.trim())
      .filter((id) => id.length > 0);
    records.push({
      ids,
      summary: attribute(attrs, 'summary'),
      source,
      line: index + 1,
      malformed: idsRaw === undefined || ids.length === 0,
    });
  }
  return records;
}

/** Parse all drift markers from a single consumer document on disk. */
export async function parseDriftFile(
  absolutePath: string,
  repoRoot: string,
): Promise<DriftRecord[]> {
  const source = relative(repoRoot, absolutePath).split(sep).join('/');
  return parseDriftMarkers(await readFile(absolutePath, 'utf8'), source);
}

/** Scan a directory tree of consumer documents for recorded drift warnings. */
export async function scanDriftMarkers(rootDir: string, repoRoot: string): Promise<DriftRecord[]> {
  const records: DriftRecord[] = [];
  for (const doc of await discoverConsumerDocs(rootDir)) {
    records.push(...(await parseDriftFile(doc, repoRoot)));
  }
  return records;
}
