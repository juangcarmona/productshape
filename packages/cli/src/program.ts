import { Command, CommanderError } from 'commander';
import { runChangeList, runChangeValidate } from './commands/change.js';
import { runCite } from './commands/cite.js';
import { runCitationsVerify } from './commands/citations.js';
import { runDoctorCommand } from './commands/doctor.js';
import { runFix } from './commands/fix.js';
import { runGraph } from './commands/graph.js';
import { runInit } from './commands/init.js';
import { runIntegrationAdd, runIntegrationUpdate } from './commands/integration.js';
import { runImpact } from './commands/impact.js';
import { runInspect } from './commands/inspect.js';
import { runSchema } from './commands/schema.js';
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
    .description('Validate the current product model')
    .option('--format <format>', 'output format: text or json', 'text')
    .action(async (options: { format: 'text' | 'json' }) => {
      capture.code = await runValidate(io, options);
    });

  program
    .command('init')
    .description('Initialize Product Definition as Code in this repository')
    .option('--ai <providers>', 'comma-separated AI integrations: claude, copilot')
    .option('--force', 'overwrite existing files')
    .option('--flat', 'scaffold the model directory without per-kind subdirectories')
    .option('--shorthand', 'also generate the /ps:<name> aliases for /product:<name>')
    .option('--dry-run', 'report what init would do, without writing anything')
    .action(
      async (options: {
        ai?: string;
        force?: boolean;
        flat?: boolean;
        shorthand?: boolean;
        dryRun?: boolean;
      }) => {
        capture.code = await runInit(io, options);
      },
    );

  const integration = program
    .command('integration')
    .description('Manage generated AI provider integrations');
  integration
    .command('add')
    .description('Install a provider integration (claude, copilot, openspec)')
    .argument('<provider>', 'provider name')
    .option('--force', 'overwrite existing unmanaged or hand-edited files')
    .action(async (provider: string, options: { force?: boolean }) => {
      capture.code = await runIntegrationAdd(io, provider, options);
    });
  integration
    .command('update')
    .description('Regenerate all installed integrations (--check detects drift only)')
    .option('--check', 'detect drift without writing')
    .option('--force', 'regenerate even over hand-edited managed files')
    .action(async (options: { check?: boolean; force?: boolean }) => {
      capture.code = await runIntegrationUpdate(io, options);
    });

  program
    .command('doctor')
    .description('Check repository structure, configuration and managed files')
    .action(async () => {
      capture.code = await runDoctorCommand(io);
    });

  const change = program.command('change').description('Draft and validate product changes');
  change
    .command('validate')
    .description('Validate the working tree as a proposed change (full-tree validation)')
    .option('--format <format>', 'output format: text or json', 'text')
    .action(async (options: { format: 'text' | 'json' }) => {
      capture.code = await runChangeValidate(io, options);
    });
  change
    .command('list')
    .description('List change drafts under docs/product/changes/')
    .option('--format <format>', 'output format: text or json', 'text')
    .action(async (options: { format: 'text' | 'json' }) => {
      capture.code = await runChangeList(io, options);
    });

  program
    .command('graph')
    .description('Compile the product graph and write generated outputs')
    .option('--format <format>', 'output format: summary, json, mermaid or html', 'summary')
    .action(async (options: { format: 'summary' | 'json' | 'mermaid' | 'html' }) => {
      capture.code = await runGraph(io, options);
    });

  program
    .command('cite')
    .description('Emit a citation record for a product artifact')
    .requiredOption('--id <id>', 'target artifact ID')
    .option('--digest <digest>', 'content digest (sha256:<hex>); required unless --file is given')
    .option('--file <path>', 'compute the digest from this file')
    .option('--anchor <anchor>', 'verification scenario id within the target artifact')
    .option('--form <form>', 'citation form: inline, marker-block, or sidecar-ledger', 'inline')
    .action(
      async (options: {
        id: string;
        digest?: string;
        file?: string;
        anchor?: string;
        form: 'inline' | 'marker-block' | 'sidecar-ledger';
      }) => {
        capture.code = await runCite(io, options);
      },
    );

  const citations = program
    .command('citations')
    .description('Verify citations in consumer documents against the product model');
  citations
    .command('verify')
    .description('Scan consumer documents and report citation statuses')
    .argument('[target]', 'consumer documents root (default: openspec)')
    .option('--format <format>', 'output format: text or json', 'text')
    .action(async (target: string | undefined, options: { format: 'text' | 'json' }) => {
      capture.code = await runCitationsVerify(io, target, options);
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
    .command('fix')
    .description('Apply a mechanical, idempotent repair to the product model')
    .option('--filenames', 'rename artifact files to match their ID casing (resolves PRODUCT101)')
    .option('--dry-run', 'report what would change; exits 1 when anything would')
    .option('--format <format>', 'output format: text or json', 'text')
    .action(async (options: { filenames?: boolean; dryRun?: boolean; format: 'text' | 'json' }) => {
      capture.code = await runFix(io, options);
    });

  program
    .command('schema')
    .description('Print the allowed frontmatter for a document kind')
    .argument('[kind]', 'document kind or ID prefix; omit to list every kind')
    .option('--format <format>', 'output format: text or json', 'text')
    .action(async (kind: string | undefined, options: { format: 'text' | 'json' }) => {
      capture.code = await runSchema(io, kind, options);
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
