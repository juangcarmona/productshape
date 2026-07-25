import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse } from 'yaml';
import type { Diagnostic, HandoffDocument, SchemaRegistry } from '@prodshape/core';

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
