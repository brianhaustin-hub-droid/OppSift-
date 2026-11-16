import { RouteLink } from "./routing/router";
import type { OpportunityCategory } from "../features/opportunities/opportunity-feed";
import { Badge } from "../shared/ui/components";
import { EmptyState } from "../shared/ui/feedback";
import { ProfileSettingsPage } from "./auth/ProfileSettingsPage";
import { OrganizationsPage } from "./organizations/OrganizationPages";
import type { RouteDefinition, ResolvedRoute } from "./routing/routes";
import { DiscoveryExperience } from "../features/discovery/DiscoveryExperience";
import { getSupportedCountry } from "../features/opportunities/country-registry";
import { MyOpportunitiesPage, OpportunityIntelligencePage, OpportunityPreparationPage, sectionFromRoute } from "../features/opportunities/OpportunityIntelligence";
import { BackendStatusPage } from "./diagnostics/BackendStatusPage";
import { IntelligencePage } from "../features/intelligence/IntelligencePage";
import { AlertsPage } from "../features/monitoring/AlertsPage";

type PlatformPageProps = {
  category: OpportunityCategory | "all";
  country: string | "all";
  locationQuery: string;
  onCategoryChange: (category: OpportunityCategory | "all") => void;
  path: string;
  route: ResolvedRoute;
  userId?: string;
};

function PageHeading({
  eyebrow = "Workspace",
  title,
  description,
  badge,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <header className="page-heading">
      <div className="page-heading__copy">
        <p className="page-heading__eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-heading__description">{description}</p>
      </div>
      {badge && <Badge tone="warning">{badge}</Badge>}
    </header>
  );
}

function PlannedFeaturePage({ route }: { route: RouteDefinition }) {
  return (
    <div className="platform-page">
      <PageHeading
        description={route.description}
        eyebrow="Planned product area"
        title={route.title}
        badge="NOT CONNECTED"
      />
      <EmptyState
        description="This area is part of the OppSift platform plan but is not implemented or connected to live services yet."
        title={`${route.title} is being prepared`}
      />
    </div>
  );
}

function RestrictedPage() {
  return (
    <div className="platform-page">
      <PageHeading
        description="Administration is permission-gated and requires an authenticated administrator."
        eyebrow="Restricted area"
        title="Administrator permission required"
        badge="ACCESS RESTRICTED"
      />
      <EmptyState
        description="Platform-level administration is not enabled. Organization administrator roles do not grant platform administration, and no administrative data has been loaded."
        title="You don’t have access to this area"
      />
    </div>
  );
}

function NotFoundPage({ path }: { path: string }) {
  return (
    <div className="platform-page">
      <PageHeading
        description={`There is no configured OppSift route for ${path}.`}
        eyebrow="Page not found"
        title="We couldn’t find that page"
      />
      <EmptyState
        action={
          <RouteLink className="ui-button ui-button--primary" href="/dashboard">
            Go to overview
          </RouteLink>
        }
        description="Use the platform navigation to continue."
        title="This destination is not available"
      />
    </div>
  );
}

export function PlatformPage({
  category,
  country,
  locationQuery,
  onCategoryChange,
  path,
  route,
  userId,
}: PlatformPageProps) {
  if (route.kind === "auth" || route.kind === "accept-invitation" || route.kind === "public") return null;

  if (route.kind === "not-found") {
    return <NotFoundPage path={route.path} />;
  }

  if (route.kind === "opportunity-detail") {
    return (
      <OpportunityIntelligencePage
        id={route.id}
        section={sectionFromRoute(route)}
        userId={userId}
      />
    );
  }
  if (route.kind === "workspace-item") {
    return <OpportunityPreparationPage id={route.id} userId={userId} />;
  }
  if (route.kind === "country") {
    return (
      <DiscoveryExperience
        key={userId ?? "anonymous"}
        countryCode={route.countryCode}
        defaultCategory={category}
        demonstrationCountry={country}
        locationQuery={locationQuery}
        onCategoryChange={onCategoryChange}
        path={path}
        routeId="discover"
        userId={userId}
      />
    );
  }
  if (route.kind === "source-detail") return <RestrictedPage />;

  if (route.route.id === "dashboard") return null;

  if (
    route.route.id === "discover" ||
    route.route.id === "government" ||
    route.route.id === "grants" ||
    route.route.id === "commercial" ||
    route.route.id === "saved-searches" ||
    route.route.id === "search-history" ||
    route.route.id === "saved"
  ) {
    return (
      <DiscoveryExperience
        key={userId ?? "anonymous"}
        defaultCategory={category}
        demonstrationCountry={country}
        locationQuery={locationQuery}
        onCategoryChange={onCategoryChange}
        path={path}
        routeId={route.route.id}
        userId={userId}
      />
    );
  }

  if (route.route.id === "my-opportunities") {
    return <MyOpportunitiesPage userId={userId} />;
  }
  if (route.route.id === "intelligence") return <IntelligencePage />;
  if (route.route.id === "alerts") return <AlertsPage />;
  if (route.route.id === "backend-status") return <BackendStatusPage />;

  if (route.route.status === "restricted") return <RestrictedPage />;
  if (route.route.id === "teams") return <OrganizationsPage />;
  if (route.route.id === "settings") return <ProfileSettingsPage />;

  return <PlannedFeaturePage route={route.route} />;
}

export function PlatformBreadcrumbs({ route }: { route: ResolvedRoute }) {
  if (route.kind === "auth" || route.kind === "accept-invitation" || route.kind === "public") return null;
  if (route.kind === "page" && route.route.id === "dashboard") return null;
  let currentLabel = "Page not found";
  if (route.kind === "page") currentLabel = route.route.label;
  else if (route.kind === "opportunity-detail") currentLabel = "Opportunity";
  else if (route.kind === "workspace-item") currentLabel = "Preparation workspace";
  else if (route.kind === "country") {
    currentLabel = getSupportedCountry(route.countryCode)?.name ?? "Country";
  } else if (route.kind === "source-detail") currentLabel = "Source details";

  return (
    <nav aria-label="Breadcrumb" className="platform-breadcrumbs">
      <RouteLink href="/dashboard">Overview</RouteLink>
      <span aria-hidden="true">/</span>
      <span aria-current="page">{currentLabel}</span>
    </nav>
  );
}

export function getPageTitle(route: ResolvedRoute) {
  if (route.kind === "public") {
    const titles: Record<string, string> = {
      home: "Global Opportunities · Intelligent Decisions",
      markets: "Global Markets",
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
