import {
  archiveSpecKitProductChange,
  applySpecKitProductChange,
  createSpecKitProductChange,
  nextSpecKitRecoveryBatch,
  startSpecKitRecovery,
  validateSpecKitProductChange,
} from '@prodshape/integration-speckit';
import { stableJson } from '@prodshape/core';
import { exitCodes, resolveRepository, type CliIo } from '../context.js';

export async function runSpecKitProduct(
  io: CliIo,
  action: string,
  name: string | undefined,
  options: { dryRun?: boolean; session?: string; limit?: string; format?: string } = {},
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
    const session = await startSpecKitRecovery(repo.root, options.session);
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
  throw new Error(`Unknown Spec Kit Product action '${action}'.`);
}
