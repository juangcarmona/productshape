import { describe, expect, it } from 'vitest';
import { defaultConfig, parseConfig } from './config.js';

const KERNEL = [
  'version: v1alpha1',
  'product-root: docs/product',
  'validation:',
  '  warnings-as-errors: true',
].join('\n');

describe('parseConfig', () => {
  it('accepts the kernel configuration shape', () => {
    const { config, diagnostics } = parseConfig(KERNEL, '.product/config.yaml');
    expect(diagnostics).toEqual([]);
    expect(config.validation['warnings-as-errors']).toBe(true);
    expect(config['product-root']).toBe('docs/product');
    expect(config.product.model).toBe('docs/product/model');
    expect(config.product.changes).toBe('docs/product/changes');
  });

  it('derives the layout from a custom product-root', () => {
    const { config, diagnostics } = parseConfig(
      'version: v1alpha1\nproduct-root: definition\n',
      '.product/config.yaml',
    );
    expect(diagnostics).toEqual([]);
    expect(config.product.model).toBe('definition/model');
    expect(config.product.changes).toBe('definition/changes');
  });

  it('requires the version key', () => {
    const { diagnostics } = parseConfig('product-root: docs/product\n', '.product/config.yaml');
    expect(diagnostics).toEqual([
      expect.objectContaining({ code: 'PRODUCT050', field: '/version' }),
    ]);
  });

  it('rejects an unsupported version', () => {
    const { diagnostics } = parseConfig('version: v2\n', '.product/config.yaml');
    expect(diagnostics).toEqual([
      expect.objectContaining({ code: 'PRODUCT050', field: '/version' }),
    ]);
  });

  it('rejects unknown top-level keys with PRODUCT050', () => {
    const { diagnostics } = parseConfig(
      `${KERNEL}\nplugins:\n  - something\n`,
      '.product/config.yaml',
    );
    expect(diagnostics).toEqual([
      expect.objectContaining({ code: 'PRODUCT050', field: '/plugins' }),
    ]);
  });

  it('escapes slash and tilde in an unknown key pointer token', () => {
    const { diagnostics } = parseConfig(
      `${KERNEL}\n'recovered/by~': true\n`,
      '.product/config.yaml',
    );
    expect(diagnostics).toEqual([
      expect.objectContaining({ code: 'PRODUCT050', field: '/recovered~1by~0' }),
    ]);
  });

  it('rejects the retired tool-specific top-level keys', () => {
    const { diagnostics } = parseConfig(
      'version: v1alpha1\ncitations:\n  consumer-roots:\n    - specs\n',
      '.product/config.yaml',
    );
    expect(diagnostics).toEqual([
      expect.objectContaining({ code: 'PRODUCT050', field: '/citations' }),
    ]);
  });

  it('rejects wrong value types with PRODUCT050', () => {
    const { diagnostics } = parseConfig(
      'version: v1alpha1\nvalidation:\n  warnings-as-errors: definitely\n',
      '.product/config.yaml',
    );
    expect(diagnostics).toEqual([
      expect.objectContaining({ code: 'PRODUCT050', field: '/validation/warnings-as-errors' }),
    ]);
  });

  it.each([
    ['an absolute path', '/etc/product'],
    ['a dot segment', 'docs/../product'],
    ['a backslash', 'docs\\product'],
    ['an empty segment', 'docs//product'],
  ])('rejects product-root with %s', (_label, root) => {
    const { diagnostics } = parseConfig(
      `version: v1alpha1\nproduct-root: '${root}'\n`,
      '.product/config.yaml',
    );
    expect(diagnostics).toEqual([
      expect.objectContaining({ code: 'PRODUCT050', field: '/product-root' }),
    ]);
  });

  it('emits exactly one PRODUCT050 with the first invalid instance path in code-point order', () => {
    const { diagnostics } = parseConfig(
      ['version: v9', 'zebra: true', 'apple: true'].join('\n'),
      '.product/config.yaml',
    );
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({ code: 'PRODUCT050', field: '/apple' });
  });

  it('reports unparseable YAML with one PRODUCT050 and no field', () => {
    const { diagnostics } = parseConfig('version: [unclosed\n', '.product/config.yaml');
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.code).toBe('PRODUCT050');
    expect(diagnostics[0]?.field).toBeUndefined();
  });

  it('points a parsed non-mapping document at the root with the empty pointer', () => {
    const { diagnostics } = parseConfig('- v1alpha1\n', '.product/config.yaml');
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.code).toBe('PRODUCT050');
    expect(diagnostics[0]?.field).toBe('');
  });

  it.each([
    ['an empty file', ''],
    ['a comment-only file', '# nothing here\n'],
  ])('leaves field absent for %s: no document parsed', (_label, content) => {
    const { diagnostics } = parseConfig(content, '.product/config.yaml');
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.code).toBe('PRODUCT050');
    expect(diagnostics[0]?.field).toBeUndefined();
  });

  it('points at a property literally named the empty string', () => {
    const { diagnostics } = parseConfig(`${KERNEL}\n'': true\n`, '.product/config.yaml');
    expect(diagnostics).toEqual([expect.objectContaining({ code: 'PRODUCT050', field: '/' })]);
  });

  it('rejects more than one YAML document', () => {
    const { diagnostics } = parseConfig(
      'version: v1alpha1\n---\nversion: v1alpha1\n',
      '.product/config.yaml',
    );
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.code).toBe('PRODUCT050');
  });

  it.each([
    ['an anchor and alias', 'version: v1alpha1\nextensions:\n  prodshape: &a {}\n  other: *a\n'],
    ['a tag', 'version: v1alpha1\nextensions: !!map {}\n'],
    ['a merge key', 'version: v1alpha1\nextensions:\n  prodshape:\n    <<: {}\n'],
  ])('rejects %s with one PRODUCT050', (_label, content) => {
    const { diagnostics } = parseConfig(content, '.product/config.yaml');
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.code).toBe('PRODUCT050');
  });

  it('rejects duplicate mapping keys', () => {
    const { diagnostics } = parseConfig(
      'version: v1alpha1\nversion: v1alpha1\n',
      '.product/config.yaml',
    );
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.code).toBe('PRODUCT050');
  });

  it('ignores extension namespaces it does not own', () => {
    const { config, diagnostics } = parseConfig(
      'version: v1alpha1\nextensions:\n  com.example.othertool:\n    anything: goes\n',
      '.product/config.yaml',
    );
    expect(diagnostics).toEqual([]);
    expect(config.prodshape.citations['consumer-roots']).toEqual(['openspec']);
  });

  it('accepts an external consumer root: it is a read-only scan target, not a writable root', () => {
    // Deliberate asymmetry with generated.root. Consumer documents legitimately live outside the
    // product repository, and scanning them writes nothing, so the containment contract that
    // guards writable roots would only forbid a supported layout.
    const { config, diagnostics } = parseConfig(
      [
        'version: v1alpha1',
        'extensions:',
        '  prodshape:',
        '    citations:',
        '      consumer-roots:',
        '        - ../sibling-checkout/specs',
        '        - /srv/shared/specs',
      ].join('\n'),
      '.product/config.yaml',
    );
    expect(diagnostics).toEqual([]);
    expect(config.prodshape.citations['consumer-roots']).toEqual([
      '../sibling-checkout/specs',
      '/srv/shared/specs',
    ]);
  });

  it('provides documented defaults', () => {
    const config = defaultConfig();
    expect(config['product-root']).toBe('docs/product');
    expect(config.prodshape.generated.commit).toBe(false);
    // Where consumer documents live is the repository's decision; openspec is only the default.
    expect(config.prodshape.citations['consumer-roots']).toEqual(['openspec']);
  });

  it('reads its own extension namespace', () => {
    const { config, diagnostics } = parseConfig(
      [
        'version: v1alpha1',
        'extensions:',
        '  prodshape:',
        '    generated:',
        '      root: .product/out',
        '    integrations:',
        '      ai:',
        '        - claude',
        '      shorthand-commands: true',
        '    citations:',
        '      consumer-roots:',
        '        - specs',
        '        - docs/consumers',
      ].join('\n'),
      '.product/config.yaml',
    );
    expect(diagnostics).toEqual([]);
    expect(config.prodshape.generated.root).toBe('.product/out');
    expect(config.prodshape.integrations.ai).toEqual(['claude']);
    expect(config.prodshape.integrations['shorthand-commands']).toBe(true);
    expect(config.prodshape.citations['consumer-roots']).toEqual(['specs', 'docs/consumers']);
  });

  it.each([
    ['an absolute POSIX path', '/var/generated'],
    ['a drive-qualified path', 'C:/generated'],
    ['a parent-traversal path', '../generated'],
    ['a traversal in the middle', '.product/../../generated'],
    ['a backslash path', '.product\\generated'],
    ['a dot segment', './generated'],
    ['the current directory', '.'],
    ['an empty segment', '.product//generated'],
    ['a trailing separator', '.product/generated/'],
  ])('refuses %s as generated.root with PRODUCT050', (_label, root) => {
    const content = [
      'version: v1alpha1',
      'extensions:',
      '  prodshape:',
      '    generated:',
      `      root: ${JSON.stringify(root)}`,
    ].join('\n');
    const { diagnostics } = parseConfig(content, '.product/config.yaml');
    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: 'PRODUCT050',
        field: '/extensions/prodshape/generated/root',
      }),
    ]);
    expect(diagnostics[0]?.message).toContain('generated.root');
  });

  it('accepts a normalized repository-relative generated root', () => {
    const { config, diagnostics } = parseConfig(
      'version: v1alpha1\nextensions:\n  prodshape:\n    generated:\n      root: build/product\n',
      '.product/config.yaml',
    );
    expect(diagnostics).toEqual([]);
    expect(config.prodshape.generated.root).toBe('build/product');
  });

  it.each([
    ['a bare string', 'consumer-roots: specs'],
    ['a list with a non-string', 'consumer-roots:\n        - specs\n        - 7'],
    ['a list with an empty entry', "consumer-roots:\n        - ''"],
    // An empty list would scan nothing and report success: the false green the key prevents.
    ['an empty list', 'consumer-roots: []'],
  ])('rejects %s under its namespace with PRODUCT050', (_label, roots) => {
    const content = `version: v1alpha1\nextensions:\n  prodshape:\n    citations:\n      ${roots}\n`;
    const { diagnostics } = parseConfig(content, '.product/config.yaml');
    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: 'PRODUCT050',
        field: '/extensions/prodshape/citations/consumer-roots',
      }),
    ]);
  });
});
