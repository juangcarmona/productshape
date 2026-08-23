import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { extractScopeDeclaration } from '@prodshape/core';
import { repoRoot } from '../helpers.js';

/**
 * Structural integrity of the pdac Spec Kit extension (extensions/speckit-pdac): the manifest
 * parses against the spec-kit extension schema shape, every provided command file exists and
 * carries the frontmatter the installer reads, and every hook references a provided command.
 * The real `specify extension add` install is exercised in tests/conformance/ when the CLI is
 * present; this suite guards the contract everywhere.
 */

const extensionDir = join(repoRoot, 'extensions', 'speckit-pdac');

interface ExtensionManifest {
  schema_version: string;
  extension: {
    id: string;
    name: string;
    version: string;
    description: string;
    repository: string;
    license: string;
  };
  requires: { speckit_version: string };
  provides: { commands: Array<{ name: string; file: string; description: string }> };
  hooks: Record<string, { command: string; optional: boolean; description: string }>;
  tags: string[];
}

async function loadManifest(): Promise<ExtensionManifest> {
  return parse(await readFile(join(extensionDir, 'extension.yml'), 'utf8')) as ExtensionManifest;
}

describe('pdac Spec Kit extension manifest', () => {
  it('declares the expected identity and schema', async () => {
    const manifest = await loadManifest();
    expect(manifest.schema_version).toBe('1.0');
    expect(manifest.extension.id).toBe('pdac');
    expect(manifest.extension.license).toBe('Apache-2.0');
    expect(manifest.extension.repository).toBe('https://github.com/juangcarmona/productshape');
  });

  it('provides command files that exist and carry frontmatter descriptions', async () => {
    const manifest = await loadManifest();
    expect(manifest.provides.commands.map((c) => c.name)).toEqual([
      'speckit.pdac.context',
      'speckit.pdac.verify',
    ]);
    for (const command of manifest.provides.commands) {
      const path = join(extensionDir, ...command.file.split('/'));
      expect(existsSync(path), command.file).toBe(true);
      const content = await readFile(path, 'utf8');
      expect(content.startsWith('---\n'), command.file).toBe(true);
      expect(content, command.file).toContain(`description: '${command.description}'`);
    }
  });

  it('hooks the verify command after specify, plan and tasks, all optional', async () => {
    const manifest = await loadManifest();
    expect(Object.keys(manifest.hooks).sort()).toEqual([
      'after_plan',
      'after_specify',
      'after_tasks',
    ]);
    const provided = new Set(manifest.provides.commands.map((c) => c.name));
    for (const [name, hook] of Object.entries(manifest.hooks)) {
      expect(provided.has(hook.command), name).toBe(true);
      expect(hook.optional, name).toBe(true);
    }
  });

  it('command files never carry a parseable citation, scope declaration or drift marker', async () => {
    const manifest = await loadManifest();
    for (const command of manifest.provides.commands) {
      const content = await readFile(join(extensionDir, ...command.file.split('/')), 'utf8');
      expect(/\{pdac:cite\s/.test(content), command.file).toBe(false);
      expect(/<!--\s*pdac:cite/.test(content), command.file).toBe(false);
      expect(extractScopeDeclaration(content, command.file), command.file).toBeNull();
      expect(
        content.split('\n').some((l) => /^\s*<!--\s*pdac-drift\b/.test(l)),
        command.file,
      ).toBe(false);
    }
  });
});
