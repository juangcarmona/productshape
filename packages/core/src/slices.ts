import type { LoadedChange, LoadedSlice } from './changes.js';
import type { Diagnostic } from './diagnostics.js';
import type { ProductGraph } from './graph.js';

const requirementTypes = new Set(['functional-requirement', 'quality-requirement', 'constraint']);

interface ImplementsEntry {
  requirement?: string;
  coverage?: string;
  scope?: string;
}

export function sliceImplements(slice: LoadedSlice): ImplementsEntry[] {
  const value = slice.data.implements;
  return Array.isArray(value) ? (value as ImplementsEntry[]) : [];
}

export function sliceAffects(slice: LoadedSlice): string[] {
  const value = slice.data.affects;
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

function sliceDependsOn(slice: LoadedSlice): string[] {
  const value = slice.data['depends-on'];
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

/**
 * Deterministic slice validation against the owning change's overlay:
 * PRODUCT030 (foreign change), PRODUCT006/007 (references), PRODUCT031
 * (partial without scope), PRODUCT032 (dependency cycles).
 */
export function validateSlices(change: LoadedChange, overlayGraph: ProductGraph): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const sliceIds = new Set(change.slices.map((s) => s.id).filter(Boolean));

  for (const slice of change.slices) {
    const push = (diagnostic: Omit<Diagnostic, 'file' | 'artifact'>) =>
      diagnostics.push({ ...diagnostic, file: slice.file, artifact: slice.id });

    const declaredChange = slice.data['product-change'];
    if (typeof declaredChange === 'string' && change.id && declaredChange !== change.id) {
      push({
        severity: 'error',
        code: 'PRODUCT030',
        message: `Slice declares product-change '${declaredChange}' but lives in change '${change.id}'`,
        field: 'product-change',
        target: declaredChange,
      });
    }

    sliceImplements(slice).forEach((entry, index) => {
      if (typeof entry.requirement !== 'string') return;
      const node = overlayGraph.nodeById.get(entry.requirement);
      if (!node) {
        push({
          severity: 'error',
          code: 'PRODUCT006',
          message: `Implemented requirement '${entry.requirement}' does not resolve in the change overlay`,
          field: `implements.${index}.requirement`,
          target: entry.requirement,
        });
      } else if (!requirementTypes.has(node.type)) {
        push({
          severity: 'error',
          code: 'PRODUCT007',
          message: `'implements' must target a requirement or constraint; '${entry.requirement}' is a ${node.type}`,
          field: `implements.${index}.requirement`,
          target: entry.requirement,
        });
      }
      if (entry.coverage === 'partial' && (!entry.scope || entry.scope.trim() === '')) {
        push({
          severity: 'error',
          code: 'PRODUCT031',
          message: `Partial coverage of '${entry.requirement ?? 'requirement'}' requires a precise scope`,
          field: `implements.${index}.scope`,
        });
      }
    });

    for (const affected of sliceAffects(slice)) {
      if (!overlayGraph.nodeById.has(affected)) {
        push({
          severity: 'error',
          code: 'PRODUCT006',
          message: `Affected artifact '${affected}' does not resolve in the change overlay`,
          field: 'affects',
          target: affected,
        });
      }
    }

    for (const dependency of sliceDependsOn(slice)) {
      if (!sliceIds.has(dependency)) {
        push({
          severity: 'error',
          code: 'PRODUCT006',
          message: `Slice dependency '${dependency}' is not a slice of this change`,
          field: 'depends-on',
          target: dependency,
        });
      }
    }
  }

  // PRODUCT032: dependency cycles across the change's slices.
  const edges = new Map<string, string[]>();
  for (const slice of change.slices) {
    if (slice.id) edges.set(slice.id, sliceDependsOn(slice));
  }
  const inCycle = findCycleMembers(edges);
  for (const slice of change.slices) {
    if (slice.id && inCycle.has(slice.id)) {
      diagnostics.push({
        severity: 'error',
        code: 'PRODUCT032',
        message: `Slice '${slice.id}' participates in a depends-on cycle`,
        file: slice.file,
        artifact: slice.id,
        field: 'depends-on',
      });
    }
  }

  return diagnostics;
}

function findCycleMembers(edges: Map<string, string[]>): Set<string> {
  const members = new Set<string>();
  const visiting = new Set<string>();
  const done = new Set<string>();

  const visit = (id: string, stack: string[]): void => {
    if (done.has(id)) return;
    if (visiting.has(id)) {
      for (const member of stack.slice(stack.indexOf(id))) members.add(member);
      return;
    }
    visiting.add(id);
    for (const next of edges.get(id) ?? []) {
      if (edges.has(next)) visit(next, [...stack, next]);
    }
    visiting.delete(id);
    done.add(id);
  };

  for (const id of edges.keys()) visit(id, [id]);
  return members;
}
