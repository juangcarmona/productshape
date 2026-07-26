/**
 * The configuration `init` writes and the configuration the parser accepts are one contract, but
 * they live in different packages with no shared source: distribution builds YAML by string
 * concatenation, core parses it by hand. Nothing linked them, so a key added to one and forgotten
 * in the other would produce a file the tool silently ignores (unknown *nested* keys are not
 * rejected — only unknown top-level ones are, as PRODUCT050).
 */
import { describe, expect, it } from 'vitest';
import { defaultConfig, parseConfig } from '@prodshape/core';
import { configContent } from '@prodshape/distribution';

describe('generated configuration round-trips through the parser', () => {
  it('parses with zero diagnostics and yields the defaults for a bare init', () => {
    const result = parseConfig(configContent([]), '.product/config.yaml');
    expect(result.diagnostics).toEqual([]);
    expect(result.config).toEqual(defaultConfig());
  });

  it('round-trips every option init can write', () => {
    const result = parseConfig(
      configContent(['claude', 'copilot'], 'openspec', true),
      '.product/config.yaml',
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.config).toEqual({
      ...defaultConfig(),
      integrations: {
        ai: ['claude', 'copilot'],
        sdd: { provider: 'openspec' },
        'shorthand-commands': true,
      },
    });
  });

  it('defaults the shorthand aliases off', () => {
    expect(defaultConfig().integrations['shorthand-commands']).toBe(false);
    expect(
      parseConfig(configContent(['claude']), 'c').config.integrations['shorthand-commands'],
    ).toBe(false);
  });
});
