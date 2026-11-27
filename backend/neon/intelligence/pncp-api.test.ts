import { describe, expect, it, vi } from "vitest";
import type { SourceRegistryRecord } from "./contracts";
import { PncpApiClient, pncpModalities } from "./pncp-api";
import { createPncpSourceConnector } from "./api-client-source-connectors";

const approvedSource = (overrides: Partial<SourceRegistryRecord> = {}): SourceRegistryRecord => ({
  id: "6d0f43a1-1f9a-4c2a-9c8f-0e6d5c4b3a21",
  name: "PNCP — Public Consultation API (Brazil)",
  publisher: "Portal Nacional de Contratações Públicas (PNCP), Brazil",
  website: "https://pncp.gov.br/",
  sourceCategory: "government",
  sourceType: "api",
  accessMethod: "api",
  apiOrFeedUrl: "https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao",
  connectorIdentifier: "pncp-api",
  coverageScope: "country",
  coverageRegionCodes: [],
  apiOrFeedAvailable: true,
  opportunityCategories: ["government"],
  languages: ["pt"],
  publicationFrequency: "Daily",
  expectedRefreshHours: 24,
  reliability: "verified",
  licensingStatus: "approved",
  termsStatus: "verified",
  permissionsEvidenceUrl: "https://pncp.gov.br/api/consulta/swagger-ui/index.html",
  licenseUrl: "https://pncp.gov.br/api/consulta/swagger-ui/index.html",
  termsUrl: "https://pncp.gov.br/",
  reusePermissionStatus: "permitted",
  attributionRequirements: "Attribute the PNCP.",
  robotsRestrictions: null,
  retentionRestrictions: null,
  rateLimitRequests: null,
  rateLimitWindowSeconds: null,
  approvalStatus: "approved",
  approvalConstraints: [],
  approvalConstraintsEnforced: false,
  approvalExpiresAt: null,
  activationStatus: "active",
  integrationStatus: "operational",
  lastSuccessfulRetrieval: null,
  lastUnsuccessfulRetrieval: null,
  nextScheduledCollectionAt: null,
  ...overrides,
});

const itemFixture = {
  numeroControlePNCP: "77817054000179-1-000127/2026",
  objetoCompra: "Aquisição de jogos pedagógicos e materiais de apoio à educação infantil.",
  anoCompra: 2026,
  sequencialCompra: 127,
  numeroCompra: "PR53",
  processo: "PR53/2026",
  modalidadeId: 6,
  modalidadeNome: "Pregão - Eletrônico",
  situacaoCompraNome: "Divulgada no PNCP",
  dataPublicacaoPncp: "2026-11-18T00:00:06",
  dataEncerramentoProposta: "2026-12-09T08:30:01",
  valorTotalEstimado: 56646.5,
  linkSistemaOrigem: null,
  orgaoEntidade: { cnpj: "77817054000179", razaoSocial: "MUNICIPIO DE AMPERE" },
  unidadeOrgao: {
    ufSigla: "PR",
    ufNome: "Paraná",
    municipioNome: "Ampére",
    nomeUnidade: "PREFEITURA MUNICIPAL DE AMPERE",
  },
  amparoLegal: { nome: "Lei 14.133/2021, Art. 28, I" },
  usuarioNome: "someone@example.invalid",
};

const pageFixture = {
  data: [itemFixture],
  totalRegistros: 5108,
  totalPaginas: 103,
  numeroPagina: 1,
  paginasRestantes: 102,
  empty: false,
};

const fixedNow = () => new Date("2026-11-26T00:00:00.000Z");
const collectionRunId = "e07ee8ac-3aae-46fd-8ca1-6ba111a1d2cd";
const noSleep = () => Promise.resolve();

describe("PNCP public consultation client", () => {
  it("maps a published contratação to a Brazilian opportunity", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(pageFixture));
    const client = new PncpApiClient(approvedSource(), { fetcher, now: fixedNow, sleep: noSleep });

    const result = await client.search({ modality: 6, page: 1 });

    expect(result.records).toHaveLength(1);
    expect(result.records[0]).toMatchObject({
      externalId: "77817054000179-1-000127/2026",
      title: "Aquisição de jogos pedagógicos e materiais de apoio à educação infantil.",
      sourceCategoryTerm: "Pregão - Eletrônico",
      referenceNumber: "PR53",
      countryCode: "BR",
      region: "PR",
      city: "Ampére",
      procuringOrganization: "MUNICIPIO DE AMPERE",
      publishedAt: "2026-11-18T03:00:06.000Z",
      closingAt: "2026-12-09T11:30:01.000Z",
      status: "open",
      currency: "BRL",
      amount: "56646.50",
      timeZone: "America/Sao_Paulo",
      sourceUrl: "https://pncp.gov.br/app/editais/77817054000179/2026/127",
    });
    expect(result.nextPage).toBe(2);
    expect(result.total).toBe(5108);
  });

  it("requests the documented endpoint parameters for the selected modality", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(pageFixture));
    const client = new PncpApiClient(approvedSource(), { fetcher, now: fixedNow, sleep: noSleep });

    await client.search({ modality: 9, page: 3, windowDays: 7 });

    const requested = new URL(String(fetcher.mock.calls[0][0]));
    expect(requested.origin).toBe("https://pncp.gov.br");
    expect(requested.pathname).toBe("/api/consulta/v1/contratacoes/publicacao");
    expect(requested.searchParams.get("codigoModalidadeContratacao")).toBe("9");
    expect(requested.searchParams.get("pagina")).toBe("3");
    expect(requested.searchParams.get("tamanhoPagina")).toBe("50");
    expect(requested.searchParams.get("dataInicial")).toBe("20261119");
    expect(requested.searchParams.get("dataFinal")).toBe("20261126");
  });

  it("keeps only the published procurement fields in the raw record", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(pageFixture));
    const client = new PncpApiClient(approvedSource(), { fetcher, now: fixedNow, sleep: noSleep });

    const result = await client.search({ modality: 6 });
    expect(JSON.stringify(result.rawRecords[0].payload)).not.toContain("someone@example.invalid");
  });

  it("rejects an unsupported modality before making a request", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const client = new PncpApiClient(approvedSource(), { fetcher, now: fixedNow, sleep: noSleep });

    await expect(client.search({ modality: 99 })).rejects.toThrow(
      "PNCP modality code is not supported by this connector.",
    );
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("PNCP connector bridge", () => {
  it("buffers, discovers, parses, and produces raw records", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(pageFixture));
    const connector = createPncpSourceConnector(approvedSource(), {
      fetcher,
      now: fixedNow,
      maximumPages: 1,
    });

    await connector.prepare?.(collectionRunId);
    expect(await connector.discover()).toEqual(["77817054000179-1-000127/2026"]);

    const retrieved = await connector.retrieve("77817054000179-1-000127/2026");
    const parsed = await connector.parse(retrieved);
    expect(parsed).toMatchObject({
      externalId: "77817054000179-1-000127/2026",
      countryCode: "BR",
      status: "open",
    });

    const raw = await connector.toRawSourceRecord(
      "77817054000179-1-000127/2026",
      retrieved,
      collectionRunId,
    );
    expect(raw.externalRecordId).toBe("77817054000179-1-000127/2026");
    expect(connector.nextCursor?.()).toContain("6%3A2");
  });

  it("advances to the next modality when a modality is exhausted", async () => {
    const lastPage = { ...pageFixture, numeroPagina: 103, totalPaginas: 103, paginasRestantes: 0 };
    const fetcher = vi.fn<typeof fetch>().mockImplementation(() => Promise.resolve(Response.json(lastPage)));
    const connector = createPncpSourceConnector(approvedSource(), {
      fetcher,
      now: fixedNow,
      maximumPages: 1,
    });

    await connector.prepare?.(collectionRunId);

    const cursor = JSON.parse(decodeURIComponent(String(connector.nextCursor?.())));
    expect(cursor.kind).toBe("pncp");
    expect(cursor.position).toBe(`${pncpModalities[1].code}:1`);
  });
});
