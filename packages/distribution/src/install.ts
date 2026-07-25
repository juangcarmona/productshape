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

/** Render and write one provider's managed files, recording hashes in the lock. */
export async function installProvider(
  root: string,
  provider: string,
  assets?: CanonicalAssets,
): Promise<InstallResult> {
  const renderer = rendererFor(provider);
  if (!renderer) {
    throw new Error(`Unknown AI provider '${provider}' (supported: claude, copilot)`);
  }
  const resolvedAssets = assets ?? (await loadBundledAssets());
  const files = renderer.render(resolvedAssets);

  const lock: InstallationLock = (await readLock(root)) ?? emptyLock(resolvedAssets.version);
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

/** Regenerate every installed provider. */
export async function updateIntegrations(root: string): Promise<InstallResult[]> {
  const lock = await readLock(root);
  if (!lock) return [];
  const assets = await loadBundledAssets();
  const results: InstallResult[] = [];
  for (const provider of Object.keys(lock.providers).sort()) {
    results.push(await installProvider(root, provider, assets));
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
