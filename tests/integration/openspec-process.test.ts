import { access, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runCommand } from '../../packages/integration-openspec/src/process.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe('OpenSpec process execution', () => {
  it('passes shell metacharacters as one literal argument', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'prodshape-openspec-process-'));
    temporaryDirectories.push(dir);
    const marker = join(dir, 'shell-interpolation-ran');
    const argument = `literal; echo unsafe > ${marker}`;

    const result = await runCommand(
      process.execPath,
      ['-e', 'process.stdout.write(process.argv[1] ?? "")', argument],
      { cwd: dir },
    );

    expect(result).toEqual({ stdout: argument, stderr: '' });
    await expect(access(marker)).rejects.toThrow();
  });
});
