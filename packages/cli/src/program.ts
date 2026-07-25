import { Command, CommanderError } from 'commander';
import { runChangePromote, runChangeValidate } from './commands/change.js';
import { runCoverageCheck } from './commands/coverage.js';
import { runDoctorCommand } from './commands/doctor.js';
import { runGraph } from './commands/graph.js';
import { runInit } from './commands/init.js';
import { runIntegrationAdd, runIntegrationUpdate } from './commands/integration.js';
import { runHandoffCreate, runHandoffStatus } from './commands/handoff.js';
import { runImpact } from './commands/impact.js';
import { runInspect } from './commands/inspect.js';
import { runValidate } from './commands/validate.js';
import { CliError, exitCodes, type CliIo } from './context.js';

export function buildProgram(io: CliIo, capture: { code: number }): Command {
  const program = new Command('prodshape');
  program
    .description('ProductShape - the reference implementation of Product Definition as Code')
    .exitOverride()
    .configureOutput({
      writeOut: (str) => io.out(str.trimEnd()),
      writeErr: (str) => io.err(str.trimEnd()),
    });

  program
    .command('validate')
    .description('Validate the current product model (or a Product Change overlay)')
    .option('--change <id>', 'validate this Product Change overlay instead of the baseline')
    .option('--format <format>', 'output format: text or json', 'text')
    .action(async (options: { change?: string; format: 'text' | 'json' }) => {
      capture.code = options.change
        ? await runChangeValidate(io, options.change, options)
        : await runValidate(io, options);
    });

  program
    .command('init')
    .description('Initialize Product Definition as Code in this repository')
    .option('--ai <providers>', 'comma-separated AI integrations: claude, copilot')
    .option('--sdd <provider>', 'SDD framework: openspec')
    .option('--force', 'overwrite existing files')
    .action(async (options: { ai?: string; sdd?: string; force?: boolean }) => {
      capture.code = await runInit(io, options);
    });

  const integration = program
    .command('integration')
    .description('Manage generated AI provider integrations');
  integration
    .command('add')
    .description('Install a provider integration (claude, copilot, openspec)')
    .argument('<provider>', 'provider name')
    .action(async (provider: string) => {
      capture.code = await runIntegrationAdd(io, provider);
    });
  integration
    .command('update')
    .description('Regenerate all installed integrations (--check detects drift only)')
    .option('--check', 'detect drift without writing')
    .action(async (options: { check?: boolean }) => {
      capture.code = await runIntegrationUpdate(io, options);
    });

  program
    .command('doctor')
    .description('Check repository structure, configuration and managed files')
    .action(async () => {
      capture.code = await runDoctorCommand(io);
    });

  const coverage = program
    .command('coverage')
    .description('Requirement-coverage evidence for SDD changes');
  coverage
    .command('check')
    .description('Verify every implemented requirement has coverage evidence')
    .argument('<target>', 'OpenSpec change name or SDD change directory')
    .action(async (target: string) => {
      capture.code = await runCoverageCheck(io, target);
    });

  const change = program.command('change').description('Work with Product Changes');
  change
    .command('validate')
    .description('Compile and validate a Product Change overlay')
    .argument('<id>', 'Product Change ID')
    .option('--format <format>', 'output format: text or json', 'text')
    .action(async (id: string, options: { format: 'text' | 'json' }) => {
      capture.code = await runChangeValidate(io, id, options);
    });
  change
    .command('promote')
    .description('Apply an implemented Product Change to the baseline (explicit, never implicit)')
    .argument('<id>', 'Product Change ID')
    .option('--dry-run', 'report the plan without changing anything')
    .action(async (id: string, options: { dryRun?: boolean }) => {
      capture.code = await runChangePromote(io, id, options);
    });

  const handoff = program.command('handoff').description('Generate and check Product Handoffs');
  handoff
    .command('create')
    .description('Generate a Product Handoff for an approved delivery slice')
    .requiredOption('--change <id>', 'Product Change ID')
    .requiredOption('--slice <id>', 'Delivery Slice ID')
    .requiredOption('--work-item <ref>', 'work-item reference: provider:owner/repository#id')
    .option('--title <title>', 'work-item title')
    .option('--out <dir>', 'output directory for the sidecar files')
    .option('--adapter <name>', 'SDD adapter (openspec)')
    .option('--sdd-change <name>', 'target SDD change (with --adapter openspec)')
    .action(
      async (options: {
        change: string;
        slice: string;
        workItem: string;
        title?: string;
        out?: string;
        adapter?: string;
        sddChange?: string;
      }) => {
        capture.code = await runHandoffCreate(io, options);
      },
    );
  handoff
    .command('status')
    .description('Report whether a Product Handoff is current, stale or invalid')
    .argument('<path>', 'path to product-handoff.yaml')
    .option('--format <format>', 'output format: text or json', 'text')
    .action(async (path: string, options: { format: 'text' | 'json' }) => {
      capture.code = await runHandoffStatus(io, path, options);
    });

  program
    .command('graph')
    .description('Compile the product graph and write generated outputs')
    .option('--format <format>', 'output format: summary, json or mermaid', 'summary')
    .action(async (options: { format: 'summary' | 'json' | 'mermaid' }) => {
      capture.code = await runGraph(io, options);
    });

  program
    .command('inspect')
    .description('Inspect one artifact by ID')
    .argument('<id>', 'artifact ID')
    .option('--format <format>', 'output format: text or json', 'text')
    .action(async (id: string, options: { format: 'text' | 'json' }) => {
      capture.code = await runInspect(io, id, options);
    });

  program
    .command('impact')
    .description('Analyze structural impact of one artifact')
    .argument('<id>', 'artifact ID')
    .option('--depth <depth>', 'maximum traversal depth')
    .option('--direction <direction>', 'incoming, outgoing or both', 'both')
    .option('--format <format>', 'output format: text or json', 'text')
    .action(
      async (
        id: string,
        options: { depth?: string; direction: string; format: 'text' | 'json' },
      ) => {
        capture.code = await runImpact(io, id, options);
      },
    );

  return program;
}

/** Run the CLI and return the documented exit code. */
export async function runCli(argv: string[], io: CliIo): Promise<number> {
  const capture = { code: exitCodes.success };
  const program = buildProgram(io, capture);
  try {
    await program.parseAsync(argv, { from: 'user' });
    return capture.code;
  } catch (error) {
    if (error instanceof CliError) {
      io.err(`error: ${error.message}`);
      return error.exitCode;
    }
    if (error instanceof CommanderError) {
      // Help/version display exits successfully; parse errors are invalid invocations.
      if (error.exitCode === 0) return exitCodes.success;
      return exitCodes.invalidInvocation;
    }
    io.err(
      `internal error: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`,
    );
    return exitCodes.internalFailure;
  }
}
