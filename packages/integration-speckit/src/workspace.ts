import { access } from 'node:fs/promises';
import { join } from 'node:path';

/** Check whether a path exists. */
export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Whether a Spec Kit workspace exists at the root. `specify init` creates `.specify/` (memory,
 * scripts, templates); feature specs land under `specs/` as features are specified. The marker
 * is `.specify/`, matching the detection registry in @prodshape/distribution: a repository can
 * be a Spec Kit workspace before its first feature exists.
 */
export async function isSpecKitWorkspace(root: string): Promise<boolean> {
  return pathExists(join(root, '.specify'));
}
