import { describe, expect, it, vi } from "vitest";
import type { SourceRegistryRecord } from "./contracts";
import {
  connectorConfigurationSchema,
  type DiscoveryContext,
} from "./connectors";
import { JsonApiConnector, SyndicationFeedConnector } from "./adapters";

const source: SourceRegistryRecord = {
  id: "e07ee8ac-3aae-46fd-8ca1-6ba111a1d2cd",
  name: "Fixture source",
  publisher: "Fixture publisher",
  website: "https://source.example.org",
  sourceCategory: "government",
  sourceType: "api",
  accessMethod: "api",
  apiOrFeedUrl: "https://source.example.org/api",
  connectorIdentifier: "fixture-source",
  coverageScope: "country",
  coverageRegionCodes: [],
  apiOrFeedAvailable: true,
  opportunityCategories: ["government"],
  languages: ["en-GB"],
  publicationFrequency: "Daily",
  expectedRefreshHours: 24,
  reliability: "verified",
  licensingStatus: "approved",
  termsStatus: "verified",
  permissionsEvidenceUrl: "https://source.example.org/terms",
  licenseUrl: "https://source.example.org/license",
  termsUrl: "https://source.example.org/terms",
  reusePermissionStatus: "permitted",
  attributionRequirements: null,
  robotsRestrictions: null,
  retentionRestrictions: null,
  rateLimitRequests: 60,
  rateLimitWindowSeconds: 3600,
  approvalStatus: "approved",
  approvalConstraints: [],
  approvalConstraintsEnforced: false,
  approvalExpiresAt: null,
  activationStatus: "active",
  integrationStatus: "operational",
  lastSuccessfulRetrieval: null,
  lastUnsuccessfulRetrieval: null,
  nextScheduledCollectionAt: null,
};

const configuration = connectorConfigurationSchema.parse({
  version: 1,
  sourceId: source.id,
  connectorType: "rest_api",
  endpoint: "https://source.example.org/api",
  allowedHosts: ["source.example.org"],
  allowedContentTypes: ["application/json"],
});

const context: DiscoveryContext = {
  source,
  configuration,
  cursor: { cursor: null, etag: null, lastModified: null, updatedAt: null },
  runId: "fixture-run",
};

function createConnector(body: unknown) {
  return new JsonApiConnector({
    source,
    configuration,
    itemsPath: "items",
    idField: "id",
    mapRecord: (record) => record,
    mapToCanonical: (record) => ({
      success: true,
      record,
      category: "government",
      globalType: "tender",
    }),
    dependencies: {
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify(body), {
          headers: { "Content-Type": "application/json" },
        }),
      ),
    },
  });
}

describe("JSON API connector checks", () => {
  it("reports a connection only after validating the response envelope and stable IDs", async () => {
    const valid = createConnector({ items: [{ id: "notice-1" }] });
    await expect(valid.testConnection(context)).resolves.toEqual({
      success: true,
      warnings: [],
    });

    const invalid = createConnector({ items: [{ title: "Missing ID" }] });
    await expect(invalid.testConnection(context)).resolves.toMatchObject({
      success: false,
      errors: [expect.stringContaining("stable identifier")],
    });
  });

  it("reports request failures as validation results rather than throwing", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error("network unavailable"));
    const connector = new JsonApiConnector({
      source,
      configuration,
      itemsPath: "items",
      idField: "id",
      mapRecord: (record) => record,
      mapToCanonical: (record) => ({
        success: true,
        record,
        category: "government",
        globalType: "tender",
      }),
      dependencies: { fetcher },
    });

    await expect(connector.testConnection(context)).resolves.toMatchObject({
      success: false,
      errors: [expect.any(String)],
    });
  });

  it("reports feed payloads lost across adapter instances instead of silently dropping them", async () => {
    const feedConfiguration = connectorConfigurationSchema.parse({
      ...configuration,
      connectorType: "rss",
      allowedContentTypes: ["application/rss+xml"],
    });
    const connector = new SyndicationFeedConnector({
      source,
      configuration: feedConfiguration,
      mapEntry: (entry) => entry,
      mapToCanonical: (record) => ({
        success: true,
        record,
        category: "government",
        globalType: "tender",
      }),
    });

    await expect(connector.fetchRecords({
      ...context,
      configuration: feedConfiguration,
      externalIds: ["notice-from-previous-worker"],
    })).resolves.toMatchObject({
      records: [],
      errors: [{
        kind: "connector_state",
        retryable: false,
      }],
    });
  });
});
