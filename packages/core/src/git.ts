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
 * Whether a revision resolves to a commit in this repository, checked independently of any path.
 *
 * False outside a Git repository, in a shallow clone that does not carry the revision, or for a
 * revision that is missing or ambiguous. Callers that also look up a path at the revision (see
 * {@link gitShowBytes}) should check this first: it lets "the revision itself could not be
 * resolved" be told apart from "the revision resolved, but the file within it is absent or
 * differs", which are different findings and should not be reported as the same one.
 */
export async function gitRevisionExists(root: string, revision: string): Promise<boolean> {
  const result = await gitRaw(root, ['rev-parse', '--verify', '--quiet', `${revision}^{commit}`]);
  return result !== undefined;
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
