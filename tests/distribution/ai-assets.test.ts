import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseArtifactDocument } from '@prodshape/core';
import { repoRoot } from '../helpers.js';

const skillNames = [
  'define-product',
  'recover-product',
  'analyze-product-change',
  'slice-product-change',
  'prepare-sdd-handoff',
  'audit-product-model',
];

const mandatorySections = [
  'Purpose',
  'When to use',
  'Required inputs',
  'Files to read',
  'Deterministic commands',
  'Reasoning procedure',
  'Allowed modifications',
  'Forbidden actions',
  'Human approval points',
  'Expected outputs',
  'Completion checks',
];

const commandNames = ['define', 'recover', 'change', 'slice', 'impact', 'handoff', 'audit'];
const hookNames = [
  'validate-product-change',
  'validate-before-handoff',
  'check-handoff-staleness',
  'verify-traceability',
];

const vendorPattern = /\b(claude|copilot|anthropic|openai|cursor|gemini)\b/i;

describe('canonical skills', () => {
  it.each(skillNames)(
    '%s has the eleven mandatory sections and stays provider-independent',
    async (name) => {
      const content = await readFile(join(repoRoot, 'skills', name, 'SKILL.md'), 'utf8');
      const parsed = parseArtifactDocument(content, `skills/${name}/SKILL.md`);
      expect(parsed.artifact?.frontmatter.name).toBe(name);
      expect(typeof parsed.artifact?.frontmatter.description).toBe('string');

      const headings = [...content.matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => m[1]);
      let cursor = 0;
      for (const section of mandatorySections) {
        const index = headings.indexOf(section, cursor);
        expect(index, `${name}: section '${section}' present and in order`).toBeGreaterThanOrEqual(
          0,
        );
        cursor = index + 1;
      }
      expect(vendorPattern.test(content), `${name}: no vendor names`).toBe(false);
    },
  );

  it('every skill ships at least one reference file', async () => {
    for (const name of skillNames) {
      const entries = await readdir(join(repoRoot, 'skills', name, 'references'));
      expect(entries.length, name).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('canonical commands', () => {
  it.each(commandNames)('/product:%s is a thin wrapper', async (name) => {
    const content = await readFile(join(repoRoot, 'commands', `${name}.md`), 'utf8');
    const lines = content.split('\n').filter((l) => l.trim() !== '');
    expect(lines.length, `${name}: thin (under 30 non-empty lines)`).toBeLessThan(30);
    expect(content).toContain(`/product:${name}`);
    expect(vendorPattern.test(content), `${name}: no vendor names`).toBe(false);
  });
});

describe('canonical hooks', () => {
  it.each(hookNames)('%s declares deterministic commands only', async (name) => {
    const content = await readFile(join(repoRoot, 'hooks', `${name}.json`), 'utf8');
    const hook = JSON.parse(content) as {
      schema: string;
      name: string;
      triggers: { event: string; run: string[] }[];
      blocking: boolean;
    };
    expect(hook.schema).toBe('product-definition-as-code/hook/v1alpha1');
    expect(hook.name).toBe(name);
    expect(hook.triggers.length).toBeGreaterThanOrEqual(1);
    for (const trigger of hook.triggers) {
      for (const command of trigger.run) {
        // Hooks invoke the canonical binary. `product-definition` remains a working v0.x alias,
        // but generated assets are what users read, so they name the brand.
        expect(command, `${name}: only prodshape commands`).toMatch(/^prodshape /);
      }
    }
    const promoteCommands = hook.triggers
      .flatMap((t) => t.run)
      .filter((c) => c.includes('promote'));
    for (const command of promoteCommands) expect(command).toContain('--dry-run');
  });
});
