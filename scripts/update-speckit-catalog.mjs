/**
 * Update the pdac entry in the Spec Kit extension catalog (extensions/catalog.json).
 *
 * Called by the speckit-pdac release workflow after the release archive exists, because the
 * entry pins the archive's sha256 and that digest only exists once the zip is built. Usable
 * locally too: node scripts/update-speckit-catalog.mjs <version> <sha256hex> [catalogPath]
 *
 * The entry format follows what the specify CLI validates and displays: id, name, version,
 * description, author, repository, license, download_url (HTTPS), sha256 (verified against the
 * downloaded bytes before install) and tags. The download_url pins the exact release tag, so a
 * catalog state always names one immutable artifact; `specify extension update` sees a new
 * version when this entry's version bumps.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from 'yaml';
import prettier from 'prettier';

const [version, sha256, catalogPath = 'extensions/catalog.json'] = process.argv.slice(2);

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(
    'usage: node scripts/update-speckit-catalog.mjs <version> <sha256hex> [catalogPath]',
  );
  process.exit(2);
}
if (!sha256 || !/^[0-9a-f]{64}$/.test(sha256)) {
  console.error(`invalid sha256 hex digest: ${sha256}`);
  process.exit(2);
}

const manifest = parse(readFileSync('extensions/speckit-pdac/extension.yml', 'utf8'));
if (manifest.extension.version !== version) {
  console.error(
    `version mismatch: extension.yml declares ${manifest.extension.version}, release is ${version}`,
  );
  process.exit(1);
}

const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
catalog.extensions.pdac = {
  id: 'pdac',
  name: manifest.extension.name,
  version,
  description: manifest.extension.description,
  author: manifest.extension.author,
  repository: manifest.extension.repository,
  license: manifest.extension.license,
  category: manifest.extension.category,
  effect: manifest.extension.effect,
  download_url: `https://github.com/juangcarmona/productshape/releases/download/speckit-pdac-v${version}/speckit-pdac.zip`,
  sha256: `sha256:${sha256}`,
  requires: manifest.requires,
  provides: {
    commands: manifest.provides.commands.length,
    hooks: Object.keys(manifest.hooks ?? {}).length,
  },
  tags: manifest.tags,
};

const formatted = await prettier.format(JSON.stringify(catalog, null, 2), {
  ...(await prettier.resolveConfig(catalogPath)),
  filepath: catalogPath,
});
writeFileSync(catalogPath, formatted, 'utf8');
console.log(`updated ${catalogPath}: pdac ${version} (sha256:${sha256})`);
