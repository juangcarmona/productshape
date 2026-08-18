import { Command, CommanderError } from 'commander';
import { createRequire } from 'node:module';
import {
  runChangeApply,
  runChangeArchive,
  runChangeList,
  runChangeValidate,
} from './commands/change.js';
import { runCite } from './commands/cite.js';
import { runCitationsVerify } from './commands/citations.js';
import { runDoctorCommand } from './commands/doctor.js';
import { runFix } from './commands/fix.js';
import { runGraph } from './commands/graph.js';
import { runInit } from './commands/init.js';
import {
  runIntegrationAdd,
  runIntegrationCheck,
  runIntegrationRemove,
  runIntegrationUpdate,
} from './commands/integration.js';
import { runImpact } from './commands/impact.js';
import { runInspect } from './commands/inspect.js';
import {
  runRecoverCheck,
  runRecoverEvidenceAdd,
  runRecoverEvidenceList,
  runRecoverEvidenceSnapshot,
  runRecoverFamily,
  runRecoverLeadAdd,
  runRecoverLeadList,
  runRecoverLeadResolve,
  runRecoverMark,
  runRecoverNext,
  runRecoverQuestionAdd,
  runRecoverQuestionAnswer,
  runRecoverQuestionDefer,
  runRecoverQuestionList,
  runRecoverReport,
  runRecoverStart,
  runRecoverStatus,
  type RecoverEvidenceAddOptions,
  type RecoverFamilyOptions,
  type RecoverFormatOptions,
  type RecoverMarkOptions,
  type RecoverNextOptions,
  type RecoverStartOptions,
} from './commands/recover.js';
import { runSchema } from './commands/schema.js';
import { runValidate } from './commands/validate.js';
import { CliError, exitCodes, type CliIo } from './context.js';

const cliPackage = createRequire(import.meta.url)('../package.json') as { version: string };

export function buildProgram(io: CliIo, capture: { code: number }): Command {
  const program = new Command('prodshape');
  program
    .description('ProductShape - the reference implementation of Product Definition as Code')
    .version(cliPackage.version)
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
    .option('--ai <providers>', 'comma-separated AI integrations: claude, copilot, codex')
    .option('--sdd <framework>', 'SDD framework: openspec, kiro, speckit, or none to skip')
    .option('--force', 'overwrite existing files')
    .option('--flat', 'scaffold the model directory without per-kind subdirectories')
    .option('--shorthand', 'also generate the /ps:<name> aliases for /product:<name>')
    .option('--dry-run', 'report what init would do, without writing anything')
    .action(
      async (options: {
        ai?: string;
        sdd?: string;
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
    .description('Install a provider integration (claude, copilot, codex, openspec)')
    .argument('<provider>', 'provider name')
    .option('--force', 'overwrite existing unmanaged or hand-edited files')
    .option('--dry-run', 'report what would change without writing anything')
    .action(async (provider: string, options: { force?: boolean; dryRun?: boolean }) => {
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
  integration
    .command('check')
    .description('Check the health of installed integrations')
    .action(async () => {
      capture.code = await runIntegrationCheck(io);
    });
  integration
    .command('remove')
    .description('Remove a provider integration and its managed files')
    .argument('<provider>', 'provider name')
    .option('--dry-run', 'report what would be removed without deleting anything')
    .action(async (provider: string, options: { dryRun?: boolean }) => {
      capture.code = await runIntegrationRemove(io, provider, options);
    });

  program
    .command('doctor')
    .description('Check repository structure, configuration and managed files')
    .action(async () => {
      capture.code = await runDoctorCommand(io);
    });

  const change = program
    .command('change')
    .description('Elaborate, validate and apply Product Changes');
  change
    .command('validate')
    .description('Validate live Product Changes as overlays on the baseline')
    .argument('[id]', 'change ID (e.g. CHG-ADD-CITE-001); omit to validate every live change')
    .option('--format <format>', 'output format: text or json', 'text')
    .action(async (id: string | undefined, options: { format: 'text' | 'json' }) => {
      capture.code = await runChangeValidate(io, id, options);
    });
  change
    .command('list')
    .description('List live Product Changes')
    .option('--all', 'include the completed and rejected change history')
    .option('--format <format>', 'output format: text or json', 'text')
    .action(async (options: { all?: boolean; format: 'text' | 'json' }) => {
      capture.code = await runChangeList(io, options);
    });
  change
    .command('apply')
    .description('Apply an approved Product Change to the model (never commits, never merges)')
    .argument('<id>', 'change ID (e.g. CHG-ADD-CITE-001)')
    .option('--dry-run', 'print the plan and the product diff without writing anything')
    .option('--format <format>', 'output format: text or json', 'text')
    .action(async (id: string, options: { dryRun?: boolean; format: 'text' | 'json' }) => {
      capture.code = await runChangeApply(io, id, options);
    });
  change
    .command('archive')
    .description('File a rejected or superseded change into the change history')
    .argument('<id>', 'change ID (e.g. CHG-ADD-CITE-001)')
    .option('--format <format>', 'output format: text or json', 'text')
    .action(async (id: string, options: { format: 'text' | 'json' }) => {
      capture.code = await runChangeArchive(io, id, options);
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
    .option('--provider <provider>', 'provider-aware verification (openspec)')
    .option('--change <name>', 'limit to one OpenSpec change (with --provider openspec)')
    .option('--include-archived', 'include archived OpenSpec changes (with --provider openspec)')
    .action(
      async (
        target: string | undefined,
        options: {
          format: 'text' | 'json';
          provider?: string;
          change?: string;
          includeArchived?: boolean;
        },
      ) => {
        capture.code = await runCitationsVerify(io, target, options);
      },
    );

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

  const recover = program
    .command('recover')
    .description(
      'Manage deterministic brownfield recovery sessions (semantic extraction stays with the recover-product skill)',
    );
  const sessionOption = [
    '--session <id>',
    'recovery session id (defaults to the only session)',
  ] as const;
  const formatOption = ['--format <format>', 'output format: text or json', 'text'] as const;
  recover
    .command('start')
    .description('Start a recovery session: inventory the authorised evidence and checkpoint it')
    .option('--brief <file>', 'recovery brief (YAML) declaring scope, sources and boundaries')
    .option('--session <id>', 'session id (defaults to session-001, session-002, ...)')
    .option(...formatOption)
    .action(async (options: RecoverStartOptions) => {
      capture.code = await runRecoverStart(io, options);
    });
  recover
    .command('status')
    .description('Coverage, open work and completion criteria of a session')
    .option(...sessionOption)
    .option(...formatOption)
    .action(async (options: RecoverFormatOptions) => {
      capture.code = await runRecoverStatus(io, options);
    });
  recover
    .command('next')
    .description('The next bounded batch of pending evidence to process')
    .option(...sessionOption)
    .option('--limit <n>', 'batch size (defaults to the brief batch-size)')
    .option(...formatOption)
    .action(async (options: RecoverNextOptions) => {
      capture.code = await runRecoverNext(io, options);
    });
  recover
    .command('mark')
    .description('Record how a source (or one of its sections) was classified')
    .requiredOption('--source <id-or-path>', 'evidence id, path, url or title')
    .option(
      '--as <classification>',
      'represented, duplicate, contradiction, question, out-of-scope or no-product-intent',
    )
    .option('--artifacts <ids>', 'comma-separated candidate artifact IDs (represented, duplicate)')
    .option('--question <id>', 'linked question id (question, contradiction)')
    .option('--reason <text>', 'required for out-of-scope, no-product-intent and --exclude')
    .option('--note <text>', 'free-form note; required for contradiction')
    .option('--complete', 'declare the source fully classified (requires at least one finding)')
    .option('--exclude', 'take the source out of scope entirely (requires --reason)')
    .option(
      '--accept-changed',
      'refresh the digest of a changed source and drop invalidated findings',
    )
    .option(...sessionOption)
    .option(...formatOption)
    .action(async (options: RecoverMarkOptions) => {
      capture.code = await runRecoverMark(io, options);
    });
  const evidence = recover
    .command('evidence')
    .description('Manage external and user-provided evidence');
  evidence
    .command('add')
    .description('Register an external or user-provided source (externals need --authorized)')
    .option('--url <url>', 'online resource the user explicitly authorised')
    .option('--file <path>', 'file outside the inventoried roots')
    .option('--text <text>', 'inline user-relayed knowledge, stored in the session directory')
    .option('--title <title>', 'human-readable name for the source')
    .option('--authorized', 'record that the user explicitly authorised this external source')
    .option(...sessionOption)
    .option(...formatOption)
    .action(async (options: RecoverEvidenceAddOptions) => {
      capture.code = await runRecoverEvidenceAdd(io, options);
    });
  evidence
    .command('snapshot')
    .description('Freeze fetched external content into the session so its hash is checkable')
    .argument('<evidence-id>', 'evidence id (E-0001, ...)')
    .option('--file <path>', 'file holding the fetched content')
    .option(...sessionOption)
    .option(...formatOption)
    .action(async (evidenceId: string, options: { file?: string } & RecoverFormatOptions) => {
      capture.code = await runRecoverEvidenceSnapshot(io, evidenceId, options);
    });
  evidence
    .command('list')
    .description('List the full evidence inventory')
    .option(...sessionOption)
    .option(...formatOption)
    .action(async (options: RecoverFormatOptions) => {
      capture.code = await runRecoverEvidenceList(io, options);
    });
  const lead = recover.command('lead').description('Track search leads until each is resolved');
  lead
    .command('add')
    .description('Record a lead discovered while processing evidence')
    .option('--description <text>', 'what to look for and why')
    .option('--source <id>', 'evidence id or origin of the lead')
    .option('--kind <kind>', 'repo, external or user', 'repo')
    .option(...sessionOption)
    .option(...formatOption)
    .action(
      async (
        options: { description?: string; source?: string; kind?: string } & RecoverFormatOptions,
      ) => {
        capture.code = await runRecoverLeadAdd(io, options);
      },
    );
  lead
    .command('resolve')
    .description('Resolve a lead with what it turned up')
    .argument('<lead-id>', 'lead id (L-0001, ...)')
    .option('--resolution <text>', 'what following the lead produced')
    .option(...sessionOption)
    .option(...formatOption)
    .action(async (leadId: string, options: { resolution?: string } & RecoverFormatOptions) => {
      capture.code = await runRecoverLeadResolve(io, leadId, options);
    });
  lead
    .command('list')
    .description('List leads')
    .option(...sessionOption)
    .option(...formatOption)
    .action(async (options: RecoverFormatOptions) => {
      capture.code = await runRecoverLeadList(io, options);
    });
  const question = recover
    .command('question')
    .description('Track questions for the user and their answers');
  question
    .command('add')
    .description('Record a question only the user can settle')
    .option('--text <text>', 'the question')
    .option('--context <text>', 'evidence summary behind the question')
    .option(
      '--option <option>',
      'a possible answer (repeatable)',
      (value: string, all: string[]) => [...all, value],
      [] as string[],
    )
    .option('--recommendation <text>', 'recommended interpretation, when the evidence supports one')
    .option(...sessionOption)
    .option(...formatOption)
    .action(
      async (
        options: {
          text?: string;
          context?: string;
          option?: string[];
          recommendation?: string;
        } & RecoverFormatOptions,
      ) => {
        capture.code = await runRecoverQuestionAdd(io, options);
      },
    );
  question
    .command('answer')
    .description('Record the user answer to a question')
    .argument('<question-id>', 'question id (Q-0001, ...)')
    .option('--answer <text>', 'the user answer, verbatim where possible')
    .option(...sessionOption)
    .option(...formatOption)
    .action(async (questionId: string, options: { answer?: string } & RecoverFormatOptions) => {
      capture.code = await runRecoverQuestionAnswer(io, questionId, options);
    });
  question
    .command('defer')
    .description('Defer a question explicitly instead of leaving it open')
    .argument('<question-id>', 'question id (Q-0001, ...)')
    .option('--reason <text>', 'why the question can wait, and for whom')
    .option(...sessionOption)
    .option(...formatOption)
    .action(async (questionId: string, options: { reason?: string } & RecoverFormatOptions) => {
      capture.code = await runRecoverQuestionDefer(io, questionId, options);
    });
  question
    .command('list')
    .description('List questions')
    .option(...sessionOption)
    .option(...formatOption)
    .action(async (options: RecoverFormatOptions) => {
      capture.code = await runRecoverQuestionList(io, options);
    });
  recover
    .command('family')
    .description('Record that an artifact family was probed and yielded no candidates')
    .argument(
      '<family>',
      'actor, journey, use-case, business-rule, domain-term, bounded-context, functional-requirement, quality-requirement or constraint',
    )
    .option('--none-found', 'the probe found no candidates of this family')
    .option('--note <text>', 'what was searched to conclude that')
    .option(...sessionOption)
    .option(...formatOption)
    .action(async (family: string, options: RecoverFamilyOptions) => {
      capture.code = await runRecoverFamily(io, family, options);
    });
  recover
    .command('check')
    .description(
      'Re-hash evidence, detect drift, verify CHG-INITIAL-only output and revalidate the overlay',
    )
    .option(...sessionOption)
    .option(...formatOption)
    .action(async (options: RecoverFormatOptions) => {
      capture.code = await runRecoverCheck(io, options);
    });
  recover
    .command('report')
    .description('Write the final recovery report into the session directory')
    .option(...sessionOption)
    .option(...formatOption)
    .action(async (options: RecoverFormatOptions) => {
      capture.code = await runRecoverReport(io, options);
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
