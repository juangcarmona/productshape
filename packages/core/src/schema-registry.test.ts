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

describe('PRODUCT002 locates the failure with an RFC 6901 JSON Pointer', () => {
  it('appends the property behind an additional-properties violation', () => {
    const diagnostics = registry.validate('actor', actor({ 'bogus-field': true }), 'act.md');
    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: 'PRODUCT002',
        message: "document must NOT have additional properties ('bogus-field')",
        field: '/bogus-field',
      }),
    ]);
  });

  it('points at a nested additional property as though it were present', () => {
    const provenance = { source: 'docs/spec.md', confidence: 'medium', 'recovered-by': 'x' };
    const diagnostics = registry.validate('actor', actor({ provenance }), 'act.md');
    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: 'PRODUCT002',
        message: "/provenance must NOT have additional properties ('recovered-by')",
        field: '/provenance/recovered-by',
      }),
    ]);
  });

  it('escapes slash and tilde in a pointer token', () => {
    const provenance = {
      source: 'docs/spec.md',
      confidence: 'medium',
      'recovered/by~': 'intentionally invalid',
    };
    const diagnostics = registry.validate('actor', actor({ provenance }), 'act.md');
    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: 'PRODUCT002',
        field: '/provenance/recovered~1by~0',
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
        field: '/status',
      }),
    ]);
  });
});

describe('structured behaviour schema (RFC 0084)', () => {
  function behaviour(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      id: 'SB-PROBE',
      type: 'structured-behaviour',
      title: 'Probe',
      status: 'active',
      illustrates: ['UC-PROBE'],
      given: ['A context condition holds'],
      when: 'A stimulus occurs',
      then: ['An outcome follows'],
      ...overrides,
    };
  }

  it('accepts a conforming document', () => {
    expect(registry.validate('structured-behaviour', behaviour(), 'sb.md')).toEqual([]);
  });

  it('rejects a leading clause keyword case-insensitively, at its exact pointer', () => {
    const diagnostics = registry.validate(
      'structured-behaviour',
      behaviour({ given: ['Given a context exists'] }),
      'sb.md',
    );
    expect(diagnostics).toEqual([
      expect.objectContaining({ code: 'PRODUCT002', field: '/given/0' }),
    ]);
  });

  it('keeps a clause whose first word merely starts with a keyword', () => {
    const diagnostics = registry.validate(
      'structured-behaviour',
      behaviour({ given: ['Givens are recorded'] }),
      'sb.md',
    );
    expect(diagnostics).toEqual([]);
  });

  it('requires illustrates to be non-empty', () => {
    const diagnostics = registry.validate(
      'structured-behaviour',
      behaviour({ illustrates: [] }),
      'sb.md',
    );
    expect(diagnostics).toEqual([
      expect.objectContaining({ code: 'PRODUCT002', field: '/illustrates' }),
    ]);
  });
});
