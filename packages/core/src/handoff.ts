import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse, stringify } from 'yaml';
import type { LoadedChange, LoadedSlice } from './changes.js';
import { contentDigest } from './digest.js';
import type { Diagnostic } from './diagnostics.js';
import { gitHead, gitShow } from './git.js';
import type { ProductGraph } from './graph.js';
import type { LoadedArtifact } from './model.js';
import type { SchemaRegistry } from './schema-registry.js';
import { sliceAffects, sliceImplements } from './slices.js';

export const handoffSchemaId = 'product-definition-as-code/handoff/v1alpha1';

export interface WorkItemRef {
  provider: string;
  repository: string;
  id: string;
  title: string;
}

/** Parse a work-item reference of the form provider:owner/repository#id. */
export function parseWorkItemRef(ref: string, title: string): WorkItemRef {
  const match = /^([a-z0-9-]+):([^#]+)#(.+)$/i.exec(ref);
  if (!match) {
    throw new Error(`Invalid work-item reference '${ref}': expected provider:owner/repository#id`);
  }
  return {
    provider: (match[1] as string).toLowerCase(),
    repository: match[2] as string,
    id: match[3] as string,
    title,
  };
}

/**
 * The deterministic closure rule (docs/specification/handoff-contract.md):
 * start from the slice's implements and affects, expand requirements, use cases
 * and terms, add containing journeys (one incoming hop) and applicable constraints.
 */
export function computeClosure(graph: ProductGraph, slice: LoadedSlice): string[] {
  const included = new Set<string>();
  const add = (id: string) => {
    if (graph.nodeById.has(id)) included.add(id);
  };

  for (const entry of sliceImplements(slice)) {
    if (typeof entry.requirement === 'string') add(entry.requirement);
  }
  for (const affected of sliceAffects(slice)) add(affected);

  // Expand requirements via derived-from / applies-to.
  for (const id of [...included]) {
    const node = graph.nodeById.get(id);
    if (!node) continue;
    if (
      node.type === 'functional-requirement' ||
      node.type === 'quality-requirement' ||
      node.type === 'constraint'
    ) {
      for (const edge of graph.outgoing.get(id) ?? []) add(edge.to);
    }
  }

  // Expand use cases via their canonical outgoing relationships.
  for (const id of [...included]) {
    const node = graph.nodeById.get(id);
    if (node?.type !== 'use-case') continue;
    for (const edge of graph.outgoing.get(id) ?? []) add(edge.to);
  }

  // Expand domain terms via defined-in.
  for (const id of [...included]) {
    const node = graph.nodeById.get(id);
    if (node?.type !== 'domain-term') continue;
    for (const edge of graph.outgoing.get(id) ?? []) add(edge.to);
  }

  // One incoming hop: journeys containing an included use case, plus their actors.
  for (const id of [...included]) {
    const node = graph.nodeById.get(id);
    if (node?.type !== 'use-case') continue;
    for (const edge of graph.incoming.get(id) ?? []) {
      if (edge.kind !== 'steps') continue;
      add(edge.from);
      for (const journeyEdge of graph.outgoing.get(edge.from) ?? []) {
        if (journeyEdge.kind === 'primary-actor') add(journeyEdge.to);
      }
    }
  }

  // Constraints applying to included artifacts, and product-wide constraints.
  for (const node of graph.nodes) {
    if (node.type !== 'constraint') continue;
    const targets = graph.outgoing.get(node.id) ?? [];
    if (targets.length === 0 || targets.some((edge) => included.has(edge.to))) add(node.id);
  }

  return [...included].sort();
}

export interface HandoffDocument {
  schema: string;
  id: string;
  'generated-at': string;
  'work-item': WorkItemRef;
  source: {
    repository: string;
    revision: string;
    'product-change': string;
    'delivery-slice': string;
  };
  implements: string[];
  affects: string[];
  artifacts: { id: string; type: string; path: string; digest: string }[];
  context: { path: string; digest: string };
}

export interface GenerateHandoffOptions {
  repoRoot: string;
  graph: ProductGraph;
  overlayArtifacts: LoadedArtifact[];
  change: LoadedChange;
  slice: LoadedSlice;
  workItem: WorkItemRef;
  outDir: string;
  /** Injectable for deterministic tests; defaults to the current time. */
  generatedAt?: string;
}

export interface GeneratedHandoff {
  handoff: HandoffDocument;
  handoffPath: string;
  contextPath: string;
  diagnostics: Diagnostic[];
}

function sanitizeIdSegment(value: string): string {
  return value
    .toUpperCase()
    .replaceAll(/[^A-Z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '');
}

/** Generate product-handoff.yaml and product-context.md for an approved slice. */
export async function generateHandoff(
  options: GenerateHandoffOptions,
): Promise<GeneratedHandoff | { diagnostics: Diagnostic[] }> {
  const { repoRoot, graph, overlayArtifacts, change, slice, workItem, outDir } = options;

  if (slice.status !== 'approved') {
    return {
      diagnostics: [
        {
          severity: 'error',
          code: 'PRODUCT040',
          message: `Handoffs are generated from approved slices; '${slice.id ?? slice.file}' is '${slice.status ?? 'unknown'}'`,
          file: slice.file,
          artifact: slice.id,
        },
      ],
    };
  }

  const revision = await gitHead(repoRoot);
  if (!revision) {
    return {
      diagnostics: [
        {
          severity: 'error',
          code: 'PRODUCT042',
          message: 'Cannot record a source revision: not inside a Git repository',
          file: slice.file,
          artifact: slice.id,
        },
      ],
    };
  }

  const byId = new Map(overlayArtifacts.filter((a) => a.id).map((a) => [a.id as string, a]));
  const closure = computeClosure(graph, slice);
  const artifacts = closure.map((id) => {
    const artifact = byId.get(id);
    const node = graph.nodeById.get(id);
    return {
      id,
      type: node?.type ?? 'unknown',
      path: artifact?.file ?? '',
      digest: artifact?.digest ?? '',
    };
  });

  const implementsIds = sliceImplements(slice)
    .map((e) => e.requirement)
    .filter((r): r is string => typeof r === 'string')
    .sort();
  const affects = closure.filter((id) => !implementsIds.includes(id));

  const handoffId = `HOF-${sanitizeIdSegment(workItem.provider)}-${sanitizeIdSegment(workItem.id)}`;
  const context = buildProductContext({
    handoffId,
    workItem,
    revision,
    change,
    slice,
    graph,
    byId,
    closure,
    implementsIds,
  });

  const handoff: HandoffDocument = {
    schema: handoffSchemaId,
    id: handoffId,
    'generated-at': options.generatedAt ?? new Date().toISOString(),
    'work-item': workItem,
    source: {
      repository: workItem.repository,
      revision,
      'product-change': change.id ?? '',
      'delivery-slice': slice.id ?? '',
    },
    implements: implementsIds,
    affects,
    artifacts,
    context: { path: 'product-context.md', digest: contentDigest(context) },
  };

  await mkdir(outDir, { recursive: true });
  const handoffPath = join(outDir, 'product-handoff.yaml');
  const contextPath = join(outDir, 'product-context.md');
  await writeFile(handoffPath, stringify(handoff, { lineWidth: 0 }), 'utf8');
  await writeFile(contextPath, context, 'utf8');

  return { handoff, handoffPath, contextPath, diagnostics: [] };
}

interface ContextInputs {
  handoffId: string;
  workItem: WorkItemRef;
  revision: string;
  change: LoadedChange;
  slice: LoadedSlice;
  graph: ProductGraph;
  byId: Map<string, LoadedArtifact>;
  closure: string[];
  implementsIds: string[];
}

function artifactSection(inputs: ContextInputs, types: string[], heading: string): string[] {
  const lines: string[] = [];
  const matching = inputs.closure.filter((id) =>
    types.includes(inputs.graph.nodeById.get(id)?.type ?? ''),
  );
  if (matching.length === 0) return lines;
  lines.push(`## ${heading}`, '');
  for (const id of matching) {
    const artifact = inputs.byId.get(id);
    const node = inputs.graph.nodeById.get(id);
    lines.push(`### ${id} — ${node?.title ?? ''}`, '');
    lines.push(artifact?.body.trim() ?? '_Content unavailable._', '');
  }
  return lines;
}

function buildProductContext(inputs: ContextInputs): string {
  const { handoffId, workItem, revision, change, slice } = inputs;
  const lines: string[] = [
    `<!-- GENERATED by product-definition handoff create for ${handoffId}. Non-canonical. -->`,
    '<!-- Regenerate with: product-definition handoff create. Do not edit by hand. -->',
    '',
    `# Product context — ${handoffId}`,
    '',
    `Work item: \`${workItem.provider}:${workItem.repository}#${workItem.id}\` — ${workItem.title}`,
    '',
    `Source: revision \`${revision}\` (${change.id ?? '?'} / ${slice.id ?? '?'})`,
    '',
    '## Delivery outcome',
    '',
    String(slice.data.outcome ?? ''),
    '',
  ];

  const verification = Array.isArray(slice.data.verification)
    ? (slice.data.verification as string[])
    : [];
  if (verification.length > 0) {
    lines.push('Verification:', '');
    for (const item of verification) lines.push(`- ${item}`);
    lines.push('');
  }
  const outOfScope = Array.isArray(slice.data['out-of-scope'])
    ? (slice.data['out-of-scope'] as string[])
    : [];
  if (outOfScope.length > 0) {
    lines.push('Out of scope:', '');
    for (const item of outOfScope) lines.push(`- ${item}`);
    lines.push('');
  }

  lines.push(
    ...artifactSection(
      inputs,
      ['functional-requirement', 'quality-requirement'],
      'Implemented and related requirements',
    ),
    ...artifactSection(inputs, ['use-case', 'journey'], 'Affected behaviour'),
    ...artifactSection(inputs, ['business-rule'], 'Governing rules'),
    ...artifactSection(inputs, ['domain-term', 'bounded-context'], 'Domain language'),
    ...artifactSection(inputs, ['constraint'], 'Constraints'),
    ...artifactSection(inputs, ['actor'], 'Actors'),
  );

  const openQuestions = /##\s+Open Questions\s*\n([\s\S]*?)(?=\n##\s|$)/.exec(change.body)?.[1];
  lines.push('## Open questions', '', (openQuestions ?? '').trim() || 'None recorded.', '');

  lines.push('## Traceability', '');
  for (const id of inputs.closure) {
    const artifact = inputs.byId.get(id);
    lines.push(`- ${id}: \`${artifact?.file ?? ''}\` (${artifact?.digest ?? ''})`);
  }
  lines.push('');

  return lines.join('\n');
}

export type HandoffState = 'current' | 'stale' | 'invalid' | 'source-revision-unavailable';

export interface HandoffStatusReport {
  status: HandoffState;
  handoffId?: string;
  staleArtifacts: string[];
  unresolvedArtifacts: string[];
  diagnostics: Diagnostic[];
}

/** Judge a handoff exclusively by the digests of its referenced artifacts. */
export async function handoffStatus(
  repoRoot: string,
  handoffPath: string,
  registry: SchemaRegistry,
  handoffFileLabel: string,
): Promise<HandoffStatusReport> {
  const diagnostics: Diagnostic[] = [];
  let raw: string;
  try {
    raw = await readFile(handoffPath, 'utf8');
  } catch {
    return {
      status: 'invalid',
      staleArtifacts: [],
      unresolvedArtifacts: [],
      diagnostics: [
        {
          severity: 'error',
          code: 'PRODUCT041',
          message: 'Handoff file cannot be read',
          file: handoffFileLabel,
        },
      ],
    };
  }

  let data: HandoffDocument;
  try {
    data = parse(raw) as HandoffDocument;
  } catch (error) {
    return {
      status: 'invalid',
      staleArtifacts: [],
      unresolvedArtifacts: [],
      diagnostics: [
        {
          severity: 'error',
          code: 'PRODUCT001',
          message: `Handoff is not valid YAML: ${error instanceof Error ? error.message : String(error)}`,
          file: handoffFileLabel,
        },
      ],
    };
  }

  const schemaDiagnostics = registry.validate('product-handoff', data, handoffFileLabel);
  if (schemaDiagnostics.length > 0) {
    return {
      status: 'invalid',
      handoffId: data?.id,
      staleArtifacts: [],
      unresolvedArtifacts: [],
      diagnostics: schemaDiagnostics,
    };
  }

  const staleArtifacts: string[] = [];
  const unresolvedArtifacts: string[] = [];
  for (const artifact of data.artifacts) {
    let content: string | undefined;
    try {
      content = await readFile(join(repoRoot, ...artifact.path.split('/')), 'utf8');
    } catch {
      content = await gitShow(repoRoot, data.source.revision, artifact.path);
    }
    if (content === undefined) {
      unresolvedArtifacts.push(artifact.id);
      continue;
    }
    if (contentDigest(content) !== artifact.digest) {
      staleArtifacts.push(artifact.id);
      diagnostics.push({
        severity: 'error',
        code: 'PRODUCT042',
        message: `Artifact '${artifact.id}' no longer matches its recorded digest`,
        file: handoffFileLabel,
        artifact: artifact.id,
        target: artifact.id,
      });
    }
  }

  if (unresolvedArtifacts.length > 0) {
    return {
      status: 'source-revision-unavailable',
      handoffId: data.id,
      staleArtifacts,
      unresolvedArtifacts,
      diagnostics,
    };
  }
  return {
    status: staleArtifacts.length > 0 ? 'stale' : 'current',
    handoffId: data.id,
    staleArtifacts,
    unresolvedArtifacts,
    diagnostics,
  };
}
