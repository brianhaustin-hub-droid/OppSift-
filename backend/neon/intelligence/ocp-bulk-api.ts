import { z } from "zod";
import {
  parsedSourceOpportunitySchema,
  sourceRegistryRecordSchema,
  type ParsedSourceOpportunity,
  type SourceRegistryRecord,
} from "./contracts";

const OCP_ORIGIN = "https://data.open-contracting.org";

const compiledReleaseSchema = z.object({
  ocid: z.string().trim().min(1),
  id: z.string().trim().min(1).optional(),
  date: z.string().nullable().optional(),
  buyer: z.object({
    name: z.string().nullable().optional(),
  }).passthrough().optional(),
  tender: z.object({
    id: z.union([z.string(), z.number()]).nullable().optional(),
    title: z.string().trim().min(1).nullable().optional(),
    status: z.string().nullable().optional(),
    tenderPeriod: z.object({
      endDate: z.string().nullable().optional(),
    }).passthrough().optional(),
    value: z.object({
      amount: z.union([z.number(), z.string()]).nullable().optional(),
      currency: z.string().nullable().optional(),
    }).passthrough().optional(),
  }).passthrough().optional(),
  awards: z.array(z.object({
    value: z.object({
      amount: z.union([z.number(), z.string()]).nullable().optional(),
      currency: z.string().nullable().optional(),
    }).passthrough().optional(),
  }).passthrough()).default([]),
}).passthrough();

type OcpBulkDependencies = {
  fetcher?: typeof fetch;
  now?: () => Date;
};

export type OcpBulkOptions = {
  publicationId: number;
  fileName: string;
  countryCode: string;
  timeZone?: string;
  maxResponseBytes?: number;
  // Cap on the DECOMPRESSED stream size; bulk JSONL can expand well beyond
  // the compressed byte cap. Without this a hostile or oversized mirror
  // file could pin the isolate on decompression alone.
  maximumDecompressedBytes?: number;
  pageSize?: number;
};

export type OcpBulkSearchResult = {
  records: ParsedSourceOpportunity[];
  rawRecords: Array<{ externalId: string; payload: Record<string, unknown> }>;
  total: number;
  nextOffset: number | null;
};

function text(value: string | null | undefined): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asTimestamp(value: string | null | undefined): string | null {
  if (!value || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function sanitizeAmount(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const numeric = typeof value === "number"
    ? value
    : Number(String(value).replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  const rounded = Math.round(numeric * 10_000) / 10_000;
  const amountText = rounded.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  return /^\d{1,16}(\.\d{1,4})?$/.test(amountText) ? amountText : null;
}

function mapStatus(
  release: z.infer<typeof compiledReleaseSchema>,
  deadline: string | null,
  now: Date,
): "open" | "closed" | "awarded" | "unknown" {
  if (release.awards.length > 0) return "awarded";
  if (deadline) {
    const timestamp = Date.parse(deadline);
    if (!Number.isNaN(timestamp)) return timestamp > now.getTime() ? "open" : "closed";
  }
  const normalized = release.tender?.status?.toLowerCase();
  if (normalized === "complete" || normalized === "cancelled") return "closed";
  return "unknown";
}

function mapCompiledRelease(
  source: SourceRegistryRecord,
  countryCode: string,
  release: z.infer<typeof compiledReleaseSchema>,
  now: Date,
  timeZone: string | null,
): { success: true; record: ParsedSourceOpportunity } | { success: false; error: string } {
  const externalId = release.ocid;
  const planning = (release as any).planning as Record<string, any> | undefined;
  const budget = planning?.budget as Record<string, any> | undefined;
  const planningTitle = text(budget?.project) ?? text(budget?.description);
  const title = text(release.tender?.title) ?? planningTitle ?? text(release.buyer?.name) ?? externalId;
  if (!title) {
    return { success: false, error: "OCDS compiled release is missing a usable title." };
  }
  const deadline = release.tender?.tenderPeriod?.endDate
    ? asTimestamp(release.tender.tenderPeriod.endDate)
    : null;
  const awardValue = release.awards[0]?.value;
  const tenderValue = release.tender?.value;
  const planningAmount = budget?.amount as Record<string, any> | undefined;
  const rawAmount = awardValue?.amount ?? tenderValue?.amount ?? planningAmount?.amount ?? null;
  const rawCurrency = awardValue?.currency ?? tenderValue?.currency ?? planningAmount?.currency ?? null;
  const normalizedAmount = sanitizeAmount(rawAmount);
  const normalizedCurrency = text(rawCurrency)?.toUpperCase() ?? null;
  const hasMonetaryValue =
    normalizedAmount !== null &&
    normalizedAmount !== "0" &&
    normalizedCurrency !== null &&
    /^[A-Z]{3}$/.test(normalizedCurrency);

  const candidate: ParsedSourceOpportunity = {
    externalId,
    title: title.slice(0, 1000),
    description: null,
    sourceCategoryTerm: "Tender",
    referenceNumber: release.tender?.id ? String(release.tender.id).slice(0, 200) : null,
    countryCode: countryCode,
    region: null,
    city: null,
    issuingInstitution: null,
    procuringOrganization: text(release.buyer?.name),
    publisher: source.publisher,
    publishedAt: asTimestamp(release.date),
    sourceDeadlineText: deadline?.slice(0, 500) ?? null,
    closingAt: deadline,
    timeZone: deadline ? timeZone : null,
    status: mapStatus(release, deadline, now),
    sourceUrl: `${OCP_ORIGIN}/ocds/${encodeURIComponent(externalId)}`,
    canonicalUrl: null,
    currency: hasMonetaryValue ? normalizedCurrency : null,
    amount: hasMonetaryValue ? normalizedAmount : null,
    originalValues: {
      ocid: externalId,
      tenderId: release.tender?.id ? String(release.tender.id) : null,
      tenderStatus: release.tender?.status ?? null,
      buyerName: release.buyer?.name ?? null,
    },
  };
  const parsed = parsedSourceOpportunitySchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
    };
  }
  return { success: true, record: parsed.data };
}

export class OcpBulkClient {
  private readonly source: SourceRegistryRecord;

  constructor(
    source: SourceRegistryRecord,
    private readonly options: OcpBulkOptions,
    private readonly dependencies: OcpBulkDependencies = {},
  ) {
    this.source = sourceRegistryRecordSchema.parse(source);
  }

  async search(search: {
    offset?: number;
    limit?: number;
    signal?: AbortSignal;
  }): Promise<OcpBulkSearchResult> {
    const limit = search.limit ?? this.options.pageSize ?? 500;
    const offset = search.offset ?? 0;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000) {
      throw new Error("OCP bulk page size must be an integer from 1 to 1000.");
    }
    if (!Number.isSafeInteger(offset) || offset < 0) {
      throw new Error("OCP bulk offset must be a non-negative integer.");
    }

    const url = `${OCP_ORIGIN}/en/publication/${this.options.publicationId}/download?name=${encodeURIComponent(this.options.fileName)}`;
    const fetcher = this.dependencies.fetcher ?? fetch;

    let response: Response;
    try {
      response = await fetcher(url, { signal: search.signal });
    } catch (error) {
      if (search.signal?.aborted) throw error;
      throw new Error("OCP bulk download failed.");
    }
    if (!response.ok) {
      throw new Error("OCP bulk download failed.");
    }

    const maximumBytes = this.options.maxResponseBytes ?? 10_000_000;
    const maximumDecompressedBytes = this.options.maximumDecompressedBytes ?? 200_000_000;

    // Stream-decompress and stop as early as possible: we only need the page
    // window [offset, offset+limit) and whether any line exists after it (to
    // compute nextOffset). This bounds work/memory per run instead of scanning
    // the entire file every time, which is critical on Worker CPU/time limits.
    const page: string[] = [];
    let totalLines = 0;
    let hasMore = false;
    let doneEarly = false;

    const onLine = (raw: string): "continue" | "stop" => {
      const line = raw.trim();
      if (line.length === 0) return "continue";
      const index = totalLines;
      totalLines += 1;
      if (index >= offset && index < offset + limit) {
        page.push(line);
      }
      if (index >= offset + limit) {
        hasMore = true;
        return "stop";
      }
      return "continue";
    };

    const consumeText = (textBody: string) => {
      let start = 0;
      for (let i = 0; i <= textBody.length; i += 1) {
        if (i === textBody.length || textBody.charCodeAt(i) === 10 /* \n */) {
          const line = i > start && textBody.charCodeAt(i - 1) === 13 /* \r */
            ? textBody.slice(start, i - 1)
            : textBody.slice(start, i);
          if (onLine(line) === "stop") {
            doneEarly = true;
            return;
          }
          start = i + 1;
        }
      }
      // last segment handled by loop when i===length
    };

    let streamed = false;
    try {
      const body = response.body;
      if (!body) throw new Error("decompression stream unavailable");
      const reader = body.pipeThrough(new DecompressionStream("gzip")).getReader();
      const decoder = new TextDecoder();
      let decompressedBytes = 0;
      let carry = "";
      outer: for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        decompressedBytes += value.byteLength;
        if (decompressedBytes > maximumDecompressedBytes) {
          throw new Error("OCP bulk file exceeds the configured size limit.");
        }
        carry += decoder.decode(value, { stream: true });
        let start = 0;
        for (let i = 0; i < carry.length; i += 1) {
          if (carry.charCodeAt(i) === 10 /* \n */) {
            const line = i > start && carry.charCodeAt(i - 1) === 13 ? carry.slice(start, i - 1) : carry.slice(start, i);
            if (onLine(line) === "stop") { doneEarly = true; break outer; }
            start = i + 1;
          }
        }
        carry = carry.slice(start);
      }
      if (!doneEarly) {
        carry += decoder.decode();
        if (carry.length > 0) {
          // process final line (and any embedded newlines, unlikely)
          if (onLine(carry.endsWith("\r") ? carry.slice(0, -1) : carry) === "stop") {
            doneEarly = true;
          }
        }
      }
      if (doneEarly) {
        await reader.cancel().catch(() => {});
      }
      streamed = true;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("exceeds the configured size limit")
      ) {
        throw error;
      }
      if (!streamed) {
        // Fallback: server may return uncompressed data or stream APIs may be
        // unavailable. Read buffered body and apply the same early-stop logic.
        page.length = 0;
        totalLines = 0;
        hasMore = false;
        doneEarly = false;
        const buffer = await response.clone().arrayBuffer().catch(async () => {
          // original body may be disturbed; best-effort
          throw error;
        });
        if (buffer.byteLength > maximumBytes) {
          throw new Error("OCP bulk file exceeds the configured size limit.");
        }
        consumeText(new TextDecoder().decode(buffer));
      } else {
        throw error;
      }
    }

    if (totalLines === 0) {
      throw new Error("OCP bulk file was empty.");
    }

    // Preserve previous behavior: return records in reverse file order within
    // the page window.
    const slice = page.reverse();

    const now = this.dependencies.now?.() ?? new Date();
    const records: ParsedSourceOpportunity[] = [];
    const rawRecords: OcpBulkSearchResult["rawRecords"] = [];
    let rejected = 0;

    for (const line of slice) {
      let release: unknown;
      try {
        release = JSON.parse(line);
      } catch {
        rejected += 1;
        continue;
      }
      const parsedLine = compiledReleaseSchema.safeParse(release);
      if (!parsedLine.success) {
        rejected += 1;
        continue;
      }
      const mapped = mapCompiledRelease(
        this.source,
        this.options.countryCode,
        parsedLine.data,
        now,
        this.options.timeZone ?? "Africa/Kampala",
      );
      if (mapped.success) {
        records.push(mapped.record);
        rawRecords.push({
          externalId: mapped.record.externalId,
          payload: {
            ocid: parsedLine.data.ocid,
            date: parsedLine.data.date ?? null,
            buyerName: parsedLine.data.buyer?.name ?? null,
            tenderId: parsedLine.data.tender?.id ? String(parsedLine.data.tender.id) : null,
            tenderTitle: parsedLine.data.tender?.title ?? null,
            tenderStatus: parsedLine.data.tender?.status ?? null,
            tenderPeriodEndDate: parsedLine.data.tender?.tenderPeriod?.endDate ?? null,
            amount: parsedLine.data.awards[0]?.value?.amount ?? parsedLine.data.tender?.value?.amount ?? null,
            currency: parsedLine.data.awards[0]?.value?.currency ?? parsedLine.data.tender?.value?.currency ?? null,
          },
        });
      } else {
        rejected += 1;
      }
    }

    if (rejected === slice.length && slice.length > 0) {
      throw new Error("OCP bulk records did not match the documented compiled-release format.");
    }

    const nextOffset = hasMore ? offset + limit : null;
    return { records, rawRecords, total: hasMore ? offset + limit + 1 : totalLines, nextOffset };
  }
}