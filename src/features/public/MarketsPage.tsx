import { useMemo } from "react";
import { RouteLink, useCurrentLocation, useNavigate } from "../../app/routing/router";
import {
  getCountrySourceCoverage,
  getSourceCoverageSummary,
} from "../../../backend/neon/intelligence/source-catalog";
import { supportedCountries } from "../opportunities/country-registry";
import { useCoverageTruth } from "../opportunities/coverage-truth";
import "./public-pages.css";

const regions = [
  { id: "all", label: "All regions" },
  { id: "north_america", label: "North America" },
  { id: "europe", label: "Europe" },
  { id: "asia", label: "Asia-Pacific" },
  { id: "africa", label: "East Africa" },
  { id: "west_africa", label: "West Africa" },
  { id: "southern_africa", label: "Southern Africa" },
  { id: "north_africa", label: "North Africa" },
] as const;

function countryRegion(country: (typeof supportedCountries)[number]) {
  if (country.region === "North America") return "north_america";
  if (country.region === "Europe") return "europe";
  if (country.region === "Asia-Pacific") return "asia";
  if (country.region === "East Africa") return "africa";
  if (country.region === "West Africa") return "west_africa";
  if (country.region === "Southern Africa") return "southern_africa";
  if (country.region === "North Africa") return "north_africa";
  return country.regionCode;
}

export function MarketsPage() {
  const currentLocation = useCurrentLocation();
  const navigate = useNavigate();
  const sourceSummary = getSourceCoverageSummary();
  const countryCoverage = useMemo(
    () => getCountrySourceCoverage(supportedCountries),
    [],
  );
  // Coverage status comes from the coverage_truth DB view (migration 0029),
  // derived from real ingestion data — never a hand-maintained claim. The
  // country registry supplies display names and regions only.
  const coverage = useCoverageTruth();
  const marketCount = supportedCountries.length;
  const regionCount = new Set(
    supportedCountries.map((country) => countryRegion(country)),
  ).size;
  const query = currentLocation.split("?")[1]?.split("#")[0] ?? "";
  const requestedRegion = new URLSearchParams(query).get("region");
  const selectedRegion =
    regions.find((region) => region.id === requestedRegion)?.id ?? "all";
  const filteredCountries = useMemo(
    () =>
      selectedRegion === "all"
        ? supportedCountries
        : supportedCountries.filter(
            (country) => countryRegion(country) === selectedRegion,
          ),
    [selectedRegion],
  );
  const regionGroups = regions.slice(1).map((region) => ({
    ...region,
    countries: filteredCountries.filter(
      (country) => countryRegion(country) === region.id,
    ),
  })).filter((region) => region.countries.length > 0);

  return (
    <div className="public-page public-page--markets">
      <header className="markets-intro earth-section-hero">
        <div aria-hidden="true" className="earth-wallpaper" />
        <div className="markets-intro__inner">
          <p className="public-section__eyebrow">Research scope</p>
          <h1 className="public-section__title">A global outlook, built with care.</h1>
          <p className="public-section__desc">
            OppSift’s approved launch ambition spans {marketCount} markets
            across {regionCount} regions. These are intended markets—not a
            claim of live source coverage or available opportunities.
          </p>
          <div className="markets-intro__stat">
            <strong>{marketCount}</strong>
            <span>intended launch markets</span>
          </div>
        </div>
      </header>

      <main className="public-section markets-content">
        <div className="markets-filter" aria-label="Filter markets by region">
          <span className="markets-filter__label">Browse by region</span>
          <div className="markets-filter__options">
            {regions.map((region) => (
              <button
                aria-pressed={selectedRegion === region.id}
                className={`markets-filter__button${selectedRegion === region.id ? " is-active" : ""}`}
                key={region.id}
                onClick={() =>
                  navigate(
                    region.id === "all" ? "/markets" : `/markets?region=${region.id}`,
                  )
                }
                type="button"
              >
                {region.label}
              </button>
            ))}
          </div>
        </div>

        <p className="markets-results-count">
          {filteredCountries.length} intended markets
        </p>

        <section
          aria-labelledby="source-research-title"
          className="source-research-summary"
        >
          <div className="source-research-summary__heading">
            <p className="public-section__eyebrow">Evidence, not estimates</p>
            <h2 id="source-research-title">Source research snapshot</h2>
            <p>
              Candidate discovery is separate from rights clearance and live
              coverage. These figures do not represent active OppSift feeds.
            </p>
          </div>
          <dl className="source-research-summary__metrics">
            <div>
              <dt>Countries with named source leads</dt>
              <dd>{sourceSummary.countriesWithCandidates}</dd>
            </div>
            <div>
              <dt>Candidate source products</dt>
              <dd>{sourceSummary.sourceProducts}</dd>
            </div>
            <div>
              <dt>Publisher paths read</dt>
              <dd>{sourceSummary.liveRetrievedSources}</dd>
            </div>
            <div>
              <dt>Retrieved samples (known count)</dt>
              <dd>{sourceSummary.retrievedSamplesWithKnownCount}</dd>
            </div>
            <div>
              <dt>Records parsed by OppSift</dt>
              <dd>{sourceSummary.parsedSamples}</dd>
            </div>
            <div>
              <dt>Records stored</dt>
              <dd>{sourceSummary.storedRecords}</dd>
            </div>
            <div>
              <dt>Permission-cleared sources</dt>
              <dd>{sourceSummary.permissionClearedSources}</dd>
            </div>
            <div>
              <dt>Operational connectors</dt>
              <dd>{sourceSummary.operationalConnectors}</dd>
            </div>
          </dl>
          <p className="source-research-summary__note">
            Bounded research checks include catalog metadata and award records;
            none has been ingested or approved for customer display.
          </p>
        </section>

        <div className="markets-regions">
          {regionGroups.map((region) => (
            <section aria-labelledby={`region-${region.id}`} className="markets-region" key={region.id}>
              <header className="markets-region__heading">
                <h2 id={`region-${region.id}`}>{region.label}</h2>
                <span>{String(region.countries.length).padStart(2, "0")}</span>
              </header>
              <ul className="markets-region__list">
                {region.countries.map((country) => {
                  const countrySources =
                    countryCoverage.find((entry) => entry.code === country.code)
                      ?.candidates ?? [];
                  const coverageRow = coverage.rows.get(country.code);
                  const coverageStatus = coverageRow?.status ?? "roadmap";
                  const coverageLabel =
                    coverageStatus === "live"
                      ? `Live — ${coverageRow?.recordCount ?? 0} opportunities ingested`
                      : coverageStatus === "monitored"
                        ? "Monitored — active source, ingestion pending"
                        : "Roadmap — no active source yet";
                  return (
                    <li className="markets-region__item" key={country.code}>
                      <span className="markets-region__country">{country.name}</span>
                      <span className="markets-region__code">{country.code}</span>
                      <span className="markets-region__status" data-coverage={coverageStatus}>
                        {coverage.error
                          ? "Coverage status unavailable"
                          : coverageLabel}
                      </span>
                      <RouteLink href={`/discover/country/${country.code}`}>
                        Explore opportunities
                        <span aria-hidden="true">→</span>
                      </RouteLink>
                      {countrySources.length > 0 && (
                        <details className="markets-region__sources">
                          <summary>Show source candidates</summary>
                          <ul>
                            {countrySources.map((source) => (
                              <li key={source.id}>
                                <div>
                                  <a
                                    href={source.officialUrl}
                                    rel="noreferrer"
                                    target="_blank"
                                  >
                                    {source.name}
                                  </a>
                                  <span>
                                    {source.stage.replaceAll("_", " ")} ·{" "}
                                    {source.accessMethod.replaceAll("_", " ")}
                                  </span>
                                  <span>
                                    {source.connector === "none"
                                      ? "No source-specific connector"
                                      : "Source-specific connector exists"}
                                  </span>
                                </div>
                                <span>
                                  {source.lastSuccessfulRetrieval
                                    ? `Research retrieval observed ${source.lastSuccessfulRetrieval}; ${source.retrievedSampleCount === null ? "sample count unknown" : `${source.retrievedSampleCount} sample(s)`}`
                                    : "No live retrieval verified"}
                                  {" · "}
                                  {source.parsedSampleCount} parsed by OppSift ·{" "}
                                  {source.storedRecordCount} stored ·{" "}
                                  {source.stage === "operational"
                                    ? "operational"
                                    : "not operational"}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        <p className="markets-disclaimer">
          Source research, permissions and operational integrations are tracked
          separately. No market is presented as connected or verified here.
        </p>
      </main>
    </div>
  );
}
