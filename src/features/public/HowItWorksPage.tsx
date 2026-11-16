import { RouteLink } from "../../app/routing/router";
import "./public-pages.css";

const steps = [
  {
    step: "01",
    title: "Discover",
    description:
      "Bring public contracts, funding calls and commercial opportunities into a single research view.",
  },
  {
    step: "02",
    title: "Understand",
    description:
      "Keep notice details, requirements and original source information close as you review an opportunity.",
  },
  {
    step: "03",
    title: "Evaluate",
    description:
      "Compare what an opportunity asks for with your organization's goals and capacity before deciding what comes next.",
  },
  {
    step: "04",
    title: "Organize",
    description:
      "Keep notes, follow-up tasks and preparation work connected to the opportunity under consideration.",
  },
  {
    step: "05",
    title: "Act with context",
    description:
      "Use the available source material and your team's own judgement to plan a response.",
  },
];

export function HowItWorksPage() {
  return (
    <div className="public-page public-page--editorial">
      <header className="editorial-hero">
        <p className="public-section__eyebrow">The OppSift approach</p>
        <h1>A thoughtful path from discovery to decision.</h1>
        <p>
          OppSift is designed to help teams move from scattered opportunity
          research to a more organized next step.
        </p>
      </header>

      <main className="public-section editorial-content">
        <p className="workflow-preview-note">
          This describes the intended workflow. Live source ingestion,
          opportunity records, and alerts are not connected in this deployment.
        </p>
        <ol className="workflow-list">
          {steps.map((item) => (
            <li className="workflow-step" key={item.step}>
              <span aria-hidden="true" className="workflow-step__number">
                {item.step}
              </span>
              <div>
                <h2>{item.title}</h2>
                <p>{item.description}</p>
              </div>
            </li>
          ))}
        </ol>
        <RouteLink className="category-row__link" href="/product">
          See the product direction <span aria-hidden="true">→</span>
        </RouteLink>
      </main>
    </div>
  );
}
