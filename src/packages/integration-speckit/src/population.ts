/**
 * Spec Kit consumer-document enumeration: the Spec Kit implementation of the framework-neutral
 * SDD integration-provider contract defined in @prodshape/core.
 *
 * Everything Spec Kit-specific about verification lives here — the `.specify/` workspace marker,
 * the `specs/<feature>/` layout and the artifact-file conventions — so the core package stays
 * SDD-framework blind. Spec Kit has no enumeration CLI and no archive lifecycle: `specify init`
 * scaffolds `.specify/`, `/speckit.specify` creates one directory per feature under `specs/`,
 * and a feature stays current for as long as its directory exists. Enumeration by filesystem
 * convention is therefore the authoritative population, not a degraded fallback, and no
 * CLI-missing diagnostic applies.
 */
import { readFileSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { isAbsolute, join, relative, sep } from 'node:path';
import type {
  ConsumerDocument,
  ConsumerDocumentEnumeration,
  EnumerateConsumerDocumentsOptions,
  SddIntegrationProvider,
} from '@prodshape/core';
import { isSpecKitWorkspace } from './workspace.js';

/**
 * The artifact files verified per feature directory, relative to `specs/<feature>/`. Spec Kit
 * generates more files (research.md, data-model.md, quickstart.md, contracts/); the gated
 * population is the three documents that carry the delivery decisions derived from product
 * intent. The other files may still carry citations — a recursive `citations verify` over a
 * feature directory checks them — but only these three must end up bound or exempt.
 */
const FEATURE_ARTIFACT_FILES: Array<{ file: string; kind: string }> = [
  { file: 'spec.md', kind: 'spec' },
  { file: 'plan.md', kind: 'plan' },
  { file: 'tasks.md', kind: 'tasks' },
];

/** Build a {@link ConsumerDocument} from an absolute path. */
function buildConsumerDocument(
  absolutePath: string,
  repoRoot: string,
  opts: { change: string; artifactKind: string },
): ConsumerDocument {
  return {
    path: relative(repoRoot, absolutePath).split(sep).join('/'),
    absolutePath,
    change: opts.change,
    archived: false,
    artifactKind: opts.artifactKind,
  };
}

/** Discover the feature directories under `specs/`, sorted by name. */
async function discoverFeatureDirectories(specsDir: string): Promise<string[]> {
  try {
    const entries = await readdir(specsDir, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

/**
 * The feature directory Spec Kit recorded for the most recent specify run, repository-relative
 * with POSIX separators, or null when nothing is recorded.
 *
 * Spec Kit's specify command resolves a feature directory under `specs/` by default, but honours
 * an explicitly provided `SPECIFY_FEATURE_DIRECTORY` "as-is", so a feature can live anywhere in
 * the repository. Whatever it resolved is persisted to `.specify/feature.json` as
 * `{"feature_directory": "<resolved feature dir>"}` for the downstream plan and tasks commands.
 * That file is the only durable record of an out-of-tree feature, so enumeration reads it: a
 * population that only ever looked under `specs/` would report zero documents and pass while the
 * feature's real spec.md, plan.md and tasks.md went ungated.
 *
 * It records one feature, the latest, so it narrows the hole rather than closing it: features
 * placed outside `specs/` by earlier runs leave no record to enumerate. A malformed or absent
 * file yields null and enumeration proceeds over `specs/`; Spec Kit's own commands already fail
 * loudly on a feature.json they cannot read, so this does not swallow a silent failure.
 */
async function readRecordedFeatureDirectory(repoRoot: string): Promise<string | null> {
  let raw: string;
  try {
    raw = await readFile(join(repoRoot, '.specify', 'feature.json'), 'utf8');
  } catch {
    return null;
  }

  let recorded: unknown;
  try {
    recorded = JSON.parse(raw);
  } catch {
    return null;
  }

  const value = (recorded as { feature_directory?: unknown } | null)?.feature_directory;
  if (typeof value !== 'string' || value.trim().length === 0) return null;

  // Spec Kit writes the value repository-relative, but its own resolver accepts an absolute path
  // and normalizes it, so accept both. `relative` yields '' for the root itself and a path
  // starting with '..' for anything outside it; neither is a feature directory.
  const relativePath = isAbsolute(value) ? relative(repoRoot, value) : value;
  const normalized = relativePath.split(sep).join('/').replace(/\/+$/, '');
  if (normalized.length === 0 || normalized.startsWith('../') || normalized === '..') return null;
  return normalized;
}

/**
 * Enumerate the consumer-document population of a Spec Kit workspace: for each feature directory,
 * the artifact files that exist among `spec.md`, `plan.md` and `tasks.md`. The population is every
 * directory under `specs/`, plus the feature directory recorded in `.specify/feature.json` when
 * that one falls outside `specs/` (see {@link readRecordedFeatureDirectory}).
 *
 * Spec Kit has no archive lifecycle, so every enumerated document is current and
 * `includeArchived` changes nothing. The `change` option limits enumeration to one feature
 * directory by name. A workspace with no `specs/` directory and nothing recorded (initialized, no
 * features yet) enumerates zero documents, which is a legitimate empty population.
 */
export async function enumerateSpecKitDocuments(
  repoRoot: string,
  options?: EnumerateConsumerDocumentsOptions,
): Promise<ConsumerDocumentEnumeration> {
  const specsDir = join(repoRoot, 'specs');
  const documents: ConsumerDocument[] = [];

  // Each entry is one feature directory: its absolute path, and the name the report and the
  // `change` filter identify it by (the directory's own basename, for in-tree and out-of-tree
  // directories alike, matching how Spec Kit names a feature).
  const featureDirs = (await discoverFeatureDirectories(specsDir)).map((name) => ({
    name,
    absolutePath: join(specsDir, name),
  }));

  const recorded = await readRecordedFeatureDirectory(repoRoot);
  // Add it only when it genuinely falls outside `specs/`: a recorded in-tree feature is already
  // enumerated above, and adding it again would duplicate every one of its documents. The
  // trailing slash keeps a sibling like `specs-archive/` from matching the `specs/` prefix.
  if (recorded !== null && !`${recorded}/`.startsWith('specs/')) {
    featureDirs.push({
      name: recorded.slice(recorded.lastIndexOf('/') + 1),
      absolutePath: join(repoRoot, ...recorded.split('/')),
    });
  }

  let features = featureDirs;
  if (options?.change) {
    const wanted = options.change;
    features = features.filter((entry) => entry.name === wanted);
  }

  for (const { name: feature, absolutePath: featureDir } of features) {
    for (const { file, kind } of FEATURE_ARTIFACT_FILES) {
      const absolutePath = join(featureDir, file);
      try {
        await readFile(absolutePath);
        documents.push(
          buildConsumerDocument(absolutePath, repoRoot, { change: feature, artifactKind: kind }),
        );
      } catch {
        // File doesn't exist; skip.
      }
    }
  }

  return {
    documents,
    root: 'specs',
    includeArchived: options?.includeArchived ?? false,
    diagnostics: [],
  };
}

/**
 * The Spec Kit implementation of the SDD integration-provider contract.
 * `prodshape citations verify --provider speckit` verifies the population this enumerates.
 */
/** The integration version, read once from this package's own manifest. */
const integrationVersion = (
  JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
    version: string;
  }
).version;

export const specKitProvider: SddIntegrationProvider = {
  name: 'speckit',
  version: integrationVersion,
  detectWorkspace: isSpecKitWorkspace,
  enumerateDocuments: enumerateSpecKitDocuments,
};
