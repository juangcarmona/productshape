import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface CanonicalAsset {
  name: string;
  content: string;
}

export interface CanonicalSkill extends CanonicalAsset {
  references: CanonicalAsset[];
}

export interface CanonicalAssets {
  version: string;
  skills: CanonicalSkill[];
  commands: CanonicalAsset[];
  hooks: CanonicalAsset[];
  templates: CanonicalAsset[];
}

/** The structural renderer contract; provider packages export compatible objects. */
export interface ProviderRenderer {
  provider: string;
  render(assets: CanonicalAssets): { path: string; content: string }[];
}

const assetsRoot = fileURLToPath(new URL('../assets/', import.meta.url));

export async function frameworkVersion(): Promise<string> {
  const packageJson = JSON.parse(
    await readFile(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'),
  ) as { version: string };
  return packageJson.version;
}

/** Load the canonical assets bundled with this package (sync-tested against the repo root). */
export async function loadBundledAssets(): Promise<CanonicalAssets> {
  const version = await frameworkVersion();

  const skills: CanonicalSkill[] = [];
  for (const entry of (await readdir(join(assetsRoot, 'skills'))).sort()) {
    const skillDir = join(assetsRoot, 'skills', entry);
    const content = await readFile(join(skillDir, 'SKILL.md'), 'utf8');
    const references: CanonicalAsset[] = [];
    try {
      for (const reference of (await readdir(join(skillDir, 'references'))).sort()) {
        references.push({
          name: reference,
          content: await readFile(join(skillDir, 'references', reference), 'utf8'),
        });
      }
    } catch {
      // No references directory.
    }
    skills.push({ name: entry, content, references });
  }

  const loadDir = async (dir: string, suffix: string): Promise<CanonicalAsset[]> => {
    const assets: CanonicalAsset[] = [];
    for (const entry of (await readdir(join(assetsRoot, dir))).sort()) {
      if (!entry.endsWith(suffix)) continue;
      assets.push({
        name: entry.slice(0, -suffix.length),
        content: await readFile(join(assetsRoot, dir, entry), 'utf8'),
      });
    }
    return assets;
  };

  const templates: CanonicalAsset[] = [];
  for (const entry of (await readdir(join(assetsRoot, 'templates'))).sort()) {
    templates.push({
      name: entry,
      content: await readFile(join(assetsRoot, 'templates', entry), 'utf8'),
    });
  }

  return {
    version,
    skills,
    commands: await loadDir('commands', '.md'),
    hooks: await loadDir('hooks', '.json'),
    templates,
  };
}
