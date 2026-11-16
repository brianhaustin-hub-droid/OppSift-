import { RouteLink } from "../../app/routing/router";
import { supportedCountries } from "../opportunities/country-registry";
import "./public-pages.css";

export function AboutPage() {
  return (
    <div className="public-page public-page--editorial">
      <header className="editorial-hero earth-section-hero">
        <div aria-hidden="true" className="earth-wallpaper" />
        <div className="editorial-hero__inner">
          <p className="public-section__eyebrow">About OppSift</p>
          <h1>Make a complex opportunity landscape easier to navigate.</h1>
          <p>
            OppSift is being built to help organizations find, understand, and
            pursue business opportunities across markets with more clarity.
          </p>
        </div>
      </header>
      <main className="public-section editorial-content">
        <section className="editorial-statement">
          <span>Our direction</span>
          <h2>Global opportunity intelligence, grounded in evidence.</h2>
          <p>
            Our aim is to bring tenders, funding programmes, and commercial
            opportunities into a coherent workspace—while keeping source
            provenance, requirements, and uncertainty visible.
          </p>
        </section>
        <section className="editorial-scope">
          <div>
            <strong>{supportedCountries.length}</strong>
            <span>intended research markets</span>
          </div>
          <p>
            The approved research scope spans North America, Europe (including
            the United Kingdom), Asia-Pacific, and Africa. It does not
            imply operational coverage.
          </p>
          <RouteLink className="category-row__link" href="/markets">
            View market scope <span aria-hidden="true">→</span>
          </RouteLink>
        </section>
      </main>
    </div>
  );
}
