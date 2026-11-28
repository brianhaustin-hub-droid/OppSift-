#!/usr/bin/env node
/**
 * Build-time SEO prerender for the public website.
 *
 * The application stays a Vite + React SPA, so search crawlers would otherwise
 * receive an empty application shell. This script runs after `vite build` and,
 * for every public route in src/seo/site-content.json, writes a static HTML
 * document with:
 *
 *   - the route's title, description, canonical, robots and social metadata
 *   - its Schema.org JSON-LD graph
 *   - a semantic, accessible text snapshot of the page content
 *
 * The snapshot is replaced when the React application mounts, so there is one
 * document per route for crawlers and one application for visitors. It also
 * writes sitemap.xml, robots.txt and the explicit _redirects entries that let
 * Cloudflare Pages serve each prerendered document before the SPA fallback.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'dist');
const content = JSON.parse(await readFile(join(root, 'src/seo/site-content.json'), 'utf8'));
const site = content.site;
const shell = await readFile(join(dist, 'index.html'), 'utf8');

const BUILD_DATE = new Date().toISOString().slice(0, 10);

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function jsonLdFor(path, names) {
  const graph = [];
  for (const name of names ?? ['Organization', 'WebSite']) {
    if (name === 'Organization') {
      graph.push({
        '@type': 'Organization',
        '@id': `${site.origin}/#organization`,
        name: site.name,
        url: site.origin,
        logo: `${site.origin}${site.logo}`,
        description:
          'OppSift is a global opportunity intelligence platform for official tenders, grants and commercial notices.',
        email: site.contactEmail,
      });
    } else if (name === 'WebSite') {
      graph.push({
        '@type': 'WebSite',
        '@id': `${site.origin}/#website`,
        url: site.origin,
        name: site.name,
        publisher: { '@id': `${site.origin}/#organization` },
        inLanguage: 'en',
      });
    } else if (name === 'SoftwareApplication') {
      graph.push({
        '@type': 'SoftwareApplication',
        name: site.name,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web browser',
        url: site.origin,
        description: site.defaultDescription,
        publisher: { '@id': `${site.origin}/#organization` },
      });
    } else if (name === 'BreadcrumbList') {
      const trail = [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${site.origin}/` }];
      if (path !== '/') {
        trail.push({
          '@type': 'ListItem',
          position: 2,
          name: (content.pages[path].title || '').split(' — ')[0].split(' | ')[0],
          item: `${site.origin}${path}`,
        });
      }
      graph.push({ '@type': 'BreadcrumbList', itemListElement: trail });
    } else if (name === 'FAQPage') {
      graph.push({
        '@type': 'FAQPage',
        mainEntity: content.faq.map((entry) => ({
          '@type': 'Question',
          name: entry.question,
          acceptedAnswer: { '@type': 'Answer', text: entry.answer },
        })),
      });
    }
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}

const SNAPSHOT_STYLE = `
#root > .prerender{font-family:"Public Sans",-apple-system,BlinkMacSystemFont,sans-serif;color:#172033;background:#f6f5f9;line-height:1.6}
#root > .prerender .wrap{max-width:72rem;margin:0 auto;padding:0 1.25rem}
#root > .prerender header{border-bottom:1px solid #e2e8f0;background:#fff;padding:1rem 0}
#root > .prerender .brand{font-weight:700;font-size:1.15rem;color:#541b32;text-decoration:none}
#root > .prerender nav a{margin-right:1rem;color:#526070;text-decoration:none;font-size:.9rem}
#root > .prerender .hero{background:#251019;color:#fff;padding:3.5rem 0}
#root > .prerender .eyebrow{font-size:.7rem;letter-spacing:.16em;text-transform:uppercase;color:#f0b8c6;margin:0}
#root > .prerender h1{font-size:2.2rem;line-height:1.15;margin:.6rem 0 0;font-weight:700}
#root > .prerender .lead{margin-top:1rem;max-width:46rem;color:#e7dde1}
#root > .prerender main{padding:2.5rem 0}
#root > .prerender section{margin-bottom:2rem}
#root > .prerender h2{font-size:1.2rem;margin:0 0 .4rem}
#root > .prerender p{margin:.35rem 0;color:#526070;font-size:.95rem}
#root > .prerender ul{display:flex;flex-wrap:wrap;gap:.5rem 1.2rem;list-style:none;padding:0;margin:.75rem 0}
#root > .prerender ul a{color:#541b32;font-weight:600;font-size:.9rem}
#root > .prerender footer{border-top:1px solid #e2e8f0;background:#fff;padding:1.5rem 0;font-size:.8rem;color:#64748b}
`;

function snapshot(path, meta) {
  const navLinks = content.nav
    .map((item) => `<a href="${path === '/' ? `#${item.section}` : `/#${item.section}`}">${escapeHtml(item.label)}</a>`)
    .join('');

  const sections = (meta.sections ?? [])
    .map(
      (section) =>
        `<section><h2>${escapeHtml(section.heading)}</h2><p>${escapeHtml(section.body)}</p></section>`,
    )
    .join('');

  const links = (meta.links ?? [])
    .map((link) => `<li><a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a></li>`)
    .join('');

  const facts = (content.faq ?? [])
    .slice(0, path === '/' ? 8 : 0)
    .map(
      (entry) =>
        `<section><h2>${escapeHtml(entry.question)}</h2><p>${escapeHtml(entry.answer)}</p></section>`,
    )
    .join('');

  const categories =
    path === '/'
      ? `<section><h2>Opportunity categories</h2><ul>${content.categories
          .map(
            (category) =>
              `<li><a href="${escapeHtml(category.route)}">${escapeHtml(category.title)}</a> — ${escapeHtml(
                category.description,
              )}</li>`,
          )
          .join('')}</ul></section>`
      : '';

  // The public site describes its data ecosystem by broad category. Individual
  // publisher identities, endpoints and per-provider status are internal.
  const sources =
    path === '/official-data-sources' || path === '/'
      ? `<section><h2>${escapeHtml(content.sources.title)}</h2><p>${escapeHtml(
          content.sources.intro,
        )}</p><ul>${content.sources.categories
          .map((category) => `<li>${escapeHtml(category.name)} — ${escapeHtml(category.detail)}</li>`)
          .join('')}</ul><p>${escapeHtml(content.sources.disclaimer)}</p></section>`
      : '';

  return `<div class="prerender">
<div class="wrap">
<header>
<a class="brand" href="/">OppSift</a>
<nav aria-label="Primary">${navLinks}<a href="/login">Sign In</a> <a href="/register">Get Started</a></nav>
</header>
<div class="hero"><div class="wrap">
<p class="eyebrow">Global Opportunity Intelligence</p>
<h1>${escapeHtml(meta.h1)}</h1>
<p class="lead">${escapeHtml(meta.lead)}</p>
</div></div>
<main class="wrap">
${sections}
${categories}
${sources}
${facts}
<section><h2>Continue</h2><ul>${links}<li><a href="/about">About OppSift</a></li><li><a href="/contact">Contact</a></li><li><a href="/docs">Documentation</a></li><li><a href="/security">Security and provenance</a></li></ul></section>
</main>
<footer><div class="wrap">© ${new Date().getFullYear()} OppSift. Official-source opportunity intelligence. <a href="/legal/privacy">Privacy</a> · <a href="/legal/terms">Terms</a> · <a href="/legal/cookies">Cookies</a> · <a href="/legal/dpa">DPA</a></div></footer>
</div>
</div>`;
}

function replaceMeta(html, path, meta) {
  const canonical = `${site.origin}${path === '/' ? '/' : path}`;
  let out = html;

  out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(meta.title)}</title>`);
  out = out.replace(
    /<meta\s+name="description"[\s\S]*?\/>/,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
  );
  out = out.replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${canonical}" />`);
  out = out.replace(
    /<meta property="og:title" content="[^"]*" \/>/,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
  );
  out = out.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s+\/>/,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
  );
  out = out.replace(
    /<meta property="og:url" content="[^"]*" \/>/,
    `<meta property="og:url" content="${canonical}" />`,
  );
  out = out.replace(
    /<meta name="twitter:title" content="[^"]*" \/>/,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
  );
  out = out.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s+\/>/,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
  );

  const schema = JSON.stringify(jsonLdFor(path, meta.jsonLd)).replaceAll('</', '<\\/');
  out = out.replace(
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script type="application/ld+json">${schema}</script>`,
  );

  out = out.replace(
    /<div id="root"><\/div>/,
    `<div id="root">${snapshot(path, meta)}</div>`,
  );
  out = out.replace('</head>', `<style>${SNAPSHOT_STYLE}</style>\n</head>`);
  return out;
}

async function writePage(path, meta) {
  const html = replaceMeta(shell, path, meta);
  const target = path === '/' ? join(dist, 'index.html') : join(dist, path, 'index.html');
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, html, 'utf8');
}

const entries = Object.entries(content.pages);
for (const [path, meta] of entries) {
  await writePage(path, meta);
}

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...entries.map(
    ([path, meta]) =>
      `  <url><loc>${site.origin}${path === '/' ? '/' : path}</loc><lastmod>${BUILD_DATE}</lastmod><changefreq>${
        meta.changefreq ?? 'monthly'
      }</changefreq><priority>${meta.priority ?? '0.5'}</priority></url>`,
  ),
  '</urlset>',
  '',
].join('\n');
await writeFile(join(dist, 'sitemap.xml'), sitemap, 'utf8');

const robots = [
  'User-agent: *',
  'Allow: /',
  '',
  '# Workspace, authentication and shared-notice routes are not public content.',
  'Disallow: /dashboard',
  'Disallow: /discover',
  'Disallow: /opportunity',
  'Disallow: /saved',
  'Disallow: /saved-searches',
  'Disallow: /search-history',
  'Disallow: /my-opportunities',
  'Disallow: /intelligence',
  'Disallow: /alerts',
  'Disallow: /notifications',
  'Disallow: /analytics',
  'Disallow: /reports',
  'Disallow: /settings',
  'Disallow: /billing',
  'Disallow: /checkout',
  'Disallow: /teams',
  'Disallow: /admin',
  'Disallow: /o/',
  'Disallow: /auth',
  'Disallow: /login',
  'Disallow: /register',
  'Disallow: /reset-password',
  'Disallow: /verify-email',
  'Disallow: /onboarding',
  '',
  `Sitemap: ${site.origin}/sitemap.xml`,
  '',
].join('\n');
await writeFile(join(dist, 'robots.txt'), robots, 'utf8');

const redirects = [
  '# Prerendered public pages are served as their own document before the SPA',
  '# fallback, so crawlers and visitors both get the complete page.',
  ...entries
    .filter(([path]) => path !== '/')
    .map(([path]) => `${path} ${path}/index.html 200`),
  '',
  '# Every other path is an application route.',
  '/* /index.html 200',
  '',
].join('\n');
await writeFile(join(dist, '_redirects'), redirects, 'utf8');

console.log(
  `Prerendered ${entries.length} public routes, sitemap.xml, robots.txt and _redirects into dist/.`,
);
