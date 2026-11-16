import { RouteLink } from "../../app/routing/router";
import { Badge, Card } from "../../shared/ui/components";
import { PlatformIcon } from "../../app/shell/PlatformIcon";

export function AlertsPage() {
  return (
    <div className="platform-page">
      <header className="page-heading">
        <div className="page-heading__copy">
          <p className="page-heading__eyebrow">Opportunity Monitoring</p>
          <h1>Alerts & monitoring</h1>
          <p className="page-heading__description">
            Configure automated notifications for deadline milestones, requirement
            addenda, corrigenda notices, and new opportunity matches.
          </p>
        </div>
        <Badge tone="information">MONITORING CENTER</Badge>
      </header>

      {/* Monitoring Channel Overview */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "var(--space-4)",
          marginBottom: "var(--space-8)",
        }}
      >
        <Card as="article" style={{ padding: "var(--space-5)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
            <PlatformIcon name="alerts" />
            <strong style={{ fontSize: "var(--font-size-sm)" }}>Deadline Warnings</strong>
          </div>
          <p style={{ margin: 0, fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary-accessible)", lineHeight: 1.5 }}>
            Timezone-calculated reminders 14 days, 7 days, and 48 hours before submission cutoff.
          </p>
        </Card>

        <Card as="article" style={{ padding: "var(--space-5)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
            <PlatformIcon name="search" />
            <strong style={{ fontSize: "var(--font-size-sm)" }}>Saved Search Alerts</strong>
          </div>
          <p style={{ margin: 0, fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary-accessible)", lineHeight: 1.5 }}>
            Daily or weekly digests when newly published tenders match your saved market criteria.
          </p>
        </Card>

        <Card as="article" style={{ padding: "var(--space-5)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
            <PlatformIcon name="categories" />
            <strong style={{ fontSize: "var(--font-size-sm)" }}>Addenda & Corrigenda</strong>
          </div>
          <p style={{ margin: 0, fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary-accessible)", lineHeight: 1.5 }}>
            Immediate notifications when publisher portals issue specification amendments or date extensions.
          </p>
        </Card>
      </div>

      {/* Active Watchlist Status */}
      <Card as="section" style={{ padding: "var(--space-6)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "var(--font-size-base)" }}>
              Watchlists
            </h3>
            <p style={{ margin: "var(--space-1) 0 0", fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary-accessible)" }}>
              Manage notification channels and alert frequencies.
            </p>
          </div>
          <RouteLink href="/saved-searches" className="ui-button ui-button--secondary">
            View Saved Searches
          </RouteLink>
        </div>

        <div style={{ padding: "var(--space-8)", textAlign: "center", background: "var(--color-surface-muted)", borderRadius: "var(--radius-lg)" }}>
          <p style={{ margin: "0 0 var(--space-2)", fontWeight: 600, fontSize: "var(--font-size-sm)" }}>
            No Active Email Alerts
          </p>
          <p style={{ margin: "0 0 var(--space-4)", fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary-accessible)", maxWidth: "32rem", marginInline: "auto" }}>
            Alert delivery requires an authenticated account and verified email.
            Save search criteria from the discovery workspace to create watchlists.
          </p>
          <RouteLink href="/discover" className="ui-button ui-button--primary">
            Explore Opportunities to Monitor
          </RouteLink>
        </div>
      </Card>
    </div>
  );
}
