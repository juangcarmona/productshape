import { readFile } from 'node:fs/promises';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { isAlias, isMap, isPair, isScalar, isSeq, parseAllDocuments } from 'yaml';
import type { Node, Pair } from 'yaml';
import { configSchema } from './config-schema.js';
import type { Diagnostic } from './diagnostics.js';
import { compareCodeUnits } from './diagnostics.js';

/**
 * ProductShape's own settings, carried under `extensions.prodshape` in `.product/config.yaml`.
 * The kernel treats everything below `extensions` as opaque; this namespace is the one this
 * implementation owns, and none of it may change the meaning, severity or emission of a
 * normative diagnostic.
 */
export interface ProdshapeSettings {
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

/**
 * The resolved repository configuration: the kernel contract (spec/configuration.md) plus this
 * implementation's `extensions.prodshape` namespace with defaults applied.
 *
 * `product` is a derived view, not configuration: the kernel configures `product-root` only, and
 * the repository layout fixes `model/` and `changes/` beneath it.
 */
export interface ProductConfig {
  version: 'v1alpha1';
  'product-root': string;
  validation: {
    'warnings-as-errors': boolean;
  };
  /** Resolved `extensions.prodshape` settings. Namespaces this implementation does not own are ignored. */
  prodshape: ProdshapeSettings;
  /** Derived layout under `product-root`. */
  product: {
    root: string;
    model: string;
    changes: string;
  };
}

export const configVersion = 'v1alpha1';

function defaultProdshapeSettings(): ProdshapeSettings {
  return {
    generated: {
      root: '.product/generated',
      commit: false,
    },
    integrations: {
      ai: [],
      'shorthand-commands': false,
    },
    citations: {
      'consumer-roots': ['openspec'],
    },
  };
}

function withDerived(config: Omit<ProductConfig, 'product'>): ProductConfig {
  const root = config['product-root'];
  return { ...config, product: { root, model: `${root}/model`, changes: `${root}/changes` } };
}

export function defaultConfig(): ProductConfig {
  return withDerived({
    version: 'v1alpha1',
    'product-root': 'docs/product',
    validation: { 'warnings-as-errors': false },
    prodshape: defaultProdshapeSettings(),
  });
}

export interface ConfigResult {
  config: ProductConfig;
  diagnostics: Diagnostic[];
}

/** One contract violation found in the document, located by its dot-form instance path. */
interface Violation {
  /** Dot-form instance path; empty string for the document itself. */
  path: string;
  message: string;
}

const validateKernelSchema = new Ajv2020({ allErrors: true }).compile(configSchema);

/**
 * Collect the YAML features the configuration contract forbids: aliases, anchors, tags and merge
 * keys. Duplicate mapping keys are already a parse error under YAML 1.2 defaults.
 */
function collectForbiddenYamlFeatures(node: unknown, path: string, out: Violation[]): void {
  if (node === null || node === undefined) return;
  if (isAlias(node)) {
    out.push({ path, message: 'YAML aliases are not permitted in configuration' });
    return;
  }
  const withAnchor = node as { anchor?: string; tag?: string };
  if (typeof withAnchor.anchor === 'string' && withAnchor.anchor.length > 0) {
    out.push({ path, message: 'YAML anchors are not permitted in configuration' });
  }
  if (typeof withAnchor.tag === 'string' && withAnchor.tag.length > 0) {
    out.push({ path, message: 'YAML tags are not permitted in configuration' });
  }
  if (isMap(node)) {
    for (const item of node.items as Pair[]) {
      if (!isPair(item)) continue;
      const key = item.key;
      const keyText = isScalar(key) ? String(key.value) : undefined;
      const childPath = keyText === undefined ? path : path ? `${path}.${keyText}` : keyText;
      if (keyText === '<<') {
        out.push({
          path: childPath,
          message: 'YAML merge keys are not permitted in configuration',
        });
      }
      if (key !== null && key !== undefined && !isScalar(key)) {
        collectForbiddenYamlFeatures(key, childPath, out);
      }
      collectForbiddenYamlFeatures(item.value, childPath, out);
    }
    return;
  }
  if (isSeq(node)) {
    (node.items as Node[]).forEach((item, index) => {
      collectForbiddenYamlFeatures(item, path ? `${path}.${index}` : String(index), out);
    });
  }
}

/** Convert an ajv error to a violation, naming the offending property like PRODUCT002 does. */
function ajvViolation(error: {
  instancePath: string;
  message?: string;
  params: Record<string, unknown>;
}): Violation {
  const path = error.instancePath.replace(/^\//, '').replaceAll('/', '.');
  const offending =
    typeof error.params.additionalProperty === 'string'
      ? error.params.additionalProperty
      : typeof error.params.missingProperty === 'string'
        ? error.params.missingProperty
        : undefined;
  const fullPath = offending ? (path ? `${path}.${offending}` : offending) : path;
  return {
    path: fullPath,
    message: `${error.instancePath || 'configuration'} ${error.message ?? 'is invalid'}${offending ? ` ('${offending}')` : ''}`,
  };
}

/** Read this implementation's `extensions.prodshape` namespace, collecting violations. */
function parseProdshapeSettings(raw: unknown, out: Violation[]): ProdshapeSettings {
  const settings = defaultProdshapeSettings();
  const ns = 'extensions.prodshape';
  if (raw === undefined) return settings;
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    out.push({ path: ns, message: `'${ns}' must be a mapping` });
    return settings;
  }
  const record = raw as Record<string, unknown>;
  const knownKeys = new Set(['generated', 'integrations', 'citations']);
  for (const key of Object.keys(record)) {
    if (!knownKeys.has(key)) {
      out.push({ path: `${ns}.${key}`, message: `Unknown key '${ns}.${key}'` });
    }
  }

  const section = (name: string): Record<string, unknown> | undefined => {
    const value = record[name];
    if (value === undefined) return undefined;
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      out.push({ path: `${ns}.${name}`, message: `'${ns}.${name}' must be a mapping` });
      return undefined;
    }
    return value as Record<string, unknown>;
  };
  const readString = (
    source: Record<string, unknown>,
    name: string,
    key: string,
    assign: (v: string) => void,
  ) => {
    const value = source[key];
    if (value === undefined) return;
    if (typeof value !== 'string' || value.length === 0) {
      out.push({
        path: `${ns}.${name}.${key}`,
        message: `'${ns}.${name}.${key}' must be a non-empty string`,
      });
      return;
    }
    assign(value);
  };
  const readBoolean = (
    source: Record<string, unknown>,
    name: string,
    key: string,
    assign: (v: boolean) => void,
  ) => {
    const value = source[key];
    if (value === undefined) return;
    if (typeof value !== 'boolean') {
      out.push({
        path: `${ns}.${name}.${key}`,
        message: `'${ns}.${name}.${key}' must be a boolean`,
      });
      return;
    }
    assign(value);
  };

  const generated = section('generated');
  if (generated) {
    readString(generated, 'generated', 'root', (v) => (settings.generated.root = v));
    readBoolean(generated, 'generated', 'commit', (v) => (settings.generated.commit = v));
  }

  const integrations = section('integrations');
  if (integrations) {
    const ai = integrations.ai;
    if (ai !== undefined) {
      if (!Array.isArray(ai) || ai.some((entry) => typeof entry !== 'string')) {
        out.push({
          path: `${ns}.integrations.ai`,
          message: `'${ns}.integrations.ai' must be a list of strings`,
        });
      } else {
        settings.integrations.ai = ai as string[];
      }
    }
    readBoolean(
      integrations,
      'integrations',
      'shorthand-commands',
      (v) => (settings.integrations['shorthand-commands'] = v),
    );
  }

  const citations = section('citations');
  if (citations) {
    const roots = citations['consumer-roots'];
    if (roots !== undefined) {
      if (
        !Array.isArray(roots) ||
        roots.some((entry) => typeof entry !== 'string' || entry.length === 0)
      ) {
        out.push({
          path: `${ns}.citations.consumer-roots`,
          message: `'${ns}.citations.consumer-roots' must be a list of non-empty strings`,
        });
      } else if (roots.length === 0) {
        // An empty list would make `citations verify` scan nothing and report success, which is
        // exactly the false green the configuration exists to prevent.
        out.push({
          path: `${ns}.citations.consumer-roots`,
          message: `'${ns}.citations.consumer-roots' must name at least one directory`,
        });
      } else {
        settings.citations['consumer-roots'] = roots as string[];
      }
    }
  }

  return settings;
}

/**
 * Parse and validate configuration content against the kernel contract and this implementation's
 * extension namespace.
 *
 * An invalid file produces exactly one `PRODUCT050`. When the document parsed, `field` is the
 * first invalid instance path in code-point order; when it did not parse, `field` is absent.
 * The caller stops before artifact discovery or command-specific work and never continues with
 * defaults after an invalid file.
 */
export function parseConfig(content: string, file: string): ConfigResult {
  const one = (message: string, field?: string): ConfigResult => ({
    config: defaultConfig(),
    diagnostics: [
      { severity: 'error', code: 'PRODUCT050', message, file, ...(field ? { field } : {}) },
    ],
  });

  const documents = parseAllDocuments(content);
  const parseErrors = documents.flatMap((doc) => doc.errors);
  if (parseErrors.length > 0) {
    return one(`Configuration is not valid YAML: ${parseErrors[0]?.message ?? 'parse error'}`);
  }
  if (documents.length > 1) {
    return one('Configuration must be exactly one YAML document');
  }

  const violations: Violation[] = [];
  const document = documents[0];
  if (document) collectForbiddenYamlFeatures(document.contents, '', violations);

  const data: unknown = document ? document.toJS() : undefined;
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return one('Configuration must be a YAML mapping');
  }

  if (!validateKernelSchema(data)) {
    for (const error of validateKernelSchema.errors ?? []) {
      violations.push(ajvViolation(error));
    }
  }

  const record = data as Record<string, unknown>;
  const config = defaultConfig();
  if (violations.length === 0) {
    if (typeof record['product-root'] === 'string') {
      config['product-root'] = record['product-root'];
    }
    const validation = record.validation as Record<string, unknown> | undefined;
    if (validation && typeof validation['warnings-as-errors'] === 'boolean') {
      config.validation['warnings-as-errors'] = validation['warnings-as-errors'];
    }
    const extensions = (record.extensions as Record<string, unknown> | undefined) ?? {};
    config.prodshape = parseProdshapeSettings(extensions.prodshape, violations);
  }

  if (violations.length > 0) {
    const first = [...violations].sort((a, b) => compareCodeUnits(a.path, b.path))[0] as Violation;
    return one(first.message, first.path || undefined);
  }

  return { config: withDerived(config), diagnostics: [] };
}

/** Load a configuration file; an absent file yields defaults (the caller decided the root). */
export async function loadConfig(configPath: string, file: string): Promise<ConfigResult> {
  let content: string;
  try {
    content = await readFile(configPath, 'utf8');
  } catch {
    return { config: defaultConfig(), diagnostics: [] };
  }
  return parseConfig(content, file);
}
