/**
 * The OpenSpec `product-change` schema shipped by this integration.
 *
 * The schema is a set of static assets (schema.yaml, templates, bridge scripts) bundled with the
 * package and installed into a consumer repository at `openspec/schemas/product-change/`. OpenSpec reads
 * project-local schemas from that directory natively; installing files there uses the framework's
 * official extension surface, exactly as merging guidance into `openspec/config.yaml` does.
 *
 * The assets are data. Loading them performs no repository writes; installation, verification and
 * removal live in `index.ts` beside the rest of the managed-surface lifecycle.
 */
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

/** The OpenSpec schema name (the directory key OpenSpec resolves). */
export const OPENSPEC_PRODUCT_CHANGE_SCHEMA_NAME = 'product-change';

/** The repository-relative directory the product schema is installed into. */
export const OPENSPEC_PRODUCT_CHANGE_SCHEMA_RELATIVE = 'openspec/schemas/product-change';

/**
 * The minimum OpenSpec CLI version the product workflow needs. Project-local schemas are far
 * older, but three 1.7.0 behaviours are load-bearing: `openspec new change` records
 * `skip_specs: true` for schemas with no specs artifact (so `openspec validate` stops demanding
 * delta specs), artifacts follow schema declaration order, and the generated skills stop
 * overriding custom-schema instructions with spec-driven patterns. Below this floor the schema
 * files are inert data: the citation lane keeps working and the product workflow is reported
 * unavailable, never broken.
 */
export const PRODUCT_CHANGE_SCHEMA_MIN_OPENSPEC = '1.7.0';

/** The separate hosted brownfield recovery workload. */
export const OPENSPEC_PRODUCT_RECOVERY_SCHEMA_NAME = 'product-recovery';
export const OPENSPEC_PRODUCT_RECOVERY_SCHEMA_RELATIVE = 'openspec/schemas/product-recovery';

/** One bundled product-schema file: its path relative to the installed schema directory. */
export interface ProductChangeSchemaAsset {
  relative: string;
  content: string;
}

/** The bundled asset directory, resolved from this module (both src/ and dist/ sit one level below the package root). */
function assetsDir(): string {
  return fileURLToPath(new URL('../assets/openspec-product-change-schema/', import.meta.url));
}

async function collectFiles(dir: string, prefix: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(join(dir, entry.name), relative)));
    } else if (entry.isFile()) {
      files.push(relative);
    }
  }
  return files;
}

/**
 * Load the bundled product-schema assets, sorted by relative path so installation, metadata and
 * comparison all see one deterministic order.
 */
export async function loadProductChangeSchemaAssets(): Promise<ProductChangeSchemaAsset[]> {
  const dir = assetsDir();
  const relatives = await collectFiles(dir, '');
  const assets: ProductChangeSchemaAsset[] = [];
  for (const relative of relatives.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))) {
    assets.push({
      relative,
      content: await readFile(join(dir, ...relative.split('/')), 'utf8'),
    });
  }
  return assets;
}

/** Load the bundled recovery schema assets using the same deterministic asset contract. */
export async function loadProductRecoverySchemaAssets(): Promise<ProductChangeSchemaAsset[]> {
  const dir = fileURLToPath(new URL('../assets/openspec-product-recovery-schema/', import.meta.url));
  const relatives = await collectFiles(dir, '');
  return Promise.all(
    relatives.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)).map(async (relative) => ({
      relative,
      content: await readFile(join(dir, ...relative.split('/')), 'utf8'),
    })),
  );
}
