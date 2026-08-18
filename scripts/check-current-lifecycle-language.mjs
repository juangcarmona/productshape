#!/usr/bin/env node

import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// These are deliberate current-product and primary-guidance surfaces. Historical Product Changes,
// ADRs, changelogs and migration notes are not scanned: they must remain able to explain the past.
const targets = [
  'README.md',
  'package.json',
  'packages/cli/README.md',
  'docs/product/model',
  'docs/product/README.md',
  'docs/methodology',
  'docs/adoption',
  'docs/architecture/overview.md',
  'templates',
  'commands',
  'skills',
  'packages/distribution/src/init.ts',
  'packages/core/src/recovery-session.ts',
  'packages/integration-openspec/src/index.ts',
  'openspec/config.yaml',
  'openspec/specs',
];

const excluded = [
  /^docs\/product\/changes\//,
  /^docs\/architecture\/decisions\//,
  /^docs\/migrations?\//,
  /(^|\/)CHANGELOG(?:\.[^/]*)?$/i,
];

// Keep these rules narrow and semantic. Generic words such as "slice" and "handoff" remain valid
// English; only the retired named concepts, commands and known PR-equivalence formulations fail.
const retiredSemantics = [
  { name: 'Delivery Slice concept', pattern: /\bDelivery Slices?\b/gi },
  { name: 'Product Handoff concept', pattern: /\bProduct Handoffs?\b/gi },
  { name: 'Product Context concept', pattern: /\bProduct Context(?: documents?)?\b/gi },
  {
    name: 'retired lifecycle document kind',
    pattern: /\b(?:delivery-slice|product-handoff|product-context)s?\b/gi,
  },
  { name: 'retired lifecycle command', pattern: /\bps:(?:slice|handoff)\b/gi },
  { name: 'promotion lifecycle language', pattern: /\b(?:promot(?:e|es|ed|ing)|promotions?)\b/gi },
  { name: 'change-as-PR formulation', pattern: /\bchange-as-PR\b/gi },
  {
    name: 'Product Change equated with a pull request',
    pattern:
      /\b(?:Product )?Changes? (?:is|are|as) (?:a |the )?(?:native )?(?:pull requests?|PRs?)\b/gi,
  },
  {
    name: 'pull request authored as the change',
    pattern:
      /\b(?:authoring a pull request|change \(a pull request\)|definition evolves through pull requests?)\b/gi,
  },
  {
    name: 'direct initial-baseline authoring',
    pattern:
      /\b(?:author your initial product model under docs\/product\/model|initial product baseline may be established directly)\b/gi,
  },
  { name: 'retired delivery status schema', pattern: /\bdeliverySliceStatus\b/g },
];

function repositoryPath(path) {
  return relative(repositoryRoot, path).split('\\').join('/');
}

function isExcluded(path) {
  const rel = repositoryPath(path);
  return excluded.some((pattern) => pattern.test(rel));
}

async function collect(path) {
  if (isExcluded(path)) return [];
  const details = await stat(path);
  if (details.isFile()) return [path];

  const entries = await readdir(path, { withFileTypes: true });
  const nested = await Promise.all(
    entries
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((entry) => collect(resolve(path, entry.name))),
  );
  return nested.flat();
}

const files = (
  await Promise.all(targets.map((target) => collect(resolve(repositoryRoot, target))))
).flat();
const findings = [];

for (const file of files) {
  const lines = (await readFile(file, 'utf8')).split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    // A current index may link to an excluded historical record; ignore the link destination while
    // still scanning its visible current description.
    const scannableLine = line.replace(/\((?:[^)]*\/)?(?:decisions|migrations?)\/[^)]*\)/gi, '()');
    for (const semantic of retiredSemantics) {
      semantic.pattern.lastIndex = 0;
      const match = semantic.pattern.exec(scannableLine);
      if (match !== null) {
        findings.push({
          file: repositoryPath(file),
          line: index + 1,
          semantic: semantic.name,
          text: match[0],
        });
      }
    }
  }
}

if (findings.length > 0) {
  console.error('Retired Product Change lifecycle language found in current surfaces:');
  for (const finding of findings) {
    console.error(
      `  ${finding.file}:${finding.line} [${finding.semantic}] ${JSON.stringify(finding.text)}`,
    );
  }
  process.exitCode = 1;
} else {
  console.log(`Current lifecycle language check passed across ${files.length} files.`);
}
