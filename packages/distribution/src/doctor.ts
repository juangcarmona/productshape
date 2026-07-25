import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { frameworkVersion } from './assets.js';
import { checkIntegrations, type IntegrationDiagnostic } from './install.js';
import { readLock } from './lock.js';

export interface DoctorCheck {
  name: string;
  ok: boolean;
  detail: string;
}

export interface DoctorReport {
  checks: DoctorCheck[];
  diagnostics: IntegrationDiagnostic[];
}

async function exists(root: string, relPath: string): Promise<boolean> {
  try {
    await access(join(root, ...relPath.split('/')));
    return true;
  } catch {
    return false;
  }
}

export interface DoctorOptions {
  root: string;
  /** Config facts supplied by the caller (the CLI validates configuration via core). */
  configValid: boolean;
  configDetail: string;
  modelPath: string;
  changesPath: string;
  sddProvider?: string;
}

/** Repository health checks: structure, configuration, versions, managed files, SDD workspace. */
export async function runDoctor(options: DoctorOptions): Promise<DoctorReport> {
  const { root } = options;
  const checks: DoctorCheck[] = [];

  checks.push({
    name: 'configuration',
    ok: options.configValid,
    detail: options.configDetail,
  });

  const modelExists = await exists(root, options.modelPath);
  checks.push({
    name: 'product structure',
    ok: modelExists,
    detail: modelExists
      ? `${options.modelPath} present`
      : `${options.modelPath} missing; run: prodshape init`,
  });

  // The changes home must exist. Its active/completed/rejected subdirectories are created on
  // demand and are legitimately absent when empty — Git does not track empty directories, so a
  // repository with no changes in a given state simply has no such subdirectory. Reporting that
  // as broken structure is a false positive (it would fail on any repository whose last active
  // change was just promoted), so the check verifies the changes home, not each subdirectory.
  const changesExists = await exists(root, options.changesPath);
  const activePresent = await exists(root, `${options.changesPath}/active`);
  checks.push({
    name: 'changes structure',
    ok: changesExists,
    detail: changesExists
      ? `${options.changesPath} present (active/ ${activePresent ? 'present' : 'empty — no active changes'})`
      : `${options.changesPath} missing; run: prodshape init`,
  });

  const lock = await readLock(root);
  const version = await frameworkVersion();
  if (lock) {
    const versionOk = lock.version === version;
    checks.push({
      name: 'framework version',
      ok: versionOk,
      detail: versionOk
        ? `integrations generated with v${lock.version}`
        : `integrations generated with v${lock.version}, installed v${version}; run: prodshape integration update`,
    });
  } else {
    checks.push({
      name: 'framework version',
      ok: true,
      detail: 'no integrations installed (no installation.lock.json)',
    });
  }

  const diagnostics = await checkIntegrations(root);
  checks.push({
    name: 'managed files',
    ok: diagnostics.length === 0,
    detail:
      diagnostics.length === 0
        ? lock
          ? 'all managed files match the installation lock'
          : 'nothing to check'
        : `${diagnostics.length} managed file problem(s)`,
  });

  if (options.sddProvider === 'openspec') {
    const openspecExists = await exists(root, 'openspec');
    checks.push({
      name: 'sdd workspace',
      ok: openspecExists,
      detail: openspecExists
        ? 'openspec/ present'
        : 'configured SDD provider is openspec but openspec/ is missing (run: openspec init)',
    });
  }

  const generatedExists = await exists(root, '.product/generated');
  checks.push({
    name: 'generated outputs',
    ok: true,
    detail: generatedExists
      ? '.product/generated present'
      : '.product/generated absent (informational; run: prodshape graph)',
  });

  // Schema compatibility: the lock schema is the only versioned distribution artifact.
  if (lock && lock.schema !== 'product-definition-as-code/installation-lock/v1alpha1') {
    checks.push({
      name: 'lock schema',
      ok: false,
      detail: `unsupported installation lock schema '${lock.schema}'`,
    });
  }

  return { checks, diagnostics };
}
