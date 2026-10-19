import { readFile } from 'node:fs/promises';
import { parseDocument } from 'yaml';
import {
  buildArtifactIndex,
  verifyCitation,
  type CitationRecord,
  type CitationStatus,
} from './citations.js';
import { compareCodePoints, sortDiagnostics, type Diagnostic } from './diagnostics.js';
import type { LoadedArtifact } from './model.js';
import { SchemaRegistry } from './schema-registry.js';

interface EvidenceResult {
  'test-id': string;
  level: string;
  outcome: string;
  citations: { id: string; digest: string; anchor?: string }[];
}
interface EvidenceEnvelope {
  format: string;
  provider: string;
  'run-id': string;
  revision: string;
  results: EvidenceResult[];
}
export interface EvidenceEvaluation {
  runRevision?: string;
  modelRevision?: string;
  evidenceResults: {
    testId: string;
    level: string;
    outcome: string;
    citationStatuses: CitationStatus[];
  }[];
  citations: CitationRecord[];
  diagnostics: Diagnostic[];
}

/** Evaluates provider claims; never executes verification or changes an external outcome. */
export async function verifyEvidence(
  content: string,
  file: string,
  artifacts: LoadedArtifact[],
  modelRevision?: string,
): Promise<EvidenceEvaluation> {
  const result: EvidenceEvaluation = {
    modelRevision,
    evidenceResults: [],
    citations: [],
    diagnostics: [],
  };
  const malformed = (message: string, field?: string) => {
    result.diagnostics.push({
      severity: 'error',
      code: 'PRODUCT080',
      file,
      message,
      ...(field !== undefined ? { field } : {}),
    });
    return result;
  };
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
    // JSON.parse accepts duplicate keys. YAML's JSON-compatible parser retains their locations.
    if (parseDocument(content, { uniqueKeys: true }).errors.some((e) => e.code === 'DUPLICATE_KEY'))
      return malformed('Evidence contains duplicate JSON object keys');
  } catch {
    return malformed('Evidence is not valid JSON');
  }
  const registry = await SchemaRegistry.loadBundled('v1alpha2');
  const shape = registry.validate('verification-evidence', parsed, file);
  if (shape.length) {
    const first = [...shape].sort((a, b) => compareCodePoints(a.field ?? '', b.field ?? ''))[0]!;
    return malformed(first.message, first.field);
  }
  const evidence = parsed as EvidenceEnvelope;
  result.runRevision = evidence.revision;
  const index = buildArtifactIndex(artifacts);
  const seen = new Set<string>();
  let ordinal = 0;
  evidence.results.forEach((claim, n) => {
    if (seen.has(claim['test-id'])) {
      result.diagnostics.push({
        severity: 'error',
        code: 'PRODUCT081',
        file,
        field: `results[${n + 1}].test-id`,
        message: 'External test ID is repeated in this run document',
      });
      ordinal += claim.citations.length;
      return;
    }
    seen.add(claim['test-id']);
    const citationStatuses: CitationStatus[] = [];
    claim.citations.forEach((raw, m) => {
      ordinal++;
      const citation: CitationRecord = {
        ...raw,
        source: file,
        line: ordinal,
        form: 'verification-evidence',
        evidenceField: `results[${n + 1}].citations[${m + 1}].id`,
      };
      result.citations.push(citation);
      const target = index.get(raw.id);
      if (
        target &&
        !['structured-behaviour', 'functional-requirement', 'quality-requirement'].includes(
          target.type ?? '',
        )
      ) {
        citationStatuses.push('unresolved');
        result.diagnostics.push({
          severity: 'error',
          code: 'PRODUCT081',
          file,
          field: `results[${n + 1}].citations[${m + 1}].id`,
          target: raw.id,
          entry: ordinal,
          message:
            'Evidence must cite a Structured Behaviour, Functional Requirement or Quality Requirement',
        });
      } else {
        const verified = verifyCitation(citation, index);
        citationStatuses.push(verified.status);
        result.diagnostics.push(...verified.diagnostics);
      }
    });
    result.evidenceResults.push({
      testId: claim['test-id'],
      level: claim.level,
      outcome: claim.outcome,
      citationStatuses,
    });
  });
  result.diagnostics = sortDiagnostics(result.diagnostics);
  return result;
}

export async function loadEvidence(
  path: string,
  file: string,
  artifacts: LoadedArtifact[],
  modelRevision?: string,
): Promise<EvidenceEvaluation> {
  try {
    return await verifyEvidence(await readFile(path, 'utf8'), file, artifacts, modelRevision);
  } catch (error) {
    return {
      modelRevision,
      evidenceResults: [],
      citations: [],
      diagnostics: [
        {
          severity: 'error',
          code: 'PRODUCT080',
          file,
          message: `Cannot read selected evidence: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
}
