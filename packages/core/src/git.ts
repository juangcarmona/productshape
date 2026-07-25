import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

async function git(root: string, args: string[]): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync('git', args, {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    });
    return stdout;
  } catch {
    return undefined;
  }
}

/** The current HEAD revision, or undefined outside a Git repository. */
export async function gitHead(root: string): Promise<string | undefined> {
  return (await git(root, ['rev-parse', 'HEAD']))?.trim();
}

/**
 * File content at a specific revision (repository-relative POSIX path),
 * or undefined when the revision or path cannot be resolved.
 */
export async function gitShow(
  root: string,
  revision: string,
  path: string,
): Promise<string | undefined> {
  return git(root, ['show', `${revision}:${path}`]);
}
