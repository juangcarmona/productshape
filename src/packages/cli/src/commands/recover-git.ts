import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { LoadedRecoverySession, ProductRepository, RecoveryBrief } from '@prodshape/core';
import { CliError, exitCodes, type CliIo } from '../context.js';

const run = promisify(execFile);

/**
 * Opt-in git discipline for recovery sessions (FR-RECOVER-001): when the brief declares
 * `git.branch`, the session runs on that dedicated branch and every state-mutating recover
 * command records a checkpoint commit. Without the declaration, nothing here ever runs and the
 * tool never touches git.
 *
 * The commits are checkpoints of the session's own output (candidates, change document, session
 * state), never an apply, merge, push or acceptance; those stay human, and stay forbidden.
 */

async function git(root: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await run('git', args, { cwd: root });
    return stdout.trim();
  } catch (error) {
    const stderr =
      typeof (error as { stderr?: unknown }).stderr === 'string'
        ? ((error as { stderr: string }).stderr ?? '').trim()
        : '';
    throw new CliError(
      `git ${args[0]} failed${stderr ? `: ${stderr}` : ''} (recovery git discipline needs a working git repository)`,
      exitCodes.invalidInvocation,
    );
  }
}

/** The brief's git declaration, or undefined when the session opted out. */
export function gitDiscipline(brief: RecoveryBrief): { branch: string } | undefined {
  return brief.git;
}

/**
 * Put the repository on the declared recovery branch before the session starts.
 *
 * Creates the branch at the current commit; an already-checked-out declared branch is fine
 * (resuming). Anything else refuses: an existing branch would silently mix histories, and
 * modified tracked files would smuggle unrelated work into the first checkpoint. Untracked
 * files are allowed: the brief itself is usually one of them, and the first checkpoint is
 * exactly where it belongs.
 */
export async function ensureRecoveryBranch(io: CliIo, root: string, branch: string): Promise<void> {
  const current = await git(root, ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (current === branch) return;

  const existing = await run('git', ['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`], {
    cwd: root,
  }).then(
    () => true,
    () => false,
  );
  if (existing) {
    throw new CliError(
      `Branch '${branch}' already exists; check it out (or declare a different git.branch) before starting`,
      exitCodes.invalidInvocation,
    );
  }

  const status = await git(root, ['status', '--porcelain']);
  const trackedDirty = status
    .split('\n')
    .filter((line) => line.length > 0 && !line.startsWith('??'));
  if (trackedDirty.length > 0) {
    throw new CliError(
      `The working tree has ${trackedDirty.length} modified tracked file(s); commit or stash them so the recovery branch starts clean`,
      exitCodes.invalidInvocation,
    );
  }

  await git(root, ['switch', '-c', branch]);
  io.out(`Created recovery branch '${branch}'.`);
}

/**
 * Record one checkpoint commit for a completed recovery step, when the session opted in.
 * A step that changed nothing on disk records nothing; the message convention
 * `recover(<change-id>): <step>` keeps the branch history readable as the session log.
 */
export async function checkpoint(
  io: CliIo,
  repo: ProductRepository,
  session: LoadedRecoverySession,
  step: string,
): Promise<void> {
  const discipline = gitDiscipline(session.state.brief);
  if (discipline === undefined) return;

  const root = repo.root;
  const current = await git(root, ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (current !== discipline.branch) {
    throw new CliError(
      `The session declares recovery branch '${discipline.branch}' but HEAD is on '${current}'; switch back before continuing`,
      exitCodes.invalidInvocation,
    );
  }

  const status = await git(root, ['status', '--porcelain']);
  if (status.length === 0) return;

  await git(root, ['add', '-A']);
  const message = `recover(${session.state.changeId}): ${step}`;
  await git(root, ['commit', '-m', message]);
  io.out(`Checkpoint: ${message}`);
}
