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
  });
});
