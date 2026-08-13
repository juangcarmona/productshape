import { join } from 'node:path';
import { loadConfig } from '@prodshape/core';
import {
  applyInitPlan,
  detectSddFrameworks,
  InstallConflictError,
  planInit,
  rendererFor,
  sddFrameworkById,
  type InitAction,
  type InitActionKind,
  type InitPlan,
  type SddFramework,
} from '@prodshape/distribution';
import {
  addOpenSpecIntegration,
  bootstrapOpenSpecWorkspace,
  isOpenSpecIntegrationInstalled,
  isOpenSpecWorkspace,
  OPENSPEC_NPX_SPEC,
} from '@prodshape/integration-openspec';
import { CliError, exitCodes, type CliIo } from '../context.js';

export interface InitCliOptions {
  ai?: string;
  sdd?: string;
  force?: boolean;
  flat?: boolean;
  shorthand?: boolean;
  dryRun?: boolean;
}

const sddChoices = ['openspec', 'kiro', 'speckit', 'none'] as const;
type SddChoice = (typeof sddChoices)[number];

const groupLabels: Record<InitActionKind, string> = {
  create: 'Would create',
  preserve: 'Would preserve',
  regenerate: 'Would regenerate',
  overwrite: 'Would overwrite',
  conflict: 'Conflicts',
};

const groupNotes: Partial<Record<InitActionKind, string>> = {
  regenerate: 'managed by the installation lock; rewritten identically',
  overwrite: 'replaced because --force is set',
};

function reportPlan(io: CliIo, plan: InitPlan): number {
  io.out(`Init plan for ${plan.root} (dry run):`);
  const order: InitActionKind[] = ['create', 'preserve', 'regenerate', 'overwrite', 'conflict'];
  for (const kind of order) {
    const group = plan.actions.filter((a: InitAction) => a.kind === kind);
    if (group.length === 0) {
      // Zero overwrites and zero conflicts are the reassuring cases: say them out loud.
      if (kind === 'overwrite' || kind === 'conflict') io.out(`  ${groupLabels[kind]} (0)`);
      continue;
    }
    const note = groupNotes[kind];
    io.out(`  ${groupLabels[kind]} (${group.length})${note ? ` — ${note}` : ''}:`);
    for (const action of group) {
      io.out(`    ${action.path}${action.reason ? ` (${action.reason})` : ''}`);
    }
  }
  io.out('Dry run: nothing was changed.');
  if (plan.conflicts.length > 0) {
    io.out('');
    io.out('Reconcile the conflicting files, or re-run with --force to overwrite them.');
    return exitCodes.validationErrors;
  }
  io.out('Next steps once applied:');
  for (const step of plan.nextSteps) io.out(`  - ${step}`);
  return exitCodes.success;
}

interface SddContext {
  detected: SddFramework[];
  openspecDetected: boolean;
  openspecIntegrated: boolean;
  choice: SddChoice | undefined;
}

function reportSddDetection(io: CliIo, context: SddContext): void {
  io.out('SDD frameworks:');
  if (context.detected.length === 0) {
    io.out('  detected: none');
    return;
  }
  for (const framework of context.detected) {
    const integrationNote =
      framework.id === 'openspec'
        ? context.openspecIntegrated
          ? '; ProductShape integration installed'
          : '; ProductShape integration not installed'
        : '';
    io.out(`  detected: ${framework.name} (${framework.marker}/ present${integrationNote})`);
  }
}

/**
 * Resolve the SDD choice: an explicit flag always wins; otherwise an interactive terminal is
 * asked, informed by the detection; otherwise there is no choice and init only reports.
 * Prompting is skipped for --dry-run, which must run no external command and decide nothing.
 */
async function resolveSddChoice(
  io: CliIo,
  options: InitCliOptions,
  context: SddContext,
): Promise<SddChoice | undefined> {
  if (options.sdd) return options.sdd as SddChoice;
  if (!io.prompt || options.dryRun) return undefined;

  if (context.openspecDetected && !context.openspecIntegrated) {
    const answer = (
      await io.prompt(
        'OpenSpec workspace detected. Install the ProductShape OpenSpec integration now? [Y/n] ',
      )
    )
      .trim()
      .toLowerCase();
    return answer === '' || answer === 'y' || answer === 'yes' ? 'openspec' : 'none';
  }

  if (context.detected.length === 0) {
    io.out('No SDD framework detected. ProductShape can pair the product definition with one:');
    io.out('  1) OpenSpec   installed and wired now (runs openspec init --tools none)');
    io.out('  2) Kiro       setup guidance only');
    io.out('  3) Spec Kit   setup guidance only');
    io.out('  4) Skip');
    const answer = (await io.prompt('Choose [1-4, default 4]: ')).trim();
    const byNumber: Record<string, SddChoice> = { '1': 'openspec', '2': 'kiro', '3': 'speckit' };
    return byNumber[answer] ?? 'none';
  }

  // A framework without a first-party integration is present, or OpenSpec is already wired:
  // there is nothing to install, so there is nothing to ask.
  return undefined;
}

/** Next-step lines for the SDD situation, appended to the plan so dry-run and apply agree. */
function sddNextSteps(context: SddContext): string[] {
  const recoveryStep =
    'Brownfield: recover the product definition from the existing system (see docs/adoption/existing-openspec-repository.md).';
  if (context.choice === 'openspec') {
    return context.openspecDetected && !context.openspecIntegrated ? [recoveryStep] : [];
  }
  if (context.choice === 'kiro' || context.choice === 'speckit') {
    return [...(sddFrameworkById(context.choice)?.guidance ?? [])];
  }
  if (context.openspecDetected && !context.openspecIntegrated) {
    return [
      'Wire the OpenSpec integration: prodshape integration add openspec (or re-run: prodshape init --sdd openspec)',
      recoveryStep,
    ];
  }
  if (context.detected.length === 0 && context.choice === undefined) {
    return [
      'Pair with an SDD framework when ready: OpenSpec installs in one command (prodshape init --sdd openspec); Kiro and Spec Kit set up from their own tooling.',
    ];
  }
  return [];
}

/** Execute the resolved SDD choice after the scaffold was applied. Returns the exit code. */
async function executeSddChoice(
  io: CliIo,
  options: InitCliOptions,
  context: SddContext,
): Promise<number> {
  if (context.choice === 'kiro' || context.choice === 'speckit') {
    const framework = sddFrameworkById(context.choice);
    if (framework) {
      io.out(`${framework.name} is set up from its own tooling:`);
      for (const line of framework.guidance) io.out(`  ${line}`);
    }
    return exitCodes.success;
  }
  if (context.choice !== 'openspec') return exitCodes.success;

  try {
    let cliVersion: string | undefined;
    let viaNpx = false;
    if (!(await isOpenSpecWorkspace(io.cwd))) {
      const bootstrap = await bootstrapOpenSpecWorkspace(io.cwd);
      cliVersion = bootstrap.version;
      viaNpx = bootstrap.viaNpx;
      io.out(`Created OpenSpec workspace (${bootstrap.command}; OpenSpec ${bootstrap.version}).`);
    }
    const result = await addOpenSpecIntegration(io.cwd, {
      ...(options.force !== undefined ? { force: options.force } : {}),
      ...(cliVersion ? { cliVersion } : {}),
    });
    if (result.written.length === 0) {
      io.out('OpenSpec integration is already up to date.');
    } else {
      io.out(`Installed OpenSpec integration (${result.written.length} file(s) written):`);
      for (const path of result.written) io.out(`  ${path}`);
      io.out(`  OpenSpec CLI: ${result.meta.openspecVersion}`);
    }
    if (viaNpx) {
      io.out(
        `OpenSpec ran through npx; make it permanent with: npm install -g ${OPENSPEC_NPX_SPEC} (or add it as a devDependency)`,
      );
    }
    return exitCodes.success;
  } catch (error) {
    // The scaffold already succeeded; reporting the whole run as failed would be as wrong as
    // reporting it as clean. Name both halves and the command that retries only the failed one.
    io.err(
      `The repository was initialized, but the OpenSpec integration step failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    io.err('Retry just this step with: prodshape integration add openspec');
    return exitCodes.validationErrors;
  }
}

export async function runInit(io: CliIo, options: InitCliOptions): Promise<number> {
  const ai = (options.ai ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  for (const provider of ai) {
    if (!rendererFor(provider)) {
      throw new CliError(
        `Unknown AI provider '${provider}' (supported: claude, copilot, codex)`,
        exitCodes.invalidInvocation,
      );
    }
  }
  if (options.sdd && !sddChoices.includes(options.sdd as SddChoice)) {
    throw new CliError(
      `Unknown SDD framework '${options.sdd}' (supported: openspec, kiro, speckit, none)`,
      exitCodes.invalidInvocation,
    );
  }

  const detected = await detectSddFrameworks(io.cwd);
  const openspecDetected = detected.some((framework) => framework.id === 'openspec');
  const context: SddContext = {
    detected,
    openspecDetected,
    openspecIntegrated: openspecDetected && (await isOpenSpecIntegrationInstalled(io.cwd)),
    choice: undefined,
  };
  reportSddDetection(io, context);
  context.choice = await resolveSddChoice(io, options, context);

  // Read any existing configuration first, so a preserved config.yaml keeps deciding what is
  // rendered rather than a flag silently disagreeing with it.
  const existing = await loadConfig(join(io.cwd, '.product', 'config.yaml'), io.cwd);

  const plan = await planInit({
    root: io.cwd,
    ai,
    existingShorthand: existing.config.integrations['shorthand-commands'],
    ...(options.force !== undefined ? { force: options.force } : {}),
    ...(options.flat !== undefined ? { flat: options.flat } : {}),
    ...(options.shorthand !== undefined ? { shorthand: options.shorthand } : {}),
  });
  plan.nextSteps.push(...sddNextSteps(context));

  if (options.dryRun) {
    if (context.choice === 'openspec') {
      io.out('SDD plan (dry run):');
      if (!(await isOpenSpecWorkspace(io.cwd))) {
        io.out(
          `  would create an OpenSpec workspace (openspec init --tools none, through npx -y ${OPENSPEC_NPX_SPEC} when no CLI is installed)`,
        );
      }
      io.out('  would merge PDaC guidance into openspec/config.yaml');
      io.out('  would write .product/integrations/openspec.json');
    } else if (context.choice === 'kiro' || context.choice === 'speckit') {
      const framework = sddFrameworkById(context.choice);
      io.out('SDD plan (dry run):');
      io.out(`  would print ${framework?.name} setup guidance (nothing to install)`);
    }
    return reportPlan(io, plan);
  }

  let result;
  try {
    result = await applyInitPlan(plan);
  } catch (error) {
    if (error instanceof InstallConflictError) {
      throw new CliError(error.message, exitCodes.validationErrors);
    }
    throw error;
  }

  io.out(`Initialized Product Definition as Code (${result.created.length} file(s) created).`);
  if (result.skipped.length > 0) {
    io.out('Preserved existing files (use --force to overwrite):');
    for (const path of result.skipped) io.out(`  ${path}`);
  }
  if (result.removed.length > 0) {
    io.out('Removed managed files that are no longer generated:');
    for (const path of result.removed) io.out(`  ${path}`);
  }

  const sddExitCode = await executeSddChoice(io, options, context);

  io.out('Next steps:');
  for (const step of result.nextSteps) io.out(`  - ${step}`);
  return sddExitCode;
}
