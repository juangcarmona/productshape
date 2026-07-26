import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export const lockSchemaId = 'product-definition-as-code/installation-lock/v1alpha1';

export interface InstallationLock {
  schema: string;
  version: string;
  providers: Record<string, { files: Record<string, string> }>;
}

export function emptyLock(version: string): InstallationLock {
  return { schema: lockSchemaId, version, providers: {} };
}

export function fileDigest(content: string): string {
  return `sha256:${createHash('sha256').update(content.replace(/\r\n?/g, '\n'), 'utf8').digest('hex')}`;
}

/** Repository-relative lock path, POSIX separators. */
export const lockRelativePath = '.product/installation.lock.json';

export function lockPath(root: string): string {
  return join(root, ...lockRelativePath.split('/'));
}

export async function readLock(root: string): Promise<InstallationLock | undefined> {
  try {
    return JSON.parse(await readFile(lockPath(root), 'utf8')) as InstallationLock;
  } catch {
    return undefined;
  }
}

export async function writeLock(root: string, lock: InstallationLock): Promise<void> {
  const sorted: InstallationLock = {
    schema: lock.schema,
    version: lock.version,
    providers: Object.fromEntries(
      Object.entries(lock.providers)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([provider, entry]) => [
          provider,
          {
            files: Object.fromEntries(
              Object.entries(entry.files).sort(([a], [b]) => a.localeCompare(b)),
            ),
          },
        ]),
    ),
  };
  const target = lockPath(root);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8');
}
