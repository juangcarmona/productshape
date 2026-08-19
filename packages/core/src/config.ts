import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import type { Diagnostic } from './diagnostics.js';

export interface ProductConfig {
  schema: string;
  product: {
    root: string;
    model: string;
    changes: string;
  };
  generated: {
    root: string;
    commit: boolean;
  };
  integrations: {
    ai: string[];
    /**
     * Emit `/ps:<name>` shorthand aliases alongside the canonical `/product:<name>` commands.
     * Off by default: for a single-assistant repository the aliases double the prompt namespace
     * without adding a capability.
     *
     * A persisted setting rather than only an `init` flag, because `integration update`
     * re-renders from configuration and would otherwise undo the choice.
     */
    'shorthand-commands': boolean;
  };
  validation: {
    'warnings-as-errors': boolean;
    'require-journey-for-use-case': boolean;
    'require-requirement-reachability': boolean;
  };
  citations: {
    /**
     * Repository-relative directories `citations verify` scans when no target is given.
     *
     * Configurable because where consumer documents live is a repository's decision, not the
     * kernel's: an OpenSpec repository keeps them under `openspec/`, another keeps them under
     * `specs/`, and a hardcoded default silently verifies nothing in the second case. The default
     * stays `openspec` so existing repositories are unaffected.
     */
    'consumer-roots': string[];
  };
}

export const configSchemaId = 'product-definition-as-code/config/v1alpha1';

export function defaultConfig(): ProductConfig {
  return {
    schema: configSchemaId,
    product: {
      root: 'docs/product',
      model: 'docs/product/model',
      changes: 'docs/product/changes',
    },
    generated: {
      root: '.product/generated',
      commit: false,
    },
    integrations: {
      ai: [],
      'shorthand-commands': false,
    },
    validation: {
      'warnings-as-errors': false,
      'require-journey-for-use-case': false,
      'require-requirement-reachability': true,
    },
    citations: {
      'consumer-roots': ['openspec'],
    },
  };
}

const knownTopLevelKeys = new Set([
  'schema',
  'product',
  'generated',
  'integrations',
  'validation',
  'citations',
]);

export interface ConfigResult {
  config: ProductConfig;
  diagnostics: Diagnostic[];
}

/** Parse and validate configuration content. Unknown top-level keys are rejected (PRODUCT050). */
export function parseConfig(content: string, file: string): ConfigResult {
  const config = defaultConfig();
  const diagnostics: Diagnostic[] = [];
  const error = (message: string, field?: string) =>
    diagnostics.push({ severity: 'error', code: 'PRODUCT050', message, file, field });

  let data: unknown;
  try {
    data = parse(content);
  } catch (cause) {
    error(
      `Configuration is not valid YAML: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
    return { config, diagnostics };
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    error('Configuration must be a YAML mapping');
    return { config, diagnostics };
  }

  const record = data as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!knownTopLevelKeys.has(key)) error(`Unknown top-level configuration key '${key}'`, key);
  }

  if (record.schema !== undefined && record.schema !== configSchemaId) {
    error(`Unsupported configuration schema '${String(record.schema)}'`, 'schema');
  }

  const section = (name: string): Record<string, unknown> | undefined => {
    const value = record[name];
    if (value === undefined) return undefined;
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      error(`Configuration section '${name}' must be a mapping`, name);
      return undefined;
    }
    return value as Record<string, unknown>;
  };

  const readString = (
    source: Record<string, unknown>,
    section: string,
    key: string,
    assign: (value: string) => void,
  ) => {
    const value = source[key];
    if (value === undefined) return;
    if (typeof value !== 'string' || value.length === 0) {
      error(`'${section}.${key}' must be a non-empty string`, `${section}.${key}`);
      return;
    }
    assign(value);
  };

  const readBoolean = (
    source: Record<string, unknown>,
    section: string,
    key: string,
    assign: (value: boolean) => void,
  ) => {
    const value = source[key];
    if (value === undefined) return;
    if (typeof value !== 'boolean') {
      error(`'${section}.${key}' must be a boolean`, `${section}.${key}`);
      return;
    }
    assign(value);
  };

  const product = section('product');
  if (product) {
    readString(product, 'product', 'root', (v) => (config.product.root = v));
    readString(product, 'product', 'model', (v) => (config.product.model = v));
    readString(product, 'product', 'changes', (v) => (config.product.changes = v));
  }

  const generated = section('generated');
  if (generated) {
    readString(generated, 'generated', 'root', (v) => (config.generated.root = v));
    readBoolean(generated, 'generated', 'commit', (v) => (config.generated.commit = v));
  }

  const integrations = section('integrations');
  if (integrations) {
    const ai = integrations.ai;
    if (ai !== undefined) {
      if (!Array.isArray(ai) || ai.some((entry) => typeof entry !== 'string')) {
        error(`'integrations.ai' must be a list of strings`, 'integrations.ai');
      } else {
        config.integrations.ai = ai as string[];
      }
    }
    readBoolean(
      integrations,
      'integrations',
      'shorthand-commands',
      (v) => (config.integrations['shorthand-commands'] = v),
    );
  }

  const validation = section('validation');
  if (validation) {
    for (const key of [
      'warnings-as-errors',
      'require-journey-for-use-case',
      'require-requirement-reachability',
    ] as const) {
      readBoolean(validation, 'validation', key, (v) => (config.validation[key] = v));
    }
  }

  const citations = section('citations');
  if (citations) {
    const roots = citations['consumer-roots'];
    if (roots !== undefined) {
      if (
        !Array.isArray(roots) ||
        roots.some((entry) => typeof entry !== 'string' || entry.length === 0)
      ) {
        error(
          `'citations.consumer-roots' must be a list of non-empty strings`,
          'citations.consumer-roots',
        );
      } else if (roots.length === 0) {
        // An empty list would make `citations verify` scan nothing and report success, which is
        // exactly the false green the configuration exists to prevent.
        error(
          `'citations.consumer-roots' must name at least one directory`,
          'citations.consumer-roots',
        );
      } else {
        config.citations['consumer-roots'] = roots as string[];
      }
    }
  }

  return { config, diagnostics };
}

/** Load .product/config.yaml from a repository root; absent file yields defaults. */
export async function loadConfig(configPath: string, file: string): Promise<ConfigResult> {
  let content: string;
  try {
    content = await readFile(configPath, 'utf8');
  } catch {
    return { config: defaultConfig(), diagnostics: [] };
  }
  return parseConfig(content, file);
}
