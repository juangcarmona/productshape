import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { describeAllKinds, describeKind, renderKindText } from './frontmatter-reference.js';
import { SchemaRegistry, type RawSchema } from './schema-registry.js';

const schemasDir = join(fileURLToPath(new URL('../../../', import.meta.url)), 'schemas');

let schemas: ReadonlyMap<string, RawSchema>;

beforeAll(async () => {
  schemas = (await SchemaRegistry.load(schemasDir)).rawSchemas();
});

function field(kind: string, name: string) {
  const found = describeKind(kind, schemas).fields.find((f) => f.name === name);
  if (!found) throw new Error(`no field '${name}' on '${kind}'`);
  return found;
}

describe('describeKind', () => {
  it('resolves $ref into common $defs for enums and ID patterns', () => {
    expect(field('actor', 'status')).toMatchObject({
      kind: 'enum',
      required: true,
      values: ['draft', 'active', 'deprecated', 'retired'],
    });
    expect(field('actor', 'id')).toMatchObject({
      kind: 'string',
      pattern: '^ACT-[A-Z0-9]+(-[A-Z0-9]+)*$',
    });
  });

  it('reads const and inline enums without a $ref', () => {
    expect(field('actor', 'type')).toMatchObject({ kind: 'const', constValue: 'actor' });
    expect(field('actor', 'actor-kind').values).toEqual([
      'human',
      'external-system',
      'scheduled-process',
      'product',
    ]);
  });

  it('lets a sibling description win over the resolved $ref target', () => {
    // domain-term.defined-in carries a local description next to its $ref.
    const definedIn = field('domain-term', 'defined-in');
    expect(definedIn.pattern).toBe('^BC-[A-Z0-9]+(-[A-Z0-9]+)*$');
    expect(definedIn.description).toContain('Bounded contexts never author owns-terms');
  });

  it('descends into arrays of inline objects', () => {
    const steps = field('journey', 'steps');
    expect(steps).toMatchObject({ kind: 'array', required: true, minItems: 1 });
    expect(steps.items?.kind).toBe('object');
    expect(steps.items?.properties?.map((p) => p.name)).toEqual(['steps[].use-case']);
    expect(steps.items?.properties?.[0]).toMatchObject({
      required: true,
      pattern: '^UC-[A-Z0-9]+(-[A-Z0-9]+)*$',
    });
  });

  it('descends into nested objects and tracks their own required set', () => {
    const operations = field('product-change', 'operations');
    expect(operations.kind).toBe('object');
    expect(operations.properties?.map((p) => p.name)).toEqual([
      'operations.add',
      'operations.modify',
      'operations.remove',
    ]);
    expect(operations.properties?.every((p) => p.required)).toBe(true);
  });

  it('handles arrays whose items are a $ref rather than an inline object', () => {
    const affects = field('delivery-slice', 'affects');
    expect(affects.kind).toBe('array');
    expect(affects.items?.kind).toBe('string');
    expect(affects.items?.pattern).toBe(
      '^(ACT|JRN|UC|BR|TERM|BC|FR|QR|CON)-[A-Z0-9]+(-[A-Z0-9]+)*$',
    );
  });

  it('reports every kind as closed and carries markdown-only metadata', () => {
    const actor = describeKind('actor', schemas);
    expect(actor.closed).toBe(true);
    expect(actor.idPrefix).toBe('ACT');
    expect(actor.bodySections).toEqual(['Purpose', 'Goals', 'Responsibilities', 'Boundaries']);

    // YAML kinds are not markdown-authored: no ID prefix, no body sections.
    const slice = describeKind('delivery-slice', schemas);
    expect(slice.idPrefix).toBeUndefined();
    expect(slice.bodySections).toBeUndefined();
  });

  it('preserves schema property order rather than sorting or grouping by required', () => {
    expect(describeKind('domain-term', schemas).fields.map((f) => f.name)).toEqual([
      'id',
      'type',
      'title',
      'status',
      'defined-in',
      'synonyms',
      'provenance',
    ]);
  });

  it('throws for an unknown kind', () => {
    expect(() => describeKind('nonsense', schemas)).toThrow(/nonsense/);
  });
});

describe('describeAllKinds', () => {
  it('covers every schema except common, sorted', () => {
    const kinds = describeAllKinds(schemas).map((d) => d.kind);
    expect(kinds).not.toContain('common');
    expect(kinds).toEqual([...kinds].sort());
    expect(kinds).toContain('actor');
    expect(kinds).toContain('product-coverage');
  });
});

describe('renderKindText', () => {
  it('separates required from optional and names the reference anchor', () => {
    const text = renderKindText(describeKind('actor', schemas)).join('\n');
    expect(text).toContain('actor (ACT-)');
    expect(text).toContain('Required:');
    expect(text).toContain('actor-kind');
    expect(text).toContain('Required body sections: Purpose, Goals, Responsibilities, Boundaries');
    expect(text).toContain('Unknown properties are rejected (PRODUCT002).');
    expect(text).toContain('frontmatter-reference.md#actor');
  });
});
