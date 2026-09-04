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
import { stableJson } from '@prodshape/core';
import { exitCodes, resolveRepository, type CliIo } from '../context.js';

export async function runSpecKitProduct(
  io: CliIo,
  action: string,
  name: string | undefined,
  options: {
    dryRun?: boolean;
    session?: string;
    limit?: string;
    format?: string;
    input?: string;
    path?: string;
    file?: string;
  } = {},
): Promise<number> {
  const repo = await resolveRepository(io);
  const json = options.format === 'json';
  if (action === 'create') {
    if (!name) throw new Error('A Product Change name is required.');
    const result = await createSpecKitProductChange(repo.root, name);
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
    if (!options.input) throw new Error('A JSON refinement is required with --input.');
    const inputPath = isAbsolute(options.input) ? options.input : join(io.cwd, options.input);
    const refinement = JSON.parse(await readFile(inputPath, 'utf8'));
    const result = await refineSpecKitProductChange(repo.root, name, refinement);
    io.out(json ? stableJson(result) : `Refined ${result.change.file}`);
    return exitCodes.success;
  }
  if (action === 'apply') {
    if (!name) throw new Error('A Product Change name is required.');
    const result = await applySpecKitProductChange(repo.root, name, { dryRun: options.dryRun });
    io.out(json ? stableJson(result) : `${result.outcome}: ${result.change.id ?? name}`);
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
    const inputPath = isAbsolute(options.input) ? options.input : join(io.cwd, options.input);
    const input = JSON.parse(await readFile(inputPath, 'utf8'));
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
