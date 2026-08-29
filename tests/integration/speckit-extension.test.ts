import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { extractScopeDeclaration } from '@prodshape/core';
import { repoRoot } from '../helpers.js';

const execFileAsync = promisify(execFile);

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
    category: string;
    effect: string;
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

  /**
   * The community catalog and `specify extension info` display these two facets, and the release
   * updater copies them into the catalog entry, so a missing one ships an incomplete entry.
   * Both are closed vocabularies in Spec Kit's community documentation.
   */
  it('declares the catalog facets with values from the documented vocabularies', async () => {
    const manifest = await loadManifest();
    expect(['docs', 'code', 'process', 'integration', 'visibility']).toContain(
      manifest.extension.category,
    );
    expect(['read-only', 'read-write']).toContain(manifest.extension.effect);
  });

  it('ships a changelog covering the declared version', async () => {
    const manifest = await loadManifest();
    const changelog = await readFile(join(extensionDir, 'CHANGELOG.md'), 'utf8');
    expect(changelog).toContain(`## ${manifest.extension.version}`);
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

/**
 * The installable catalog (extensions/catalog.json) and its release-time updater. The catalog is
 * served raw from main and consumed by `specify extension catalog add`; its pdac entry, when
 * present, must be internally consistent (the download URL pins the entry's own version tag, the
 * sha256 is well-formed, identity matches the manifest). The entry may lag the manifest version:
 * the catalog serves released versions, and a version in development is not released yet.
 */
describe('pdac extension catalog', () => {
  const catalogPath = join(repoRoot, 'extensions', 'catalog.json');

  interface CatalogEntry {
    id: string;
    name: string;
    version: string;
    repository: string;
    license: string;
    download_url: string;
    sha256: string;
  }

  async function loadCatalog(): Promise<{
    schema_version: string;
    extensions: Record<string, CatalogEntry>;
  }> {
    return JSON.parse(await readFile(catalogPath, 'utf8'));
  }

  it('parses with the shape the specify CLI validates', async () => {
    const catalog = await loadCatalog();
    expect(catalog.schema_version).toBe('1.0');
    expect(typeof catalog.extensions).toBe('object');
    expect(Array.isArray(catalog.extensions)).toBe(false);
  });

  it('keeps any pdac entry internally consistent with the manifest identity', async () => {
    const catalog = await loadCatalog();
    const entry = catalog.extensions['pdac'];
    if (!entry) return; // No release served yet; the empty catalog is a valid state.
    const manifest = await loadManifest();
    expect(entry.id).toBe('pdac');
    expect(entry.name).toBe(manifest.extension.name);
    expect(entry.repository).toBe(manifest.extension.repository);
    expect(entry.license).toBe(manifest.extension.license);
    expect(entry.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(entry.download_url).toBe(
      `https://github.com/juangcarmona/productshape/releases/download/speckit-pdac-v${entry.version}/speckit-pdac.zip`,
    );
    expect(entry.sha256).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it('the release updater writes a consistent entry for the manifest version', async () => {
    const manifest = await loadManifest();
    const version = manifest.extension.version;
    const sha = 'a'.repeat(64);
    const dir = await mkdtemp(join(tmpdir(), 'prodshape-catalog-'));
    try {
      const scratch = join(dir, 'catalog.json');
      await copyFile(catalogPath, scratch);
      await execFileAsync(
        process.execPath,
        [join(repoRoot, 'scripts', 'update-speckit-catalog.mjs'), version, sha, scratch],
        { cwd: repoRoot },
      );
      const updated = JSON.parse(await readFile(scratch, 'utf8'));
      const entry = updated.extensions['pdac'];
      expect(entry.version).toBe(version);
      expect(entry.sha256).toBe(`sha256:${sha}`);
      expect(entry.download_url).toContain(`speckit-pdac-v${version}/speckit-pdac.zip`);
      expect(entry.name).toBe(manifest.extension.name);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('the release updater refuses a version the manifest does not declare', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'prodshape-catalog-'));
    try {
      const scratch = join(dir, 'catalog.json');
      await copyFile(catalogPath, scratch);
      await expect(
        execFileAsync(
          process.execPath,
          [
            join(repoRoot, 'scripts', 'update-speckit-catalog.mjs'),
            '99.99.99',
            'b'.repeat(64),
            scratch,
          ],
          { cwd: repoRoot },
        ),
      ).rejects.toThrow(/version mismatch|Command failed/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
