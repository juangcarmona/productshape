import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const outputArgument = args.indexOf('--out');
const baseArgument = args.indexOf('--base-path');
const originArgument = args.indexOf('--site-origin');
const outDir = resolve(root, outputArgument >= 0 ? args[outputArgument + 1] : '_site');
const basePath = normalizeBasePath(
  baseArgument >= 0 ? args[baseArgument + 1] : process.env.SITE_BASE_PATH || '/productshape/',
);
const siteOrigin = normalizeOrigin(
  originArgument >= 0
    ? args[originArgument + 1]
    : process.env.SITE_ORIGIN || 'https://juangcarmona.github.io',
);
const repoUrl = 'https://github.com/juangcarmona/productshape';
const packageJson = JSON.parse(await readFile(join(root, 'packages/cli/package.json'), 'utf8'));
const siteText = Object.fromEntries(
  await Promise.all(
    ['en', 'es'].map(async (locale) => [
      locale,
      JSON.parse(await readFile(join(root, `site/content/${locale}.json`), 'utf8')),
    ]),
  ),
);
const architectureDir = join(root, 'docs/architecture');
const architectureFiles = (await readdir(architectureDir))
  .filter((name) => /^\d{2}-.*\.md$/u.test(name))
  .sort();

if (architectureFiles.length !== 12) {
  throw new Error(
    `Expected twelve arc42 sections under docs/architecture; found ${architectureFiles.length}.`,
  );
}

const sections = await Promise.all(
  architectureFiles.map(async (name) => {
    const source = await readFile(join(architectureDir, name), 'utf8');
    const { metadata, markdown } = splitFrontmatter(source, name);
    const number = name.slice(0, 2);
    if (
      metadata['arc42-section'] !== number ||
      metadata.title === undefined ||
      !metadata.description
    ) {
      throw new Error(`Invalid arc42 document metadata in docs/architecture/${name}.`);
    }
    return {
      number,
      name,
      slug: name.replace(/\.md$/u, ''),
      title: metadata.title,
      description: metadata.description,
      markdown,
      html: markdownToHtml(markdown, name),
    };
  }),
);

const git = spawnSync('git', ['rev-parse', '--short=12', 'HEAD'], {
  cwd: root,
  encoding: 'utf8',
});
const status = spawnSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' });
const dirty = status.stdout.trim().length > 0;
const revision =
  process.env.GITHUB_SHA?.slice(0, 12) ||
  `${git.stdout.trim() || 'working tree'}${dirty ? ' · uncommitted changes' : ''}`;

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
await cp(join(root, 'site/assets'), join(outDir, 'assets'), { recursive: true });
await cp(join(architectureDir, 'diagrams'), join(outDir, 'assets/architecture'), {
  recursive: true,
});
await cp(
  join(root, 'docs/assets/snapshot/01-overview-desktop.png'),
  join(outDir, 'assets/product-explorer.png'),
);
await writeFile(
  join(outDir, 'assets/site.css'),
  await readFile(join(root, 'site/assets/site.css')),
);
await mkdir(join(outDir, 'model'), { recursive: true });

for (const locale of ['en', 'es']) {
  const words = siteText[locale];
  await emitPage(locale, 'home', '', renderHome(words, locale));
  await emitPage(locale, 'product', 'product', renderProduct(words));
  await emitPage(locale, 'workflow', 'how-it-works', renderWorkflow(words));
  await emitPage(locale, 'start', 'get-started', renderStart(words, packageJson.version));
  await emitPage(locale, 'engineering', 'engineering', renderEngineeringIndex(words, locale));
  await emitPage(locale, 'model', 'model', renderModel(words));
}
await cp(join(outDir, 'en/index.html'), join(outDir, 'index.html'));

for (const section of sections) {
  const page = renderArchitecturePage(section);
  await emitPage('en', 'engineering', `engineering/${section.slug}`, page, {
    title: `${section.number} · ${section.title} · ProductShape`,
    description: section.description,
  });
}

await writeFile(join(outDir, 'sitemap.xml'), renderSitemap());
await writeFile(
  join(outDir, 'robots.txt'),
  `User-agent: *\nAllow: /\nSitemap: ${siteOrigin}${basePath}sitemap.xml\n`,
);

const snapshot = join(root, '.product/generated/snapshot.html');
await cp(snapshot, join(outDir, 'model/explorer.html'));
await writeFile(
  join(outDir, 'snapshot.html'),
  redirectPage(`${basePath}en/model/`, 'ProductShape model explorer'),
);
await writeFile(
  join(outDir, '404.html'),
  shell({
    locale: 'en',
    active: '',
    title: 'Page not found · ProductShape',
    description: 'The requested ProductShape page was not found.',
    body: `<section class="page-hero"><div class="narrow"><p class="eyebrow">404</p><h1>That page is not here.</h1><p class="lead">Use the navigation to find the ProductShape product guide, engineering documentation, or live model.</p><p><a class="button" href="${basePath}en/">Go to the overview</a></p></div></section>`,
  }),
);

console.log(
  `Built ProductShape public site at ${relative(root, outDir)} (base ${basePath}, CLI ${packageJson.version}, revision ${revision}).`,
);

function normalizeBasePath(value) {
  if (!value || !value.startsWith('/')) throw new Error('--base-path must begin with /.');
  return value.endsWith('/') ? value : `${value}/`;
}

function normalizeOrigin(value) {
  const parsed = new URL(value);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('--site-origin must be an HTTP(S) origin.');
  }
  return parsed.origin;
}

function renderSitemap() {
  const routeNames = ['', 'product/', 'how-it-works/', 'get-started/', 'engineering/', 'model/'];
  const urls = [];
  for (const locale of ['en', 'es']) {
    for (const route of routeNames) urls.push(`${siteOrigin}${basePath}${locale}/${route}`);
  }
  for (const section of sections) {
    urls.push(`${siteOrigin}${basePath}en/engineering/${section.slug}/`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${escapeHtml(url)}</loc></url>`).join('')}</urlset>\n`;
}

async function emitPage(locale, pageKind, route, body, overrides = {}) {
  const words = siteText[locale];
  const pageTitles = {
    home:
      locale === 'es'
        ? 'ProductShape · Definición de producto como código'
        : 'ProductShape · Product Definition as Code',
    product:
      locale === 'es'
        ? `${words.nav.product} · ProductShape`
        : `${words.nav.product} · ProductShape`,
    workflow: `${words.nav.workflow} · ProductShape`,
    start: `${words.nav.start} · ProductShape`,
    engineering: `${words.nav.engineering} · ProductShape`,
    model: `${words.nav.model} · ProductShape`,
  };
  const descriptions = {
    home: words.home.intro,
    product: words.product.intro,
    workflow: words.workflow.intro,
    start: words.start.intro,
    engineering: words.engineering.intro,
    model: words.model.intro,
  };
  const routePath = route ? `${route}/` : '';
  const destination = route
    ? join(outDir, locale, ...route.split('/'), 'index.html')
    : join(outDir, locale, 'index.html');
  const built = shell({
    locale,
    pageKind,
    title: overrides.title || pageTitles[pageKind],
    description: overrides.description || descriptions[pageKind],
    body,
    routePath,
  });
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, built);
}

function shell({ locale, pageKind = '', title, description, body, routePath = '' }) {
  const rootHref = `${basePath}${locale}/`;
  const localizedPath = routePath ? `${locale}/${routePath}` : `${locale}/`;
  const asset = `${basePath}assets/site.css`;
  const route = (page) => {
    const paths = {
      home: `${basePath}${locale}/`,
      product: `${basePath}${locale}/product/`,
      workflow: `${basePath}${locale}/how-it-works/`,
      start: `${basePath}${locale}/get-started/`,
      engineering: `${basePath}${locale}/engineering/`,
      model: `${basePath}${locale}/model/`,
    };
    return paths[page];
  };
  const nav = siteText[locale].nav;
  const navItems = [
    ['product', nav.product],
    ['workflow', nav.workflow],
    ['start', nav.start],
    ['engineering', nav.engineering],
    ['model', nav.model],
  ];
  const languageRoute = (target) => {
    const suffix = routePath.startsWith('engineering/') ? 'engineering/' : routePath;
    return `${basePath}${target}/${suffix}`;
  };
  const header = `<a class="skip-link" href="#main">${locale === 'es' ? 'Saltar al contenido' : 'Skip to content'}</a><header class="site-header"><div class="header-inner"><a class="brand" href="${rootHref}" aria-label="ProductShape home"><img class="brand-icon" src="${basePath}assets/productshape-icon.png" width="38" height="38" alt=""><span>ProductShape</span></a><nav class="main-nav" aria-label="${locale === 'es' ? 'Navegación principal' : 'Primary navigation'}">${navItems.map(([key, label]) => `<a href="${route(key)}"${pageKind === key ? ' aria-current="page"' : ''}>${escapeHtml(label)}</a>`).join('')}<a href="${repoUrl}" rel="external">${escapeHtml(nav.github)}</a><span class="language-switch" aria-label="${locale === 'es' ? 'Idioma' : 'Language'}"><a href="${languageRoute('en')}" lang="en"${locale === 'en' ? ' aria-current="true"' : ''}>EN</a><a href="${languageRoute('es')}" lang="es"${locale === 'es' ? ' aria-current="true"' : ''}>ES</a></span></nav></div></header>`;
  const footer = `<footer class="site-footer"><div class="footer-inner"><div class="footer-identities"><a class="footer-productshape" href="${rootHref}"><img src="${basePath}assets/productshape-branding.png" width="190" height="95" alt="ProductShape — Product Definition as Code"></a><a class="footer-methodology" href="https://github.com/product-definition-as-code/spec"><img src="${basePath}assets/pdac-logo.png" width="54" height="54" alt="PDaC logo"><span><strong>Product Definition as Code</strong><small>${escapeHtml(siteText[locale].footer.methodology)}</small></span></a></div><div class="footer-meta"><p>${escapeHtml(siteText[locale].footer.line)}<br><span>${siteText[locale].footer.license}</span></p><div class="footer-links"><a href="https://github.com/product-definition-as-code/spec">${escapeHtml(siteText[locale].footer.spec)}</a><a href="${repoUrl}">${escapeHtml(siteText[locale].footer.repo)}</a></div></div></div></footer>`;
  return `<!doctype html>\n<html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="description" content="${escapeAttribute(description)}"><meta property="og:title" content="${escapeAttribute(title)}"><meta property="og:description" content="${escapeAttribute(description)}"><meta property="og:type" content="website"><title>${escapeHtml(title)}</title><link rel="icon" href="${basePath}assets/productshape-icon.png" type="image/png"><link rel="stylesheet" href="${asset}"><link rel="canonical" href="${siteOrigin}${basePath}${localizedPath}"></head><body>${header}<main id="main">${body}</main>${footer}</body></html>\n`;
}

function renderHome(words, locale) {
  const home = words.home;
  const start = `${basePath}${locale}/get-started/`;
  const model = `${basePath}${locale}/model/`;
  const engineering = `${basePath}${locale}/engineering/`;
  return `<section class="hero wrap"><div><p class="eyebrow">${escapeHtml(home.eyebrow)}</p><h1>${escapeHtml(home.title)}</h1><p class="lead">${escapeHtml(home.intro)}</p><div class="actions"><a class="button" href="${start}">${escapeHtml(home.primaryAction)}</a><a class="button secondary" href="${model}">${escapeHtml(home.secondaryAction)}</a></div></div><figure class="hero-art"><img src="${basePath}assets/product-explorer.png" width="1440" height="900" alt="${locale === 'es' ? 'Vista real del explorador del modelo de producto de ProductShape' : 'Real view of the ProductShape product model explorer'}"><figcaption class="image-caption">${locale === 'es' ? 'Una instantánea real del modelo, regenerada desde este repositorio.' : 'A real model snapshot, regenerated from this repository.'}</figcaption></figure></section><div class="wrap"><div class="proof-line"><strong>${escapeHtml(home.proofLabel)}</strong><span>${escapeHtml(home.proof)}</span></div></div><section class="section"><div class="wrap"><div class="section-heading"><div><p class="eyebrow">${locale === 'es' ? 'Una estructura común' : 'A shared structure'}</p><h2>${escapeHtml(home.flowTitle)}</h2></div><p>${escapeHtml(home.flowIntro)}</p></div>${flowGraphic(locale)}<div class="flow-grid">${home.flow.map((step) => `<article class="flow-step"><span class="step-number">${step.number}</span><h3>${escapeHtml(step.title)}</h3><p>${escapeHtml(step.text)}</p></article>`).join('')}</div></div></section><section class="section"><div class="wrap split-section"><div><p class="eyebrow">${locale === 'es' ? 'El límite importante' : 'The important boundary'}</p><h2>${escapeHtml(home.principleTitle)}</h2></div><div class="statement"><p>${escapeHtml(home.principleText)}</p></div></div></section><section class="section"><div class="wrap"><div class="section-heading"><div><p class="eyebrow">${locale === 'es' ? 'Dogfooding público' : 'Public dogfooding'}</p><h2>${escapeHtml(home.explorerTitle)}</h2></div><p>${escapeHtml(home.explorerText)}</p></div><p><a class="button secondary" href="${model}">${escapeHtml(words.nav.model)} →</a></p></div></section><section class="section"><div class="wrap split-section"><div><p class="eyebrow">${locale === 'es' ? 'Implementación' : 'Implementation'}</p><h2>${escapeHtml(home.architectureTitle)}</h2></div><div><p class="lead">${escapeHtml(home.architectureText)}</p><a href="${engineering}">${escapeHtml(words.nav.engineering)} →</a></div></div></section><section class="section"><div class="wrap"><div class="cta-band"><div><p class="eyebrow">${locale === 'es' ? 'Siguiente paso' : 'Next step'}</p><h2>${escapeHtml(home.closingTitle)}</h2><p>${escapeHtml(home.closingText)}</p></div><a class="button" href="${start}">${escapeHtml(words.nav.start)} →</a></div></div></section>`;
}

function flowGraphic(locale) {
  const title =
    locale === 'es' ? 'Definir, validar, citar y cambiar' : 'Define, validate, cite, and change';
  const labels =
    locale === 'es'
      ? [
          'Archivos del producto',
          'Validación determinista',
          'Documentos consumidores',
          'Product Change y revisión',
        ]
      : [
          'Product files',
          'Deterministic validation',
          'Consumer documents',
          'Product Change and review',
        ];
  return `<svg class="workflow-graphic" viewBox="0 0 1080 188" role="img" aria-labelledby="flow-title flow-desc"><title id="flow-title">${title}</title><desc id="flow-desc">${locale === 'es' ? 'Un flujo circular conecta los archivos canónicos con los consumidores y la revisión humana.' : 'A loop connects canonical files to consumers and human review.'}</desc><defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#153d70"/></marker></defs><path d="M250 92 H320 M510 92 H580 M770 92 H840" fill="none" stroke="#153d70" stroke-width="2" marker-end="url(#arrow)"/><path d="M936 130 C900 177 170 177 140 130" fill="none" stroke="#53635b" stroke-width="1.5" stroke-dasharray="5 6" marker-end="url(#arrow)"/><g fill="#fffefa" stroke="#b6c5d5"><rect x="42" y="48" width="208" height="84"/><rect x="320" y="48" width="190" height="84"/><rect x="580" y="48" width="190" height="84"/><rect x="840" y="48" width="198" height="84"/></g><g fill="#153d70" font-family="monospace" font-size="12" font-weight="700"><text x="58" y="76">01</text><text x="336" y="76">02</text><text x="596" y="76">03</text><text x="856" y="76">04</text></g><g fill="#182722" font-family="system-ui, sans-serif" font-size="15" font-weight="650"><text x="58" y="105">${escapeHtml(labels[0])}</text><text x="336" y="105">${escapeHtml(labels[1])}</text><text x="596" y="105">${escapeHtml(labels[2])}</text><text x="856" y="105">${escapeHtml(labels[3])}</text></g><text x="540" y="174" text-anchor="middle" fill="#53635b" font-family="system-ui, sans-serif" font-size="12">${locale === 'es' ? 'La revisión humana mantiene la definición aceptada bajo control.' : 'Human review keeps the accepted definition in control.'}</text></svg>`;
}

function renderProduct(words) {
  const locale = words.languageName === 'Español' ? 'es' : 'en';
  const sections = words.product.sections
    .map(
      (section, index) =>
        `<article class="feature"><span class="feature-index">0${index + 1}</span><h3>${escapeHtml(section.title)}</h3><p>${escapeHtml(section.text)}</p></article>`,
    )
    .join('');
  const modelUrl = `${basePath}${locale}/model/`;
  const modelSource = `${repoUrl}/blob/main/docs/product/model/index.md`;
  const brandSource = `${repoUrl}/blob/main/docs/product/model/requirements/constraints/con-brand-001.md`;
  const journeySource = `${repoUrl}/blob/main/docs/product/model/journeys/jrn-adopt-001.md`;
  const initSource = `${repoUrl}/blob/main/docs/product/model/use-cases/uc-init-001.md`;
  return `<section class="page-hero"><div class="narrow"><p class="eyebrow">${escapeHtml(words.product.eyebrow)}</p><h1>${escapeHtml(words.product.title)}</h1><p class="lead">${escapeHtml(words.product.intro)}</p></div></section><section class="section"><div class="wrap"><div class="feature-grid">${sections}</div></div></section><section class="section"><div class="narrow"><p class="eyebrow">${words.nav.workflow}</p><h2>${escapeHtml(words.product.boundaryTitle)}</h2><p class="lead">${escapeHtml(words.product.boundaryText)}</p><div class="link-list product-source-links"><a href="${modelUrl}">${escapeHtml(words.product.liveModel)} →</a><a href="${modelSource}">${escapeHtml(words.product.modelSource)} →</a><a href="${brandSource}">${escapeHtml(words.product.brandSource)} →</a><a href="${journeySource}">${escapeHtml(words.product.adoptionSource)} →</a><a href="${initSource}">${escapeHtml(words.product.initSource)} →</a></div></div></section><section class="section"><div class="narrow"><p><a class="button" href="${basePath}${locale}/get-started/">${escapeHtml(words.nav.start)} →</a></p></div></section>`;
}

function renderWorkflow(words) {
  const steps = words.workflow.steps
    .map((step) => `<li><h2>${escapeHtml(step.title)}</h2><p>${escapeHtml(step.text)}</p></li>`)
    .join('');
  return `<section class="page-hero"><div class="narrow"><p class="eyebrow">${escapeHtml(words.workflow.eyebrow)}</p><h1>${escapeHtml(words.workflow.title)}</h1><p class="lead">${escapeHtml(words.workflow.intro)}</p></div></section><section class="section"><div class="narrow">${flowGraphic(words.languageName === 'Español' ? 'es' : 'en')}<ol class="step-list">${steps}</ol><div class="callout"><strong>${escapeHtml(words.workflow.noteTitle)}</strong><p>${escapeHtml(words.workflow.noteText)}</p></div><a class="button" href="${basePath}${words.languageName === 'Español' ? 'es' : 'en'}/get-started/">${escapeHtml(words.nav.start)} →</a></div></section>`;
}

function renderStart(words, version) {
  const code = (value) =>
    `<pre class="code-block"><code>${escapeHtml(value.replaceAll('{{version}}', version))}</code></pre>`;
  const repoFile = (path, anchor = '') => `${repoUrl}/blob/main/${path}${anchor}`;
  return `<section class="page-hero"><div class="narrow"><p class="eyebrow">${escapeHtml(words.start.eyebrow)}</p><h1>${escapeHtml(words.start.title)}</h1><p class="lead">${escapeHtml(words.start.intro)}</p></div></section><section class="section"><div class="narrow"><article class="content-section"><h2>${escapeHtml(words.start.installTitle)}</h2><p>${escapeHtml(words.start.initText)}</p>${code(words.start.initCode)}</article><article class="content-section"><h2>${escapeHtml(words.start.authorTitle)}</h2><p>${escapeHtml(words.start.authorText)}</p></article><article class="content-section"><h2>${escapeHtml(words.start.acceptTitle)}</h2><p>${escapeHtml(words.start.acceptText)}</p></article><article class="content-section"><h2>${escapeHtml(words.start.citeTitle)}</h2><p>${escapeHtml(words.start.citeText)}</p>${code(words.start.citeCode)}</article><div class="callout"><p>${escapeHtml(words.start.releaseNote)}</p></div><div class="link-list"><a href="${repoFile('docs/adoption/greenfield.md')}">${escapeHtml(words.start.greenfield)} →</a><a href="${repoFile('docs/adoption/brownfield.md')}">${escapeHtml(words.start.brownfield)} →</a><a href="${repoFile('packages/cli/README.md', '#the-governed-citation-first-walkthrough')}">${escapeHtml(words.start.walkthrough)} →</a></div></div></section>`;
}

function renderEngineeringIndex(words, locale) {
  const translated = locale === 'es';
  const labels = translated
    ? [
        'Introducción y objetivos',
        'Restricciones de arquitectura',
        'Contexto y alcance',
        'Estrategia de solución',
        'Bloques de construcción',
        'Vista de ejecución',
        'Vista de despliegue',
        'Conceptos transversales',
        'Decisiones de arquitectura',
        'Requisitos de calidad',
        'Riesgos y deuda técnica',
        'Glosario',
      ]
    : sections.map((section) => section.title);
  const descriptions = translated
    ? [
        'Alcance del sistema, motivadores y lectores',
        'Restricciones y sus consecuencias estructurales',
        'Usuarios, sistemas externos e intercambios',
        'Enfoques arquitectónicos fundamentales',
        'Descomposición estática y dependencias',
        'Flujos de trabajo e interacciones representativos',
        'Distribución y documentación pública',
        'Mecanismos compartidos entre paquetes',
        'Índice de decisiones de arquitectura',
        'Intención de calidad, respuesta y evidencias',
        'Riesgos y mitigaciones actuales',
        'Términos técnicos de estas vistas',
      ]
    : sections.map((section) => section.description);
  const list = sections
    .map(
      (section, index) =>
        `<li><span class="section-no">${section.number}</span><div><a href="${basePath}en/engineering/${section.slug}/">${escapeHtml(labels[index])}</a><p>${escapeHtml(descriptions[index])}</p></div></li>`,
    )
    .join('');
  const message = translated
    ? `<div class="callout"><p>${escapeHtml(words.arc42EnglishOnly)}</p></div>`
    : '';
  const markdownHref = `${repoUrl}/tree/main/docs/architecture`;
  return `<section class="page-hero"><div class="narrow"><p class="eyebrow">${escapeHtml(words.engineering.eyebrow)}</p><h1>${escapeHtml(words.engineering.title)}</h1><p class="lead">${escapeHtml(words.engineering.intro)}</p></div></section><section class="section"><div class="narrow"><p class="eyebrow">${escapeHtml(words.engineering.sections)}</p>${message}<ol class="section-index">${list}</ol><p><a href="${markdownHref}">${escapeHtml(words.engineering.githubSource)} →</a></p><p><a href="${repoUrl}/tree/main/docs/architecture/decisions">${escapeHtml(words.engineering.decisions)} →</a></p></div></section>`;
}

function renderArchitecturePage(section) {
  const sectionIndex = sections.indexOf(section);
  const previous = sections[sectionIndex - 1];
  const next = sections[sectionIndex + 1];
  const nav = sections
    .map(
      (item) =>
        `<li><a href="${basePath}en/engineering/${item.slug}/"${item.slug === section.slug ? ' aria-current="page"' : ''}><span class="nav-no">${item.number}</span><span>${escapeHtml(item.title)}</span></a></li>`,
    )
    .join('');
  const sourceUrl = `${repoUrl}/blob/main/docs/architecture/${section.name}`;
  const adjacentLink = (item, direction) =>
    item
      ? `<a class="nav-adjacent nav-${direction}" href="${basePath}en/engineering/${item.slug}/"><span>${direction === 'previous' ? '← Previous' : 'Next →'}</span><strong>${item.number} · ${escapeHtml(item.title)}</strong></a>`
      : `<span class="nav-adjacent nav-${direction} disabled" aria-hidden="true"></span>`;
  return `<section class="engineering-page-hero"><div class="wrap"><p class="breadcrumbs"><a href="${basePath}en/engineering/">Engineering</a> / arc42 ${section.number}</p><p class="eyebrow">arc42 · section ${section.number} of 12</p><h1>${escapeHtml(section.title)}</h1><p class="lead">${escapeHtml(section.description)}</p></div></section><div class="wrap engineering-layout"><nav class="engineering-nav" aria-label="arc42 sections"><details open><summary>Architecture sections <span>12 views</span></summary><a class="engineering-overview" href="${basePath}en/engineering/">Overview and section index</a><ol>${nav}</ol><a class="engineering-decisions" href="${repoUrl}/tree/main/docs/architecture/decisions">Architecture decisions ↗</a><div class="nav-adjacent-list">${adjacentLink(previous, 'previous')}${adjacentLink(next, 'next')}</div></details></nav><article class="engineering-content"><div class="engineering-content-inner">${section.html}<div class="engineering-endmatter"><p class="source-stamp">${escapeHtml(revision)}</p><p class="link-list"><a href="${sourceUrl}">Markdown source on GitHub →</a><a href="${basePath}en/engineering/">All architecture views →</a></p><div class="article-pagination">${adjacentLink(previous, 'previous')}${adjacentLink(next, 'next')}</div></div></div></article></div>`;
}

function renderModel(words) {
  const src = `${basePath}model/explorer.html`;
  return `<section class="page-hero"><div class="wrap"><p class="eyebrow">${escapeHtml(words.model.eyebrow)}</p><h1>${escapeHtml(words.model.title)}</h1><p class="lead">${escapeHtml(words.model.intro)}</p><div class="link-list"><a class="button" href="${src}" target="_blank" rel="noopener">${escapeHtml(words.model.open)}</a><a href="${repoUrl}/tree/main/docs/product/model">${escapeHtml(words.model.source)} →</a></div><div class="callout"><p>${escapeHtml(words.model.notice)}</p></div><div class="model-frame"><iframe src="${src}" title="${escapeAttribute(words.model.title)}" loading="lazy"></iframe></div></div></section>`;
}

function redirectPage(destination, title) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${destination}"><meta name="robots" content="noindex"><title>${escapeHtml(title)}</title></head><body><p>The model explorer moved to <a href="${destination}">${escapeHtml(title)}</a>.</p></body></html>`;
}

function splitFrontmatter(source, name) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/u);
  if (!match) throw new Error(`Missing frontmatter in docs/architecture/${name}.`);
  const metadata = Object.fromEntries(
    match[1].split(/\r?\n/u).map((line) => {
      const separator = line.indexOf(':');
      return [
        line.slice(0, separator).trim(),
        line
          .slice(separator + 1)
          .trim()
          .replace(/^['"]|['"]$/gu, ''),
      ];
    }),
  );
  return { metadata, markdown: match[2] };
}

function markdownToHtml(markdown, sourceName) {
  const lines = markdown.replace(/<!--[^]*?-->/gu, '').split(/\r?\n/u);
  const output = [];
  let paragraph = [];
  let list = null;
  let code = null;
  let tableRows = [];

  const flushParagraph = () => {
    if (paragraph.length) output.push(`<p>${inlineMarkdown(paragraph.join('\n'), sourceName)}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (!list) return;
    const tag = list.type === 'ordered' ? 'ol' : 'ul';
    output.push(
      `<${tag}>${list.items.map((item) => `<li>${inlineMarkdown(item, sourceName)}</li>`).join('')}</${tag}>`,
    );
    list = null;
  };
  const flushTable = () => {
    if (!tableRows.length) return;
    const rows = tableRows.filter((row) => !/^\|?\s*:?-{3,}/u.test(row));
    const cells = rows.map((row) =>
      row
        .trim()
        .replace(/^\||\|$/gu, '')
        .split('|')
        .map((cell) => cell.trim()),
    );
    if (cells.length) {
      const [head, ...body] = cells;
      output.push(
        `<table><thead><tr>${head.map((cell) => `<th scope="col">${inlineMarkdown(cell, sourceName)}</th>`).join('')}</tr></thead><tbody>${body.map((row) => `<tr>${head.map((_, index) => `<td>${inlineMarkdown(row[index] || '', sourceName)}</td>`).join('')}</tr>`).join('')}</tbody></table>`,
      );
    }
    tableRows = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (code) {
      if (/^\s*```/u.test(line)) {
        output.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
        code = null;
      } else code.push(line);
      continue;
    }
    if (/^\s*```/u.test(line)) {
      flushParagraph();
      flushList();
      flushTable();
      code = [];
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      flushList();
      flushTable();
      continue;
    }
    if (/^\|.*\|$/u.test(line.trim())) {
      flushParagraph();
      flushList();
      tableRows.push(line.trim());
      continue;
    }
    if (/^#{1,6}\s/u.test(line)) {
      flushParagraph();
      flushList();
      flushTable();
      const level = line.match(/^#+/u)[0].length;
      const text = line.slice(level).trim();
      const id = slug(text);
      output.push(
        `<h${Math.min(level + 1, 6)} id="${id}">${inlineMarkdown(text, sourceName)}</h${Math.min(level + 1, 6)}>`,
      );
      continue;
    }
    if (/^---+\s*$/u.test(line.trim())) {
      flushParagraph();
      flushList();
      flushTable();
      output.push('<hr>');
      continue;
    }
    if (/^>\s?/u.test(line)) {
      flushParagraph();
      flushList();
      flushTable();
      output.push(
        `<blockquote><p>${inlineMarkdown(line.replace(/^>\s?/u, ''), sourceName)}</p></blockquote>`,
      );
      continue;
    }
    const item = line.match(/^\s*(?:[-*+]\s+|(\d+)\.\s+)(.*)$/u);
    if (item) {
      flushParagraph();
      flushTable();
      const type = item[1] ? 'ordered' : 'unordered';
      if (list && list.type !== type) flushList();
      list ||= { type, items: [] };
      list.items.push(item[2]);
      continue;
    }
    flushList();
    flushTable();
    paragraph.push(line.trim());
  }
  flushParagraph();
  flushList();
  flushTable();
  return output.join('\n');
}

function inlineMarkdown(value, sourceName) {
  let html = escapeHtml(value);
  html = html.replace(/!\[([^\]]*)\]\(([^\s)]+)(?:\s+"[^"]*")?\)/gu, (_, alt, src) => {
    const target = resolveDocImage(src);
    return `<figure class="architecture-figure"><img src="${escapeAttribute(target)}" alt="${escapeAttribute(alt)}"><figcaption>${escapeHtml(alt)}</figcaption></figure>`;
  });
  html = html.replace(/`([^`]+)`/gu, '<code>$1</code>');
  html = html.replace(/\[([^\]]+)\]\(([^\s)]+)(?:\s+"[^"]*")?\)/gu, (_, label, href) => {
    const target = resolveDocLink(href, sourceName);
    const external = /^https?:/u.test(target);
    return `<a href="${escapeAttribute(target)}"${external ? ' rel="external"' : ''}>${label}</a>`;
  });
  html = html.replace(/\*\*([^*]+)\*\*/gu, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/gu, '<em>$1</em>');
  return html.replace(/\n/gu, '<br>');
}

function resolveDocImage(src) {
  const filename = src.split('/').at(-1);
  return `${basePath}assets/architecture/${encodeURIComponent(filename)}`;
}

function resolveDocLink(href, sourceName) {
  if (/^(?:https?:|mailto:|#)/u.test(href)) return href;
  const clean = href.split('#')[0];
  if (clean === 'README.md' || clean === './README.md') return `${basePath}en/engineering/`;
  const section = clean.match(/(?:^|\/)(\d{2}-[^/]+\.md)$/u);
  if (section) {
    const fragment = href.includes('#') ? `#${href.slice(href.indexOf('#') + 1)}` : '';
    return `${basePath}en/engineering/${section[1].replace(/\.md$/u, '')}/${fragment}`;
  }
  const githubPath = new URL(clean, `${repoUrl}/blob/main/docs/architecture/${sourceName}`);
  if (href.includes('#')) githubPath.hash = href.slice(href.indexOf('#') + 1);
  return githubPath.toString();
}

function slug(value) {
  return value
    .toLowerCase()
    .replace(/<[^>]+>/gu, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/gu, '-');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('`', '&#96;');
}
