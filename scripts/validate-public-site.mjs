import { readFile, readdir } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';

const args = process.argv.slice(2);
function option(name) {
  const index = args.indexOf(name);
  if (index < 0 || !args[index + 1] || args[index + 1].startsWith('--')) {
    throw new Error(`${name} is required.`);
  }
  return args[index + 1];
}
const directory = resolve(option('--dir'));
const profile = option('--profile');
const basePath = option('--base-path');
const siteOrigin = option('--site-origin');
if (!['public', 'engineering'].includes(profile)) throw new Error('Invalid profile.');
if (!basePath.startsWith('/') || !basePath.endsWith('/')) throw new Error('Invalid base path.');
if (new URL(siteOrigin).origin !== siteOrigin) throw new Error('Expected an HTTP(S) site origin.');
const files = new Set();
async function inventory(path = '') {
  for (const entry of await readdir(join(directory, path), { withFileTypes: true })) {
    const name = path ? `${path}/${entry.name}` : entry.name;
    if (entry.isDirectory()) await inventory(name);
    else if (entry.isFile()) files.add(name);
    else throw new Error(`Unsupported output entry: ${name}`);
  }
}
await inventory();
function requireFile(file) {
  if (!files.has(file)) throw new Error(`Missing output: ${file}`);
}
for (const file of [
  'index.html',
  'assets/site.css',
  'sitemap.xml',
  'robots.txt',
  'publication.json',
]) {
  requireFile(file);
}
const metadata = JSON.parse(await readFile(join(directory, 'publication.json'), 'utf8'));
if (
  metadata.schemaVersion !== 1 ||
  metadata.profile !== profile ||
  metadata.basePath !== basePath ||
  metadata.siteOrigin !== siteOrigin ||
  typeof metadata.cliVersion !== 'string' ||
  typeof metadata.dirty !== 'boolean' ||
  !(
    (typeof metadata.sourceRevision === 'string' &&
      /^[a-f0-9]{40}$/u.test(metadata.sourceRevision)) ||
    (metadata.sourceRevision === null && metadata.dirty)
  )
)
  throw new Error('Invalid publication metadata or source revision.');
if (profile === 'public') {
  requireFile('404.html');
  for (const locale of ['en', 'es']) {
    for (const route of [
      '',
      'product/',
      'how-it-works/',
      'get-started/',
      'guides/greenfield/',
      'guides/brownfield/',
      'guides/existing-repository/',
    ]) {
      requireFile(`${locale}/${route}index.html`);
    }
  }
  for (const file of files) {
    if (/^(?:en|es)\/(?:model|engineering)(?:\/|$)/u.test(file) || file.startsWith('reports/')) {
      throw new Error(`Engineering route leaked into public output: ${file}`);
    }
  }
} else {
  requireFile('en/model/explorer.html');
  requireFile('en/engineering/index.html');
  const sections = [...files].filter((file) =>
    /^en\/engineering\/\d{2}-[^/]+\/index\.html$/u.test(file),
  );
  if (sections.length !== 12) throw new Error('Expected twelve architecture sections.');
  for (const file of files) {
    if (/^(?:en|es)\/(?:product|how-it-works|get-started|guides)(?:\/|$)/u.test(file)) {
      throw new Error(`Marketing route leaked into engineering output: ${file}`);
    }
  }
}

let references = 0;
function checkUrl(value, source) {
  const decoded = value.replaceAll('&amp;', '&').trim();
  if (!decoded || /^(?:#|data:|mailto:|tel:)/iu.test(decoded)) return;
  const pageUrl = `${siteOrigin}${basePath}${source}`;
  const url = new URL(decoded, pageUrl);
  if (url.origin !== siteOrigin) return;
  if (!url.pathname.startsWith(basePath))
    throw new Error(`${source}: URL escapes base path: ${decoded}`);
  const path = decodeURIComponent(url.pathname.slice(basePath.length));
  const target = !path || path.endsWith('/') ? `${path}index.html` : path;
  // Cloudflare and GitHub Pages resolve directory URLs without a trailing slash too.
  if (!files.has(target) && !files.has(`${target}/index.html`)) {
    throw new Error(`${source}: missing local target ${decoded}`);
  }
  const local = resolve(directory, target);
  if (relative(directory, local).startsWith('..')) throw new Error('URL escapes output directory.');
  references++;
}
for (const file of files) {
  if (!/\.(?:html|css)$/u.test(file)) continue;
  const text = await readFile(join(directory, file), 'utf8');
  if (file.endsWith('.html')) {
    // Embedded scripts may contain templates/URLs that are not rendered links.
    const markup = text.replace(/(<script\b[^>]*>)[\s\S]*?<\/script\s*>/giu, '$1</script>');
    for (const match of markup.matchAll(/\b(?:href|src|poster)\s*=\s*(["'])(.*?)\1/giu)) {
      checkUrl(match[2], file);
    }
  }
  const styles = file.endsWith('.css')
    ? text
    : [...text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/giu)]
        .map((match) => match[1])
        .join('\n');
  for (const match of styles.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/giu))
    checkUrl(match[1], file);
}
const sitemap = await readFile(join(directory, 'sitemap.xml'), 'utf8');
for (const match of sitemap.matchAll(/<loc>(.*?)<\/loc>/gu)) {
  if (!match[1].startsWith(`${siteOrigin}${basePath}`))
    throw new Error('Sitemap origin/base path mismatch.');
  checkUrl(match[1], 'sitemap.xml');
}
const robots = await readFile(join(directory, 'robots.txt'), 'utf8');
if (!robots.includes(`Sitemap: ${siteOrigin}${basePath}sitemap.xml`))
  throw new Error('Robots sitemap mismatch.');
console.log(
  `Validated ${profile}: ${files.size} files, ${references} local references, source ${metadata.sourceRevision || 'unversioned'}${metadata.dirty ? ' (dirty)' : ''}.`,
);
