#!/usr/bin/env node
// MANAGED FILE. Installed by `prodshape integration add openspec` as part of the OpenSpec product
// schema. The executable bridge from the schema's apply instruction to the deterministic apply
// rail: the apply logic lives in @prodshape/integration-openspec (applyOpenSpecProductChange);
// this script only resolves the local installation, invokes it and reports. It revalidates the
// overlay at apply time, refuses with the model untouched on any blocking diagnostic, requires
// the apply-authorised state (status: approved) and never archives the change.
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import process from 'node:process';

const scriptDir = dirname(fileURLToPath(import.meta.url));
// openspec/schemas/product-change/scripts sits four levels below the repository root.
const defaultRoot = resolve(scriptDir, '..', '..', '..', '..');

function usage(message) {
  console.error(message);
  console.error(
    'Usage: node openspec/schemas/product-change/scripts/product-apply.mjs --change <name> [--dry-run] [--root <dir>]',
  );
  process.exit(2);
}

function parseArgs(argv) {
  const args = { change: undefined, root: undefined, dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--change') {
      args.change = argv[(i += 1)];
    } else if (arg === '--root') {
      args.root = argv[(i += 1)];
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else {
      usage(`Unknown argument: ${arg}`);
    }
  }
  if (!args.change) usage('Missing --change <name>.');
  return args;
}

async function loadIntegration() {
  const override = process.env.PRODSHAPE_INTEGRATION_OPENSPEC_ENTRY;
  if (override) {
    const url = override.startsWith('file:') ? override : pathToFileURL(resolve(override)).href;
    return import(url);
  }
  try {
    return await import('@prodshape/integration-openspec');
  } catch (error) {
    console.error('Could not resolve @prodshape/integration-openspec from this repository.');
    console.error('The product workflow bridge needs the integration package installed locally:');
    console.error('  npm install --save-dev @prodshape/integration-openspec');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(2);
  }
}

function printDiagnostics(diagnostics) {
  for (const diagnostic of diagnostics) {
    const attrs = ['artifact', 'change', 'field', 'target', 'line', 'entry']
      .filter((key) => diagnostic[key] !== undefined)
      .map((key) => `${key}=${diagnostic[key]}`)
      .join(' ');
    console.log(
      `${diagnostic.severity} ${diagnostic.code} ${diagnostic.file}${attrs ? ` ${attrs}` : ''}: ${diagnostic.message}`,
    );
  }
}

const args = parseArgs(process.argv.slice(2));
const repoRoot = args.root ? resolve(args.root) : defaultRoot;
const integration = await loadIntegration();
const result = await integration.applyOpenSpecProductChange(repoRoot, args.change, {
  dryRun: args.dryRun,
});
printDiagnostics(result.plan.diagnostics);
if (result.outcome === 'refused') {
  console.log('Apply refused; docs/product/model untouched.');
  process.exit(1);
}
for (const action of result.plan.actions) {
  console.log(`${action.kind}: ${action.description}`);
}
const { added, modified, removed } = result.plan.diff;
console.log(
  `Product diff: ${added.length} added, ${modified.length} modified, ${removed.length} removed.`,
);
if (result.outcome === 'dry-run') {
  console.log('Dry run; nothing was written.');
  process.exit(0);
}
const resultingErrors = (result.resultingModel?.diagnostics ?? []).filter(
  (diagnostic) => diagnostic.severity === 'error',
);
if (resultingErrors.length > 0) {
  printDiagnostics(resultingErrors);
  console.log(
    'Applied, but the resulting accepted model reports errors. Investigate before archiving.',
  );
  process.exit(1);
}
console.log(
  'Applied. Nothing was committed and the change was not archived: verify the model, then archive separately.',
);
