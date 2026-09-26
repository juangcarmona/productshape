import { resolve } from 'node:path';
import { scanCitations, type CitationScan } from './citations.js';
import { loadEvidence } from './verification-evidence.js';
import type { LoadedArtifact } from './model.js';
import { toPosixRelative } from './model.js';
import type { ProductRepository } from './repository.js';

/** The default v0.3 live population is the repository, excluding product archives and the applying container. */
export async function scanLiveCitations(
  repo: ProductRepository,
  artifacts: LoadedArtifact[],
  options: {
    excludeDocumentsUnder?: readonly string[];
    currentEvidence?: readonly string[];
  } = {},
): Promise<CitationScan> {
  const excluded = ['completed', 'rejected', 'superseded'].map(
    (name) => `${repo.config.product.changes}/${name}`,
  );
  excluded.push(...(options.excludeDocumentsUnder ?? []));
  const live = (path: string) =>
    !excluded.some((dir) => path === dir || path.startsWith(`${dir}/`));
  const selected = new Set(
    (options.currentEvidence ?? []).map((path) =>
      toPosixRelative(repo.root, resolve(repo.root, path)),
    ),
  );
  const scan = await scanCitations(repo.root, repo.root);
  const evidenceCarriers = new Set(
    [...selected].flatMap((path) => {
      const stem = path.replace(/\.[^/.]+$/, '');
      return [path, `${stem}.citations.yml`, `${stem}.citations.yaml`];
    }),
  );
  scan.records = scan.records.filter((r) => live(r.source) && !evidenceCarriers.has(r.source));
  scan.diagnostics = scan.diagnostics.filter((d) => live(d.file) && !evidenceCarriers.has(d.file));
  for (const path of selected) {
    if (!live(path)) continue;
    const evidence = await loadEvidence(resolve(repo.root, path), path, artifacts);
    scan.records.push(...evidence.citations);
    // Citation diagnostics are evaluated by the caller against its chosen model exactly once.
    scan.diagnostics.push(
      ...evidence.diagnostics.filter(
        (d) => d.code === 'PRODUCT080' || (d.code === 'PRODUCT081' && d.entry === undefined),
      ),
    );
  }
  return scan;
}
