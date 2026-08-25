import { loadBundledAssets } from '@prodshape/distribution';
import { CliError, exitCodes, type CliIo } from '../context.js';

/**
 * `prodshape template [kind]` — print one bundled authoring template to stdout, or list the
 * available kinds.
 *
 * The kernel init installs no template library: templates and schemas stay discoverable on
 * demand, so authoring the first artifact costs one redirect (`prodshape template actor >
 * docs/product/changes/active/chg-initial/proposed/act-user.md`) instead of a copied file tree.
 * `prodshape init --full` still installs the whole library under `.product/templates/`.
 */
export async function runTemplate(io: CliIo, kind?: string): Promise<number> {
  const assets = await loadBundledAssets();
  const byKind = new Map(
    assets.templates.map((template) => [template.name.replace(/\.md$/, ''), template.content]),
  );
  const kinds = [...byKind.keys()].sort();

  if (kind === undefined) {
    io.out('Authoring templates (print one with: prodshape template <kind>):');
    for (const name of kinds) io.out(`  ${name}`);
    return exitCodes.success;
  }

  const content = byKind.get(kind);
  if (content === undefined) {
    throw new CliError(
      `Unknown template kind '${kind}' (supported: ${kinds.join(', ')})`,
      exitCodes.invalidInvocation,
    );
  }
  io.out(content.trimEnd());
  return exitCodes.success;
}
