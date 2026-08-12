import { describe, expect, it } from 'vitest';
import {
  mergeConfig,
  PDAC_CONTEXT_BLOCK,
  PDAC_OPERATIONS,
  PDAC_RULES,
  serializeConfig,
} from '@prodshape/integration-openspec';

/**
 * The merge logic is the heart of the OpenSpec integration: it must preserve every field the
 * user authored and only append PDaC guidance, deduplicating identical entries so the operation
 * is idempotent. These tests exercise that contract without requiring the OpenSpec CLI.
 */
describe('integration-openspec mergeConfig', () => {
  it('adds PDaC context, rules and operations to an empty config', () => {
    const { config, changes } = mergeConfig({});
    expect(config['schema']).toBeUndefined();
    expect(config['context']).toBe(PDAC_CONTEXT_BLOCK);
    expect(config['rules']).toEqual(PDAC_RULES);
    expect(config['operations']).toEqual(PDAC_OPERATIONS);
    expect(changes.length).toBe(3);
  });

  it('preserves the existing schema field', () => {
    const { config } = mergeConfig({ schema: 'spec-driven' });
    expect(config['schema']).toBe('spec-driven');
  });

  it('preserves the existing githubCopilot field', () => {
    const { config } = mergeConfig({ schema: 'spec-driven', githubCopilot: { cloudAgent: true } });
    expect(config['githubCopilot']).toEqual({ cloudAgent: true });
  });

  it('appends PDaC context after existing user context', () => {
    const existing = { context: 'My custom context line.\n' };
    const { config, changes } = mergeConfig(existing);
    const context = config['context'] as string;
    expect(context).toContain('My custom context line.');
    expect(context).toContain(PDAC_CONTEXT_BLOCK);
    expect(context.indexOf('My custom context line.')).toBeLessThan(
      context.indexOf(PDAC_CONTEXT_BLOCK),
    );
    expect(changes).toContain(
      'Appended PDaC context block to existing openspec/config.yaml context:.',
    );
  });

  it('is idempotent: merging twice produces the same result', () => {
    const first = mergeConfig({ schema: 'spec-driven', context: 'User context.\n' });
    const second = mergeConfig(first.config);
    expect(second.config).toEqual(first.config);
    expect(second.changes).toEqual([]);
  });

  it('replaces an outdated PDaC context block in place', () => {
    const oldBlock = '<!-- pdac:context begin -->\nOld PDaC context.\n<!-- pdac:context end -->';
    const existing = { context: `User line.\n${oldBlock}\nMore user text.` };
    const { config, changes } = mergeConfig(existing);
    const context = config['context'] as string;
    expect(context).toContain('User line.');
    expect(context).toContain('More user text.');
    expect(context).not.toContain('Old PDaC context.');
    expect(context).toContain(PDAC_CONTEXT_BLOCK);
    expect(changes).toContain('Updated PDaC context block in openspec/config.yaml (context:).');
  });

  it('appends PDaC rules to existing user rules, deduplicating', () => {
    const userRule = 'My own proposal rule.';
    const existing = { rules: { proposal: [userRule], specs: ['User spec rule.'] } };
    const { config, changes } = mergeConfig(existing);
    const rules = config['rules'] as Record<string, string[]>;
    expect(rules['proposal']).toContain(userRule);
    expect(rules['proposal']).toContain(PDAC_RULES['proposal']![0]);
    // User rule comes first, PDaC rules appended after.
    expect(rules['proposal']!.indexOf(userRule)).toBeLessThan(
      rules['proposal']!.indexOf(PDAC_RULES['proposal']![0]!),
    );
    expect(changes).toContain('Merged PDaC citation rules into openspec/config.yaml (rules:).');
  });

  it('does not duplicate PDaC rules on re-merge', () => {
    const first = mergeConfig({});
    const second = mergeConfig(first.config);
    expect(second.config['rules']).toEqual(first.config['rules']);
    expect(second.changes).not.toContain(
      'Merged PDaC citation rules into openspec/config.yaml (rules:).',
    );
  });

  it('appends PDaC operation guidance to existing guidance, deduplicating', () => {
    const existing = {
      operations: {
        apply: { guidance: ['User apply guidance.'] },
        archive: { guidance: ['User archive guidance.'] },
      },
    };
    const { config, changes } = mergeConfig(existing);
    const ops = config['operations'] as Record<string, { guidance: string[] }>;
    expect(ops['apply']!.guidance).toContain('User apply guidance.');
    expect(ops['apply']!.guidance).toContain(PDAC_OPERATIONS.apply.guidance[0]!);
    expect(ops['archive']!.guidance).toContain('User archive guidance.');
    expect(ops['archive']!.guidance).toContain(PDAC_OPERATIONS.archive.guidance[0]!);
    expect(changes).toContain(
      'Merged PDaC operation guidance into openspec/config.yaml (operations:).',
    );
  });

  it('handles a null existing config', () => {
    const { config, changes } = mergeConfig(null);
    expect(config['context']).toBe(PDAC_CONTEXT_BLOCK);
    expect(changes.length).toBe(3);
  });
});

describe('integration-openspec serializeConfig', () => {
  it('produces valid YAML with a trailing newline', () => {
    const yaml = serializeConfig({ schema: 'spec-driven', context: 'test' });
    expect(yaml.endsWith('\n')).toBe(true);
    expect(yaml).toContain('schema: spec-driven');
    expect(yaml).toContain('context: test');
  });

  it('round-trips through parse', async () => {
    const { parse } = await import('yaml');
    const original = {
      schema: 'spec-driven',
      context: 'line one\nline two',
      rules: { proposal: ['rule one', 'rule two'] },
    };
    const yaml = serializeConfig(original);
    const parsed = parse(yaml);
    expect(parsed).toEqual(original);
  });
});
