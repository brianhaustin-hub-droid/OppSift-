# GitHub open-source connector register

Review date: 2026-11-09. This is a public-metadata and repository-purpose
triage, not a source-code security audit. GitHub repository license metadata,
language, description, archive status, and recent push date were checked for
the first 18 entries. GitHub API rate limits prevented a complete metadata
check for the final entries; those are explicitly marked. Dependencies below
identify the apparent runtime, not a completed transitive dependency/SBOM
audit. No repository code was copied into OppSift.

Public source code and source data are separate rights questions. An OSS
license on a connector never grants rights to redistribute the data it
retrieves. No evaluated repository is approved to activate an opportunity
source by itself.

## Evidence update (2026-11-10)

Eight GitHub repository searches returned **800 result rows** and **673
distinct repository names** after deduplication. Search terms covered
procurement/tenders, OCDS/open contracting, CKAN/open data connectors, grants
and funding APIs, TED/eForms, and public procurement data. Of the 673 results,
343 had one of the procurement/open-data terms in the repository name,
description, or topics. That is a rough metadata filter, not a relevance or
quality determination; README-only matches, implementations, and country
coverage were not verified across this result set.

The earlier 100-candidate search screen proposed 63 Reference Only, 36 Adapt,
1 Reject, and 0 Adopt. Those are search-stage recommendations, not
code-review decisions, and are not extended to the 673 search results.

In the follow-up, 60 GitHub metadata requests were attempted; only 5 complete
metadata records were readable in the available output after rate limits. Files
or manifests were inspected for 20 repositories, without a complete source or
transitive dependency audit. These groups may overlap and must not be added as
unique repositories. No third-party code or package was incorporated.

The 673 search-result names have not been converted into individually verified
register records. The requested 100 fully evaluated repositories (and the
newer 500+ research request) are **not met**. The table below remains the
earlier 23-entry preliminary register; its prior license observations and five
provisional entries are not upgraded by the broader search.

| # | Repository | License | Purpose, capability, source coverage | Maintenance and dependencies | Credentials, cost, security and Cloudflare/Neon fit | Commercial/legal assessment | Decision |
|---:|---|---|---|---|---|---|---|
| 1 | [open-contracting/kingfisher-collect](https://github.com/open-contracting/kingfisher-collect) | BSD-3-Clause | Collector framework for downloading OCDS data from configured publisher sources; source support depends on configured collection modules. | Active; Python. Uses a database/file-oriented collector stack; manifest/transitive audit not done. | Source-specific credentials and quotas may apply. Python process/runtime and storage architecture do not fit Pages Functions directly; security review still required. | Permissive code license; publisher data rights remain source-specific. | Reference Only |
| 2 | [open-contracting/notebooks-ocds](https://github.com/open-contracting/notebooks-ocds) | BSD-3-Clause | Analytical notebooks and examples for OCDS data; not a production connector. | Recently updated; Jupyter/Python dependencies, not audited. | Notebook execution is not a production Cloudflare service; inputs/data rights vary. | Permissive code license; examples are not production integration. | Reference Only |
| 3 | [open-contracting/cardinal-rs](https://github.com/open-contracting/cardinal-rs) | MIT | Computes procurement red flags and indicators over OCDS data. | Recently updated; Rust and associated crates; transitive/security audit not done. | No source connector; no paid service identified. Rust/WASM feasibility would require a separate build/security review. | MIT code is commercially usable with notices; OCDS source rights remain separate. | Reference Only |
| 4 | [open-contracting/ocds-merge-rs](https://github.com/open-contracting/ocds-merge-rs) | MIT | Merges OCDS releases. | Recently updated; Rust crates; dependency audit not done. | Processing library, not a source connector; no paid dependency identified. Integration would require wasm/build compatibility work. | MIT code is commercially usable with notices. | Reference Only |
| 5 | [ckan/ckan](https://github.com/ckan/ckan) | GitHub API returned `NOASSERTION`; verify repository license before any reuse | Full CKAN data-management system used by many open-data portals; not an OppSift opportunity source. | Active; Python web application with database and service dependencies; dependency tree not audited. | Self-hosted CKAN is not suitable to add to Pages; public CKAN Action APIs are independently callable. Security surface is large. | No verified SPDX license in checked metadata; do not incorporate. Each CKAN dataset has its own terms. | Reject for code reuse; Reference Only for API format |
| 6 | [ondata/ckan-mcp-server](https://github.com/ondata/ckan-mcp-server) | MIT | TypeScript MCP server for CKAN package search, DataStore SQL, organizations, groups, and tags. | Recently updated; Node/TypeScript dependencies not audited. | MCP server is a developer tool, not a production ingestion runtime; no commercial API identified. Avoid exposing arbitrary SQL or untrusted catalog URLs. | MIT code is commercially usable with notices; dataset terms remain independent. | Reference Only |
| 7 | [makegov/awesome-procurement-data](https://github.com/makegov/awesome-procurement-data) | CC0-1.0 | Curated US federal procurement-data links; directory only, not a connector. | Last meaningful update 2023; Markdown/no runtime dependencies. | No credentials/runtime; links need independent availability and terms checks. | CC0 applies to the curated list, not linked datasets. | Reference Only |
| 8 | [d4d0h/tenderradar](https://github.com/d4d0h/tenderradar) | No license reported in GitHub metadata | TypeScript procurement-intelligence application; source and connector claims need code review. | Recent activity; TypeScript/npm dependency tree not audited. | Source/API credentials and costs not verified; security and source rights not reviewed. | No license means no permission to incorporate. | Reject |
| 9 | [webtruffle/us-federal-grants](https://github.com/webtruffle/us-federal-grants) | No license reported in GitHub metadata | Claims daily Grants.gov opportunities in CSV/JSON/JSONL; inspect upstream provenance before use. | Recently updated; no primary language reported; dependency manifest not checked. | May depend on a separate feed/build process; API credentials and costs unverified. | No license; source-data terms also need review. | Reject |
| 10 | [OP-TED/eForms-SDK](https://github.com/OP-TED/eForms-SDK) | CC-BY-4.0 | Official eForms schemas, validation resources, and controlled vocabulary support; not an opportunity collector. | Active; ANTLR/schema tooling; exact runtime dependencies not audited. | No paid service or retrieval credential required for SDK use; generation/runtime compatibility to be assessed. | Commercial adaptation is possible with attribution/license compliance; not incorporated. TED dataset reuse is a separate question. | Reference Only |
| 11 | [OP-TED/ePO](https://github.com/OP-TED/ePO) | EUPL-1.2 | EU eProcurement ontology and semantic model. | Active; ontology/semantic tooling; dependencies not audited. | Not a connector; additional EUPL obligations and compatibility review required before distributing derivative code. | Commercial use is possible under EUPL terms; obligations need legal review. | Reference Only |
| 12 | [OP-TED/ESPD-EDM](https://github.com/OP-TED/ESPD-EDM) | EUPL-1.2 | European Single Procurement Document data model; not a tender feed. | Active; model/schema tooling; dependencies not audited. | Not a source connector; no paid service identified. | EUPL obligations apply to any adopted code. | Reference Only |
| 13 | [open-contracting/kingfisher-process](https://github.com/open-contracting/kingfisher-process) | BSD-3-Clause | Processes and stores collected OCDS releases in SQL. | Active; Python and SQL/database dependencies; manifests not audited. | Requires a persistent SQL processing service; not directly deployable on Pages. | Permissive code license; publisher reuse terms still control data. | Reference Only |
| 14 | [open-contracting/ocdskit](https://github.com/open-contracting/ocdskit) | BSD-3-Clause | Python CLI tools for validating and transforming OCDS data. | Active; Python package dependencies not audited. | Useful offline tooling, not a live Cloudflare connector; no paid service identified. | Permissive code license; notices required. | Reference Only |
| 15 | [open-contracting/ocds-merge](https://github.com/open-contracting/ocds-merge) | BSD-3-Clause | Python implementation for merging OCDS releases. | Active; Python dependencies not audited. | Not a collector; integrating Python package would add a runtime not in current architecture. | Permissive code license; source records' rights are independent. | Reference Only |
| 16 | [open-contracting/ocds-babel](https://github.com/open-contracting/ocds-babel) | BSD-3-Clause | Extracts/translates OCDS schema and extension metadata; not an opportunity connector. | Active; Python dependencies not audited. | Build/data-model tooling, not runtime ingestion. | Permissive code license; preserve notices if ever reused. | Reference Only |
| 17 | [Gamechangeben69/ted-api](https://github.com/Gamechangeben69/ted-api) | No license reported in checked GitHub metadata | Describes an EU TED/eForms API application; no independent source permission proof. | Created 2026; no evidence of sustained maintenance; Python dependencies/security not audited. | May require third-party hosting/API services; credentials/cost not independently verified. Not Pages-compatible as-is. | No license; do not incorporate. | Reject |
| 18 | [aIex-personal/ML-Procurement](https://github.com/aIex-personal/ML-Procurement) | No license reported in checked GitHub metadata | Experimental TED-data anomaly-detection analysis, not a connector. | Created 2026; Python/scikit-learn per description; dependencies/security not audited. | Not suitable for production data collection; no source rights established. | No license; do not incorporate. | Reject |
| 19 | [aerial-systems/eurodata](https://github.com/aerial-systems/eurodata) | License and manifests not verified (GitHub API rate limit) | Search result describes a standard-library CLI for European institutional data including TED. | Search metadata says recently created; activity/dependencies require direct verification. | CLI is not a durable Pages ingestion service; API access and source terms need independent review. | No incorporation until license is verified. | Reference Only, provisional |
| 20 | [philippprimisser-max/ted-tender-alerts](https://github.com/philippprimisser-max/ted-tender-alerts) | License and manifests not verified (GitHub API rate limit) | Search metadata describes an official TED API alert client with CSV/Atom/email output. | Recent project; Python standard library per description, but code and maintenance not audited. | No paid service claimed; email needs an external provider; not a production ingestion/persistence system. | No incorporation until license is verified. | Reference Only, provisional |
| 21 | [maschinenlesbar-org/ckan-cli](https://github.com/maschinenlesbar-org/ckan-cli) | License and manifests not verified (GitHub API rate limit) | Search metadata describes a TypeScript CKAN Action API client/CLI. | Recently updated in search results; npm tree not audited. | TypeScript is closer to our stack, but CLI is not a production data-rights or persistence layer. | No incorporation until license is verified. | Reference Only, provisional |
| 22 | [maschinenlesbar-org/govdata-cli](https://github.com/maschinenlesbar-org/govdata-cli) | License and manifests not verified (GitHub API rate limit) | Search metadata describes a client for Germany's GovData CKAN API. | Recently updated in search results; npm tree not audited. | Useful discovery reference, not a general opportunity source; dataset-level terms vary. | No incorporation until license is verified. | Reference Only, provisional |
| 23 | [fedspendingtransparency/usaspending-api](https://github.com/fedspendingtransparency/usaspending-api) | License, language and maintenance not verified (GitHub API rate limit) | Repository linked by the official USAspending API documentation; backend for US federal spending/awards, not a live opportunities feed. | Repository code/dependencies not audited. | Server-heavy API implementation is not a Pages connector. The official API can be used separately; award records must not be presented as open opportunities. | No code incorporation until license verified; data terms require their own review. | Reference Only, provisional |

## Result and safeguards

- 23 repositories were screened at metadata/description level; 18 had a
  successful GitHub API metadata/license response and five were provisional
  because the anonymous API rate limit was reached.
- No third-party code or package was added. This avoids taking on unreviewed
  transitive dependencies, incompatible Python/Rust servers, and license
  obligations without a demonstrated need.
- The new CKAN client in OppSift is an original small implementation of the
  documented Action API shape; it does not copy repository code.
- The best reusable direction is OCDS/eForms as data standards, official
  public APIs as connectors, and source-specific rights review. Kingfisher is
  a useful reference for full OCDS collection/processing deployments but
  requires a different runtime/storage stack.
