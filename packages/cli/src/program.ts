import { Command, CommanderError } from 'commander';
import { runGraph } from './commands/graph.js';
import { runImpact } from './commands/impact.js';
import { runInspect } from './commands/inspect.js';
import { runValidate } from './commands/validate.js';
import { CliError, exitCodes, type CliIo } from './context.js';

export function buildProgram(io: CliIo, capture: { code: number }): Command {
  const program = new Command('product-definition');
  program
    .description('Product Definition as Code - deterministic product-definition tooling')
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
