/**
 * Shared workspace helpers for the OpenSpec integration: workspace detection and the
 * child-process environment that lets a devDependency-installed OpenSpec CLI count as installed.
 */
import { access } from 'node:fs/promises';
import { join } from 'node:path';

/** Check whether a filesystem path exists. */
export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/** Check if an OpenSpec workspace exists at the given root (openspec/ directory present). */
export async function isOpenSpecWorkspace(root: string): Promise<boolean> {
  return pathExists(join(root, 'openspec'));
}

/**
 * Build a child-process environment whose PATH starts with the repository's node_modules/.bin,
 * so an OpenSpec installed as a devDependency counts as installed. Windows spells the variable
 * `Path` (and env objects lose the case-insensitive lookup once spread), so every casing is
 * collapsed into a single `PATH` entry.
 */
export function envWithLocalBin(root: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  const separator = process.platform === 'win32' ? ';' : ':';
  let existing = '';
  for (const key of Object.keys(env)) {
    if (key.toUpperCase() === 'PATH') {
      existing = env[key] ?? '';
      delete env[key];
    }
  }
  const localBin = join(root, 'node_modules', '.bin');
  env['PATH'] = existing ? `${localBin}${separator}${existing}` : localBin;
  return env;
}
