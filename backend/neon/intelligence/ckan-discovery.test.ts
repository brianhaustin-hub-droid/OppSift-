import { describe, expect, it, vi } from "vitest";
import { CkanDiscoveryClient } from "./ckan-discovery";

const baseUrl = "https://catalog.data.gov";
const allowedHosts = ["catalog.data.gov"];

const packageRecord = {
  id: "dataset-1",
  name: "procurement-opportunities",
  title: "Procurement opportunities",
  notes: "Publisher dataset metadata.",
  metadata_modified: "2026-11-01T10:00:00Z",
  license_id: "cc-zero",
  license_title: "Creative Commons CCZero",
  license_url: "https://creativecommons.org/publicdomain/zero/1.0/",
  resources: [{
    id: "resource-1",
    name: "Open data file",
    format: "JSON",
    url: "https://catalog.data.gov/resource/1",
  }],
};

describe("CKAN catalog discovery client", () => {
  it("uses the CKAN Action API package_search endpoint with bounded pagination", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        success: true,
        result: { count: 40, results: [packageRecord] },
      }),
    );
    const client = new CkanDiscoveryClient({ baseUrl, allowedHosts, fetcher });

    const result = await client.search("procurement", { start: 20, rows: 10 });
    const requestUrl = new URL(String(fetcher.mock.calls[0]?.[0]));

    expect(requestUrl.origin + requestUrl.pathname).toBe(
      "https://catalog.data.gov/api/3/action/package_search",
    );
    expect(requestUrl.searchParams.get("q")).toBe("procurement");
    expect(requestUrl.searchParams.get("start")).toBe("20");
    expect(requestUrl.searchParams.get("rows")).toBe("10");
    expect(result).toEqual({
      total: 40,
      start: 20,
      rows: 10,
      datasets: [packageRecord],
    });
  });

  it("requires HTTPS and an explicitly approved host", () => {
    expect(() => new CkanDiscoveryClient({
      baseUrl: "https://other.example",
      allowedHosts,
    })).toThrow("approved hostname");
    expect(() => new CkanDiscoveryClient({
      baseUrl: "http://catalog.data.gov",
      allowedHosts,
    })).toThrow("HTTPS");
  });

  it("rejects unbounded or invalid query parameters before fetching", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const client = new CkanDiscoveryClient({ baseUrl, allowedHosts, fetcher });

    await expect(client.search(" ")).rejects.toThrow("search query");
    await expect(client.search("procurement", { start: -1 })).rejects.toThrow("start");
    await expect(client.search("procurement", { rows: 101 })).rejects.toThrow("rows");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("checks CKAN success=false even when HTTP returns JSON", async () => {
    const client = new CkanDiscoveryClient({
      baseUrl,
      allowedHosts,
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(Response.json({
        success: false,
        error: { message: "Bad query" },
      })),
    });

    await expect(client.search("procurement")).rejects.toThrow("Action API package_search format");
  });

  it("rejects malformed or oversized pages", async () => {
    const malformed = new CkanDiscoveryClient({
      baseUrl,
      allowedHosts,
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(Response.json({
        success: true,
        result: { count: "many", results: [] },
      })),
    });
    await expect(malformed.search("procurement")).rejects.toThrow("Action API package_search format");

    const tooMany = new CkanDiscoveryClient({
      baseUrl,
      allowedHosts,
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(Response.json({
        success: true,
        result: { count: 2, results: [packageRecord, packageRecord] },
      })),
    });
    await expect(tooMany.search("procurement", { rows: 1 })).rejects.toThrow("more datasets than requested");
  });
});
