import { z } from "zod";
import {
  connectorConfigurationSchema,
  validateConnectorConfiguration,
  type ConnectorConfiguration,
} from "./connectors";
import {
  parsedSourceOpportunitySchema,
  sourceRegistryRecordSchema,
  type ParsedSourceOpportunity,
  type SourceRegistryRecord,
} from "./contracts";
import { safeFetchApprovedSource } from "./safe-fetch";

const PNCP_ORIGIN = "https://pncp.gov.br";
const PNCP_SEARCH_ENDPOINT = `${PNCP_ORIGIN}/api/consulta/v1/contratacoes/publicacao`;
const PNCP_HOST = "pncp.gov.br";

// The consultation API requires exactly one modality per request and rejects
// sizes below 10 and above 50, so the connector walks the modalities in this
// order and pages at the documented maximum.
export const pncpModalities = [
  { code: 6, name: "Pregão - Eletrônico" },
  { code: 9, name: "Inexigibilidade" },
  { code: 4, name: "Concorrência - Eletrônica" },
  { code: 8, name: "Dispensa" },
  { code: 12, name: "Credenciamento" },
  { code: 7, name: "Pregão - Presencial" },
  { code: 5, name: "Concorrência - Presencial" },
  { code: 3, name: "Concurso" },
] as const;

export const pncpPageSize = 50;
const BRAZIL_TIME_ZONE = "America/Sao_Paulo";
// Brazil has used UTC-3 without daylight saving since 2019. PNCP timestamps are
// published as local wall-clock time with no offset, so the connector states
// the offset explicitly instead of letting a runtime guess.
const BRAZIL_UTC_OFFSET = "-03:00";

const itemSchema = z.object({
  numeroControlePNCP: z.string(),
  objetoCompra: z.string(),
  anoCompra: z.number().int().nullable().optional(),
  sequencialCompra: z.number().int().nullable().optional(),
  numeroCompra: z.string().nullable().optional(),
  processo: z.string().nullable().optional(),
  modalidadeId: z.number().int().nullable().optional(),
  modalidadeNome: z.string(),
  situacaoCompraNome: z.string().nullable().optional(),
  dataPublicacaoPncp: z.string().nullable().optional(),
  dataEncerramentoProposta: z.string().nullable().optional(),
  valorTotalEstimado: z.number().nullable().optional(),
  linkSistemaOrigem: z.string().nullable().optional(),
  orgaoEntidade: z.object({
    cnpj: z.string().nullable().optional(),
    razaoSocial: z.string().nullable().optional(),
  }).passthrough().optional(),
  unidadeOrgao: z.object({
    ufSigla: z.string().nullable().optional(),
    ufNome: z.string().nullable().optional(),
    municipioNome: z.string().nullable().optional(),
    nomeUnidade: z.string().nullable().optional(),
  }).passthrough().optional(),
  amparoLegal: z.object({
    nome: z.string().nullable().optional(),
  }).passthrough().nullable().optional(),
}).passthrough();

const pageSchema = z.object({
  data: z.array(itemSchema),
  totalRegistros: z.number().int().nonnegative(),
  totalPaginas: z.number().int().nonnegative(),
  numeroPagina: z.number().int().positive(),
}).passthrough();

type PncpApiDependencies = {
  fetcher?: typeof fetch;
  requestTimeoutMs?: number;
  maxResponseBytes?: number;
  now?: () => Date;
  sleep?: (milliseconds: number) => Promise<void>;
};

export type PncpSearchResult = {
  records: ParsedSourceOpportunity[];
  rawRecords: Array<{ externalId: string; payload: Record<string, unknown> }>;
  total: number;
  totalPages: number;
  nextPage: number | null;
};

function makeConfiguration(
  sourceId: string,
  dependencies: PncpApiDependencies,
): ConnectorConfiguration {
  return connectorConfigurationSchema.parse({
    version: 1,
    sourceId,
    connectorType: "rest_api",
    endpoint: PNCP_SEARCH_ENDPOINT,
    allowedHosts: [PNCP_HOST],
    pageSize: pncpPageSize,
    maxPagesPerRun: 10,
    requestTimeoutMs: dependencies.requestTimeoutMs ?? 35_000,
    maxResponseBytes: dependencies.maxResponseBytes ?? 10_000_000,
    maxRetries: 5,
    minimumRetryDelayMs: 2_000,
    maximumRetryDelayMs: 45_000,
    allowedContentTypes: ["application/json"],
  });
}

function text(value: string | null | undefined): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function brazilInstant(value: string | null | undefined): string | null {
  const trimmed = text(value);
  if (!trimmed) return null;
  const withOffset = /(?:Z|[+-]\d{2}:\d{2})$/i.test(trimmed)
    ? trimmed
    : `${trimmed}${BRAZIL_UTC_OFFSET}`;
  const parsed = Date.parse(withOffset);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

function amountText(value: number | null | undefined): string | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  if (value >= 1_000_000_000_000) return null;
  return value.toFixed(2);
}

function tenderUrl(item: z.infer<typeof itemSchema>, fallback: string): string {
  const cnpj = text(item.orgaoEntidade?.cnpj);
  const year = item.anoCompra;
  const sequence = item.sequencialCompra;
  if (
    cnpj &&
    /^\d{14}$/u.test(cnpj) &&
    Number.isInteger(year) &&
    Number.isInteger(sequence)
  ) {
    return `${PNCP_ORIGIN}/app/editais/${cnpj}/${year}/${sequence}`;
  }
  return fallback;
}

function mapStatus(
  situation: string | null,
  closingAt: string | null,
  now: Date,
): "open" | "closed" | "cancelled" | "unknown" {
  if (situation && /(anulad|revogad|cancelad)/iu.test(situation)) return "cancelled";
  if (!closingAt) return "unknown";
  const timestamp = Date.parse(closingAt);
  if (Number.isNaN(timestamp)) return "unknown";
  return timestamp > now.getTime() ? "open" : "closed";
}

function mapItem(
  source: SourceRegistryRecord,
  item: z.infer<typeof itemSchema>,
  now: Date,
): { success: true; record: ParsedSourceOpportunity } | { success: false; error: string } {
  const externalId = text(item.numeroControlePNCP);
  const title = text(item.objetoCompra);
  if (!externalId || !title) {
    return { success: false, error: "PNCP contratação is missing its control number or object." };
  }
  const publishedAt = brazilInstant(item.dataPublicacaoPncp);
  const deadlineText = text(item.dataEncerramentoProposta);
  const closingAt = brazilInstant(deadlineText);

  const candidate: ParsedSourceOpportunity = {
    externalId,
    title: title.slice(0, 1000),
    description: null,
    sourceCategoryTerm: item.modalidadeNome,
    referenceNumber: (text(item.numeroCompra) ?? text(item.processo))?.slice(0, 200) ?? null,
    countryCode: "BR",
    region: text(item.unidadeOrgao?.ufSigla)?.slice(0, 200) ?? null,
    city: text(item.unidadeOrgao?.municipioNome)?.slice(0, 200) ?? null,
    issuingInstitution: text(item.unidadeOrgao?.nomeUnidade)?.slice(0, 300) ?? null,
    procuringOrganization: text(item.orgaoEntidade?.razaoSocial)?.slice(0, 300) ?? null,
    publisher: source.publisher,
    publishedAt,
    sourceDeadlineText: deadlineText?.slice(0, 500) ?? null,
    closingAt,
    timeZone: closingAt ? BRAZIL_TIME_ZONE : null,
    status: mapStatus(text(item.situacaoCompraNome), closingAt, now),
    sourceUrl: tenderUrl(item, source.website),
    canonicalUrl: null,
    currency: "BRL",
    amount: amountText(item.valorTotalEstimado),
    originalValues: {
      pncp: {
        controlNumber: externalId,
        modalityCode: item.modalidadeId ?? null,
        modalityName: item.modalidadeNome,
        situation: text(item.situacaoCompraNome),
        federalEntityCnpj: text(item.orgaoEntidade?.cnpj),
        state: text(item.unidadeOrgao?.ufSigla),
        stateName: text(item.unidadeOrgao?.ufNome),
        municipality: text(item.unidadeOrgao?.municipioNome),
        legalBasis: text(item.amparoLegal?.nome),
        sourceSystemUrl: text(item.linkSistemaOrigem),
      },
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

function compactDate(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/gu, "");
}

export class PncpApiClient {
  private readonly source: SourceRegistryRecord;
  private readonly configuration: ConnectorConfiguration;

  constructor(
    source: SourceRegistryRecord,
    private readonly dependencies: PncpApiDependencies = {},
  ) {
    this.source = sourceRegistryRecordSchema.parse(source);
    this.configuration = makeConfiguration(this.source.id, dependencies);
  }

  async search(search: {
    modality: number;
    page?: number;
    windowDays?: number;
    signal?: AbortSignal;
  }): Promise<PncpSearchResult> {
    const approval = validateConnectorConfiguration(this.source, this.configuration);
    if (!approval.success) {
      throw new Error("PNCP source is not approved for operational ingestion.");
    }
    const modality = pncpModalities.find((candidate) => candidate.code === search.modality);
    if (!modality) {
      throw new Error("PNCP modality code is not supported by this connector.");
    }
    const page = search.page ?? 1;
    if (!Number.isSafeInteger(page) || page < 1) {
      throw new Error("PNCP page must be a positive integer.");
    }
    const windowDays = search.windowDays ?? 7;
    if (!Number.isSafeInteger(windowDays) || windowDays < 1 || windowDays > 365) {
      throw new Error("PNCP publication window must be from 1 to 365 days.");
    }

    const now = this.dependencies.now?.() ?? new Date();
    const start = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
    const url = new URL(PNCP_SEARCH_ENDPOINT);
    url.searchParams.set("dataInicial", compactDate(start));
    url.searchParams.set("dataFinal", compactDate(now));
    url.searchParams.set("codigoModalidadeContratacao", String(modality.code));
    url.searchParams.set("pagina", String(page));
    url.searchParams.set("tamanhoPagina", String(pncpPageSize));

    const sleep = this.dependencies.sleep ?? ((milliseconds: number) =>
      new Promise((resolve) => setTimeout(resolve, milliseconds)));
    // The public portal is shared by every Brazilian contracting authority;
    // pace requests instead of bursting through pages.
    await sleep(800);

    const response = await safeFetchApprovedSource(url.toString(), this.configuration, {
      signal: search.signal,
      fetcher: this.dependencies.fetcher,
      headers: {
        Accept: "application/json",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        "User-Agent": "OppSift/1.0 (+https://oppsift.com; procurement intelligence ingestion)",
      },
    });

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new Error("PNCP returned invalid JSON.");
    }

    const result = pageSchema.safeParse(body);
    if (!result.success) {
      throw new Error("PNCP response did not match the documented consultation format.");
    }

    const records: ParsedSourceOpportunity[] = [];
    const rawRecords: PncpSearchResult["rawRecords"] = [];
    for (const item of result.data.data) {
      const mapped = mapItem(this.source, item, now);
      if (!mapped.success) continue;
      records.push(mapped.record);
      rawRecords.push({
        externalId: mapped.record.externalId,
        payload: {
          numeroControlePNCP: mapped.record.externalId,
          objetoCompra: item.objetoCompra,
          modalidadeId: item.modalidadeId ?? null,
          modalidadeNome: item.modalidadeNome,
          situacaoCompraNome: text(item.situacaoCompraNome),
          dataPublicacaoPncp: text(item.dataPublicacaoPncp),
          dataEncerramentoProposta: text(item.dataEncerramentoProposta),
          valorTotalEstimado: item.valorTotalEstimado ?? null,
          orgaoEntidadeCnpj: text(item.orgaoEntidade?.cnpj),
          orgaoEntidadeRazaoSocial: text(item.orgaoEntidade?.razaoSocial),
          unidadeOrgaoUf: text(item.unidadeOrgao?.ufSigla),
          unidadeOrgaoMunicipio: text(item.unidadeOrgao?.municipioNome),
          unidadeOrgaoNome: text(item.unidadeOrgao?.nomeUnidade),
          numeroCompra: text(item.numeroCompra),
          processo: text(item.processo),
          amparoLegal: text(item.amparoLegal?.nome),
        },
      });
    }

    const nextPage = result.data.numeroPagina < result.data.totalPaginas
      ? result.data.numeroPagina + 1
      : null;

    return {
      records,
      rawRecords,
      total: result.data.totalRegistros,
      totalPages: result.data.totalPaginas,
      nextPage,
    };
  }
}
