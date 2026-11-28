import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Bell,
  Building2,
  CheckCircle2,
  ClipboardList,
  Compass,
  Database,
  FileSearch,
  Globe2,
  Landmark,
  LineChart,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { PhotographicBackdrop } from '../../components/media/PhotographicBackdrop';
import { useRouter } from '../../context/RouterContext';
import { INITIAL_PLAN_CATALOG, formatUsd } from '../../data/billingConfig';
import { formatLiveAge } from '../../data/liveness';
import { usePlatformStats } from '../../data/platformStats';
import {
  sourceStatusDot,
  sourceStatusTone,
  useSourceShowcase,
} from '../../data/sourceShowcase';
import { usePageMeta } from '../../../seo/usePageMeta';
import siteContent from '../../../seo/site-content.json';

const HERO = siteContent.hero;
const CAPABILITIES = siteContent.capabilities;
const CATEGORIES = siteContent.categories;
const STAGES = siteContent.stages;

const numberFormat = new Intl.NumberFormat('en-GB');

function formatCount(value: number): string {
  return numberFormat.format(value);
}

function formatTimestamp(value: string | null): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

function SectionHeading({
  eyebrow,
  title,
  intro,
  align = 'left',
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  align?: 'left' | 'center';
}) {
  return (
    <div className={align === 'center' ? 'max-w-3xl mx-auto text-center' : 'max-w-3xl'}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#541B32] dark:text-[#E8A4B5]">
        {eyebrow}
      </p>
      <h2 className="mt-2 font-display text-2xl sm:text-3xl lg:text-[2.15rem] font-bold tracking-tight text-balance">
        {title}
      </h2>
      {intro && (
        <p className="mt-3 text-sm sm:text-base leading-relaxed text-[#526070] dark:text-[#CBD5E1]">
          {intro}
        </p>
      )}
    </div>
  );
}

function HeroProductPreview() {
  const [tab, setTab] = useState<'discover' | 'evaluate' | 'monitor'>('discover');
  const tabs = [
    { id: 'discover', label: 'Discover' },
    { id: 'evaluate', label: 'Evaluate' },
    { id: 'monitor', label: 'Monitor' },
  ] as const;

  return (
    <div className="rounded-lg border border-white/20 bg-white dark:bg-[#171923] text-[#172033] dark:text-[#F8FAFC] overflow-hidden shadow-[0_24px_60px_-30px_rgba(0,0,0,0.65)]">
      <div className="oppsift-sidebar-gradient px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-white/90">OppSift workspace</p>
        <div className="flex items-center gap-1 rounded bg-black/25 p-0.5" role="tablist" aria-label="Product demonstration views">
          {tabs.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={tab === entry.id}
              onClick={() => setTab(entry.id)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                tab === entry.id ? 'bg-white text-[#251019]' : 'text-white/80 hover:text-white'
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-3 min-h-[268px]" role="tabpanel">
        {tab === 'discover' && (
          <div className="space-y-2.5">
            {[
              { market: 'Kenya · Government', ref: 'PPIP/2026/0148', line: 'Works supervision — lot 2', value: 'Value not disclosed' },
              { market: 'European Union · Framework', ref: 'TED/2026/0417', line: 'Data interoperability services', value: 'EUR 1,850,000' },
              { market: 'United States · Grants', ref: 'G-2026-0092', line: 'Regional innovation programme', value: 'USD 750,000' },
            ].map((row) => (
              <div
                key={row.ref}
                className="rounded-md border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433]/60 p-3"
              >
                <div className="flex items-center justify-between gap-2 text-[11px] text-[#5A6B80] dark:text-[#CBD5E1]">
                  <span>{row.market}</span>
                  <span className="font-mono">{row.ref}</span>
                </div>
                <p className="mt-1 font-display text-sm font-semibold">{row.line}</p>
                <p className="mt-0.5 font-mono text-[11px] text-[#5A6B80] dark:text-[#CBD5E1]">{row.value}</p>
              </div>
            ))}
          </div>
        )}

        {tab === 'evaluate' && (
          <div className="space-y-3">
            <div className="rounded-md border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433]/60 p-4">
              <p className="text-[11px] font-semibold text-[#15803D] dark:text-[#4ADE80]">
                Criteria compared with your profile
              </p>
              <ul className="mt-2 space-y-1.5 text-xs text-[#526070] dark:text-[#CBD5E1]">
                <li className="flex gap-2"><CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-[#15803D] dark:text-[#4ADE80]" /> ISO 27001 recorded in the organisation profile</li>
                <li className="flex gap-2"><CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-[#15803D] dark:text-[#4ADE80]" /> Two reference contracts above the stated threshold</li>
                <li className="flex gap-2"><Target className="w-3.5 h-3.5 mt-0.5 text-[#B45309] dark:text-[#FCD34D]" /> Missing: current financial statement not uploaded</li>
              </ul>
            </div>
            <p className="text-[11px] leading-relaxed text-[#5A6B80] dark:text-[#CBD5E1]">
              Confirmed requirements are cited to the notice clause. Missing profile facts are listed as gaps, not as a pass.
            </p>
          </div>
        )}

        {tab === 'monitor' && (
          <div className="space-y-2.5">
            {[
              { title: 'Amendment 2 published', detail: 'Closing date moved · 6 days from publication' },
              { title: 'Clarification answer added', detail: 'Submission format · official Q&A' },
              { title: 'Saved search matched 4 notices', detail: 'Water infrastructure · East Africa' },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-2.5 rounded-md border border-[#E2E8F0] dark:border-[#263244] p-3"
              >
                <Bell className="w-4 h-4 mt-0.5 text-[#541B32] dark:text-[#E8A4B5]" />
                <div>
                  <p className="text-xs font-semibold">{item.title}</p>
                  <p className="text-[11px] text-[#5A6B80] dark:text-[#CBD5E1]">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="px-4 sm:px-5 py-2.5 border-t border-[#E2E8F0] dark:border-[#263244] text-[10px] text-[#64748B] dark:text-[#94A3B8]">
        Illustrative product view with sample data. No live opportunity records are shown on this public page.
      </p>
    </div>
  );
}

function Hero() {
  return (
    <PhotographicBackdrop
      initialTheme="global-cities"
      overlayTone="burgundy-navy"
      minHeightClass="min-h-[560px] lg:min-h-[640px]"
      className="border-b border-white/10"
    >
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-12 pb-12 lg:pt-16 lg:pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          <div className="lg:col-span-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#F0B8C6]">
              {HERO.eyebrow}
            </p>
            <h1 className="mt-4 font-display text-[2.1rem] leading-[1.1] sm:text-5xl lg:text-[3.35rem] font-bold tracking-tight text-white text-balance">
              Global opportunities.{' '}
              <span className="block text-[#F6D5DD]">Clearer decisions.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base sm:text-lg leading-relaxed text-white/85">
              {HERO.supporting}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="/register"
                className="inline-flex items-center gap-2 rounded-md bg-[#A33B59] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#C93564] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              >
                {HERO.primaryCta}
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="#product"
                className="inline-flex items-center gap-2 rounded-md border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              >
                <Compass className="w-4 h-4" />
                {HERO.secondaryCta}
              </a>
            </div>
            <p className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-white/70">
              <span className="inline-flex items-center gap-1.5"><Landmark className="w-3.5 h-3.5" /> Official publishers</span>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Source attribution kept</span>
              <span className="inline-flex items-center gap-1.5"><Globe2 className="w-3.5 h-3.5" /> Coverage stated, not assumed</span>
            </p>
          </div>

          <div className="lg:col-span-6 min-w-0">
            <HeroProductPreview />
          </div>
        </div>
      </div>
    </PhotographicBackdrop>
  );
}

function StatsBand({ state }: { state: ReturnType<typeof usePlatformStats> }) {
  const { stats, loading, error } = state;

  const items = stats
    ? [
        {
          label: 'Markets in the registry',
          value: formatCount(stats.registeredMarkets),
          note: 'Countries with a market record',
        },
        {
          label: 'Markets holding notices',
          value: formatCount(stats.marketsWithRecords),
          note: 'Markets with collected records',
        },
        {
          label: 'Sources registered',
          value: formatCount(stats.registeredSources),
          note: `${formatCount(stats.operationalSources)} marked operational`,
        },
        {
          label: 'Verified notices',
          value: formatCount(stats.storedNotices),
          note: stats.newestCollectionAt
            ? `Newest collection ${formatTimestamp(stats.newestCollectionAt)}`
            : 'No collection recorded',
        },
      ]
    : [];

  return (
    <section aria-labelledby="platform-figures" className="border-b border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#151122]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="platform-figures" className="text-xs font-semibold uppercase tracking-[0.14em] text-[#541B32] dark:text-[#E8A4B5]">
            Platform figures
          </h2>
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
            {loading
              ? 'Reading the platform database…'
              : error
                ? 'Live figures unavailable'
                : stats?.newestCollectionAt
                  ? `Read from the platform database · newest recorded collection ${formatLiveAge(stats.newestCollectionAt)}`
                  : 'Read from the platform database'}
          </p>
        </div>

        {error ? (
          <p className="mt-3 text-sm text-[#B45309] dark:text-[#FCD34D]">
            Coverage figures could not be read in this session: {error} No figure is shown rather than an estimate.
          </p>
        ) : (
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4">
            {(loading ? Array.from({ length: 4 }) : items).map((item, index) => {
              const entry = item as { label?: string; value?: string; note?: string } | undefined;
              return (
                <div key={entry?.label ?? index} className="min-w-0">
                  {loading ? (
                    <div className="h-8 w-20 rounded bg-[#E2E8F0] dark:bg-[#263244] animate-pulse" aria-hidden="true" />
                  ) : (
                    <dd className="font-display text-3xl font-bold tabular-nums tracking-tight">{entry?.value}</dd>
                  )}
                  <dt className="mt-1 text-xs font-medium text-[#172033] dark:text-[#F8FAFC]">{entry?.label ?? '\u00a0'}</dt>
                  {!loading && <p className="mt-0.5 text-[11px] text-[#64748B] dark:text-[#94A3B8]">{entry?.note}</p>}
                </div>
              );
            })}
          </dl>
        )}
      </div>
    </section>
  );
}

const CAPABILITY_ICONS: Record<string, React.ReactNode> = {
  discovery: <Compass className="w-5 h-5" />,
  matching: <Target className="w-5 h-5" />,
  eligibility: <ShieldCheck className="w-5 h-5" />,
  intelligence: <FileSearch className="w-5 h-5" />,
  monitoring: <Bell className="w-5 h-5" />,
  preparation: <ClipboardList className="w-5 h-5" />,
};

function ProductSection() {
  return (
    <section id="product" className="scroll-mt-20 py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="The platform"
          title="From a published notice to a prepared pursuit"
          intro="Six capabilities share one record: the notice, its source and what your organisation still needs to prove. Nothing is re-keyed between steps."
        />

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {CAPABILITIES.map((capability) => (
            <article
              key={capability.key}
              className="rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923] p-5 transition-colors hover:border-[#C7A3B0] dark:hover:border-[#7E1B3E]"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[#F5EDF0] text-[#541B32] dark:bg-[#2A1420] dark:text-[#E8A4B5]">
                  {CAPABILITY_ICONS[capability.key] ?? <Sparkles className="w-5 h-5" />}
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    capability.status === 'Available now'
                      ? 'border-[#BBE5CB] text-[#15803D] dark:border-[#1E4B33] dark:text-[#4ADE80]'
                      : 'border-[#E2D5B7] text-[#8A5A12] dark:border-[#4A3A1C] dark:text-[#FCD34D]'
                  }`}
                >
                  {capability.status}
                </span>
              </div>
              <h3 className="mt-4 font-display text-base font-semibold">{capability.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#526070] dark:text-[#CBD5E1]">
                {capability.description}
              </p>
            </article>
          ))}
        </div>

        <p className="mt-5 max-w-4xl text-xs leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
          A capability marked “rolling out” is available in the workspace but not yet applied to every notice: eligibility
          interpretation and document extraction are being extended source by source. Where a notice has not been analysed,
          OppSift shows the verified source fields and links to the published documents instead of guessing.
        </p>
      </div>
    </section>
  );
}

function CategoriesSection() {
  return (
    <section
      id="opportunities"
      className="scroll-mt-20 border-y border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#151122] py-16 sm:py-20"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Opportunity categories"
          title="Three categories, one comparable record"
          intro="Government procurement, grants and funding, and commercial opportunities arrive in different formats. OppSift normalises the fields that decide whether a notice is worth reading."
        />

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-5">
          {CATEGORIES.map((category, index) => (
            <article
              key={category.key}
              className="flex flex-col rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#FBFBFC] dark:bg-[#171923] overflow-hidden"
            >
              <div className={`h-1 w-full ${index === 0 ? 'bg-[#541B32]' : index === 1 ? 'bg-[#164E8B]' : 'bg-[#7B4B2A]'}`} />
              <div className="p-6 flex flex-col flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748B] dark:text-[#94A3B8]">
                  {category.tag}
                </p>
                <h3 className="mt-2 font-display text-xl font-semibold">{category.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#526070] dark:text-[#CBD5E1]">{category.description}</p>
                <p className="mt-3 text-xs leading-relaxed text-[#64748B] dark:text-[#94A3B8]">{category.detail}</p>
                <a
                  href={category.route}
                  className="mt-auto pt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#541B32] dark:text-[#E8A4B5] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A33B59] rounded"
                >
                  Read the category guide
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </article>
          ))}
        </div>

        <p className="mt-6 text-xs text-[#64748B] dark:text-[#94A3B8]">
          This page describes categories. It does not publish opportunity listings, buyer details or dossiers: those are
          workspace content and require an account.
        </p>
      </div>
    </section>
  );
}

function MarketsSection({ platform }: { platform: ReturnType<typeof usePlatformStats> }) {
  const { stats, loading, error } = platform;
  const [showAll, setShowAll] = useState(false);

  const rows = useMemo(() => {
    if (!stats) return [];
    const withRecords = stats.markets.filter((market) => market.records > 0);
    return showAll ? stats.markets : withRecords.slice(0, 8);
  }, [stats, showAll]);

  const topRegions = stats?.regions.slice(0, 6) ?? [];
  const maxRecords = topRegions.reduce((max, region) => Math.max(max, region.records), 0) || 1;

  return (
    <section id="markets" className="scroll-mt-20 py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading eyebrow={siteContent.markets.eyebrow} title={siteContent.markets.title} intro={siteContent.markets.intro} />
          <a
            href="/official-data-sources"
            className="shrink-0 text-sm font-semibold text-[#541B32] dark:text-[#E8A4B5] hover:underline"
          >
            How coverage is verified →
          </a>
        </div>

        {error ? (
          <div className="mt-8 rounded-lg border border-[#EBD9B4] bg-[#FFF9EC] dark:border-[#4A3A1C] dark:bg-[#251E12] p-4 text-sm text-[#8A5A12] dark:text-[#FCD34D]">
            Market coverage could not be read in this session. {error} The table is withheld rather than filled with
            remembered figures.
          </div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Markets in the registry', value: stats?.registeredMarkets, note: 'Every market record' },
                { label: 'With registered sources', value: stats?.marketsWithSources, note: 'At least one source linked' },
                { label: 'Holding collected notices', value: stats?.marketsWithRecords, note: 'Records stored, not planned' },
                { label: 'Sources collected in 7 days', value: stats?.sourcesCollectedRecently, note: 'Successful retrieval recorded' },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923] p-4">
                  <p className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8]">{item.label}</p>
                  <p className="mt-1 font-display text-2xl font-bold tabular-nums">
                    {loading || item.value === undefined ? '—' : formatCount(item.value)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#64748B] dark:text-[#94A3B8]">{item.note}</p>
                </div>
              ))}
            </div>

            {topRegions.length > 0 && (
              <div className="mt-6 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923] p-5">
                <h3 className="font-display text-sm font-semibold">Recorded notices by region</h3>
                <ul className="mt-4 space-y-3">
                  {topRegions.map((region) => (
                    <li key={region.region} className="grid grid-cols-[minmax(6rem,11rem)_1fr_auto] items-center gap-3 text-xs">
                      <span className="truncate font-medium">{region.region}</span>
                      <span className="h-1.5 rounded-full bg-[#EDEFF3] dark:bg-[#263244] overflow-hidden">
                        <span
                          className="block h-full rounded-full bg-[#541B32] dark:bg-[#C93564]"
                          style={{ width: `${Math.max(2, Math.round((region.records / maxRecords) * 100))}%` }}
                        />
                      </span>
                      <span className="font-mono tabular-nums text-[#526070] dark:text-[#CBD5E1]">
                        {formatCount(region.records)} notices · {region.marketsWithRecords}/{region.markets} markets
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 overflow-x-auto rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923]">
              <table className="w-full min-w-[640px] text-left text-sm">
                <caption className="sr-only">Markets with collected notices, their registered sources and newest collection</caption>
                <thead className="bg-[#F8FAFC] dark:bg-[#1C2433] text-[11px] uppercase tracking-wide text-[#64748B] dark:text-[#94A3B8]">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Market</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Region</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-right">Notices</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-right">Sources</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Newest collection</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#263244]">
                  {rows.map((market) => (
                    <tr key={market.code} className="hover:bg-[#F8FAFC] dark:hover:bg-[#1C2433]/50">
                      <th scope="row" className="px-4 py-3 font-semibold text-left">
                        {market.name}
                        <span className="ml-1.5 font-mono text-[10px] font-normal text-[#94A3B8]">{market.code}</span>
                      </th>
                      <td className="px-4 py-3 text-[#526070] dark:text-[#CBD5E1]">{market.region}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{formatCount(market.records)}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        {formatCount(market.sources)}
                        <span className="ml-1 text-[10px] text-[#94A3B8]">({formatCount(market.activeSources)} active)</span>
                      </td>
                      <td className="px-4 py-3 text-[#526070] dark:text-[#CBD5E1]">
                        {formatTimestamp(market.lastSuccessAt) || 'Not recorded'}
                      </td>
                    </tr>
                  ))}
                  {!loading && rows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-[#64748B]">
                        No market holds collected notices yet.
                      </td>
                    </tr>
                  )}
                  {loading && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-[#64748B]">Reading market coverage…</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {stats && stats.markets.length > rows.length && (
              <button
                type="button"
                onClick={() => setShowAll((value) => !value)}
                className="mt-4 rounded-md border border-[#E2E8F0] dark:border-[#263244] px-4 py-2 text-sm font-medium hover:bg-[#F8FAFC] dark:hover:bg-[#1C2433]"
              >
                {showAll ? 'Show only markets with notices' : `Show all ${formatCount(stats.markets.length)} registered markets`}
              </button>
            )}

            <p className="mt-4 max-w-4xl text-xs leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
              A market in the registry is not a supported market. Coverage is only counted when a market holds records from
              a registered source; a market whose sources answer but deliver no notices is not presented as covered.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

function SourcesSection({ showcase }: { showcase: ReturnType<typeof useSourceShowcase> }) {
  const { sources, counts, loading, error } = showcase;
  const strip = sources.length > 0 ? sources : siteContent.sources.candidates.map((candidate) => ({
    key: candidate.key,
    name: candidate.name,
    market: candidate.market,
  }));

  return (
    <section
      id="sources"
      className="scroll-mt-20 border-y border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#151122] py-16 sm:py-20"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow={siteContent.sources.eyebrow} title={siteContent.sources.title} intro={siteContent.sources.intro} />

        <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Delivering records', value: counts.delivering, tone: 'text-[#15803D] dark:text-[#4ADE80]' },
            { label: 'Connected, no retrieval recorded', value: counts.connected_unverified, tone: 'text-[#0369A1] dark:text-[#7DD3FC]' },
            { label: 'Latest check did not answer', value: counts.unreachable, tone: 'text-[#B45309] dark:text-[#FCD34D]' },
            {
              label: 'Registered, not connected or not integrated',
              value: counts.registered + counts['not-integrated'],
              tone: 'text-[#64748B] dark:text-[#CBD5E1]',
            },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#FBFBFC] dark:bg-[#171923] px-4 py-3">
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">{item.label}</p>
              <p className={`font-display text-xl font-bold tabular-nums ${item.tone}`}>
                {loading ? '—' : item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 overflow-hidden border-y border-[#E2E8F0] dark:border-[#263244] py-3" aria-hidden="true">
          <div className="oppsift-source-marquee flex w-max gap-3">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex gap-3">
                {strip.map((source) => (
                  <span
                    key={`${copy}-${source.key}`}
                    className="whitespace-nowrap rounded-md border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433] px-3 py-1.5 text-[11px] font-medium text-[#526070] dark:text-[#CBD5E1]"
                  >
                    {source.name}
                    <span className="ml-1.5 text-[#94A3B8]">· {source.market}</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <p className="mt-5 text-sm text-[#B45309] dark:text-[#FCD34D]">
            {error} Status labels are withheld rather than assumed.
          </p>
        )}

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {siteContent.sources.candidates.map((candidate) => {
            const live = sources.find((entry) => entry.key === candidate.key);
            return (
              <article
                key={candidate.key}
                className="flex flex-col rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#FBFBFC] dark:bg-[#171923] p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-sm font-semibold leading-snug">{candidate.name}</h3>
                  <span className="shrink-0 rounded border border-[#E2E8F0] dark:border-[#263244] px-1.5 py-0.5 text-[10px] font-medium text-[#526070] dark:text-[#CBD5E1]">
                    {candidate.market}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-[#64748B] dark:text-[#94A3B8]">{live?.publisher ?? candidate.publisher}</p>
                <dl className="mt-3 space-y-1 text-[11px]">
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#64748B] dark:text-[#94A3B8]">Category</dt>
                    <dd className="text-right font-medium">{candidate.category}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#64748B] dark:text-[#94A3B8]">Access</dt>
                    <dd className="text-right font-medium">{candidate.access}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex items-start gap-1.5 border-t border-[#E2E8F0] dark:border-[#263244] pt-3">
                  <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${live ? sourceStatusDot(live.status) : 'bg-[#CBD5E1]'}`} />
                  <div>
                    <p className={`text-[11px] font-semibold ${live ? sourceStatusTone(live.status) : 'text-[#64748B]'}`}>
                      {loading ? 'Reading registry…' : live?.statusLabel ?? 'Status unavailable'}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
                      {live?.detail ?? 'No registry row could be read for this source.'}
                    </p>
                  </div>
                </div>
                <a
                  href={candidate.website}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 text-[11px] font-semibold text-[#541B32] dark:text-[#E8A4B5] hover:underline"
                >
                  Official publisher site ↗
                </a>
              </article>
            );
          })}
        </div>

        <p className="mt-5 max-w-4xl text-xs leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
          {siteContent.sources.disclaimer} A source marked “not integrated” is a published official portal that OppSift does
          not yet read; it is listed so the gap is visible.
        </p>
      </div>
    </section>
  );
}

function CredibilitySection() {
  return (
    <section className="py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5">
            <SectionHeading
              eyebrow={siteContent.credibility.eyebrow}
              title={siteContent.credibility.title}
              intro={siteContent.credibility.intro}
            />
            <div className="mt-7 space-y-3">
              {[
                { icon: <Database className="w-4 h-4" />, title: 'Provenance', body: 'Each record keeps the publisher, reference number and a link to the original notice.' },
                { icon: <LineChart className="w-4 h-4" />, title: 'Measured coverage', body: 'Markets, sources and notices are counted from the database, not from a deck.' },
                { icon: <ShieldCheck className="w-4 h-4" />, title: 'Clear boundary', body: 'Public pages describe the platform; workspace content requires an account.' },
              ].map((item) => (
                <div key={item.title} className="flex gap-3 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923] p-3.5">
                  <span className="mt-0.5 text-[#541B32] dark:text-[#E8A4B5]">{item.icon}</span>
                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="text-xs leading-relaxed text-[#526070] dark:text-[#CBD5E1]">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
              {siteContent.credibility.audiences.map((audience) => (
                <div key={audience.title} className="border-t border-[#E2E8F0] dark:border-[#263244] pt-3">
                  <h3 className="flex items-center gap-2 font-display text-sm font-semibold">
                    <Building2 className="w-3.5 h-3.5 text-[#164E8B] dark:text-[#7DD3FC]" />
                    {audience.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#526070] dark:text-[#CBD5E1]">{audience.description}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 rounded-md bg-[#F8FAFC] dark:bg-[#1C2433] px-3.5 py-2.5 text-[11px] leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
              {siteContent.credibility.note}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 border-y border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#151122] py-16 sm:py-20"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="How OppSift works" title="Five stages, one record" intro="The same notice moves through the workflow; nothing has to be copied between tools." />
        <ol className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {STAGES.map((stage, index) => (
            <li key={stage.key} className="relative rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#FBFBFC] dark:bg-[#171923] p-4">
              <span className="font-mono text-[11px] font-semibold text-[#541B32] dark:text-[#E8A4B5]">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-1.5 font-display text-base font-semibold capitalize">{stage.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#526070] dark:text-[#CBD5E1]">{stage.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function PricingSection() {
  const { navigate } = useRouter();
  const plans = INITIAL_PLAN_CATALOG;

  return (
    <section id="pricing" className="scroll-mt-20 py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow={siteContent.pricing.eyebrow} title={siteContent.pricing.title} intro={siteContent.pricing.intro} />

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          {plans.map((plan) => {
            const highlighted = plan.recommended === true;
            const price = formatUsd(plan.monthlyPriceUsd);
            return (
              <article
                key={plan.id}
                className={`flex flex-col rounded-lg border p-5 ${
                  highlighted
                    ? 'border-[#541B32] bg-white shadow-[0_16px_40px_-32px_rgba(84,27,50,0.55)] dark:border-[#C93564] dark:bg-[#171923]'
                    : 'border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-base font-semibold">{plan.name}</h3>
                  {highlighted && (
                    <span className="rounded-full bg-[#F5EDF0] dark:bg-[#2A1420] px-2 py-0.5 text-[10px] font-semibold text-[#541B32] dark:text-[#E8A4B5]">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="mt-3 flex items-baseline gap-1">
                  <span className="font-display text-2xl font-bold tabular-nums">{price}</span>
                  {!plan.customPricing && <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">/ month</span>}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-[#64748B] dark:text-[#94A3B8]">{plan.audience}</p>
                <ul className="mt-4 space-y-1.5 text-[11px] text-[#526070] dark:text-[#CBD5E1]">
                  {plan.features.slice(0, 4).map((feature) => (
                    <li key={feature} className="flex gap-1.5">
                      <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-[#15803D] dark:text-[#4ADE80]" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => navigate(plan.id === 'free' ? '/register' : '/contact')}
                  className={`mt-auto pt-4 text-left text-xs font-semibold hover:underline ${
                    highlighted ? 'text-[#541B32] dark:text-[#E8A4B5]' : 'text-[#164E8B] dark:text-[#7DD3FC]'
                  }`}
                >
                  {plan.id === 'free' ? siteContent.pricing.cta : plan.customPricing ? 'Request a quote' : siteContent.pricing.secondaryCta}
                </button>
              </article>
            );
          })}
        </div>

        <div className="mt-6 flex flex-col gap-2 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433] p-4 text-xs leading-relaxed text-[#526070] dark:text-[#CBD5E1]">
          <p>{siteContent.pricing.checkoutNote}</p>
          <p>
            Prices are the approved plan catalogue, shown per month in USD. Taxes, where applicable, are handled by the
            merchant of record when checkout is enabled.
          </p>
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section
      id="faq"
      className="scroll-mt-20 border-y border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#151122] py-16 sm:py-20"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Questions" title="Frequently asked questions" />
        <div className="mt-8 divide-y divide-[#E2E8F0] dark:divide-[#263244] border-y border-[#E2E8F0] dark:border-[#263244]">
          {siteContent.faq.map((entry) => (
            <details key={entry.question} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-display text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A33B59] rounded">
                <span>{entry.question}</span>
                <span className="text-lg leading-none text-[#541B32] dark:text-[#E8A4B5] transition-transform group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="mt-2.5 text-sm leading-relaxed text-[#526070] dark:text-[#CBD5E1]">{entry.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="oppsift-executive-card rounded-lg px-6 py-12 sm:px-12 sm:py-14 text-white">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-balance">
              {siteContent.cta.headline}
            </h2>
            <p className="mt-3 text-sm sm:text-base leading-relaxed text-white/80">{siteContent.cta.supporting}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="/register"
                className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-semibold text-[#251019] transition-colors hover:bg-[#FFF1F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                {siteContent.cta.primary}
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-md border border-white/35 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                {siteContent.cta.secondary}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PublicHomepage() {
  usePageMeta('/');
  // One read of the aggregate views for the whole page: the statistics band,
  // the market table and the source showcase share the same evidence.
  const platform = usePlatformStats();
  const showcase = useSourceShowcase();

  return (
    <PublicLayout>
      <Hero />
      <StatsBand state={platform} />
      <ProductSection />
      <CategoriesSection />
      <MarketsSection platform={platform} />
      <SourcesSection showcase={showcase} />
      <CredibilitySection />
      <HowItWorksSection />
      <PricingSection />
      <FaqSection />
      <FinalCta />
    </PublicLayout>
  );
}
