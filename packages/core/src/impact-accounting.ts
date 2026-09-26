import type { LoadedChange } from './changes.js';
import type { Diagnostic } from './diagnostics.js';
import { sortDiagnostics } from './diagnostics.js';
import { compileGraph } from './graph.js';
import type { LoadedArtifact } from './model.js';
import { polarityOf } from './relationships.js';

export interface ImpactCause {
  candidate?: string;
  scope?: 'product';
  cause: string;
  relationship: string;
  disposition: 'existing' | 'added' | 'removed';
}

export interface ImpactAccounting {
  causes: ImpactCause[];
  unresolved: ImpactCause[];
  diagnostics: Diagnostic[];
}

/** Only direct neighbours of effective changes participate; discovered candidates never seed traversal. */
export function accountImpact(
  baseline: LoadedArtifact[],
  overlay: LoadedArtifact[],
  change: LoadedChange,
): ImpactAccounting {
  const before = new Map(baseline.filter((a) => a.id).map((a) => [a.id as string, a]));
  const after = new Map(overlay.filter((a) => a.id).map((a) => [a.id as string, a]));
  const changed = new Set(
    [...before.keys(), ...after.keys()].filter(
      (id) => before.get(id)?.digest !== after.get(id)?.digest,
    ),
  );
  const edges = (artifacts: LoadedArtifact[]) =>
    new Map(
      compileGraph(artifacts, 'v1alpha2').edges.map((edge) => [
        JSON.stringify([edge.from, edge.kind, edge.to]),
        edge,
      ]),
    );
  const oldEdges = edges(baseline);
  const newEdges = edges(overlay);
  const causesByKey = new Map<string, ImpactCause>();
  const add = (
    candidate: string,
    cause: string,
    relationship: string,
    disposition: ImpactCause['disposition'],
  ) => {
    if (before.has(candidate) && !changed.has(candidate) && changed.has(cause)) {
      const item = { candidate, cause, relationship, disposition };
      causesByKey.set(JSON.stringify(item), item);
    }
  };
  for (const key of new Set([...oldEdges.keys(), ...newEdges.keys()])) {
    const edge = newEdges.get(key) ?? oldEdges.get(key)!;
    const disposition = oldEdges.has(key) ? (newEdges.has(key) ? 'existing' : 'removed') : 'added';
    add(edge.from, edge.to, edge.kind, disposition);
    const source = after.get(edge.from) ?? before.get(edge.from);
    if (polarityOf(source?.type ?? '', edge.kind, 'v1alpha2') === 'governance')
      add(edge.to, edge.from, edge.kind, disposition);
  }
  const causes = [...causesByKey.values()];
  for (const id of changed) {
    const global = (artifact?: LoadedArtifact) =>
      artifact?.type === 'constraint' && !Object.hasOwn(artifact.frontmatter, 'applies-to');
    const wasGlobal = global(before.get(id));
    const isGlobal = global(after.get(id));
    if (wasGlobal || isGlobal)
      causes.push({
        scope: 'product',
        cause: id,
        relationship: 'applies-to',
        disposition: wasGlobal ? (isGlobal ? 'existing' : 'removed') : 'added',
      });
  }

  const diagnostics: Diagnostic[] = [];
  const acknowledged = new Set<ImpactCause>();
  const ledger = change.frontmatter.unaffected;
  if (Array.isArray(ledger))
    ledger.forEach((raw: unknown, i: number) => {
      // Shape errors belong exclusively to PRODUCT002, emitted at document loading.
      if (
        change.diagnostics.some(
          (d) =>
            d.code === 'PRODUCT002' &&
            d.file === change.file &&
            (d.field === '/unaffected' ||
              d.field === `/unaffected/${i}` ||
              d.field?.startsWith(`/unaffected/${i}/`)),
        )
      )
        return;
      if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return;
      const entry = raw as Record<string, unknown>;
      const productScope = entry.scope === 'product';
      const candidate = typeof entry.id === 'string' ? before.get(entry.id) : undefined;
      const matches = causes.filter(
        (cause) =>
          cause.cause === entry.cause &&
          cause.relationship === entry.relationship &&
          (productScope ? cause.scope === 'product' : cause.candidate === entry.id),
      );
      let target: unknown;
      let message: string | undefined;
      if (!productScope && !candidate) {
        target = entry.id;
        message = 'Acknowledged artifact is absent from the baseline';
      } else if (matches.length === 0) {
        target = entry.cause;
        message = 'Acknowledgement does not match a derived impact cause';
      } else if (!productScope && candidate?.digest !== entry.digest) {
        target = entry.id;
        message = 'Acknowledgement pins different candidate content';
      } else if (
        (after.get(String(entry.cause)) ?? before.get(String(entry.cause)))?.digest !==
        entry['cause-digest']
      ) {
        target = entry.cause;
        message = 'Acknowledgement pins different cause content';
      }
      if (message)
        diagnostics.push({
          severity: 'error',
          code: 'PRODUCT033',
          file: change.file,
          change: change.id,
          field: `unaffected[${i + 1}]`,
          target: typeof target === 'string' ? target : undefined,
          message,
        });
      else for (const match of matches) acknowledged.add(match);
    });
  return {
    causes,
    unresolved: causes.filter((cause) => !acknowledged.has(cause)),
    diagnostics: sortDiagnostics(diagnostics),
  };
}

export function unresolvedImpactDiagnostics(
  change: LoadedChange,
  causes: ImpactCause[],
  applying: boolean,
): Diagnostic[] {
  return causes.map((cause) => ({
    code: applying ? 'PRODUCT034' : 'PRODUCT029',
    severity: applying ? 'error' : 'warning',
    file: change.file,
    change: change.id,
    ...(cause.candidate ? { artifact: cause.candidate } : {}),
    target: cause.cause,
    field: cause.relationship,
    message: `${cause.disposition} ${cause.relationship} impact from ${cause.cause} is not accounted for`,
  }));
}
