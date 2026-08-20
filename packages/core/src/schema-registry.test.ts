import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { SchemaRegistry } from './schema-registry.js';

const schemasDir = join(fileURLToPath(new URL('../../../', import.meta.url)), 'schemas');

let registry: SchemaRegistry;

beforeAll(async () => {
  registry = await SchemaRegistry.load(schemasDir);
});

function actor(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'ACT-PROBE',
    type: 'actor',
    title: 'Probe',
    status: 'active',
    'actor-kind': 'human',
    ...overrides,
  };
}

describe('PRODUCT002 names the offending field', () => {
  it('appends the property behind an additional-properties violation', () => {
    const diagnostics = registry.validate('actor', actor({ 'bogus-field': true }), 'act.md');
    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: 'PRODUCT002',
        message: "document must NOT have additional properties ('bogus-field')",
        field: 'bogus-field',
      }),
    ]);
  });

  it('dots the instance path into field for a nested additional property', () => {
    const provenance = { source: 'docs/spec.md', confidence: 'medium', 'recovered-by': 'x' };
    const diagnostics = registry.validate('actor', actor({ provenance }), 'act.md');
    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: 'PRODUCT002',
        message: "/provenance must NOT have additional properties ('recovered-by')",
        field: 'provenance.recovered-by',
      }),
    ]);
  });

  it('fills field for a missing required property, whose message already names it', () => {
    const withoutStatus = actor();
    delete withoutStatus.status;
    const diagnostics = registry.validate('actor', withoutStatus, 'act.md');
    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: 'PRODUCT002',
        message: "document must have required property 'status'",
        field: 'status',
      }),
    ]);
  });
});
