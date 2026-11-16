export type RouteDefinition = {
  description: string;
  group: "workspace" | "manage" | "account";
  href: string;
  id: string;
  label: string;
  permission?: "admin:access";
  status: "available" | "planned" | "restricted";
  title: string;
};

export const routes: readonly RouteDefinition[] = [
  {
    id: "dashboard",
    href: "/dashboard",
    label: "Overview",
    title: "Overview",
    description: "A cross-market view of your opportunity workspace.",
    group: "workspace",
    status: "available",
  },
  {
    id: "discover",
    href: "/discover",
    label: "Discover opportunities",
    title: "Discover opportunities",
    description: "Explore opportunities across the planned product stages.",
    group: "workspace",
    status: "available",
  },
  {
    id: "government",
    href: "/discover/government",
    label: "Government contracts",
    title: "Government contracts",
    description: "Tender and public procurement intelligence.",
    group: "workspace",
    status: "available",
  },
  {
    id: "grants",
    href: "/discover/grants",
    label: "Grants & funding",
    title: "Grants & funding",
    description: "Funding, grant, and financing opportunities.",
    group: "workspace",
    status: "available",
  },
  {
    id: "commercial",
    href: "/discover/commercial",
    label: "Commercial opportunities",
    title: "Commercial opportunities",
    description: "Private-sector contracts, partnerships, and programmes.",
    group: "workspace",
    status: "available",
  },
  {
    id: "saved-searches",
    href: "/saved-searches",
    label: "Saved searches",
    title: "Saved searches",
    description: "Return to search configurations saved in this browser.",
    group: "manage",
    status: "available",
  },
  {
    id: "search-history",
    href: "/search-history",
    label: "Search history",
    title: "Search history",
    description: "Review recent searches stored in this browser.",
    group: "manage",
    status: "available",
  },
  {
    id: "my-opportunities",
    href: "/my-opportunities",
    label: "My Opportunities",
    title: "My Opportunities",
    description: "Track and prepare pursuits in a browser-only preview workspace.",
    group: "manage",
    status: "available",
  },
  {
    id: "backend-status",
    href: "/backend-status",
    label: "Backend status",
    title: "Backend status",
    description: "Inspect safe development connection and service status.",
    group: "account",
    status: "available",
  },
  {
    id: "intelligence",
    href: "/intelligence",
    label: "AI intelligence",
    title: "AI intelligence",
    description: "Evidence-linked analysis and explainable opportunity fit.",
    group: "workspace",
    status: "planned",
  },
  {
    id: "saved",
    href: "/saved",
    label: "Saved opportunities",
    title: "Saved opportunities",
    description: "A personal shortlist of opportunities to revisit.",
    group: "manage",
    status: "planned",
  },
  {
    id: "applications",
    href: "/applications",
    label: "Applications & bids",
    title: "My applications & bids",
    description: "A pursuit workspace for applications, bids, and milestones.",
    group: "manage",
    status: "planned",
  },
  {
    id: "teams",
    href: "/teams",
    label: "Organisations & teams",
    title: "Organisations & teams",
    description: "Organisation profiles, capabilities, and team access.",
    group: "manage",
    status: "planned",
  },
  {
    id: "alerts",
    href: "/alerts",
    label: "Alerts & monitoring",
    title: "Alerts & monitoring",
    description: "Watchlists and source change notifications.",
    group: "manage",
    status: "planned",
  },
  {
    id: "analytics",
    href: "/analytics",
    label: "Reports & analytics",
    title: "Reports & analytics",
    description: "Opportunity, pursuit, and portfolio reporting.",
    group: "manage",
    status: "planned",
  },
  {
    id: "settings",
    href: "/settings",
    label: "Settings",
    title: "Settings",
    description: "Workspace preferences, profile, and notification settings.",
    group: "account",
    status: "planned",
  },
  {
    id: "admin",
    href: "/admin",
    label: "Administration",
    title: "Administration",
    description: "Platform configuration and operational controls.",
    group: "account",
    permission: "admin:access",
    status: "restricted",
  },
  {
    id: "admin-sources",
    href: "/admin/sources",
    label: "Source registry",
    title: "Source registry",
    description: "Inspect source candidates and their verification state.",
    group: "account",
    permission: "admin:access",
    status: "restricted",
  },
  {
    id: "admin-coverage",
    href: "/admin/coverage",
    label: "Country coverage",
    title: "Country coverage",
    description: "Review country and category coverage evidence.",
    group: "account",
    permission: "admin:access",
    status: "restricted",
  },
  {
    id: "admin-ingestion",
    href: "/admin/ingestion",
    label: "Ingestion monitoring",
    title: "Ingestion monitoring",
    description: "Inspect ingestion runs and source health.",
    group: "account",
    permission: "admin:access",
    status: "restricted",
  },
  {
    id: "admin-quality",
    href: "/admin/quality",
    label: "Data quality review",
    title: "Data quality review",
    description: "Review catalogue validation and duplicate issues.",
    group: "account",
    permission: "admin:access",
    status: "restricted",
  },
  {
    id: "support",
    href: "/support",
    label: "Help & support",
    title: "Help & support",
    description: "Product guidance and support resources.",
    group: "account",
    status: "planned",
  },
];

export type PublicPage =
  | "home"
  | "markets"
  | "platform"
  | "opportunities"
  | "solutions"
  | "how-it-works"
  | "about"
  | "contact";

export type ResolvedRoute =
  | { kind: "not-found"; path: string }
  | { kind: "public"; page: PublicPage }
  | { kind: "auth"; page: "login" | "register" | "forgot-password" | "reset-password" | "verify-email" }
  | { kind: "accept-invitation" }
  | {
      kind: "opportunity-detail";
      id: string;
      section?:
        | "overview"
        | "government"
        | "grants"
        | "commercial"
        | "documents"
        | "timeline"
        | "source"
        | "history"
        | "requirements";
    }
  | { kind: "workspace-item"; id: string }
  | { kind: "country"; countryCode: string }
  | { kind: "source-detail"; sourceId: string }
  | { kind: "page"; route: RouteDefinition };

type OpportunitySection = NonNullable<
  Extract<ResolvedRoute, { kind: "opportunity-detail" }>["section"]
>;

const opportunitySections: readonly OpportunitySection[] = [
  "overview",
  "government",
  "grants",
  "commercial",
  "documents",
  "timeline",
  "source",
  "history",
  "requirements",
];

function isOpportunitySection(value: string): value is OpportunitySection {
  return opportunitySections.includes(value as OpportunitySection);
}

const publicRoutes: Readonly<Record<string, PublicPage>> = {
  "/": "home",
  "/markets": "markets",
  "/platform": "platform",
  "/product": "platform",
  "/opportunities": "opportunities",
  "/solutions": "solutions",
  "/how-it-works": "how-it-works",
  "/about": "about",
  "/contact": "contact",
};

export function resolveRoute(pathname: string): ResolvedRoute {
  const pathOnly = pathname.split(/[?#]/u, 1)[0] ?? "";
  const normalizedPath =
    pathOnly.length > 1 ? pathOnly.replace(/\/+$/, "") : pathOnly;

  // Public marketing routes
  const publicPage = publicRoutes[normalizedPath];
  if (publicPage) return { kind: "public", page: publicPage };

  const authPageByPath: Readonly<Record<string, ResolvedRoute>> = {
    "/login": { kind: "auth", page: "login" },
    "/register": { kind: "auth", page: "register" },
    "/forgot-password": { kind: "auth", page: "forgot-password" },
    "/reset-password": { kind: "auth", page: "reset-password" },
    "/verify-email": { kind: "auth", page: "verify-email" },
    "/accept-invitation": { kind: "accept-invitation" },
  };
  const authPage = authPageByPath[normalizedPath];
  if (authPage) return authPage;

  const legacyCategoryPath: Readonly<Record<string, string>> = {
    "/opportunities/government": "/discover/government",
    "/opportunities/grants": "/discover/grants",
    "/opportunities/commercial": "/discover/commercial",
  };
  const legacyCategory = legacyCategoryPath[normalizedPath];
  if (legacyCategory) {
    const categoryRoute = routes.find((candidate) => candidate.href === legacyCategory);
    if (categoryRoute) return { kind: "page", route: categoryRoute };
  }

  const opportunityMatch = normalizedPath.match(
    /^\/(?:opportunity|opportunities)\/([^/]+)(?:\/([^/]+))?$/,
  );
  if (opportunityMatch) {
    try {
      const id = decodeURIComponent(opportunityMatch[1]);
      const section = opportunityMatch[2];
      if (!id || id.includes("/")) {
        return { kind: "not-found", path: normalizedPath };
      }
      if (!section || section === "overview") return { kind: "opportunity-detail", id };
      if (!isOpportunitySection(section)) {
        return { kind: "not-found", path: normalizedPath };
      }
      return {
        kind: "opportunity-detail",
        id,
        section,
      };
    } catch {
      return { kind: "not-found", path: normalizedPath };
    }
  }

  const workspaceItemMatch = normalizedPath.match(/^\/my-opportunities\/([^/]+)$/);
  if (workspaceItemMatch) {
    try {
      const id = decodeURIComponent(workspaceItemMatch[1]);
      if (id && !id.includes("/")) return { kind: "workspace-item", id };
    } catch {
      return { kind: "not-found", path: normalizedPath };
    }
  }

  const countryMatch = normalizedPath.match(/^\/discover\/country\/([A-Za-z]{2})$/);
  if (countryMatch) {
    return { kind: "country", countryCode: countryMatch[1].toUpperCase() };
  }

  const sourceMatch = normalizedPath.match(/^\/admin\/sources\/([^/]+)$/);
  if (sourceMatch) {
    try {
      const sourceId = decodeURIComponent(sourceMatch[1]);
      if (sourceId) return { kind: "source-detail", sourceId };
    } catch {
      return { kind: "not-found", path: normalizedPath };
    }
  }

  const aliases: Readonly<Record<string, string>> = {
    "/settings/profile": "/settings",
  };
  const canonicalPath = aliases[normalizedPath] ?? normalizedPath;
  const route = routes.find(
    (candidate) =>
      candidate.href === canonicalPath ||
      (canonicalPath === "/discover/search" &&
        candidate.id === "discover") ||
      (canonicalPath === "/dashboard" && candidate.id === "dashboard"),
  );
  return route
    ? { kind: "page", route }
    : { kind: "not-found", path: normalizedPath };
}
