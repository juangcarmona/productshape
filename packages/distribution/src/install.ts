import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { claudeRenderer } from '@prodshape/integration-claude';
import { copilotRenderer } from '@prodshape/integration-copilot';
import type { CanonicalAssets, ProviderRenderer } from './assets.js';
import { loadBundledAssets } from './assets.js';
import { emptyLock, fileDigest, readLock, writeLock, type InstallationLock } from './lock.js';

export interface IntegrationDiagnostic {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  file: string;
}

/** Renderers consumed via structural typing; integrations never import distribution. */
export const renderers: ProviderRenderer[] = [claudeRenderer, copilotRenderer];

export function rendererFor(provider: string): ProviderRenderer | undefined {
  return renderers.find((r) => r.provider === provider);
}

export interface InstallResult {
  provider: string;
  written: string[];
}

/** A refused installation: targets exist that the lock does not own, or were hand-edited. */
export class InstallConflictError extends Error {
  constructor(
    readonly provider: string,
    readonly conflicts: string[],
  ) {
    super(
      `Refusing to overwrite ${conflicts.length} existing file(s) for the ${provider} integration ` +
        `(not managed by the installation lock, or modified by hand):\n` +
        conflicts.map((path) => `  ${path}`).join('\n') +
        '\nReconcile the files (or re-run with --force to overwrite them).',
    );
  }
}

/**
 * Render and write one provider's managed files, recording hashes in the lock.
 * Preflights every target before writing anything: a target that exists but is
 * not owned by the lock, or is owned but drifted, blocks the whole install
 * unless force is set. A refused install leaves files and lock untouched.
 */
export async function installProvider(
  root: string,
  provider: string,
  assets?: CanonicalAssets,
  force = false,
): Promise<InstallResult> {
  const renderer = rendererFor(provider);
  if (!renderer) {
    throw new Error(`Unknown AI provider '${provider}' (supported: claude, copilot)`);
  }
  const resolvedAssets = assets ?? (await loadBundledAssets());
  const files = renderer.render(resolvedAssets);

  const lock: InstallationLock = (await readLock(root)) ?? emptyLock(resolvedAssets.version);

  if (!force) {
    const owned = new Map<string, string>();
    for (const entry of Object.values(lock.providers)) {
      for (const [path, digest] of Object.entries(entry.files)) owned.set(path, digest);
    }
    const conflicts: string[] = [];
    for (const file of files) {
      let existing: string;
      try {
        existing = await readFile(join(root, ...file.path.split('/')), 'utf8');
      } catch {
        continue; // Absent targets are always writable.
      }
      const ownedDigest = owned.get(file.path);
      if (ownedDigest === undefined || fileDigest(existing) !== ownedDigest) {
        conflicts.push(file.path);
      }
    }
    if (conflicts.length > 0) throw new InstallConflictError(provider, conflicts);
  }

  lock.version = resolvedAssets.version;
  lock.providers[provider] = { files: {} };

  const written: string[] = [];
  for (const file of files) {
    const target = join(root, ...file.path.split('/'));
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, file.content, 'utf8');
    lock.providers[provider].files[file.path] = fileDigest(file.content);
    written.push(file.path);
  }
  await writeLock(root, lock);
  return { provider, written };
}

/** Regenerate every installed provider (refusing over drift unless force). */
export async function updateIntegrations(root: string, force = false): Promise<InstallResult[]> {
  const lock = await readLock(root);
  if (!lock) return [];
  const assets = await loadBundledAssets();
  const results: InstallResult[] = [];
  for (const provider of Object.keys(lock.providers).sort()) {
    results.push(await installProvider(root, provider, assets, force));
  }
  return results;
}

/**
 * Detect managed-file drift without touching anything:
 * PRODUCT051 for manual edits, PRODUCT052 for missing files.
 */
export async function checkIntegrations(root: string): Promise<IntegrationDiagnostic[]> {
  const diagnostics: IntegrationDiagnostic[] = [];
  const lock = await readLock(root);
  if (!lock) return diagnostics;

  for (const [provider, entry] of Object.entries(lock.providers)) {
    for (const [path, expected] of Object.entries(entry.files)) {
      let content: string;
      try {
        content = await readFile(join(root, ...path.split('/')), 'utf8');
      } catch {
        diagnostics.push({
          severity: 'error',
          code: 'PRODUCT052',
          message: `Managed ${provider} file is missing; run: prodshape integration update`,
          file: path,
        });
        continue;
      }
      if (fileDigest(content) !== expected) {
        diagnostics.push({
          severity: 'error',
          code: 'PRODUCT051',
          message: `Managed ${provider} file was modified by hand; edit the canonical asset and run: prodshape integration update`,
          file: path,
        });
      }
    }
  }
  return diagnostics.sort((a, b) => a.file.localeCompare(b.file) || a.code.localeCompare(b.code));
}
