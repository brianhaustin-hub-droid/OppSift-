# Collector third-party register

The register covers direct runtime dependencies introduced for the collector
network. The Node package lock records resolved versions and license metadata
for its complete transitive dependency graph. Python dependency ranges are
declared in `collectors/python/pyproject.toml`; a Python lock file is not
currently present, so transitive Python versions are not reproducible until a
lock strategy is adopted.

The orchestration, scheduled Worker, and authenticated runner transport add no
new third-party runtime dependencies. They reuse the existing Node collector
and Python collector packages listed below.

The native World Bank JSON API connector also adds no package dependency; it
uses the platform `fetch`/Web Crypto APIs and the existing safe-fetch,
resilience, and ingestion modules.

| Component | Framework / role | Version policy | License | Browser or bypass capability |
|---|---|---|---|---|
| Crawlee | Node request scheduling and bounded crawler lifecycle | `3.18.2` pinned in `collectors/node/package.json` and lockfile | Apache-2.0 (lockfile metadata) | Browser packages are not invoked; no browser downloads, proxy, stealth, or CAPTCHA features are enabled. |
| Cheerio | Node HTML/XML parsing and selector extraction | `^1.2.0`; exact installed version in lockfile | MIT (lockfile metadata) | Parser only; performs no network request by itself. |
| Ajv | Node JSON Schema validation | `^8.20.0`; exact installed version in lockfile | MIT (lockfile metadata) | Validation only. |
| Scrapy | Python request transport, robots handling, and bounded spider lifecycle | `>=2.13,<3` in `pyproject.toml`; verified here at `2.20.0` | BSD-3-Clause (`License-Expression` in installed package metadata) | No browser, proxy, stealth, or CAPTCHA middleware is configured. |
| Scrapling | Python HTML selector extraction over the Scrapy transport | `0.5.1` pinned in `pyproject.toml` | BSD-3-Clause (installed package metadata) | Only the base parser/selector is used; optional fetcher/browser extras are not installed. |
| jsonschema | Python Draft 2020-12 contract validation | `>=4.23,<5` in `pyproject.toml`; verified here at `4.26.0` | MIT (`License-Expression` in installed package metadata) | Validation only. |

## Review conditions

- Review source terms, licenses, attribution, retention, access rules, and rate
  limits independently for each data source. Package licenses do not authorize
  collection or commercial reuse of source data.
- Resolve and lock Python transitive dependencies before production deployment;
  review their licenses and security advisories at that time. The executed
  environment used Python 3.12.10, Scrapy 2.20.0, Scrapling 0.5.1, and
  jsonschema 4.26.0; it did not generate or commit a dependency lock file.
- Keep the Node lockfile and Python dependency definition aligned with the
  tested runtime versions. Do not install Scrapling fetcher/browser extras for
  this implementation.
- Re-run package vulnerability and license checks when versions change. This
  register is not a substitute for legal review of source terms.
