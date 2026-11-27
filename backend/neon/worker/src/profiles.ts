import type { SourceExecutionProfile } from "../../intelligence/orchestration";
import { supportedCountries } from "../../../../src/features/opportunities/country-registry";
import {
  createAusTenderSourceConnector,
  createBoampSourceConnector,
  createCanadabuysApiConnector,
  createKkjApiConnector,
  createContractsFinderSourceConnector,
  createGrantsGovSourceConnector,
  createKenyaPpipSourceConnector,
  createNestSourceConnector,
  createOcpBulkSourceConnector,
  createSamGovSourceConnector,
  createTedSourceConnector,
  createTenderNedSourceConnector,
} from "../../intelligence/api-client-source-connectors";
import { createWorldBankProcurementConnector } from "../../intelligence/world-bank-procurement";
import { createGambiaGppaSourceConnector } from "../../intelligence/gambia-gppa-api";
import { createUgandaEgpSourceConnector } from "../../intelligence/uganda-egp";
import { createHtmlListSourceConnector } from "../../intelligence/html-list-connector";
import {
  southSudanSite,
  indiaSite,
  philippinesSite,
  sierraLeoneSite,
  sierraLeoneAwardsSite,
  mauritiusSite,
  coteIvoireAppelSite,
  coteIvoireAttributionSite,
  beninSite,
  senegalSite,
  nigerSite,
  burkinaFasoSite,
  burundiSite,
  botswanaSite,
  namibiaSite,
  madagascarSite,
  malawiSite,
  mozambiqueSite,
  kenyaKrcSite,
  kenyaKplcSite,
  kenyaKenhaSite,
  kenyaKerraSite,
  kenyaKuraSite,
  kenyaKaaSite,
  kenyaMygovSite,
  kenyaPpraSite,
  kenyaIfmisSite,
  kenyaAgpoSite,
  kenyaNairobiSite,
  kenyaMombasaSite,
  kenyaKajiadoSite,
  kenyaKerichoSite,
  kenyaBometSite,
  kenyaKakamegaSite,
  kenyaVihigaSite,
  kenyaBungomaSite,
  kenyaBusiaSite,
  kenyaSiayaSite,
  kenyaKisumuSite,
  kenyaHomaBaySite,
  kenyaMigoriSite,
  kenyaKisiiSite,
  kenyaNyamiraSite,
  kenyaUasinGishuSite,
  kenyaMachakosSite,
  kenyaKilifiSite,
  kenyaKwaleSite,
  kenyaMeruSite,
  kenyaEmbuSite,
  kenyaNarokSite,
  kenyaNyeriSite,
  kenyaRerecSite,
  kenyaMohSite,
  kenyaIctaSite,
  ghanaGhanepsSite,
  ghanaPpaSite,
  ghanaMofSite,
  ghanaMohSite,
  ghanaNpaSite,
  egyptGagsSite,
  egyptEpsGagsSite,
  egyptGcsSite,
  egyptSczoneSite,
  egyptMisrPetroleumSite,
  egyptAcudSite,
  moroccoPmmpSite,
} from "../../intelligence/html-sites";

/** Grants.gov doc types that represent an open funding opportunity. */
const GRANTS_GOV_OPEN_DOC_TYPES = ["synopsis", "forecast", "grant"];

/** Launch countries whose public procurement the TED feed covers. */
const TED_COUNTRIES = ["DE", "FR", "NL", "IE", "IT", "ES", "SE", "PL", "DK", "BE"];

/** Profile factory for the GH/EG/MA sources verified 2026-11-17 (migration 0042). */
function mainMarketProfile(
  site: Parameters<typeof createHtmlListSourceConnector>[1],
  countryCode: string,
): SourceExecutionProfile {
  return {
    kind: "native" as const,
    priority: 250,
    mappings: (source) => [{
      sourceId: source.id,
      countryCode,
      sourceTerm: "Tender Notice",
      category: "government" as const,
      globalType: "tender",
    }],
    createConnector(source, options) {
      return createHtmlListSourceConnector(source, site, {
        currentCursor: options.currentCursor,
      });
    },
  };
}

/** SAM.gov "type" values that represent a federal procurement notice. */
const SAM_GOV_NOTICE_TYPES = [
  "Combined Synopsis/Solicitation",
  "Presolicitation",
  "Solicitation",
  "Sources Sought",
  "Special Notice",
  "Justification",
  "Award Notice",
  "Sale of Surplus Property",
  "Foreign Government Standard",
];

export function getSourceExecutionProfiles(
  samGovApiKey?: string,
  gppaApiToken?: string,
): ReadonlyMap<string, SourceExecutionProfile> {
  return new Map<string, SourceExecutionProfile>([
    ["world-bank-procurement-notices", {
      kind: "native" as const,
      priority: 40,
      mappings: (source) => supportedCountries.flatMap((country) => [
        "Request for Expression of Interest",
      ].map((sourceTerm) => ({
        sourceId: source.id,
        countryCode: country.code,
        sourceTerm,
        category: "government" as const,
        globalType: "tender",
      }))),
      createConnector(source, options) {
        return createWorldBankProcurementConnector(source, {
          currentCursor: options.currentCursor,
          pageSize: 100,
          maxPagesPerRun: 10,
          maxRequestsPerRun: 30,
          minimumRequestIntervalMs: 500,
        });
      },
    }],
    ["austender-ocds", {
      kind: "native" as const,
      priority: 30,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "AU",
        sourceTerm: "Contract Award",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createAusTenderSourceConnector(source, {
          currentCursor: options.currentCursor,
          maximumPages: 10,
        });
      },
    }],
    ["boamp-opendata", {
      kind: "native" as const,
      priority: 30,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "FR",
        sourceTerm: "Marché public",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createBoampSourceConnector(source, {
          currentCursor: options.currentCursor,
          pageSize: 100,
          maximumPages: 10,
        });
      },
    }],
    ["tenderned-api", {
      kind: "native" as const,
      priority: 30,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "NL",
        sourceTerm: "Aanbesteding",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createTenderNedSourceConnector(source, {
          currentCursor: options.currentCursor,
          pageSize: 100,
          maximumPages: 10,
        });
      },
    }],
    ["nest-ocds", {
      kind: "native" as const,
      priority: 30,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "TZ",
        sourceTerm: "Tender",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createNestSourceConnector(source, {
          currentCursor: options.currentCursor,
          maximumPages: 10,
        });
      },
    }],
    ["ocp-bulk-uganda", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "UG",
        sourceTerm: "Tender",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createOcpBulkSourceConnector(source, {
          publicationId: 130,
          fileName: "2025.jsonl.gz",
          countryCode: "UG",
          currentCursor: options.currentCursor,
          pageSize: 100,
        });
      },
    }],
    ["ocp-bulk-nigeria", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "NG",
        sourceTerm: "Tender",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createOcpBulkSourceConnector(source, {
          publicationId: 64,
          fileName: "2022.jsonl.gz",
          countryCode: "NG",
          timeZone: "Africa/Lagos",
          currentCursor: options.currentCursor,
          pageSize: 100,
        });
      },
    }],
    ["ocp-bulk-zambia", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "ZM",
        sourceTerm: "Tender",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createOcpBulkSourceConnector(source, {
          publicationId: 3,
          fileName: "2023.jsonl.gz",
          countryCode: "ZM",
          timeZone: "Africa/Lusaka",
          currentCursor: options.currentCursor,
          pageSize: 100,
        });
      },
    }],
    ["ocp-bulk-ghana", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "GH",
        sourceTerm: "Tender",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createOcpBulkSourceConnector(source, {
          publicationId: 85,
          fileName: "full.jsonl.gz",
          countryCode: "GH",
          timeZone: "Africa/Accra",
          currentCursor: options.currentCursor,
          pageSize: 100,
        });
      },
    }],
    ["ocp-bulk-liberia", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "LR",
        sourceTerm: "Tender",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createOcpBulkSourceConnector(source, {
          publicationId: 156,
          fileName: "full.jsonl.gz",
          countryCode: "LR",
          timeZone: "Africa/Monrovia",
          currentCursor: options.currentCursor,
          pageSize: 100,
        });
      },
    }],
    ["ocp-bulk-south-africa", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "ZA",
        sourceTerm: "Tender",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createOcpBulkSourceConnector(source, {
          publicationId: 143,
          fileName: "2025.jsonl.gz",
          countryCode: "ZA",
          timeZone: "Africa/Johannesburg",
          currentCursor: options.currentCursor,
          pageSize: 100,
        });
      },
    }],
    ["ocp-bulk-thailand-bma", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "TH",
        sourceTerm: "Tender",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createOcpBulkSourceConnector(source, {
          publicationId: 158,
          fileName: "full.jsonl.gz",
          countryCode: "TH",
          timeZone: "Asia/Bangkok",
          currentCursor: options.currentCursor,
          pageSize: 100,
        });
      },
    }],
    ["ocp-bulk-indonesia", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "ID",
        sourceTerm: "Tender",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createOcpBulkSourceConnector(source, {
          publicationId: 101,
          fileName: "2025.jsonl.gz",
          countryCode: "ID",
          timeZone: "Asia/Jakarta",
          currentCursor: options.currentCursor,
          pageSize: 100,
        });
      },
    }],
    ["canadabuys-api", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "CA",
        sourceTerm: "Tender Notice",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createCanadabuysApiConnector(source, {
          currentCursor: options.currentCursor,
          pageSize: 50,
          maximumPages: 10,
        });
      },
    }],
    ["kkj-api", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "JP",
        sourceTerm: "Tender Notice",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createKkjApiConnector(source, {
          currentCursor: options.currentCursor,
          backfillDays: 21,
          maximumPages: 8,
        });
      },
    }],
    ["html-philippines", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "PH",
        sourceTerm: "Bid Notice",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, philippinesSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["html-india", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "IN",
        sourceTerm: "Tender",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, indiaSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["html-south-sudan", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "SS",
        sourceTerm: "Invitation for Bids",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, southSudanSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["html-sierra-leone", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "SL",
        sourceTerm: "Invitation for Bids",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, sierraLeoneSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["html-sierra-leone-awards", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "SL",
        sourceTerm: "Contract Award",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, sierraLeoneAwardsSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["html-uganda-egp-notices", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "UG",
        sourceTerm: "Bid Notice",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createUgandaEgpSourceConnector(source, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["html-mauritius", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "MU",
        sourceTerm: "Procurement Notice",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, mauritiusSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["html-ci-appel", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "CI",
        sourceTerm: "Appel d'offres",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, coteIvoireAppelSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["html-ci-attribution", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "CI",
        sourceTerm: "Avis d'attribution",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, coteIvoireAttributionSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["html-benin-armp-notices", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "BJ",
        sourceTerm: "Invitation for Bids",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, beninSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["html-senegal-marchespub-notices", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "SN",
        sourceTerm: "Invitation for Bids",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, senegalSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["html-gambia-ppag-notices", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "GM",
        sourceTerm: "Invitation for Bids",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createGambiaGppaSourceConnector(source, {
          token: gppaApiToken,
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["html-niger-armp-notices", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "NE",
        sourceTerm: "Invitation for Bids",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, nigerSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["html-burkina-faso-armp-notices", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "BF",
        sourceTerm: "Invitation for Bids",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, burkinaFasoSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["html-botswana-ppa-notices", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "BW",
        sourceTerm: "Invitation for Bids",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, botswanaSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["html-namibia-cpbn-notices", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "NA",
        sourceTerm: "Invitation for Bids",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, namibiaSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["html-madagascar-dgcp-notices", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "MG",
        sourceTerm: "Invitation for Bids",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, madagascarSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["html-burundi-armp-notices", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "BI",
        sourceTerm: "Avis d'appel d'offres",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, burundiSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["html-malawi-ppda-notices", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "MW",
        sourceTerm: "Invitation for Bids",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, malawiSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["html-mozambique-sisac-notices", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "MZ",
        sourceTerm: "Invitation for Bids",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, mozambiqueSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["kenya-ppip-api", {
      kind: "native" as const,
      priority: 30,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "KE",
        sourceTerm: "Active Tender",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createKenyaPpipSourceConnector(source, {
          currentCursor: options.currentCursor,
          // Balanced backfill: faster than tiny runs but resilient to transient 5xx/530.
          maximumPages: 6,
        });
      },
    }],
    ["planned-ke-krc-tenders", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "KE",
        sourceTerm: "Tender Notice",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, kenyaKrcSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["planned-ke-kplc-tenders", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "KE",
        sourceTerm: "Tender Notice",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, kenyaKplcSite, {
          currentCursor: options.currentCursor,
          browser: options.browser,
        });
      },
    }],
    ["planned-ke-kenha-tenders", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "KE",
        sourceTerm: "Tender",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, kenyaKenhaSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["planned-ke-kerra-tenders", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "KE",
        sourceTerm: "Tender",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, kenyaKerraSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["planned-ke-kura-tenders", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "KE",
        sourceTerm: "Tender",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, kenyaKuraSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["planned-ke-kaa-tenders", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "KE",
        sourceTerm: "Tender",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, kenyaKaaSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["planned-ke-mygov-gaa-all-tenders", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "KE",
        sourceTerm: "Tender Notice",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, kenyaMygovSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["planned-ke-ppra-notices", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "KE",
        sourceTerm: "Tender Notice",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, kenyaPpraSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["planned-ke-ifmis-supplier-portal", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "KE",
        sourceTerm: "Tender",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, kenyaIfmisSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["planned-ke-agpo-opportunities", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "KE",
        sourceTerm: "Tender Notice",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, kenyaAgpoSite, {
          currentCursor: options.currentCursor,
          browser: options.browser,
        });
      },
    }],
    ["planned-ke-nairobi-county-procurement", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "KE",
        sourceTerm: "Tender Notice",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, kenyaNairobiSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["planned-ke-mombasa-county-procurement", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "KE",
        sourceTerm: "Tender Notice",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, kenyaMombasaSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    // Kenya county procurement sources — live-verified 2026-11-17
    // (docs/source-catalog/kenya-deep-source-inventory.md, section 2 county table).
    ["planned-ke-kajiado-county-procurement", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "KE",
        sourceTerm: "Tender Notice",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, kenyaKajiadoSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["planned-ke-kericho-county-procurement", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "KE",
        sourceTerm: "Tender Notice",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, kenyaKerichoSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["planned-ke-bomet-county-procurement", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "KE",
        sourceTerm: "Tender Notice",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, kenyaBometSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["planned-ke-kakamega-county-procurement", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "KE",
        sourceTerm: "Tender Notice",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, kenyaKakamegaSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["planned-ke-vihiga-county-procurement", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "KE",
        sourceTerm: "Tender Notice",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, kenyaVihigaSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["planned-ke-bungoma-county-procurement", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "KE",
        sourceTerm: "Tender Notice",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, kenyaBungomaSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["planned-ke-busia-county-procurement", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "KE",
        sourceTerm: "Tender Notice",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, kenyaBusiaSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["planned-ke-siaya-county-procurement", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "KE",
        sourceTerm: "Tender Notice",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, kenyaSiayaSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["planned-ke-kisumu-county-procurement", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "KE",
        sourceTerm: "Tender Notice",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, kenyaKisumuSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["planned-ke-homabay-county-procurement", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "KE",
        sourceTerm: "Tender Notice",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, kenyaHomaBaySite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["planned-ke-migori-county-procurement", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "KE",
        sourceTerm: "Tender Notice",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, kenyaMigoriSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["planned-ke-kisii-county-procurement", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "KE",
        sourceTerm: "Tender Notice",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, kenyaKisiiSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["planned-ke-nyamira-county-procurement", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "KE",
        sourceTerm: "Tender Notice",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, kenyaNyamiraSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    // Kenya sources live-verified 2026-11-17 (migration 0041): 8 counties + 3 sector agencies.
    ["planned-ke-uasingishu-county-procurement", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "KE",
        sourceTerm: "Tender Notice",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, kenyaUasinGishuSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["planned-ke-machakos-county-procurement", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "KE",
        sourceTerm: "Tender Notice",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, kenyaMachakosSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["planned-ke-kilifi-county-procurement", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "KE",
        sourceTerm: "Tender Notice",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, kenyaKilifiSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["planned-ke-kwale-county-procurement", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "KE",
        sourceTerm: "Tender Notice",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, kenyaKwaleSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["planned-ke-meru-county-procurement", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "KE",
        sourceTerm: "Tender Notice",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, kenyaMeruSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["planned-ke-embu-county-procurement", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "KE",
        sourceTerm: "Tender Notice",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, kenyaEmbuSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["planned-ke-narok-county-procurement", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "KE",
        sourceTerm: "Tender Notice",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, kenyaNarokSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["planned-ke-nyeri-county-procurement", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "KE",
        sourceTerm: "Tender Notice",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, kenyaNyeriSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["planned-ke-rerec-tenders", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "KE",
        sourceTerm: "Tender Notice",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, kenyaRerecSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["planned-ke-moh-tenders", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "KE",
        sourceTerm: "Tender Notice",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, kenyaMohSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["planned-ke-icta-tenders", {
      kind: "native" as const,
      priority: 250,
      mappings: (source) => [{
        sourceId: source.id,
        countryCode: "KE",
        sourceTerm: "Tender Notice",
        category: "government" as const,
        globalType: "tender",
      }],
      createConnector(source, options) {
        return createHtmlListSourceConnector(source, kenyaIctaSite, {
          currentCursor: options.currentCursor,
        });
      },
    }],
    ["ted-published-notices", {
      kind: "native" as const,
      priority: 30,
      mappings: (source) => TED_COUNTRIES.map((countryCode) => ({
        sourceId: source.id,
        countryCode,
        sourceTerm: "TED notice",
        category: "government" as const,
        globalType: "tender",
      })),
      createConnector(source, options) {
        return createTedSourceConnector(source, {
          currentCursor: options.currentCursor,
          pageSize: 100,
          maximumPages: 10,
        });
      },
    }],
    ["contracts-finder-ocds", {
      kind: "native" as const,
      priority: 35,
      mappings: [],
      createConnector(source, options) {
        return createContractsFinderSourceConnector(source, {
          currentCursor: options.currentCursor,
          pageSize: 100,
          maximumPages: 10,
        });
      },
    }],
    ["sam-gov-opportunities", {
      kind: "native" as const,
      priority: 30,
      mappings: (source) => SAM_GOV_NOTICE_TYPES.map((sourceTerm) => ({
        sourceId: source.id,
        countryCode: "US",
        sourceTerm,
        category: "government" as const,
        globalType: "tender",
      })),
      createConnector(source, options) {
        return createSamGovSourceConnector(source, samGovApiKey, {
          currentCursor: options.currentCursor,
          pageSize: 100,
          maximumPages: 10,
        });
      },
    }],
    ["grants-gov-search", {
      kind: "native" as const,
      priority: 20,
      mappings: (source) => supportedCountries.flatMap((country) =>
        GRANTS_GOV_OPEN_DOC_TYPES.map((sourceTerm) => ({
          sourceId: source.id,
          countryCode: country.code,
          sourceTerm,
          category: "grants" as const,
          globalType: "grant",
        })),
      ),
      createConnector(source, options) {
        return createGrantsGovSourceConnector(source, {
          currentCursor: options.currentCursor,
          pageSize: 100,
          maximumPages: 10,
          windowDays: 30,
        });
      },
    }],
    // Ghana, Egypt and Morocco national/agency sources live-verified 2026-11-17 (migration 0042).
    ["planned-gh-ghaneps", mainMarketProfile(ghanaGhanepsSite, "GH")],
    ["planned-gh-ppa", mainMarketProfile(ghanaPpaSite, "GH")],
    ["planned-gh-mof", mainMarketProfile(ghanaMofSite, "GH")],
    ["planned-gh-moh", mainMarketProfile(ghanaMohSite, "GH")],
    ["planned-gh-npa", mainMarketProfile(ghanaNpaSite, "GH")],
    ["planned-eg-gags", mainMarketProfile(egyptGagsSite, "EG")],
    ["planned-eg-epsgags", mainMarketProfile(egyptEpsGagsSite, "EG")],
    ["planned-eg-gcs", mainMarketProfile(egyptGcsSite, "EG")],
    ["planned-eg-sczone", mainMarketProfile(egyptSczoneSite, "EG")],
    ["planned-eg-misr-petroleum", mainMarketProfile(egyptMisrPetroleumSite, "EG")],
    ["planned-eg-acud", mainMarketProfile(egyptAcudSite, "EG")],
    ["planned-ma-pmmp", mainMarketProfile(moroccoPmmpSite, "MA")],
  ]);
}
