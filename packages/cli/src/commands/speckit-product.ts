import { readFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import {
  archiveSpecKitProductChange,
  applySpecKitProductChange,
  createSpecKitProductChange,
  completeSpecKitRecoveryRound,
  nextSpecKitRecoveryBatch,
  recordSpecKitRecoveryBatch,
  refineSpecKitProductChange,
  startOrResumeSpecKitRecovery,
  validateSpecKitProductChange,
  writeSpecKitRecoveryCandidate,
} from '@prodshape/integration-speckit';
import {
  stableJson,
  type BaselineValidation,
  type Diagnostic,
  type HostedProductApplyResult,
} from '@prodshape/core';
import { exitCodes, formatAffectedCitations, resolveRepository, type CliIo } from '../context.js';

async function readJson(cwd: string, file: string) {
  return JSON.parse(await readFile(isAbsolute(file) ? file : join(cwd, file), 'utf8'));
}

function formatDiagnostic(diagnostic: Diagnostic): string {
  return `${diagnostic.severity} ${diagnostic.code}: ${diagnostic.message}`;
}

function summarizeModel(model: BaselineValidation): string {
  const count = (severity: Diagnostic['severity']) =>
    model.diagnostics.filter((diagnostic) => diagnostic.severity === severity).length;
  return `resulting model: ${count('error')} error(s), ${count('warning')} warning(s) across ${model.artifacts.length} artifact(s)`;
}

function formatApplyResult(result: HostedProductApplyResult, name: string): string {
  const lines = [`${result.outcome}: ${result.change.id ?? name}`];
  if (result.outcome === 'refused') lines.push(...result.plan.diagnostics.map(formatDiagnostic));
  if (result.affectedCitations) lines.push(...formatAffectedCitations(result.affectedCitations));
  if (result.resultingModel) lines.push(summarizeModel(result.resultingModel));
  return lines.join('\n');
}

export async function runSpecKitProduct(
  io: CliIo,
  action: string,
  name: string | undefined,
  options: {
    dryRun?: boolean;
    initial?: boolean;
    session?: string;
    limit?: string;
    format?: string;
    input?: string;
    note?: string;
    path?: string;
    file?: string;
  } = {},
): Promise<number> {
  const repo = await resolveRepository(io);
  const json = options.format === 'json';
  if (action === 'create') {
    if (!name) throw new Error('A Product Change name is required.');
    const result = await createSpecKitProductChange(repo.root, name, { initial: options.initial });
    io.out(json ? stableJson(result) : `Created ${result.file}`);
    return exitCodes.success;
  }
  if (action === 'validate') {
    if (!name) throw new Error('A Product Change name is required.');
    const result = await validateSpecKitProductChange(repo.root, name);
    io.out(
      json
        ? stableJson(result)
        : result.diagnostics.map((d) => `${d.severity} ${d.code}: ${d.message}`).join('\n') ||
            'Product Change is valid.',
    );
    return result.blocking.length > 0 ? exitCodes.validationErrors : exitCodes.success;
  }
  if (action === 'refine') {
    if (!name) throw new Error('A Product Change name is required.');
    const refinement = options.input ? await readJson(io.cwd, options.input) : {};
    if (options.note) refinement.workingMemory = options.note;
    const result = await refineSpecKitProductChange(repo.root, name, refinement);
    io.out(
      json
        ? stableJson(result)
        : [`Refined ${name}`, ...result.written.map((file) => `  ${file}`)].join('\n'),
    );
    return exitCodes.success;
  }
  if (action === 'apply') {
    if (!name) throw new Error('A Product Change name is required.');
    const result = await applySpecKitProductChange(repo.root, name, { dryRun: options.dryRun });
    io.out(json ? stableJson(result) : formatApplyResult(result, name));
    return result.outcome === 'refused' ? exitCodes.validationErrors : exitCodes.success;
  }
  if (action === 'archive') {
    if (!name) throw new Error('A Product Change name is required.');
    const archived = await archiveSpecKitProductChange(repo.root, name);
    io.out(json ? stableJson({ archived }) : `Archived ${archived}`);
    return exitCodes.success;
  }
  if (action === 'recover-start') {
    if (!options.session) throw new Error('A recovery session is required with --session.');
    const session = await startOrResumeSpecKitRecovery(repo.root, options.session);
    io.out(json ? stableJson({ session: session.state }) : `Started ${session.relDir}`);
    return exitCodes.success;
  }
  if (action === 'recover-next') {
    const result = await nextSpecKitRecoveryBatch(
      repo.root,
      options.session,
      options.limit ? Number(options.limit) : undefined,
    );
    io.out(
      json
        ? stableJson({ session: result.session.state, batch: result.batch })
        : result.batch
            .map((item) => `${item.id}\t${item.path ?? item.title ?? item.kind}`)
            .join('\n'),
    );
    return exitCodes.success;
  }
  if (action === 'recover-record') {
    if (!options.session) throw new Error('A recovery session is required with --session.');
    if (!options.input) throw new Error('A JSON recovery batch is required with --input.');
    const input = await readJson(io.cwd, options.input);
    const session = await recordSpecKitRecoveryBatch(repo.root, options.session, input);
    io.out(
      json
        ? stableJson({ session: session.state })
        : `Recorded recovery batch in ${session.relDir}`,
    );
    return exitCodes.success;
  }
  if (action === 'recover-candidate') {
    if (!options.session) throw new Error('A recovery session is required with --session.');
    if (!options.path || !options.file)
      throw new Error('A candidate --path and source --file are required.');
    const sourcePath = isAbsolute(options.file) ? options.file : join(io.cwd, options.file);
    const content = await readFile(sourcePath, 'utf8');
    const path = await writeSpecKitRecoveryCandidate(
      repo.root,
      options.session,
      options.path,
      content,
    );
    io.out(json ? stableJson({ path }) : `Recorded candidate ${path}`);
    return exitCodes.success;
  }
  if (action === 'recover-round') {
    if (!options.session) throw new Error('A recovery session is required with --session.');
    const result = await completeSpecKitRecoveryRound(
      repo.root,
      options.session,
      options.limit ? Number(options.limit) : undefined,
    );
    io.out(
      json
        ? stableJson(result)
        : `${result.recommendation}\n${result.issues.map((item) => `${item.severity} ${item.code}: ${item.message}`).join('\n')}`.trim(),
    );
    return result.issues.some((item) => item.severity === 'error')
      ? exitCodes.validationErrors
      : exitCodes.success;
  }
  throw new Error(`Unknown Spec Kit Product action '${action}'.`);
}
