import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runCli } from '@prodshape/cli';
import { mergeIgnoreRules, missingIgnoreRules, requiredIgnoreRules } from '@prodshape/distribution';

const generatedRule = '.product/generated/';
const cacheRule = '.product/cache/';

async function run(argv: string[], cwd: string) {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runCli(argv, { cwd, out: (l) => out.push(l), err: (l) => err.push(l) });
  return { code, out: out.join('\n'), err: err.join('\n') };
}

async function readIfPresent(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return undefined;
  }
}

describe('ignore rule computation', () => {
  it('derives the generated rule from the configured root', () => {
    expect(requiredIgnoreRules('.product/generated')).toEqual([generatedRule, cacheRule]);
    expect(requiredIgnoreRules('build/product')).toEqual(['build/product/', cacheRule]);
  });

  it('collapses to one rule when the generated root is the cache directory', () => {
    expect(requiredIgnoreRules('.product/cache')).toEqual([cacheRule]);
  });

  it('recognises a rule already written in any equivalent form', () => {
    // The forms real repositories use, including the one this repository itself uses.
    for (const form of [
      '.product/generated',
      '.product/generated/',
      '/.product/generated',
      '**/.product/generated/',
      '.product/generated/**',
    ]) {
      expect(missingIgnoreRules(`${form}\n`, '.product/generated')).toEqual([cacheRule]);
    }
  });

  it('does not treat a comment or a negation as coverage', () => {
    const text = '# .product/generated/\n!.product/generated/\n';
    expect(missingIgnoreRules(text, '.product/generated')).toEqual([generatedRule, cacheRule]);
  });

  it('reports nothing missing once both rules are present', () => {
    expect(missingIgnoreRules(`${generatedRule}\n${cacheRule}\n`, '.product/generated')).toEqual(
      [],
    );
  });

  it('keeps existing content byte for byte and appends after it', () => {
    const existing = 'node_modules/\ndist/\n';
    const merged = mergeIgnoreRules(existing, [generatedRule, cacheRule]);
    expect(merged.startsWith(existing)).toBe(true);
    expect(merged).toContain(generatedRule);
    expect(merged.endsWith('\n')).toBe(true);
  });

  it('separates the added block from a file that does not end in a newline', () => {
    expect(mergeIgnoreRules('dist/', [generatedRule])).toContain('dist/\n\n#');
  });

  it('follows the file into CRLF rather than rewriting its line endings', () => {
    const merged = mergeIgnoreRules('node_modules/\r\ndist/\r\n', [generatedRule]);
    expect(merged).toContain(`${generatedRule}\r\n`);
    expect(merged.split('\n').every((line) => line === '' || line.endsWith('\r'))).toBe(true);
  });
});

describe('init and the ignore file', () => {
  it('writes nothing without an explicit request, and says what to add', async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'prodshape-ignore-default-'));
    try {
      const result = await run(['init'], scratch);
      expect(result.code).toBe(0);
      expect(await readIfPresent(join(scratch, '.gitignore'))).toBeUndefined();
      expect(result.out).toContain(`add ${generatedRule} and ${cacheRule} to .gitignore`);
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  });

  it('creates the file on request and states what to commit alongside it', async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'prodshape-ignore-create-'));
    try {
      const result = await run(['init', '--gitignore'], scratch);
      expect(result.code).toBe(0);
      const written = await readFile(join(scratch, '.gitignore'), 'utf8');
      expect(written).toContain(generatedRule);
      expect(written).toContain(cacheRule);
      // The advice line is replaced by the act, not printed alongside it.
      expect(result.out).not.toContain('or re-run with --gitignore');
      expect(result.out).toContain('Commit .product/config.yaml');
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  });

  it('appends to an existing file without disturbing a byte of it', async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'prodshape-ignore-append-'));
    try {
      const existing = 'node_modules/\n*.log\n';
      await writeFile(join(scratch, '.gitignore'), existing, 'utf8');
      const result = await run(['init', '--gitignore'], scratch);
      expect(result.code).toBe(0);
      const written = await readFile(join(scratch, '.gitignore'), 'utf8');
      expect(written.startsWith(existing)).toBe(true);
      expect(written).toContain(generatedRule);
      expect(result.out).toContain('Extended existing files');
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  });

  it('is idempotent: a second run changes nothing', async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'prodshape-ignore-idempotent-'));
    try {
      await run(['init', '--gitignore'], scratch);
      const afterFirst = await readFile(join(scratch, '.gitignore'), 'utf8');
      const second = await run(['init', '--gitignore'], scratch);
      expect(second.code).toBe(0);
      expect(await readFile(join(scratch, '.gitignore'), 'utf8')).toBe(afterFirst);
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  });

  it('adds only what is missing when one rule is already covered', async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'prodshape-ignore-partial-'));
    try {
      await writeFile(join(scratch, '.gitignore'), '**/.product/generated/\n', 'utf8');
      await run(['init', '--gitignore'], scratch);
      const written = await readFile(join(scratch, '.gitignore'), 'utf8');
      expect(written).toContain(cacheRule);
      // The rule already there is not restated in a second, redundant form.
      expect(written).not.toContain(`\n${generatedRule}`);
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  });

  it('follows a relocated generated root', async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'prodshape-ignore-relocated-'));
    try {
      await run(['init'], scratch);
      const configPath = join(scratch, '.product', 'config.yaml');
      const config = await readFile(configPath, 'utf8');
      await writeFile(configPath, config.replace('.product/generated', 'build/product'), 'utf8');
      await run(['init', '--gitignore'], scratch);
      const written = await readFile(join(scratch, '.gitignore'), 'utf8');
      expect(written).toContain('build/product/');
      expect(written).not.toContain(generatedRule);
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  });

  it('reports the write under --dry-run and performs none of it', async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'prodshape-ignore-dryrun-'));
    try {
      await writeFile(join(scratch, '.gitignore'), 'dist/\n', 'utf8');
      const result = await run(['init', '--gitignore', '--dry-run'], scratch);
      expect(result.code).toBe(0);
      expect(result.out).toContain('Would extend');
      expect(result.out).toContain('.gitignore');
      expect(await readFile(join(scratch, '.gitignore'), 'utf8')).toBe('dist/\n');
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  });

  it('reports an already-covered file as preserved rather than silently skipping it', async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'prodshape-ignore-covered-'));
    try {
      await writeFile(join(scratch, '.gitignore'), `${generatedRule}\n${cacheRule}\n`, 'utf8');
      const result = await run(['init', '--gitignore', '--dry-run'], scratch);
      expect(result.out).toContain('Would preserve');
      expect(result.out).toMatch(/Would preserve[\s\S]*\.gitignore/);
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  });

  it('asks an interactive terminal, and declining writes nothing', async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'prodshape-ignore-decline-'));
    try {
      const questions: string[] = [];
      const code = await runCli(['init'], {
        cwd: scratch,
        out: () => {},
        err: () => {},
        prompt: async (question) => {
          questions.push(question);
          return 'n';
        },
      });
      expect(code).toBe(0);
      expect(questions.some((q) => q.includes('.gitignore'))).toBe(true);
      expect(await readIfPresent(join(scratch, '.gitignore'))).toBeUndefined();
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  });

  it('accepts an empty answer as yes', async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'prodshape-ignore-accept-'));
    try {
      const code = await runCli(['init'], {
        cwd: scratch,
        out: () => {},
        err: () => {},
        prompt: async (question) => (question.includes('.gitignore') ? '' : 'n'),
      });
      expect(code).toBe(0);
      expect(await readFile(join(scratch, '.gitignore'), 'utf8')).toContain(generatedRule);
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  });

  it('does not ask when the rules are already covered', async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'prodshape-ignore-noask-'));
    try {
      await writeFile(join(scratch, '.gitignore'), `${generatedRule}\n${cacheRule}\n`, 'utf8');
      const questions: string[] = [];
      await runCli(['init'], {
        cwd: scratch,
        out: () => {},
        err: () => {},
        prompt: async (question) => {
          questions.push(question);
          return 'n';
        },
      });
      expect(questions.some((q) => q.includes('.gitignore'))).toBe(false);
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  });

  it('keeps the created count honest when it extends a file rather than creating one', async () => {
    // An append is not a creation: counting it as one would break the dry-run parity guarantee.
    const scratch = await mkdtemp(join(tmpdir(), 'prodshape-ignore-parity-'));
    try {
      await mkdir(scratch, { recursive: true });
      await writeFile(join(scratch, '.gitignore'), 'dist/\n', 'utf8');
      const dry = await run(['init', '--gitignore', '--dry-run'], scratch);
      const planned = Number(/Would create \((\d+)\)/.exec(dry.out)?.[1]);
      const real = await run(['init', '--gitignore'], scratch);
      const applied = Number(/\((\d+) file\(s\) created\)/.exec(real.out)?.[1]);
      expect(planned).toBe(applied);
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  });
});
