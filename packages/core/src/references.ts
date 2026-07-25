import { readFile } from 'node:fs/promises';
import { sep } from 'node:path';
import fg from 'fast-glob';
import { parse } from 'yaml';
import type { LoadedChange } from './changes.js';
import { toPosixRelative } from './model.js';
import { sliceAffects, sliceImplements } from './slices.js';

/** Active changes whose operations name the artifact. */
export function changesAffecting(changes: LoadedChange[], id: string): string[] {
  return changes
    .filter((change) =>
      [...change.operations.add, ...change.operations.modify, ...change.operations.remove].includes(
        id,
      ),
    )
    .map((change) => change.id ?? change.file)
    .sort();
}

/** Slices (across the given changes) implementing or affecting the artifact. */
export function slicesReferencing(changes: LoadedChange[], id: string): string[] {
  const result: string[] = [];
  for (const change of changes) {
    for (const slice of change.slices) {
      const implementsIt = sliceImplements(slice).some((e) => e.requirement === id);
      const affectsIt = sliceAffects(slice).includes(id);
      if ((implementsIt || affectsIt) && slice.id) result.push(slice.id);
    }
  }
  return result.sort();
}

export interface HandoffReference {
  file: string;
  handoffId: string;
}

/** Handoff documents in the repository referencing the artifact. */
export async function handoffsReferencing(
  repoRoot: string,
  id: string,
): Promise<HandoffReference[]> {
  const files = await fg('**/product-handoff.yaml', {
    cwd: repoRoot,
    absolute: true,
    ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
  });
  const references: HandoffReference[] = [];
  for (const file of files.map((f) => f.split('/').join(sep)).sort()) {
    try {
      const data = parse(await readFile(file, 'utf8')) as {
        id?: string;
        implements?: string[];
        affects?: string[];
        artifacts?: { id?: string }[];
      };
      const mentioned =
        data.implements?.includes(id) ||
        data.affects?.includes(id) ||
        data.artifacts?.some((a) => a.id === id);
      if (mentioned && data.id) {
        references.push({ file: toPosixRelative(repoRoot, file), handoffId: data.id });
      }
    } catch {
      // Unreadable handoff files are reported by handoff status, not here.
    }
  }
  return references;
}
