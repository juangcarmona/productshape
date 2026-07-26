/**
 * Describe the authoring contract of a document kind, derived from its JSON Schema.
 *
 * The schemas are the single source of truth. `prodshape schema <kind>` and
 * docs/specification/frontmatter-reference.md are both rendered from these descriptors, so
 * neither can drift from what validation actually enforces (the adoption failure this exists
 * to prevent: an adopter inventing a frontmatter field the templates neither showed nor forbade).
 */

import {
  idPrefixByType,
  isMarkdownDocumentType,
  requiredBodySections,
  type MarkdownDocumentType,
} from './artifact.js';
import type { RawSchema } from './schema-registry.js';

export type FieldKind = 'string' | 'const' | 'enum' | 'array' | 'object' | 'boolean' | 'unknown';

export interface FieldDescriptor {
  /** Property name, as authored in the schema. */
  name: string;
  required: boolean;
  kind: FieldKind;
  /** The single permitted value, for `const` fields. */
  constValue?: string;
  /** The permitted values, for `enum` fields, in schema order. */
  values?: string[];
  /** Regular expression source, for pattern-constrained strings. */
  pattern?: string;
  minLength?: number;
  minItems?: number;
  description?: string;
  /** For arrays: the element contract. Named `<field>[]`. */
  items?: FieldDescriptor;
  /** For objects: the nested field contracts, in schema order. */
  properties?: FieldDescriptor[];
}

export interface KindDescriptor {
  /** The document kind, e.g. `actor`. Matches the schema file name and the frontmatter `type`. */
  kind: string;
  title: string;
  description?: string;
  /** ID prefix without the trailing hyphen, e.g. `ACT`. Markdown-authored kinds only. */
  idPrefix?: string;
  /** Required `##` body sections, in order. Markdown-authored kinds only. */
  bodySections?: string[];
  /** Whether unknown properties are rejected (they are, for every kind today). */
  closed: boolean;
  fields: FieldDescriptor[];
}

function isObject(value: unknown): value is RawSchema {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

/**
 * Resolve a `$ref` against the loaded schemas, merging any sibling keywords over the target.
 * Sibling keywords are used today for local `description` overrides (domain-term.defined-in,
 * product-change.base-revision), and the local value wins.
 */
function resolve(schema: RawSchema, schemas: ReadonlyMap<string, RawSchema>): RawSchema {
  const ref = schema.$ref;
  if (typeof ref !== 'string') return schema;

  const [id, pointer] = ref.split('#');
  let target: unknown;
  for (const candidate of schemas.values()) {
    if (candidate.$id === id) {
      target = candidate;
      break;
    }
  }
  if (!isObject(target)) return schema;

  for (const segment of (pointer ?? '').split('/')) {
    if (segment === '') continue;
    const key = segment.replaceAll('~1', '/').replaceAll('~0', '~');
    if (!isObject(target)) return schema;
    target = target[key];
  }
  if (!isObject(target)) return schema;

  const siblings = { ...schema };
  delete siblings.$ref;
  // Resolve transitively in case the target is itself a reference, then let siblings win.
  return { ...resolve(target, schemas), ...siblings };
}

function fieldKind(schema: RawSchema): FieldKind {
  if (schema.const !== undefined) return 'const';
  if (Array.isArray(schema.enum)) return 'enum';
  switch (schema.type) {
    case 'array':
      return 'array';
    case 'object':
      return 'object';
    case 'string':
      return 'string';
    case 'boolean':
      return 'boolean';
    default:
      return 'unknown';
  }
}

function describeField(
  name: string,
  raw: unknown,
  required: boolean,
  schemas: ReadonlyMap<string, RawSchema>,
): FieldDescriptor {
  if (!isObject(raw)) return { name, required, kind: 'unknown' };
  const schema = resolve(raw, schemas);

  const descriptor: FieldDescriptor = { name, required, kind: fieldKind(schema) };
  if (typeof schema.const === 'string') descriptor.constValue = schema.const;
  if (Array.isArray(schema.enum)) descriptor.values = schema.enum.map((v) => String(v));
  if (typeof schema.pattern === 'string') descriptor.pattern = schema.pattern;
  if (typeof schema.minLength === 'number') descriptor.minLength = schema.minLength;
  if (typeof schema.minItems === 'number') descriptor.minItems = schema.minItems;
  if (typeof schema.description === 'string') descriptor.description = schema.description;

  if (descriptor.kind === 'array' && schema.items !== undefined) {
    descriptor.items = describeField(`${name}[]`, schema.items, true, schemas);
  }
  if (descriptor.kind === 'object' && isObject(schema.properties)) {
    const nestedRequired = new Set(stringArray(schema.required));
    descriptor.properties = Object.entries(schema.properties).map(([key, value]) =>
      describeField(`${name}.${key}`, value, nestedRequired.has(key), schemas),
    );
  }
  return descriptor;
}

/** Describe one document kind. Throws when the kind has no schema. */
export function describeKind(
  kind: string,
  schemas: ReadonlyMap<string, RawSchema>,
): KindDescriptor {
  const schema = schemas.get(kind);
  if (!schema) throw new Error(`No schema for kind '${kind}'`);

  const required = new Set(stringArray(schema.required));
  const properties = isObject(schema.properties) ? schema.properties : {};

  const descriptor: KindDescriptor = {
    kind,
    title: typeof schema.title === 'string' ? schema.title : kind,
    closed: schema.additionalProperties === false,
    // Schema property order, not required-first: it is stable, it matches the file, and it
    // makes the generated document byte-reproducible.
    fields: Object.entries(properties).map(([name, value]) =>
      describeField(name, value, required.has(name), schemas),
    ),
  };
  if (typeof schema.description === 'string') descriptor.description = schema.description;
  if (isMarkdownDocumentType(kind)) {
    const markdownKind: MarkdownDocumentType = kind;
    descriptor.idPrefix = idPrefixByType[markdownKind];
    descriptor.bodySections = requiredBodySections[markdownKind];
  }
  return descriptor;
}

/** Describe every kind that has a schema, sorted by kind. Excludes `common`. */
export function describeAllKinds(schemas: ReadonlyMap<string, RawSchema>): KindDescriptor[] {
  return [...schemas.keys()]
    .filter((kind) => kind !== 'common')
    .sort()
    .map((kind) => describeKind(kind, schemas));
}

/**
 * Flatten nested fields into rows, naming them `parent.child` and `parent[]`.
 *
 * An array's element row is omitted when the element is an object: the parent row already reads
 * "array of object" and the element's own properties follow, so the row would carry nothing. It is
 * kept for scalar elements, where the pattern or enum constraining them lives on that row.
 */
function flatten(fields: FieldDescriptor[]): FieldDescriptor[] {
  const rows: FieldDescriptor[] = [];
  for (const field of fields) {
    rows.push(field);
    if (field.items && field.items.kind !== 'object') rows.push(...flatten([field.items]));
    if (field.items?.properties) rows.push(...flatten(field.items.properties));
    if (field.properties) rows.push(...flatten(field.properties));
  }
  return rows;
}

function typeLabel(field: FieldDescriptor): string {
  if (field.kind === 'array') {
    const item = field.items;
    if (!item) return 'array';
    return item.kind === 'object' ? 'array of object' : `array of ${item.kind}`;
  }
  return field.kind;
}

function allowedLabel(field: FieldDescriptor): string {
  if (field.constValue !== undefined) return `\`${field.constValue}\``;
  if (field.values) return field.values.map((v) => `\`${v}\``).join(', ');
  if (field.pattern) return `\`${field.pattern}\``;
  return '';
}

function notes(field: FieldDescriptor): string[] {
  const parts: string[] = [];
  if (field.description) parts.push(field.description);
  if (field.minItems !== undefined) {
    parts.push(
      field.minItems === 1 ? 'At least one entry.' : `At least ${field.minItems} entries.`,
    );
  }
  if (field.minLength !== undefined && field.minLength > 0 && field.kind === 'string') {
    parts.push('Must not be empty.');
  }
  return parts;
}

/** The fixed column header of every generated table. Asserted by the drift test. */
export const frontmatterTableHeader = ['Field', 'Required', 'Type', 'Allowed values', 'Notes'];

/**
 * Escape a table cell. Pipes must be escaped even inside a code span: the union ID patterns
 * (`^(FR|QR|CON)-…`) would otherwise be read as column separators and shatter the row.
 */
function escapeCell(value: string): string {
  return value.replaceAll('|', '\\|').replaceAll('\n', ' ').trim();
}

/** Render a kind as the Markdown table body of a generated region in the reference document. */
export function renderKindMarkdownTable(descriptor: KindDescriptor): string {
  const rows = flatten(descriptor.fields).map((field) =>
    [
      `\`${field.name}\``,
      field.required ? 'yes' : 'no',
      typeLabel(field),
      allowedLabel(field),
      notes(field).join(' '),
    ].map(escapeCell),
  );
  const lines = [
    `| ${frontmatterTableHeader.join(' | ')} |`,
    `| ${frontmatterTableHeader.map(() => '---').join(' | ')} |`,
    ...rows.map((cells) => `| ${cells.join(' | ')} |`),
  ];
  return lines.join('\n');
}

/** Render a kind for the terminal: `prodshape schema <kind>`. */
export function renderKindText(descriptor: KindDescriptor): string[] {
  const heading = descriptor.idPrefix
    ? `${descriptor.kind} (${descriptor.idPrefix}-)`
    : descriptor.kind;
  const lines = [heading, descriptor.title, ''];

  const rows = flatten(descriptor.fields);
  const width = Math.max(0, ...rows.map((field) => field.name.length));

  const emit = (label: string, subset: FieldDescriptor[]) => {
    if (subset.length === 0) return;
    lines.push(`${label}:`);
    for (const field of subset) {
      const detail = [typeLabel(field), allowedLabel(field).replaceAll('`', '')]
        .filter(Boolean)
        .join('  ');
      lines.push(`  ${field.name.padEnd(width)}  ${detail}`.trimEnd());
      for (const note of notes(field)) lines.push(`  ${' '.repeat(width)}  ${note}`);
    }
    lines.push('');
  };

  // Nested fields follow their parent, so partition on the top level and keep children with it.
  const topLevel = descriptor.fields.filter((f) => f.required);
  const optional = descriptor.fields.filter((f) => !f.required);
  emit('Required', flatten(topLevel));
  emit('Optional', flatten(optional));

  if (descriptor.bodySections) {
    lines.push(`Required body sections: ${descriptor.bodySections.join(', ')}`);
  }
  if (descriptor.closed) {
    lines.push('Unknown properties are rejected (PRODUCT002).');
  }
  lines.push(`Reference: docs/specification/frontmatter-reference.md#${descriptor.kind}`);
  return lines;
}
