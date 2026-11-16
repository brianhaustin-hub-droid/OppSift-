import { useEffect, useState } from "react";
import { RouteLink } from "../../app/routing/router";
import { PlatformIcon } from "../../app/shell/PlatformIcon";
import { Badge, Card, DataTable, type TableColumn } from "../../shared/ui/components";
import { EmptyState } from "../../shared/ui/feedback";
import { supportedCountries } from "../opportunities/country-registry";
import { useAuth } from "../../app/auth/AuthProvider";
import { useOrganizations } from "../../app/organizations/OrganizationProvider";
import {
  fetchActiveSourceCount,
  fetchLiveOpportunities,
  liveFeedConfigured,
  type LiveOpportunity,
  type OpportunityCategory,
} from "../opportunities/opportunity-feed";

type DashboardPageProps = {
  category: OpportunityCategory | "all";
  country: string | "all";
  query: string;
};

function MetricCard({
  description,
  label,
  value,
}: {
  description: string;
  label: string;
  value: string;
}) {
  return (
    <Card as="article" className="dashboard-metric">
      <p className="dashboard-metric__label">{label}</p>
      <p className="dashboard-metric__value">{value}</p>
      <p className="dashboard-metric__description">{description}</p>
    </Card>
  );
}

function Distribution({
  items,
  title,
}: {
  items: readonly { label: string; value: number }[];
  title: string;
}) {
  const maximum = Math.max(...items.map((item) => item.value), 1);

  return (
    <section aria-label={title} className="distribution-list">
      {items.map((item) => {
        const width = `${Math.max((item.value / maximum) * 100, 4)}%`;
        return (
          <div className="distribution-item" key={item.label}>
            <div className="distribution-item__heading">
              <span>{item.label}</span>
              <span>{item.value} records</span>
            </div>
            <div aria-hidden="true" className="distribution-track">
              <span style={{ width }} />
            </div>
          </div>
        );
      })}
    </section>
  );
}

const opportunityColumns: readonly TableColumn<LiveOpportunity>[] = [
  {
    key: "title",
    header: "Opportunity",
    render: (opportunity) => (
      <a
        className="dashboard-opportunity-link"
        href={opportunity.canonicalUrl}
        rel="noreferrer noopener"
        target="_blank"
      >
        {opportunity.title}
      </a>
    ),
  },
  {
    key: "category",
    header: "Stage",
    render: (opportunity) => (
      <Badge tone="neutral">{opportunity.categoryLabel}</Badge>
    ),
  },
  {
    key: "market",
    header: "Market",
    render: (opportunity) => opportunity.countryLabel,
  },
  {
    key: "deadline",
    header: "Deadline",
    render: (opportunity) => opportunity.deadlineLabel,
  },
];

export function DashboardPage({
  category,
  country,
  query,
}: DashboardPageProps) {
  const { user } = useAuth();
  const { activeOrganization } = useOrganizations();

  const [activeSourceCount, setActiveSourceCount] = useState(0);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [opportunities, setOpportunities] = useState<readonly LiveOpportunity[]>([]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    void Promise.all([
      fetchLiveOpportunities({
        category,
        countryCodes: country === "all" ? [] : [country],
        query,
      }),
      fetchActiveSourceCount(),
    ]).then(([result, coverage]) => {
      if (cancelled) return;
      setOpportunities(result.opportunities);
      setError(result.error || coverage.error);
      setActiveSourceCount(coverage.count);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [category, country, query]);

  const categoryDistribution = [
    { label: "Government contracts", key: "government" },
    { label: "Grants & funding", key: "grants" },
    { label: "Commercial opportunities", key: "commercial" },
  ].map((item) => ({
    label: item.label,
    value: opportunities.filter((opportunity) => opportunity.category === item.key)
      .length,
  }));
  const countryDistribution = [
    ...new Set(opportunities.map((opportunity) => opportunity.countryLabel)),
  ].map((countryName) => ({
    label: countryName,
    value: opportunities.filter(
      (opportunity) => opportunity.countryLabel === countryName,
    ).length,
  }));
  const now = Date.now();
  const thirtyDaysFromNow = now + 30 * 24 * 60 * 60 * 1000;
  const datedOpportunities = opportunities
    .map((opportunity) => ({
      closing: opportunity.closingAt ? new Date(opportunity.closingAt).getTime() : null,
      opportunity,
    }))
    .filter(
      (entry): entry is { closing: number; opportunity: LiveOpportunity } =>
        entry.closing !== null && entry.closing >= now,
    )
    .sort((a, b) => a.closing - b.closing);

  const closingSoonCount = datedOpportunities.filter(
    (entry) => entry.closing <= thirtyDaysFromNow,
  ).length;
  const upcomingDeadlines = datedOpportunities.slice(0, 5).map((entry) => entry.opportunity);
  const newlyPublishedCount = opportunities.filter((opportunity) => {
    if (!opportunity.publishedAt) return false;
    const published = new Date(opportunity.publishedAt).getTime();
    return !Number.isNaN(published) && published >= now - 30 * 24 * 60 * 60 * 1000;
  }).length;

  const currentDate = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
  }).format(new Date());

  const workspaceTitle = activeOrganization?.name
    ? `${activeOrganization.name} Workspace`
    : user?.name
      ? `${user.name}’s Workspace`
      : "Executive Opportunity Workspace";

  return (
    <div className="dashboard-page">
      {/* ── EXECUTIVE WELCOME BANNER ──────────────────────────── */}
      <div className="dashboard-context">
        <div>
          <span className="dashboard-context__name">{workspaceTitle}</span>
          <p>
            Current Context: 30 Target Launch Markets · All Categories
          </p>
        </div>
        <time className="dashboard-context__date">{currentDate}</time>
      </div>

      <header className="page-heading dashboard-heading">
        <div className="page-heading__copy">
          <p className="page-heading__eyebrow">Global Opportunity Intelligence</p>
          <h1>Find the right opportunity. Know what to do next.</h1>
          <p className="page-heading__description">
            A cross-market workspace for government contracts, funding, and
            commercial opportunities.
          </p>
        </div>
        <span className="dashboard-heading__tag">
          Live source coverage: {String(activeSourceCount)}
        </span>
      </header>

      {!liveFeedConfigured && (
        <p className="dashboard-panel__empty" role="status">
          No Neon endpoint is configured for this build, so no live records can be
          read. Open Backend status to check the connection.
        </p>
      )}
      {error && (
        <p className="dashboard-panel__empty" role="status">
          {error}
        </p>
      )}
      {isLoading && !error && (
        <p className="dashboard-panel__empty" role="status">
          Loading verified opportunities…
        </p>
      )}

      {/* ── METRICS GRID (6 TILES) ───────────────────────────── */}
      <section aria-label="Opportunity overview metrics" className="metric-grid">
        <MetricCard
          description="Verified records read live from the OppSift database."
          label="Available opportunities"
          value={String(opportunities.length)}
        />
        <MetricCard
          description="Published within the last 30 days."
          label="New opportunities"
          value={String(newlyPublishedCount)}
        />
        <MetricCard
          description="Closing within the next 30 days."
          label="Closing soon"
          value={String(closingSoonCount)}
        />
        <MetricCard
          description="Nearest verified closing dates."
          label="Upcoming deadlines"
          value={String(upcomingDeadlines.length)}
        />
        <MetricCard
          description="Requires sign-in and saved-item storage"
          label="Saved opportunities"
          value="Not connected"
        />
        <MetricCard
          description="No company profile or eligibility checks"
          label="Relevant matches"
          value="Not evaluated"
        />
      </section>

      <Card as="section" className="dashboard-market-scope">
        <div>
          <p className="dashboard-section-heading__eyebrow">Market research scope</p>
          <h2>{supportedCountries.length} intended launch markets</h2>
          <p>
            Markets are grouped for research planning. No live source coverage
            is represented here.
          </p>
        </div>
        <ul aria-label="Intended markets by region" className="dashboard-market-scope__regions">
          {[
            "North America",
            "Europe",
            "Asia-Pacific",
            "East Africa",
            "West Africa",
            "Southern Africa",
            "North Africa",
          ].map((label) => {
            const count = supportedCountries.filter(
              (market) => market.region === label,
            ).length;
            return (
              <li key={label}>
                <span>{label}</span>
                <strong>{String(count).padStart(2, "0")}</strong>
              </li>
            );
          })}
        </ul>
        <RouteLink href="/markets" className="dashboard-text-link">
          Review market scope <PlatformIcon name="globe" />
        </RouteLink>
      </Card>

      {/* ── OPPORTUNITY DISTRIBUTION ─────────────────────────── */}
      <div className="dashboard-section-heading">
        <div>
          <p className="dashboard-section-heading__eyebrow">The opportunity landscape</p>
          <h2>One platform. Three opportunity stages.</h2>
        </div>
        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }}>
          Standardized Taxonomy
        </span>
      </div>

      <section
        aria-label="Opportunity categories and example markets"
        className="dashboard-breakdown"
      >
        <Card as="section" className="dashboard-panel">
          <div className="dashboard-panel__heading">
            <div>
              <h3>By opportunity stage</h3>
              <p>Verified OppSift records</p>
            </div>
            <PlatformIcon name="analytics" />
          </div>
          <Distribution
            items={categoryDistribution}
            title="Verified opportunities by category"
          />
        </Card>
        <Card as="section" className="dashboard-panel">
          <div className="dashboard-panel__heading">
            <div>
              <h3>By market</h3>
              <p>No country coverage has been launched</p>
            </div>
            <PlatformIcon name="globe" />
          </div>
          {countryDistribution.length > 0 ? (
            <Distribution
              items={countryDistribution}
              title="Verified opportunities by market"
            />
          ) : (
            <p className="dashboard-panel__empty">
              {import.meta.env.PROD
                ? "Live market coverage is not connected."
                : "No verified opportunities match the selected market filters."}
            </p>
          )}
        </Card>
      </section>

      {/* ── RECENT OPPORTUNITIES TABLE ───────────────────────── */}
      <section aria-labelledby="recent-opportunities-title" className="dashboard-section">
        <div className="dashboard-section-heading dashboard-section-heading--compact">
          <div>
            <p className="dashboard-section-heading__eyebrow">
              Cross-stage discovery
            </p>
            <h2 id="recent-opportunities-title">
              Recently published opportunities
            </h2>
          </div>
          <RouteLink className="dashboard-text-link" href="/discover">
            Explore opportunities
            <PlatformIcon name="search" />
          </RouteLink>
        </div>
        {opportunities.length > 0 ? (
          <DataTable
            caption="Verified opportunities"
            columns={opportunityColumns}
            emptyMessage="No verified opportunities match these filters."
            getRowKey={(opportunity) => opportunity.id}
            rows={opportunities}
          />
        ) : (
          <EmptyState
            description={
              "No verified opportunities match these filters yet. Records appear here once an approved source completes a collection run."
            }
            title="No live listings are available"
          />
        )}
      </section>

      {/* ── DEADLINES & AI HIGHLIGHTS ────────────────────────── */}
      <div className="dashboard-bottom-grid">
        <section aria-labelledby="deadlines-title" className="dashboard-section">
          <div className="dashboard-section-heading dashboard-section-heading--compact">
            <div>
              <p className="dashboard-section-heading__eyebrow">Planning view</p>
              <h2 id="deadlines-title">Upcoming deadlines</h2>
            </div>
          </div>
          <Card className="deadline-list" as="ul">
            {upcomingDeadlines.map((opportunity) => (
              <li className="deadline-list__item" key={opportunity.id}>
                <span aria-hidden="true" className="deadline-list__icon">
                  <PlatformIcon name="alerts" />
                </span>
                <div>
                  <strong>{opportunity.title}</strong>
                  <span>{opportunity.countryLabel}</span>
                </div>
                <Badge tone="warning">{opportunity.deadlineLabel}</Badge>
              </li>
            ))}
            {upcomingDeadlines.length === 0 && (
              <li className="deadline-list__empty">
                No verified deadlines are available.
              </li>
            )}
          </Card>
        </section>

        <section aria-labelledby="intelligence-title" className="dashboard-section">
          <div className="dashboard-section-heading dashboard-section-heading--compact">
            <div>
              <p className="dashboard-section-heading__eyebrow">
                Explainable by design
              </p>
              <h2 id="intelligence-title">Intelligence highlights</h2>
            </div>
          </div>
          <Card className="intelligence-preview" as="article">
            <Badge tone="information">Guidance</Badge>
            <p>
              Compare each opportunity with its publisher’s original notice,
              eligibility rules, and supporting evidence before committing
              resources.
            </p>
            <span>
              No AI analysis or eligibility assessment is connected.
            </span>
            <RouteLink className="dashboard-text-link" href="/intelligence">
              About intelligence
              <PlatformIcon name="intelligence" />
            </RouteLink>
          </Card>
        </section>
      </div>
    </div>
  );
}
