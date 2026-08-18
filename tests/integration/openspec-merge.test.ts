import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse, stringify } from 'yaml';
import {
  addOpenSpecIntegration,
  bootstrapOpenSpecWorkspace,
  currentManagedStrings,
  mergeConfig,
  PDAC_CONTEXT_BLOCK,
  PDAC_OPERATIONS,
  PDAC_RULES,
  removeOpenSpecIntegration,
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

describe('integration-openspec mergeConfig with previously managed strings', () => {
  it('replaces a previously injected rule whose wording changed', () => {
    const oldRule = 'Old PDaC proposal rule that was since reworded.';
    const existing = { rules: { proposal: ['My user rule.', oldRule] } };
    const { config, changes } = mergeConfig(existing, {
      rules: { proposal: [oldRule] },
      operations: {},
    });
    const rules = config['rules'] as Record<string, string[]>;
    expect(rules['proposal']).not.toContain(oldRule);
    expect(rules['proposal']).toContain('My user rule.');
    for (const rule of PDAC_RULES['proposal']!) {
      expect(rules['proposal']).toContain(rule);
    }
    expect(changes).toContain(
      'Merged PDaC citation rules into openspec/config.yaml (rules:), replacing outdated PDaC entries.',
    );
  });

  it('replaces previously injected operation guidance whose wording changed', () => {
    const oldGuidance = 'Old PDaC apply guidance.';
    const existing = { operations: { apply: { guidance: ['User guidance.', oldGuidance] } } };
    const { config, changes } = mergeConfig(existing, {
      rules: {},
      operations: { apply: [oldGuidance] },
    });
    const ops = config['operations'] as Record<string, { guidance: string[] }>;
    expect(ops['apply']!.guidance).not.toContain(oldGuidance);
    expect(ops['apply']!.guidance).toContain('User guidance.');
    expect(ops['apply']!.guidance).toContain(PDAC_OPERATIONS.apply.guidance[0]!);
    expect(changes).toContain(
      'Merged PDaC operation guidance into openspec/config.yaml (operations:), replacing outdated PDaC entries.',
    );
  });

  it('never removes user entries: only recorded PDaC strings are replaced', () => {
    const existing = { rules: { proposal: ['My user rule.'] } };
    const { config } = mergeConfig(existing, {
      rules: { proposal: ['A recorded string the user never had.'] },
      operations: {},
    });
    const rules = config['rules'] as Record<string, string[]>;
    expect(rules['proposal']).toContain('My user rule.');
  });

  it('is idempotent when the recorded strings match the current guidance', () => {
    const first = mergeConfig({}, undefined);
    const second = mergeConfig(first.config, currentManagedStrings());
    expect(second.config).toEqual(first.config);
    expect(second.changes).toEqual([]);
  });
});

describe('integration-openspec managed lifecycle on disk (no OpenSpec CLI needed)', () => {
  async function scratchWorkspace(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'prodshape-openspec-lifecycle-'));
    await mkdir(join(dir, 'openspec'), { recursive: true });
    return dir;
  }

  it('addOpenSpecIntegration with cliVersion skips the CLI probe and records managed strings', async () => {
    const dir = await scratchWorkspace();
    try {
      const result = await addOpenSpecIntegration(dir, { cliVersion: '1.2.3' });
      expect(result.meta.openspecVersion).toBe('1.2.3');
      expect(result.written).toContain('openspec/config.yaml');
      const meta = JSON.parse(
        await readFile(join(dir, '.product', 'integrations', 'openspec.json'), 'utf8'),
      ) as { openspecVersion: string; managed?: { rules: Record<string, string[]> } };
      expect(meta.openspecVersion).toBe('1.2.3');
      expect(meta.managed?.rules['specs']).toEqual(PDAC_RULES['specs']);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects a cliVersion below the supported minimum', async () => {
    const dir = await scratchWorkspace();
    try {
      await expect(addOpenSpecIntegration(dir, { cliVersion: '0.9.0' })).rejects.toThrow(
        'below the minimum supported',
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('a re-run replaces a rule the metadata recorded under its old wording', async () => {
    const dir = await scratchWorkspace();
    try {
      await addOpenSpecIntegration(dir, { cliVersion: '1.2.3' });

      // Simulate a past install whose guidance wording has since changed: the config carries the
      // old string and the metadata records it as PDaC-managed.
      const configPath = join(dir, 'openspec', 'config.yaml');
      const config = parse(await readFile(configPath, 'utf8')) as {
        rules: Record<string, string[]>;
      };
      const oldRule = 'Old PDaC specs rule that was since reworded.';
      config.rules['specs'] = [oldRule, ...config.rules['specs']!];
      await writeFile(configPath, `${stringify(config)}\n`, 'utf8');
      const metaPath = join(dir, '.product', 'integrations', 'openspec.json');
      const meta = JSON.parse(await readFile(metaPath, 'utf8')) as {
        managed: { rules: Record<string, string[]>; operations: Record<string, string[]> };
      };
      meta.managed.rules['specs'] = [oldRule, ...meta.managed.rules['specs']!];
      await writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');

      await addOpenSpecIntegration(dir, { cliVersion: '1.2.3', force: true });
      const merged = parse(await readFile(configPath, 'utf8')) as {
        rules: Record<string, string[]>;
      };
      expect(merged.rules['specs']).not.toContain(oldRule);
      expect(merged.rules['specs']).toEqual(PDAC_RULES['specs']);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('remove honours recorded strings and keeps user entries', async () => {
    const dir = await scratchWorkspace();
    try {
      await addOpenSpecIntegration(dir, { cliVersion: '1.2.3' });

      const configPath = join(dir, 'openspec', 'config.yaml');
      const config = parse(await readFile(configPath, 'utf8')) as {
        rules: Record<string, string[]>;
      };
      const oldRule = 'Old PDaC specs rule left behind by an older ProductShape.';
      config.rules['specs'] = [oldRule, 'My user rule.', ...config.rules['specs']!];
      await writeFile(configPath, `${stringify(config)}\n`, 'utf8');
      const metaPath = join(dir, '.product', 'integrations', 'openspec.json');
      const meta = JSON.parse(await readFile(metaPath, 'utf8')) as {
        managed: { rules: Record<string, string[]>; operations: Record<string, string[]> };
      };
      meta.managed.rules['specs'] = [oldRule, ...meta.managed.rules['specs']!];
      await writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');

      await removeOpenSpecIntegration(dir);
      const cleaned = parse(await readFile(configPath, 'utf8')) as {
        rules?: Record<string, string[]>;
      };
      expect(cleaned.rules?.['specs']).toEqual(['My user rule.']);
      await expect(readFile(metaPath, 'utf8')).rejects.toThrow();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('bootstrap refuses when a workspace already exists', async () => {
    const dir = await scratchWorkspace();
    try {
      await expect(bootstrapOpenSpecWorkspace(dir)).rejects.toThrow(
        'An OpenSpec workspace already exists',
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('integration-openspec serializeConfig', () => {
  it('produces valid YAML with a trailing newline', () => {
    const yaml = serializeConfig({ schema: 'spec-driven', context: 'test' });
    expect(yaml.endsWith('\n')).toBe(true);
    expect(yaml.endsWith('\n\n')).toBe(false);
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
