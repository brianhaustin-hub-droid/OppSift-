import React, { useState } from 'react';
import {
  ArrowRight,
  Bell,
  Check,
  ChevronDown,
  Compass,
  Database,
  FileSearch,
  Globe,
  Layers,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  CheckoutModal,
  PlanComparisonMatrix,
  PlanTierCard,
} from '../../components/billing/BillingComponents';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { CinematicVideoBackdrop } from '../../components/media/CinematicVideoBackdrop';
import { HorizontalBarChart } from '../../components/ui/Charts';
import { useAppState } from '../../context/AppStateContext';
import { useRouter } from '../../context/RouterContext';
import { BILLING_PROVIDER_CONFIG } from '../../data/billingConfig';
import { formatCurrencyValue } from '../../data/fixtures';
import { BillingFrequency, CinematicPlaylistId, OpportunityCategory, PlanTierConfig } from '../../types/oppsift';

function PublicHeroBanner({
  playlistIds,
  overlayTone = 'burgundy-navy',
  kicker,
  title,
  subtitle,
  rightSlot,
}: {
  playlistIds: CinematicPlaylistId[];
  overlayTone?: 'burgundy' | 'navy' | 'burgundy-navy';
  kicker: string;
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <CinematicVideoBackdrop
      playlistIds={playlistIds}
      overlayTone={overlayTone}
      className="border-b border-white/10"
      showControls={true}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8 lg:pt-14 lg:pb-10">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold tracking-wide text-[#E8A4B5]">{kicker}</p>
            <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight text-white text-balance">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-3 text-sm sm:text-base text-white/85 leading-relaxed max-w-2xl">
                {subtitle}
              </p>
            )}
          </div>
          {rightSlot && <div className="shrink-0">{rightSlot}</div>}
        </div>
      </div>
    </CinematicVideoBackdrop>
  );
}

export function PublicHomepage() {
  const { navigate } = useRouter();
  const { countries, sources, opportunities } = useAppState();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [previewTab, setPreviewTab] = useState<'overview' | 'eligibility' | 'sources'>('overview');

  const faqs = [
    {
      q: 'What types of opportunities does OppSift index?',
      a: 'OppSift indexes government tenders, public procurement frameworks, Requests for Proposals (RFPs), grants, funding programmes, and commercial contracts from supported official sources.',
    },
    {
      q: 'How does OppSift handle eligibility analysis?',
      a: 'OppSift compares published solicitation requirements against your organisation profile, separating confirmed source requirements from AI-assisted eligibility interpretations. AI assessments never replace official contracting authority rulings.',
    },
    {
      q: 'Which countries and currencies are supported?',
      a: 'OppSift treats country, currency, timezone, and language metadata as first-class fields. Active official feeds cover the United Kingdom, European Union, Germany, Singapore, United States, Canada, and Australia, with partial and planned expansions transparently labelled.',
    },
    {
      q: 'Does OppSift automatically submit bids on my behalf?',
      a: 'No. OppSift helps you discover opportunities, verify eligibility, organise tasks, and track deadlines. Final bid submission occurs directly on the issuing authority portal.',
    },
  ];

  return (
    <PublicLayout>
      {/* Hero Section with Cinematic Global Intelligence Backdrop */}
      <CinematicVideoBackdrop
        playlistIds={['global-cities', 'international-trade', 'infrastructure']}
        overlayTone="burgundy-navy"
        className="border-b border-white/10"
        showControls={true}
      >
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-12 lg:pt-16 lg:pb-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-xs font-semibold tracking-wide text-[#E8A4B5]">
                Global Opportunity Intelligence Platform
              </p>
              <h1 className="mt-3 font-display text-4xl sm:text-5xl font-bold tracking-tight text-white leading-[1.12] text-balance">
                Discover the right opportunity. Understand it. Know what to do next.
              </h1>
              <p className="mt-5 text-base sm:text-lg text-white/85 leading-relaxed max-w-xl">
                OppSift brings international tender discovery, requirement extraction, eligibility assessment, and pipeline preparation into one workspace built for multi-country teams.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/onboarding')}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-md text-sm font-semibold bg-[#A33B59] hover:bg-[#C93564] text-white transition-colors whitespace-nowrap"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/discover')}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-md text-sm font-semibold border border-white/25 bg-white/10 hover:bg-white/20 text-white transition-colors whitespace-nowrap"
                >
                  <Compass className="w-4 h-4 text-[#38BDF8]" />
                  <span>Explore Opportunities</span>
                </button>
              </div>
              <div className="mt-8 pt-6 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-lg">
                <div>
                  <p className="font-display text-xl font-bold tabular-nums text-white">7 Active</p>
                  <p className="text-xs text-white/75 mt-0.5">Procurement Jurisdictions</p>
                </div>
                <div>
                  <p className="font-display text-xl font-bold tabular-nums text-white">5 Types</p>
                  <p className="text-xs text-white/75 mt-0.5">Tenders, Grants &amp; RFPs</p>
                </div>
                <div>
                  <p className="font-display text-xl font-bold tabular-nums text-white">Verified</p>
                  <p className="text-xs text-white/75 mt-0.5">Source Attribution</p>
                </div>
              </div>
            </div>

            {/* Interactive Product Preview */}
            <div className="lg:col-span-6 min-w-0">
              <div className="h-full rounded-lg border border-white/15 bg-white dark:bg-[#171923] text-[#172033] dark:text-[#F8FAFC] overflow-hidden shadow-lg flex flex-col">
                <div className="oppsift-sidebar-gradient px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-2 text-white">
                  <div className="text-xs font-medium text-white/90">
                    OppSift Workspace · International Feed
                  </div>
                  <div className="flex items-center gap-1 bg-black/25 p-0.5 rounded-md">
                    {(['overview', 'eligibility', 'sources'] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setPreviewTab(tab)}
                        className={`px-2.5 py-1 rounded text-xs font-medium capitalize transition-colors ${
                          previewTab === tab ? 'bg-white text-[#251019]' : 'text-white/80 hover:text-white'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  {previewTab === 'overview' && (
                    <div className="space-y-3">
                      {opportunities.slice(0, 3).map((opp) => (
                        <button
                          key={opp.id}
                          type="button"
                          onClick={() => navigate(`/opportunity/${opp.id}`)}
                          className="w-full text-left p-3.5 rounded-lg border border-[#E2E8F0] dark:border-[#263244] hover:border-[#A33B59] transition-colors bg-[#F8FAFC] dark:bg-[#1C2433]/60"
                        >
                          <div className="flex items-center justify-between gap-2 text-xs text-[#64748B] dark:text-[#CBD5E1]">
                            <span>{opp.countryName} · {opp.category}</span>
                            <span className="font-mono tabular-nums text-[#541B32] dark:text-[#E8A4B5] font-medium">
                              {opp.matchScore}% profile alignment
                            </span>
                          </div>
                          <p className="mt-1 font-display text-sm font-semibold text-[#172033] dark:text-[#F8FAFC] line-clamp-1">
                            {opp.title}
                          </p>
                          <div className="mt-1.5 flex items-center justify-between text-xs text-[#64748B] dark:text-[#CBD5E1]">
                            <span className="truncate pr-2">{opp.issuingOrganisation}</span>
                            <span className="font-mono tabular-nums shrink-0">
                              {formatCurrencyValue(opp.estimatedValue, opp.currency)}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {previewTab === 'eligibility' && (
                    <div className="space-y-3">
                      <div className="p-4 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433]/60">
                        <p className="text-xs font-semibold text-[#16A34A]">Likely Eligible · High Confidence</p>
                        <p className="mt-1 font-display text-sm font-semibold">
                          UK-CCS-2026-0841 — Clinical Data Interoperability Framework
                        </p>
                        <ul className="mt-3 space-y-1.5 text-xs text-[#64748B] dark:text-[#CBD5E1]">
                          <li>• Confirmed: ISO/IEC 27001:2022 matched in organisation record</li>
                          <li>• Missing: UK Cyber Essentials Plus renewal date not yet entered</li>
                          <li>• Citation: ITT-Volume-1-Specification.pdf §4.2 &amp; §6.1</li>
                        </ul>
                      </div>
                      <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">
                        AI-assisted assessments always separate verified source clauses from interpretation.
                      </p>
                    </div>
                  )}

                  {previewTab === 'sources' && (
                    <div className="divide-y divide-[#E2E8F0] dark:divide-[#263244] border border-[#E2E8F0] dark:border-[#263244] rounded-lg overflow-hidden">
                      {sources.slice(0, 4).map((src) => (
                        <div key={src.id} className="px-3.5 py-2.5 flex items-center justify-between text-xs bg-[#F8FAFC] dark:bg-[#1C2433]/40">
                          <div>
                            <p className="font-medium text-[#172033] dark:text-[#F8FAFC]">{src.name}</p>
                            <p className="text-[#64748B] dark:text-[#CBD5E1]">{src.countryName} · {src.accessMethod}</p>
                          </div>
                          <span className={src.availability === 'Connected' ? 'text-[#16A34A] font-medium' : 'text-[#D97706] font-medium'}>
                            {src.availability}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#263244] flex items-center justify-between text-xs">
                    <span className="text-[#64748B] dark:text-[#CBD5E1]">Indexed source records · Open workspace for live alerts</span>
                    <button
                      type="button"
                      onClick={() => navigate('/dashboard')}
                      className="font-semibold text-[#541B32] dark:text-[#E8A4B5] hover:underline whitespace-nowrap"
                    >
                      Launch Dashboard →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </CinematicVideoBackdrop>

      {/* Opportunity Categories Overview */}
      <section className="border-t border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#172033] dark:text-[#F8FAFC]">
              One intelligence layer across public and commercial opportunities
            </h2>
            <p className="mt-2 text-sm sm:text-base text-[#64748B] dark:text-[#CBD5E1]">
              Normalised schemas across currencies, submission deadlines, and contracting authorities.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: 'Government Tenders',
                desc: 'Central ministries, municipal procurements, and national framework agreements.',
                route: '/discover/government',
              },
              {
                title: 'Requests for Proposals',
                desc: 'Structured two-envelope RFPs, technical specifications, and Q&A corrigenda.',
                route: '/discover',
              },
              {
                title: 'Grants & Funding',
                desc: 'Research consortia calls, climate transition grants, and non-repayable programmes.',
                route: '/discover/grants',
              },
              {
                title: 'Commercial Contracts',
                desc: 'Enterprise supplier tenders, maritime/logistics RFPs, and regulated partner calls.',
                route: '/discover/commercial',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="p-5 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#101114] flex flex-col justify-between"
              >
                <div>
                  <h3 className="font-display text-base font-semibold text-[#172033] dark:text-[#F8FAFC]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-[#64748B] dark:text-[#CBD5E1] leading-relaxed">{item.desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(item.route)}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#541B32] dark:text-[#E8A4B5] hover:underline"
                >
                  <span>Browse category</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How OppSift Works & Intelligence Capabilities */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#172033] dark:text-[#F8FAFC]">
              How OppSift turns raw notices into actionable decisions
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[#64748B] dark:text-[#CBD5E1] leading-relaxed">
              Instead of exporting spreadsheets from disparate national portals, teams configure capabilities once and monitor structured matches continuously.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate('/how-it-works')}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923] hover:bg-[#F1F5F9] dark:hover:bg-[#1C2433]"
              >
                View Full Workflow
              </button>
              <button
                type="button"
                onClick={() => navigate('/sources')}
                className="px-4 py-2 rounded-lg text-sm font-medium text-[#164E8B] dark:text-[#38BDF8] hover:underline"
              >
                Inspect Supported Sources
              </button>
            </div>
          </div>
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              {
                num: '01',
                title: 'Global Discovery & Normalisation',
                body: 'Ingests official portals with preserved reference IDs, native currencies, and timezone-aware deadlines.',
                icon: <Globe className="w-4 h-4 text-[#164E8B] dark:text-[#38BDF8]" />,
              },
              {
                num: '02',
                title: 'Eligibility & Disqualifier Check',
                body: 'Highlights matched certifications, consortium mandates, and unverified profile gaps with clause citations.',
                icon: <ShieldCheck className="w-4 h-4 text-[#541B32] dark:text-[#E8A4B5]" />,
              },
              {
                num: '03',
                title: 'Amendment & Deadline Alerts',
                body: 'Tracks corrigenda, Q&A batches, and closing windows so teams never miss specification changes.',
                icon: <Bell className="w-4 h-4 text-[#164E8B] dark:text-[#38BDF8]" />,
              },
              {
                num: '04',
                title: 'Pipeline & Bid Preparation',
                body: 'Move notices from Interested through Preparing to Submitted with tasks, milestones, and team notes.',
                icon: <Layers className="w-4 h-4 text-[#541B32] dark:text-[#E8A4B5]" />,
              },
            ].map((step) => (
              <div key={step.num} className="p-5 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923]">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-[#541B32] dark:text-[#E8A4B5]">{step.num}.</span>
                  {step.icon}
                </div>
                <h3 className="mt-3 font-display text-base font-semibold text-[#172033] dark:text-[#F8FAFC]">{step.title}</h3>
                <p className="mt-1.5 text-sm text-[#64748B] dark:text-[#CBD5E1]">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Transparent Global Coverage (IndexBox-Inspired Institutional Overview) */}
      <section className="border-t border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="oppsift-intel-rule pt-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-[#164E8B] dark:text-[#38BDF8]">Market Coverage Intelligence</p>
              <h2 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#172033] dark:text-[#F8FAFC]">
                Transparent international market coverage
              </h2>
              <p className="mt-2 text-sm text-[#64748B] dark:text-[#CBD5E1]">
                OppSift displays only jurisdictions and portals with verified ingestion status—never inflated global claims.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/markets')}
              className="text-sm font-semibold text-[#541B32] dark:text-[#E8A4B5] hover:underline whitespace-nowrap"
            >
              Open Full Markets Intelligence →
            </button>
          </div>

          <div className="mt-8 overflow-x-auto rounded-lg border border-[#E2E8F0] dark:border-[#263244]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAFC] dark:bg-[#1C2433] text-xs text-[#64748B] dark:text-[#CBD5E1]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Jurisdiction</th>
                  <th className="py-3 px-4 font-semibold">Region</th>
                  <th className="py-3 px-4 font-semibold">Currency</th>
                  <th className="py-3 px-4 font-semibold">Coverage Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Active Sources</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#263244]">
                {countries.slice(0, 6).map((c) => (
                  <tr
                    key={c.code}
                    onClick={() => navigate(`/discover/country/${c.code}`)}
                    className="hover:bg-[#F8FAFC] dark:hover:bg-[#1C2433]/60 cursor-pointer"
                  >
                    <td className="py-3 px-4 font-medium text-[#172033] dark:text-[#F8FAFC]">{c.name}</td>
                    <td className="py-3 px-4 text-[#64748B] dark:text-[#CBD5E1]">{c.region}</td>
                    <td className="py-3 px-4 font-mono tabular-nums">{c.currency}</td>
                    <td className="py-3 px-4">
                      <span className={c.coverageStatus === 'Active' ? 'text-[#16A34A] font-medium' : 'text-[#D97706] font-medium'}>
                        {c.coverageStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">{c.activeSourcesCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ & Pricing Entry */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5 space-y-4">
            <h2 className="font-display text-2xl font-bold text-[#172033] dark:text-[#F8FAFC]">
              Frequently asked questions
            </h2>
            <p className="text-sm text-[#64748B] dark:text-[#CBD5E1]">
              Clear answers on data provenance, eligibility boundaries, and workspace access.
            </p>
            <div className="p-6 rounded-lg oppsift-sidebar-gradient text-white space-y-3">
              <h3 className="font-display text-lg font-semibold">Plans for individuals &amp; bid teams</h3>
              <p className="text-sm text-white/85">
                Start with the Free tier or evaluate Team plans for shared collections and multi-user workflows.
              </p>
              <button
                type="button"
                onClick={() => navigate('/pricing')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-white text-[#251019] text-sm font-semibold hover:bg-[#FFF1F2]"
              >
                <span>View Pricing Plans</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 divide-y divide-[#E2E8F0] dark:divide-[#263244] border border-[#E2E8F0] dark:border-[#263244] rounded-lg bg-white dark:bg-[#171923]">
            {faqs.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={item.q} className="p-5">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between gap-4 text-left"
                  >
                    <span className="font-display text-sm sm:text-base font-semibold text-[#172033] dark:text-[#F8FAFC]">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 shrink-0 text-[#64748B] transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {isOpen && (
                    <p className="mt-3 text-sm text-[#64748B] dark:text-[#CBD5E1] leading-relaxed">{item.a}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

export function PublicProductPage() {
  const { navigate } = useRouter();
  const pillars = [
    {
      title: 'Opportunity Discovery',
      desc: 'Unified full-text and structured filtering across countries, procurement methods, sectors, deadlines, and disclosed contract values.',
      icon: <Compass className="w-5 h-5 text-[#164E8B] dark:text-[#38BDF8]" />,
    },
    {
      title: 'Profile Matching',
      desc: 'Weighted alignment between your registered capabilities, geographic reach, and newly published tender notices.',
      icon: <Sparkles className="w-5 h-5 text-[#541B32] dark:text-[#E8A4B5]" />,
    },
    {
      title: 'Eligibility Analysis',
      desc: 'Separates confirmed source requirements from missing profile records and potential disqualifiers—with explicit source citations.',
      icon: <ShieldCheck className="w-5 h-5 text-[#164E8B] dark:text-[#38BDF8]" />,
    },
    {
      title: 'Opportunity Intelligence',
      desc: 'Extracts mandatory deliverables, evaluation criteria, and document checklists from tender attachments.',
      icon: <FileSearch className="w-5 h-5 text-[#541B32] dark:text-[#E8A4B5]" />,
    },
    {
      title: 'Continuous Monitoring',
      desc: 'Automated tracking for corrigenda, deadline shifts, and saved-search matches with configurable digest frequency.',
      icon: <Bell className="w-5 h-5 text-[#164E8B] dark:text-[#38BDF8]" />,
    },
    {
      title: 'Preparation & Reporting',
      desc: '7-stage bid pipeline, task ownership, milestone tracking, and structured CSV/JSON intelligence exports.',
      icon: <Layers className="w-5 h-5 text-[#541B32] dark:text-[#E8A4B5]" />,
    },
  ];

  return (
    <PublicLayout>
      <PublicHeroBanner
        playlistIds={['international-business', 'research-innovation']}
        overlayTone="navy"
        kicker="Product Architecture"
        title="Seven integrated capabilities from notice discovery to bid readiness"
        subtitle="Built around structured data provenance and international procurement standards."
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pillars.map((p) => (
            <div key={p.title} className="p-6 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923]">
              <div className="w-10 h-10 rounded-md bg-[#F1F5F9] dark:bg-[#1C2433] flex items-center justify-center mb-4">
                {p.icon}
              </div>
              <h2 className="font-display text-lg font-semibold text-[#172033] dark:text-[#F8FAFC]">{p.title}</h2>
              <p className="mt-2 text-sm text-[#64748B] dark:text-[#CBD5E1] leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>

        <div className="p-6 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-lg font-semibold">Inspect the live workspace screens</h3>
            <p className="text-sm text-[#64748B] dark:text-[#CBD5E1]">
              Explore the Dashboard, Opportunity Explorer, and AI Eligibility panel directly.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-5 py-2.5 rounded-md bg-[#541B32] hover:bg-[#A33B59] text-white text-sm font-semibold whitespace-nowrap"
          >
            Open Workspace
          </button>
        </div>
      </div>
    </PublicLayout>
  );
}

export function PublicOpportunitiesPage() {
  const { navigate } = useRouter();
  const { opportunities } = useAppState();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const categories: ('All' | OpportunityCategory)[] = [
    'All',
    'Government Tender',
    'Public Procurement',
    'RFP',
    'Grant & Funding',
    'Commercial Contract',
  ];

  const items = opportunities.filter(
    (o) => selectedCategory === 'All' || o.category === selectedCategory
  );

  return (
    <PublicLayout>
      <PublicHeroBanner
        playlistIds={['procurement', 'international-trade']}
        overlayTone="burgundy-navy"
        kicker="Opportunity Categories"
        title="Explore supported opportunity categories"
        subtitle="Filter indexed opportunities across government procurement, research grants, and commercial contracts."
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#F1F5F9] dark:bg-[#1C2433] max-w-full overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                selectedCategory === cat
                  ? 'bg-white dark:bg-[#171923] text-[#541B32] dark:text-[#E8A4B5] shadow-xs'
                  : 'text-[#64748B] dark:text-[#CBD5E1] hover:text-[#172033] dark:hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {items.map((opp) => (
            <div
              key={opp.id}
              className="p-5 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-[#64748B] dark:text-[#CBD5E1]">
                  <span>{opp.countryName} · {opp.category}</span>
                  <span className="font-mono tabular-nums">{opp.referenceNumber}</span>
                </div>
                <h2 className="mt-2 font-display text-lg font-semibold text-[#172033] dark:text-[#F8FAFC]">
                  {opp.title}
                </h2>
                <p className="mt-1.5 text-sm text-[#64748B] dark:text-[#CBD5E1] line-clamp-2">{opp.summary}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#E2E8F0] dark:border-[#263244] flex items-center justify-between text-xs">
                <span className="font-mono tabular-nums text-[#172033] dark:text-[#F8FAFC]">
                  {formatCurrencyValue(opp.estimatedValue, opp.currency)}
                </span>
                <button
                  type="button"
                  onClick={() => navigate(`/opportunity/${opp.id}`)}
                  className="font-semibold text-[#541B32] dark:text-[#E8A4B5] hover:underline"
                >
                  Inspect Dossier →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}

export function PublicMarketsPage() {
  const { navigate } = useRouter();
  const { countries } = useAppState();
  const [regionFilter, setRegionFilter] = useState('All');
  const [marketQuery, setMarketQuery] = useState('');
  const [layoutMode, setLayoutMode] = useState<'table' | 'cards'>('table');
  const regions = ['All', 'Europe', 'Asia-Pacific', 'North America', 'East Africa', 'Latin America'];

  const list = countries.filter((c) => {
    const matchesRegion = regionFilter === 'All' || c.region === regionFilter;
    const q = marketQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.currency.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.topSectors.some((s) => s.sector.toLowerCase().includes(q));
    return matchesRegion && matchesQuery;
  });

  const activeCount = countries.filter((c) => c.coverageStatus === 'Active').length;
  const partialOrPlannedCount = countries.filter((c) => c.coverageStatus !== 'Active').length;
  const totalSources = countries.reduce((acc, c) => acc + c.activeSourcesCount, 0);
  const distinctCurrencies = new Set(countries.map((c) => c.currency)).size;

  const sectorAggregation = new Map<string, number>();
  list.forEach((c) => {
    c.topSectors.forEach((s) => {
      sectorAggregation.set(s.sector, (sectorAggregation.get(s.sector) || 0) + s.count);
    });
  });
  const topSectorBars = Array.from(sectorAggregation.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([sector, count], idx) => ({
      label: sector,
      value: count,
      accent: (idx % 2 === 0 ? 'burgundy' : 'blue') as 'burgundy' | 'blue',
    }));

  return (
    <PublicLayout>
      <PublicHeroBanner
        playlistIds={['global-markets', 'global-cities']}
        overlayTone="burgundy-navy"
        kicker="Global Market Intelligence"
        title="Supported International Markets & Coverage"
        subtitle="Institutional-grade market registry reporting real coverage state, supported currencies, active procurement portals, and sector concentration."
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Institutional Summary Strip */}
        <div className="oppsift-intel-rule pt-5 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923]">
            <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">Active Jurisdictions</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-[#172033] dark:text-white">{activeCount}</p>
            <p className="text-[11px] text-[#16A34A] mt-0.5 font-medium">Full ingestion verified</p>
          </div>
          <div className="p-4 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923]">
            <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">Partial / Planned Expansion</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-[#172033] dark:text-white">{partialOrPlannedCount}</p>
            <p className="text-[11px] text-[#D97706] mt-0.5 font-medium">Transparent coverage queue</p>
          </div>
          <div className="p-4 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923]">
            <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">Configured Procurement Portals</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-[#172033] dark:text-white">{totalSources}</p>
            <p className="text-[11px] text-[#64748B] dark:text-[#CBD5E1] mt-0.5">Official API &amp; OCDS feeds</p>
          </div>
          <div className="p-4 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923]">
            <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">Normalised Currencies</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-[#172033] dark:text-white">{distinctCurrencies}</p>
            <p className="text-[11px] text-[#64748B] dark:text-[#CBD5E1] mt-0.5">ISO 4217 native schema</p>
          </div>
        </div>

        {/* Filter Bar + View Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#F1F5F9] dark:bg-[#1C2433] max-w-full overflow-x-auto">
            {regions.map((reg) => (
              <button
                key={reg}
                type="button"
                onClick={() => setRegionFilter(reg)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  regionFilter === reg
                    ? 'bg-white dark:bg-[#171923] text-[#541B32] dark:text-[#E8A4B5] shadow-xs'
                    : 'text-[#64748B] dark:text-[#CBD5E1]'
                }`}
              >
                {reg}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={marketQuery}
              onChange={(e) => setMarketQuery(e.target.value)}
              placeholder="Filter jurisdiction, ISO currency, or sector..."
              className="h-9 px-3 rounded-md border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923] text-xs w-64"
            />
            <div className="flex items-center gap-1 p-0.5 rounded-md border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923]">
              <button
                type="button"
                onClick={() => setLayoutMode('table')}
                className={`px-2.5 py-1 rounded text-xs font-medium ${
                  layoutMode === 'table' ? 'bg-[#541B32] text-white' : 'text-[#64748B] dark:text-[#CBD5E1]'
                }`}
              >
                Matrix
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('cards')}
                className={`px-2.5 py-1 rounded text-xs font-medium ${
                  layoutMode === 'cards' ? 'bg-[#541B32] text-white' : 'text-[#64748B] dark:text-[#CBD5E1]'
                }`}
              >
                Cards
              </button>
            </div>
          </div>
        </div>

        {/* Institutional Matrix or Market Cards */}
        {layoutMode === 'table' ? (
          <div className="overflow-x-auto rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923]">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#F8FAFC] dark:bg-[#1C2433] text-xs text-[#64748B] dark:text-[#CBD5E1]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Jurisdiction</th>
                  <th className="py-3 px-4 font-semibold">Region</th>
                  <th className="py-3 px-4 font-semibold">Currency / TZ</th>
                  <th className="py-3 px-4 font-semibold">Coverage State</th>
                  <th className="py-3 px-4 font-semibold">Supported Categories</th>
                  <th className="py-3 px-4 font-semibold text-right">Sources</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#263244]">
                {list.map((c) => (
                  <tr key={c.code} className="hover:bg-[#F8FAFC] dark:hover:bg-[#1C2433]/50">
                    <td className="py-3.5 px-4 font-semibold text-[#172033] dark:text-white">
                      {c.name} <span className="font-mono text-[11px] text-[#64748B]">({c.code})</span>
                    </td>
                    <td className="py-3.5 px-4 text-[#64748B] dark:text-[#CBD5E1]">{c.region}</td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-xs">
                      {c.currency} · {c.timezone}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-semibold text-xs ${
                          c.coverageStatus === 'Active'
                            ? 'text-[#16A34A]'
                            : c.coverageStatus === 'Partial'
                            ? 'text-[#D97706]'
                            : 'text-[#64748B]'
                        }`}
                      >
                        {c.coverageStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#64748B] dark:text-[#CBD5E1]">
                      {c.categoriesSupported.join(', ')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums">{c.activeSourcesCount}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => navigate(`/discover/country/${c.code}`)}
                        className="font-semibold text-xs text-[#541B32] dark:text-[#E8A4B5] hover:underline whitespace-nowrap"
                      >
                        Country Report →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {list.map((c) => (
              <div
                key={c.code}
                className="p-5 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923] space-y-3"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#64748B] dark:text-[#CBD5E1]">{c.region} · {c.currency}</span>
                  <span
                    className={`font-semibold ${
                      c.coverageStatus === 'Active'
                        ? 'text-[#16A34A]'
                        : c.coverageStatus === 'Partial'
                        ? 'text-[#D97706]'
                        : 'text-[#64748B]'
                    }`}
                  >
                    {c.coverageStatus}
                  </span>
                </div>
                <h2 className="font-display text-lg font-semibold">{c.name}</h2>
                <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">
                  Categories: {c.categoriesSupported.join(', ')}
                </p>
                <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#263244] flex items-center justify-between text-xs">
                  <span className="font-mono tabular-nums text-[#64748B] dark:text-[#CBD5E1]">
                    {c.activeSourcesCount} sources · {c.timezone}
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate(`/discover/country/${c.code}`)}
                    className="font-semibold text-[#541B32] dark:text-[#E8A4B5] hover:underline"
                  >
                    Open Country →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* IndexBox-Style Sector Concentration Breakdown */}
        {topSectorBars.length > 0 && (
          <div className="p-6 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-bold">
                  Sector Volume Breakdown ({regionFilter === 'All' ? 'All Selected Markets' : regionFilter})
                </h2>
                <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">
                  Indexed solicitation distribution across primary procurement verticals.
                </p>
              </div>
              <span className="font-mono text-xs text-[#64748B] dark:text-[#94A3B8]">
                {list.length} jurisdiction(s)
              </span>
            </div>
            <HorizontalBarChart items={topSectorBars} />
          </div>
        )}
      </div>
    </PublicLayout>
  );
}

export function PublicSourcesPage() {
  const { sources } = useAppState();
  const [availabilityFilter, setAvailabilityFilter] = useState<'All' | 'Connected' | 'Scheduled' | 'Unavailable'>('All');
  const filtered = sources.filter(
    (s) => availabilityFilter === 'All' || s.availability === availabilityFilter
  );

  return (
    <PublicLayout>
      <PublicHeroBanner
        playlistIds={['connectivity-emerging', 'infrastructure']}
        overlayTone="navy"
        kicker="Source Transparency"
        title="Official Data Source Ecosystem"
        subtitle="OppSift maintains explicit attribution and availability status for every procurement portal and funding feed. Disconnected or degraded sources are clearly reported."
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#F1F5F9] dark:bg-[#1C2433] max-w-full overflow-x-auto">
          {(['All', 'Connected', 'Scheduled', 'Unavailable'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setAvailabilityFilter(status)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                availabilityFilter === status
                  ? 'bg-white dark:bg-[#171923] text-[#541B32] dark:text-[#E8A4B5] shadow-xs'
                  : 'text-[#64748B] dark:text-[#CBD5E1]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F8FAFC] dark:bg-[#1C2433] text-xs text-[#64748B] dark:text-[#CBD5E1]">
              <tr>
                <th className="py-3 px-4 font-semibold">Source Name</th>
                <th className="py-3 px-4 font-semibold">Country</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold">Access Method</th>
                <th className="py-3 px-4 font-semibold">Availability</th>
                <th className="py-3 px-4 font-semibold">Attribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#263244]">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-[#F8FAFC] dark:hover:bg-[#1C2433]/40">
                  <td className="py-3.5 px-4 font-medium">{s.name}</td>
                  <td className="py-3.5 px-4 text-[#64748B] dark:text-[#CBD5E1]">{s.countryName}</td>
                  <td className="py-3.5 px-4">{s.category}</td>
                  <td className="py-3.5 px-4 font-mono text-xs">{s.accessMethod}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`text-xs font-semibold ${
                        s.availability === 'Connected'
                          ? 'text-[#16A34A]'
                          : s.availability === 'Scheduled'
                          ? 'text-[#2563EB] dark:text-[#38BDF8]'
                          : 'text-[#DC2626]'
                      }`}
                    >
                      {s.availability}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-[#64748B] dark:text-[#CBD5E1]">{s.attribution}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PublicLayout>
  );
}

export function PublicSolutionsPage() {
  const { navigate } = useRouter();
  const audiences = [
    {
      role: 'Businesses & Mid-Market Enterprises',
      focus: 'Identify international public frameworks and commercial RFPs aligned with existing ISO and security credentials.',
    },
    {
      role: 'Independent Consultants',
      focus: 'Track advisory contracts, policy research tenders, and donor-funded technical assistance mandates.',
    },
    {
      role: 'Non-Profit & Development Organisations',
      focus: 'Monitor multi-country grants, consortium eligibility clauses, and programme amendment notices.',
    },
    {
      role: 'Specialist Suppliers & Contractors',
      focus: 'Receive deadline escalations and technical specification checklists across regional procurement portals.',
    },
    {
      role: 'Academic & Research Institutions',
      focus: 'Evaluate Horizon, federal, and cross-border research funding calls with clear partner requirements.',
    },
    {
      role: 'Bid & Capture Teams',
      focus: 'Coordinate shared opportunity collections, task ownership, and go/no-go gates in one pipeline.',
    },
  ];

  return (
    <PublicLayout>
      <PublicHeroBanner
        playlistIds={['infrastructure', 'energy-sustainability', 'agriculture-development']}
        overlayTone="burgundy"
        kicker="Solutions"
        title="Built for every organisation pursuing structured opportunities"
        subtitle="Role-calibrated discovery, consortium eligibility verification, and cross-border bid preparation across public and development sectors."
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {audiences.map((a) => (
            <div key={a.role} className="p-6 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923] flex flex-col justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold">{a.role}</h2>
                <p className="mt-2 text-sm text-[#64748B] dark:text-[#CBD5E1] leading-relaxed">{a.focus}</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/onboarding')}
                className="mt-5 text-xs font-semibold text-[#541B32] dark:text-[#E8A4B5] hover:underline text-left"
              >
                Configure profile for this role →
              </button>
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}

export function PublicHowItWorksPage() {
  const { navigate } = useRouter();
  const steps = [
    { num: '01', title: 'Define Organisation & Capabilities', detail: 'Select your operating countries, sectors, certifications, and contract value thresholds in the 10-step onboarding wizard.' },
    { num: '02', title: 'Continuous Multi-Source Indexing', detail: 'OppSift normalises notices from connected procurement APIs, OCDS streams, and grant portals into one international schema.' },
    { num: '03', title: 'Automated Matching & Eligibility Screening', detail: 'New notices are scored against your profile while AI intelligence flags potential disqualifiers and missing credentials.' },
    { num: '04', title: 'Alerting & Corrigendum Tracking', detail: 'Saved searches and active opportunities emit alerts whenever specifications change or deadlines approach.' },
    { num: '05', title: 'Structured Bid Preparation', detail: 'Assign checklist tasks, capture notes, and track milestones from Interested to Submitted before lodging on the official portal.' },
  ];

  return (
    <PublicLayout>
      <PublicHeroBanner
        playlistIds={['international-business', 'procurement']}
        overlayTone="burgundy-navy"
        kicker="Workflow"
        title="How OppSift Works"
        subtitle="Five structured operational stages turning cross-border tender notices into audit-ready bid decisions."
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="space-y-4">
          {steps.map((s) => (
            <div key={s.num} className="p-6 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923] flex flex-col sm:flex-row gap-5">
              <span className="font-mono text-lg font-bold text-[#541B32] dark:text-[#E8A4B5] shrink-0">{s.num}</span>
              <div>
                <h2 className="font-display text-lg font-semibold">{s.title}</h2>
                <p className="mt-1.5 text-sm text-[#64748B] dark:text-[#CBD5E1] leading-relaxed">{s.detail}</p>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => navigate('/onboarding')}
          className="px-5 py-2.5 rounded-md bg-[#541B32] hover:bg-[#A33B59] text-white text-sm font-semibold"
        >
          Launch Onboarding Wizard
        </button>
      </div>
    </PublicLayout>
  );
}

export function PublicAboutPage() {
  return (
    <PublicLayout>
      <PublicHeroBanner
        playlistIds={['global-cities', 'energy-sustainability']}
        overlayTone="burgundy-navy"
        kicker="About OppSift"
        title="Clarity and integrity for global opportunity intelligence"
        subtitle="Eliminating fragmented tender tracking across borders with verifiable source provenance and disciplined pipeline architecture."
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        <p className="text-base text-[#64748B] dark:text-[#CBD5E1] leading-relaxed max-w-3xl">
          OppSift was designed to eliminate fragmented tender tracking across borders. Organisations pursuing international public procurement, research grants, and enterprise RFPs deserve accurate source attribution, transparent eligibility analysis, and disciplined pipeline tooling.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: 'Global-First Architecture', body: 'Currencies, languages, time zones, and regulatory frameworks are handled natively—never hardcoded to a single market.' },
            { title: 'Honest Source Provenance', body: 'Every notice links back to its contracting authority and displays real ingestion timestamps and availability status.' },
            { title: 'Human-Verified Decisions', body: 'AI interpretation assists rapid triage, while always keeping final eligibility and submission decisions with your team.' },
          ].map((p) => (
            <div key={p.title} className="p-6 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923]">
              <Database className="w-5 h-5 text-[#164E8B] dark:text-[#38BDF8] mb-3" />
              <h2 className="font-display text-base font-semibold">{p.title}</h2>
              <p className="mt-2 text-sm text-[#64748B] dark:text-[#CBD5E1]">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}

export function PublicContactPage({ initialSubmitted = false }: { initialSubmitted?: boolean }) {
  const [name, setName] = useState(initialSubmitted ? 'Workspace Visitor' : '');
  const [email, setEmail] = useState('');
  const [org, setOrg] = useState('');
  const [topic, setTopic] = useState('Enterprise & Team Access');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(initialSubmitted);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.includes('@') || message.trim().length < 10) {
      setError('Please provide your name, a valid email address, and a brief inquiry (at least 10 characters).');
      return;
    }
    setError('');
    setSubmitted(true);
  };

  return (
    <PublicLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-4">
          <p className="text-xs font-semibold text-[#541B32] dark:text-[#E8A4B5]">Contact</p>
          <h1 className="font-display text-3xl font-bold">Speak with the OppSift team</h1>
          <p className="text-sm text-[#64748B] dark:text-[#CBD5E1] leading-relaxed">
            Questions about regional source coverage, team onboarding, or custom data feeds? Send us a structured inquiry.
          </p>
          <div className="p-5 rounded-xl border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923] space-y-2 text-sm">
            <p><span className="font-semibold">Support Email:</span> support@oppsift.com</p>
            <p><span className="font-semibold">Source Partnerships:</span> sources@oppsift.com</p>
            <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">Standard response window: within 1 business day (UTC).</p>
          </div>
        </div>

        <div className="lg:col-span-7">
          {submitted ? (
            <div className="p-8 rounded-xl border border-[#16A34A]/30 bg-white dark:bg-[#171923] space-y-3">
              <p className="text-sm font-semibold text-[#16A34A]">Inquiry validated and queued</p>
              <h2 className="font-display text-xl font-bold">Thank you, {name}</h2>
              <p className="text-sm text-[#64748B] dark:text-[#CBD5E1]">
                Your inquiry regarding <span className="font-medium text-[#172033] dark:text-[#F8FAFC]">{topic}</span> is ready for dispatch via the backend mail endpoint.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setMessage('');
                }}
                className="px-4 py-2 rounded-lg border border-[#E2E8F0] dark:border-[#263244] text-xs font-semibold"
              >
                Send another inquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 rounded-xl border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923] space-y-4">
              {error && <p className="text-xs font-medium text-[#DC2626]">{error}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Elena Vance"
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Work Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@organisation.org"
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433] text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Organisation</label>
                  <input
                    type="text"
                    value={org}
                    onChange={(e) => setOrg(e.target.value)}
                    placeholder="Organisation name"
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Topic</label>
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433] text-sm"
                  >
                    <option>Enterprise &amp; Team Access</option>
                    <option>Country &amp; Source Requests</option>
                    <option>Technical Support</option>
                    <option>Billing Inquiry</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Message</label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us about your target markets and team requirements..."
                  className="w-full p-3 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433] text-sm"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-[#541B32] hover:bg-[#A33B59] text-white text-sm font-semibold"
              >
                Submit Inquiry
              </button>
            </form>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}

export function PublicPricingPage() {
  const { navigate } = useRouter();
  const {
    planCatalog,
    subscription,
    onboarding,
    isSignedIn,
    checkoutOpen,
    checkoutPlanId,
    checkoutFrequency,
    checkoutState,
    setCheckoutState,
    openCheckout,
    closeCheckout,
    pushToast,
  } = useAppState();
  const [frequency, setFrequency] = useState<BillingFrequency>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const visiblePlans = planCatalog.filter((p) => p.available);
  const selectedCheckoutPlan =
    planCatalog.find((p) => p.id === checkoutPlanId) ?? planCatalog[2] ?? planCatalog[0];

  const handleSelectPlan = (plan: PlanTierConfig) => {
    if (plan.customPricing) {
      navigate('/contact');
      return;
    }
    if (plan.id === 'free') {
      navigate(isSignedIn ? '/dashboard' : '/auth');
      return;
    }
    if (!isSignedIn) {
      pushToast('info', `Sign in via Neon Managed Auth to subscribe to ${plan.name}.`);
      navigate('/auth');
      return;
    }
    openCheckout(plan.id, frequency);
  };

  const pricingFaqs = [
    {
      q: 'How are taxes, VAT, and GST handled for international organisations?',
      a: `All paid OppSift plans process through ${BILLING_PROVIDER_CONFIG.providerName}, acting as our Merchant of Record. Applicable regional VAT, GST, or sales tax is automatically calculated at checkout and reflected on official tax invoices.`,
    },
    {
      q: 'Can I switch between monthly and annual billing or change tiers later?',
      a: 'Yes. Workspace billing administrators can initiate upgrades, downgrades, or billing cadence adjustments directly from Workspace Settings -> Billing.',
    },
    {
      q: 'What happens if our team reaches monthly search or AI analysis limits?',
      a: 'OppSift never truncates or mutates your existing saved opportunities or pipeline work. Usage alerts notify administrators at 80% capacity so you can upgrade only when needed.',
    },
    {
      q: 'How are Team and multi-seat plans structured?',
      a: 'Team plans offer custom seat allocations, multi-workspace isolation, dedicated ingestion priority, and consolidated annual or monthly invoicing.',
    },
  ];

  return (
    <PublicLayout>
      <PublicHeroBanner
        playlistIds={['procurement', 'international-business']}
        overlayTone="burgundy-navy"
        kicker="Commercial Plans"
        title="Transparent plans aligned to your global opportunity volume"
        subtitle={`Start free, scale research capacity as you qualify cross-border bids, and pay securely via ${BILLING_PROVIDER_CONFIG.providerName} (${BILLING_PROVIDER_CONFIG.relationship}).`}
        rightSlot={
          <div className="flex items-center gap-1 p-1 rounded-lg bg-black/35 border border-white/15">
            {(['monthly', 'annual'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setFrequency(c)}
                className={`px-4 py-2 rounded-md text-xs font-semibold capitalize transition-colors whitespace-nowrap shrink-0 ${
                  frequency === c
                    ? 'bg-white text-[#251019] shadow-xs'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                {c === 'monthly' ? 'Monthly Billing' : 'Annual Billing'}
              </button>
            ))}
          </div>
        }
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* 5-Tier Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-4">
          {visiblePlans.map((plan) => (
            <PlanTierCard
              key={plan.id}
              plan={plan}
              frequency={frequency}
              isCurrent={isSignedIn && subscription.planId === plan.id}
              onSelect={handleSelectPlan}
            />
          ))}
        </div>

        {/* Feature & Entitlement Comparison Matrix */}
        <section className="space-y-4">
          <div>
            <h2 className="font-display text-2xl font-bold">Detailed Plan &amp; Entitlement Comparison</h2>
            <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] mt-1">
              Clear monthly allowances for search queries, AI eligibility matrices, document extraction, active alerts, and team seats.
            </p>
          </div>
          <PlanComparisonMatrix catalog={visiblePlans} />
        </section>

        {/* Merchant of Record & Team Sales Banner */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 p-6 rounded-lg oppsift-card space-y-3">
            <p className="text-xs font-semibold text-[#164E8B] dark:text-[#38BDF8]">
              Billing Transparency · {BILLING_PROVIDER_CONFIG.providerName}
            </p>
            <h3 className="font-display text-lg font-bold">Global Tax Compliance &amp; Authoritative Invoices</h3>
            <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] leading-relaxed">
              {BILLING_PROVIDER_CONFIG.taxNote} OppSift never stores raw payment card numbers. All renewals, receipts, cancellations, and refunds are synchronised directly from verified {BILLING_PROVIDER_CONFIG.providerName} webhook events.
            </p>
            <p className="text-[11px] font-mono text-[#64748B] dark:text-[#94A3B8]">
              Supported Billing Currencies: {BILLING_PROVIDER_CONFIG.supportedCurrencies.join(' · ')}
            </p>
          </div>

          <div className="lg:col-span-5 p-6 rounded-lg oppsift-sidebar-gradient text-white flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#E8A4B5]">Enterprise &amp; Multi-Team Organisations</p>
              <h3 className="font-display text-xl font-bold">Need Custom Seat Allocations or Regional Feeds?</h3>
              <p className="text-xs text-white/80 leading-relaxed">
                Speak with OppSift commercial operations for tailored multi-country seats, custom procurement feeds, and workspace onboarding support.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/contact')}
              className="w-fit inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-white text-[#251019] text-xs font-semibold hover:bg-[#FFF1F2]"
            >
              <span>Contact Sales for Team Plan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>

        {/* Pricing FAQs */}
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-bold">Billing &amp; Subscription Questions</h2>
          <div className="space-y-2">
            {pricingFaqs.map((item, idx) => (
              <div key={item.q} className="rounded-lg oppsift-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left text-sm font-semibold"
                >
                  <span>{item.q}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${openFaq === idx ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-4 text-xs text-[#64748B] dark:text-[#CBD5E1] leading-relaxed">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      <CheckoutModal
        open={checkoutOpen}
        plan={selectedCheckoutPlan}
        frequency={checkoutFrequency}
        billingEmail={subscription.billingEmail}
        organisationName={onboarding.organisationName}
        stateMode={checkoutState}
        onChangeState={setCheckoutState}
        onClose={closeCheckout}
      />
    </PublicLayout>
  );
}

export function PublicGettingStartedPage() {
  const { navigate } = useRouter();
  const steps = [
    {
      num: '01',
      title: 'Verify Your Account & Organisation Profile',
      body: 'Sign in with Neon Managed Auth and record your legal jurisdiction, active countries, preferred currencies, and verified certifications.',
    },
    {
      num: '02',
      title: 'Configure Sector & Value Thresholds',
      body: 'Define the contract value range, minimum bid lead days, and tender categories (Government Tenders, Grants, RFPs, Commercial) aligned to your capacity.',
    },
    {
      num: '03',
      title: 'Create Saved Searches & Corrigendum Alerts',
      body: 'Turn multi-country filter combinations into persistent monitors with Immediate, Daily, or Weekly amendment notifications.',
    },
    {
      num: '04',
      title: 'Inspect Eligibility & Launch Bid Preparation',
      body: 'Review clause-level eligibility matrices in the AI Intelligence workspace before moving qualified opportunities into your 7-stage pipeline.',
    },
  ];

  return (
    <PublicLayout>
      <PublicHeroBanner
        playlistIds={['international-business', 'research-innovation']}
        overlayTone="navy"
        kicker="Getting Started"
        title="Launch your OppSift intelligence workspace in four steps"
        subtitle="From initial profile calibration to clause-level AI eligibility screening and shared team preparation."
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {steps.map((s) => (
            <div key={s.num} className="p-6 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923] space-y-2">
              <span className="font-mono text-sm font-bold text-[#541B32] dark:text-[#E8A4B5]">{s.num}</span>
              <h2 className="font-display text-lg font-semibold">{s.title}</h2>
              <p className="text-sm text-[#64748B] dark:text-[#CBD5E1] leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate('/onboarding')}
            className="px-5 py-2.5 rounded-md bg-[#541B32] hover:bg-[#A33B59] text-white text-sm font-semibold"
          >
            Start 10-Step Onboarding Wizard
          </button>
          <button
            type="button"
            onClick={() => navigate('/auth')}
            className="px-5 py-2.5 rounded-md border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923] text-sm font-semibold"
          >
            Go to Neon Auth Sign In
          </button>
        </div>
      </div>
    </PublicLayout>
  );
}

export function PublicDocsPage() {
  const [query, setQuery] = useState('');
  const topics = [
    {
      category: 'Discovery',
      title: 'Search Operators & Jurisdiction Filtering',
      summary: 'Combine boolean keywords, ISO country codes (GB, DE, SG, US, EU), minimum lead days, and native contract currencies.',
      snippet: 'sector:"Health Systems" AND country:(GB OR EU) AND min_lead_days>=14',
    },
    {
      category: 'AI Intelligence',
      title: 'Eligibility Assessment & Provenance Rules',
      summary: 'Every criterion separates verified official notice clauses from missing profile fields. Unknown requirements never display as confirmed.',
      snippet: 'status ∈ {"Satisfied", "Unsatisfied", "Unknown", "Potential Disqualifier"}',
    },
    {
      category: 'Data Sources',
      title: 'OCDS & Official Procurement Portal Schema',
      summary: 'Normalised notice fields preserve referenceNumber, sourceUrl, deadlineTimezone, and verifiable amendment history.',
      snippet: 'release.tender.submissionMethod · tenderPeriod.endDate · awards[].currency',
    },
    {
      category: 'Pipeline & Exports',
      title: '7-Stage Preparation & Reporting Formats',
      summary: 'Move items across Interested, Evaluating, Preparing, Submitted, Won, Lost, and Archived with CSV, JSON, and printable briefs.',
      snippet: 'GET /api/reports/export?format=csv|json (pending Neon PostgreSQL API activation)',
    },
  ].filter(
    (t) =>
      !query.trim() ||
      t.title.toLowerCase().includes(query.toLowerCase()) ||
      t.summary.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <PublicLayout>
      <PublicHeroBanner
        playlistIds={['research-innovation', 'connectivity-emerging']}
        overlayTone="navy"
        kicker="Documentation"
        title="Platform Documentation & Reference"
        subtitle="Search operational guides for OppSift discovery syntax, eligibility rules, and OCDS source normalisation."
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter documentation topics..."
          className="w-full max-w-md h-10 px-3.5 rounded-md border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923] text-sm"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {topics.map((t) => (
            <div key={t.title} className="p-6 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923] space-y-3">
              <p className="text-xs font-semibold text-[#164E8B] dark:text-[#38BDF8]">{t.category}</p>
              <h2 className="font-display text-lg font-semibold">{t.title}</h2>
              <p className="text-sm text-[#64748B] dark:text-[#CBD5E1] leading-relaxed">{t.summary}</p>
              <pre className="p-3 rounded-md bg-[#F8FAFC] dark:bg-[#101114] border border-[#E2E8F0] dark:border-[#263244] font-mono text-[11px] overflow-x-auto">
                {t.snippet}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}

export function PublicSecurityPage() {
  const pillars = [
    {
      title: 'Neon Managed Authentication & Session Isolation',
      body: 'Authentication, password recovery, email verification, and team invitation acceptance are designed for Neon Managed Auth with scoped workspace tokens.',
    },
    {
      title: 'AI Provenance & Source Separation',
      body: 'OppSift never mutates official solicitation text. AI eligibility interpretations and risk summaries remain visibly separated from verified contracting authority clauses.',
    },
    {
      title: 'Transport & Storage Boundaries',
      body: 'All API communications require TLS 1.3 encryption in transit, while organisation documents and pipeline attachments target encrypted object storage with role-based access.',
    },
  ];

  return (
    <PublicLayout>
      <PublicHeroBanner
        playlistIds={['connectivity-emerging', 'procurement']}
        overlayTone="navy"
        kicker="Security & Trust"
        title="Enterprise Security & Data Provenance"
        subtitle="Built to protect sensitive bid preparation notes, organisation credentials, and audit records."
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pillars.map((p) => (
            <div key={p.title} className="p-6 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923] space-y-2">
              <ShieldCheck className="w-5 h-5 text-[#164E8B] dark:text-[#38BDF8]" />
              <h2 className="font-display text-base font-semibold pt-1">{p.title}</h2>
              <p className="text-sm text-[#64748B] dark:text-[#CBD5E1] leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}

function LegalNavTabs({ active }: { active: 'privacy' | 'terms' | 'cookies' | 'dpa' }) {
  const { navigate } = useRouter();
  const tabs = [
    { id: 'privacy' as const, label: 'Privacy Policy', route: '/legal/privacy' },
    { id: 'terms' as const, label: 'Terms of Service', route: '/legal/terms' },
    { id: 'cookies' as const, label: 'Cookie Preferences', route: '/legal/cookies' },
    { id: 'dpa' as const, label: 'Data Processing (DPA)', route: '/legal/dpa' },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => navigate(t.route)}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
            active === t.id
              ? 'border-[#A33B59] bg-[#FFF1F2] dark:bg-[#541B32]/50 text-[#541B32] dark:text-[#E8A4B5]'
              : 'border-[#E2E8F0] dark:border-white/15 text-[#64748B] dark:text-[#CBD5E1]'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function PublicPrivacyPage() {
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-6">
        <LegalNavTabs active="privacy" />
        <div>
          <p className="text-xs font-semibold text-[#541B32] dark:text-[#E8A4B5]">Legal &amp; Privacy</p>
          <h1 className="mt-2 font-display text-3xl font-bold">Privacy Policy</h1>
          <p className="mt-1 text-xs text-[#64748B] dark:text-[#CBD5E1]">Effective Version 2026.2 · Last updated November 19, 2026</p>
        </div>
        <div className="p-6 rounded-lg oppsift-card space-y-4 text-sm text-[#64748B] dark:text-[#CBD5E1] leading-relaxed">
          <p>
            <strong className="text-[#172033] dark:text-[#F8FAFC]">1. Workspace Data Processed:</strong> OppSift stores organisation capability profiles, saved searches, pipeline notes, and alert preferences strictly to deliver opportunity matching and monitoring workflows.
          </p>
          <p>
            <strong className="text-[#172033] dark:text-[#F8FAFC]">2. Cross-Border &amp; GDPR Rights:</strong> Organisations may export workspace account data in structured JSON or initiate account deletion from Security Settings at any time.
          </p>
          <p>
            <strong className="text-[#172033] dark:text-[#F8FAFC]">3. Merchant of Record Billing Records:</strong> Subscription payments and statutory tax receipts are processed by Lemon Squeezy. OppSift retains subscription references and invoice metadata without storing payment card numbers.
          </p>
        </div>
        <div className="p-5 rounded-lg oppsift-card space-y-2 text-xs">
          <h2 className="font-display text-sm font-bold">Legal Document Version History</h2>
          <div className="flex justify-between text-[#64748B] dark:text-[#CBD5E1] py-1.5 border-b border-[#E2E8F0] dark:border-white/10">
            <span className="font-mono">v2026.2 · Nov 19, 2026</span>
            <span>Added Lemon Squeezy Merchant of Record processing disclosures</span>
          </div>
          <div className="flex justify-between text-[#64748B] dark:text-[#CBD5E1] py-1.5">
            <span className="font-mono">v2026.1 · Sep 01, 2026</span>
            <span>Initial OppSift platform privacy schedule</span>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

export function PublicTermsPage() {
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-6">
        <LegalNavTabs active="terms" />
        <div>
          <p className="text-xs font-semibold text-[#541B32] dark:text-[#E8A4B5]">Legal &amp; Commercial Terms</p>
          <h1 className="mt-2 font-display text-3xl font-bold">Terms of Service</h1>
          <p className="mt-1 text-xs text-[#64748B] dark:text-[#CBD5E1]">Version 2026.2 · Platform Usage, Billing &amp; Official Notice Disclaimer</p>
        </div>
        <div className="p-6 rounded-lg oppsift-card space-y-4 text-sm text-[#64748B] dark:text-[#CBD5E1] leading-relaxed">
          <p>
            <strong className="text-[#172033] dark:text-[#F8FAFC]">1. Official Source Authority:</strong> While OppSift tracks official tenders, grants, and RFPs, the issuing contracting authority portal remains the sole authoritative record for specifications, corrigenda, and final submission deadlines.
          </p>
          <p>
            <strong className="text-[#172033] dark:text-[#F8FAFC]">2. AI Decision Support Boundary:</strong> Automated eligibility scores and extracted requirements assist capture qualification and do not constitute legal or procurement compliance advice.
          </p>
          <p>
            <strong className="text-[#172033] dark:text-[#F8FAFC]">3. Subscriptions &amp; Renewals:</strong> Paid subscriptions renew automatically until cancelled through Billing Settings or the Lemon Squeezy Customer Portal. Access remains active until the close of the current billing period.
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}

export function PublicCookiesPage() {
  const [prefs, setPrefs] = useState(true);
  const [analytics, setAnalytics] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-6">
        <LegalNavTabs active="cookies" />
        <div>
          <p className="text-xs font-semibold text-[#541B32] dark:text-[#E8A4B5]">Legal &amp; Consent</p>
          <h1 className="mt-2 font-display text-3xl font-bold">Cookie &amp; Consent Preferences</h1>
          <p className="mt-2 text-sm text-[#64748B] dark:text-[#CBD5E1]">
            Control how OppSift stores theme preferences, session tokens, and optional product diagnostics.
          </p>
        </div>

        <div className="p-6 rounded-lg oppsift-card space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-[#E2E8F0] dark:border-[#263244]">
            <div>
              <p className="text-sm font-semibold">Strictly Necessary Session &amp; Auth Cookies</p>
              <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">Required for authentication and workspace security. Always active.</p>
            </div>
            <span className="text-xs font-semibold text-[#16A34A]">Always On</span>
          </div>

          <label className="flex items-center justify-between py-2 border-b border-[#E2E8F0] dark:border-[#263244] cursor-pointer">
            <div>
              <p className="text-sm font-semibold">Interface Preferences (Theme &amp; View Mode)</p>
              <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">Remembers dark/light theme and Explorer table density.</p>
            </div>
            <input type="checkbox" checked={prefs} onChange={(e) => setPrefs(e.target.checked)} />
          </label>

          <label className="flex items-center justify-between py-2 cursor-pointer">
            <div>
              <p className="text-sm font-semibold">Aggregated Product Usage Analytics</p>
              <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">Optional anonymous telemetry to improve search relevance.</p>
            </div>
            <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} />
          </label>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSavedNotice(true)}
              className="px-4 py-2 rounded-lg bg-[#541B32] hover:bg-[#A33B59] text-white text-xs font-semibold"
            >
              Save Consent Preferences
            </button>
            {savedNotice && <span className="text-xs font-medium text-[#16A34A]">Consent preferences updated.</span>}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

export function PublicDataProcessingPage() {
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-6">
        <LegalNavTabs active="dpa" />
        <div>
          <p className="text-xs font-semibold text-[#541B32] dark:text-[#E8A4B5]">Enterprise Governance</p>
          <h1 className="mt-2 font-display text-3xl font-bold">Data Processing Information (DPA)</h1>
          <p className="mt-1 text-xs text-[#64748B] dark:text-[#CBD5E1]">
            Infrastructure processors, tenant isolation boundaries, and international transfer governance.
          </p>
        </div>

        <div className="p-6 rounded-lg oppsift-card space-y-4 text-sm text-[#64748B] dark:text-[#CBD5E1] leading-relaxed">
          <p>
            <strong className="text-[#172033] dark:text-[#F8FAFC]">Sub-Processor Transparency:</strong> OppSift utilises Neon PostgreSQL (database storage), Neon Managed Auth (identity &amp; session management), Cloudflare Pages (web delivery), and Lemon Squeezy (Merchant of Record billing).
          </p>
          <p>
            <strong className="text-[#172033] dark:text-[#F8FAFC]">Tenant Segregation:</strong> Organisation profiles, bid pipeline tasks, notes, and saved reports are logically partitioned per workspace tenant and governed by Role-Based Access Control (Owner, Admin, Analyst, Viewer).
          </p>
          <p>
            <strong className="text-[#172033] dark:text-[#F8FAFC]">Retention &amp; Erasure:</strong> Account holders may export workspace records in structured JSON at any time and request permanent erasure through Account Security Settings.
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
