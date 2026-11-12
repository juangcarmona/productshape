/**
 * Keep installed authoring templates current across upgrades.
 *
 * `prodshape init --full` copies the bundled templates to `.product/templates/`, and those copies
 * are not managed files: they carry no header and the installation lock does not record them,
 * because adopters are invited to adapt them. Without this module an upgrade never reaches them,
 * so a repository keeps authoring from whatever templates it was initialised with.
 *
 * The rule is drift-safe: a copy is refreshed only when it is byte-for-byte (after line-ending
 * normalisation) a template some earlier release shipped, which proves nobody edited it. Any
 * other content is the adopter's and is kept unless `force` is passed. Templates that are not
 * installed stay uninstalled: installing them is `init`'s decision, not an upgrade's.
 */
import { loadBundledAssets } from './assets.js';
import { fileDigest } from './lock.js';
import { readManaged, writeManaged } from './mutation.js';
import { shippedTemplateDigests } from './template-history.js';

export const templatesDir = '.product/templates';

export interface TemplateRefreshPlan {
  /** Installed copies of an earlier shipped version: refreshed. */
  outdated: string[];
  /** Installed copies that match no shipped version: kept unless forced. */
  customized: string[];
  /** Installed copies that already match the bundled version. */
  current: string[];
}

export interface TemplateRefreshResult extends TemplateRefreshPlan {
  /** Repository-relative paths written. Empty on a dry run. */
  written: string[];
}

/** Classify every installed template against the bundled one and the shipped history. Pure read. */
export async function planTemplateRefresh(root: string): Promise<TemplateRefreshPlan> {
  const plan: TemplateRefreshPlan = { outdated: [], customized: [], current: [] };
  const assets = await loadBundledAssets();
  for (const template of assets.templates) {
    const path = `${templatesDir}/${template.name}`;
    const installed = await readManaged(root, path, 'bundled template');
    if (installed === undefined) continue;
    const digest = fileDigest(installed);
    if (digest === fileDigest(template.content)) plan.current.push(path);
    else if (shippedTemplateDigests[template.name]?.includes(digest)) plan.outdated.push(path);
    else plan.customized.push(path);
  }
  return plan;
}

/** Refresh outdated templates (and customized ones too, with `force`). */
export async function refreshTemplates(
  root: string,
  options: { force?: boolean; dryRun?: boolean } = {},
): Promise<TemplateRefreshResult> {
  const plan = await planTemplateRefresh(root);
  const targets = options.force ? [...plan.outdated, ...plan.customized] : plan.outdated;
  const written: string[] = [];
  if (!options.dryRun && targets.length > 0) {
    const byPath = new Map(
      (await loadBundledAssets()).templates.map((t) => [`${templatesDir}/${t.name}`, t.content]),
    );
    for (const path of targets.sort()) {
      await writeManaged(root, path, byPath.get(path) as string, 'bundled template');
      written.push(path);
    }
  }
  return { ...plan, written };
}
