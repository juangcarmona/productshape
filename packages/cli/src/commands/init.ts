import { join } from 'node:path';
import { loadConfig } from '@prodshape/core';
import {
  applyInitPlan,
  detectSddFrameworks,
  gitignoreRelativePath,
  InstallConflictError,
  missingIgnoreRulesIn,
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
  OPENSPEC_VERIFY_COMMAND,
} from '@prodshape/integration-openspec';
import {
  addSpecKitIntegration,
  isSpecKitIntegrationInstalled,
  isSpecKitWorkspace,
  SPECKIT_VERIFY_COMMAND,
} from '@prodshape/integration-speckit';
import { CliError, exitCodes, type CliIo } from '../context.js';

export interface InitCliOptions {
  ai?: string;
  sdd?: string;
  full?: boolean;
  force?: boolean;
  flat?: boolean;
  shorthand?: boolean;
  gitignore?: boolean;
  dryRun?: boolean;
}

const sddChoices = ['openspec', 'kiro', 'speckit', 'none'] as const;
type SddChoice = (typeof sddChoices)[number];

const groupLabels: Record<InitActionKind, string> = {
  create: 'Would create',
  preserve: 'Would preserve',
  append: 'Would extend',
  regenerate: 'Would regenerate',
  overwrite: 'Would overwrite',
  conflict: 'Conflicts',
};

const groupNotes: Partial<Record<InitActionKind, string>> = {
  append: 'existing content kept; the missing rules are added at the end',
  regenerate: 'managed by the installation lock; rewritten identically',
  overwrite: 'replaced because --force is set',
};

function reportPlan(io: CliIo, plan: InitPlan): number {
  io.out(`Init plan for ${plan.root} (dry run):`);
  const order: InitActionKind[] = [
    'create',
    'preserve',
    'append',
    'regenerate',
    'overwrite',
    'conflict',
  ];
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
  speckitDetected: boolean;
  speckitIntegrated: boolean;
  choice: SddChoice | undefined;
}

function reportSddDetection(io: CliIo, context: SddContext): void {
  io.out('SDD frameworks:');
  if (context.detected.length === 0) {
    io.out('  detected: none');
    return;
  }
  for (const framework of context.detected) {
    const integrated =
      framework.id === 'openspec'
        ? context.openspecIntegrated
        : framework.id === 'speckit'
          ? context.speckitIntegrated
          : undefined;
    const integrationNote =
      integrated === undefined
        ? ''
        : integrated
          ? '; ProductShape integration installed'
          : '; ProductShape integration not installed';
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

  if (context.speckitDetected && !context.speckitIntegrated) {
    const answer = (
      await io.prompt(
        'Spec Kit workspace detected. Install the ProductShape Spec Kit integration now? [Y/n] ',
      )
    )
      .trim()
      .toLowerCase();
    return answer === '' || answer === 'y' || answer === 'yes' ? 'speckit' : 'none';
  }

  if (context.detected.length === 0) {
    io.out('No SDD framework detected. ProductShape can pair the product definition with one:');
    io.out('  1) OpenSpec   installed and wired now (runs openspec init --tools none)');
    io.out('  2) Kiro       setup guidance only');
    io.out('  3) Spec Kit   setup guidance only (wired once `specify init` has run)');
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
  if (context.choice === 'speckit') {
    // With a workspace present the integration installs now; without one, guidance first.
    return context.speckitDetected ? [] : [...(sddFrameworkById('speckit')?.guidance ?? [])];
  }
  if (context.choice === 'kiro') {
    return [...(sddFrameworkById(context.choice)?.guidance ?? [])];
  }
  if (context.openspecDetected && !context.openspecIntegrated) {
    return [
      'Wire the OpenSpec integration: prodshape integration add openspec (or re-run: prodshape init --sdd openspec)',
      recoveryStep,
    ];
  }
  if (context.speckitDetected && !context.speckitIntegrated) {
    return [
      'Wire the Spec Kit integration: prodshape integration add speckit (or re-run: prodshape init --sdd speckit)',
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

/**
 * Decide whether to extend the ignore file. The flag is an explicit request and always wins;
 * otherwise an interactive terminal is asked, and everywhere else the answer is no.
 *
 * Never defaulting to yes is the point: the ignore file belongs to the user, and initialization
 * earns its trust by not editing what it was not asked to edit. There is also nothing to ask when
 * the rules are already covered, and nothing to decide under --dry-run, which writes nothing.
 */
async function resolveGitignore(
  io: CliIo,
  options: InitCliOptions,
  missing: string[],
): Promise<boolean> {
  if (options.gitignore) return true;
  if (missing.length === 0 || !io.prompt || options.dryRun) return false;
  const answer = (
    await io.prompt(
      `Add ${missing.join(' and ')} to ${gitignoreRelativePath}? Regenerable output, never canonical. [Y/n] `,
    )
  )
    .trim()
    .toLowerCase();
  return answer === '' || answer === 'y' || answer === 'yes';
}

/** Execute the resolved SDD choice after the scaffold was applied. Returns the exit code. */
async function executeSddChoice(
  io: CliIo,
  options: InitCliOptions,
  context: SddContext,
): Promise<number> {
  if (context.choice === 'speckit') {
    if (!(await isSpecKitWorkspace(io.cwd))) {
      const framework = sddFrameworkById('speckit');
      io.out('Spec Kit workspaces are created by its own tooling:');
      for (const line of framework?.guidance ?? []) io.out(`  ${line}`);
      return exitCodes.success;
    }
    try {
      const config = await loadConfig(join(io.cwd, '.product', 'config.yaml'), io.cwd);
      const result = await addSpecKitIntegration(io.cwd, {
        ...(options.force !== undefined ? { force: options.force } : {}),
        warningsAsErrors: config.config.validation['warnings-as-errors'],
      });
      if (result.written.length === 0) {
        io.out('Spec Kit integration is already up to date.');
      } else {
        io.out(`Installed Spec Kit integration (${result.written.length} file(s) written):`);
        for (const path of result.written) io.out(`  ${path}`);
      }
      io.out(`Verify: ${SPECKIT_VERIFY_COMMAND}`);
      return exitCodes.success;
    } catch (error) {
      io.err(
        `The repository was initialized, but the Spec Kit integration step failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      io.err('Retry just this step with: prodshape integration add speckit');
      return exitCodes.validationErrors;
    }
  }
  if (context.choice === 'kiro') {
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
    const config = await loadConfig(join(io.cwd, '.product', 'config.yaml'), io.cwd);
    const result = await addOpenSpecIntegration(io.cwd, {
      ...(options.force !== undefined ? { force: options.force } : {}),
      ...(cliVersion ? { cliVersion } : {}),
      warningsAsErrors: config.config.validation['warnings-as-errors'],
    });
    if (result.written.length === 0) {
      io.out('OpenSpec integration is already up to date.');
    } else {
      io.out(`Installed OpenSpec integration (${result.written.length} file(s) written):`);
      for (const path of result.written) io.out(`  ${path}`);
      io.out(`  OpenSpec CLI: ${result.meta.openspecVersion}`);
    }
    io.out(`Verify: ${OPENSPEC_VERIFY_COMMAND}`);
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
  const speckitDetected = detected.some((framework) => framework.id === 'speckit');
  const context: SddContext = {
    detected,
    openspecDetected,
    openspecIntegrated: openspecDetected && (await isOpenSpecIntegrationInstalled(io.cwd)),
    speckitDetected,
    speckitIntegrated: speckitDetected && (await isSpecKitIntegrationInstalled(io.cwd)),
    choice: undefined,
  };
  reportSddDetection(io, context);
  context.choice = await resolveSddChoice(io, options, context);

  // Read any existing configuration first, so a preserved config.yaml keeps deciding what is
  // rendered rather than a flag silently disagreeing with it.
  const existing = await loadConfig(join(io.cwd, '.product', 'config.yaml'), io.cwd);

  // Asked from the configured generated root, so a repository that relocated it is offered the
  // rule it actually needs rather than the default one.
  const generatedRoot = existing.config.prodshape.generated.root;
  const gitignore = await resolveGitignore(
    io,
    options,
    await missingIgnoreRulesIn(io.cwd, generatedRoot),
  );

  const plan = await planInit({
    root: io.cwd,
    ai,
    existingShorthand: existing.config.prodshape.integrations['shorthand-commands'],
    gitignore,
    generatedRoot,
    ...(options.full !== undefined ? { full: options.full } : {}),
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
    } else if (context.choice === 'speckit') {
      io.out('SDD plan (dry run):');
      if (context.speckitDetected) {
        io.out('  would write PDaC guidance to .specify/memory/pdac.md');
        io.out('  would write .product/integrations/speckit.ci.yml');
        io.out('  would write .product/integrations/speckit.json');
      } else {
        io.out(
          '  would print Spec Kit setup guidance (run `specify init` first, then: prodshape integration add speckit)',
        );
      }
    } else if (context.choice === 'kiro') {
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
  if (result.appended.length > 0) {
    io.out('Extended existing files (nothing removed, rules added at the end):');
    for (const path of result.appended) io.out(`  ${path}`);
  }

  const sddExitCode = await executeSddChoice(io, options, context);

  io.out('Next steps:');
  for (const step of result.nextSteps) io.out(`  - ${step}`);
  return sddExitCode;
}
