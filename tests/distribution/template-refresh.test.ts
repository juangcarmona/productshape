import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runCli } from '@prodshape/cli';
import { loadBundledAssets, planTemplateRefresh } from '@prodshape/distribution';
import { shippedTemplateDigests } from '../../src/packages/distribution/src/template-history.js';
import { fileDigest } from '../../src/packages/distribution/src/lock.js';

/** `.product/templates/use-case.md` exactly as `@prodshape/cli@0.22.1` installed it. */
const shipped = fileURLToPath(
  new URL('../fixtures/shipped-templates/use-case-0.22.1.md', import.meta.url),
);

let dir: string;

async function run(argv: string[]) {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runCli(argv, { cwd: dir, out: (l) => out.push(l), err: (l) => err.push(l) });
  return { code, out: out.join('\n'), err: err.join('\n') };
}

const path = (name: string) => join(dir, '.product', 'templates', name);
const bundled = async (name: string) =>
  (await loadBundledAssets()).templates.find((t) => t.name === name)?.content as string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'prodshape-template-refresh-'));
  expect((await run(['init', '--full'])).code).toBe(0);
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('template history', () => {
  it('records the 0.22.1 use-case template, and never the current one', async () => {
    const old = fileDigest(await readFile(shipped, 'utf8'));
    expect(shippedTemplateDigests['use-case.md']).toContain(old);
    for (const template of (await loadBundledAssets()).templates) {
      expect(shippedTemplateDigests[template.name] ?? []).not.toContain(
        fileDigest(template.content),
      );
    }
  });

  it('ships no template whose example ID carries a numeric suffix', async () => {
    for (const template of (await loadBundledAssets()).templates) {
      expect(template.content, template.name).not.toMatch(/\b[A-Z]+-EXAMPLE(-[A-Z]+)*-\d+\b/);
    }
  });
});

describe('integration update refreshes installed templates', () => {
  it('replaces an untouched copy of an earlier release with the current template', async () => {
    await writeFile(path('use-case.md'), await readFile(shipped, 'utf8'), 'utf8');
    expect((await planTemplateRefresh(dir)).outdated).toEqual(['.product/templates/use-case.md']);

    const result = await run(['integration', 'update']);
    expect(result.code).toBe(0);
    expect(result.out).toContain('Refreshed 1 authoring template(s)');
    const now = await readFile(path('use-case.md'), 'utf8');
    expect(now).toBe(await bundled('use-case.md'));
    expect(now).not.toContain('UC-EXAMPLE-001');
  });

  it('keeps a customized template and says how to compare or replace it', async () => {
    const custom = `${await bundled('use-case.md')}\n<!-- our team's addition -->\n`;
    await writeFile(path('use-case.md'), custom, 'utf8');

    const result = await run(['integration', 'update']);
    expect(result.code).toBe(0);
    expect(result.out).toContain('Kept 1 customized authoring template(s)');
    expect(await readFile(path('use-case.md'), 'utf8')).toBe(custom);
  });

  it('replaces a customized template only with --force', async () => {
    await writeFile(path('use-case.md'), 'custom\n', 'utf8');
    const result = await run(['integration', 'update', '--force']);
    expect(result.code).toBe(0);
    expect(await readFile(path('use-case.md'), 'utf8')).toBe(await bundled('use-case.md'));
  });

  it('treats a CRLF checkout of an earlier release as untouched', async () => {
    const crlf = (await readFile(shipped, 'utf8')).replace(/\n/g, '\r\n');
    await writeFile(path('use-case.md'), crlf, 'utf8');
    await run(['integration', 'update']);
    expect(await readFile(path('use-case.md'), 'utf8')).toBe(await bundled('use-case.md'));
  });

  it('does not install templates a repository never had', async () => {
    await rm(join(dir, '.product', 'templates'), { recursive: true, force: true });
    const result = await run(['integration', 'update']);
    expect(result.code).toBe(0);
    await expect(stat(path('use-case.md'))).rejects.toThrow();
  });

  it('changes nothing when the templates are already current', async () => {
    const before = await readFile(path('use-case.md'), 'utf8');
    const result = await run(['integration', 'update']);
    expect(result.out).not.toContain('Refreshed');
    expect(result.out).not.toContain('Kept');
    expect(await readFile(path('use-case.md'), 'utf8')).toBe(before);
  });
});

describe('doctor', () => {
  it('reports an outdated template informationally, with the command that refreshes it', async () => {
    await writeFile(path('use-case.md'), await readFile(shipped, 'utf8'), 'utf8');
    const result = await run(['doctor']);
    expect(result.out).toContain(
      'ok   authoring templates: 11 authoring template(s) present; 1 from an earlier release (run: prodshape integration update)',
    );
  });
});
