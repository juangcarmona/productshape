#!/usr/bin/env node

import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
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
const sourceDocuments = (await readdir(input, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && ['.md', '.markdown', '.mmd'].includes(extname(entry.name)))
  .sort((left, right) => left.name.localeCompare(right.name));
const sourceNames = [];

const puppeteerConfigDirectory = await mkdtemp(join(tmpdir(), 'productshape-mermaid-'));
const puppeteerConfigFile = join(puppeteerConfigDirectory, 'puppeteer.json');
await writeFile(
  puppeteerConfigFile,
  `${JSON.stringify({ args: ['--no-sandbox', '--disable-setuid-sandbox'] }, null, 2)}\n`,
);

try {
  for (const document of sourceDocuments) {
    const extension = extname(document.name);
    const authored = await readFile(join(input, document.name), 'utf8');
    const source =
      extension === '.mmd'
        ? authored.trim()
        : authored.match(/```mermaid\s*\r?\n([\s\S]*?)\r?\n```/u)?.[1]?.trim();
    if (!source) continue;
    const temporarySource = join(
      puppeteerConfigDirectory,
      `${basename(document.name, extension)}.mmd`,
    );
    await writeFile(temporarySource, `${source}\n`);
    sourceNames.push(document.name);
    const result = spawnSync(
      executable,
      [
        '--input',
        temporarySource,
        '--output',
        join(output, `${basename(document.name, extension)}.svg`),
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
      throw new Error(
        `Mermaid CLI failed for ${document.name} with exit code ${result.status ?? 1}.`,
      );
    }
  }
} finally {
  await rm(puppeteerConfigDirectory, { recursive: true, force: true });
}

console.log(`Rendered ${sourceNames.length} Mermaid source file(s) to ${output}.`);
