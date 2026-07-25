import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { loadBundledAssets } from './assets.js';
import { installProvider } from './install.js';

export interface InitOptions {
  root: string;
  ai: string[];
  sdd?: string;
  force?: boolean;
}

export interface InitResult {
  created: string[];
  skipped: string[];
  nextSteps: string[];
}

const modelDirs = [
  'docs/product/model/actors',
  'docs/product/model/journeys',
  'docs/product/model/use-cases',
  'docs/product/model/business-rules',
  'docs/product/model/domain/terms',
  'docs/product/model/domain/bounded-contexts',
  'docs/product/model/requirements/functional',
  'docs/product/model/requirements/quality',
  'docs/product/model/requirements/constraints',
  'docs/product/changes/active',
  'docs/product/changes/completed',
  'docs/product/changes/rejected',
];

function configContent(ai: string[], sdd?: string): string {
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

Validate with \`product-definition validate\`. Authoring templates are under
\`.product/templates/\`.
`;

/**
 * Initialize a repository. Never overwrites an existing user file unless force is set;
 * existing files are reported as skipped.
 */
export async function initRepository(options: InitOptions): Promise<InitResult> {
  const { root, ai, sdd, force } = options;
  const created: string[] = [];
  const skipped: string[] = [];

  const writeIfAbsent = async (relPath: string, content: string) => {
    const target = join(root, ...relPath.split('/'));
    let exists = true;
    try {
      await access(target);
    } catch {
      exists = false;
    }
    if (exists && !force) {
      skipped.push(relPath);
      return;
    }
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, 'utf8');
    created.push(relPath);
  };

  for (const dir of modelDirs) {
    await mkdir(join(root, ...dir.split('/')), { recursive: true });
  }

  await writeIfAbsent('.product/config.yaml', configContent(ai, sdd));
  await writeIfAbsent('docs/product/README.md', productReadme);

  const assets = await loadBundledAssets();
  for (const template of assets.templates) {
    await writeIfAbsent(`.product/templates/${template.name}`, template.content);
  }

  for (const provider of ai) {
    const result = await installProvider(root, provider, assets);
    created.push(...result.written);
  }

  const nextSteps = [
    'Author your initial product model under docs/product/model (templates: .product/templates/).',
    'Validate with: product-definition validate',
    'After the baseline is accepted, evolve it through Product Changes: /product:change or the analyze-product-change skill.',
    ...(sdd === 'openspec'
      ? ['Hand increments to OpenSpec with: product-definition handoff create --adapter openspec']
      : []),
  ];

  return { created, skipped, nextSteps };
}
