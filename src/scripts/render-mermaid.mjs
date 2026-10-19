#!/usr/bin/env node

import { access, mkdir, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { basename, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const args = process.argv.slice(2);
const inputArgument = args.indexOf('--input');
const outputArgument = args.indexOf('--output');
const input = resolve(
  root,
  inputArgument >= 0 ? args[inputArgument + 1] : 'src/public-site/diagrams',
);
const output = resolve(root, outputArgument >= 0 ? args[outputArgument + 1] : 'dist/mermaid');
const executable = join(
  root,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'mmdc.cmd' : 'mmdc',
);

try {
  await access(executable);
} catch {
  throw new Error(
    'Mermaid CLI is not installed. Run the workspace install before rendering diagrams.',
  );
}

await mkdir(output, { recursive: true });
const sources = (await readdir(input, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && extname(entry.name) === '.mmd')
  .map((entry) => entry.name)
  .sort();

for (const source of sources) {
  const result = spawnSync(
    executable,
    [
      '--input',
      join(input, source),
      '--output',
      join(output, `${basename(source, extname(source))}.svg`),
      '--outputFormat',
      'svg',
      '--quiet',
    ],
    { cwd: root, encoding: 'utf8', stdio: 'inherit' },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`Rendered ${sources.length} Mermaid source file(s) to ${output}.`);
