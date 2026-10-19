#!/usr/bin/env node

import { access, mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
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

const puppeteerConfigDirectory = await mkdtemp(join(tmpdir(), 'productshape-mermaid-'));
const puppeteerConfigFile = join(puppeteerConfigDirectory, 'puppeteer.json');
await writeFile(
  puppeteerConfigFile,
  `${JSON.stringify({ args: ['--no-sandbox', '--disable-setuid-sandbox'] }, null, 2)}\n`,
);

try {
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
        '--puppeteerConfigFile',
        puppeteerConfigFile,
        '--quiet',
      ],
      {
        cwd: root,
        encoding: 'utf8',
        stdio: 'inherit',
        shell: process.platform === 'win32',
      },
    );
    if (result.status !== 0) {
      throw new Error(`Mermaid CLI failed for ${source} with exit code ${result.status ?? 1}.`);
    }
  }
} finally {
  await rm(puppeteerConfigDirectory, { recursive: true, force: true });
}

console.log(`Rendered ${sources.length} Mermaid source file(s) to ${output}.`);
