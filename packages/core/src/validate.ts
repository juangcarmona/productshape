import { basename } from 'node:path';
import { expectedFileName } from './artifact.js';
import type { ProductConfig } from './config.js';
import type { Diagnostic } from './diagnostics.js';
import { codes, sortDiagnostics } from './diagnostics.js';
import type { ProductGraph } from './graph.js';
import type { LoadedArtifact } from './model.js';
import { allowedTargets } from './relationships.js';

const requirementTypes = new Set(['functional-requirement', 'quality-requirement', 'constraint']);

export interface ValidateModelOptions {
  config: ProductConfig;
}

/**
 * Baseline model validation: identity and reference errors (PRODUCT005-008) and
 * model-quality warnings (PRODUCT101-107). Per-document diagnostics are produced
 * at load time and are not repeated here.
 */
export function validateModel(
  artifacts: LoadedArtifact[],
  graph: ProductGraph,
  { config }: ValidateModelOptions,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  // PRODUCT005: duplicate IDs.
  const byId = new Map<string, LoadedArtifact[]>();
  for (const artifact of artifacts) {
    if (!artifact.id) continue;
    byId.set(artifact.id, [...(byId.get(artifact.id) ?? []), artifact]);
  }
  for (const [id, occurrences] of byId) {
    if (occurrences.length > 1) {
      for (const artifact of occurrences) {
        diagnostics.push({
          severity: 'error',
          code: 'PRODUCT005',
          message: `Duplicate ID '${id}' (${occurrences.length} occurrences)`,
          file: artifact.file,
          artifact: id,
        });
      }
    }
  }

  // Reference-level checks per edge.
  for (const edge of graph.edges) {
    const source = graph.nodeById.get(edge.from);
    if (!source) continue;
    const target = graph.nodeById.get(edge.to);

    if (!target) {
      diagnostics.push({
        severity: 'error',
        code: 'PRODUCT006',
        message: `Reference to unknown ID '${edge.to}'`,
        file: source.path,
        artifact: edge.from,
        field: edge.kind,
        target: edge.to,
      });
      continue;
    }

    const allowed = allowedTargets(source.type, edge.kind);
    if (!allowed.includes(target.type as (typeof allowed)[number])) {
      diagnostics.push({
        severity: 'error',
        code: 'PRODUCT007',
        message: `'${edge.kind}' must target ${allowed.join(', ')}; '${edge.to}' is a ${target.type}`,
        file: source.path,
        artifact: edge.from,
        field: edge.kind,
        target: edge.to,
      });
    }

    if (source.status === 'active' && target.status === 'retired') {
      diagnostics.push({
        severity: 'error',
        code: 'PRODUCT008',
        message: `Active artifact references retired artifact '${edge.to}'`,
        file: source.path,
        artifact: edge.from,
        field: edge.kind,
        target: edge.to,
      });
    }

    if (source.status === 'active' && target.status === 'deprecated') {
      diagnostics.push({
        severity: 'warning',
        code: 'PRODUCT104',
        message: `Active artifact references deprecated artifact '${edge.to}'`,
        file: source.path,
        artifact: edge.from,
        field: edge.kind,
        target: edge.to,
      });
    }
  }

  // PRODUCT101: file-name alignment.
  for (const artifact of artifacts) {
    if (!artifact.id) continue;
    const expected = expectedFileName(artifact.id);
    if (basename(artifact.file) !== expected) {
      diagnostics.push({
        severity: 'warning',
        code: 'PRODUCT101',
        message: `File name does not match the artifact ID (expected '${expected}'); rename with: prodshape fix --filenames`,
        file: artifact.file,
        artifact: artifact.id,
      });
    }
  }

  // PRODUCT111: a low-confidence draft needs human validation. Unlike PRODUCT102/103 this is
  // not configuration-gated: it reports what the artifact says about itself, not a model-shape
  // policy a repository may reasonably reject.
  for (const artifact of artifacts) {
    if (artifact.status !== 'draft') continue;
    const provenance = artifact.frontmatter.provenance;
    if (typeof provenance !== 'object' || provenance === null) continue;
    if ((provenance as Record<string, unknown>).confidence !== 'low') continue;
    diagnostics.push({
      severity: 'warning',
      code: codes.lowConfidenceDraft,
      message: `Draft artifact declares 'provenance.confidence: low'; a human must validate it before it is accepted`,
      file: artifact.file,
      artifact: artifact.id,
      field: 'provenance.confidence',
    });
  }

  // PRODUCT102: active use case in no journey (configuration-gated).
  if (config.validation['require-journey-for-use-case']) {
    for (const node of graph.nodes) {
      if (node.type !== 'use-case' || node.status !== 'active') continue;
      const inJourney = (graph.incoming.get(node.id) ?? []).some((e) => e.kind === 'steps');
      if (!inJourney) {
        diagnostics.push({
          severity: 'warning',
          code: 'PRODUCT102',
          message: `Active use case '${node.id}' is not part of any journey`,
          file: node.path,
          artifact: node.id,
        });
      }
    }
  }

  // PRODUCT103: requirement unreachable from any actor (configuration-gated).
  if (config.validation['require-requirement-reachability']) {
    const reachable = undirectedReachabilityFromActors(graph);
    for (const node of graph.nodes) {
      if (!requirementTypes.has(node.type)) continue;
      // A constraint without applies-to is product-wide: reachable by definition.
      if (node.type === 'constraint' && (graph.outgoing.get(node.id) ?? []).length === 0) {
        continue;
      }
      if (!reachable.has(node.id)) {
        diagnostics.push({
          severity: 'warning',
          code: 'PRODUCT103',
          message: `Requirement '${node.id}' is not reachable from any actor`,
          file: node.path,
          artifact: node.id,
        });
      }
    }
  }

  // PRODUCT105-107: orphaned knowledge.
  for (const node of graph.nodes) {
    const incoming = graph.incoming.get(node.id) ?? [];
    const outgoing = graph.outgoing.get(node.id) ?? [];
    if (node.type === 'business-rule') {
      const consumed =
        incoming.some((e) => e.kind === 'governed-by' || e.kind === 'derived-from') ||
        outgoing.some((e) => e.kind === 'applies-to');
      if (!consumed) {
        diagnostics.push({
          severity: 'warning',
          code: 'PRODUCT105',
          message: `Business rule '${node.id}' has no consumers`,
          file: node.path,
          artifact: node.id,
        });
      }
    }
    if (node.type === 'domain-term') {
      const used = incoming.some((e) => e.kind === 'uses-terms');
      if (!used) {
        diagnostics.push({
          severity: 'warning',
          code: 'PRODUCT106',
          message: `Domain term '${node.id}' is not used by any artifact`,
          file: node.path,
          artifact: node.id,
        });
      }
    }
    if (node.type === 'bounded-context') {
      const owns = incoming.some((e) => e.kind === 'defined-in');
      if (!owns) {
        diagnostics.push({
          severity: 'warning',
          code: 'PRODUCT107',
          message: `No domain term is defined in bounded context '${node.id}'`,
          file: node.path,
          artifact: node.id,
        });
      }
    }
  }

  return sortDiagnostics(diagnostics);
}

/**
 * Undirected reachability over canonical product edges starting from all actors
 * (https://github.com/product-definition-as-code/spec/blob/main/spec/relationships.md#reachability).
 */
function undirectedReachabilityFromActors(graph: ProductGraph): Set<string> {
  const visited = new Set<string>();
  const queue: string[] = graph.nodes.filter((n) => n.type === 'actor').map((n) => n.id);
  for (const id of queue) visited.add(id);

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    const neighbours = [
      ...(graph.outgoing.get(current) ?? []).map((e) => e.to),
      ...(graph.incoming.get(current) ?? []).map((e) => e.from),
    ];
    for (const next of neighbours) {
      if (!visited.has(next) && graph.nodeById.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return visited;
}
