/**
 * One-time migration of artifact IDs that end in a numeric suffix (`FR-CITE-001` -> `FR-CITE`).
 *
 * The suffix is a convention inherited from the alpha templates, not a requirement of the
 * identifier grammar (`PREFIX-[A-Z0-9]+(-[A-Z0-9]+)*`). From v0.23 an ID is `PREFIX-NAME`; a
 * numeric segment is a tie-breaker added only to separate two IDs that would otherwise be equal.
 *
 * The migration is planned without touching the disk (`planIdSuffixMigration`) and applied as one
 * unit (`applyIdSuffixMigration`): content is rewritten, files are renamed, the result is
 * validated, and any failure restores the original tree. It never renames into a collision: an ID
 * whose stripped form is already taken, or is claimed by another suffixed ID, is reported and left
 * as it is.
 *
 * IDs are immutable (BR-IDENTITY). This is the single, explicitly consented exception, which is
 * why the plan is shown first and nothing is written without an explicit apply.
 */
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import fg from 'fast-glob';
import { expectedFileName, idPrefixByType, productArtifactTypesV2 } from './artifact.js';
import { discoverChanges, loadChange } from './changes.js';
import { scanCitations, verifyCitations, type CitationRecord } from './citations.js';
import { contentDigest } from './digest.js';
import { loadModel, type LoadedArtifact } from './model.js';
import { validateBaseline, type ProductRepository } from './repository.js';

export type IdCollisionReason =
  /** Several suffixed IDs strip to the same base. */
  | 'shared-base'
  /** The stripped form is already the ID of another artifact. */
  | 'base-exists'
  /** An explicit target ID is already taken or claimed twice. */
  | 'target-taken';

export interface IdRename {
  from: string;
  to: string;
  /** `strip` removes the suffix; `override` is a caller-chosen name. */
  kind: 'strip' | 'override';
}

export interface IdCollision {
  /** The ID that would have been produced. */
  base: string;
  /** The suffixed IDs that were left unchanged. */
  ids: string[];
  reason: IdCollisionReason;
}

export interface IdFileMove {
  from: string;
  to: string;
  artifact: string;
}

export interface IdMigrationPlan {
  renames: IdRename[];
  collisions: IdCollision[];
  /** Artifact files renamed so the file name keeps matching its ID. */
  fileMoves: IdFileMove[];
  /** Files whose text changes, with the number of ID mentions rewritten in each. */
  referenceUpdates: { file: string; mentions: number }[];
  /** Citation digests re-pinned (only citations that were current before the migration). */
  citationUpdates: { file: string; count: number }[];
  /** Citations that were not current before; they are left as they are. */
  citationsLeftAlone: number;
}

export interface IdMigrationOptions {
  /** Explicit target IDs for specific old IDs (used for the one-time ProductShape migration). */
  overrides?: Record<string, string>;
  /** Extra repository-relative files or globs whose text mentions are rewritten as well. */
  extraTextGlobs?: string[];
  /**
   * Runs after the files are changed and before the result is validated. A rejection rolls the
   * migration back exactly as a failed validation does; tests use it to prove the rollback.
   */
  afterWrite?: () => Promise<void>;
}

interface PreparedMigration {
  plan: IdMigrationPlan;
  /** New content keyed by repository-relative path (the path before any move). */
  writes: Map<string, string>;
  moves: IdFileMove[];
  before: Health;
}

interface Health {
  errors: number;
  nonCurrentCitations: number;
}

const prefixes = productArtifactTypesV2.map((type) => idPrefixByType[type]);
const prefixAlternation = prefixes.join('|');
const idShape = new RegExp(`^(?:${prefixAlternation})-[A-Z0-9]+(?:-[A-Z0-9]+)*$`);
const suffixedShape = new RegExp(`^((?:${prefixAlternation})-[A-Z0-9]+(?:-[A-Z0-9]+)*)-([0-9]+)$`);

/** The base an ID would have without its trailing numeric segment, or `undefined`. */
export function stripNumericSuffix(id: string): string | undefined {
  const match = suffixedShape.exec(id);
  return match ? match[1] : undefined;
}

/** Whether an ID ends in a numeric segment that the migration would consider removing. */
export function hasNumericSuffix(id: string): boolean {
  return stripNumericSuffix(id) !== undefined;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Decide the renames for a set of IDs. Pure.
 *
 * Strip the suffix where the result is unique among every ID; keep it where stripping would
 * collide, so the number acts purely as a tie-breaker.
 */
export function computeIdRenames(
  ids: Iterable<string>,
  overrides: Record<string, string> = {},
): { renames: IdRename[]; collisions: IdCollision[] } {
  const all = new Set(ids);
  const renames: IdRename[] = [];
  const collisions: IdCollision[] = [];

  // Explicit targets first: they are the caller's decision, validated like any other.
  const claimed = new Map<string, string[]>();
  for (const [from, to] of Object.entries(overrides)) {
    if (!all.has(from) || from === to) continue;
    const list = claimed.get(to) ?? [];
    list.push(from);
    claimed.set(to, list);
  }
  const handled = new Set<string>();
  for (const [to, froms] of claimed) {
    const taken = !idShape.test(to) || (all.has(to) && !froms.includes(to));
    if (froms.length > 1 || taken) {
      collisions.push({ base: to, ids: froms.sort(), reason: 'target-taken' });
    } else {
      renames.push({ from: froms[0] as string, to, kind: 'override' });
    }
    for (const from of froms) handled.add(from);
  }

  const groups = new Map<string, string[]>();
  for (const id of [...all].sort()) {
    if (handled.has(id)) continue;
    const base = stripNumericSuffix(id);
    if (base === undefined) continue;
    const list = groups.get(base) ?? [];
    list.push(id);
    groups.set(base, list);
  }
  const renamedTargets = new Set(renames.map((r) => r.to));
  for (const [base, members] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
    if (all.has(base) || renamedTargets.has(base)) {
      collisions.push({ base, ids: members, reason: 'base-exists' });
    } else if (members.length > 1) {
      collisions.push({ base, ids: members, reason: 'shared-base' });
    } else {
      renames.push({ from: members[0] as string, to: base, kind: 'strip' });
    }
  }
  renames.sort((a, b) => a.from.localeCompare(b.from));
  return { renames, collisions };
}

/** Rewrite whole-token mentions of the old IDs (and their lowercase `*.md` file-name form). */
export function rewriteIds(
  text: string,
  map: ReadonlyMap<string, string>,
): { text: string; mentions: number } {
  if (map.size === 0) return { text, mentions: 0 };
  const olds = [...map.keys()].sort((a, b) => b.length - a.length).map(escapeRegExp);
  let mentions = 0;
  const upper = new RegExp(
    `(?<![A-Za-z0-9_-])(?:${olds.join('|')})(?![A-Za-z0-9_]|-[A-Za-z0-9])`,
    'g',
  );
  let out = text.replace(upper, (hit) => {
    mentions += 1;
    return map.get(hit) ?? hit;
  });
  const lowerMap = new Map([...map].map(([from, to]) => [from.toLowerCase(), to.toLowerCase()]));
  const lowerOlds = [...lowerMap.keys()].sort((a, b) => b.length - a.length).map(escapeRegExp);
  const lower = new RegExp(
    `(?<![A-Za-z0-9_-])(?:${lowerOlds.join('|')})(?=\\.md(?![A-Za-z0-9]))`,
    'g',
  );
  out = out.replace(lower, (hit) => {
    mentions += 1;
    return lowerMap.get(hit) ?? hit;
  });
  return { text: out, mentions };
}

const skippedSegments = ['node_modules', 'archive', 'completed'];

function skipped(path: string): boolean {
  return path.split('/').some((segment) => skippedSegments.includes(segment));
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function health(repo: ProductRepository): Promise<Health> {
  const baseline = await validateBaseline(repo);
  const errors = baseline.diagnostics.filter((d) => d.severity === 'error').length;
  const records = await citationRecords(repo);
  const verified = verifyCitations(records, baseline.artifacts);
  return {
    errors,
    nonCurrentCitations: verified.filter((v) => v.status !== 'current').length,
  };
}

function consumerRoots(repo: ProductRepository): string[] {
  return repo.config.version === 'v1alpha2'
    ? ['.']
    : repo.config.prodshape.citations['consumer-roots'];
}

async function citationRecords(repo: ProductRepository): Promise<CitationRecord[]> {
  const records: CitationRecord[] = [];
  for (const root of consumerRoots(repo)) {
    const absolute = join(repo.root, root);
    if (!(await exists(absolute))) continue;
    const scan = await scanCitations(absolute, repo.root);
    // The migration never reads history: archived and completed material is not live.
    records.push(...scan.records.filter((r) => !skipped(r.source)));
  }
  return records;
}

async function textFiles(repo: ProductRepository, extra: string[]): Promise<string[]> {
  const found = new Set<string>();
  const add = async (cwd: string, patterns: string[]): Promise<void> => {
    if (!(await exists(cwd))) return;
    const hits = await fg(patterns, {
      cwd,
      absolute: true,
      dot: false,
      ignore: ['**/node_modules/**'],
    });
    for (const hit of hits) {
      const rel = hit
        .slice(repo.root.length + 1)
        .split('\\')
        .join('/');
      if (!skipped(rel)) found.add(rel);
    }
  };
  await add(repo.modelDir, ['**/*.md']);
  await add(join(repo.changesDir, 'active'), ['**/*.{md,yaml,yml}']);
  for (const root of consumerRoots(repo)) await add(join(repo.root, root), ['**/*.{md,yaml,yml}']);
  if (extra.length > 0) await add(repo.root, extra);
  return [...found].sort();
}

async function prepare(
  repo: ProductRepository,
  options: IdMigrationOptions,
): Promise<PreparedMigration> {
  const model = await loadModel(repo.modelDir, repo.root, repo.registry);
  const proposed: LoadedArtifact[] = [];
  for (const dir of await discoverChanges(join(repo.changesDir, 'active'))) {
    proposed.push(...(await loadChange(dir, repo.root, repo.registry)).proposed);
  }
  const everything = [...model.artifacts, ...proposed].filter((a) => a.id);
  const ids = new Set(everything.map((a) => a.id as string));
  const { renames, collisions } = computeIdRenames(ids, options.overrides);
  const map = new Map(renames.map((r) => [r.from, r.to]));

  const before = await health(repo);
  const records = await citationRecords(repo);
  const verifiedBefore = verifyCitations(records, model.artifacts);
  const currentRecords = verifiedBefore
    .filter((v) => v.status === 'current')
    .map((v) => v.citation);

  const plan: IdMigrationPlan = {
    renames,
    collisions,
    fileMoves: [],
    referenceUpdates: [],
    citationUpdates: [],
    citationsLeftAlone: verifiedBefore.length - currentRecords.length,
  };
  if (renames.length === 0) return { plan, writes: new Map(), moves: [], before };

  // 1. Text: every ID mention in the live files, in one pass so a rename can never chain.
  const writes = new Map<string, string>();
  for (const file of await textFiles(repo, options.extraTextGlobs ?? [])) {
    const original = await readFile(join(repo.root, file), 'utf8');
    const rewritten = rewriteIds(original, map);
    if (rewritten.mentions > 0) {
      writes.set(file, rewritten.text);
      plan.referenceUpdates.push({ file, mentions: rewritten.mentions });
    }
  }

  // 2. Files: keep the name equal to the ID where it was before.
  const moves: IdFileMove[] = [];
  const targets = new Set<string>();
  for (const artifact of everything) {
    const to = map.get(artifact.id as string);
    if (!to) continue;
    const dir = dirname(artifact.file);
    if (basename(artifact.file) !== expectedFileName(artifact.id as string)) continue;
    const newPath = `${dir === '.' ? '' : `${dir}/`}${expectedFileName(to)}`;
    if (targets.has(newPath) || (await exists(join(repo.root, newPath)))) {
      throw new Error(`Cannot rename ${artifact.file}: ${newPath} already exists`);
    }
    targets.add(newPath);
    moves.push({ from: artifact.file, to: newPath, artifact: to });
  }
  plan.fileMoves = moves.sort((a, b) => a.from.localeCompare(b.from));

  // 3. Citations: re-pin only what was current. A stale or tampered citation is a finding the
  //    migration must not launder into a green one.
  const newDigestByOld = new Map<string, string>();
  for (const artifact of everything) {
    const newContent = writes.get(artifact.file);
    if (newContent !== undefined && artifact.digest) {
      newDigestByOld.set(artifact.digest, contentDigest(newContent));
    }
  }
  const perFile = new Map<string, number>();
  for (const record of currentRecords) {
    const newDigest = newDigestByOld.get(record.digest);
    if (!newDigest || newDigest === record.digest) continue;
    const current =
      writes.get(record.source) ?? (await readFile(join(repo.root, record.source), 'utf8'));
    if (!current.includes(record.digest)) continue;
    writes.set(record.source, current.split(record.digest).join(newDigest));
    perFile.set(record.source, (perFile.get(record.source) ?? 0) + 1);
  }
  plan.citationUpdates = [...perFile]
    .map(([file, count]) => ({ file, count }))
    .sort((a, b) => a.file.localeCompare(b.file));

  return { plan, writes, moves, before };
}

/** Plan the migration without writing anything. */
export async function planIdSuffixMigration(
  repo: ProductRepository,
  options: IdMigrationOptions = {},
): Promise<IdMigrationPlan> {
  return (await prepare(repo, options)).plan;
}

export interface IdMigrationResult {
  plan: IdMigrationPlan;
  applied: boolean;
  /** Set when the result was rolled back, with the reason. */
  rolledBack?: string;
}

/**
 * Apply the migration as one unit: write content, rename files, then validate. Anything that
 * makes the model or its citations worse than before restores the original tree.
 */
export async function applyIdSuffixMigration(
  repo: ProductRepository,
  options: IdMigrationOptions = {},
): Promise<IdMigrationResult> {
  const prepared = await prepare(repo, options);
  if (prepared.plan.renames.length === 0) return { plan: prepared.plan, applied: false };

  const originals = new Map<string, string>();
  const doneMoves: IdFileMove[] = [];
  const restore = async (): Promise<void> => {
    for (const move of [...doneMoves].reverse()) {
      await rename(join(repo.root, move.to), join(repo.root, move.from));
    }
    for (const [file, content] of originals)
      await writeFile(join(repo.root, file), content, 'utf8');
  };

  try {
    for (const [file, content] of prepared.writes) {
      originals.set(file, await readFile(join(repo.root, file), 'utf8'));
      await writeFile(join(repo.root, file), content, 'utf8');
    }
    for (const move of prepared.moves) {
      await mkdir(dirname(join(repo.root, move.to)), { recursive: true });
      await rename(join(repo.root, move.from), join(repo.root, move.to));
      doneMoves.push(move);
    }
    await options.afterWrite?.();
    const after = await health(repo);
    if (after.errors > prepared.before.errors) {
      throw new Error(
        `validation reports ${after.errors} error(s) after the migration, ${prepared.before.errors} before`,
      );
    }
    if (after.nonCurrentCitations > prepared.before.nonCurrentCitations) {
      throw new Error(
        `${after.nonCurrentCitations} citation(s) are not current after the migration, ${prepared.before.nonCurrentCitations} before`,
      );
    }
  } catch (error) {
    await restore();
    return {
      plan: prepared.plan,
      applied: false,
      rolledBack: error instanceof Error ? error.message : String(error),
    };
  }
  return { plan: prepared.plan, applied: true };
}

/** The IDs in the baseline model that carry a numeric suffix (for `doctor` and the upgrade notice). */
export async function countSuffixedIds(repo: ProductRepository): Promise<number> {
  const model = await loadModel(repo.modelDir, repo.root, repo.registry);
  return model.artifacts.filter((a) => a.id && hasNumericSuffix(a.id)).length;
}
