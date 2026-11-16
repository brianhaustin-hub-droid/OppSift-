import { RouteLink } from "../../app/routing/router";
import "./public-pages.css";

const stages = [
  {
    number: "01",
    label: "Public opportunity",
    title: "Government contracts",
    description:
      "A clearer way to review tenders, procurement notices and contract requests, with source details kept close to the opportunity.",
    href: "/discover/government",
    link: "Explore public procurement",
  },
  {
    number: "02",
    label: "Funding opportunity",
    title: "Grants & funding",
    description:
      "Bring grant calls, funding programmes and research initiatives into the same considered view as other opportunities.",
    href: "/discover/grants",
    link: "Explore funding",
  },
  {
    number: "03",
    label: "Commercial opportunity",
    title: "Business networks",
    description:
      "Make room for supplier programmes, private-sector requests and partnership opportunities alongside public notices.",
    href: "/discover/commercial",
    link: "Explore commercial opportunities",
  },
];

export function PlatformPublicPage() {
  return (
    <div className="public-page public-page--product">
      <section aria-labelledby="product-title" className="product-hero">
        <div aria-hidden="true" className="earth-wallpaper" />
        <div className="product-hero__content">
          <p className="public-section__eyebrow">The OppSift product</p>
          <h1 id="product-title">A wider view. A clearer next step.</h1>
          <p>
            OppSift is being built to bring contracts, funding and commercial
            opportunities into one thoughtful workspace.
          </p>
          <div className="product-hero__actions">
            <RouteLink className="public-btn public-btn--primary" href="/markets">
              Explore our market scope
              <span aria-hidden="true">→</span>
            </RouteLink>
            <span className="product-preview-note">
              Live, verified opportunity listings are not connected yet.
            </span>
          </div>
        </div>
        <div aria-hidden="true" className="product-hero__orbit">
          <span />
          <span />
          <span />
        </div>
      </section>

      <section aria-labelledby="product-stages-title" className="product-stages">
        <div className="product-stages__heading">
          <div>
            <p className="public-section__eyebrow">One connected view</p>
            <h2 id="product-stages-title">
              Three opportunity paths. One place to think them through.
            </h2>
          </div>
          <p>
            Designed for a global outlook, with clear source provenance and
            honest status at every step.
          </p>
        </div>

        <div className="product-stage-list">
          {stages.map((stage) => (
            <article className="product-stage" key={stage.number}>
              <span aria-hidden="true" className="product-stage__number">
                {stage.number}
              </span>
              <div className="product-stage__copy">
                <p className="product-stage__label">{stage.label}</p>
                <h3>{stage.title}</h3>
                <p>{stage.description}</p>
              </div>
              <RouteLink className="product-stage__link" href={stage.href}>
                {stage.link}
                <span aria-hidden="true">↗</span>
              </RouteLink>
            </article>
          ))}
        </div>

        <p className="product-truth-note">
          No live, verified opportunity listings are currently available in
          OppSift. Market pages link to publisher research; those sources are
          not connected to the opportunity database.
        </p>
      </section>
    </div>
  );
}
