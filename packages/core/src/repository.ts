import { access } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import type { ProductConfig } from './config.js';
import { loadConfig } from './config.js';
import type { Diagnostic } from './diagnostics.js';
import { sortDiagnostics } from './diagnostics.js';
import type { ProductGraph } from './graph.js';
import { compileGraph } from './graph.js';
import type { LoadedArtifact } from './model.js';
import { loadModel } from './model.js';
import { SchemaRegistry } from './schema-registry.js';
import { validateModel } from './validate.js';

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Find the repository root by the configuration contract's discovery rule: inspect the invoked
 * directory and each parent for `.product/config.yaml`; the first file found wins and its
 * containing directory is the configuration root. When no configuration file exists, defaults
 * apply at the enclosing git repository root. Outside a git working tree there is no root, and
 * an invocation that needs repository configuration fails as invalid configuration.
 */
export async function findRepositoryRoot(cwd: string): Promise<string | undefined> {
  let current = resolve(cwd);
  for (;;) {
    if (await exists(join(current, '.product', 'config.yaml'))) return current;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  current = resolve(cwd);
  for (;;) {
    if (await exists(join(current, '.git'))) return current;
    const parent = dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

export interface ProductRepository {
  root: string;
  config: ProductConfig;
  configDiagnostics: Diagnostic[];
  registry: SchemaRegistry;
  modelDir: string;
  changesDir: string;
  generatedDir: string;
  /** Optional host-owned root for recovery bookkeeping. Defaults to prodshape.generated.root. */
  recoveryRoot?: string;
}

/** Open a repository: resolve configuration and the schema registry. */
export async function openRepository(root: string): Promise<ProductRepository> {
  const configPath = join(root, '.product', 'config.yaml');
  const { config, diagnostics } = await loadConfig(configPath, '.product/config.yaml');
  const registry = await SchemaRegistry.loadBundled();
  return {
    root,
    config,
    configDiagnostics: diagnostics,
    registry,
    modelDir: join(root, ...config.product.model.split('/')),
    changesDir: join(root, ...config.product.changes.split('/')),
    generatedDir: join(root, ...config.prodshape.generated.root.split('/')),
  };
}

export interface BaselineValidation {
  artifacts: LoadedArtifact[];
  graph: ProductGraph;
  diagnostics: Diagnostic[];
}

/**
 * Load the baseline model, compile its graph and run full validation.
 *
 * The baseline is the accepted Product Definition alone: `loadModel` reads the model directory,
 * so live changes and the inert archives under `changes/` take no part in the graph, in duplicate
 * detection or in reference resolution.
 */
export async function validateBaseline(repo: ProductRepository): Promise<BaselineValidation> {
  const model = await loadModel(repo.modelDir, repo.root, repo.registry);
  const graph = compileGraph(model.artifacts);
  const diagnostics = sortDiagnostics([
    ...model.diagnostics,
    ...validateModel(model.artifacts, graph),
  ]);
  return { artifacts: model.artifacts, graph, diagnostics };
}
