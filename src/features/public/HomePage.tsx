import { RouteLink } from "../../app/routing/router";
import { supportedCountries } from "../opportunities/country-registry";
import "./public-pages.css";

export function HomePage() {
  const sourceAccess = [
    {
      category: "Category A",
      title: "Direct public data",
      description:
        "Public CSV, XML, JSON, ZIP, RSS, and bulk data files that are published without account access.",
    },
    {
      category: "Category B",
      title: "Public access without authentication",
      description:
        "Official APIs and public machine-readable feeds that do not require API keys, accounts, or additional credentials.",
    },
    {
      category: "Category C–E",
      title: "Registration, credentials, or permissions",
      description:
        "Sources that require a free account, approved access, credentials, or publisher permission remain outside the first operational rollout.",
    },
  ];

  const prioritySources = [
    "EU TED (Tenders Electronic Daily)",
    "Grants.gov",
    "Open Contracting Data Registry (OCDS)",
    "Kenya Public Procurement Information Portal (PPIP)",
  ];

  const regions = [
    "North America",
    "Europe",
    "Asia-Pacific",
    "East Africa",
    "West Africa",
    "Southern Africa",
    "North Africa",
  ].map((name) => ({
    name,
    countries: supportedCountries
      .filter((country) => country.region === name)
      .map((country) => country.name),
  }));

  return (
    <div className="public-page">
      <section className="public-hero">
        <div aria-hidden="true" className="earth-wallpaper" />
        <div className="public-hero__container">
          <div className="public-hero__content">
            <p className="public-hero__eyebrow">Global opportunity intelligence</p>
            <h1 className="public-hero__title">
              The world is full of opportunity.
              <span className="public-hero__title-accent">Find yours.</span>
            </h1>
            <p className="public-hero__subtitle">
              One considered view of contracts, funding and commercial
              opportunities—so you can see what matters and decide what to do next.
            </p>
            <p className="public-hero__tagline">
              Find the right opportunity. Know what to do next.
            </p>
            <div className="public-hero__actions">
              <RouteLink href="/discover" className="public-btn public-btn--primary">
                Explore opportunities <span aria-hidden="true">→</span>
              </RouteLink>
              <RouteLink href="/product" className="public-btn public-btn--secondary">
                Discover OppSift
              </RouteLink>
            </div>
            <div className="public-hero__facts" aria-label="Product scope">
              <div><strong>{supportedCountries.length}</strong><span>intended launch markets</span></div>
              <span className="public-hero__fact-divider" aria-hidden="true" />
              <div><strong>03</strong><span>opportunity categories</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRODUCT CAPABILITY SUMMARY ─────────────────────────── */}
      <section className="public-section">
        <div className="public-section__header">
          <p className="public-section__eyebrow">A clearer view of what’s next</p>
          <h2 className="public-section__title">Opportunity intelligence, brought together.</h2>
          <p className="public-section__desc">
            Move from fragmented notices to a considered view of the opportunities
            worth your attention.
          </p>
        </div>

        <div className="feature-grid">
          <article className="feature-card">
            <span className="feature-card__number">Stage 01</span>
            <h3 className="feature-card__title">
              Government Contracts & Procurement
            </h3>
            <p className="feature-card__desc">
              Explore public tenders, procurement notices and contract requests,
              with source provenance kept in view.
            </p>
            <div className="feature-card__tags">
              <span className="feature-card__tag">Public Tenders</span>
              <span className="feature-card__tag">Federal RFPs</span>
              <span className="feature-card__tag">Frameworks</span>
              <span className="feature-card__tag">Procurement Plans</span>
            </div>
          </article>

          <article className="feature-card">
            <span className="feature-card__number">Stage 02</span>
            <h3 className="feature-card__title">Grants & Funding Intelligence</h3>
            <p className="feature-card__desc">
              Find grant calls, funding programmes and research initiatives, with
              requirements presented as the source provides them.
            </p>
            <div className="feature-card__tags">
              <span className="feature-card__tag">Innovation Grants</span>
              <span className="feature-card__tag">Development Funds</span>
              <span className="feature-card__tag">Research Calls</span>
              <span className="feature-card__tag">NGO Programmes</span>
            </div>
          </article>

          <article className="feature-card">
            <span className="feature-card__number">Stage 03</span>
            <h3 className="feature-card__title">
              Commercial Opportunity Intelligence
            </h3>
            <p className="feature-card__desc">
              Surface supplier programmes, private-sector contracts and partnership
              opportunities across business networks.
            </p>
            <div className="feature-card__tags">
              <span className="feature-card__tag">Private Tenders</span>
              <span className="feature-card__tag">Supply Chain</span>
              <span className="feature-card__tag">Subcontracting</span>
              <span className="feature-card__tag">Joint Ventures</span>
            </div>
          </article>
        </div>
      </section>

      {/* ── WHY OPPSIFT (5 STEPS) ──────────────────────────────── */}
      <section className="public-section" style={{ paddingTop: 0 }}>
        <div className="public-section__header">
          <p className="public-section__eyebrow">The Intelligence Cycle</p>
          <h2 className="public-section__title">From Discovery to Decision</h2>
          <p className="public-section__desc">
            Five deliberate capabilities that turn fragmented global notices
            into structured, actionable business decisions.
          </p>
        </div>

        <div className="flow-steps">
          <div className="flow-step">
            <span className="flow-step__number">01</span>
            <h3 className="flow-step__title">Discover</h3>
            <p className="flow-step__desc">
              Bring opportunity discovery into one focused research workflow.
            </p>
          </div>
          <div className="flow-step">
            <span className="flow-step__number">02</span>
            <h3 className="flow-step__title">Understand</h3>
            <p className="flow-step__desc">
              Review opportunity details and source material where they are available.
            </p>
          </div>
          <div className="flow-step">
            <span className="flow-step__number">03</span>
            <h3 className="flow-step__title">Evaluate</h3>
            <p className="flow-step__desc">
              Compare the information you have with your priorities before investing
              pursuit effort.
            </p>
          </div>
          <div className="flow-step">
            <span className="flow-step__number">04</span>
            <h3 className="flow-step__title">Monitor</h3>
            <p className="flow-step__desc">
              Keep important dates and updates in view where source information exists.
            </p>
          </div>
          <div className="flow-step">
            <span className="flow-step__number">05</span>
            <h3 className="flow-step__title">Pursue</h3>
            <p className="flow-step__desc">
              Organize preparation work around the opportunities you choose to pursue.
            </p>
          </div>
        </div>
      </section>

      {/* ── 30 LAUNCH MARKETS SUMMARY ──────────────────────────── */}
      <section className="public-section" style={{ paddingTop: 0 }}>
        <div className="markets-summary">
          <div className="public-section__header" style={{ marginBottom: "var(--space-6)" }}>
            <p className="public-section__eyebrow">Global Reach</p>
            <h2 className="public-section__title">
              Architected for {supportedCountries.length} Target Launch Markets
            </h2>
            <p className="public-section__desc">
              These markets are in the current research and launch scope, with an
              Africa-first depth priority. This is a statement of intent, not a
              claim of operational source coverage.
            </p>
          </div>

          <div className="markets-summary__regions">
            {regions.map((region) => (
              <div className="markets-summary__region" key={region.name}>
                <h3>{region.name}<span>{String(region.countries.length).padStart(2, "0")}</span></h3>
                <p>{region.countries.join(" · ")}</p>
              </div>
            ))}
          </div>
          <RouteLink className="markets-summary__link" href="/markets">
            Explore the intended market scope <span aria-hidden="true">→</span>
          </RouteLink>
        </div>
      </section>

      {/* ── SOURCE STRATEGY ────────────────────────────────────── */}
      <section className="public-section" style={{ paddingTop: 0 }}>
        <div className="public-section__header">
          <p className="public-section__eyebrow">Source strategy</p>
          <h2 className="public-section__title">Public access first, permission-aware by design.</h2>
          <p className="public-section__desc">
            OppSift prioritises Category A and Category B public data sources before moving to account-gated or credentialed flows. Source permissions, publisher terms, and operational coverage are tracked separately from market research scope.
          </p>
        </div>

        <div className="source-strategy__grid">
          {sourceAccess.map((entry) => (
            <article key={entry.category} className="source-strategy__card">
              <span className="source-strategy__category">{entry.category}</span>
              <h3>{entry.title}</h3>
              <p>{entry.description}</p>
            </article>
          ))}
        </div>

        <div className="source-strategy__priority">
          <p className="source-strategy__label">Priority sources in the first rollout</p>
          <ul>
            {prioritySources.map((source) => (
              <li key={source}>{source}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── CLOSING CALL TO ACTION ─────────────────────────────── */}
      <section className="public-cta">
        <h2 className="public-cta__title">
          Ready to discover international opportunities?
        </h2>
        <p className="public-cta__desc">
          Enter the OppSift intelligence workspace to explore cross-market
          tenders, funding programmes, and commercial contracts.
        </p>
        <div className="public-hero__actions">
          <RouteLink href="/register" className="public-btn public-btn--primary">
            Get Started Free
          </RouteLink>
          <RouteLink href="/dashboard" className="public-btn public-btn--secondary">
            Open Workspace
          </RouteLink>
        </div>
      </section>
    </div>
  );
}
