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
    author: string;
    repository: string;
    homepage: string;
    license: string;
    category: string;
    effect: string;
  };
  requires: {
    speckit_version: string;
    tools?: Array<{ name: string; version?: string; required?: boolean }>;
  };
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

  /**
   * The catalog entry a submission produces is generated from these fields, so a missing one
   * ships an incomplete listing. `homepage` and `changelog` are carried by essentially every
   * entry in Spec Kit's community catalog, and the description has a hard 200-character limit
   * in the extension API reference.
   */
  it('carries the optional identity fields a catalog entry needs', async () => {
    const manifest = await loadManifest();
    expect(manifest.extension.homepage).toMatch(/^https:\/\//);
    expect(manifest.extension.author).toBeTruthy();
    expect(manifest.extension.description.length).toBeLessThanOrEqual(200);
  });

  /**
   * ProductShape is what both commands actually run, so the manifest states it as a tool
   * requirement rather than leaving a catalog reader to infer it from the description.
   *
   * The floor is 0.16.0, not the 0.14.0 that was documented before: 0.14.0 introduced the Spec
   * Kit provider, but `citations verify --provider speckit --format json` — step 1 of
   * speckit.pdac.verify — fails there, and 0.14.0 does not read the `pdac-scope` exemption
   * carrier the command instructs the agent to write. 0.15.0 was never published.
   */
  it('declares the ProductShape tool requirement at the verified floor', async () => {
    const manifest = await loadManifest();
    const tools = manifest.requires.tools ?? [];
    const prodshape = tools.find((tool) => tool.name === 'prodshape');
    expect(prodshape, 'requires.tools must name prodshape').toBeDefined();
    expect(prodshape?.version).toBe('>=0.16.0');
    expect(prodshape?.required).toBe(true);
  });

  /**
   * The release archive is built from this directory alone (`git archive HEAD:extensions/
   * speckit-pdac`), so the repository-root LICENSE never reaches it. Spec Kit's publishing
   * guide requires a LICENSE inside the extension, and the submission checklist asserts one.
   */
  it('ships its own LICENSE, because the release archive carries only this directory', async () => {
    const license = join(extensionDir, 'LICENSE');
    expect(existsSync(license)).toBe(true);
    expect(await readFile(license, 'utf8')).toContain('Apache License');
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
 * sha256 is well-formed, identity matches the matching manifest). Each extension is independently
 * releasable and the catalog may serve a version older than its working-tree manifest.
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

  it('keeps the released pdac entry internally consistent with the manifest identity', async () => {
    const catalog = await loadCatalog();
    const entry = catalog.extensions.pdac;
    expect(entry).toBeDefined();
    expect(entry?.id).toBe('pdac');
    expect(entry?.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(entry?.download_url).toBe(
      `https://github.com/juangcarmona/productshape/releases/download/speckit-pdac-v${entry?.version}/speckit-pdac.zip`,
    );
    expect(entry?.sha256).toMatch(/^sha256:[0-9a-f]{64}$/);
    const manifest = await loadManifest();
    expect(catalog.extensions.pdac?.name).toBe(manifest.extension.name);
    expect(catalog.extensions.pdac?.repository).toBe(manifest.extension.repository);
    expect(catalog.extensions.pdac?.license).toBe(manifest.extension.license);
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
        [join(repoRoot, 'scripts', 'update-speckit-catalog.mjs'), 'pdac', version, sha, scratch],
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
            'pdac',
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

  it('updates a temporary catalog for pdac-product without advertising it in production', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'prodshape-catalog-'));
    try {
      const scratch = join(dir, 'catalog.json');
      await copyFile(catalogPath, scratch);
      await execFileAsync(
        process.execPath,
        [
          join(repoRoot, 'scripts', 'update-speckit-catalog.mjs'),
          'pdac-product',
          '0.1.0',
          'c'.repeat(64),
          scratch,
        ],
        { cwd: repoRoot },
      );
      const updated = JSON.parse(await readFile(scratch, 'utf8'));
      expect(updated.extensions['pdac-product']).toMatchObject({
        id: 'pdac-product',
        version: '0.1.0',
        sha256: `sha256:${'c'.repeat(64)}`,
        download_url:
          'https://github.com/juangcarmona/productshape/releases/download/speckit-pdac-product-v0.1.0/speckit-pdac-product.zip',
      });
      const production = await loadCatalog();
      expect(production.extensions['pdac-product']).toBeUndefined();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

/**
 * The ready-to-copy community submission payload in RELEASING.md.
 *
 * It is what a human pastes into Spec Kit's Extension Submission issue form, which makes it a
 * published claim about this extension that no code path validates. It had drifted: it named
 * version 0.1.0 against a 0.2.0 manifest, `speckit_version: ">=0.2.0"` against a `>=0.7.2`
 * manifest, and a ProductShape floor of 0.14.0 that does not actually work. This suite ties it
 * to the manifest so the next drift fails here instead of reaching an upstream issue.
 */
describe('the community submission payload documented in RELEASING.md', () => {
  interface SubmissionEntry {
    id: string;
    name: string;
    version: string;
    description: string;
    repository: string;
    homepage: string;
    changelog: string;
    license: string;
    category: string;
    effect: string;
    download_url: string;
    requires: {
      speckit_version: string;
      tools?: Array<{ name: string; version?: string; required?: boolean }>;
    };
    provides: { commands: number; hooks: number };
    tags: string[];
  }

  async function loadSubmissionEntry(): Promise<SubmissionEntry> {
    const releasing = await readFile(join(repoRoot, 'RELEASING.md'), 'utf8');
    const start = releasing.indexOf('"pdac": {');
    expect(start, 'RELEASING.md must carry the pdac submission entry').toBeGreaterThan(-1);
    const fence = releasing.indexOf('```', start);
    const body = releasing.slice(start, fence);
    return (JSON.parse(`{${body.trimEnd().replace(/,$/, '')}}`) as Record<string, SubmissionEntry>)[
      'pdac'
    ] as SubmissionEntry;
  }

  it('matches the manifest field for field', async () => {
    const manifest = await loadManifest();
    const entry = await loadSubmissionEntry();
    expect(entry.id).toBe(manifest.extension.id);
    expect(entry.name).toBe(manifest.extension.name);
    expect(entry.version).toBe(manifest.extension.version);
    expect(entry.description).toBe(manifest.extension.description);
    expect(entry.repository).toBe(manifest.extension.repository);
    expect(entry.homepage).toBe(manifest.extension.homepage);
    expect(entry.license).toBe(manifest.extension.license);
    expect(entry.category).toBe(manifest.extension.category);
    expect(entry.effect).toBe(manifest.extension.effect);
    expect(entry.requires.speckit_version).toBe(manifest.requires.speckit_version);
    expect(entry.requires.tools).toEqual(manifest.requires.tools);
    expect(entry.provides.commands).toBe(manifest.provides.commands.length);
    expect(entry.provides.hooks).toBe(Object.keys(manifest.hooks).length);
    expect(entry.tags).toEqual(manifest.tags);
  });

  /**
   * A catalog entry names exactly one version, so its download URL must name exactly one
   * release. The `releases/latest/download` alias the entry used to carry would start serving a
   * different artifact than the entry's own `version` field names at the very next release.
   */
  it('pins the download URL to the release tag its version names', async () => {
    const entry = await loadSubmissionEntry();
    expect(entry.download_url).toBe(
      `https://github.com/juangcarmona/productshape/releases/download/speckit-pdac-v${entry.version}/speckit-pdac.zip`,
    );
  });

  it('names the documentation and changelog files that exist', async () => {
    const entry = await loadSubmissionEntry();
    expect(existsSync(join(extensionDir, 'CHANGELOG.md'))).toBe(true);
    expect(entry.changelog).toContain('extensions/speckit-pdac/CHANGELOG.md');
  });

  /**
   * Spec Kit's publishing guide states it outright: do not open a pull request against
   * catalog.community.json. The submission is an issue on the Extension Submission form, whose
   * automation writes the catalog PR. RELEASING.md described the older manual-PR process.
   */
  it('describes the issue-form submission route, not a manual pull request', async () => {
    const releasing = await readFile(join(repoRoot, 'RELEASING.md'), 'utf8');
    const section = releasing.slice(releasing.indexOf('### Community catalog listing'));
    expect(section).toContain('extension_submission.yml');
    expect(section).toContain('extension-submission');
    expect(section).not.toMatch(/one-time manual PR/);
  });
});
