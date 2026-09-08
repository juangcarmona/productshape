import { access, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runInit, type CliIo, type InitCliOptions } from '@prodshape/cli';

/**
 * The three rules stated in resolveAiChoice, exercised end to end: an explicit --ai flag always
 * wins, an interactive terminal is asked and informed by the detection, and --dry-run prompts
 * nothing and decides nothing.
 */
describe('init AI provider selection', () => {
  let dir: string;
  const out: string[] = [];
  const asked: string[] = [];

  function io(answers: string[] = []): CliIo {
    const queue = [...answers];
    return {
      cwd: dir,
      out: (line) => out.push(line),
      err: () => {},
      prompt: async (question) => {
        asked.push(question);
        return queue.shift() ?? '';
      },
    };
  }

  function run(cliIo: CliIo, options: InitCliOptions = {}): Promise<number> {
    return runInit(cliIo, options);
  }

  /** The SDD and gitignore prompts share the queue; only the AI question is under test here. */
  function isAiQuestion(question: string): boolean {
    return question.includes('comma-separated') || question.includes('skills and commands');
  }

  async function exists(...segments: string[]): Promise<boolean> {
    try {
      await access(join(dir, ...segments));
      return true;
    } catch {
      return false;
    }
  }

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'prodshape-init-ai-'));
    out.length = 0;
    asked.length = 0;
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('reports the detection before the SDD block', async () => {
    await mkdir(join(dir, '.claude'), { recursive: true });
    await run(io(['n']));
    const aiLine = out.indexOf('AI providers:');
    const sddLine = out.indexOf('SDD frameworks:');
    expect(aiLine).toBeGreaterThanOrEqual(0);
    expect(aiLine).toBeLessThan(sddLine);
    expect(out).toContain('  detected: Claude Code (.claude/ present)');
  });

  it('says how .agents and .opencode overlap when both are present', async () => {
    await mkdir(join(dir, '.agents'), { recursive: true });
    await mkdir(join(dir, '.opencode'), { recursive: true });
    await run(io(['n']), { dryRun: true });
    expect(out).toContain(
      '  OpenCode reads .agents/skills too, so the two overlap on skills and differ on commands.',
    );
    expect(out).toContain('  detected: OpenCode (.opencode/ present; no ProductShape renderer)');
  });

  it('lets an explicit --ai flag win over the detection, without asking', async () => {
    await mkdir(join(dir, '.agents'), { recursive: true });
    await run(io(), { ai: 'claude' });
    expect(asked.filter(isAiQuestion)).toEqual([]);
    expect(await exists('.claude', 'skills', 'define-product', 'SKILL.md')).toBe(true);
    expect(await exists('.agents', 'skills', 'define-product', 'SKILL.md')).toBe(false);
  });

  it('prompts nothing and decides nothing under --dry-run', async () => {
    await mkdir(join(dir, '.claude'), { recursive: true });
    await run(io(), { dryRun: true });
    expect(asked).toEqual([]);

    expect(await exists('.claude', 'skills', 'define-product', 'SKILL.md')).toBe(false);
    expect(out).toContain('Dry run: nothing was changed.');
  });

  it('installs only the positions named in a comma-separated multi-select answer', async () => {
    await mkdir(join(dir, '.claude'), { recursive: true });
    await mkdir(join(dir, '.agents'), { recursive: true });
    await run(io(['2']));
    expect(asked).toContain('Choose [comma-separated, default all detected]: ');
    expect(await exists('.agents', 'skills', 'define-product', 'SKILL.md')).toBe(true);
    expect(await exists('.claude', 'skills', 'define-product', 'SKILL.md')).toBe(false);
  });

  it('takes every detected provider when the multi-select answer is empty', async () => {
    await mkdir(join(dir, '.claude'), { recursive: true });
    await mkdir(join(dir, '.agents'), { recursive: true });
    await run(io(['']));
    expect(await exists('.claude', 'skills', 'define-product', 'SKILL.md')).toBe(true);
    expect(await exists('.agents', 'skills', 'define-product', 'SKILL.md')).toBe(true);
  });

  it('offers the supported providers and defaults to skipping when none is detected', async () => {
    await run(io(['']));
    expect(out).toContain(
      'No AI provider detected. ProductShape can install its skills and commands for:',
    );
    expect(out).toContain('  4) Skip');
    expect(await exists('.claude', 'skills', 'define-product', 'SKILL.md')).toBe(false);
  });

  it('accepts a single detected provider with the default yes', async () => {
    await mkdir(join(dir, '.claude'), { recursive: true });
    await run(io(['']));
    expect(await exists('.claude', 'skills', 'define-product', 'SKILL.md')).toBe(true);
  });
});
