import { RouteLink } from "../../app/routing/router";
import "./public-pages.css";

const categories = [
  {
    number: "01",
    title: "Government tenders",
    description:
      "Public procurement notices, tenders, requests for proposals, and contract opportunities.",
    href: "/discover/government",
  },
  {
    number: "02",
    title: "Grants and funding",
    description:
      "Grant calls, development funding, research support, and business finance programmes.",
    href: "/discover/grants",
  },
  {
    number: "03",
    title: "Commercial opportunities",
    description:
      "Private-sector contracts, supplier programmes, partnerships, and business initiatives.",
    href: "/discover/commercial",
  },
];

export function OpportunityCategoriesPage() {
  return (
    <div className="public-page public-page--editorial">
      <header className="editorial-hero earth-section-hero">
        <div aria-hidden="true" className="earth-wallpaper" />
        <div className="editorial-hero__inner">
          <p className="public-section__eyebrow">Opportunity intelligence</p>
          <h1>Different opportunities. One considered view.</h1>
          <p>
            Browse the opportunity categories and open the official publisher
            sources listed for each research market.
          </p>
        </div>
      </header>
      <main className="public-section editorial-content">
        <div className="category-list">
          {categories.map((category) => (
            <article className="category-row" key={category.number}>
              <span className="category-row__number">{category.number}</span>
              <div className="category-row__copy">
                <h2>{category.title}</h2>
                <p>{category.description}</p>
              </div>
              <RouteLink className="category-row__link" href={category.href}>
                Explore category <span aria-hidden="true">→</span>
              </RouteLink>
            </article>
          ))}
        </div>
        <p className="editorial-note">
          OppSift does not currently ingest live listings. Category pages show
          source availability and link to publisher sites where possible.
        </p>
      </main>
    </div>
  );
}
