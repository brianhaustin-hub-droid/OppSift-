import { RouteLink } from "../../app/routing/router";
import { BrandLogo } from "./BrandLogo";
import "./public-footer.css";

export function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="public-footer">
      <div className="public-footer__inner">
        <div className="public-footer__brand">
          <BrandLogo variant="light" size="md" linkTo="/" />
          <p className="public-footer__tagline">
            Find the right opportunity. Know what to do next.
          </p>
        </div>

        <nav className="public-footer__links" aria-label="Footer navigation">
          <div className="public-footer__col">
            <p className="public-footer__col-heading">Company</p>
            <RouteLink href="/about" className="public-footer__link">About OppSift</RouteLink>
            <RouteLink href="/contact" className="public-footer__link">Contact</RouteLink>
            <RouteLink href="/how-it-works" className="public-footer__link">How it works</RouteLink>
          </div>
          <div className="public-footer__col">
            <p className="public-footer__col-heading">Platform</p>
            <RouteLink href="/opportunities" className="public-footer__link">Government Contracts</RouteLink>
            <RouteLink href="/opportunities" className="public-footer__link">Grants & Funding</RouteLink>
            <RouteLink href="/opportunities" className="public-footer__link">Commercial Opportunities</RouteLink>
          </div>
          <div className="public-footer__col">
            <p className="public-footer__col-heading">Solutions</p>
            <RouteLink href="/solutions" className="public-footer__link">For Suppliers</RouteLink>
            <RouteLink href="/solutions" className="public-footer__link">For Enterprises</RouteLink>
            <RouteLink href="/solutions" className="public-footer__link">For Consultants</RouteLink>
            <RouteLink href="/solutions" className="public-footer__link">For NGOs</RouteLink>
          </div>
          <div className="public-footer__col">
            <p className="public-footer__col-heading">Markets</p>
            <RouteLink href="/markets" className="public-footer__link">All Markets</RouteLink>
            <RouteLink href="/markets?region=europe" className="public-footer__link">Europe</RouteLink>
            <RouteLink href="/markets?region=asia" className="public-footer__link">Asia-Pacific</RouteLink>
            <RouteLink href="/markets?region=africa" className="public-footer__link">East Africa</RouteLink>
            <RouteLink href="/markets?region=west_africa" className="public-footer__link">West Africa</RouteLink>
            <RouteLink href="/markets?region=southern_africa" className="public-footer__link">Southern Africa</RouteLink>
          </div>
          <div className="public-footer__col">
            <p className="public-footer__col-heading">Resources</p>
            <RouteLink href="/login" className="public-footer__link">Platform Access</RouteLink>
            <RouteLink href="/markets" className="public-footer__link">Market scope</RouteLink>
          </div>
        </nav>
      </div>

      <div className="public-footer__bottom">
        <div className="public-footer__bottom-inner">
          <p className="public-footer__legal">
            © {year} OppSift. All rights reserved.
          </p>
          <p className="public-footer__disclaimer">
            Market scope is not a claim of live source coverage or available
            opportunities.
          </p>
        </div>
      </div>
    </footer>
  );
}
