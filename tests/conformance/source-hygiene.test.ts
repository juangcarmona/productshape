import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { listFilesRecursive, repoRoot } from '../helpers.js';

/**
 * Source files must stay plain text. Twice now a literal U+0000 has been used as a map-key delimiter in
 * packages/core/src/snapshot.ts, which works at runtime but makes the file a *binary* file to grep,
 * ripgrep and GitHub's blob view — so the largest source file in the package silently stopped being
 * searchable. Both times it reached main. This is the guard that stops a third.
 */
describe('source hygiene', () => {
  it('contains no control characters that would make a source file unsearchable', async () => {
    const roots = ['packages', 'scripts', 'tests'];
    const offenders: string[] = [];
    for (const root of roots) {
      for (const file of await listFilesRecursive(join(repoRoot, root), '.ts')) {
        if (file.includes('node_modules') || file.includes('/dist/')) continue;
        const text = await readFile(file, 'utf8');
        for (let i = 0; i < text.length; i += 1) {
          const code = text.charCodeAt(i);
          // Everything below 0x20 except tab and newline, plus DEL.
          const forbidden = (code < 0x20 && code !== 0x09 && code !== 0x0a) || code === 0x7f;
          if (forbidden) {
            const where = code.toString(16).padStart(4, '0').toUpperCase();
            offenders.push(`${file.slice(repoRoot.length)} has U+${where} at offset ${i}`);
            break;
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

/*
 * The snapshot's client script is a String.raw template literal, so a backtick or a `${...}` placeholder
 * inside it changes what the generated page contains.
 *
 * Most such mistakes are loud: a stray backtick, or a placeholder naming something that does not exist,
 * fails to compile. The compiler blames the line that happens to follow rather than the character
 * responsible — which has cost two debugging rounds — but it does stop the build.
 *
 * The case this test exists for is the quiet one, confirmed by injecting it: a placeholder naming a real
 * module-scope binding, such as the stylesheet constant declared a few hundred lines above. It compiles
 * with zero errors and silently interpolates that value into the script every snapshot ships.
 */
describe('the snapshot client script', () => {
  it('contains no backtick or template placeholder that would end its own literal', async () => {
    const source = await readFile(join(repoRoot, 'packages/core/src/snapshot.ts'), 'utf8');
    const marker = 'const script = String.raw`';
    const start = source.indexOf(marker);
    expect(start, 'the client script literal').toBeGreaterThan(-1);
    const body = source.slice(start + marker.length);
    const end = body.indexOf('\n`');
    expect(end, 'the end of the client script literal').toBeGreaterThan(-1);
    const inner = body.slice(0, end);
    expect(inner.includes('`'), 'a backtick inside the client script').toBe(false);
    expect(inner.includes('${'), 'a template placeholder inside the client script').toBe(false);
  });
});
