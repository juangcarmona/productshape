#!/usr/bin/env node
// MANAGED FILE. Installed by `prodshape integration add openspec` as part of the OpenSpec product
// schema. Deterministic overlay preflight for a hosted Product Change: the validation logic lives
// in @prodshape/integration-openspec; this script only resolves the local installation, invokes it
// and reports. It writes nothing.
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import process from 'node:process';

const scriptDir = dirname(fileURLToPath(import.meta.url));
// openspec/schemas/product-change/scripts sits four levels below the repository root.
const defaultRoot = resolve(scriptDir, '..', '..', '..', '..');

function usage(message) {
  console.error(message);
  console.error(
    'Usage: node openspec/schemas/product-change/scripts/product-validate.mjs --change <name> [--root <dir>]',
  );
  process.exit(2);
}

function parseArgs(argv) {
  const args = { change: undefined, root: undefined };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--change') {
      args.change = argv[(i += 1)];
    } else if (arg === '--root') {
      args.root = argv[(i += 1)];
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
const result = await integration.validateOpenSpecProductChange(repoRoot, args.change);
printDiagnostics(result.diagnostics);
if (result.blocking.length > 0) {
  const count = result.blocking.length;
  console.log(`Overlay validation: FAIL (${count} blocking diagnostic${count === 1 ? '' : 's'}).`);
  process.exit(1);
}
console.log('Overlay validation: PASS.');
