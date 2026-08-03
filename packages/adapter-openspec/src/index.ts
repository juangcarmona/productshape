import { access } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * The OpenSpec adapter locates OpenSpec change directories so that citation
 * verification can scan consumer documents in their native location.
 * It never touches native OpenSpec artifacts (proposal.md, design.md, tasks.md,
 * specs/) and never owns canonical product semantics.
 */

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/** Resolve an OpenSpec change directory (openspec/changes/<name>) or explain why not. */
export async function locateOpenSpecChange(
  root: string,
  name: string,
): Promise<{ dir: string } | { error: string }> {
  if (!(await exists(join(root, 'openspec')))) {
    return { error: `No openspec/ workspace found under ${root} (run: openspec init)` };
  }
  const dir = join(root, 'openspec', 'changes', name);
  if (!(await exists(dir))) {
    return { error: `OpenSpec change '${name}' not found at openspec/changes/${name}` };
  }
  return { dir };
}

