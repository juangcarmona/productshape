/**
 * The installation lock: what this product owns in the repository, and the digest it owned it at.
 *
 * This module is pure. It states the lock's shape, validates a document against it and serializes
 * one; every filesystem access goes through the mutation module, so there is one place where a
 * lock is read, proven trustworthy and written.
 */
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { isRepositoryRelativePath, rejectRepositoryRelativePath } from '@prodshape/core';

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

/** The recorded-digest form. A value that is not one is not a digest this product wrote. */
const digestPattern = /^sha256:[0-9a-f]{64}$/;

/** Repository-relative lock path, POSIX separators. */
export const lockRelativePath = '.product/installation.lock.json';

export function lockPath(root: string): string {
  return join(root, ...lockRelativePath.split('/'));
}

/** Why a lock could not be trusted. Stable identifiers, so callers classify without matching prose. */
export type LockFailure = 'unreadable' | 'malformed' | 'schema';

/**
 * An installation lock that exists but cannot be trusted.
 *
 * Distinct from an absent lock, which is a supported state meaning nothing is installed. A lock
 * that is present and unreadable, unparseable or off-contract is a broken installation, and every
 * command that would act on it stops rather than proceeding as though nothing were installed —
 * proceeding would silently reinstall over managed files whose recorded digests were lost, and
 * would report a clean drift check for an installation nobody can verify.
 */
export class InstallationLockError extends Error {
  constructor(
    readonly failure: LockFailure,
    detail: string,
    readonly violations: string[] = [],
    options?: { cause?: unknown },
  ) {
    super(
      `Installation lock ${lockRelativePath} cannot be trusted: ${detail}` +
        (violations.length > 0 ? `\n${violations.map((v) => `  ${v}`).join('\n')}` : '') +
        '\nReconcile it by hand, or remove it and re-run: prodshape integration add <provider>',
      options,
    );
    this.name = 'InstallationLockError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Parse and validate a lock document.
 *
 * Everything the lock says is repository-controlled input: the file is written by this product but
 * lives in a working tree anyone can edit, and it is the one document whose contents name files
 * this product deletes. It is therefore validated in full before a single entry is used, and every
 * recorded path is held to the repository-relative contract here, at the boundary, so that no
 * caller can reach a resolver with a path this document should never have carried.
 */
export function parseLock(content: string): InstallationLock {
  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch (error) {
    return failMalformed(error);
  }
  if (!isRecord(data)) {
    throw new InstallationLockError('schema', 'the document is not a JSON object');
  }
  const violations: string[] = [];
  if (data.schema !== lockSchemaId) {
    violations.push(
      `'schema' must be '${lockSchemaId}' (found ${JSON.stringify(data.schema ?? null)})`,
    );
  }
  if (typeof data.version !== 'string' || data.version.length === 0) {
    violations.push("'version' must be a non-empty string");
  }
  if (!isRecord(data.providers)) {
    violations.push("'providers' must be an object");
    throw new InstallationLockError('schema', 'the document does not match the lock schema', [
      ...violations,
    ]);
  }

  const providers: InstallationLock['providers'] = {};
  for (const [provider, entry] of Object.entries(data.providers)) {
    if (!isRecord(entry) || !isRecord(entry.files)) {
      violations.push(`'providers.${provider}' must be an object with a 'files' object`);
      continue;
    }
    const files: Record<string, string> = {};
    for (const [path, digest] of Object.entries(entry.files)) {
      const rejection = rejectRepositoryRelativePath(path);
      if (rejection) {
        violations.push(
          `'providers.${provider}.files' records ${JSON.stringify(path)}, which is not a repository-relative path (${rejection})`,
        );
        continue;
      }
      if (typeof digest !== 'string' || !digestPattern.test(digest)) {
        violations.push(
          `'providers.${provider}.files[${JSON.stringify(path)}]' must be a sha256 digest`,
        );
        continue;
      }
      files[path] = digest;
    }
    providers[provider] = { files };
  }

  if (violations.length > 0) {
    throw new InstallationLockError(
      'schema',
      'the document does not match the lock schema',
      violations,
    );
  }
  return { schema: data.schema as string, version: data.version as string, providers };
}

function failMalformed(error: unknown): never {
  throw new InstallationLockError(
    'malformed',
    `it is not valid JSON (${error instanceof Error ? error.message : String(error)})`,
    [],
    { cause: error },
  );
}

/**
 * Serialize a lock deterministically: providers and their files in code-unit order, so that a
 * regenerated lock is byte-identical to the one it replaces when nothing changed.
 */
export function serializeLock(lock: InstallationLock): string {
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
  return `${JSON.stringify(sorted, null, 2)}\n`;
}

/** Whether a recorded managed-file path satisfies the repository-relative contract. */
export function isManagedPath(value: string): boolean {
  return isRepositoryRelativePath(value);
}
