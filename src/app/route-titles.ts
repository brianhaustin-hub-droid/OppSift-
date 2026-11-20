import { getSupportedCountry } from "../features/opportunities/country-registry";
import type { ResolvedRoute } from "./routing/routes";

/** Page titles used by the document title and the placeholder boundaries. */
export function getPageTitle(route: ResolvedRoute) {
  if (route.kind === "public") {
    const titles: Record<string, string> = {
      home: "Global Opportunities · Intelligent Decisions",
      markets: "Global Markets",
      sources: "Verified Sources",
      platform: "The OppSift Product",
      opportunities: "Opportunity categories",
      solutions: "Solutions",
      "how-it-works": "How It Works",
      about: "About OppSift",
      contact: "Contact OppSift",
    };
    return titles[route.page] ?? "Global Opportunity Intelligence";
  }
  if (route.kind === "auth") {
    if (route.page === "login") return "Sign in";
    if (route.page === "register") return "Create account";
    if (route.page === "forgot-password") return "Reset password";
    if (route.page === "reset-password") return "Choose a new password";
    return "Verify email";
  }
  if (route.kind === "accept-invitation") return "Organization invitation";
  if (route.kind === "opportunity-detail") {
    const sectionLabel: Record<NonNullable<typeof route.section>, string> = {
      overview: "Overview",
      government: "Government intelligence",
      grants: "Funding intelligence",
      commercial: "Commercial intelligence",
      documents: "Documents",
      timeline: "Deadlines",
      source: "Source & verification",
      history: "History",
      requirements: "Requirements",
    };
    return `${sectionLabel[route.section ?? "overview"]} · Opportunity`;
  }
  if (route.kind === "workspace-item") return "Preparation workspace";
  if (route.kind === "country") {
    return getSupportedCountry(route.countryCode)?.name ?? "Country not found";
  }
  if (route.kind === "source-detail") return "Source details";
  if (route.kind === "not-found") return "Page not found";
  return route.route.title;
}

/** Visible URL for a route, used by the temporary placeholders. */
export function getRoutePath(route: ResolvedRoute): string {
  if (route.kind === "public") {
    return {
      home: "/",
      markets: "/markets",
      sources: "/sources",
      platform: "/product",
      opportunities: "/opportunities",
      solutions: "/solutions",
      "how-it-works": "/how-it-works",
      about: "/about",
      contact: "/contact",
    }[route.page];
  }
  if (route.kind === "auth") {
    return {
      login: "/login",
      register: "/register",
      "forgot-password": "/forgot-password",
      "reset-password": "/reset-password",
      "verify-email": "/verify-email",
    }[route.page];
  }
  if (route.kind === "accept-invitation") return "/accept-invitation";
  if (route.kind === "page") return route.route.href;
  if (route.kind === "country") return `/discover/country/${route.countryCode}`;
  if (route.kind === "opportunity-detail") {
    return `/opportunity/${route.id}${route.section ? `/${route.section}` : ""}`;
  }
  if (route.kind === "workspace-item") return `/my-opportunities/${route.id}`;
  if (route.kind === "source-detail") return `/admin/source/${route.sourceId}`;
  return "/";
}
