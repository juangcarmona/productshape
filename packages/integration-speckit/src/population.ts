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
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
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
 * Enumerate the consumer-document population of a Spec Kit workspace: for each feature directory
 * under `specs/`, the artifact files that exist among `spec.md`, `plan.md` and `tasks.md`.
 *
 * Spec Kit has no archive lifecycle, so every enumerated document is current and
 * `includeArchived` changes nothing. The `change` option limits enumeration to one feature
 * directory by name. A workspace with no `specs/` directory (initialized, no features yet)
 * enumerates zero documents.
 */
export async function enumerateSpecKitDocuments(
  repoRoot: string,
  options?: EnumerateConsumerDocumentsOptions,
): Promise<ConsumerDocumentEnumeration> {
  const specsDir = join(repoRoot, 'specs');
  const documents: ConsumerDocument[] = [];

  let features = await discoverFeatureDirectories(specsDir);
  if (options?.change) {
    const wanted = options.change;
    features = features.filter((name) => name === wanted);
  }

  for (const feature of features) {
    const featureDir = join(specsDir, feature);
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
export const specKitProvider: SddIntegrationProvider = {
  name: 'speckit',
  detectWorkspace: isSpecKitWorkspace,
  enumerateDocuments: enumerateSpecKitDocuments,
};
