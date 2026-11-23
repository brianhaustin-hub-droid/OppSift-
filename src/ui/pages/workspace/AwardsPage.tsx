import React, { useMemo, useState } from 'react';
import { ArrowRight, Award, ExternalLink, Search, Trophy, X } from 'lucide-react';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout';
import { EmptyStatePanel, ErrorStatusBanner, TableSkeletonState } from '../../components/ui/StateViews';
import { useAppState } from '../../context/AppStateContext';
import { useRouter } from '../../context/RouterContext';
import { formatDisplayDate } from '../../data/fixtures';

export function AwardsPage() {
  const { navigate } = useRouter();
  const { awards, countries, dataLoading, dataError, dataConfigured } = useAppState();
  const [countryFilter, setCountryFilter] = useState('All');
  const [query, setQuery] = useState('');

  const liveAwards = useMemo(() => {
    const term = query.trim().toLowerCase();
    return awards
      .filter((award) => {
        if (countryFilter !== 'All' && award.countryCode !== countryFilter) return false;
        if (!term) return true;
        return (
          award.title.toLowerCase().includes(term) ||
          award.issuingOrganisation.toLowerCase().includes(term) ||
          award.referenceNumber.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => b.publicationDate.localeCompare(a.publicationDate));
  }, [awards, countryFilter, query]);

  const sierraLeoneAwards = awards.filter((award) => award.countryCode === 'SL');
  const coveredCountries = new Set(awards.map((award) => award.countryCode)).size;
  const selectedCountry = countries.find((country) => country.code === countryFilter);
  const latestAward = [...awards].sort((a, b) => b.publicationDate.localeCompare(a.publicationDate))[0];

  return (
    <WorkspaceLayout title="Awarded Contracts" breadcrumb="Workspace / Awards">
      <div className="space-y-6">
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Awarded notices indexed', value: `${awards.length}`, accent: 'oppsift-kpi-burgundy' },
            { label: 'Sierra Leone awards', value: `${sierraLeoneAwards.length}`, accent: 'oppsift-kpi-blue' },
            { label: 'Jurisdictions with awards', value: `${coveredCountries}`, accent: 'oppsift-card' },
            {
              label: 'Most recent award',
              value: latestAward ? formatDisplayDate(latestAward.publicationDate) : '—',
              accent: 'oppsift-card',
            },
          ].map((metric) => (
            <div key={metric.label} className={`p-4 rounded-lg ${metric.accent}`}>
              <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">{metric.label}</p>
              <p className="mt-1 font-display text-2xl font-bold tabular-nums break-words">{metric.value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-lg oppsift-card overflow-hidden">
          <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-4 border-b border-[#E2E8F0] dark:border-white/10 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A33B59] dark:text-[#E8A4B5]">
                  Contract awards
                </p>
                <h2 className="font-display text-lg font-bold">
                  {selectedCountry ? `${selectedCountry.name} awarded contracts` : 'All awarded contracts'}
                </h2>
                <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] mt-1 max-w-2xl">
                  Award records are stored alongside open tenders. They show the contract that was awarded, who won
                  it where the publisher states it, and the official notice each record came from.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#E2E8F0] dark:border-white/15 text-[11px] font-medium">
                <Award className="w-3.5 h-3.5" />
                <span>{liveAwards.length} shown</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <div className="relative sm:col-span-2">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] dark:text-[#CBD5E1]" />
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search awarded contracts, authorities or references"
                  className="w-full h-10 pl-9 pr-9 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-xs"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-[#64748B] hover:text-[#172033] dark:hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div>
                <select
                  value={countryFilter}
                  onChange={(event) => setCountryFilter(event.target.value)}
                  className="w-full h-10 px-2.5 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-xs"
                >
                  <option value="All">All countries</option>
                  {countries
                    .filter((country) => awards.some((award) => award.countryCode === country.code))
                    .map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name} ({awards.filter((award) => award.countryCode === country.code).length})
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => {
                    setCountryFilter('SL');
                    setQuery('');
                  }}
                  className="w-full h-10 px-3 rounded-lg border border-[#A33B59]/40 bg-[#FFF1F2] dark:bg-[#541B32]/40 text-[#541B32] dark:text-[#E8A4B5] text-xs font-semibold"
                >
                  Sierra Leone awards
                </button>
              </div>
            </div>
          </div>

          {dataError && (
            <div className="px-4 sm:px-5 pt-4">
              <ErrorStatusBanner
                tone="warning"
                title="Live award records could not be loaded"
                message={dataError}
              />
            </div>
          )}
          {!dataConfigured && (
            <div className="px-4 sm:px-5 pt-4">
              <ErrorStatusBanner
                tone="info"
                title="Neon data endpoints are not configured"
                message="Award records load from the live database once VITE_NEON_DATA_API_URL is set."
              />
            </div>
          )}

          <div className="p-4 sm:p-5">
            {dataLoading ? (
              <TableSkeletonState rows={5} />
            ) : liveAwards.length === 0 ? (
              <EmptyStatePanel
                title="No award records in this view"
                description={
                  dataConfigured
                    ? 'No awarded notices match the selected country and search. Try All countries or clear the search.'
                    : 'Award records will appear here as soon as the live database connection is configured.'
                }
                actionLabel={countryFilter === 'SL' ? 'Show all countries' : 'Show Sierra Leone'}
                onAction={() => setCountryFilter(countryFilter === 'SL' ? 'All' : 'SL')}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[720px]">
                  <thead className="text-[#64748B] dark:text-[#CBD5E1]">
                    <tr className="border-b border-[#E2E8F0] dark:border-white/10">
                      <th className="py-2.5 px-3 font-semibold">Awarded contract</th>
                      <th className="py-2.5 px-3 font-semibold">Issuing authority</th>
                      <th className="py-2.5 px-3 font-semibold">Country</th>
                      <th className="py-2.5 px-3 font-semibold">Award notice date</th>
                      <th className="py-2.5 px-3 font-semibold">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] dark:divide-white/8">
                    {liveAwards.map((award) => (
                      <tr key={award.id} className="align-top">
                        <td className="py-3 px-3">
                          <button
                            type="button"
                            onClick={() => navigate(`/opportunity/${award.id}`)}
                            className="text-left font-semibold hover:text-[#541B32] dark:hover:text-[#E8A4B5] hover:underline"
                          >
                            {award.title}
                          </button>
                          <p className="mt-1 font-mono text-[10.5px] text-[#64748B] dark:text-[#CBD5E1]">
                            {award.referenceNumber}
                          </p>
                        </td>
                        <td className="py-3 px-3 text-[#64748B] dark:text-[#CBD5E1]">{award.issuingOrganisation}</td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <Trophy className="w-3.5 h-3.5 text-[#A33B59] dark:text-[#E8A4B5]" />
                            {award.countryName}
                          </span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap font-mono">
                          {award.publicationDate ? formatDisplayDate(award.publicationDate) : 'Not stated'}
                        </td>
                        <td className="py-3 px-3">
                          <a
                            href={award.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-[#164E8B] dark:text-[#38BDF8] hover:underline font-medium"
                          >
                            <span>Official notice</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-lg oppsift-card p-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-sm font-semibold">Awards are not opening notices</h3>
            <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] mt-1 max-w-2xl">
              Use the opportunity explorer for live tenders and grants. Award records are kept for competition and
              pricing intelligence, and every row links back to the issuing source.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/discover')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#541B32] hover:bg-[#A33B59] text-white text-xs font-semibold"
          >
            <span>Explore open opportunities</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </section>
      </div>
    </WorkspaceLayout>
  );
}
