import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

async function gitRaw(root: string, args: string[]): Promise<Buffer | undefined> {
  try {
    const { stdout } = await execFileAsync('git', args, {
      cwd: root,
      encoding: 'buffer',
      maxBuffer: 16 * 1024 * 1024,
    });
    return stdout;
  } catch {
    return undefined;
  }
}

async function git(root: string, args: string[]): Promise<string | undefined> {
  return (await gitRaw(root, args))?.toString('utf8');
}

/** The current HEAD revision, or undefined outside a Git repository. */
export async function gitHead(root: string): Promise<string | undefined> {
  return (await git(root, ['rev-parse', 'HEAD']))?.trim();
}

/**
 * File content at a specific revision (repository-relative POSIX path),
 * or undefined when the revision or path cannot be resolved.
 *
 * Decodes as UTF-8. To digest the result, use `gitShowBytes` instead: decoding first loses
 * invalid UTF-8 sequences, so the digest would not match the one computed from the file.
 */
export async function gitShow(
  root: string,
  revision: string,
  path: string,
): Promise<string | undefined> {
  return git(root, ['show', `${revision}:${path}`]);
}

/**
 * File bytes at a specific revision, or undefined when the revision or path cannot be resolved.
 * This is the form to digest, because it is what the revision actually holds.
 */
export async function gitShowBytes(
  root: string,
  revision: string,
  path: string,
): Promise<Buffer | undefined> {
  return gitRaw(root, ['show', `${revision}:${path}`]);
}
