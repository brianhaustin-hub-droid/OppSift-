# Technical SEO audit — built output

Date: 28 November 2026
Method: `npm run build` then automated inspection of the generated `dist/` documents.
Everything below was measured; nothing is estimated.

---

## 1. Rendering and crawlability

`scripts/prerender-seo.mjs` runs after `vite build`. For every public route in
`src/seo/site-content.json` it writes a full document containing the route's metadata,
JSON-LD and a semantic text snapshot inside `<div id="root">`. React replaces the snapshot
on mount.

| Check | Result |
| --- | --- |
| Prerendered routes | **15** |
| Visible text per route (snapshot, tags stripped) | `/` 5,707 chars · `/official-data-sources` 2,945 · `/global-government-tenders` 1,497 · `/international-grants` 1,432 · `/commercial-rfp-opportunities` 1,289 · `/security` 1,252 · `/about` 1,230 · `/docs` 1,112 · `/getting-started` 906 · `/contact` 900 · `/legal/dpa` 841 · `/legal/privacy` 807 · `/legal/terms` 789 · `/legal/cookies` 740 · `/status` 661 |
| SPA fallback behaviour | `_redirects` lists each prerendered route before `/* /index.html 200`, so Pages serves the document first |
| JavaScript required for content | No — headings, copy and internal links are in the HTML |

## 2. Metadata

| Check | Result |
| --- | --- |
| Unique `<title>` per route | 15/15 unique |
| Title lengths | 15–72 characters (`Contact OppSift` and `Documentation` are intentionally short) |
| Unique meta description per route | 15/15 |
| Description lengths | 92–178 characters (three exceed the ~160-character display window; Google truncates display only) |
| Canonical | Self-referencing absolute URL on all 15 indexable routes; none on application or share routes |
| Robots meta | `index,follow` on the 15 public pages; the client sets `noindex,nofollow` on every application route |
| Open Graph / Twitter | `og:type`, `og:site_name`, `og:title`, `og:description`, `og:url`, `og:image` (1200×630), `twitter:card=summary_large_image` |
| Social image | `public/assets/og/oppsift-global-opportunity-intelligence.jpg` (41 KB) |

## 3. Structured data

| Check | Result |
| --- | --- |
| JSON-LD blocks parsed | **15/15 valid JSON** |
| Types present | `Organization`, `WebSite` everywhere; `SoftwareApplication` on `/`; `BreadcrumbList` on every non-home route; `FAQPage` on `/` |
| Fabricated fields | None — no `aggregateRating`, `review`, `offers`, `award` or customer claims |
| Opportunity data in JSON-LD | None |

## 4. Sitemap, robots and internal linking

| Check | Result |
| --- | --- |
| `sitemap.xml` URLs | 15, each with `lastmod`, `changefreq`, `priority` |
| Workspace / share URLs in sitemap | **None** (`discover`, `dashboard`, `opportunity`, `/o/` all absent) |
| `robots.txt` | `User-agent: *`, `Allow: /`, 24 `Disallow` rules for workspace, auth, admin and `/o/`, plus `Sitemap:` |
| Internal links in snapshots | Each route links to the homepage sections, related guides, about, contact, docs, security and legal pages |
| Links to private routes in public HTML | **None found** (checked `href="/opportunity/`, `/discover/`, `/dashboard/`, `/o/`, and any UUID) |

## 5. Heading hierarchy and semantics

| Check | Result |
| --- | --- |
| Exactly one `<h1>` per prerendered route | 15/15 |
| Section order | `header` → `main` → `footer`; sections use `<h2>`, cards `<h3>` |
| Language | `<html lang="en">` |
| Image alternatives | Hero photograph is decorative (`alt=""`, `aria-hidden`); logo alt text present; no information conveyed only by an image |

## 6. Indexing boundaries

Indexable: `/`, four guides, `/about`, `/contact`, `/docs`, `/getting-started`,
`/security`, four legal pages, `/status`.

Not indexable: `/register`, `/login`, `/verify-email`, `/reset-password`, `/auth*`,
`/onboarding`, every workspace route, `/admin*`, `/o/:id`, and any unknown path (the client
sets `noindex` for unmapped routes).

## 7. JavaScript payload (measured from the build output)

| Asset | Size | Gzip |
| --- | --- | --- |
| `index-*.js` (public site) | 548.27 kB | 133.09 kB |
| `index-*.css` | 77.00 kB | 13.62 kB |
| `WorkspaceApp-*.js` (lazy) | 21.73 kB | 5.93 kB |
| `AuthApp-*.js` (lazy) | 47.30 kB | 10.66 kB |

Before this work the single entry bundle was **1,224.83 kB (291.51 kB gzip)**. Splitting the
authenticated application, lazily loading the auth/onboarding module and deleting the
retired marketing page components reduced the public entry to the figure above (−55% raw,
−54% gzip) and removed the workspace data layer from the marketing page entirely.

The public entry no longer includes a database client (548.27 kB vs 743.95 kB once the last
`formatLiveAge` import was moved out of the module that owns the client). Statistics come from
`public/platform-stats.json`, an aggregate snapshot written before the build by
`scripts/build-public-stats.mjs`; the marketing pages make no database request, so no
anonymous token, PostgREST client or schema handling ships to visitors. The remaining
weight is React, the icon set, the i18n catalogs and the page code. (Measurements are from
`vite build` output; no field data is available.)

## 8. Image and font loading

- The first hero photograph is preloaded with `fetchpriority="high"` and `preconnect` to the
  image host; only the next two photographs are prefetched.
- All images are served by their publishers at a 1920 px thumbnail size; the layout uses
  `object-fit: cover`, so no layout shift occurs when an image arrives.
- Fonts are loaded from Google Fonts with `display=swap` and preconnect, so text renders
  immediately in the fallback face.
- `prefers-reduced-motion` disables the image sequence and the source marquee.

## 9. Not measured

- Lighthouse, Core Web Vitals field data and CrUX: no measurement environment available.
- Search Console indexing, crawl stats and query data: no verified property.
- Keyword volumes and difficulty: no keyword tool available; see the keyword map's
  method note.

These are reported as gaps, not as passes.
