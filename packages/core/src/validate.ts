import { basename } from 'node:path';
import { expectedFileName } from './artifact.js';
import type { Diagnostic } from './diagnostics.js';
import { codes, sortDiagnostics } from './diagnostics.js';
import type { ProductGraph } from './graph.js';
import type { LoadedArtifact } from './model.js';
import { allowedTargets } from './relationships.js';

const requirementTypes = new Set(['functional-requirement', 'quality-requirement', 'constraint']);

/**
 * Baseline model validation: identity and reference errors (PRODUCT005-008) and
 * model-quality warnings (PRODUCT101-107). Per-document diagnostics are produced
 * at load time and are not repeated here.
 */
export function validateModel(artifacts: LoadedArtifact[], graph: ProductGraph): Diagnostic[] {
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

  // PRODUCT102: active use case in no journey. Normative warning; the contract forbids
  // configuration from suppressing it.
  {
    for (const node of graph.nodes) {
      if (node.type !== 'use-case' || node.status !== 'active') continue;
      const inJourney = (graph.incoming.get(node.id) ?? []).some(
        (e) => e.kind === 'steps[].use-case',
      );
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

  // PRODUCT103: requirement unreachable from any actor. Normative warning; the contract forbids
  // configuration from suppressing it.
  {
    const reachable = undirectedReachabilityFromActors(graph);
    for (const node of graph.nodes) {
      if (!requirementTypes.has(node.type)) continue;
      // A constraint without applies-to is product-wide: reachable by definition. The
      // applies-to edges decide, never the total outgoing count: a uses-terms dependency
      // says what the constraint needs, not where it applies.
      if (
        node.type === 'constraint' &&
        !(graph.outgoing.get(node.id) ?? []).some((e) => e.kind === 'applies-to')
      ) {
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

  // PRODUCT105-107: orphaned knowledge. The PRODUCT105 and PRODUCT106 relationship sets are
  // exact (spec/relationships.md, Knowledge warning relationship sets): the counting
  // relationship must be authored by a non-retired artifact, and retired rules and terms are
  // outside the warning populations entirely.
  const nonRetiredSource = (edge: { from: string }): boolean =>
    graph.nodeById.get(edge.from)?.status !== 'retired';
  for (const node of graph.nodes) {
    const incoming = graph.incoming.get(node.id) ?? [];
    const outgoing = graph.outgoing.get(node.id) ?? [];
    if (node.type === 'business-rule' && node.status !== 'retired') {
      // Consumed iff a valid outgoing applies-to, incoming governed-by or incoming derived-from
      // exists with a non-retired author. An incoming illustrates edge never counts: an example
      // demonstrates the rule, it does not establish where the rule governs. Valid means valid:
      // an applies-to whose target does not resolve, or resolves to a disallowed type, is a
      // broken reference (PRODUCT006/PRODUCT007), not consumption.
      const appliesToTargets = allowedTargets(node.type, 'applies-to') as readonly string[];
      const consumed =
        incoming.some(
          (e) => (e.kind === 'governed-by' || e.kind === 'derived-from') && nonRetiredSource(e),
        ) ||
        outgoing.some((e) => {
          if (e.kind !== 'applies-to') return false;
          const target = graph.nodeById.get(e.to);
          return target !== undefined && appliesToTargets.includes(target.type);
        });
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
    if (node.type === 'domain-term' && node.status !== 'retired') {
      // Usage is the incoming canonical `uses-terms` edge from a non-retired artifact of any
      // permitted source kind; a prose mention of the term's id or title never counts
      // (RFC 0072). A term's self-reference counts by the letter of the contract; that hole is
      // spec#96, deferred to an 0.3.0 RFC.
      const used = incoming.some((e) => e.kind === 'uses-terms' && nonRetiredSource(e));
      if (!used) {
        diagnostics.push({
          severity: 'warning',
          code: 'PRODUCT106',
          message: `Domain term '${node.id}' has no incoming uses-terms relationship`,
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
