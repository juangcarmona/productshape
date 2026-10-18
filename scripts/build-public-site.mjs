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
const adoptionGuides = [
  { slug: 'greenfield', file: 'greenfield.md' },
  { slug: 'brownfield', file: 'brownfield.md' },
  { slug: 'existing-repository', file: 'existing-repository.md' },
];
const sectionTokens = {
  '01': 'GOAL',
  '02': 'CON',
  '03': 'CTX',
  '04': 'STR',
  '05': 'BBV',
  '06': 'RUN',
  '07': 'DEP',
  '08': 'XCC',
  '09': 'ADR',
  10: 'QR',
  11: 'RTD',
  12: 'GLO',
};
const sectionIcons = {
  '01': '<circle cx="8" cy="8" r="4.8"/><circle cx="8" cy="8" r="1.4"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2"/>',
  '02': '<rect x="3" y="7" width="10" height="7.2" rx="1.3"/><path d="M5.3 7V5.1a2.7 2.7 0 0 1 5.4 0V7M8 9.8v1.6"/>',
  '03': '<rect x="1.5" y="2.5" width="4.5" height="4.5" rx="1"/><rect x="10" y="9" width="4.5" height="4.5" rx="1"/><path d="M6 4.8h2.1a2 2 0 0 1 2 2V9"/>',
  '04': '<circle cx="8" cy="8" r="6"/><path d="m10.9 5.1-1.8 4-4 1.8 1.8-4z"/>',
  '05': '<path d="m8 1.5 6.2 3.3v6.4L8 14.5l-6.2-3.3V4.8z"/><path d="m1.8 4.8 6.2 3.3 6.2-3.3M8 8.1v6.4"/>',
  '06': '<circle cx="8" cy="8" r="6"/><path d="m6.5 4.9 4.6 3.1-4.6 3.1z"/>',
  '07': '<rect x="5" y="1.5" width="6" height="4.2" rx=".7"/><path d="M8 5.7v2.8M6.4 6.9 8 8.5l1.6-1.6"/><rect x="2" y="9" width="12" height="5.5" rx="1"/><path d="M4.2 11h7.6M4.2 12.7h7.6"/>',
  '08': '<circle cx="6" cy="8" r="4.2"/><circle cx="10" cy="8" r="4.2"/>',
  '09': '<path d="m8 1.8 5.2 3v6L8 13.8l-5.2-3v-6zM8 13.8v1.4M8 7.8h.1M8 7.8v-2"/><path d="M8 9.4v1.2"/>',
  10: '<path d="M2 11.8a6 6 0 1 1 12 0"/><path d="m8 11.8 3.1-3.5"/><circle cx="8" cy="11.8" r="1"/><path d="m4 7.4.8.6M8 5.8v1M12 7.4l-.8.6"/>',
  11: '<path d="M8 1.8 14.4 13H1.6z"/><path d="M8 5.3v3.4M8 11.1v.1"/>',
  12: '<path d="M3.2 1.8h6l3.6 3.6v8.8H3.2zM9.2 1.8v3.6h3.6"/><path d="M5.3 8h5.4M5.3 10.2h5.4M5.3 12.4h3.8"/>',
};
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
      !metadata.description ||
      !sectionTokens[number]
    ) {
      throw new Error(`Invalid arc42 document metadata in docs/architecture/${name}.`);
    }
    return {
      number,
      token: sectionTokens[number],
      name,
      slug: name.replace(/\.md$/u, ''),
      title: metadata.title,
      description: metadata.description,
      markdown,
      html: markdownToHtml(markdown.trimStart().replace(/^#\s+[^\r\n]+(?:\r?\n)+/u, ''), name, 0),
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
  await emitPage(locale, 'model', 'model', renderModel(words));
  for (const guide of adoptionGuides) {
    const markdown = await readFile(join(root, 'docs/adoption', guide.file), 'utf8');
    const guideCopy = words.guides.items.find((item) => item.slug === guide.slug);
    await emitPage(locale, 'start', `guides/${guide.slug}`, renderGuide(guide, markdown, words), {
      title: `${guideCopy.title} · ProductShape`,
      description: guideCopy.description,
    });
  }
  if (locale === 'en') {
    await emitPage('en', 'engineering', 'engineering', renderEngineeringLanding(), {
      title: 'Architecture Documentation · ProductShape',
      description: 'Explore the twelve sections of ProductShape architecture documentation.',
    });
  }
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
  const routeNames = ['', 'product/', 'how-it-works/', 'get-started/', 'model/'];
  const urls = [];
  for (const locale of ['en', 'es']) {
    for (const route of routeNames) urls.push(`${siteOrigin}${basePath}${locale}/${route}`);
  }
  urls.push(`${siteOrigin}${basePath}en/engineering/`);
  for (const section of sections) {
    urls.push(`${siteOrigin}${basePath}en/engineering/${section.slug}/`);
  }
  for (const locale of ['en', 'es']) {
    for (const guide of adoptionGuides) {
      urls.push(`${siteOrigin}${basePath}${locale}/guides/${guide.slug}/`);
    }
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
    model: `${words.nav.model} · ProductShape`,
  };
  const descriptions = {
    home: words.home.intro,
    product: words.product.intro,
    workflow: words.workflow.intro,
    start: words.start.intro,
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
      engineering: `${basePath}en/engineering/`,
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
  const engineeringSections = sections
    .map(
      (section) =>
        `<li><a href="${basePath}en/engineering/${section.slug}/" data-section="${section.number}"${routePath === `engineering/${section.slug}/` ? ' aria-current="page"' : ''}><span class="engineering-token"><svg class="ic" viewBox="0 0 16 16" aria-hidden="true">${sectionIcons[section.number]}</svg>${section.token}</span><span>${escapeHtml(section.title)}</span></a></li>`,
    )
    .join('');
  const primaryLinks = navItems
    .map(([key, label]) => {
      const link = `<a href="${route(key)}"${pageKind === key ? ' aria-current="page"' : ''}>${escapeHtml(label)}</a>`;
      return key === 'engineering'
        ? `<div class="main-nav-group engineering-nav-group">${link}<details class="engineering-subnav"><summary>${locale === 'es' ? 'Secciones' : 'Sections'}<span>${sections.length}</span></summary><ol>${engineeringSections}</ol></details></div>`
        : link;
    })
    .join('');
  const languageRoute = (target) => {
    if (routePath.startsWith('engineering/')) {
      return target === 'en' ? `${basePath}en/${routePath}` : `${basePath}es/`;
    }
    return `${basePath}${target}/${routePath}`;
  };
  const header = `<a class="skip-link" href="#main">${locale === 'es' ? 'Saltar al contenido' : 'Skip to content'}</a><header class="site-header"><div class="header-inner"><a class="brand" href="${rootHref}" aria-label="ProductShape home"><img class="brand-icon" src="${basePath}assets/productshape-icon.png" width="32" height="32" alt=""><span class="brand-title">ProductShape</span></a><span class="header-version">v${packageJson.version}</span><nav class="main-nav" id="primary-navigation" aria-label="${locale === 'es' ? 'Navegación principal' : 'Primary navigation'}">${primaryLinks}<a href="${repoUrl}" rel="external">${escapeHtml(nav.github)}</a><span class="language-switch" aria-label="${locale === 'es' ? 'Idioma' : 'Language'}"><a href="${languageRoute('en')}" lang="en"${locale === 'en' ? ' aria-current="true"' : ''}>EN</a><a href="${languageRoute('es')}" lang="es"${locale === 'es' ? ' aria-current="true"' : ''}>ES</a></span></nav><span class="header-spacer"></span><a class="site-search" href="${basePath}model/explorer.html?search=1" aria-label="Search the product"><svg aria-hidden="true" viewBox="0 0 20 20"><circle cx="8.5" cy="8.5" r="5.5"></circle><path d="m13 13 4 4"></path></svg><span>Search the product</span><kbd>/</kbd></a><div class="appearance-controls" role="group" aria-label="${locale === 'es' ? 'Apariencia' : 'Appearance'}"><button type="button" data-appearance-choice="light" aria-label="${locale === 'es' ? 'Tema claro' : 'Light theme'}" title="${locale === 'es' ? 'Tema claro' : 'Light theme'}" aria-pressed="false">☼</button><button type="button" data-appearance-choice="dark" aria-label="${locale === 'es' ? 'Tema oscuro' : 'Dark theme'}" title="${locale === 'es' ? 'Tema oscuro' : 'Dark theme'}" aria-pressed="false">☾</button><button type="button" data-appearance-choice="auto" aria-label="${locale === 'es' ? 'Tema del sistema' : 'System theme'}" title="${locale === 'es' ? 'Tema del sistema' : 'Theme follows system'}" aria-pressed="true">▣</button></div><button class="mobile-menu-toggle" type="button" aria-controls="primary-navigation" aria-expanded="false" aria-label="${locale === 'es' ? 'Abrir menú' : 'Open menu'}"><svg aria-hidden="true" viewBox="0 0 20 20"><path class="menu-line menu-line-top" d="M3 5h14"/><path class="menu-line menu-line-middle" d="M3 10h14"/><path class="menu-line menu-line-bottom" d="M3 15h14"/></svg></button><a class="site-keys" href="${basePath}model/explorer.html?keys=1" aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)">⌨</a></div></header>`;
  const footer = `<footer class="site-footer"><div class="footer-inner"><div class="footer-identities"><a class="footer-productshape" href="${rootHref}"><img src="${basePath}assets/productshape-branding.png" width="190" height="95" alt="ProductShape — Product Definition as Code"></a><a class="footer-methodology" href="https://github.com/product-definition-as-code/spec"><img src="${basePath}assets/pdac-logo.png" width="54" height="54" alt="PDaC logo"><span><strong>Product Definition as Code</strong><small>${escapeHtml(siteText[locale].footer.methodology)}</small></span></a></div><div class="footer-meta"><p>${escapeHtml(siteText[locale].footer.line)}<br><span>${siteText[locale].footer.license}</span></p><div class="footer-links"><a href="https://github.com/product-definition-as-code/spec">${escapeHtml(siteText[locale].footer.spec)}</a><a href="${repoUrl}">${escapeHtml(siteText[locale].footer.repo)}</a></div></div></div></footer>`;
  const menuScript = `const mobileMenuButton=document.querySelector('.mobile-menu-toggle');const primaryNavigation=document.querySelector('#primary-navigation');const mobileMenuQuery=matchMedia('(max-width: 64rem)');function closeMobileMenu(returnFocus=false){mobileMenuButton.setAttribute('aria-expanded','false');mobileMenuButton.setAttribute('aria-label','${locale === 'es' ? 'Abrir menú' : 'Open menu'}');primaryNavigation.classList.remove('is-open');if(returnFocus)mobileMenuButton.focus();}mobileMenuButton.addEventListener('click',()=>{const isOpen=mobileMenuButton.getAttribute('aria-expanded')==='true';if(isOpen){closeMobileMenu();return;}mobileMenuButton.setAttribute('aria-expanded','true');mobileMenuButton.setAttribute('aria-label','${locale === 'es' ? 'Cerrar menú' : 'Close menu'}');primaryNavigation.classList.add('is-open');});primaryNavigation.addEventListener('click',event=>{if(event.target.closest('a'))closeMobileMenu();});document.addEventListener('click',event=>{if(mobileMenuButton.getAttribute('aria-expanded')==='true'&&!event.target.closest('.header-inner'))closeMobileMenu();});document.addEventListener('keydown',event=>{if(event.key==='Escape'&&mobileMenuButton.getAttribute('aria-expanded')==='true')closeMobileMenu(true);});mobileMenuQuery.addEventListener('change',event=>{if(!event.matches)closeMobileMenu();});`;
  return `<!doctype html>\n<html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="description" content="${escapeAttribute(description)}"><meta property="og:title" content="${escapeAttribute(title)}"><meta property="og:description" content="${escapeAttribute(description)}"><meta property="og:type" content="website"><title>${escapeHtml(title)}</title><link rel="icon" href="${basePath}assets/productshape-icon.png" type="image/png"><link rel="stylesheet" href="${asset}"><link rel="canonical" href="${siteOrigin}${basePath}${localizedPath}"></head><body>${header}<main id="main">${body}</main>${footer}<script>${menuScript}const appearanceKey='productshape-appearance';const appearanceRoot=document.documentElement;const appearanceButtons=document.querySelectorAll('[data-appearance-choice]');function setAppearance(choice){if(choice==='auto')appearanceRoot.removeAttribute('data-appearance');else appearanceRoot.setAttribute('data-appearance',choice);localStorage.setItem(appearanceKey,choice);appearanceButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.appearanceChoice===choice)));}const savedAppearance=localStorage.getItem(appearanceKey)||'auto';setAppearance(savedAppearance);appearanceButtons.forEach(button=>button.addEventListener('click',()=>setAppearance(button.dataset.appearanceChoice)));</script></body></html>\n`;
}

function renderHome(words, locale) {
  const home = words.home;
  const start = `${basePath}${locale}/get-started/`;
  const model = `${basePath}${locale}/model/`;
  const engineering = `${basePath}en/engineering/`;
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
  return `<svg class="workflow-graphic" viewBox="0 0 1080 188" role="img" aria-labelledby="flow-title flow-desc"><title id="flow-title">${title}</title><desc id="flow-desc">${locale === 'es' ? 'Un flujo circular conecta los archivos canónicos con los consumidores y la revisión humana.' : 'A loop connects canonical files to consumers and human review.'}</desc><defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#173b67"/></marker></defs><path d="M250 92 H320 M510 92 H580 M770 92 H840" fill="none" stroke="#173b67" stroke-width="2" marker-end="url(#arrow)"/><path d="M936 130 C900 177 170 177 140 130" fill="none" stroke="#385b82" stroke-width="1.5" stroke-dasharray="5 6" marker-end="url(#arrow)"/><g fill="#ffffff" stroke="#b7c9dc"><rect x="42" y="48" width="208" height="84"/><rect x="320" y="48" width="190" height="84"/><rect x="580" y="48" width="190" height="84"/><rect x="840" y="48" width="198" height="84"/></g><g fill="#173b67" font-family="monospace" font-size="12" font-weight="700"><text x="58" y="76">01</text><text x="336" y="76">02</text><text x="596" y="76">03</text><text x="856" y="76">04</text></g><g fill="#173b67" font-family="system-ui, sans-serif" font-size="15" font-weight="650"><text x="58" y="105">${escapeHtml(labels[0])}</text><text x="336" y="105">${escapeHtml(labels[1])}</text><text x="596" y="105">${escapeHtml(labels[2])}</text><text x="856" y="105">${escapeHtml(labels[3])}</text></g><text x="540" y="174" text-anchor="middle" fill="#385b82" font-family="system-ui, sans-serif" font-size="12">${locale === 'es' ? 'La revisión humana mantiene la definición aceptada bajo control.' : 'Human review keeps the accepted definition in control.'}</text></svg>`;
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
  const guides = words.guides.items
    .map(
      (guide) =>
        `<li><a href="${basePath}${words.languageName === 'Español' ? 'es' : 'en'}/guides/${guide.slug}/"><span>${escapeHtml(guide.label)} →</span><strong>${escapeHtml(guide.title)}</strong><p>${escapeHtml(guide.description)}</p></a></li>`,
    )
    .join('');
  return `<section class="page-hero"><div class="narrow"><p class="eyebrow">${escapeHtml(words.start.eyebrow)}</p><h1>${escapeHtml(words.start.title)}</h1><p class="lead">${escapeHtml(words.start.intro)}</p></div></section><section class="section"><div class="narrow"><article class="content-section"><h2>${escapeHtml(words.start.installTitle)}</h2><p>${escapeHtml(words.start.initText)}</p>${code(words.start.initCode)}</article><article class="content-section"><h2>${escapeHtml(words.start.authorTitle)}</h2><p>${escapeHtml(words.start.authorText)}</p></article><article class="content-section"><h2>${escapeHtml(words.start.acceptTitle)}</h2><p>${escapeHtml(words.start.acceptText)}</p></article><article class="content-section"><h2>${escapeHtml(words.start.citeTitle)}</h2><p>${escapeHtml(words.start.citeText)}</p>${code(words.start.citeCode)}</article><div class="callout"><p>${escapeHtml(words.start.releaseNote)}</p></div><section class="guide-selection"><p class="eyebrow">${escapeHtml(words.guides.eyebrow)}</p><h2>${escapeHtml(words.guides.title)}</h2><p>${escapeHtml(words.guides.intro)}</p><ol>${guides}</ol></section><div class="link-list"><a href="${repoFile('packages/cli/README.md', '#the-governed-citation-first-walkthrough')}">${escapeHtml(words.start.walkthrough)} →</a><a href="${repoFile('docs/adoption/existing-openspec-repository.md')}">${escapeHtml(words.guides.openSpec)} →</a><a href="${repoFile('docs/adoption/existing-speckit-repository.md')}">${escapeHtml(words.guides.specKit)} →</a></div></div></section>`;
}

function renderGuide(guide, markdown, words) {
  const intro =
    words.languageName === 'Español'
      ? '<div class="callout guide-language-note"><p>El contenido de esta guía se mantiene en inglés. Puedes cambiar el idioma para volver a la página de inicio o consultar el texto fuente en el repositorio.</p></div>'
      : '';
  const content = markdown.replace(/^# .*?(?:\r?\n)+/u, '').trim();
  const source = `${repoUrl}/blob/main/docs/adoption/${guide.file}`;
  return `<section class="page-hero guide-hero"><div class="wrap"><p class="breadcrumbs"><a href="${basePath}${words.languageName === 'Español' ? 'es' : 'en'}/get-started/">${escapeHtml(words.start.eyebrow)}</a> / ${escapeHtml(words.guides.items.find((item) => item.slug === guide.slug).label)}</p><p class="eyebrow">${escapeHtml(words.guides.eyebrow)}</p><h1>${escapeHtml(words.guides.items.find((item) => item.slug === guide.slug).title)}</h1><p class="lead">${escapeHtml(words.guides.items.find((item) => item.slug === guide.slug).description)}</p></div></section><section class="section guide-section"><article class="guide-content">${intro}${markdownToHtml(content, `adoption:${words.languageName === 'Español' ? 'es' : 'en'}:${guide.slug}`)}<p class="guide-source"><a href="${source}" rel="external">${escapeHtml(words.guides.source)} →</a></p></article></section>`;
}

function renderEngineeringSidebar(activeSlug = '') {
  const nav = sections
    .map(
      (item) =>
        `<li><a href="${basePath}en/engineering/${item.slug}/" data-section="${item.number}"${item.slug === activeSlug ? ' aria-current="page"' : ''}><span class="engineering-chev" aria-hidden="true">›</span><span class="engineering-token"><svg class="ic" viewBox="0 0 16 16" aria-hidden="true">${sectionIcons[item.number]}</svg>${item.token}</span><span class="engineering-nav-title">${escapeHtml(item.title)}</span></a></li>`,
    )
    .join('');
  return `<aside class="engineering-nav" aria-label="Engineering sections"><header class="engineering-nav-head"><h2>ENGINEERING</h2><span>${sections.length}</span></header><div class="engineering-listwrap"><ol>${nav}</ol></div><a class="engineering-attribution" href="${basePath}en/" title="Build with ProductShape v${packageJson.version}"><span class="engineering-info" aria-hidden="true">i</span><span>Build with ProductShape v${packageJson.version}</span></a></aside>`;
}

function renderEngineeringLanding() {
  const cards = sections
    .map(
      (item) =>
        `<a class="engineering-card" data-section="${item.number}" href="${basePath}en/engineering/${item.slug}/"><span class="engineering-card-icon"><svg class="ic" viewBox="0 0 16 16" aria-hidden="true">${sectionIcons[item.number]}</svg></span><span class="engineering-card-copy"><span class="engineering-card-code">${item.token}</span><strong>${escapeHtml(item.title)}</strong><span class="engineering-card-description">${escapeHtml(item.description)}</span></span></a>`,
    )
    .join('');
  return `<div class="engineering-layout">${renderEngineeringSidebar()}<section class="engineering-content engineering-overview-content"><div class="engineering-overview-inner"><header class="engineering-overview-heading"><h1>Architecture Documentation</h1><p>Explore the product architecture through its goals, constraints, structures, decisions, and shared vocabulary.</p></header><div class="engineering-cards">${cards}</div><ul class="engineering-legend" aria-label="Section color groups"><li><span class="engineering-legend-swatch" data-family="requirements" aria-hidden="true"></span>Requirements &amp; quality</li><li><span class="engineering-legend-swatch" data-family="structures" aria-hidden="true"></span>Structures &amp; views</li><li><span class="engineering-legend-swatch" data-family="concepts" aria-hidden="true"></span>Concepts, technologies, decisions</li><li><span class="engineering-legend-swatch" data-family="reference" aria-hidden="true"></span>Risks &amp; reference</li></ul></div></section></div>`;
}

function renderArchitecturePage(section) {
  const sectionIndex = sections.indexOf(section);
  const previous = sections[sectionIndex - 1];
  const next = sections[sectionIndex + 1];
  const sourceUrl = `${repoUrl}/blob/main/docs/architecture/${section.name}`;
  const adjacentLink = (item, direction) =>
    item
      ? `<a class="nav-adjacent nav-${direction}" href="${basePath}en/engineering/${item.slug}/"><span>${direction === 'previous' ? '← Previous' : 'Next →'}</span><strong>${item.number} · ${escapeHtml(item.title)}</strong></a>`
      : `<span class="nav-adjacent nav-${direction} disabled" aria-hidden="true"></span>`;
  return `<div class="engineering-layout">${renderEngineeringSidebar(section.slug)}<article class="engineering-content"><div class="engineering-content-inner"><h1 class="engineering-title">${escapeHtml(section.title)}</h1>${section.html}<div class="engineering-endmatter"><p class="source-stamp">${escapeHtml(revision)}</p><p class="link-list"><a href="${sourceUrl}">Markdown source on GitHub →</a></p><div class="article-pagination">${adjacentLink(previous, 'previous')}${adjacentLink(next, 'next')}</div></div></div></article></div>`;
}

function renderModel(words) {
  const src = `${basePath}model/explorer.html`;
  return `<section class="page-hero"><div class="wrap"><p class="eyebrow">${escapeHtml(words.model.eyebrow)}</p><h1>${escapeHtml(words.model.title)}</h1><p class="lead">${escapeHtml(words.model.intro)}</p><div class="model-launch"><p>${escapeHtml(words.model.notice)}</p><div class="link-list"><a class="button" href="${src}" target="_blank" rel="noopener">${escapeHtml(words.model.open)} ↗</a><a href="${repoUrl}/tree/main/docs/product/model">${escapeHtml(words.model.source)} →</a></div></div></div></section>`;
}

function redirectPage(destination, title, message = 'The model explorer moved to') {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${destination}"><meta name="robots" content="noindex"><title>${escapeHtml(title)}</title></head><body><p>${escapeHtml(message)} <a href="${destination}">${escapeHtml(title)}</a>.</p></body></html>`;
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

function markdownToHtml(markdown, sourceName, headingOffset = 1) {
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
        `<h${Math.min(level + headingOffset, 6)} id="${id}">${inlineMarkdown(text, sourceName)}</h${Math.min(level + headingOffset, 6)}>`,
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
  if (sourceName.startsWith('adoption:')) {
    const [, locale, guideSlug] = sourceName.split(':');
    const linkedGuide = clean.match(/(?:^|\/)(greenfield|brownfield|existing-repository)\.md$/u);
    if (linkedGuide) {
      const fragment = href.includes('#') ? `#${href.slice(href.indexOf('#') + 1)}` : '';
      return `${basePath}${locale}/guides/${linkedGuide[1]}/${fragment}`;
    }
    const guideFile = adoptionGuides.find((item) => item.slug === guideSlug).file;
    const sourceUrl = new URL(clean, `${repoUrl}/blob/main/docs/adoption/${guideFile}`);
    if (href.includes('#')) sourceUrl.hash = href.slice(href.indexOf('#') + 1);
    return sourceUrl.toString();
  }
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
