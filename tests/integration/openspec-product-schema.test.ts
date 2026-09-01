import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import {
  addOpenSpecIntegration,
  checkOpenSpecIntegration,
  loadProductSchemaAssets,
  OPENSPEC_PRODUCT_SCHEMA_RELATIVE,
  PRODUCT_SCHEMA_MIN_OPENSPEC,
  removeOpenSpecIntegration,
  updateOpenSpecIntegration,
} from '@prodshape/integration-openspec';

/**
 * The OpenSpec product schema ships as managed assets installed into openspec/schemas/product,
 * the framework's official project-local schema surface. These tests exercise the managed
 * lifecycle (install, idempotence, dry run, tamper repair, capability-specific availability,
 * removal) without requiring the OpenSpec CLI.
 */

const SCHEMA_FILES = [
  'openspec/schemas/product/schema.yaml',
  'openspec/schemas/product/scripts/product-apply.mjs',
  'openspec/schemas/product/scripts/product-validate.mjs',
  'openspec/schemas/product/templates/change.md',
  'openspec/schemas/product/templates/proposal.md',
];

async function scratchWorkspace(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'prodshape-openspec-product-schema-'));
  await mkdir(join(dir, 'openspec'), { recursive: true });
  return dir;
}

describe('openspec product schema assets', () => {
  it('bundles exactly the managed asset set', async () => {
    const assets = await loadProductSchemaAssets();
    expect(assets.map((asset) => `${OPENSPEC_PRODUCT_SCHEMA_RELATIVE}/${asset.relative}`)).toEqual(
      SCHEMA_FILES,
    );
  });

  it('ships a schema.yaml with the intent -> delta DAG and an apply phase requiring the delta', async () => {
    const assets = await loadProductSchemaAssets();
    const schemaYaml = assets.find((asset) => asset.relative === 'schema.yaml');
    expect(schemaYaml).toBeDefined();
    const schema = parse(schemaYaml!.content) as {
      name: string;
      version: number;
      artifacts: { id: string; generates: string; template: string; requires?: string[] }[];
      apply: { requires: string[]; instruction: string };
    };
    expect(schema.name).toBe('product');
    expect(schema.version).toBe(1);
    expect(schema.artifacts.map((artifact) => artifact.id)).toEqual(['intent', 'delta']);
    const ids = new Set(schema.artifacts.map((artifact) => artifact.id));
    for (const artifact of schema.artifacts) {
      for (const required of artifact.requires ?? []) {
        expect(ids.has(required)).toBe(true);
      }
    }
    const delta = schema.artifacts.find((artifact) => artifact.id === 'delta')!;
    expect(delta.requires).toEqual(['intent']);
    expect(delta.generates).toBe('product/**/*.md');
    // Apply is the schema's apply phase, never a third artifact.
    expect(schema.apply.requires).toEqual(['delta']);
    expect(schema.apply.instruction).toContain('product-apply.mjs');
    expect(schema.apply.instruction).toContain('Do not archive this change as part of apply');
    // Every referenced template resolves to a bundled asset.
    for (const artifact of schema.artifacts) {
      expect(
        assets.some((asset) => asset.relative === `templates/${artifact.template}`),
      ).toBe(true);
    }
  });

  it('never points the delta at specs/, so OpenSpec records skip_specs for product changes', async () => {
    const assets = await loadProductSchemaAssets();
    const schemaYaml = assets.find((asset) => asset.relative === 'schema.yaml')!;
    const schema = parse(schemaYaml.content) as { artifacts: { generates: string }[] };
    for (const artifact of schema.artifacts) {
      expect(artifact.generates.startsWith('specs/')).toBe(false);
    }
  });
});

describe('openspec product schema managed lifecycle (no OpenSpec CLI needed)', () => {
  it('add installs the schema files and records them in the integration metadata', async () => {
    const dir = await scratchWorkspace();
    try {
      const result = await addOpenSpecIntegration(dir, { cliVersion: '1.11.0' });
      for (const relative of SCHEMA_FILES) {
        expect(result.written).toContain(relative);
        await expect(readFile(join(dir, ...relative.split('/')), 'utf8')).resolves.toBeTruthy();
      }
      expect(result.changes).toContain(
        'Installed the OpenSpec product schema at openspec/schemas/product.',
      );
      expect(result.meta.productSchema).toEqual({
        name: 'product',
        requiresOpenspec: PRODUCT_SCHEMA_MIN_OPENSPEC,
        files: SCHEMA_FILES,
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('a second add rewrites nothing', async () => {
    const dir = await scratchWorkspace();
    try {
      await addOpenSpecIntegration(dir, { cliVersion: '1.11.0' });
      const before = new Map<string, number>();
      for (const relative of SCHEMA_FILES) {
        before.set(relative, (await stat(join(dir, ...relative.split('/')))).mtimeMs);
      }
      const second = await addOpenSpecIntegration(dir, { cliVersion: '1.11.0' });
      expect(second.written).toEqual([]);
      for (const relative of SCHEMA_FILES) {
        expect((await stat(join(dir, ...relative.split('/')))).mtimeMs).toBe(before.get(relative));
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('a dry run reports the installation without writing anything', async () => {
    const dir = await scratchWorkspace();
    try {
      const result = await addOpenSpecIntegration(dir, { cliVersion: '1.11.0', dryRun: true });
      expect(result.changes).toContain(
        'Installed the OpenSpec product schema at openspec/schemas/product.',
      );
      expect(result.written).toEqual([]);
      await expect(stat(join(dir, 'openspec', 'schemas'))).rejects.toThrow();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('installs under a floor-violating CLI too, stating the product workflow is unavailable', async () => {
    const dir = await scratchWorkspace();
    try {
      const result = await addOpenSpecIntegration(dir, { cliVersion: '1.2.3' });
      for (const relative of SCHEMA_FILES) {
        expect(result.written).toContain(relative);
      }
      expect(
        result.changes.some((change) =>
          change.startsWith(
            `Product workflow unavailable until OpenSpec >= ${PRODUCT_SCHEMA_MIN_OPENSPEC}`,
          ),
        ),
      ).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('update replaces a tampered managed schema file', async () => {
    const dir = await scratchWorkspace();
    try {
      await addOpenSpecIntegration(dir, { cliVersion: '1.11.0' });
      const target = join(dir, 'openspec', 'schemas', 'product', 'schema.yaml');
      await writeFile(target, 'name: tampered\n', 'utf8');
      const result = await updateOpenSpecIntegration(dir);
      expect(result.written).toContain('openspec/schemas/product/schema.yaml');
      const restored = await readFile(target, 'utf8');
      expect(restored).toContain('name: product');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('check reports managed-state defects as failures and availability as a verdict', async () => {
    const dir = await scratchWorkspace();
    try {
      await addOpenSpecIntegration(dir, { cliVersion: '1.11.0' });
      const intact = await checkOpenSpecIntegration(dir);
      const intactCheck = intact.checks.find((check) => check.name === 'product workflow');
      expect(intactCheck).toBeDefined();
      // The files are intact, so the managed state passes; whether the detail says available or
      // UNAVAILABLE depends on the machine's real OpenSpec CLI, which this suite must not assume.
      expect(intactCheck!.ok).toBe(true);
      expect(intactCheck!.detail).toMatch(/^Product workflow (available|UNAVAILABLE)/);

      await writeFile(
        join(dir, 'openspec', 'schemas', 'product', 'schema.yaml'),
        'name: tampered\n',
        'utf8',
      );
      const tampered = await checkOpenSpecIntegration(dir);
      const tamperedCheck = tampered.checks.find((check) => check.name === 'product workflow');
      expect(tamperedCheck!.ok).toBe(false);
      expect(tamperedCheck!.detail).toContain('openspec/schemas/product/schema.yaml');
      expect(tampered.ok).toBe(false);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('check fails when the integration predates the product schema', async () => {
    const dir = await scratchWorkspace();
    try {
      await addOpenSpecIntegration(dir, { cliVersion: '1.11.0' });
      // Simulate metadata written by an older ProductShape: no productSchema record.
      const metaPath = join(dir, '.product', 'integrations', 'openspec.json');
      const meta = JSON.parse(await readFile(metaPath, 'utf8')) as Record<string, unknown>;
      delete meta['productSchema'];
      await writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
      const result = await checkOpenSpecIntegration(dir);
      const check = result.checks.find((entry) => entry.name === 'product workflow');
      expect(check!.ok).toBe(false);
      expect(check!.detail).toContain('Run: prodshape integration update');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('remove deletes the managed schema files, prunes emptied directories and preserves user files', async () => {
    const dir = await scratchWorkspace();
    try {
      await addOpenSpecIntegration(dir, { cliVersion: '1.11.0' });
      // A user schema beside ours and a user file inside ours must both survive.
      await mkdir(join(dir, 'openspec', 'schemas', 'custom'), { recursive: true });
      await writeFile(join(dir, 'openspec', 'schemas', 'custom', 'schema.yaml'), 'name: custom\n');
      await writeFile(join(dir, 'openspec', 'schemas', 'product', 'NOTES.md'), 'user notes\n');

      const result = await removeOpenSpecIntegration(dir);
      for (const relative of SCHEMA_FILES) {
        expect(result.removed).toContain(relative);
        await expect(stat(join(dir, ...relative.split('/')))).rejects.toThrow();
      }
      // Emptied managed directories are pruned; directories still holding user files are not.
      await expect(stat(join(dir, 'openspec', 'schemas', 'product', 'templates'))).rejects.toThrow();
      await expect(stat(join(dir, 'openspec', 'schemas', 'product', 'scripts'))).rejects.toThrow();
      expect(await readdir(join(dir, 'openspec', 'schemas', 'product'))).toEqual(['NOTES.md']);
      expect(await readdir(join(dir, 'openspec', 'schemas', 'custom'))).toEqual(['schema.yaml']);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('remove prunes openspec/schemas entirely when nothing user-authored remains', async () => {
    const dir = await scratchWorkspace();
    try {
      await addOpenSpecIntegration(dir, { cliVersion: '1.11.0' });
      await removeOpenSpecIntegration(dir);
      await expect(stat(join(dir, 'openspec', 'schemas'))).rejects.toThrow();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
