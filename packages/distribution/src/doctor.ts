import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { frameworkVersion, loadBundledAssets } from './assets.js';
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
  /**
   * Model-validation verdict supplied by the caller. Injected rather than computed here because
   * this package must not depend on core; omit it and the check is simply not reported, so a
   * library consumer that never runs validation does not get a phantom failure.
   */
  validation?: { errors: number; warnings: number; artifacts: number };
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

  if (options.validation) {
    const { errors, warnings, artifacts } = options.validation;
    checks.push({
      name: 'model validation',
      ok: errors === 0,
      detail: `${errors} error(s), ${warnings} warning(s) across ${artifacts} artifact(s)`,
    });
  }

  const modelExists = await exists(root, options.modelPath);
  checks.push({
    name: 'product structure',
    ok: modelExists,
    detail: modelExists
      ? `${options.modelPath} present`
      : `${options.modelPath} missing; run: prodshape init`,
  });

  // Authoring templates. Deliberately three states rather than present/absent: a repository that
  // authors artifacts by hand (this one included) legitimately has no .product/templates, so a
  // hard presence check would report health as failure. A *partial* set is the real defect —
  // an interrupted init, or a template deleted by hand.
  const templateNames = (await loadBundledAssets()).templates.map((t) => t.name);
  const missingTemplates: string[] = [];
  for (const name of templateNames) {
    if (!(await exists(root, `.product/templates/${name}`))) missingTemplates.push(name);
  }
  if (missingTemplates.length === templateNames.length) {
    checks.push({
      name: 'authoring templates',
      ok: true,
      detail: '.product/templates absent (informational; run: prodshape init)',
    });
  } else if (missingTemplates.length === 0) {
    checks.push({
      name: 'authoring templates',
      ok: true,
      detail: `${templateNames.length} authoring template(s) present`,
    });
  } else {
    checks.push({
      name: 'authoring templates',
      ok: false,
      detail:
        `${missingTemplates.length} of ${templateNames.length} authoring template(s) missing ` +
        `(${missingTemplates.join(', ')}); run: prodshape init`,
    });
  }

  // The changes home must exist. Its active/completed/rejected subdirectories are created on
  // demand and are legitimately absent when empty — Git does not track empty directories, so a
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
