import { RouteLink } from "../../app/routing/router";
import { Badge, Card } from "../../shared/ui/components";
import { PlatformIcon } from "../../app/shell/PlatformIcon";

export function IntelligencePage() {
  return (
    <div className="platform-page">
      <header className="page-heading">
        <div className="page-heading__copy">
          <p className="page-heading__eyebrow">Explainable AI Intelligence</p>
          <h1>AI intelligence</h1>
          <p className="page-heading__description">
            Objective evaluation frameworks that assess bid fit, compliance
            hurdles, capability matching, and risk indicators before pursuit.
          </p>
        </div>
        <Badge tone="information">PREVIEW INTERFACE</Badge>
      </header>

      {/* Intelligence Architecture Summary */}
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
            <PlatformIcon name="intelligence" />
            <strong style={{ fontSize: "var(--font-size-sm)" }}>Eligibility Scoring</strong>
          </div>
          <p style={{ margin: 0, fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary-accessible)", lineHeight: 1.5 }}>
            Automated clause-by-clause comparison between entity profiles and mandatory solicitation conditions.
          </p>
        </Card>

        <Card as="article" style={{ padding: "var(--space-5)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
            <PlatformIcon name="analytics" />
            <strong style={{ fontSize: "var(--font-size-sm)" }}>Opportunity Summaries</strong>
          </div>
          <p style={{ margin: 0, fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary-accessible)", lineHeight: 1.5 }}>
            Executive extraction of deliverables, submission formats, evaluation criteria, and timeline constraints.
          </p>
        </Card>

        <Card as="article" style={{ padding: "var(--space-5)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
            <PlatformIcon name="alerts" />
            <strong style={{ fontSize: "var(--font-size-sm)" }}>Risk & Hurdle Detection</strong>
          </div>
          <p style={{ margin: 0, fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary-accessible)", lineHeight: 1.5 }}>
            Flagging critical factors: security clearances, local content requirements, joint-venture prerequisites, and short deadlines.
          </p>
        </Card>
      </div>

      {/* Illustrative AI Evaluation Template */}
      <Card as="section" style={{ padding: "var(--space-6)", marginBottom: "var(--space-8)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)", borderBottom: "1px solid var(--color-border)", paddingBottom: "var(--space-4)" }}>
          <div>
            <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--color-brand-teal)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Evaluation Framework Preview
            </span>
            <h3 style={{ margin: "var(--space-1) 0 0", fontSize: "var(--font-size-base)" }}>
              Sample Intelligence Report Structure
            </h3>
          </div>
          <Badge tone="neutral">Illustrative Architecture</Badge>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-6)" }}>
          <div>
            <h4 style={{ margin: "0 0 var(--space-2)", fontSize: "var(--font-size-xs)", textTransform: "uppercase", color: "var(--color-text-secondary-accessible)" }}>
              Core Fit Dimensions
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <div style={{ padding: "var(--space-3)", background: "var(--color-surface-muted)", borderRadius: "var(--radius-sm)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-size-xs)", fontWeight: 600 }}>
                  <span>Technical & Capability Match</span>
                  <span style={{ color: "var(--color-text-secondary)" }}>Pending Profile</span>
                </div>
                <p style={{ margin: "4px 0 0", fontSize: "0.6875rem", color: "var(--color-text-secondary-accessible)" }}>
                  Evaluates vendor service codes against CPV / NAICS classifications.
                </p>
              </div>

              <div style={{ padding: "var(--space-3)", background: "var(--color-surface-muted)", borderRadius: "var(--radius-sm)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-size-xs)", fontWeight: 600 }}>
                  <span>Financial & Turnover Threshold</span>
                  <span style={{ color: "var(--color-text-secondary)" }}>Pending Profile</span>
                </div>
                <p style={{ margin: "4px 0 0", fontSize: "0.6875rem", color: "var(--color-text-secondary-accessible)" }}>
                  Checks contract ceiling against annual revenue and bonding minimums.
                </p>
              </div>

              <div style={{ padding: "var(--space-3)", background: "var(--color-surface-muted)", borderRadius: "var(--radius-sm)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-size-xs)", fontWeight: 600 }}>
                  <span>Jurisdictional & Geographic Scope</span>
                  <span style={{ color: "var(--color-text-secondary)" }}>Pending Profile</span>
                </div>
                <p style={{ margin: "4px 0 0", fontSize: "0.6875rem", color: "var(--color-text-secondary-accessible)" }}>
                  Verifies local business registration and export compliance requirements.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h4 style={{ margin: "0 0 var(--space-2)", fontSize: "var(--font-size-xs)", textTransform: "uppercase", color: "var(--color-text-secondary-accessible)" }}>
              Explainable Decision Principles
            </h4>
            <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary-accessible)", lineHeight: 1.8 }}>
              <li><strong>Zero Fabricated Fit:</strong> OppSift will never generate automated confidence scores without verifiable evidence citations.</li>
              <li><strong>Clause Provenance:</strong> Every requirement criterion links directly back to the original publisher notice section or tender dossier.</li>
              <li><strong>Evidence-Gated Scoring:</strong> Automated confidence scores and document synthesis activate only once source evidence is connected for a record.</li>
            </ul>
          </div>
        </div>
      </Card>

      <div style={{ textAlign: "center", padding: "var(--space-6)" }}>
        <RouteLink href="/discover" className="ui-button ui-button--primary">
          Explore Available Opportunities
        </RouteLink>
      </div>
    </div>
  );
}
