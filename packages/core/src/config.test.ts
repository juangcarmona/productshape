import { describe, expect, it } from 'vitest';
import { defaultConfig, parseConfig } from './config.js';

describe('parseConfig', () => {
  it('accepts the repository configuration shape', () => {
    const { config, diagnostics } = parseConfig(
      [
        'schema: product-definition-as-code/config/v1alpha1',
        'product:',
        '  root: docs/product',
        'validation:',
        '  warnings-as-errors: true',
      ].join('\n'),
      '.product/config.yaml',
    );
    expect(diagnostics).toEqual([]);
    expect(config.validation['warnings-as-errors']).toBe(true);
    expect(config.product.model).toBe('docs/product/model');
  });

  it('rejects unknown top-level keys with PRODUCT050', () => {
    const { diagnostics } = parseConfig('plugins:\n  - something\n', '.product/config.yaml');
    expect(diagnostics).toEqual([
      expect.objectContaining({ code: 'PRODUCT050', field: 'plugins' }),
    ]);
  });

  it('rejects wrong value types with PRODUCT050', () => {
    const { diagnostics } = parseConfig(
      'validation:\n  warnings-as-errors: definitely\n',
      '.product/config.yaml',
    );
    expect(diagnostics).toEqual([
      expect.objectContaining({ code: 'PRODUCT050', field: 'validation.warnings-as-errors' }),
    ]);
  });

  it('rejects an unsupported schema identifier', () => {
    const { diagnostics } = parseConfig('schema: something/else/v9\n', '.product/config.yaml');
    expect(diagnostics).toEqual([expect.objectContaining({ code: 'PRODUCT050', field: 'schema' })]);
  });

  it('provides documented defaults', () => {
    const config = defaultConfig();
    expect(config.product.root).toBe('docs/product');
    expect(config.generated.commit).toBe(false);
    expect(config.validation['require-requirement-reachability']).toBe(true);
    // Where consumer documents live is the repository's decision; openspec is only the default.
    expect(config.citations['consumer-roots']).toEqual(['openspec']);
  });

  it('reads citations.consumer-roots as a list of directories', () => {
    const { config, diagnostics } = parseConfig(
      'citations:\n  consumer-roots:\n    - specs\n    - docs/consumers\n',
      '.product/config.yaml',
    );
    expect(diagnostics).toEqual([]);
    expect(config.citations['consumer-roots']).toEqual(['specs', 'docs/consumers']);
  });

  it.each([
    ['a bare string', 'citations:\n  consumer-roots: specs\n'],
    ['a list with a non-string', 'citations:\n  consumer-roots:\n    - specs\n    - 7\n'],
    ['a list with an empty entry', "citations:\n  consumer-roots:\n    - ''\n"],
    // An empty list would scan nothing and report success: the false green the key prevents.
    ['an empty list', 'citations:\n  consumer-roots: []\n'],
  ])('rejects %s with PRODUCT050', (_label, content) => {
    const { config, diagnostics } = parseConfig(content, '.product/config.yaml');
    expect(diagnostics).toEqual([
      expect.objectContaining({ code: 'PRODUCT050', field: 'citations.consumer-roots' }),
    ]);
    expect(config.citations['consumer-roots']).toEqual(['openspec']);
  });
});
