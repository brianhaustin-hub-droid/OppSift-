# Keyword and intent map — OppSift

Date: 28 November 2026

## Method and limits

Clusters and intent were derived from the product, the source registry and the pages that
now exist. **No search-volume, CPC or difficulty figure is stated anywhere in this
document, because no keyword tool was available in this environment and inventing those
numbers would be fabrication.** Before prioritising spend, pull volumes and difficulty
from a verified tool (Google Keyword Planner, Search Console once live, Bing Webmaster
Keywords, or a paid provider) and record the export date here.

Priority uses three levels:

- **P1** — primary category intent; the page must rank for this to acquire non-brand traffic.
- **P2** — supporting intent that qualifies a visitor.
- **P3** — long-tail or trust intent; useful, lower volume.

## 1. Core category

| Keyword | Intent | Geography | Priority | Target | Content required |
| --- | --- | --- | --- | --- | --- |
| global opportunity intelligence platform | Commercial investigation | Global | P1 | `/` | Category definition, capabilities, evidence of sources and coverage |
| opportunity intelligence | Commercial investigation | Global | P1 | `/` | Same, with a plain definition near the top |
| global opportunity discovery | Commercial | Global | P1 | `/` | Discovery section + category links |
| opportunity discovery platform | Commercial | Global | P1 | `/` | Comparison-friendly explanation of the workflow |
| business opportunity intelligence | Commercial | Global | P2 | `/` | B2B framing in the credibility section |
| global opportunity database | Informational / commercial | Global | P2 | `/` | Coverage table + provenance explanation |
| opportunity monitoring platform | Commercial | Global | P2 | `/#product` | Monitoring capability + how alerts work |
| AI-powered opportunity intelligence | Commercial | Global | P3 | `/#product` | Only the eligibility/intelligence framing that is actually rolling out |

## 2. Government procurement

| Keyword | Intent | Geography | Priority | Target | Content required |
| --- | --- | --- | --- | --- | --- |
| global government tenders | Commercial | Global | P1 | `/global-government-tenders` | What a tender record contains, markets with procurement sources, official sources |
| international government tenders | Commercial | Global | P1 | `/global-government-tenders` | Same page; avoid a duplicate second page |
| government procurement opportunities | Commercial | Global | P1 | `/global-government-tenders` | Category explanation + CTA to register |
| international procurement opportunities | Commercial | Global | P2 | `/global-government-tenders` | Cross-border framing, currency/procedure normalisation |
| public procurement database | Commercial | Global | P2 | `/#markets` | Coverage and record counts from the database |
| government contracts database | Commercial | Global | P2 | `/#markets` | Same, with the awards caveat |
| international tender search | Transactional | Global | P1 | `/global-government-tenders` | Search capability, filters, saved searches |
| government RFP opportunities | Commercial | Global | P2 | `/global-government-tenders` | RFP vs tender terminology |
| public sector contracts | Informational | Global | P3 | `/#opportunities` | Category section |
| global procurement intelligence | Commercial | Global | P2 | `/` | Homepage capability framing |

## 3. Grants and funding

| Keyword | Intent | Geography | Priority | Target | Content required |
| --- | --- | --- | --- | --- | --- |
| international grants database | Commercial | Global | P1 | `/international-grants` | Funder/programme fields, eligible beneficiaries, award disclosure rules |
| global funding opportunities | Commercial | Global | P1 | `/international-grants` | Same |
| international funding opportunities | Commercial | Global | P1 | `/international-grants` | Same |
| business grants | Informational | Per market | P2 | `/international-grants` | Business-eligible programmes only; do not imply universal coverage |
| NGO funding opportunities | Informational | Global | P2 | `/international-grants` | Beneficiary types and eligibility caveats |
| research grants | Informational | Global | P2 | `/international-grants` | Research and innovation calls |
| development funding opportunities | Informational | Global | P2 | `/international-grants` | Development finance and multilateral programmes |
| nonprofit grants database | Commercial | Global | P3 | `/international-grants` | Same page, nonprofit framing |
| international grant search | Transactional | Global | P2 | `/international-grants` | Search + monitoring |

## 4. Commercial opportunities

| Keyword | Intent | Geography | Priority | Target | Content required |
| --- | --- | --- | --- | --- | --- |
| commercial RFP opportunities | Commercial | Global | P2 | `/commercial-rfp-opportunities` | What commercial RFPs are, coverage limits |
| corporate RFP database | Commercial | Global | P3 | `/commercial-rfp-opportunities` | Honest coverage statement |
| supplier opportunities | Commercial | Global | P2 | `/commercial-rfp-opportunities` | Supplier registration and subcontracting |
| subcontracting opportunities | Informational | Global | P3 | `/commercial-rfp-opportunities` | How subcontract notices appear |
| commercial procurement | Informational | Global | P3 | `/#opportunities` | Category section |
| corporate procurement intelligence | Commercial | Global | P3 | `/` | Homepage |

## 5. Country-specific intent

Only markets that hold collected notices or registered sources should be named in copy.
Country names must come from the registry so they match the product. Priority for a
country phrase follows evidence, not population.

| Pattern | Example | Intent | Priority | Target today | Note |
| --- | --- | --- | --- | --- | --- |
| government tenders in {market} | government tenders in Kenya | Commercial | P2 | `/#markets` + market table | Do not create a page until that market has original, maintained content |
| {market} public procurement opportunities | Kenya public procurement opportunities | Commercial | P2 | `/#markets` | Registry name and issuing authority must be correct |
| {market} government tenders | UK government tenders | Commercial | P2 | `/global-government-tenders` | Guide covers the pattern; no per-country duplication |
| US government contracts | — | Commercial | P2 | `/global-government-tenders` | SAM.gov / Grants.gov coverage is stated per source |
| Canada government tenders | — | Commercial | P2 | `/#sources` | CanadaBuys status is shown live |
| Australian government tenders | — | Commercial | P2 | `/#sources` | AusTender status is shown live |
| European procurement opportunities | — | Commercial | P1 | `/#sources` | TED status is shown live |

Country pages were deliberately not generated. A page becomes justified when it can carry:
the registry name, the operational sources and their access method, the categories those
sources publish, the number of notices actually stored, the newest collection date, and a
maintained explanation of that market's procedure. Anything less is thin content.

## 6. Brand and navigational

| Query | Intent | Target |
| --- | --- | --- |
| OppSift | Navigational | `/` |
| OppSift pricing | Navigational | `/#pricing` |
| OppSift login / sign in | Navigational | `/login` (noindex) |
| OppSift data sources | Navigational | `/official-data-sources` |
| OppSift security | Navigational | `/security` |

## 7. Mapping rules

1. One primary keyword per page; secondary variants share the page rather than spawning a
   near-duplicate.
2. Every target must exist and be indexable. Anchor targets (`/#markets`) are sections of
   the homepage and must keep their `id`.
3. If a cluster cannot be served truthfully with current coverage, it stays unwritten.
4. Re-check this map whenever the registry changes: a market losing its sources must lose
   its supporting claims.
