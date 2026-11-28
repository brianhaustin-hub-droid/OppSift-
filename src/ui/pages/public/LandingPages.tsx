import React from 'react';
import { ArrowRight, Database, Globe2, ShieldCheck } from 'lucide-react';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { PhotographicBackdrop } from '../../components/media/PhotographicBackdrop';
import { formatLiveAge } from '../../data/liveness';
import { usePlatformStats } from '../../data/platformStats';
import { pageMeta, usePageMeta } from '../../../seo/usePageMeta';

const numberFormat = new Intl.NumberFormat('en-GB');

/**
 * The independent search-intent pages. Each one is driven by its own entry in
 * the shared site content, so the prerendered HTML, the metadata and the
 * visible page cannot drift apart.
 */
export function PublicLandingPage({ path }: { path: string }) {
  usePageMeta(path);
  const meta = pageMeta(path);
  const platform = usePlatformStats();

  if (!meta) {
    return (
      <PublicLayout>
        <div className="max-w-3xl mx-auto px-4 py-20">
          <h1 className="font-display text-2xl font-bold">Page not available</h1>
          <p className="mt-2 text-sm text-[#526070] dark:text-[#CBD5E1]">
            This guide has not been published. Return to the <a className="underline" href="/">homepage</a>.
          </p>
        </div>
      </PublicLayout>
    );
  }

  const stats = platform.stats;
  const isSourcesPage = path === '/official-data-sources';
  const isGrantsPage = path === '/international-grants';

  return (
    <PublicLayout>
      <PhotographicBackdrop
        initialTheme={isSourcesPage ? 'connectivity-emerging' : isGrantsPage ? 'research-innovation' : 'infrastructure'}
        overlayTone="navy"
        minHeightClass="min-h-[300px] sm:min-h-[360px]"
        className="border-b border-white/10"
      >
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <nav aria-label="Breadcrumb" className="text-[11px] text-white/70">
            <a href="/" className="hover:text-white">Home</a>
            <span className="mx-1.5" aria-hidden="true">/</span>
            <span className="text-white/90">{meta.title.split(' — ')[0]?.split(' | ')[0]}</span>
          </nav>
          <h1 className="mt-4 max-w-3xl font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight text-white text-balance">
            {meta.h1}
          </h1>
          <p className="mt-4 max-w-2xl text-sm sm:text-base leading-relaxed text-white/85">{meta.lead}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/register"
              className="inline-flex items-center gap-2 rounded-md bg-[#A33B59] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#C93564]"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="/#markets"
              className="inline-flex items-center gap-2 rounded-md border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20"
            >
              <Globe2 className="w-4 h-4" />
              See market coverage
            </a>
          </div>
        </div>
      </PhotographicBackdrop>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7 space-y-8">
            {meta.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="font-display text-lg sm:text-xl font-semibold">{section.heading}</h2>
                <p className="mt-2 text-sm leading-relaxed text-[#526070] dark:text-[#CBD5E1]">{section.body}</p>
              </section>
            ))}
          </div>

          <aside className="lg:col-span-5 space-y-4">
            <div className="rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923] p-5">
              <h2 className="flex items-center gap-2 font-display text-sm font-semibold">
                <Database className="w-4 h-4 text-[#164E8B] dark:text-[#7DD3FC]" />
                Current platform evidence
              </h2>
              {platform.error ? (
                <p className="mt-3 text-xs leading-relaxed text-[#B45309] dark:text-[#FCD34D]">
                  Live figures could not be read in this session. No figure is shown rather than an estimate.
                </p>
              ) : (
                <dl className="mt-3 space-y-2.5 text-xs">
                  {[
                    { label: 'Markets in the registry', value: stats?.registeredMarkets },
                    { label: 'Markets with verified notices', value: stats?.marketsWithNotices },
                    { label: 'Registered integrations', value: stats?.registeredSources },
                    { label: 'Operational integrations', value: stats?.operationalSources },
                    { label: 'Verified notices', value: stats?.verifiedNotices },
                  ].map((row) => (
                    <div key={row.label} className="flex items-baseline justify-between gap-3">
                      <dt className="text-[#64748B] dark:text-[#94A3B8]">{row.label}</dt>
                      <dd className="font-mono text-sm font-semibold tabular-nums">
                        {platform.loading || row.value === undefined ? '—' : numberFormat.format(row.value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              <p className="mt-3 text-[10px] leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
                {stats?.newestCollectionAt
                  ? `Newest recorded collection ${formatLiveAge(stats.newestCollectionAt)}.`
                  : 'Read from the platform database.'}
              </p>
            </div>

            <div className="rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923] p-5">
              <h2 className="flex items-center gap-2 font-display text-sm font-semibold">
                <ShieldCheck className="w-4 h-4 text-[#541B32] dark:text-[#E8A4B5]" />
                Related pages
              </h2>
              <ul className="mt-3 space-y-2 text-xs">
                {meta.links.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} className="font-medium text-[#541B32] dark:text-[#E8A4B5] hover:underline">
                      {link.label} →
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>

        <div className="mt-14 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Start with one market and one category</h2>
            <p className="mt-1 text-sm text-[#526070] dark:text-[#CBD5E1]">
              A free account includes core discovery, a baseline profile and a small number of saved records.
            </p>
          </div>
          <a
            href="/register"
            className="inline-flex shrink-0 items-center gap-2 rounded-md bg-[#541B32] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#A33B59]"
          >
            Create a free account
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </PublicLayout>
  );
}
