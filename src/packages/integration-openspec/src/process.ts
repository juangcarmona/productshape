import crossSpawn from 'cross-spawn';

export interface CommandResult {
  stdout: string;
  stderr: string;
}

export interface RunCommandOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  maxBuffer?: number;
}

function renderCommand(command: string, args: string[]): string {
  return [command, ...args]
    .map((value) => (/^[A-Za-z0-9_./:@=+-]+$/.test(value) ? value : JSON.stringify(value)))
    .join(' ');
}

/**
 * Run one executable with an argument array and no shell interpolation.
 *
 * cross-spawn resolves Windows command shims and escapes their arguments while preserving native
 * executable spawning on POSIX. This keeps repository-local node_modules/.bin commands portable
 * without passing an argument array through `shell: true`.
 */
export function runCommand(
  command: string,
  args: string[],
  options: RunCommandOptions = {},
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const maxBuffer = options.maxBuffer ?? 10 * 1024 * 1024;
    const child = crossSpawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    let settled = false;

    const fail = (error: Error): void => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    const append = (stream: 'stdout' | 'stderr', chunk: string): void => {
      if (settled) return;
      if (stream === 'stdout') stdout += chunk;
      else stderr += chunk;
      if (Buffer.byteLength(stdout) + Buffer.byteLength(stderr) > maxBuffer) {
        child.kill();
        fail(
          new Error(`${renderCommand(command, args)} exceeded its ${maxBuffer}-byte output limit`),
        );
      }
    };

    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', (chunk: string) => append('stdout', chunk));
    child.stderr?.on('data', (chunk: string) => append('stderr', chunk));
    child.once('error', (error) => {
      fail(new Error(`Could not start ${renderCommand(command, args)}: ${error.message}`));
    });
    child.once('close', (code, signal) => {
      if (settled) return;
      if (code === 0) {
        settled = true;
        resolve({ stdout, stderr });
        return;
      }
      const status = code === null ? `signal ${signal ?? 'unknown'}` : `exit ${code}`;
      const detail = stderr.trim() || stdout.trim();
      fail(
        new Error(
          `${renderCommand(command, args)} failed with ${status}${detail ? `: ${detail}` : ''}`,
        ),
      );
    });
  });
}
