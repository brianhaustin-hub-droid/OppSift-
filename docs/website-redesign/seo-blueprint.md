# SEO blueprint — OppSift public website

Date: 28 November 2026

This blueprint defines how the public site is meant to be discovered: the rendering
approach, the page architecture, the intent each page serves, and the measurement steps
that remain for the operator. Technical verification is in
[technical-seo-audit.md](./technical-seo-audit.md); keyword mapping is in
[keyword-map.md](./keyword-map.md).

---

## 1. Strategy in one paragraph

OppSift sells a category that is described by a handful of stable phrases (global
government tenders, international grants, procurement intelligence, official data
sources). The site therefore concentrates authority on one strong homepage plus a small
number of genuinely distinct guides, instead of generating dozens of thin pages. Every
public page must answer a real question with information OppSift can actually verify from
its own registry and database, and every public page must be readable without JavaScript.

## 2. Rendering

- The application remains a Vite + React SPA (no framework migration).
- `scripts/prerender-seo.mjs` runs after `vite build` and writes a complete static
  document for every public route: metadata, JSON-LD and a semantic text snapshot of the
  page. React replaces the snapshot on mount.
- Cloudflare Pages serves the prerendered document first via explicit `_redirects` entries
  in front of the SPA fallback.
- Crawlers therefore receive content, headings and internal links without executing
  JavaScript. Interactive features still require JavaScript, which is normal and stated in
  the HTML.

## 3. Page architecture

| URL | Purpose | Primary intent | Indexable |
| --- | --- | --- | --- |
| `/` | Consolidated marketing homepage (5 sections) | Category + brand | yes |
| `/global-government-tenders` | Procurement guide | Transactional / informational: find tenders | yes |
| `/international-grants` | Grants guide | Informational: find funding | yes |
| `/official-data-sources` | Data ecosystem by category (no provider names) | Trust / due diligence | yes |
| `/commercial-rfp-opportunities` | Commercial guide | Informational: supplier opportunities | yes |
| `/about` | Company and principles | Navigational / trust | yes |
| `/contact` | Contact routes | Navigational | yes |
| `/docs` | Record structure and search | Informational: how the product works | yes |
| `/getting-started` | Onboarding steps | Transactional support | yes |
| `/security` | Security and provenance | Trust | yes |
| `/legal/privacy`, `/legal/terms`, `/legal/cookies`, `/legal/dpa` | Legal | Compliance | yes (low priority) |
| `/status` | Observed service status | Navigational | yes (low priority) |
| `/register`, `/login`, `/onboarding`, `/reset-password`, `/verify-email` | Account flows | — | **noindex** |
| `/dashboard`, `/discover*`, `/opportunity/*`, `/saved*`, `/my-opportunities*`, `/intelligence`, `/alerts`, `/notifications`, `/analytics`, `/reports`, `/teams`, `/settings*`, `/billing`, `/checkout`, `/admin*`, `/support` | Workspace | — | **noindex + robots disallow** |
| `/o/:id` | Shared notice | — | **noindex + robots disallow** |

Deliberately **not** created: mass-generated country pages, city pages, "tenders in every
country" permutations, or a page per source. They would be thin, they would imply coverage
OppSift does not have, and they would compete with the market section that carries real
evidence.

## 4. On-page rules

1. One `<h1>` per page; section headings are `<h2>`, cards `<h3>`.
2. Titles are unique, under ~65 characters where possible, and name the topic before the
   brand. Descriptions are unique and describe the page, not the company slogan.
3. Every indexable page has a self-referencing canonical on
   `https://getoppsift.com`; application and share routes have none.
4. Internal links use descriptive anchor text. The homepage links to each guide; each
   guide links back to the homepage sections and to related guides.
5. Images: the hero is decorative (`alt=""`, `aria-hidden`); the logo and emblem carry
   descriptive alt text. No image is used to carry information that is absent from text.
6. No page claims customer counts, market coverage or source integrations that the
   database does not support.

## 5. Structured data

- `Organization` and `WebSite` on every page (base graph in `index.html`, page graph
  injected at build time).
- `SoftwareApplication` on the homepage.
- `BreadcrumbList` on every non-home page.
- `FAQPage` on the homepage, built from the same eight questions rendered on the page.

Not used: `AggregateRating`, `Review`, `Offer` (checkout is not enabled), `Event`,
`JobPosting`. Publishing a rating or an offer would require data OppSift does not have.
FAQ rich results are now restricted by Google to a narrow set of authoritative sites; the
markup is accurate structured data, not a promise of a rich snippet.

## 6. International SEO

- `<html lang="en">`; content is English.
- Country names and ISO alpha-2 codes come from the platform registry
  (`global_countries`), so naming is consistent across the site and the product.
- Currencies are shown in the market's own ISO 4217 code; timezones are not asserted for
  the public pages beyond what the registry holds.
- **No hreflang is emitted.** The interface has translations, but there are no localised
  URLs, and hreflang without genuine regional alternatives would be wrong. If localised
  routes are added later, each must get its own URL, canonical and reciprocal hreflang set.
- No claim of worldwide coverage: the Markets section reports registry, sources and
  records separately.

## 7. Measurement readiness

Prepared but not activated, because no analytics property, tag ID or verification token is
available in this environment and consent handling is a product decision:

1. **Google Search Console** — verify the `getoppsift.com` property (DNS or HTML file),
   submit `https://getoppsift.com/sitemap.xml`, then watch Page indexing, Core Web Vitals
   and Enhancements (breadcrumbs).
2. **Bing Webmaster Tools** — import from Search Console or verify by DNS, submit the same
   sitemap.
3. **Google Analytics 4** — add the tag only after a consent mechanism exists; the public
   site currently sets no analytics or advertising cookies. Recommended events: `sign_up`
   (after verification), `begin_onboarding`, `pricing_plan_view`, `cta_click` with a
   section parameter, `outbound_source_click`.
4. **Baseline** — capture the checks in the technical audit as the "before" record. Do not
   report ranking or traffic improvements without Search Console data covering a stated
   period.

## 8. Content plan (next 6–10 pieces)

Publish only when the piece can cite real sources and be maintained. Suggested order:

1. How public procurement works: tender, RFQ, framework, lots — and what changes per market.
2. How to read a tender notice: the fields that decide whether to bid.
3. How to assess grant eligibility before writing an application.
4. How OCDS publications differ from portal scraping, and why provenance matters.
5. What "market coverage" should mean for an opportunity platform (registry, sources,
   records).
6. How to run a cross-border bid pipeline with a small team.
7. A methodology note: how OppSift's live source checks work and what "answered" means.

Each article: one intent, original explanation, real examples from public sources, links
to the relevant product section, and a visible review date. No AI filler, no invented
statistics, no keyword-stuffed country lists.
