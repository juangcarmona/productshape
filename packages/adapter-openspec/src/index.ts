import { access, readFile, readdir } from 'node:fs/promises';
import { isAbsolute, join, relative, sep } from 'node:path';
import { parse } from 'yaml';
import type { Diagnostic, HandoffDocument, SchemaRegistry, SliceEvidence } from '@prodshape/core';

/**
 * The OpenSpec adapter owns sidecar placement and coverage validation only.
 * It never touches native OpenSpec artifacts (proposal.md, design.md, tasks.md,
 * specs/) and never owns canonical product semantics.
 */

export const coverageSchemaId = 'product-definition-as-code/coverage/v1alpha1';

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/** Resolve an OpenSpec change directory (openspec/changes/<name>) or explain why not. */
export async function locateOpenSpecChange(
  root: string,
  name: string,
): Promise<{ dir: string } | { error: string }> {
  if (!(await exists(join(root, 'openspec')))) {
    return { error: `No openspec/ workspace found under ${root} (run: openspec init)` };
  }
  const dir = join(root, 'openspec', 'changes', name);
  if (!(await exists(dir))) {
    return { error: `OpenSpec change '${name}' not found at openspec/changes/${name}` };
  }
  return { dir };
}

export interface CoverageEntry {
  status: 'covered' | 'partial' | 'uncovered';
  specification?: string[];
  verification?: string[];
}

export interface CoverageDocument {
  schema: string;
  handoff: string;
  requirements: Record<string, CoverageEntry>;
}

export interface CoverageCheckResult {
  diagnostics: Diagnostic[];
  covered: string[];
  uncovered: string[];
}

/**
 * Deterministic coverage validation for one SDD change directory containing the
 * product-handoff.yaml and product-coverage.yaml sidecars:
 * schema validity, handoff linkage, PRODUCT043 for implemented requirements
 * without a covered mapping, and existence of every evidence path.
 * Evidence is validated, never inferred from file names.
 */
export async function checkCoverage(
  root: string,
  sddChangeDir: string,
  registry: SchemaRegistry,
  label: { handoff: string; coverage: string },
): Promise<CoverageCheckResult> {
  const diagnostics: Diagnostic[] = [];
  const result: CoverageCheckResult = { diagnostics, covered: [], uncovered: [] };
  const fail = (code: string, message: string, file: string, extras?: Partial<Diagnostic>) =>
    diagnostics.push({ severity: 'error', code, message, file, ...extras });

  let handoff: HandoffDocument;
  try {
    handoff = parse(
      await readFile(join(sddChangeDir, 'product-handoff.yaml'), 'utf8'),
    ) as HandoffDocument;
  } catch {
    fail('PRODUCT041', 'product-handoff.yaml sidecar is missing or unreadable', label.handoff);
    return result;
  }
  const handoffDiagnostics = registry.validate('product-handoff', handoff, label.handoff);
  if (handoffDiagnostics.length > 0) {
    diagnostics.push(...handoffDiagnostics);
    return result;
  }

  let coverage: CoverageDocument;
  try {
    coverage = parse(
      await readFile(join(sddChangeDir, 'product-coverage.yaml'), 'utf8'),
    ) as CoverageDocument;
  } catch {
    fail(
      'PRODUCT043',
      'product-coverage.yaml is missing: no coverage evidence for the implemented requirements',
      label.coverage,
    );
    result.uncovered = [...handoff.implements];
    return result;
  }
  const coverageDiagnostics = registry.validate('product-coverage', coverage, label.coverage);
  if (coverageDiagnostics.length > 0) {
    diagnostics.push(...coverageDiagnostics);
    return result;
  }

  if (coverage.handoff !== handoff.id) {
    fail(
      'PRODUCT043',
      `Coverage references handoff '${coverage.handoff}' but the sidecar handoff is '${handoff.id}'`,
      label.coverage,
      { target: coverage.handoff },
    );
  }

  const implemented = new Set(handoff.implements);
  for (const requirement of Object.keys(coverage.requirements).sort()) {
    if (!implemented.has(requirement)) {
      fail(
        'PRODUCT043',
        `Coverage entry '${requirement}' is unrelated: the handoff does not implement it`,
        label.coverage,
        { artifact: requirement, target: requirement },
      );
    }
  }

  for (const requirement of handoff.implements) {
    const entry = coverage.requirements[requirement];
    if (!entry || entry.status === 'uncovered') {
      fail(
        'PRODUCT043',
        `Implemented requirement '${requirement}' has no coverage evidence`,
        label.coverage,
        { artifact: requirement, target: requirement },
      );
      result.uncovered.push(requirement);
      continue;
    }
    if (entry.status === 'partial') {
      diagnostics.push({
        severity: 'warning',
        code: 'PRODUCT043',
        message: `Implemented requirement '${requirement}' is only partially covered`,
        file: label.coverage,
        artifact: requirement,
        target: requirement,
      });
    }
    result.covered.push(requirement);
  }

  for (const [requirement, entry] of Object.entries(coverage.requirements)) {
    for (const path of [...(entry.specification ?? []), ...(entry.verification ?? [])]) {
      // Evidence must stay inside the repository: relative, no traversal.
      if (isAbsolute(path) || path.includes('\\') || path.split('/').includes('..')) {
        fail(
          'PRODUCT043',
          `Coverage evidence path '${path}' for '${requirement}' must be a forward-slash relative path inside the repository`,
          label.coverage,
          { artifact: requirement, field: 'evidence', target: path },
        );
        continue;
      }
      const absolute = join(root, ...path.split('/'));
      const insideChange = join(sddChangeDir, ...path.split('/'));
      if (!(await exists(absolute)) && !(await exists(insideChange))) {
        fail(
          'PRODUCT043',
          `Coverage evidence path '${path}' for '${requirement}' does not exist`,
          label.coverage,
          { artifact: requirement, field: 'evidence', target: path },
        );
      }
    }
  }

  result.covered.sort();
  result.uncovered.sort();
  return result;
}

export interface DiscoveredHandoff {
  /** Absolute path of the SDD change directory holding the sidecars. */
  dir: string;
  /** Repository-relative POSIX path, for diagnostic labels. */
  relative: string;
  handoff: HandoffDocument;
}

async function listChangeDirs(base: string): Promise<string[]> {
  try {
    const entries = await readdir(base, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() && e.name !== 'archive')
      .map((e) => join(base, e.name))
      .sort();
  } catch {
    return [];
  }
}

/**
 * Deterministically discover every SDD change directory whose handoff sidecar
 * references the given Product Change, scanning openspec/changes/ and
 * openspec/changes/archive/ in lexicographic order. Unparseable or schema-alien
 * handoff files are skipped: discovery only answers "where might evidence be";
 * checkCoverage judges it.
 */
export async function findChangeHandoffDirs(
  root: string,
  changeId: string,
): Promise<DiscoveredHandoff[]> {
  const bases = [join(root, 'openspec', 'changes'), join(root, 'openspec', 'changes', 'archive')];
  const discovered: DiscoveredHandoff[] = [];
  for (const base of bases) {
    for (const dir of await listChangeDirs(base)) {
      let handoff: HandoffDocument;
      try {
        handoff = parse(
          await readFile(join(dir, 'product-handoff.yaml'), 'utf8'),
        ) as HandoffDocument;
      } catch {
        continue;
      }
      if (handoff?.source?.['product-change'] === changeId) {
        discovered.push({ dir, relative: relative(root, dir).split(sep).join('/'), handoff });
      }
    }
  }
  return discovered;
}

/**
 * Coverage-evidence verdict for one delivery slice, for the promotion gate:
 * a slice is evidenced when at least one handoff referencing it passes
 * checkCoverage with zero errors (first passing directory in sort order wins).
 * When every matching directory fails, all their diagnostics are surfaced.
 */
export async function checkSliceEvidence(
  root: string,
  changeId: string,
  sliceId: string,
  registry: SchemaRegistry,
): Promise<SliceEvidence> {
  const dirs = (await findChangeHandoffDirs(root, changeId)).filter(
    (d) => d.handoff?.source?.['delivery-slice'] === sliceId,
  );
  if (dirs.length === 0) return { found: false, diagnostics: [], covered: [] };

  const failures: Diagnostic[] = [];
  for (const candidate of dirs) {
    const result = await checkCoverage(root, candidate.dir, registry, {
      handoff: `${candidate.relative}/product-handoff.yaml`,
      coverage: `${candidate.relative}/product-coverage.yaml`,
    });
    if (!result.diagnostics.some((d) => d.severity === 'error')) {
      return { found: true, diagnostics: result.diagnostics, covered: result.covered };
    }
    failures.push(...result.diagnostics);
  }
  return { found: true, diagnostics: failures, covered: [] };
}
