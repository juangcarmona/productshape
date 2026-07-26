import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { loadBundledAssets, type CanonicalAssets } from './assets.js';
import { applyProviderPlan, planProvider, InstallConflictError } from './install.js';
import { lockPath, lockRelativePath } from './lock.js';

export interface InitOptions {
  root: string;
  ai: string[];
  sdd?: string;
  force?: boolean;
  /** Scaffold the model directory without the per-kind subdirectories. */
  flat?: boolean;
  /** Generate `/ps:<name>` shorthand aliases. Persisted into the generated configuration. */
  shorthand?: boolean;
  /**
   * The shorthand setting already recorded in `.product/config.yaml`, supplied by the caller
   * (configuration is parsed by core, which this package must not depend on). Takes precedence
   * over `shorthand` when a configuration file exists and force is not set.
   */
  existingShorthand?: boolean;
}

export interface InitResult {
  created: string[];
  skipped: string[];
  removed: string[];
  nextSteps: string[];
}

/**
 * The recommended model layout: one directory per artifact kind. A recommendation, not a rule —
 * artifact discovery walks the model directory recursively and keys on frontmatter `type`, so any
 * layout validates. `init` scaffolds this one so adopters do not each invent a taxonomy.
 *
 * Kept in step with core's modelSubdirByType by tests/conformance/layout.test.ts.
 */
export const modelScaffoldDirs = [
  'docs/product/model/actors',
  'docs/product/model/journeys',
  'docs/product/model/use-cases',
  'docs/product/model/business-rules',
  'docs/product/model/domain/terms',
  'docs/product/model/domain/bounded-contexts',
  'docs/product/model/requirements/functional',
  'docs/product/model/requirements/quality',
  'docs/product/model/requirements/constraints',
];

/**
 * Change lifecycle states. Unlike the model subdirectories these are not taxonomy: they are read
 * by change discovery and written by promotion, so `--flat` does not collapse them.
 */
export const changeScaffoldDirs = [
  'docs/product/changes/active',
  'docs/product/changes/completed',
  'docs/product/changes/rejected',
];

export type InitActionKind = 'create' | 'preserve' | 'overwrite' | 'regenerate' | 'conflict';

export interface InitAction {
  /** Repository-relative path, POSIX separators. */
  path: string;
  kind: InitActionKind;
  source: 'scaffold' | 'config' | 'readme' | 'template' | 'lock' | `provider:${string}`;
  /** The bytes to write. Absent for preserve, conflict, and the lock (written by the installer). */
  content?: string;
  reason?: string;
}

export interface InitPlan {
  root: string;
  actions: InitAction[];
  /** Targets that block the install; a plan with conflicts must not be applied. */
  conflicts: InitAction[];
  /** The shorthand setting actually used, after existing configuration took precedence. */
  shorthand: boolean;
  nextSteps: string[];
}

export function configContent(ai: string[], sdd?: string, shorthand = false): string {
  return [
    'schema: product-definition-as-code/config/v1alpha1',
    'product:',
    '  root: docs/product',
    '  model: docs/product/model',
    '  changes: docs/product/changes',
    'generated:',
    '  root: .product/generated',
    '  commit: false',
    'integrations:',
    ai.length > 0 ? `  ai:\n${ai.map((p) => `    - ${p}`).join('\n')}` : '  ai: []',
    ...(sdd ? ['  sdd:', `    provider: ${sdd}`] : []),
    `  shorthand-commands: ${shorthand}`,
    'validation:',
    '  warnings-as-errors: false',
    '  require-journey-for-use-case: false',
    '  require-requirement-reachability: true',
    '',
  ].join('\n');
}

const productReadme = `# Product definition

This directory is the canonical product definition of this repository, managed with
Product Definition as Code.

- \`model/\` holds the current product model (the baseline). The initial baseline may be
  authored directly (the initial-baseline bootstrap exception); after it is accepted, every
  semantic evolution goes through a Product Change under \`changes/\` and reaches the baseline
  only by explicit promotion.
- \`changes/active|completed|rejected/\` hold Product Changes.

Validate with \`prodshape validate\`. Authoring templates are under
\`.product/templates/\`. The allowed frontmatter of every artifact kind is printed by
\`prodshape schema <kind>\`.
`;

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Decide what `init` would do, without touching the filesystem.
 *
 * The plan carries the content it would write, so applying it is a straight write of exactly what
 * was reported. That is what makes `--dry-run` trustworthy: there is no second code path that
 * could compute something different.
 */
export async function planInit(options: InitOptions): Promise<InitPlan> {
  const { root, ai, sdd, force = false, flat = false } = options;
  const actions: InitAction[] = [];

  // Existing configuration wins over the flag unless --force. Otherwise `init --shorthand` in an
  // already-configured repository would render aliases the preserved config.yaml does not declare,
  // and the next `integration update` would silently delete them again.
  const configExists = await exists(join(root, '.product', 'config.yaml'));
  const shorthand =
    configExists && !force ? (options.existingShorthand ?? false) : (options.shorthand ?? false);

  const add = async (
    path: string,
    source: InitAction['source'],
    content: string,
    { preserveAlways = false } = {},
  ) => {
    if (!(await exists(join(root, ...path.split('/'))))) {
      actions.push({ path, kind: 'create', source, content });
    } else if (preserveAlways || !force) {
      actions.push({ path, kind: 'preserve', source });
    } else {
      actions.push({ path, kind: 'overwrite', source, content });
    }
  };

  // .gitkeep makes the scaffolded structure survive a commit: git does not track empty
  // directories, so without it the layout `init` recommends disappears on the first clone.
  // Discovery ignores dotfiles and change discovery only considers directories, so the markers
  // are invisible to the tooling.
  // --flat still scaffolds the model directory itself: without it there is nothing for
  // `validate` to walk and `doctor` reports missing structure.
  const scaffoldDirs = [
    ...(flat ? ['docs/product/model'] : modelScaffoldDirs),
    ...changeScaffoldDirs,
  ];
  for (const dir of scaffoldDirs) {
    // An existing marker is never rewritten, even with --force: it is an empty marker, so
    // reporting an overwrite would describe a change that does not happen.
    await add(`${dir}/.gitkeep`, 'scaffold', '', { preserveAlways: true });
  }

  await add('.product/config.yaml', 'config', configContent(ai, sdd, shorthand));
  await add('docs/product/README.md', 'readme', productReadme);

  const assets: CanonicalAssets = await loadBundledAssets();
  for (const template of assets.templates) {
    await add(`.product/templates/${template.name}`, 'template', template.content);
  }

  for (const provider of ai) {
    const plan = await planProvider(root, provider, {
      assets,
      force,
      render: { shorthandCommands: shorthand },
    });
    const source = `provider:${provider}` as const;
    const contentByPath = new Map(plan.files.map((f) => [f.path, f.content]));
    for (const path of plan.created) {
      actions.push({ path, kind: 'create', source, content: contentByPath.get(path) });
    }
    for (const path of plan.regenerated) {
      actions.push({ path, kind: 'regenerate', source, content: contentByPath.get(path) });
    }
    for (const path of plan.overwritten) {
      actions.push({ path, kind: 'overwrite', source, content: contentByPath.get(path) });
    }
    for (const path of plan.conflicts) {
      actions.push({
        path,
        kind: 'conflict',
        source,
        reason: 'exists and is not managed by the installation lock (or was modified by hand)',
      });
    }
  }

  if (ai.length > 0) {
    // Reported for an honest picture, but deliberately carries no content: the digests are merged
    // across providers by the installer, which owns this file.
    actions.push({
      path: lockRelativePath,
      kind: (await exists(lockPath(root))) ? 'regenerate' : 'create',
      source: 'lock',
    });
  }

  const modelHint = flat
    ? 'docs/product/model'
    : 'docs/product/model (one directory per artifact kind)';
  const nextSteps = [
    `Author your initial product model under ${modelHint} (templates: .product/templates/).`,
    'Discover the allowed frontmatter for a kind with: prodshape schema <kind>',
    'Validate with: prodshape validate',
    'Ignore regenerable outputs: add .product/generated/ and .product/cache/ to your .gitignore.',
    'After the baseline is accepted, evolve it through Product Changes: /product:change or the analyze-product-change skill.',
    ...(sdd === 'openspec'
      ? ['Hand increments to OpenSpec with: prodshape handoff create --adapter openspec']
      : []),
  ];

  return {
    root,
    actions,
    conflicts: actions.filter((a) => a.kind === 'conflict'),
    shorthand,
    nextSteps,
  };
}

/** Write a plan. Refuses outright when the plan carries conflicts. */
export async function applyInitPlan(plan: InitPlan): Promise<InitResult> {
  const byProvider = new Map<string, InitAction[]>();
  for (const action of plan.actions) {
    if (action.source.startsWith('provider:')) {
      const provider = action.source.slice('provider:'.length);
      byProvider.set(provider, [...(byProvider.get(provider) ?? []), action]);
    }
  }
  for (const [provider, actions] of byProvider) {
    const conflicts = actions.filter((a) => a.kind === 'conflict').map((a) => a.path);
    if (conflicts.length > 0) throw new InstallConflictError(provider, conflicts);
  }

  const created: string[] = [];
  const skipped: string[] = [];
  for (const action of plan.actions) {
    if (action.kind === 'preserve') {
      skipped.push(action.path);
      continue;
    }
    // Provider files and the lock belong to the installer, which writes them together with the
    // digests that describe them.
    if (action.source === 'lock' || action.source.startsWith('provider:')) continue;
    if (action.content === undefined) continue;
    const target = join(plan.root, ...action.path.split('/'));
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, action.content, 'utf8');
    created.push(action.path);
  }

  const version = (await loadBundledAssets()).version;
  const removed: string[] = [];
  for (const [provider, actions] of byProvider) {
    // force: true — the plan already classified every target, and re-preflighting here would
    // read the same files a second time to reach the same verdict.
    const result = await applyProviderPlan(plan.root, {
      provider,
      version,
      files: actions
        .filter((a) => a.content !== undefined)
        .map((a) => ({ path: a.path, content: a.content as string })),
      created: [],
      regenerated: [],
      overwritten: [],
      conflicts: [],
      orphans: [],
      force: true,
    });
    created.push(...result.written);
    removed.push(...result.removed);
  }
  // Counted so the applied result matches the dry-run report exactly; the installer wrote it.
  if (byProvider.size > 0) created.push(lockRelativePath);

  return { created, skipped, removed, nextSteps: plan.nextSteps };
}

/**
 * Initialize a repository. Never overwrites an existing user file unless force is set;
 * existing files are reported as skipped.
 */
export async function initRepository(options: InitOptions): Promise<InitResult> {
  return applyInitPlan(await planInit(options));
}
