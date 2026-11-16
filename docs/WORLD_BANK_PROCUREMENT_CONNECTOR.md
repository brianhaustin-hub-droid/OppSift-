# World Bank Procurement Notices connector

## Status

| Capability | Repository status | Runtime status |
|---|---|---|
| Source-specific API connector | Implemented against the existing ingestion contract | Fixture-tested; no live connector run |
| Source registry candidate | Added by pending migration `0005` | Not applied to Neon |
| Source approval | Unreviewed; reuse permission unknown in the runtime registry | Inactive |
| Scheduler profile | Registered in the scheduled Worker | No source can be scheduled until the candidate is reviewed, migrated, approved, and activated |
| Persistence and customer display | Existing raw/canonical ingestion path only | No records stored or displayed |

On 2026-11-11, a single read-only request to the official endpoint with
`rows=1&os=0` returned valid JSON containing one notice and the observed
pagination fields. The returned record was a cancelled contract award, not an
open tender. This confirms only endpoint availability and response shape; it
did not invoke the connector, persist data, or validate scheduler-to-database
flow.

This dataset does not represent national procurement across countries. It
covers procurement notices for World Bank Group-financed projects. A
project-country field is not equivalent to a country's procurement coverage.

## Official evidence and API behavior

The global [World Bank Data Catalog record 0037795](https://datacatalog.worldbank.org/search/dataset/0037795/world-bank-procurement-notices)
describes procurement tender notices for World Bank Group-financed projects,
links the [official Procurement Notices API](https://search.worldbank.org/api/procnotices),
and lists Creative Commons Attribution 4.0. The connector sends requests only
to that API host and path.

The [Procurement Notices - Kenya page](https://financesone.worldbank.org/procurement-notices-kenya/DS01594)
is a country-specific data view based on Procurement Notice `DS00979`; it is
not the global dataset. Its metadata reports daily updates and CC BY 4.0. Its
API Explorer uses the separate `datacatalogapi.worldbank.org` view service,
with `Top`/`Skip` and a documented maximum of 1,000 per page. Those parameters
and limits are **not** used or attributed to the global `search.worldbank.org`
API.

Bounded read-only observations of the global API established:

- `format=json`, `rows`, and `os` are accepted query parameters. `os` advances
  by offset; the response includes `rows`, `os`, `page`, `total`, and
  `procnotices`. The response used strings for `os`, `page`, and `total`.
- The observed response identifies notices with `id`. Sampled source-native
  fields include `notice_type`, `notice_status`, `noticedate`,
  `submission_date`, `project_ctry_name`, `project_id`, `project_name`,
  `bid_reference_no`, `bid_description`, and procurement-method fields.
- The observed notice types included `Request for Expression of Interest` and
  `Contract Award`; observed statuses included `Cancelled`, `Draft`, and
  `Revised`. One sampled record included borrower-provided notice HTML and
  contact details.
- A per-notice `url` was not present in the sampled global API responses.
  `url` is documented by the Kenya view only. If a valid World Bank URL is
  present in a global response, the connector retains it; otherwise it stores
  the API request URL as provenance and leaves the notice URL null.
- No documented sort order, date filter, stable delta token, source quota, or
  maximum page size was established for the global API. An offset near the
  reported total returned HTTP 500 in a bounded observation. Offset paging is
  resumable, but it is not a stable incremental cursor if records shift.

The connector does not guess sort or filter parameters. Its offset is a
continuation position only; it is not evidence that the endpoint provides
complete, ordered, daily delta collection.

## Included notice scope and field mapping

The initial connector includes only the sampled `Request for Expression of
Interest` notice type whose status is `Published` or `Revised` and whose source
`submission_date` is in the future. `Revised` was observed on the configured
global endpoint. `Published` was observed on the versioned `/api/v2` endpoint,
not in the bounded sample of `/api/procnotices`; its semantics on the
configured endpoint remain to be verified before activation. `submission_date` is used as the
submission/deadline value based on its name and the Kenya view's deadline
metadata; that mapping remains an inference for the global API. Date-only
values are retained as source text rather than converted to invented times.

`Contract Award`, general procurement notices, cancelled/draft records,
expired records, and notice types not yet verified are not emitted as open
opportunities. The connector does not label awards as tenders. This allowlist
is intentionally narrow; a future connector change must be based on verified
source values and explicit handling for each notice class.

| OppSift field | Source field / treatment |
|---|---|
| External ID | Global API `id` |
| Title and description | `bid_description` (the source provides a bid description, not a separately verified title) |
| Source category term | `notice_type` |
| Reference number | `bid_reference_no`, when present |
| Publication date | `noticedate`, when an exact time and timezone are supplied; original text remains in raw evidence and `originalValues` |
| Deadline | `submission_date`; exact source text is retained. Date-only values do not receive a fabricated time zone or time |
| Country | `project_ctry_name` mapped only by exact normalized name to the existing OppSift country registry; otherwise null and sent to review |
| Project and procurement metadata | `project_id`, `project_name`, `procurement_category`, `procurement_method_name`, and `sector` when present; all source-native values remain in the raw payload |
| Original notice URL | A valid World Bank URL only if present; no URL is constructed from a project ID |
| Raw source record | Original per-notice JSON object, request URL, content type, SHA-256 checksum, source ID, run ID, and source-native record ID through the existing raw-record repository |
| Attribution evidence | World Bank Group, global dataset catalog URL, and CC BY 4.0 URL are retained in source metadata and parsed provenance. Applicability of the catalog license to every API field remains under review |

The `ParsedSourceOpportunity.countryCode` field now permits null to preserve an
unknown source value. The existing normalizer will not create a canonical
opportunity without a country mapping; it writes the raw record and queues the
parsed record for review instead.

## Pagination, request bounds, and failure semantics

- Each scheduled run requests at most two pages of ten records (20 records
  maximum), serially, with a one-second application-side spacing between
  pages. These are OppSift safety bounds, **not** World Bank rate limits.
- Each request has a 15-second timeout, 2 MB response limit, and at most two
  retries for retryable transport/server/rate-limit failures. The request
  budget is six total HTTP attempts per run.
- The cursor is the observed numeric `os` offset. A page-bound continuation
  is returned only after every requested page validates. The orchestration
  layer commits it only after successful ingestion under the job lease.
- Any failed/malformed/oversized page, wrong returned offset, unexpected
  response shape, or short page before the reported total fails the run. A
  prior page is not exposed as a successful partial result and the durable
  cursor is not advanced.
- Repeated notice IDs are deduplicated within the bounded run; the last
  occurrence wins. Repository uniqueness and checksum constraints continue
  to protect retries.
- The connector stores no R2 object because the tested per-record contract is
  JSON and the existing raw-record path accepts JSON up to 2 MB.

## Approval, attribution, privacy, and activation

Migration `0005_world_bank_procurement_notices_source.sql` adds the candidate
to the existing `opportunity_sources` registry only if the official name or
candidate ID is not already present. It sets:

- Global scope and `multilateral` publisher category.
- API endpoint and connector identifier.
- Daily metadata as provisional cadence evidence; the Kenya view reports
  daily updates, while global API cadence is not independently verified.
- CC BY 4.0 and World Bank terms references, while leaving licensing and terms
  at `review_required`.
- Reuse permission `unknown`, approval `unreviewed`, integration
  `in_development`, and activation `inactive`.
- No numeric source rate limit, because none was verified.

No source is activated by the connector or migration. The global Data Catalog
identifies CC BY 4.0 for this dataset; that evidence must not be generalized
to other World Bank APIs or datasets. Before approval, the exact scope of that
license for API-returned records, borrower-provided notice text, linked
materials, contact fields, attribution, privacy, and retention must be
reviewed. Non-profit use does not by itself resolve those questions or alter
the source's approval state.

Raw API records can contain contact names, email addresses, phone numbers,
addresses, and borrower-provided HTML. The current connector preserves the
source JSON as raw evidence, so it must remain inactive until those data and
retention conditions are reviewed and any required minimization is enforceable.
The general World Bank terms reference is not treated as a blanket license for
unrelated API materials.

## Remaining activation prerequisites

1. Reconcile migration `0005` with a reviewed non-production Neon branch; all
   migrations `0003`-`0005` remain pending and none was applied by this work.
2. Resolve privacy, borrower/third-party content, raw-retention, attribution,
   and exact API/license-scope questions; update the source registry with
   evidence and enforce any resulting constraints.
3. Verify current notice-type/status semantics, deadline interpretation,
   global API ordering, request quotas, and original notice URLs.
4. Establish a reliable incremental strategy. Offset paging alone can resume
   backfill but cannot guarantee timely daily discovery if ordering changes.
5. Add source mappings for country codes outside OppSift's current supported
   country registry only after the corresponding country data and mappings
   exist; unknown countries remain in review.
6. Conduct a separately authorized bounded live connector smoke test, then
   verify non-production end-to-end ingestion before any activation.

No live connector smoke test, production migration, deployment, source
activation, or database write was performed. The endpoint-only check above is
not a connector or end-to-end smoke test.
