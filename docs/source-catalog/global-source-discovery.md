# Global official-source discovery

Review date: 2026-11-10. This is a source discovery and access assessment,
not an activation or coverage claim. API availability is not permission to
store or commercially redistribute the resulting data.

## API and data-system assessment

| System | Geographic scope | Official interface and format | Access and pagination | Rights and attribution status | OppSift status |
|---|---|---|---|---|---|
| TED / Tenders Electronic Daily | EU and EEA procurement publications; country-specific coverage must be verified per notice | [TED API v3 docs](https://docs.ted.europa.eu/api/latest/); published-notice search/retrieval, JSON API. [eForms SDK](https://github.com/OP-TED/eForms-SDK) supplies notice schemas/resources. | Official docs describe anonymous access to published-notice search/retrieval and applications for notice analysis or reuse. OpenAPI specifies POST search, JSON body, page-number pagination up to 250 notices/page, 10,000 fields/page, and 15,000 retrievable notices per query. A live read-only request on 2026-11-10 returned HTTP 200 and three published notices. | The API documentation remains subject to TED Terms of Usage and links the legal notice. The official legal-notice URL returned HTTP 405 in this environment. Commercial downstream display, retention, attribution, linked-document rights, and exact country mapping therefore remain unverified. Anonymous API access is not treated as commercial reuse approval. | Bounded client implemented and mock-tested; live endpoint/records verified separately. Permission review pending; no OppSift persistence or customer exposure. |
| UK Find a Tender | United Kingdom | [Official REST API specification](https://www.find-tender.service.gov.uk/apidocumentation); JSON. | Official docs list notice search and other operations and state API-key authentication over HTTPS. This is not a confirmed anonymous public-search API. | Review OGL applicability and API-specific conditions, attribution, and external supplier material before reuse. | API docs reachable; no key configured, connector, or persistence. |
| UK Contracts Finder | United Kingdom | [Official API documentation](https://www.contractsfinder.service.gov.uk/apidocumentation); anonymous OCDS JSON search at `https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search`, with record lookup at `/Published/OCDS/Release/{id}`. | The published-notice search accepts `publishedFrom`, `publishedTo`, `limit`, and an opaque next-page cursor; an anonymous bounded request returned HTTP 200. Official docs describe the OCDS search and release methods. No numeric rate quota was found; the client bounds each run to 10 pages of at most 100 records, waits at least one second between pages, and retries transient failures. | The live OCDS package declares the [Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/), and the service homepage says its content is OGL v3 except where otherwise stated. The licence excludes personal data and third-party rights; responses contain contact-point fields. Do not retain contacts, raw payloads, descriptions, attachments, or unreviewed fields. Rights/privacy review remains required for title and other notice content. | Bounded client implemented and mock-tested; direct anonymous live request returned an OCDS release (an award, not an open tender) and the official OGL URI. Source remains inactive; no persistence or customer exposure. |
| World Bank Procurement Notices | Global set of World Bank Group-financed project notices; a project's country field is not national procurement coverage | [Global Data Catalog record 0037795](https://datacatalog.worldbank.org/search/dataset/0037795/world-bank-procurement-notices) links the exact [official API](https://search.worldbank.org/api/procnotices). The API returns JSON with `total`, `rows`, `os`, `page`, and `procnotices`; observed notice fields include `id`, `notice_type`, `notice_status`, `noticedate`, `submission_date`, `project_ctry_name`, `project_id`, `project_name`, `bid_reference_no`, and `bid_description`. | Bounded read-only requests on 2026-11-11 confirmed offset behavior and actual `Contract Award` and `Request for Expression of Interest` records. The API has no verified date filter, sort order, stable delta cursor, per-notice URL, numeric quota, or documented page maximum. A request at the reported final offset returned HTTP 500. Sample payloads can contain borrower HTML and contact data. The connector uses only a small application-side page/request budget and fails closed on incomplete pages. | Global catalog metadata lists CC BY 4.0. The Kenya [DS01594 page](https://financesone.worldbank.org/procurement-notices-kenya/DS01594) is a country-specific view based on DS00979; its separate Data Catalog API Explorer and daily-update details are not treated as global API behavior. Confirm license scope for all API fields, borrower-provided content, contact-data privacy, retention, and attribution before approval. The source remains unreviewed and inactive. | Native connector and pending inactive registry candidate implemented; fixture tests only. No live connector smoke test, persistence, customer exposure, or coverage claim. |
| EU Funding & Tenders Portal | EU-managed programmes and Commission procurement; not national grant coverage | [Official portal](https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/home) | The landing page describes programme and procurement opportunities; public API/export, machine access, authentication and rate limits were not established in this review. | Programme and notice-specific terms, eligibility and attribution need separate review. | Discovered web lead only; no source-specific connector or data retrieval. |
| Open Contracting Partnership Data Registry | Dataset catalogue with country-specific publishers, including Australia, India, Indonesia, Kenya, Uganda, Tanzania, Rwanda and Thailand | [Registry](https://data.open-contracting.org/); country records are cited in the country-specific sections below | Offers compiled OCDS data in bulk formats such as JSONL, Excel and CSV. This is not a real-time API to the underlying publisher. | Dataset license fields vary; a registry download is not a blanket license for original records, linked documents or automated portal access. | Metadata and selected country records were inspected; no OCDS dataset was ingested, parsed into OppSift or stored. |
| AIIB procurement opportunities | Potential global development-finance source; project-country coverage unverified | [AIIB website URL (unverified lead)](https://www.aiib.org/) | The research environment could not retrieve the candidate URL. No public API, access method, notice retrieval, or country scope was verified; no alternative access path or bypass was attempted. | Terms, attribution, retention, and any project-document rights remain unknown. | Unverified lead only; no connector, retrieval, parsing, storage, or operational claim. |
| Grants.gov | United States | [Grants.gov API resources](https://www.grants.gov/api); agency/grantor APIs are documented. | Public opportunity-search API and anonymous access were not established in this review. A direct request to a candidate search endpoint returned HTTP 403. Do not retry with guessed credentials/endpoints. | Public API-specific commercial-use and reuse terms not established. | Research pending; no connector. |
| NIH RePORTER | United States award-history data | [Official v2 project search API](https://api.reporter.nih.gov/v2/projects/search) with JSON request/response; reports funded research projects, not verified open funding calls. | Official API documentation describes project search; a GET to the search path returned HTTP 405, consistent with a method-specific API. No successful query or authentication/quota confirmation. | Reuse, retention, attribution, and customer-display terms not reviewed. | Candidate only; no connector or verified live retrieval. Do not treat award records as open grants. |
| NSF Awards API | United States award-history data | [Official JSON awards endpoint](https://api.nsf.gov/services/v1/awards.json?printFields=id%2Ctitle&offset=0&rpp=1) with offset/rpp pagination and selected fields. | Anonymous GET returned a JSON award record during a bounded check. This is award history, not verified open solicitations. | Reuse, retention, attribution, and rate limits not reviewed. | Read-only connectivity verified; no OppSift connector or persistence. |
| USAspending | United States federal award and spending records | [Official API](https://api.usaspending.gov/) and [documentation index](https://api.usaspending.gov/docs/); JSON. | Public API; spending-by-award search requires documented POST filters. The dataset primarily reports awarded spending, not currently open opportunities. | Review API and data reuse/attribution conditions before redistribution; do not treat award records as open tenders. | No OppSift connector. Not an opportunity source for current solicitations. |
| UNDP Procurement Notices | Global development-project notices; coverage by launch country is not established | [Official notice listing](https://procurement-notices.undp.org/); public web search listing. | Official listing displayed notices and deadlines; no machine-readable API/feed established. Some notices mention launch countries, but this does not prove national coverage. | Scraping conditions, rate limits, reuse, retention, and attribution not reviewed. | Website-only discovery lead; no connector. |
| data.overheid.nl CKAN catalogue | Netherlands dataset metadata and discovery | [CKAN package search for TenderNed](https://data.overheid.nl/data/api/3/action/package_search?q=TenderNed) and [TenderNed dataset metadata](https://data.overheid.nl/data/api/3/action/package_show?id=26e6440b-1d39-4e28-8d18-57d987042622); JSON Action API. | Anonymous catalog and package metadata responses observed. The catalog entry points to the existing TenderNed RSS product; this is a catalog-discovery source, not a second copy of tender notices. | Dataset-specific terms and underlying notice rights require separate review; catalog metadata does not grant data rights. | Read-only catalog retrieval observed; no OppSift connector or persistence. |
| CKAN Action API | Any CKAN-powered catalog, depending on each operator | [CKAN API guide](https://docs.ckan.org/en/2.11/api/index.html); JSON Action API, including `package_search` and resource metadata. | Public calls often work without credentials, but each portal may impose authentication, rate limits, or policy. Pagination uses `start` and `rows`; validate `success` even on HTTP 200. | Catalog metadata is not the dataset license. Inspect every dataset/resource's terms, copyright, attribution, retention, and personal/sensitive data conditions. | Original bounded `CkanDiscoveryClient` implemented. It only searches catalogs; it does not fetch/import resources. Mock tests pass; live `catalog.data.gov` check did not return valid CKAN JSON in this environment. |
| OCDS / Open Contracting Data Registry | Global publishers that publish OCDS data; no single authoritative feed for every country | [Open Contracting Data Registry](https://data.open-contracting.org/), [OCDS documentation](https://standard.open-contracting.org/); JSON release/record packages and publisher-specific APIs/downloads. | Per-publisher access, formats, and update frequency differ; no universal authenticated/anonymous connector endpoint established here. | OCDS is a standard, not a data license. Review each publisher and dataset license, source data provenance, and third-party content. | Standards/repositories are reference-only. No registry scraper or country feed is activated. |

## Intended 30-country scope

This table preserves the product-owner-approved country list. A row is
**research pending** unless the official access method, the actual dataset,
its terms, and a tested connector have each been established. TED's regional
coverage is a source candidate for the listed European countries, not proof of
country-specific opportunity coverage.

| ISO | Country | Candidate found in current catalog | Official API/data access and formats | Authentication / update / rights | Integration status |
|---|---|---|---|---|---|
| US | United States | SAM.gov; Grants.gov; USAspending | SAM.gov v2 JSON API; Grants.gov public search access unresolved; USAspending JSON awards API | SAM key required; SAM rights unresolved; Grants public access unresolved; USAspending award data is not open solicitations | SAM permission pending; others research pending |
| GB | United Kingdom | Find a Tender; Contracts Finder | FTS REST JSON docs; Contracts Finder versioned API docs | FTS API key required; service/license/attachment terms require review; update cadence not independently confirmed | Research / permission review pending |
| CA | Canada | CanadaBuys | Official portal identified; no API/feed verified in this review | Auth, formats, quotas, license and refresh schedule unknown | Research pending |
| IN | India | Central Public Procurement Portal (CPPP) | Official portal identified; no API/feed verified in this review | Auth, formats, terms and refresh schedule unknown | Research pending |
| SG | Singapore | GeBIZ | Official portal identified; no API/feed verified in this review | Auth, formats, terms and refresh schedule unknown | Research pending |
| JP | Japan | Procurement Portal (P-Portal) | Official portal identified; no API/feed verified in this review | Auth, formats, terms and refresh schedule unknown | Research pending |
| KR | South Korea | KONEPS | Official portal identified; no API/feed verified in this review | Auth, formats, terms and refresh schedule unknown | Research pending |
| MY | Malaysia | None verified | Not established | Unknown | Research pending |
| ID | Indonesia | None verified | Not established | Unknown | Research pending |
| PH | Philippines | PhilGEPS | Official portal identified; no API/feed verified in this review | Auth, formats, terms and refresh schedule unknown | Research pending |
| TH | Thailand | Government e-GP | Official portal identified; no API/feed verified in this review | Auth, formats, terms and refresh schedule unknown | Research pending |
| VN | Vietnam | National E-Procurement System | Official portal identified; no API/feed verified in this review | Auth, formats, terms and refresh schedule unknown | Research pending |
| AU | Australia | None verified | Not established | Unknown | Research pending |
| DE | Germany | TED; national portal candidate | TED published-notice API; national source not reviewed | TED anonymous published access; commercial reuse and country mapping require confirmation | Permission review pending |
| FR | France | TED; PLACE | TED published-notice API; PLACE API/feed not verified | TED rights/mapping pending; PLACE auth/terms unknown | Permission review pending |
| NL | Netherlands | TED; TenderNed | TED published-notice API; TenderNed anonymous RSS/Atom retrieval and data.overheid.nl metadata catalog observed | TED rights/mapping pending; TenderNed notice and attachment rights remain unverified | Permission review pending |
| IE | Ireland | TED; eTenders | TED published-notice API; eTenders API/feed not verified | TED rights/mapping pending; national terms unknown | Permission review pending |
| IT | Italy | TED; Acquisti in Rete PA | TED published-notice API; national API/feed not verified | TED rights/mapping pending; national terms unknown | Permission review pending |
| ES | Spain | TED; PCSP | TED published-notice API; national API/feed not verified | TED rights/mapping pending; national terms unknown | Permission review pending |
| SE | Sweden | TED | TED published-notice API; country mapping must be checked | TED rights/mapping pending | Permission review pending |
| PL | Poland | TED; e-Zamówienia | TED published-notice API; national API/feed not verified | TED rights/mapping pending; national terms unknown | Permission review pending |
| DK | Denmark | TED; Udbud.dk | TED published-notice API; national API/feed not verified | TED rights/mapping pending; national terms unknown | Permission review pending |
| BE | Belgium | TED; e-Procurement | TED published-notice API; national API/feed not verified | TED rights/mapping pending; national terms unknown | Permission review pending |
| KE | Kenya | PPIP | Official portal candidate; API/data feed not verified | Auth, format, terms, attribution and cadence unknown | Research pending |
| UG | Uganda | eGP Uganda | Official portal candidate; API/data feed not verified | Auth, format, terms, attribution and cadence unknown | Research pending |
| TZ | Tanzania | NeST | Official portal candidate; API/data feed not verified | Auth, format, terms, attribution and cadence unknown | Research pending |
| RW | Rwanda | UMUCYO | Official portal candidate; API/data feed not verified | Auth, format, terms, attribution and cadence unknown | Research pending |
| BI | Burundi | None verified | Not established | Unknown | Research pending |
| ET | Ethiopia | None verified | Not established | Unknown | Research pending |
| SS | South Sudan | None verified | Not established | Unknown | Research pending |

## Implementation boundary

`backend/neon/intelligence/ckan-discovery.ts` is an allowlist-bound, bounded,
read-only catalog metadata search client. It validates CKAN's `success` field,
page size, result count, and response shape. It deliberately does not follow
resource URLs or treat catalog metadata as an approved opportunity source.
CKAN's Action API documentation describes the common JSON API pattern; each
catalog and resource still needs separate approval.

`backend/neon/intelligence/ted-api.ts` is an allowlist-bound, bounded
published-notice search client. It requires the existing source approval
contract to mark TED operational before requests can be made from an ingestion
path. It does not normalize or persist records. The one live request was a
read-only smoke test, not permission approval or an ingestion run.

`backend/neon/intelligence/contracts-finder-api.ts` is a bounded, approval-
gated Contracts Finder OCDS client. It validates the OGL v3 package declaration,
same-host pagination, page bounds, response shape, and open-tender status. Its
projection omits descriptions, party/contact data, and raw payloads. The
current source remains permission-review-pending because OGL excludes personal
data and third-party content; the client cannot run until the source registry
is explicitly approved. The direct live request was a one-release read-only
check (an award, not an open tender), not a client-driven ingestion run.

Production ingestion remains blocked by the lack of a production Neon
application schema/repository, durable job/checkpoint implementation, and
deployed authorized ingestion runtime. Do not load opportunity or dataset
records into production until those controls and the source-specific rights
review are complete.

## Evidence and count status (2026-11-10)

- The machine-readable register contains **47 distinct source products**. It
  includes national and regional portal leads, catalogues, award-history
  sources, and grant listings; it is not a count of active tender/grant feeds.
- Country rows contain **69 country-to-candidate references** because shared
  products such as TED and the OCP Data Registry are mapped to more than one
  country. These references must not be summed as unique products.
- The catalogue names at least one source candidate for each approved launch
  country. This is discovery only: **0 sources are cleared for commercial
  ingestion/display, 0 records have been parsed into OppSift, 0 have been
  stored, and 0 countries have verified live OppSift coverage.**
- **Seven bounded retrieval paths** were observed in the research record:
  World Bank, TED, Contracts Finder, NSF Awards, data.overheid.nl, TenderNed,
  and OCP Registry metadata. Four have a known bounded record count (six
  records in total); the sample set includes an award and catalog metadata,
  not just active notices. No sample was persisted or parsed by OppSift.
- **Connector implementation:** the repository has source-specific,
  approval-gated clients for TED, Contracts Finder, and SAM.gov, plus generic
  adapters and parsers. These do not provide an end-to-end, permission-cleared
  ingestion path or production persistence.
- Several discovery targets (including 200 sources, 50 retrieval-capable
  sources, and 100 fully evaluated repositories) remain unmet. Do not count
  website leads as APIs or imply that competitor disclosures confer source
  access. Every candidate remains subject to publisher, license, privacy,
  attribution, and reuse review.

## Additional Asia-Pacific evidence

Research checked on 2026-11-10 identified the following access boundaries.
No procurement/grant records were fetched in that regional research pass.

| Country | Official lead | Evidence and limits |
|---|---|---|
| India | [CPPP eProcurement](https://www.eprocure.gov.in/eprocure/app) | Public pages list tenders, corrigenda, awards, and archives. No public API or automation rights were established. OCP has state-level Assam and Himachal Pradesh datasets; both are historical/stale, not a current national feed. |
| Singapore | [GeBIZ opportunities](https://www.gebiz.gov.sg/ptn/opportunity/index.xhtml) | Opportunity search, downloads/forms, and supplier guidance are linked. API/feed, forecast feed, and reuse terms were not established. |
| Japan | [GEPS / Procurement Portal](https://www.p-portal.go.jp/pps-web-biz/UZA01/OZA0101) | Procurement search is documented; bidding/contracting requires registration and an electronic certificate. No general public API, bulk format, or reuse terms were confirmed. [JGrants](https://www.jgrants-portal.go.jp/) rendered only its service title; calls and access conditions remain unverified. |
| South Korea | [KONEPS / G2B](https://www.g2b.go.kr/) | The inspected page returned a browser-compatibility notice, not an opportunity listing or API documentation. [IRIS](https://www.iris.go.kr/) shows business/project and advance announcements, but public visibility and application authentication were not established. |
| Malaysia | [ePerolehan](https://www.eperolehan.gov.my/) | Official landing page returned HTTP 403 to the research environment. No attempt was made to bypass the restriction; portal features and automated access remain unknown. |
| Indonesia | [INAPROC / LKPP systems](https://inaproc.id/) | INAPROC returned HTTP 403. Official regulation describes SIRUP procurement plans and LPSE tender/award publication; direct interfaces and reuse rights remain unverified. OCP lists an ICW-published historical OCDS dataset, not an LKPP live feed. |
| Philippines | [PhilGEPS awards](https://philgeps.gov.ph/Indexes/getAwardNotices) and [open-data dashboard](https://philgeps.gov.ph/CmsHomePages/open-data) | Public notices, award information, downloads/manuals, and an open-data dashboard were visible. A machine-readable API/export and reuse rights were not confirmed. |
| Thailand | [e-GP](https://www.gprocurement.go.th/new_index.html) and Bangkok [Open Contract](https://opencontract.bangkok.go.th/ocds.html) | The national e-GP page was only a gateway/redirect. Bangkok's separate municipal dataset has OCP bulk downloads and a listed CC BY 4.0 dataset license; this is not national coverage, and linked-source rights need review. |
| Vietnam | [National e-Procurement System](https://muasamcong.mpi.gov.vn/) | Public navigation exposes procurement information, reports, and a user manual; login is present for user administration. Public notice access, API/export, and reuse terms were not established. |
| Australia | [AusTender](https://www.tenders.gov.au/) and [GrantConnect](https://www.grants.gov.au/) | Public pages identify approaches to market, contract notices, planned procurements, grant calls, forecasts, awards, and decisions. OCP lists an AusTender OCDS API and bulk data with CC BY 3.0 Australia; source attachments and direct portal use still require review. GrantConnect API/export and reuse were not established. |

OCP's catalogue also identifies Australia (AusTender), India (two state-level
datasets), Indonesia (ICW), and Thailand (Bangkok Metropolitan Administration).
It showed no country entries for Japan, South Korea, Malaysia, the Philippines,
Singapore, or Vietnam in this check. OCP data are compiled releases; a catalogue
download is not proof of API access to the original portal or a blanket license
for source documents.

## Additional East Africa evidence

Research checked on 2026-11-10 identified official systems for all seven
East Africa launch markets, but did not establish licensed, production-ready
connectors:

| Country | Official lead | What the evidence supports | Remaining limits |
|---|---|---|---|
| Kenya | [PPIP](https://tenders.go.ke/) and its [OCDS page](https://tenders.go.ke/ocds); [OCP Data Registry record](https://data.open-contracting.org/en/publication/147) | PPIP publishes notices and awards; the registry reports July 2018–October 2026 data, updated daily, with JSONL/Excel/CSV downloads. | The registry reports no planning activities. License and publication-policy fields are blank; do not treat bulk downloads as reuse approval. |
| Uganda | [PPDA Government Procurement Portal](https://gpp.ppda.go.ug/); [OCP Data Registry record](https://data.open-contracting.org/en/publication/130) | The GPP describes procurement plans, bid invitations, contracts, and disposal plans. | Plans, invitations, and awards are separate record types. Authentication and reuse terms remain unverified. eGP Uganda rollout material is not evidence that it supersedes the GPP. |
| Tanzania | [PPRA NeST information](https://www.ppra.go.tz/services/taneps) | PPRA describes NeST as covering procurement workflows and an OCDS open-data portal is referenced in the OCP Registry. | The direct OCDS dataset record, public access conditions, and reuse terms were not verified; do not infer an open API from transactional features. |
| Rwanda | [Umucyo](https://www.umucyo.gov.rw/), its [open-data page](https://ocds.umucyo.gov.rw/openData), and [OCP Data Registry record](https://data.open-contracting.org/en/publication/145) | Published data is described as tenders and awards, with contracts where available. | Coverage excludes specified procurement and includes thresholds; smaller entities may procure offline. Exact reuse terms remain unverified. |
| Burundi | [ARMP](https://armp.gov.bi/) and an [indexed notices page](https://www.armp.bi/index.php?start=85) | Official regulator and notice-page leads were found. | No current 2026 notice list, API, OCDS feed, or reuse terms were verified; an indexed page includes older notices. |
| Ethiopia | [Federal e-GP portal](https://egp.gov.et/egp/home) and [FPPA](https://www.ppa.gov.et/) | Official portal material describes notices, statistics, opening minutes, evaluation reports, and awards. | No documented public API or reuse terms were verified; the indexed portal message says developer tools are not permitted. |
| South Sudan | [PPDAA Tender Portal](https://tenderportal.ppdaa.gov.ss/), with separate [current bids](https://tenderportal.ppdaa.gov.ss/current-bids), [annual plans](https://tenderportal.ppdaa.gov.ss/annual-procurement-plans), and [awards](https://tenderportal.ppdaa.gov.ss/awarded-contracts) | Public browsing showed a current-bids page with a deadline of 27 November 2026 on the review date; plans and awards are separately listed. | Public browsing does not establish automated-access or reuse rights; submissions and documents may require registration. |

The [OCP Data Registry](https://data.open-contracting.org/) is a discovery and
bulk-download catalogue, not a blanket license for publisher records. The
review verified individual Kenya, Uganda, and Rwanda entries and an indexed
Tanzania entry; it did not confirm registry entries for Burundi, Ethiopia, or
South Sudan. Access to downloadable OCDS data must not be represented as a
stable real-time API.

## Competitor source disclosures

Only sources explicitly named in first-party product material are recorded
here. These disclosures are market research, not OppSift verification,
publisher permission, or evidence that a competitor's source list is
complete.

| Service | Explicitly named sources |
|---|---|
| [Stotles](https://www.stotles.com/data) | Contracts Finder, Find a Tender, TED, Public Contracts Scotland, Sell2Wales, eTendersNI, and Digital Marketplace. It also claims broader portal coverage without naming the full list. |
| [Tenderlake](https://www.tenderlake.com/home/why-tenderlake) | TED; no other individual source was verified in the material checked. |
| [Jorpex](https://jorpex.com/sources/) | TED, SAM.gov, UNGM, World Bank STEP, ADB, AfDB, IDB, EBRD, USAID via SAM.gov, FCDO via UK platforms, GIZ, and AFD. Its “50+ national portals” claim does not provide a complete named list. |
| [Open Opportunities / OpenOpps](https://openopps.com/) | Examples/comparison set named: Find a Tender, World Bank, TenderNed, Doffin, SAM.gov, SECOP II, BOAMP, bund.de, and TED. These are not verified as active OppSift integrations. |
| [Tenqual](https://tenqual.com/sources) | Public source pages found for Contracts Finder, Find a Tender, TendSign, SAM.gov, PNCP, OpenGov Procurement, and World Bank. |
| [Polytender](https://polytender.com/en/sources) | Poland's BZP; the page describes notices, changes, results, contract performance, and procurement plans. |

First-party source disclosures could not be verified for askTender, Agorio,
Tendercast, or CQD in this research pass. No source was inferred for them.

## Machine-readable research registry

The source-candidate inventory and country candidate counts are maintained in
[`backend/neon/intelligence/source-catalog.ts`](../../backend/neon/intelligence/source-catalog.ts).
Its bounded retrieval fields distinguish a successful publisher response
from parsing, persistence, permission approval, and operational status.
Candidate counts include shared regional sources only where country mapping
is documented as a candidate; they are not verified national coverage.
