import {
  SchemaRegistry,
  describeAllKinds,
  describeKind,
  idPrefixByType,
  isMarkdownDocumentType,
  renderKindText,
  stableJson,
  type KindDescriptor,
} from '@prodshape/core';
import { CliError, exitCodes, type CliIo } from '../context.js';

export const schemaReferenceId = 'product-definition-as-code/frontmatter-reference/v1alpha1';

export interface SchemaOptions {
  format?: 'text' | 'json';
}

/**
 * ID prefixes accepted as aliases for a kind, lowercased. Derived, never invented: the Markdown
 * prefixes come from idPrefixByType and the three YAML prefixes from common.schema.json. Plurals
 * and abbreviations are deliberately not accepted — they would create vocabulary the
 * specification does not own.
 */
function aliasesFor(kinds: string[]): Map<string, string> {
  const yamlPrefixes: Record<string, string> = {
    'delivery-slice': 'SLI',
    'product-handoff': 'HOF',
  };
  const aliases = new Map<string, string>();
  for (const kind of kinds) {
    const prefix = isMarkdownDocumentType(kind) ? idPrefixByType[kind] : yamlPrefixes[kind];
    if (prefix) aliases.set(prefix.toLowerCase(), kind);
  }
  return aliases;
}

function idPrefixOf(descriptor: KindDescriptor, aliases: Map<string, string>): string {
  if (descriptor.idPrefix) return `${descriptor.idPrefix}-`;
  for (const [prefix, kind] of aliases) {
    if (kind === descriptor.kind) return `${prefix.toUpperCase()}-`;
  }
  return '';
}

/**
 * Print the allowed frontmatter for a document kind, or list every kind.
 *
 * Deliberately does not resolve a repository: this is a reference lookup over the schemas bundled
 * with the CLI. It has to work in an empty directory, which is exactly where someone reaches for
 * it — before `init`, while deciding what to author.
 */
export async function runSchema(
  io: CliIo,
  kind: string | undefined,
  options: SchemaOptions,
): Promise<number> {
  const registry = await SchemaRegistry.loadBundled();
  const schemas = registry.rawSchemas();
  const kinds = registry.kinds();
  const aliases = aliasesFor(kinds);

  if (kind === undefined) {
    const descriptors = describeAllKinds(schemas);
    if (options.format === 'json') {
      io.out(stableJson({ schema: schemaReferenceId, kinds: descriptors }).trimEnd());
      return exitCodes.success;
    }
    const width = Math.max(...descriptors.map((d) => d.kind.length));
    for (const descriptor of descriptors) {
      const prefix = idPrefixOf(descriptor, aliases);
      io.out(`${descriptor.kind.padEnd(width)}  ${prefix.padEnd(6)}  ${descriptor.title}`);
    }
    io.out('');
    io.out("Run 'prodshape schema <kind>' for the full field reference.");
    return exitCodes.success;
  }

  const requested = kind.toLowerCase();
  const resolved = kinds.includes(requested) ? requested : aliases.get(requested);
  if (!resolved) {
    // An unusable argument, not a fact about a model: exit 2, like an unknown --direction, and
    // unlike `inspect <unknown-id>` which reports that the model lacks an ID.
    throw new CliError(
      `Unknown kind '${kind}'. Known kinds: ${kinds.join(', ')}`,
      exitCodes.invalidInvocation,
    );
  }

  const descriptor = describeKind(resolved, schemas);
  if (options.format === 'json') {
    io.out(stableJson({ schema: schemaReferenceId, ...descriptor }).trimEnd());
    return exitCodes.success;
  }
  for (const line of renderKindText(descriptor)) io.out(line);
  return exitCodes.success;
}
