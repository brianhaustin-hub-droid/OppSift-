import { RouteLink } from "../../app/routing/router";
import "./public-pages.css";

const audiences = [
  {
    role: "Suppliers & distributors",
    title: "See demand across more than one buyer network.",
    description:
      "A place to explore public procurement, supplier programmes and commercial requests while keeping original sources in view.",
  },
  {
    role: "Contractors & builders",
    title: "Bring projects and procurement into one view.",
    description:
      "A research workspace intended to make tenders, project notices and partnership opportunities easier to compare.",
  },
  {
    role: "Small & medium businesses",
    title: "Start with a clearer picture of what is being asked.",
    description:
      "Opportunity context and requirements should be easier to scan before a team decides where to spend its time.",
  },
  {
    role: "Enterprises & prime contractors",
    title: "Keep cross-market research together.",
    description:
      "A shared direction for teams comparing opportunities, source material and next steps across business units.",
  },
  {
    role: "Consultants & advisory firms",
    title: "Find the work behind the programme.",
    description:
      "A broader view of advisory mandates, public contracts, funding calls and development programmes.",
  },
  {
    role: "Development organisations & NGOs",
    title: "Follow funding and delivery opportunities together.",
    description:
      "A single research direction for grant calls, institutional programmes and related procurement notices.",
  },
  {
    role: "Research institutions",
    title: "Keep research funding in the same conversation.",
    description:
      "Designed to help teams review research calls and funding opportunities with their source details close at hand.",
  },
  {
    role: "Procurement & sourcing teams",
    title: "Make market research easier to organize.",
    description:
      "A workspace direction for reviewing supplier programmes, procurement notices and commercial requests.",
  },
];

export function SolutionsPage() {
  return (
    <div className="public-page public-page--editorial">
      <header className="editorial-hero">
        <p className="public-section__eyebrow">Who OppSift is for</p>
        <h1>Different teams. A clearer view of opportunity.</h1>
        <p>
          OppSift is being shaped for people who research contracts, funding and
          commercial opportunities as part of their work.
        </p>
      </header>

      <main className="public-section editorial-content">
        <div className="solution-list">
          {audiences.map((audience, index) => (
            <article className="solution-row" key={audience.role}>
              <span aria-hidden="true" className="solution-row__number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <p className="solution-row__role">{audience.role}</p>
                <h2>{audience.title}</h2>
                <p>{audience.description}</p>
              </div>
            </article>
          ))}
        </div>
        <p className="solution-note">
          These are intended audiences, not tailored services. Source coverage
          and opportunity records are not yet operational.
        </p>
        <RouteLink className="category-row__link" href="/product">
          Explore the product direction <span aria-hidden="true">→</span>
        </RouteLink>
      </main>
    </div>
  );
}
