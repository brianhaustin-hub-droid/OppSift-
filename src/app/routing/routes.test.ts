import { describe, expect, it } from "vitest";
import { resolveRoute, routes } from "./routes";

describe("platform routes", () => {
  it("resolves every configured destination", () => {
    for (const route of routes) {
      expect(resolveRoute(route.href)).toEqual({ kind: "page", route });
    }
  });

  it("maps the root to public homepage and resolves dashboard and opportunity detail paths", () => {
    expect(resolveRoute("/")).toEqual({
      kind: "public",
      page: "home",
    });
    expect(resolveRoute("/dashboard")).toEqual({
      kind: "page",
      route: routes.find((route) => route.id === "dashboard"),
    });
    expect(resolveRoute("/opportunity/demo-01")).toEqual({
      kind: "opportunity-detail",
      id: "demo-01",
    });
    expect(resolveRoute("/opportunities/demo-01")).toEqual({
      kind: "opportunity-detail",
      id: "demo-01",
    });
  });

  it("resolves public marketing pages", () => {
    expect(resolveRoute("/platform")).toEqual({ kind: "public", page: "platform" });
    expect(resolveRoute("/product")).toEqual({ kind: "public", page: "platform" });
    expect(resolveRoute("/opportunities")).toEqual({ kind: "public", page: "opportunities" });
    expect(resolveRoute("/solutions")).toEqual({ kind: "public", page: "solutions" });
    expect(resolveRoute("/how-it-works")).toEqual({ kind: "public", page: "how-it-works" });
    expect(resolveRoute("/about")).toEqual({ kind: "public", page: "about" });
    expect(resolveRoute("/contact")).toEqual({ kind: "public", page: "contact" });
  });

  it("returns not-found for unknown and malformed paths", () => {
    expect(resolveRoute("/missing")).toEqual({
      kind: "not-found",
      path: "/missing",
    });
    expect(resolveRoute("/opportunity/%")).toEqual({
      kind: "not-found",
      path: "/opportunity/%",
    });
  });

  it("resolves authentication and invitation routes separately from navigation", () => {
    expect(resolveRoute("/login")).toEqual({ kind: "auth", page: "login" });
    expect(resolveRoute("/register")).toEqual({ kind: "auth", page: "register" });
    expect(resolveRoute("/accept-invitation")).toEqual({
      kind: "accept-invitation",
    });
  });

  it("keeps the profile settings path as an alias of account settings", () => {
    expect(resolveRoute("/settings/profile")).toEqual({
      kind: "page",
      route: routes.find((route) => route.id === "settings"),
    });
  });

  it("resolves category, search, country, and source-detail routes", () => {
    expect(resolveRoute("/discover/search?q=water")).toEqual({
      kind: "page",
      route: routes.find((route) => route.id === "discover"),
    });
    expect(resolveRoute("/discover/country/ss")).toEqual({
      kind: "country",
      countryCode: "SS",
    });
    expect(resolveRoute("/admin/sources/example-id")).toEqual({
      kind: "source-detail",
      sourceId: "example-id",
    });
    expect(resolveRoute("/opportunities/government")).toEqual({
      kind: "page",
      route: routes.find((route) => route.id === "government"),
    });
    expect(resolveRoute("/opportunities/demo-02/documents")).toEqual({
      kind: "opportunity-detail",
      id: "demo-02",
      section: "documents",
    });
  });

  it("resolves opportunity intelligence and pursuit workspace sections", () => {
    expect(resolveRoute("/opportunity/demo-02/documents")).toEqual({
      kind: "opportunity-detail",
      id: "demo-02",
      section: "documents",
    });
    expect(resolveRoute("/opportunity/demo-02/grants")).toEqual({
      kind: "opportunity-detail",
      id: "demo-02",
      section: "grants",
    });
    expect(resolveRoute("/opportunity/demo-02/invalid")).toEqual({
      kind: "not-found",
      path: "/opportunity/demo-02/invalid",
    });
    expect(resolveRoute("/my-opportunities")).toEqual({
      kind: "page",
      route: routes.find((route) => route.id === "my-opportunities"),
    });
    expect(resolveRoute("/my-opportunities/demo-02")).toEqual({
      kind: "workspace-item",
      id: "demo-02",
    });
  });
});
