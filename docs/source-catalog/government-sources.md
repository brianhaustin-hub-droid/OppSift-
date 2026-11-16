# Government sources

> Status: the product owner approved the 30-country scope on 2026-11-04.
> This page preserves the initial portal-response review. The current source
> inventory contains 47 candidate products in
> [`source-catalog.ts`](../../backend/neon/intelligence/source-catalog.ts);
> supplemental regional evidence is in
> [global-source-discovery.md](./global-source-discovery.md). Candidates are
> not approved integrations, and no source is operational.

This register focuses on official procurement and public-contracting sources. It follows the intended source-discovery policy: discovered, researched, permission-checked, technically assessed, and only then activated.

| Country | Country code | Source name | Portal URL (publisher confirmation pending where noted) | Publisher | Opportunity category | Source description | API availability | RSS or feed availability | Public dataset availability | Integration method | Documentation URL | Access requirements | Licensing information | Attribution requirements | Technical feasibility | Source verification status | Proposed connector type | Research date | Supporting evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| United States | US | SAM.gov Contract Opportunities | https://sam.gov/opportunities | U.S. General Services Administration | Government | Federal contract opportunity notices; active notices update daily and archived notices weekly per API documentation | Yes; Get Opportunities API v2 | Not assessed | Data Services availability noted; API-specific retention/redistribution rights not established | Bounded read-only API client implemented but not connected to production ingestion; keep inactive | https://open.gsa.gov/api/get-opportunities-public-api/ | SAM.gov account and public API key required; key is sent in the API query; guide documents role-based daily limits without stating their numeric values | SAM.gov API-specific commercial-use/reuse terms not established by reviewed sources. GSA general site policy is not sufficient to authorize this dataset or third-party materials | General GSA policy says citation/link is appreciated; API-specific attribution requirements remain unverified | API contract is documented; no live authenticated request or database persistence performed. Official docs describe `api_key`, `postedFrom`, `postedTo`, `limit` (max 1000), `offset`, one-year date range, and latest active notice version | permission_review_pending | rest_api | 2026-11-09 | Official GSA Open API guide; GSA website reuse/copyright policy; SAM.gov Data Services page; repository client and mocked tests |
| EU multi-country candidate (target EU member states) | EU (regional scope) | Tenders Electronic Daily (TED) API | https://ted.europa.eu/en/ | Publications Office of the European Union | Government | Published procurement notices; potential common candidate for Germany, France, Netherlands, Ireland, Italy, Spain, Sweden, Poland, Denmark, and Belgium; country mapping not yet validated | Yes; published-notice search/retrieval documented | Not assessed | Published notice retrieval through API documented; bulk reuse rights not assessed | Read-only API for published notices, subject to rights and country-scope review | https://docs.ted.europa.eu/api/latest/index.html | Anonymous access documented for published notices; unpublished notice operations require API key | Reuse/license and attribution review pending | Not established by reviewed API page | API documentation found; no source-specific data retrieval or mapping test performed | permission_review_pending | rest_api | 2026-11-04 | Official TED API documentation |

## Initial national portal response checks (2026-11-04)

The following initial portal checks are historical. A response code confirms
only that a page responded at that time; it does not verify publisher
ownership, terms, API/feed availability, rights, attribution, or country
coverage. Some of these leads were later researched in the supplemental
registers. This table is not the current source count.

| Country | Portal candidate | Official portal URL | Evidence/status |
|---|---|---|---|
| Canada | CanadaBuys Tender Opportunities | https://canadabuys.canada.ca/en/tender-opportunities | HTTP 200; terms/API not reviewed |
| United Kingdom | Find a Tender | https://www.find-tender.service.gov.uk/Search | Official REST API requires an organization API key; rights review pending |
| United Kingdom | Contracts Finder | https://www.contractsfinder.service.gov.uk/ | Anonymous OCDS API live-checked; OGL v3 scope/privacy review pending |
| India | Central Public Procurement Portal eProcure | https://eprocure.gov.in/eprocure/app | HTTP 200; terms/API not reviewed |
| Singapore | GeBIZ | https://www.gebiz.gov.sg/ | HTTP 200; terms/API not reviewed |
| Japan | Procurement Portal (P-Portal) | https://www.p-portal.go.jp/ | HTTP 200; terms/API not reviewed |
| South Korea | KONEPS (G2B) | https://www.g2b.go.kr/ | HTTP 200; terms/API not reviewed |
| Philippines | PhilGEPS | https://www.philgeps.gov.ph/ | HTTP 200; terms/API not reviewed |
| Thailand | Government e-Procurement (e-GP) | https://www.gprocurement.go.th/ | HTTP 200; terms/API not reviewed |
| Vietnam | National E-Procurement System | https://muasamcong.mof.gov.vn/ | HTTP 200; terms/API not reviewed |
| France | PLACE / public procurement platform | https://www.marches-publics.gouv.fr/entreprise | HTTP 200; terms/API not reviewed |
| Netherlands | TenderNed | https://www.tenderned.nl/ | HTTP 200; terms/API not reviewed |
| Ireland | eTenders | https://www.etenders.gov.ie/epps/home.do | HTTP 200; terms/API not reviewed |
| Italy | Acquisti in Rete PA | https://www.acquistinretepa.it/opencms/opencms/ | HTTP 200; terms/API not reviewed |
| Spain | Public Sector Procurement Platform (PCSP) | https://contrataciondelestado.es/wps/portal/plataforma | HTTP 200; terms/API not reviewed |
| Poland | e-Zamówienia | https://ezamowienia.gov.pl/pl/ | HTTP 200; terms/API not reviewed |
| Denmark | Udbud.dk | https://udbud.dk/ | HTTP 200; terms/API not reviewed |
| Belgium | e-Procurement | https://www.publicprocurement.be/ | HTTP 200; terms/API not reviewed |
| Kenya | Public Procurement Information Portal (PPIP) | https://tenders.go.ke/ | HTTP 200; terms/API not reviewed |
| Uganda | eGP Uganda | https://egpuganda.go.ug/ | HTTP 200; terms/API not reviewed |
| Tanzania | National e-Procurement System of Tanzania (NeST) | https://nest.go.tz/ | HTTP 200; terms/API not reviewed |
| Rwanda | UMUCYO | https://umucyo.gov.rw/ | HTTP 200; terms/API not reviewed |

## Government source discovery priorities

1. Confirm publisher identity, record scope, and public-access conditions for
   each candidate in the machine-readable register.
2. Keep national, regional, state/provincial, and municipal datasets distinct.
3. Verify current live records, parser behavior, pagination and freshness with
   bounded read-only checks only where permitted.
4. Review API/feed terms, linked-document and personal-data rights, attribution,
   retention, and rate limits before any connector activation.
5. Do not assume public access or a competitor disclosure means legal scraping,
   bulk extraction, or commercial reuse.
