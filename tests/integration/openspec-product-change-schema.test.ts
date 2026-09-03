import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { contentDigest } from '@prodshape/core';
import {
  addOpenSpecIntegration,
  checkOpenSpecIntegration,
  loadProductChangeSchemaAssets,
  loadProductRecoverySchemaAssets,
  OPENSPEC_PRODUCT_CHANGE_SCHEMA_RELATIVE,
  OPENSPEC_PRODUCT_RECOVERY_SCHEMA_RELATIVE,
  PRODUCT_CHANGE_SCHEMA_MIN_OPENSPEC,
  removeOpenSpecIntegration,
  updateOpenSpecIntegration,
} from '@prodshape/integration-openspec';

/**
 * The OpenSpec product schema ships as managed assets installed into openspec/schemas/product-change,
 * the framework's official project-local schema surface. These tests exercise the managed
 * lifecycle (install, idempotence, dry run, tamper repair, capability-specific availability,
 * removal) without requiring the OpenSpec CLI.
 */

const SCHEMA_FILES = [
  'openspec/schemas/product-change/schema.yaml',
  'openspec/schemas/product-change/scripts/product-apply.mjs',
  'openspec/schemas/product-change/scripts/product-validate.mjs',
  'openspec/schemas/product-change/templates/change.md',
  'openspec/schemas/product-change/templates/proposal.md',
];

async function scratchWorkspace(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'prodshape-openspec-product-change-schema-'));
  await mkdir(join(dir, 'openspec'), { recursive: true });
  return dir;
}

describe('openspec product schema assets', () => {
  it('bundles the independent product-recovery workload', async () => {
    const assets = await loadProductRecoverySchemaAssets();
    expect(assets.map((asset) => `${OPENSPEC_PRODUCT_RECOVERY_SCHEMA_RELATIVE}/${asset.relative}`)).toEqual([
      `${OPENSPEC_PRODUCT_RECOVERY_SCHEMA_RELATIVE}/schema.yaml`,
      `${OPENSPEC_PRODUCT_RECOVERY_SCHEMA_RELATIVE}/templates/brief.md`,
      `${OPENSPEC_PRODUCT_RECOVERY_SCHEMA_RELATIVE}/templates/report.md`,
    ]);
    const schema = parse(assets.find((asset) => asset.relative === 'schema.yaml')!.content) as any;
    expect(schema.name).toBe('product-recovery');
    expect(schema.artifacts.map((artifact: any) => artifact.id)).toEqual(['brief', 'recovery-outcome']);
    expect(schema.apply.requires).toEqual(['recovery-outcome']);
  });

  it('installs, checks and removes product-recovery without touching product-change ownership', async () => {
    const dir = await scratchWorkspace();
    try {
      const added = await addOpenSpecIntegration(dir, { cliVersion: '1.11.0' });
      expect(added.written).toContain(`${OPENSPEC_PRODUCT_RECOVERY_SCHEMA_RELATIVE}/schema.yaml`);
      expect((await checkOpenSpecIntegration(dir)).checks.find((c) => c.name === 'product recovery workflow')?.ok).toBe(true);
      const removed = await removeOpenSpecIntegration(dir);
      expect(removed.removed).toContain(`${OPENSPEC_PRODUCT_RECOVERY_SCHEMA_RELATIVE}/schema.yaml`);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
  it('bundles exactly the managed asset set', async () => {
    const assets = await loadProductChangeSchemaAssets();
    expect(
      assets.map((asset) => `${OPENSPEC_PRODUCT_CHANGE_SCHEMA_RELATIVE}/${asset.relative}`),
    ).toEqual(SCHEMA_FILES);
  });

  it('ships a schema.yaml with the intent -> delta DAG and an apply phase requiring the delta', async () => {
    const assets = await loadProductChangeSchemaAssets();
    const schemaYaml = assets.find((asset) => asset.relative === 'schema.yaml');
    expect(schemaYaml).toBeDefined();
    const schema = parse(schemaYaml!.content) as {
      name: string;
      version: number;
      artifacts: { id: string; generates: string; template: string; requires?: string[] }[];
      apply: { requires: string[]; instruction: string };
    };
    expect(schema.name).toBe('product-change');
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
    expect(delta.generates).toBe('product-change/**/*.md');
    // Apply is the schema's apply phase, never a third artifact.
    expect(schema.apply.requires).toEqual(['delta']);
    expect(schema.apply.instruction).toContain('product-apply.mjs');
    expect(schema.apply.instruction).toContain('Do not archive this change as part of apply');
    // Every referenced template resolves to a bundled asset.
    for (const artifact of schema.artifacts) {
      expect(assets.some((asset) => asset.relative === `templates/${artifact.template}`)).toBe(
        true,
      );
    }
  });

  it('never points the delta at specs/, so OpenSpec records skip_specs for product changes', async () => {
    const assets = await loadProductChangeSchemaAssets();
    const schemaYaml = assets.find((asset) => asset.relative === 'schema.yaml')!;
    const schema = parse(schemaYaml.content) as { artifacts: { generates: string }[] };
    for (const artifact of schema.artifacts) {
      expect(artifact.generates.startsWith('specs/')).toBe(false);
    }
  });

  it('keeps citations at the intent boundary and keeps the canonical delta citation-free', async () => {
    const assets = await loadProductChangeSchemaAssets();
    const proposal = assets.find((asset) => asset.relative === 'templates/proposal.md')!.content;
    const change = assets.find((asset) => asset.relative === 'templates/change.md')!.content;
    const schema = assets.find((asset) => asset.relative === 'schema.yaml')!.content;

    expect(proposal).toContain('pdac-scope: cited');
    expect(proposal).toContain('prodshape cite');
    expect(change).not.toContain('pdac-scope:');
    expect(change).not.toContain('pdac:cite');
    const compactSchema = schema.replace(/\s+/g, ' ');
    expect(compactSchema).toContain(
      'product-change/change.md is a change manifest, not a consumer document',
    );
    expect(compactSchema).toContain('Never add PDaC citations or a pdac-scope declaration');
  });

  it('stops for human clarification before an ambiguous intent becomes a delta or approval', async () => {
    const assets = await loadProductChangeSchemaAssets();
    const schema = parse(assets.find((asset) => asset.relative === 'schema.yaml')!.content) as {
      artifacts: { id: string; instruction: string }[];
      apply: { instruction: string };
    };
    const intent = schema.artifacts
      .find((artifact) => artifact.id === 'intent')!
      .instruction.replace(/\s+/g, ' ');
    const delta = schema.artifacts
      .find((artifact) => artifact.id === 'delta')!
      .instruction.replace(/\s+/g, ' ');
    const apply = schema.apply.instruction.replace(/\s+/g, ' ');

    expect(intent).toContain('materially different product outcomes');
    expect(intent).toContain('ask the user');
    expect(intent).toContain('STOP before authoring the delta');
    expect(delta).toContain('Open Questions for the Product Owner');
    expect(delta).toContain('Do not author or complete the delta');
    expect(delta).toContain("Never choose a product outcome on the user's behalf");
    expect(apply).toContain('no unresolved product-semantic questions');
    expect(apply).toContain('must not be recorded merely to make apply proceed');
  });

  it('ships a proportional graph-guided clarification contract for the hosted workflow', async () => {
    const assets = await loadProductChangeSchemaAssets();
    const schema = parse(assets.find((asset) => asset.relative === 'schema.yaml')!.content) as {
      artifacts: { id: string; instruction: string }[];
      apply: { instruction: string };
    };
    const intent = schema.artifacts.find((artifact) => artifact.id === 'intent')!.instruction;
    const delta = schema.artifacts.find((artifact) => artifact.id === 'delta')!.instruction;
    const apply = schema.apply.instruction;
    const contract = `${intent}\n${delta}\n${apply}`.replace(/\s+/g, ' ');

    expect(contract).toContain('proportional integrity pass');
    expect(contract).toContain('after a material widening of intent');
    expect(contract).toContain('impact polarity');
    expect(contract).toContain('changed or proposed node');
    expect(contract).toContain('checked and excluded');
    expect(contract).toContain('Ask exactly one question at a time');
    expect(contract).toContain('proposal.md');
    expect(contract).toContain('verbatim human answers');
    expect(contract).toContain('parked items');
    expect(contract).toContain('Out of Scope');
    expect(contract).toContain('no material product decisions remain unresolved');
    expect(contract).toContain('never approve, apply or archive');
  });

  it('makes the hosted refine adapter resume an existing product-change container only', async () => {
    const assets = await loadProductChangeSchemaAssets();
    const skill = assets.find((asset) => asset.relative === 'templates/proposal.md')!.content;
    const schema = assets.find((asset) => asset.relative === 'schema.yaml')!.content;
    expect(skill).toContain('Refinement pass');
    expect(skill).toContain('Read the existing OpenSpec change');
    expect(schema).toContain('/product:refine');
    expect(schema).toContain('same OpenSpec change');
    expect(schema).toContain('never approve, apply or archive');
    expect(schema).not.toContain('docs/product/changes/active');
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
        'Installed the OpenSpec product schema at openspec/schemas/product-change.',
      );
      // The record carries the ownership proof: each managed file with its installed digest.
      expect(result.meta.productSchema?.name).toBe('product-change');
      expect(result.meta.productSchema?.requiresOpenspec).toBe(PRODUCT_CHANGE_SCHEMA_MIN_OPENSPEC);
      expect(Object.keys(result.meta.productSchema?.files ?? {}).sort()).toEqual(SCHEMA_FILES);
      for (const [relative, digest] of Object.entries(result.meta.productSchema?.files ?? {})) {
        expect(digest).toMatch(/^sha256:[0-9a-f]{64}$/);
        expect(digest).toBe(
          contentDigest(await readFile(join(dir, ...relative.split('/')), 'utf8')),
        );
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('migrates an owned legacy product schema and preserves a diverged legacy file', async () => {
    const dir = await scratchWorkspace();
    try {
      await addOpenSpecIntegration(dir, { cliVersion: '1.11.0' });
      const metaPath = join(dir, '.product', 'integrations', 'openspec.json');
      const meta = JSON.parse(await readFile(metaPath, 'utf8')) as {
        productSchema: { name: string; files: Record<string, string> };
      };
      const legacyFiles: Record<string, string> = {};
      for (const relative of SCHEMA_FILES) {
        const current = join(dir, ...relative.split('/'));
        const legacyRelative = relative.replace(
          'openspec/schemas/product-change',
          'openspec/schemas/product',
        );
        const legacy = join(dir, ...legacyRelative.split('/'));
        await mkdir(join(legacy, '..'), { recursive: true });
        await writeFile(legacy, await readFile(current), 'utf8');
        legacyFiles[legacyRelative] = meta.productSchema.files[relative]!;
      }
      await rm(join(dir, 'openspec', 'schemas', 'product-change'), {
        recursive: true,
        force: true,
      });
      meta.productSchema.name = 'product';
      meta.productSchema.files = legacyFiles;
      await writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');

      const diverged = join(dir, 'openspec', 'schemas', 'product', 'schema.yaml');
      await writeFile(diverged, 'name: product\n# user edit\n', 'utf8');
      const result = await updateOpenSpecIntegration(dir);

      expect(result.written).toContain('openspec/schemas/product-change/schema.yaml');
      expect(
        await readFile(join(dir, 'openspec', 'schemas', 'product-change', 'schema.yaml'), 'utf8'),
      ).toContain('name: product-change');
      expect(await readFile(diverged, 'utf8')).toContain('# user edit');
      expect(result.changes).toContain(
        'Preserved hand-edited managed file openspec/schemas/product/schema.yaml; restore or delete it, then run: prodshape integration update.',
      );
      await expect(
        stat(join(dir, 'openspec', 'schemas', 'product', 'templates', 'change.md')),
      ).rejects.toThrow();
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
        'Installed the OpenSpec product schema at openspec/schemas/product-change.',
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
            `Product workflow unavailable until OpenSpec >= ${PRODUCT_CHANGE_SCHEMA_MIN_OPENSPEC}`,
          ),
        ),
      ).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('update replaces a file that still matches its recorded managed digest', async () => {
    const dir = await scratchWorkspace();
    try {
      await addOpenSpecIntegration(dir, { cliVersion: '1.11.0' });
      // Simulate a managed file from an OLDER integration version: different bytes on disk, and a
      // metadata record proving this integration wrote exactly those bytes.
      const target = join(dir, 'openspec', 'schemas', 'product-change', 'schema.yaml');
      const olderManaged =
        'name: product\nversion: 1\ndescription: older managed revision\nartifacts: []\n';
      await writeFile(target, olderManaged, 'utf8');
      const metaPath = join(dir, '.product', 'integrations', 'openspec.json');
      const meta = JSON.parse(await readFile(metaPath, 'utf8')) as {
        productSchema: { files: Record<string, string> };
      };
      meta.productSchema.files['openspec/schemas/product-change/schema.yaml'] =
        contentDigest(olderManaged);
      await writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');

      const result = await updateOpenSpecIntegration(dir);
      expect(result.written).toContain('openspec/schemas/product-change/schema.yaml');
      const restored = await readFile(target, 'utf8');
      expect(restored).toContain('name: product');
      expect(restored).not.toContain('older managed revision');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('update preserves a hand-edited managed file and reports it', async () => {
    const dir = await scratchWorkspace();
    try {
      await addOpenSpecIntegration(dir, { cliVersion: '1.11.0' });
      const target = join(dir, 'openspec', 'schemas', 'product-change', 'schema.yaml');
      const edited = 'name: tampered by hand\n';
      await writeFile(target, edited, 'utf8');
      const result = await updateOpenSpecIntegration(dir);
      expect(result.written).not.toContain('openspec/schemas/product-change/schema.yaml');
      expect(
        result.changes.some((change) =>
          change.startsWith(
            'Preserved hand-edited managed file openspec/schemas/product-change/schema.yaml',
          ),
        ),
      ).toBe(true);
      expect(await readFile(target, 'utf8')).toBe(edited);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('update removes an obsolete file that still matches its recorded managed digest', async () => {
    const dir = await scratchWorkspace();
    try {
      await addOpenSpecIntegration(dir, { cliVersion: '1.11.0' });
      const obsoleteRelative = 'openspec/schemas/product-change/templates/retired.md';
      const obsolete = join(dir, ...obsoleteRelative.split('/'));
      const obsoleteContent = '# retired managed template\n';
      await writeFile(obsolete, obsoleteContent, 'utf8');

      const metaPath = join(dir, '.product', 'integrations', 'openspec.json');
      const meta = JSON.parse(await readFile(metaPath, 'utf8')) as {
        productSchema: { files: Record<string, string> };
      };
      meta.productSchema.files[obsoleteRelative] = contentDigest(obsoleteContent);
      await writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');

      const result = await updateOpenSpecIntegration(dir);
      await expect(stat(obsolete)).rejects.toThrow();
      expect(result.changes).toContain(`Removed obsolete managed file ${obsoleteRelative}.`);
      const updatedMeta = JSON.parse(await readFile(metaPath, 'utf8')) as {
        productSchema: { files: Record<string, string> };
      };
      expect(updatedMeta.productSchema.files).not.toHaveProperty(obsoleteRelative);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('add fails closed on a pre-existing user schema file and writes nothing at all', async () => {
    const dir = await scratchWorkspace();
    try {
      const userContent = 'name: product\ndescription: USER AUTHORED\nartifacts: []\n';
      const target = join(dir, 'openspec', 'schemas', 'product-change', 'schema.yaml');
      await mkdir(join(dir, 'openspec', 'schemas', 'product-change'), { recursive: true });
      await writeFile(target, userContent, 'utf8');
      await expect(addOpenSpecIntegration(dir, { cliVersion: '1.11.0' })).rejects.toThrow(
        'never overwrites user-authored files',
      );
      await expect(
        addOpenSpecIntegration(dir, { cliVersion: '1.11.0', dryRun: true }),
      ).rejects.toThrow('never overwrites user-authored files');
      // The whole operation failed closed: the user file is intact and no other surface was
      // written either.
      expect(await readFile(target, 'utf8')).toBe(userContent);
      await expect(stat(join(dir, 'openspec', 'config.yaml'))).rejects.toThrow();
      await expect(stat(join(dir, '.product'))).rejects.toThrow();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('add does not claim a byte-identical pre-existing user schema without ownership metadata', async () => {
    const dir = await scratchWorkspace();
    try {
      const schemaAsset = (await loadProductChangeSchemaAssets()).find(
        (asset) => asset.relative === 'schema.yaml',
      )!;
      const target = join(dir, 'openspec', 'schemas', 'product-change', 'schema.yaml');
      await mkdir(join(dir, 'openspec', 'schemas', 'product-change'), { recursive: true });
      await writeFile(target, schemaAsset.content, 'utf8');

      await expect(addOpenSpecIntegration(dir, { cliVersion: '1.11.0' })).rejects.toThrow(
        'never overwrites user-authored files',
      );
      expect(await readFile(target, 'utf8')).toBe(schemaAsset.content);
      await expect(stat(join(dir, '.product'))).rejects.toThrow();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('add fails closed on a colliding template or script', async () => {
    const dir = await scratchWorkspace();
    try {
      const target = join(dir, 'openspec', 'schemas', 'product-change', 'templates', 'proposal.md');
      await mkdir(join(dir, 'openspec', 'schemas', 'product-change', 'templates'), {
        recursive: true,
      });
      await writeFile(target, '# my own proposal template\n', 'utf8');
      await expect(addOpenSpecIntegration(dir, { cliVersion: '1.11.0' })).rejects.toThrow(
        'openspec/schemas/product-change/templates/proposal.md',
      );
      expect(await readFile(target, 'utf8')).toBe('# my own proposal template\n');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('remove preserves a hand-edited managed file and reports it while deleting the rest', async () => {
    const dir = await scratchWorkspace();
    try {
      await addOpenSpecIntegration(dir, { cliVersion: '1.11.0' });
      const target = join(dir, 'openspec', 'schemas', 'product-change', 'schema.yaml');
      const edited = 'name: edited after installation\n';
      await writeFile(target, edited, 'utf8');
      const result = await removeOpenSpecIntegration(dir);
      expect(result.preserved).toEqual(['openspec/schemas/product-change/schema.yaml']);
      expect(result.removed).not.toContain('openspec/schemas/product-change/schema.yaml');
      expect(await readFile(target, 'utf8')).toBe(edited);
      for (const relative of SCHEMA_FILES.filter(
        (file) => file !== 'openspec/schemas/product-change/schema.yaml',
      )) {
        expect(result.removed).toContain(relative);
        await expect(stat(join(dir, ...relative.split('/')))).rejects.toThrow();
      }
      await expect(stat(join(dir, '.product', 'integrations', 'openspec.json'))).rejects.toThrow();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('remove without integration metadata never deletes a coincidentally named user schema', async () => {
    const dir = await scratchWorkspace();
    try {
      const userContent = 'name: product\ndescription: USER AUTHORED\nartifacts: []\n';
      const target = join(dir, 'openspec', 'schemas', 'product-change', 'schema.yaml');
      await mkdir(join(dir, 'openspec', 'schemas', 'product-change'), { recursive: true });
      await writeFile(target, userContent, 'utf8');
      const result = await removeOpenSpecIntegration(dir);
      expect(result.removed.filter((entry) => entry.startsWith('openspec/schemas/'))).toEqual([]);
      expect(result.preserved).toEqual([]);
      expect(await readFile(target, 'utf8')).toBe(userContent);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('remove rejects recorded schema paths outside the managed schema directory', async () => {
    const dir = await scratchWorkspace();
    try {
      await addOpenSpecIntegration(dir, { cliVersion: '1.11.0' });
      const victimRelative = 'docs/product/model/user-owned.md';
      const victim = join(dir, ...victimRelative.split('/'));
      const victimContent = 'accepted product truth owned by the repository\n';
      await mkdir(join(dir, 'docs', 'product', 'model'), { recursive: true });
      await writeFile(victim, victimContent, 'utf8');

      const metaPath = join(dir, '.product', 'integrations', 'openspec.json');
      const meta = JSON.parse(await readFile(metaPath, 'utf8')) as {
        productSchema: { files: Record<string, string> };
      };
      meta.productSchema.files[victimRelative] = contentDigest(victimContent);
      await writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');

      await expect(removeOpenSpecIntegration(dir)).rejects.toThrow('cannot be trusted');
      expect(await readFile(victim, 'utf8')).toBe(victimContent);
      await expect(readFile(metaPath, 'utf8')).resolves.toBeTruthy();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('remove does not infer per-file ownership from a schema-level record and current bytes', async () => {
    const dir = await scratchWorkspace();
    try {
      const schemaAsset = (await loadProductChangeSchemaAssets()).find(
        (asset) => asset.relative === 'schema.yaml',
      )!;
      const relative = 'openspec/schemas/product-change/schema.yaml';
      const target = join(dir, ...relative.split('/'));
      await mkdir(join(dir, 'openspec', 'schemas', 'product-change'), { recursive: true });
      await writeFile(target, schemaAsset.content, 'utf8');
      const metaPath = join(dir, '.product', 'integrations', 'openspec.json');
      await mkdir(join(dir, '.product', 'integrations'), { recursive: true });
      await writeFile(
        metaPath,
        `${JSON.stringify(
          {
            provider: 'openspec',
            version: '0.5.3',
            openspecVersion: '1.11.0',
            installedAt: '2026-09-01T00:00:00.000Z',
            configPath: 'openspec/config.yaml',
            productSchema: {
              name: 'product',
              requiresOpenspec: PRODUCT_CHANGE_SCHEMA_MIN_OPENSPEC,
              files: {},
            },
          },
          null,
          2,
        )}\n`,
        'utf8',
      );

      const result = await removeOpenSpecIntegration(dir);
      expect(result.removed).not.toContain(relative);
      expect(result.preserved).toContain(relative);
      expect(await readFile(target, 'utf8')).toBe(schemaAsset.content);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('a dry-run remove reports removals and preserved files while changing no bytes', async () => {
    const dir = await scratchWorkspace();
    try {
      await addOpenSpecIntegration(dir, { cliVersion: '1.11.0' });
      const target = join(dir, 'openspec', 'schemas', 'product-change', 'schema.yaml');
      await writeFile(target, 'name: edited\n', 'utf8');
      const result = await removeOpenSpecIntegration(dir, { dryRun: true });
      expect(result.preserved).toEqual(['openspec/schemas/product-change/schema.yaml']);
      expect(result.removed).toContain('openspec/schemas/product-change/scripts/product-apply.mjs');
      for (const relative of SCHEMA_FILES.filter(
        (file) => file !== 'openspec/schemas/product-change/schema.yaml',
      )) {
        await expect(readFile(join(dir, ...relative.split('/')), 'utf8')).resolves.toBeTruthy();
      }
      await expect(
        readFile(join(dir, '.product', 'integrations', 'openspec.json'), 'utf8'),
      ).resolves.toBeTruthy();
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
        join(dir, 'openspec', 'schemas', 'product-change', 'schema.yaml'),
        'name: tampered\n',
        'utf8',
      );
      const tampered = await checkOpenSpecIntegration(dir);
      const tamperedCheck = tampered.checks.find((check) => check.name === 'product workflow');
      expect(tamperedCheck!.ok).toBe(false);
      expect(tamperedCheck!.detail).toContain(
        'hand-edited and preserved: openspec/schemas/product-change/schema.yaml',
      );
      expect(tampered.ok).toBe(false);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('check rejects an installed asset missing its per-file ownership record', async () => {
    const dir = await scratchWorkspace();
    try {
      await addOpenSpecIntegration(dir, { cliVersion: '1.11.0' });
      const metaPath = join(dir, '.product', 'integrations', 'openspec.json');
      const meta = JSON.parse(await readFile(metaPath, 'utf8')) as {
        productSchema: { files: Record<string, string> };
      };
      delete meta.productSchema.files['openspec/schemas/product-change/schema.yaml'];
      await writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');

      const result = await checkOpenSpecIntegration(dir);
      const check = result.checks.find((entry) => entry.name === 'product workflow');
      expect(check?.ok).toBe(false);
      expect(check?.detail).toContain('unrecorded: openspec/schemas/product-change/schema.yaml');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('check reports a recorded obsolete asset that update must reconcile', async () => {
    const dir = await scratchWorkspace();
    try {
      await addOpenSpecIntegration(dir, { cliVersion: '1.11.0' });
      const obsoleteRelative = 'openspec/schemas/product-change/templates/retired.md';
      const obsolete = join(dir, ...obsoleteRelative.split('/'));
      const obsoleteContent = '# retired managed template\n';
      await writeFile(obsolete, obsoleteContent, 'utf8');
      const metaPath = join(dir, '.product', 'integrations', 'openspec.json');
      const meta = JSON.parse(await readFile(metaPath, 'utf8')) as {
        productSchema: { files: Record<string, string> };
      };
      meta.productSchema.files[obsoleteRelative] = contentDigest(obsoleteContent);
      await writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');

      const result = await checkOpenSpecIntegration(dir);
      const check = result.checks.find((entry) => entry.name === 'product workflow');
      expect(check?.ok).toBe(false);
      expect(check?.detail).toContain(`obsolete managed content: ${obsoleteRelative}`);
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
      await writeFile(
        join(dir, 'openspec', 'schemas', 'product-change', 'NOTES.md'),
        'user notes\n',
      );

      const result = await removeOpenSpecIntegration(dir);
      for (const relative of SCHEMA_FILES) {
        expect(result.removed).toContain(relative);
        await expect(stat(join(dir, ...relative.split('/')))).rejects.toThrow();
      }
      // Emptied managed directories are pruned; directories still holding user files are not.
      await expect(
        stat(join(dir, 'openspec', 'schemas', 'product-change', 'templates')),
      ).rejects.toThrow();
      await expect(
        stat(join(dir, 'openspec', 'schemas', 'product-change', 'scripts')),
      ).rejects.toThrow();
      expect(await readdir(join(dir, 'openspec', 'schemas', 'product-change'))).toEqual([
        'NOTES.md',
      ]);
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
