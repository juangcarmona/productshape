import { describe, expect, it } from 'vitest';
import { checkRequiredBodySections } from './body-sections.js';

const completeRule = '## Rule\nr\n## Rationale\nr\n## Examples\ne\n## Exceptions\nNone.\n';

describe('checkRequiredBodySections', () => {
  it('accepts a body with all required sections in order', () => {
    expect(checkRequiredBodySections('business-rule', completeRule, 'br.md')).toHaveLength(0);
  });

  it('reports a missing section as PRODUCT009', () => {
    const body = '## Rule\nr\n## Rationale\nr\n## Examples\ne\n';
    expect(checkRequiredBodySections('business-rule', body, 'br.md')).toEqual([
      expect.objectContaining({ code: 'PRODUCT009', field: 'Exceptions' }),
    ]);
  });

  it('reports out-of-order sections', () => {
    const body = '## Rationale\nr\n## Rule\nr\n## Examples\ne\n## Exceptions\nNone.\n';
    const diagnostics = checkRequiredBodySections('business-rule', body, 'br.md');
    expect(diagnostics.some((d) => d.message.includes('out of order'))).toBe(true);
  });

  it('allows additional sections after the required ones', () => {
    const body = `${completeRule}## Notes\nextra\n`;
    expect(checkRequiredBodySections('business-rule', body, 'br.md')).toHaveLength(0);
  });

  it('ignores kinds without a body contract', () => {
    expect(checkRequiredBodySections('delivery-slice', '', 'x.yaml')).toHaveLength(0);
  });
});
