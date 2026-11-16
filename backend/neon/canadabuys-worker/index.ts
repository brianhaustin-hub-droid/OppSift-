import { createHyperdriveDatabaseExecutor } from "../intelligence/hyperdrive-executor";
import type {
  DatabaseExecutor,
  DatabaseTransaction,
} from "../intelligence/database-executor";

const CONNECTOR_ID = "canadabuys-json-feed";
const SOURCE_ID = "c31471dc-4413-46d8-9d69-b0fc3e358d7d";
const MAX_RESPONSE_BYTES = 2_000_000;
const MAX_RECORDS_PER_FETCH = 100;
const MAX_RAW_RECORD_BYTES = 64_000;
const ALLOWED_FEED_HOSTS = new Set([
  "canadabuys.canada.ca",
  "canada.ca",
  "open.canada.ca",
]);

type QueueBinding<T> = {
  send(message: T): Promise<void>;
  sendBatch(messages: Array<{ body: T }>): Promise<void>;
};

type QueueMessage<T> = {
  body: T;
  ack(): void;
  retry(options?: { delaySeconds?: number }): void;
};

type QueueBatch<T> = {
  messages: readonly QueueMessage<T>[];
};

type Environment = {
  HYPERDRIVE: { connectionString: string };
  CANADABUYS_QUEUE: QueueBinding<QueueBody>;
};

type OpportunityRecord = {
  kind: "opportunity";
  type: "tender";
  category: "government";
  externalId: string;
  title: string;
  description: string | null;
  issuingOrganization: string;
  publishedAt: string | null;
  deadline: string | null;
  amount: string | null;
  currency: string | null;
  status: "open" | "closed" | "cancelled" | "awarded" | "unknown";
  originalUrl: string;
  raw: Record<string, unknown>;
};

type QueueBody = { type: "collect" } | OpportunityRecord;

type SourceRow = {
  id: string;
  publisher: string;
  api_or_feed_url: string | null;
  api_or_feed_available: boolean;
  approval_status: string;
  activation_status: string;
  integration_status: string;
  licensing_status: string;
  terms_status: string;
  reuse_permission_status: string;
  reliability_status: string;
  permissions_evidence_url: string | null;
  approval_constraints_enforced: boolean;
  approval_constraints: unknown;
  approval_expires_at: string | null;
  expected_refresh_hours: number;
};

type FetchController = {
  scheduled(
    _controller: { scheduledTime: number; cron: string },
    env: Environment,
    context: { waitUntil(promise: Promise<unknown>): void },
  ): void;
  queue(batch: QueueBatch<QueueBody>, env: Environment): Promise<void>;
};

const worker: FetchController = {
  scheduled(_controller, env, context) {
    context.waitUntil(scheduleCollection(env));
  },
  queue(batch, env) {
    return processQueue(batch, env);
  },
};

export default worker;

export async function scheduleCollection(env: Environment): Promise<void> {
  const database = createHyperdriveDatabaseExecutor(env.HYPERDRIVE);
  try {
    const source = await loadSource(database);
    if (!source || !isAuthorized(source)) return;
    const due = await database.query(
      `SELECT 1 FROM public.opportunity_sources
       WHERE id = $1 AND (
         next_scheduled_collection_at IS NULL
         OR next_scheduled_collection_at <= now()
       )`,
      [source.id],
    );
    if (due.rowCount === 0) return;
    validateFeedUrl(source.api_or_feed_url);
    await env.CANADABUYS_QUEUE.send({ type: "collect" });
    await database.query(
      `UPDATE public.opportunity_sources
       SET next_scheduled_collection_at = now() + ($2 * interval '1 hour'),
           updated_at = now()
       WHERE id = $1`,
      [source.id, source.expected_refresh_hours],
    );
  } finally {
    await database.close();
  }
}

export async function processQueue(
  batch: QueueBatch<QueueBody>,
  env: Environment,
): Promise<void> {
  for (const message of batch.messages) {
    try {
      if (message.body?.type === "collect") {
        await collectAndEnqueue(env);
      } else if (isOpportunityRecord(message.body)) {
        await persistOpportunity(env, normalizeRecord(message.body.raw));
      } else {
        console.error("Discarding malformed CanadaBuys queue message.");
      }
      message.ack();
    } catch (error) {
      console.error("CanadaBuys queue processing failed.", {
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
      message.retry({ delaySeconds: 60 });
    }
  }
}

async function collectAndEnqueue(env: Environment): Promise<void> {
  const database = createHyperdriveDatabaseExecutor(env.HYPERDRIVE);
  try {
    const source = await loadSource(database);
    if (!source || !isAuthorized(source)) {
      throw new Error("CanadaBuys source is not approved and active in the source registry.");
    }
    const feedUrl = validateFeedUrl(source.api_or_feed_url);
    const response = await fetch(feedUrl, {
      headers: { Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`CanadaBuys feed returned HTTP ${response.status}.`);
    if (!response.headers.get("content-type")?.toLowerCase().includes("json")) {
      throw new Error("CanadaBuys feed did not return JSON.");
    }

    const payload = await readBoundedJson(response);
    const rawRecords = extractRecords(payload);
    if (rawRecords.length > MAX_RECORDS_PER_FETCH) {
      throw new Error(`CanadaBuys feed exceeded ${MAX_RECORDS_PER_FETCH} records per fetch.`);
    }
    const records = rawRecords.map((record) => normalizeRecord(record));
    for (let offset = 0; offset < records.length; offset += 25) {
      const chunk = records.slice(offset, offset + 25);
      await env.CANADABUYS_QUEUE.sendBatch(chunk.map((body) => ({ body })));
    }
    await markSourceHealthy(database);
  } catch (error) {
    await markSourceDegraded(database);
    throw error;
  } finally {
    await database.close();
  }
}

export function normalizeRecord(value: unknown): OpportunityRecord {
  if (!isRecord(value)) throw new Error("CanadaBuys feed record is not an object.");
  const tender = asRecord(value.tender);
  const buyer = asRecord(value.buyer);
  const procuringEntity = asRecord(value.procuringEntity);
  const organization = asRecord(value.organization);
  const tenderPeriod = asRecord(tender?.tenderPeriod);
  const tenderValue = asRecord(tender?.value);
  const directValue = asRecord(value.value);
  const identifiers = asRecord(value.links);

  const externalId = firstText(value.id, value.ocid, value.noticeId, value.referenceNumber);
  const titleValue = firstText(value.title, value.noticeTitle, value.shortDescription, tender?.title);
  const organizationValue = firstText(
    asRecord(buyer)?.name,
    asRecord(procuringEntity)?.name,
    organization?.name,
    value.issuingOrganization,
    value.organizationName,
  );
  const originalUrl = firstHttpsUrl(
    value.originalUrl,
    value.url,
    value.sourceUrl,
    value.link,
    identifiers?.self,
  );

  if (!externalId || !titleValue || !organizationValue || !originalUrl) {
    throw new Error("CanadaBuys record requires an ID, title, issuing organization, and HTTPS source URL.");
  }
  const title = cleanText(titleValue);
  const issuingOrganization = cleanText(organizationValue);
  if (!title || !issuingOrganization) {
    throw new Error("CanadaBuys record title and issuing organization must contain text.");
  }

  const description = firstText(value.description, value.summary, tender?.description);
  const publishedAt = normalizeTimestamp(
    firstText(value.publishedAt, value.publicationDate, value.datePublished, value.date),
  );
  const deadline = normalizeTimestamp(
    firstText(value.deadline, value.closingAt, value.submissionDeadline, tenderPeriod?.endDate),
  );
  const status = normalizeStatus(firstText(value.status, tender?.status), deadline);
  const amountText = firstText(tenderValue?.amount, directValue?.amount, value.amount);
  const currencyText = firstText(tenderValue?.currency, directValue?.currency, value.currency);
  const parsedAmount = normalizeAmount(amountText);
  const parsedCurrency = currencyText?.toUpperCase() ?? null;
  if (parsedCurrency && !/^[A-Z]{3}$/u.test(parsedCurrency)) {
    throw new Error("CanadaBuys record has a non-ISO currency code.");
  }
  const amount = parsedAmount !== null && parsedCurrency !== null ? parsedAmount : null;
  const currency = amount === null ? null : parsedCurrency;

  const raw = JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  if (new TextEncoder().encode(JSON.stringify(raw)).byteLength > MAX_RAW_RECORD_BYTES) {
    throw new Error("CanadaBuys record exceeds the queue payload size limit.");
  }

  return {
    kind: "opportunity",
    type: "tender",
    category: "government",
    externalId: externalId.slice(0, 500),
    title: title.slice(0, 1000),
    description: description ? cleanText(description).slice(0, 12_000) : null,
    issuingOrganization: issuingOrganization.slice(0, 200),
    publishedAt,
    deadline,
    amount,
    currency: amount === null ? null : currency,
    status,
    originalUrl,
    raw,
  };
}

async function persistOpportunity(
  env: Environment,
  record: OpportunityRecord,
): Promise<void> {
  const database = createHyperdriveDatabaseExecutor(env.HYPERDRIVE);
  try {
    await database.transaction(async (transaction) => {
      const source = await loadSource(transaction);
      if (!source || !isAuthorized(source)) {
        throw new Error("CanadaBuys source authorization changed before persistence.");
      }
      if (record.currency) {
        const currency = await transaction.query(
          "SELECT 1 FROM public.currencies WHERE code = $1",
          [record.currency],
        );
        if (currency.rowCount === 0) {
          throw new Error(`Currency ${record.currency} is not registered in Neon.`);
        }
      }

      const existing = await transaction.query<{ opportunity_id: string | null }>(
        `SELECT opportunity_id::text
         FROM public.opportunity_source_records
         WHERE source_id = $1 AND external_record_id = $2
         FOR UPDATE`,
        [source.id, record.externalId],
      );
      let opportunityId = existing.rows[0]?.opportunity_id ?? null;
      const values = {
        title: record.title,
        description: record.description,
        category: "government",
        country: "CA",
        organization: record.issuingOrganization,
        publisher: source.publisher,
        publishedAt: record.publishedAt,
        deadline: record.deadline,
        originalUrl: record.originalUrl,
        amount: record.amount,
        currency: record.currency,
        status: record.status,
      };

      if (opportunityId) {
        await transaction.query(
          `UPDATE public.opportunities
           SET title = $2, description = $3, category_code = 'government',
               opportunity_type_code = (
                 SELECT code FROM public.opportunity_types
                 WHERE category_code = 'government' AND code = 'tender'
               ),
               country_code = 'CA', status = $5, issuing_institution = $4,
               procuring_organization = $4, publisher = $6, published_at = $7,
               closing_at = $8, canonical_url = $9, published_amount = $10,
               original_currency_code = $11,
               amount_basis = CASE WHEN $10::numeric IS NULL THEN NULL ELSE 'published' END,
               updated_at = now()
           WHERE id = $1`,
          [
            opportunityId,
            values.title,
            values.description,
            values.organization,
            values.status,
            values.publisher,
            values.publishedAt,
            values.deadline,
            values.originalUrl,
            values.amount,
            values.currency,
          ],
        );
      } else {
        const inserted = await transaction.query<{ id: string }>(
          `INSERT INTO public.opportunities (
             title, description, category_code, country_code,
               opportunity_type_code, issuing_institution, procuring_organization, publisher,
             published_at, closing_at, status, canonical_url,
             original_currency_code, published_amount, amount_basis
           ) VALUES (
               $1, $2, $3, $4,
               (SELECT code FROM public.opportunity_types
                WHERE category_code = 'government' AND code = 'tender'),
               $5, $5, $6, $7, $8, $9, $10, $11, $12,
               CASE WHEN $12::numeric IS NULL THEN NULL ELSE 'published' END
           )
           RETURNING id::text`,
          [
            values.title,
            values.description,
            values.category,
            values.country,
            values.organization,
            values.publisher,
            values.publishedAt,
            values.deadline,
            values.status,
            values.originalUrl,
            values.currency,
            values.amount,
          ],
        );
        opportunityId = inserted.rows[0]?.id ?? null;
        if (!opportunityId) throw new Error("Neon did not return the inserted opportunity ID.");
      }

      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(JSON.stringify(record.raw)),
      );
      const checksum = [...new Uint8Array(digest)]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
      const fingerprint = checksum.slice(0, 16);
      const sourceRecord = await transaction.query<{ id: string }>(
        `INSERT INTO public.opportunity_source_records (
           opportunity_id, source_id, external_record_id, original_title,
           original_deadline_text, original_classification, source_url,
           canonical_url, original_values, content_fingerprint
         ) VALUES (
           $1, $2, $3, $4, $5, 'tender', $6, $6, $7::jsonb, $8
         )
         ON CONFLICT (source_id, external_record_id) DO UPDATE SET
           opportunity_id = EXCLUDED.opportunity_id,
           original_title = EXCLUDED.original_title,
           original_deadline_text = EXCLUDED.original_deadline_text,
           original_classification = EXCLUDED.original_classification,
           source_url = EXCLUDED.source_url,
           canonical_url = EXCLUDED.canonical_url,
           original_values = EXCLUDED.original_values,
           content_fingerprint = EXCLUDED.content_fingerprint,
           last_seen_at = now()
         RETURNING id::text`,
        [
          opportunityId,
          source.id,
          record.externalId,
          record.title,
          record.deadline,
          record.originalUrl,
          JSON.stringify({
            issuingOrganization: record.issuingOrganization,
            publishedAt: record.publishedAt,
            deadline: record.deadline,
            amount: record.amount,
            currency: record.currency,
          }),
          fingerprint,
        ],
      );
      const sourceRecordId = sourceRecord.rows[0]?.id;
      if (!sourceRecordId) throw new Error("Neon did not return the source record ID.");

      await transaction.query(
        `INSERT INTO public.raw_source_records (
           source_id, external_record_id, source_url, content_type,
           payload_json, payload_checksum, processing_state,
           source_record_id, canonical_opportunity_id
         ) VALUES ($1, $2, $3, 'application/json', $4::jsonb, $5, 'accepted', $6, $7)
         ON CONFLICT (source_id, external_record_id, payload_checksum)
         DO UPDATE SET last_seen_at = now(), updated_at = now(),
           source_record_id = EXCLUDED.source_record_id,
           canonical_opportunity_id = EXCLUDED.canonical_opportunity_id,
           processing_state = 'accepted'`,
        [
          source.id,
          record.externalId,
          record.originalUrl,
          JSON.stringify(record.raw),
          checksum,
          sourceRecordId,
          opportunityId,
        ],
      );
    });
  } finally {
    await database.close();
  }
}

async function loadSource(database: DatabaseExecutor | DatabaseTransaction): Promise<SourceRow | null> {
  const result = await database.query<SourceRow>(
    `SELECT id::text, publisher, api_or_feed_url, api_or_feed_available,
            approval_status,
            activation_status, integration_status, licensing_status,
            terms_status, reuse_permission_status, reliability_status,
            permissions_evidence_url, approval_constraints_enforced,
            approval_constraints, approval_expires_at::text,
            expected_refresh_hours
     FROM public.opportunity_sources
     WHERE id = $1 AND connector_identifier = $2`,
    [SOURCE_ID, CONNECTOR_ID],
  );
  return result.rows[0] ?? null;
}

function isAuthorized(source: SourceRow): boolean {
  // License, terms, reuse-permission and attribution metadata never gate
  // collection; only activation, operational integration, reliability and
  // unexpired approval are required.
  return source.api_or_feed_url !== null &&
    source.activation_status === "active" &&
    source.integration_status === "operational" &&
    source.api_or_feed_available &&
    ["approved", "approved_with_constraints"].includes(source.approval_status) &&
    ["verified", "reliable"].includes(source.reliability_status) &&
    (source.approval_expires_at === null ||
      Date.parse(source.approval_expires_at) > Date.now());
}

function validateFeedUrl(value: string | null): string {
  if (!value) throw new Error("CanadaBuys feed URL is missing from the source registry.");
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    !ALLOWED_FEED_HOSTS.has(url.hostname.toLowerCase())
  ) {
    throw new Error("CanadaBuys feed URL must use an approved official HTTPS host.");
  }
  return url.toString();
}

async function readBoundedJson(response: Response): Promise<unknown> {
  if (!response.body) throw new Error("CanadaBuys feed response has no body.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error("CanadaBuys feed response exceeded the size limit.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch {
    throw new Error("CanadaBuys feed returned invalid UTF-8 JSON.");
  }
}

function extractRecords(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    if (!payload.every(isRecord)) throw new Error("CanadaBuys JSON array contains a non-object record.");
    return payload;
  }
  if (!isRecord(payload)) throw new Error("CanadaBuys JSON feed has an unsupported structure.");
  const records = [payload.records, payload.data, payload.results, payload.releases]
    .find(Array.isArray);
  if (!Array.isArray(records) || !records.every(isRecord)) {
    throw new Error("CanadaBuys feed must contain an array of JSON records.");
  }
  return records;
}

function isOpportunityRecord(value: unknown): value is OpportunityRecord {
  if (!isRecord(value) || value.kind !== "opportunity" || value.type !== "tender") return false;
  return isRecord(value.raw);
}

function normalizeStatus(
  value: string | null,
  deadline: string | null,
): OpportunityRecord["status"] {
  const status = value?.toLowerCase();
  if (status && ["cancelled", "canceled", "withdrawn"].includes(status)) return "cancelled";
  if (status === "awarded") return "awarded";
  if (status && ["closed", "expired", "completed", "complete"].includes(status)) return "closed";
  if (status && ["active", "open", "published"].includes(status)) {
    return deadline && Date.parse(deadline) <= Date.now() ? "closed" : "open";
  }
  if (deadline) return Date.parse(deadline) <= Date.now() ? "closed" : "open";
  return "unknown";
}

function normalizeTimestamp(value: string | null): string | null {
  if (!value) return null;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/u.test(value);
  const normalized = dateOnly
    ? `${value}T00:00:00.000Z`
    : value;
  if (!/(?:Z|[+-]\d{2}:\d{2})$/u.test(normalized)) {
    throw new Error("CanadaBuys timestamp must include a timezone.");
  }
  const date = new Date(normalized);
  if (!Number.isFinite(date.getTime())) throw new Error("CanadaBuys timestamp is invalid.");
  if (dateOnly && date.toISOString().slice(0, 10) !== value) {
    throw new Error("CanadaBuys date is not a valid calendar date.");
  }
  return date.toISOString();
}

function normalizeAmount(value: string | null): string | null {
  if (value === null) return null;
  const normalized = value.replace(/,/gu, "").trim();
  if (!/^(?:0|[1-9]\d{0,15})(?:\.\d{1,4})?$/u.test(normalized)) {
    throw new Error("CanadaBuys amount must be a non-negative decimal with at most 4 places.");
  }
  return normalized;
}

function firstHttpsUrl(...values: unknown[]): string | null {
  const candidate = firstText(...values);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function cleanText(value: string): string {
  return value
    .replace(/<[^>]*>/gu, " ")
    .replace(/&nbsp;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">")
    .replace(/&quot;/giu, '"')
    .replace(/&#39;/giu, "'")
    .replace(/\s+/gu, " ")
    .trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

async function markSourceHealthy(database: DatabaseExecutor): Promise<void> {
  await database.query(
    `UPDATE public.opportunity_sources
     SET source_health = 'healthy', last_successful_retrieval = now(),
         updated_at = now()
     WHERE id = $1`,
    [SOURCE_ID],
  );
}

async function markSourceDegraded(database: DatabaseExecutor): Promise<void> {
  await database.query(
    `UPDATE public.opportunity_sources
     SET source_health = 'degraded', last_unsuccessful_retrieval = now(),
         updated_at = now()
     WHERE id = $1`,
    [SOURCE_ID],
  );
}
