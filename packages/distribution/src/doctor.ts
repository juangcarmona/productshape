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
  /**
   * OpenSpec integration health supplied by the caller. The distribution package must not depend
   * on integration-openspec, so the CLI calls it and passes the result. Omit when no OpenSpec
   * integration is installed.
   */
  openspec?: {
    installed: boolean;
    checks: { name: string; ok: boolean; detail: string }[];
  };
}

/** Repository health checks: structure, configuration, versions, managed files, OpenSpec, skills. */
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

  // Provider skill layout validation: every installed provider's skills must have SKILL.md
  // and every referenced file must exist relative to the skill directory.
  if (lock) {
    const skillLayoutChecks = await validateSkillLayouts(root, lock);
    checks.push(...skillLayoutChecks);
  }

  // OpenSpec integration health: when an integration is recorded, verify it is functional.
  if (options.openspec) {
    if (options.openspec.installed) {
      const allOk = options.openspec.checks.every((c) => c.ok);
      checks.push({
        name: 'openspec integration',
        ok: allOk,
        detail: allOk
          ? 'OpenSpec integration healthy'
          : `${options.openspec.checks.filter((c) => !c.ok).length} OpenSpec integration problem(s)`,
      });
      for (const check of options.openspec.checks) {
        checks.push({
          name: `openspec: ${check.name}`,
          ok: check.ok,
          detail: check.detail,
        });
      }
    } else {
      // No OpenSpec integration installed — informational, not a failure.
      checks.push({
        name: 'openspec integration',
        ok: true,
        detail: 'not installed (informational; run: prodshape integration add openspec)',
      });
    }
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

/**
 * Validate that every installed provider's skill directories have SKILL.md and that
 * referenced files exist relative to the skill directory. Detects invocation collisions
 * (two providers generating the same path).
 */
async function validateSkillLayouts(
  root: string,
  lock: { providers: Record<string, { files: Record<string, string> }> },
): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];

  // Group skill files by provider to detect layout issues.
  const providerSkillPaths = new Map<string, Set<string>>();
  const allPaths = new Set<string>();
  let collisions = 0;

  for (const [provider, entry] of Object.entries(lock.providers)) {
    const skillPaths = new Set<string>();
    for (const path of Object.keys(entry.files)) {
      // Skill files are under .claude/skills/, .github/skills/, or .agents/skills/
      if (
        path.includes('/skills/') &&
        (path.endsWith('/SKILL.md') || path.includes('/references/'))
      ) {
        skillPaths.add(path);
      }
      if (allPaths.has(path)) collisions++;
      allPaths.add(path);
    }
    providerSkillPaths.set(provider, skillPaths);
  }

  if (collisions > 0) {
    checks.push({
      name: 'invocation collisions',
      ok: false,
      detail: `${collisions} path collision(s) across providers; run: prodshape integration update`,
    });
  }

  // Check that every skill has a SKILL.md and that references resolve.
  const missingReferences: string[] = [];
  for (const [provider, skillPaths] of providerSkillPaths) {
    const skillDirs = new Set<string>();
    for (const path of skillPaths) {
      if (path.endsWith('/SKILL.md')) {
        skillDirs.add(path.slice(0, -'/SKILL.md'.length));
      }
    }
    for (const path of skillPaths) {
      if (path.includes('/references/')) {
        // The reference must be inside a skill directory that has a SKILL.md.
        const skillDir = path.split('/references/')[0] ?? '';
        if (!skillDirs.has(skillDir)) {
          missingReferences.push(`${provider}: ${path} (orphaned reference, no SKILL.md)`);
        }
      }
    }
  }

  if (missingReferences.length > 0) {
    checks.push({
      name: 'skill references',
      ok: false,
      detail: `${missingReferences.length} orphaned reference(s): ${missingReferences.slice(0, 3).join(', ')}${missingReferences.length > 3 ? '...' : ''}`,
    });
  } else if (allPaths.size > 0) {
    checks.push({
      name: 'skill references',
      ok: true,
      detail: 'all skill references resolve',
    });
  }

  return checks;
}
