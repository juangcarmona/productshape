import type { LoadedChange } from './changes.js';
import type { ProductConfig } from './config.js';
import type { Diagnostic } from './diagnostics.js';
import { sortDiagnostics } from './diagnostics.js';
import type { ProductGraph } from './graph.js';
import { compileGraph } from './graph.js';
import type { LoadedArtifact } from './model.js';
import { validateSlices } from './slices.js';
import { validateModel } from './validate.js';

/**
 * Apply a Product Change's operations to the baseline artifact list.
 * Pure: baseline files are never touched; the result is a new list.
 */
export function applyOverlay(baseline: LoadedArtifact[], change: LoadedChange): LoadedArtifact[] {
  const removed = new Set(change.operations.remove);
  const modified = new Set(change.operations.modify);
  const overlay = baseline.filter(
    (artifact) => !artifact.id || (!removed.has(artifact.id) && !modified.has(artifact.id)),
  );
  overlay.push(...change.proposed);
  return overlay;
}

/** Operation-level errors: PRODUCT020-022 and PRODUCT026. */
export function validateOperations(change: LoadedChange, baseline: LoadedArtifact[]): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const baselineIds = new Set(baseline.map((a) => a.id).filter(Boolean));
  const artifactId = change.id;

  for (const id of change.operations.add) {
    if (baselineIds.has(id)) {
      diagnostics.push({
        severity: 'error',
        code: 'PRODUCT020',
        message: `Addition '${id}' already exists in the baseline`,
        file: change.file,
        artifact: artifactId,
        field: 'operations.add',
        target: id,
      });
    }
  }
  for (const id of change.operations.modify) {
    if (!baselineIds.has(id)) {
      diagnostics.push({
        severity: 'error',
        code: 'PRODUCT021',
        message: `Modification target '${id}' does not exist in the baseline`,
        file: change.file,
        artifact: artifactId,
        field: 'operations.modify',
        target: id,
      });
    }
  }
  for (const id of change.operations.remove) {
    if (!baselineIds.has(id)) {
      diagnostics.push({
        severity: 'error',
        code: 'PRODUCT022',
        message: `Removal target '${id}' does not exist in the baseline`,
        file: change.file,
        artifact: artifactId,
        field: 'operations.remove',
        target: id,
      });
    }
  }

  // PRODUCT026: proposed/ and operations must match in both directions.
  const declared = new Set([...change.operations.add, ...change.operations.modify]);
  const proposedIds = new Set(change.proposed.map((a) => a.id).filter(Boolean));
  for (const artifact of change.proposed) {
    if (artifact.id && !declared.has(artifact.id)) {
      diagnostics.push({
        severity: 'error',
        code: 'PRODUCT026',
        message: `Proposed artifact '${artifact.id}' is not listed in operations.add or operations.modify`,
        file: artifact.file,
        artifact: artifact.id,
      });
    }
  }
  for (const id of declared) {
    if (!proposedIds.has(id)) {
      diagnostics.push({
        severity: 'error',
        code: 'PRODUCT026',
        message: `Operation on '${id}' has no proposed future-state artifact under proposed/`,
        file: change.file,
        artifact: artifactId,
        target: id,
      });
    }
  }

  return diagnostics;
}

/** PRODUCT025: overlapping modify/remove operations across concurrent active changes. */
export function validateConcurrency(
  change: LoadedChange,
  otherChanges: LoadedChange[],
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const touched = new Set([...change.operations.modify, ...change.operations.remove]);
  for (const other of otherChanges) {
    if (other.id === change.id) continue;
    const overlap = [...other.operations.modify, ...other.operations.remove].filter((id) =>
      touched.has(id),
    );
    for (const id of [...new Set(overlap)].sort()) {
      diagnostics.push({
        severity: 'error',
        code: 'PRODUCT025',
        message: `'${id}' is also modified or removed by concurrent change '${other.id ?? other.file}'`,
        file: change.file,
        artifact: change.id,
        target: id,
      });
    }
  }
  return diagnostics;
}

/** PRODUCT108: approved (or later) change with unresolved open questions. */
export function validateOpenQuestions(change: LoadedChange): Diagnostic[] {
  const statusesRequiringResolution = new Set(['approved', 'in-progress', 'implemented']);
  if (!change.status || !statusesRequiringResolution.has(change.status)) return [];
  const section = /##\s+Open Questions\s*\n([\s\S]*?)(?=\n##\s|$)/.exec(change.body);
  const sectionBody = section?.[1] ?? '';
  const hasListEntries = /^\s*[-*]\s+\S/m.test(sectionBody);
  if (!hasListEntries) return [];
  return [
    {
      severity: 'warning',
      code: 'PRODUCT108',
      message: `Change is '${change.status}' but its Open Questions section still lists unresolved questions`,
      file: change.file,
      artifact: change.id,
    },
  ];
}

export interface ChangeValidation {
  overlayArtifacts: LoadedArtifact[];
  overlayGraph: ProductGraph;
  diagnostics: Diagnostic[];
}

/**
 * Full Product Change validation: per-document diagnostics, operation errors,
 * concurrency, the overlay graph revalidated end to end, and slice validation.
 * Overlay-context recodes: duplicates become PRODUCT023, dangling references
 * caused by removals become PRODUCT024.
 */
export function validateChange(
  change: LoadedChange,
  baseline: LoadedArtifact[],
  otherChanges: LoadedChange[],
  config: ProductConfig,
): ChangeValidation {
  const overlayArtifacts = applyOverlay(baseline, change);
  const overlayGraph = compileGraph(overlayArtifacts);
  const removed = new Set(change.operations.remove);

  const overlayDiagnostics = validateModel(overlayArtifacts, overlayGraph, { config }).map(
    (diagnostic): Diagnostic => {
      if (diagnostic.code === 'PRODUCT005') {
        return {
          ...diagnostic,
          code: 'PRODUCT023',
          message: `Overlay produces duplicate IDs: ${diagnostic.message}`,
        };
      }
      if (diagnostic.code === 'PRODUCT006' && diagnostic.target && removed.has(diagnostic.target)) {
        return {
          ...diagnostic,
          code: 'PRODUCT024',
          message: `Removal of '${diagnostic.target}' leaves a dangling reference`,
        };
      }
      return diagnostic;
    },
  );

  const diagnostics = sortDiagnostics([
    ...change.diagnostics,
    ...validateOperations(change, baseline),
    ...validateConcurrency(change, otherChanges),
    ...validateOpenQuestions(change),
    ...overlayDiagnostics,
    ...validateSlices(change, overlayGraph),
  ]);

  return { overlayArtifacts, overlayGraph, diagnostics };
}
