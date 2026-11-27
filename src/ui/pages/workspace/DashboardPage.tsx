import React, { useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Bookmark,
  Calendar,
  CheckCircle2,
  Crown,
  Download,
  FileText,
  Globe,
  Search,
  Sparkles,
  TrendingDown,
  X,
  Zap,
} from 'lucide-react';
import { OppSiftLogo } from '../../components/brand/OppSiftLogo';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout';
import { DiscoveryTrendChart, KpiSparkline } from '../../components/ui/Charts';
import { useAppState } from '../../context/AppStateContext';
import { useRouter } from '../../context/RouterContext';
import { formatDisplayDate, getDaysRemaining } from '../../data/fixtures';

function CountryMiniFlag({ code }: { code: string }) {
  if (code === 'US') {
    return (
      <svg viewBox="0 0 24 16" className="w-6 h-4 rounded-[3px] shrink-0 shadow-xs border border-black/10" aria-hidden="true">
        <rect width="24" height="16" fill="#FFFFFF" />
        <rect width="24" height="2.3" y="0" fill="#DC2626" />
        <rect width="24" height="2.3" y="4.6" fill="#DC2626" />
        <rect width="24" height="2.3" y="9.2" fill="#DC2626" />
        <rect width="24" height="2.3" y="13.7" fill="#DC2626" />
        <rect width="11" height="9.2" fill="#1D4ED8" />
        <circle cx="3" cy="2.5" r="0.7" fill="#FFF" />
        <circle cx="6" cy="2.5" r="0.7" fill="#FFF" />
        <circle cx="9" cy="2.5" r="0.7" fill="#FFF" />
        <circle cx="4.5" cy="4.8" r="0.7" fill="#FFF" />
        <circle cx="7.5" cy="4.8" r="0.7" fill="#FFF" />
        <circle cx="3" cy="7" r="0.7" fill="#FFF" />
        <circle cx="6" cy="7" r="0.7" fill="#FFF" />
        <circle cx="9" cy="7" r="0.7" fill="#FFF" />
      </svg>
    );
  }
  if (code === 'GB') {
    return (
      <svg viewBox="0 0 24 16" className="w-6 h-4 rounded-[3px] shrink-0 shadow-xs border border-black/10" aria-hidden="true">
        <rect width="24" height="16" fill="#1E3A8A" />
        <path d="M0 0 L24 16 M24 0 L0 16" stroke="#FFFFFF" strokeWidth="3.2" />
        <path d="M0 0 L24 16 M24 0 L0 16" stroke="#DC2626" strokeWidth="1.4" />
        <path d="M12 0 V16 M0 8 H24" stroke="#FFFFFF" strokeWidth="4.6" />
        <path d="M12 0 V16 M0 8 H24" stroke="#DC2626" strokeWidth="2.6" />
      </svg>
    );
  }
  if (code === 'DE') {
    return (
      <svg viewBox="0 0 24 16" className="w-6 h-4 rounded-[3px] shrink-0 shadow-xs border border-black/10" aria-hidden="true">
        <rect width="24" height="5.33" y="0" fill="#111827" />
        <rect width="24" height="5.34" y="5.33" fill="#DC2626" />
        <rect width="24" height="5.33" y="10.67" fill="#FACC15" />
      </svg>
    );
  }
  if (code === 'SG') {
    return (
      <svg viewBox="0 0 24 16" className="w-6 h-4 rounded-[3px] shrink-0 shadow-xs border border-black/10" aria-hidden="true">
        <rect width="24" height="8" y="0" fill="#DC2626" />
        <rect width="24" height="8" y="8" fill="#FFFFFF" />
        <circle cx="5.5" cy="4" r="2.2" fill="#FFFFFF" />
        <circle cx="6.3" cy="4" r="1.9" fill="#DC2626" />
      </svg>
    );
  }
  if (code === 'CA') {
    return (
      <svg viewBox="0 0 24 16" className="w-6 h-4 rounded-[3px] shrink-0 shadow-xs border border-black/10" aria-hidden="true">
        <rect width="24" height="16" fill="#FFFFFF" />
        <rect width="5.5" height="16" x="0" fill="#DC2626" />
        <rect width="5.5" height="16" x="18.5" fill="#DC2626" />
        <path d="M12 3.2 L13.4 6.8 L16 6.2 L14.1 8.8 L15 10.6 L12.5 10.1 L12.5 12.8 L11.5 12.8 L11.5 10.1 L9 10.6 L9.9 8.8 L8 6.2 L10.6 6.8 Z" fill="#DC2626" />
      </svg>
    );
  }
  if (code === 'EU') {
    return (
      <svg viewBox="0 0 24 16" className="w-6 h-4 rounded-[3px] shrink-0 shadow-xs border border-black/10" aria-hidden="true">
        <rect width="24" height="16" fill="#1D4ED8" />
        <circle cx="12" cy="8" r="4.3" fill="none" stroke="#FACC15" strokeWidth="1.4" strokeDasharray="1.3 2.1" />
      </svg>
    );
  }
  return (
    <span className="w-6 h-4 rounded-[3px] bg-[#541B32]/15 dark:bg-white/15 text-[#541B32] dark:text-[#E8A4B5] font-mono text-[9px] font-bold flex items-center justify-center shrink-0">
      {code}
    </span>
  );
}

export function DashboardPage() {
  const { navigate } = useRouter();
  const {
    opportunities,
    countries,
    savedIds,
    onboarding,
    notifications,
    pipeline,
    subscription,
    planCatalog,
  } = useAppState();

  const [windowRange, setWindowRange] = useState<'30d' | '90d' | '12m'>('30d');
  const [chartWindow, setChartWindow] = useState<'6m' | '12m' | '30d'>('6m');
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const activePlan = planCatalog.find((p) => p.id === subscription.planId) ?? planCatalog[0];
  const firstName = onboarding.fullName.trim().split(' ')[0] || '';
  const totalAvailableCount = countries.reduce((acc, c) => acc + c.sampleRecordCount, 0);

  const windowDays = windowRange === '30d' ? 30 : windowRange === '90d' ? 90 : 365;
  const windowStart = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const windowOpportunities = opportunities.filter((o) => {
    const published = new Date(o.publicationDate).getTime();
    return Number.isFinite(published) && published >= windowStart;
  });
  const activeOppsCount = windowOpportunities.filter((o) => o.status !== 'Closed').length;
  const expiringSoonCount = opportunities.filter((o) => {
    const d = getDaysRemaining(o.deadlineDate);
    return d >= 0 && d <= 21;
  }).length;

  const completenessFields = [
    onboarding.fullName,
    onboarding.organisationName,
    onboarding.country,
    onboarding.servicesAndProducts,
    onboarding.expertiseAndCertifications,
  ];
  const readinessPct = Math.round(
    (completenessFields.filter((f) => f && f.trim().length > 0).length / completenessFields.length) * 100
  );

  const trendData = useMemo(() => {
    const now = new Date();

    const summarize = (start: Date, end: Date, label: string) => {
      const published = opportunities.filter((o) => {
        const d = new Date(o.publicationDate);
        return !Number.isNaN(d.getTime()) && d >= start && d < end;
      });
      const tracked = pipeline.filter((p) => {
        const d = new Date(p.addedAt);
        return !Number.isNaN(d.getTime()) && d >= start && d < end;
      });
      return {
        label,
        total: published.length,
        matched: published.filter((o) => o.matchScore >= 70).length,
        tracked: tracked.length,
      };
    };

    if (chartWindow === '30d') {
      return [0, 1, 2, 3].map((week) => {
        const end = new Date(now);
        end.setDate(end.getDate() - (3 - week) * 7);
        const start = new Date(end);
        start.setDate(start.getDate() - 7);
        return summarize(start, end, `Wk ${week + 1}`);
      });
    }

    const months = chartWindow === '6m' ? 6 : 12;
    return Array.from({ length: months }, (_, index) => {
      const start = new Date(now.getFullYear(), now.getMonth() - (months - 1 - index), 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      const label = start.toLocaleDateString('en-GB', { month: 'short' });
      return summarize(start, end, label);
    });
  }, [opportunities, pipeline, chartWindow]);
  const sparklineValues = trendData.map((point) => point.total);

  const topCountries = [...countries]
    .sort((a, b) => b.sampleRecordCount - a.sampleRecordCount)
    .slice(0, 5);

  const recentOpportunities = [...opportunities]
    .sort((a, b) => b.publicationDate.localeCompare(a.publicationDate))
    .slice(0, 3);

  return (
    <WorkspaceLayout title="Opportunity Intelligence Dashboard" breadcrumb="Workspace / Dashboard">
      <div className="space-y-6">
        {/* Resumable Onboarding Banner */}
        {!onboarding.completed && !bannerDismissed && (
          <div className="rounded-xl border border-[#A33B59]/35 bg-[#FFF1F2]/80 dark:bg-[#541B32]/30 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <Sparkles className="w-4 h-4 text-[#541B32] dark:text-[#E8A4B5] shrink-0" />
              <p className="text-[#172033] dark:text-[#F8FAFC]">
                <span className="font-semibold">Onboarding incomplete (Step {onboarding.lastCompletedStep} of 10):</span>{' '}
                Complete your capability &amp; certification profile to sharpen eligibility precision.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => navigate('/onboarding')}
                className="px-3 py-1.5 rounded-lg bg-[#541B32] hover:bg-[#A33B59] text-white font-semibold"
              >
                Resume Onboarding →
              </button>
              <button
                type="button"
                onClick={() => setBannerDismissed(true)}
                aria-label="Dismiss onboarding reminder"
                className="p-1 text-[#64748B] hover:text-[#172033] dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Welcome Header Row */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#34112B] via-[#1C122D] to-[#0E2447] border border-white/15 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 28 28" className="w-7 h-7" aria-hidden="true">
                <defs>
                  <linearGradient id="welcomeGlobeGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#EC4899" />
                    <stop offset="100%" stopColor="#38BDF8" />
                  </linearGradient>
                </defs>
                <circle cx="14" cy="14" r="10.5" fill="none" stroke="url(#welcomeGlobeGrad)" strokeWidth="1.8" />
                <ellipse cx="14" cy="14" rx="5.2" ry="10.5" fill="none" stroke="url(#welcomeGlobeGrad)" strokeWidth="1.5" />
                <line x1="3.8" y1="14" x2="24.2" y2="14" stroke="url(#welcomeGlobeGrad)" strokeWidth="1.5" />
                <line x1="5.5" y1="9.5" x2="22.5" y2="9.5" stroke="url(#welcomeGlobeGrad)" strokeWidth="1.2" />
                <line x1="5.5" y1="18.5" x2="22.5" y2="18.5" stroke="url(#welcomeGlobeGrad)" strokeWidth="1.2" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-2xl sm:text-[26px] font-bold tracking-tight text-[#172033] dark:text-white">
                {firstName ? `Welcome back, ${firstName}!` : 'Welcome to your workspace'}
              </h2>
              <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#CBD5E1]">
                Discover global tenders, RFPs, grants and commercial opportunities across {countries.filter((c) => c.coverageStatus === 'Active').length} active jurisdictions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <div className="relative inline-flex items-center">
              <Calendar className="w-3.5 h-3.5 text-[#64748B] dark:text-[#CBD5E1] absolute left-3 pointer-events-none" />
              <select
                value={windowRange}
                onChange={(e) => setWindowRange(e.target.value as '30d' | '90d' | '12m')}
                aria-label="Dashboard timeframe"
                className="h-9 pl-9 pr-4 rounded-md oppsift-card text-xs font-medium text-[#172033] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#A33B59]"
              >
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="12m">Last 12 Months</option>
              </select>
            </div>
          </div>
        </section>

        {/* Row 1: 4 Sparkline KPI Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* KPI 1 — Burgundy */}
          <button
            type="button"
            onClick={() => navigate('/discover')}
            className="text-left rounded-lg oppsift-kpi-burgundy hover:border-[#A33B59]/50 transition-colors overflow-hidden flex flex-col justify-between"
          >
            <div className="px-5 pt-4 pb-1 flex items-start gap-3">
              <span className="w-9 h-9 rounded-md bg-[#A33B59]/15 dark:bg-[#E11D48]/25 text-[#A33B59] dark:text-[#FB7185] flex items-center justify-center shrink-0 mt-0.5">
                <FileText className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#64748B] dark:text-white/80 truncate">Indexed Opportunities</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-display text-2xl font-bold tabular-nums text-[#172033] dark:text-white">
                    {totalAvailableCount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            {sparklineValues.some((value) => value > 0) && (
              <div className="px-1 pt-1">
                <KpiSparkline values={sparklineValues} tone="burgundy" idSuffix="1" />
              </div>
            )}
          </button>

          {/* KPI 2 — Intelligence Blue */}
          <button
            type="button"
            onClick={() => navigate('/discover')}
            className="text-left rounded-lg oppsift-kpi-blue hover:border-[#38BDF8]/50 transition-colors overflow-hidden flex flex-col justify-between"
          >
            <div className="px-5 pt-4 pb-1 flex items-start gap-3">
              <span className="w-9 h-9 rounded-md bg-[#164E8B]/15 dark:bg-[#38BDF8]/20 text-[#164E8B] dark:text-[#38BDF8] flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#64748B] dark:text-white/80 truncate">Open Notices Published</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-display text-2xl font-bold tabular-nums text-[#172033] dark:text-white">
                    {activeOppsCount} / {windowOpportunities.length}
                  </span>
                </div>
              </div>
            </div>
            {sparklineValues.some((value) => value > 0) && (
              <div className="px-1 pt-1">
                <KpiSparkline values={sparklineValues} tone="blue" idSuffix="2" />
              </div>
            )}
          </button>

          {/* KPI 3 — Burgundy */}
          <button
            type="button"
            onClick={() => navigate('/saved')}
            className="text-left rounded-lg oppsift-kpi-burgundy hover:border-[#A33B59]/50 transition-colors overflow-hidden flex flex-col justify-between"
          >
            <div className="px-5 pt-4 pb-1 flex items-start gap-3">
              <span className="w-9 h-9 rounded-md bg-[#F59E0B]/20 text-[#D97706] dark:text-[#FBBF24] flex items-center justify-center shrink-0 mt-0.5">
                <Bookmark className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#64748B] dark:text-white/80 truncate">Saved Opportunities</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-display text-2xl font-bold tabular-nums text-[#172033] dark:text-white">
                    {savedIds.length}
                  </span>
                </div>
              </div>
            </div>
          </button>

          {/* KPI 4 — Intelligence Blue */}
          <button
            type="button"
            onClick={() => navigate('/my-opportunities')}
            className="text-left rounded-lg oppsift-kpi-blue hover:border-[#38BDF8]/50 transition-colors overflow-hidden flex flex-col justify-between"
          >
            <div className="px-5 pt-4 pb-1 flex items-start gap-3">
              <span className="w-9 h-9 rounded-md bg-[#E11D48]/15 dark:bg-[#FB7185]/20 text-[#E11D48] dark:text-[#FB7185] flex items-center justify-center shrink-0 mt-0.5">
                <Bell className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#64748B] dark:text-white/80 truncate">Expiring Within 21d</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-display text-2xl font-bold tabular-nums text-[#172033] dark:text-white">
                    {expiringSoonCount}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-mono font-semibold text-[#DC2626] dark:text-[#FB7185]">
                    <TrendingDown className="w-3 h-3" />
                    urgent
                  </span>
                </div>
              </div>
            </div>
          </button>
        </section>

        {/* Row 2: Opportunity Overview (6 cols) + Top Countries (3 cols) + Workspace Status (3 cols) */}
        <section className="grid grid-cols-1 md:grid-cols-6 xl:grid-cols-12 gap-5">
          {/* Opportunity Overview 3-Line Chart */}
          <div className="md:col-span-6 xl:col-span-6 p-5 rounded-lg oppsift-card flex flex-col justify-between min-w-0">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <BarChart3 className="w-4 h-4 text-[#A33B59] dark:text-[#EC4899] shrink-0" />
                <h3 className="font-display text-base font-semibold truncate">Opportunity Overview</h3>
              </div>
              <select
                value={chartWindow}
                onChange={(e) => setChartWindow(e.target.value as '6m' | '12m' | '30d')}
                aria-label="Chart range"
                className="h-8 px-2.5 rounded-md border border-[#E2E8F0] dark:border-white/15 bg-[#F8FAFC] dark:bg-white/6 text-xs font-medium shrink-0"
              >
                <option value="6m">6 Months</option>
                <option value="12m">12 Months</option>
                <option value="30d">30 Days</option>
              </select>
            </div>
            <DiscoveryTrendChart data={trendData} />
          </div>

          {/* Top Countries Ranked Panel */}
          <div className="md:col-span-3 xl:col-span-3 p-5 rounded-lg oppsift-card flex flex-col justify-between min-w-0">
            <div className="flex items-center justify-between mb-3 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Globe className="w-4 h-4 text-[#A33B59] dark:text-[#EC4899] shrink-0" />
                <h3 className="font-display text-base font-semibold truncate">Top Countries</h3>
              </div>
              <button
                type="button"
                onClick={() => navigate('/markets')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#A33B59] dark:text-[#E8A4B5] hover:underline shrink-0"
              >
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="divide-y divide-[#E2E8F0] dark:divide-white/8">
              {topCountries.length === 0 && (
                <p className="py-3 text-xs text-[#64748B] dark:text-[#94A3B8]">
                  Country coverage is unavailable until the database returns records.
                </p>
              )}
              {topCountries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => navigate(`/discover/country/${country.code}`)}
                  className="w-full py-2.5 px-1.5 flex items-center justify-between gap-2 text-left hover:bg-[#F8FAFC] dark:hover:bg-white/4 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CountryMiniFlag code={country.code} />
                    <span className="text-xs font-medium truncate">{country.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-xs font-mono tabular-nums">
                    <span className="font-semibold">{country.sampleRecordCount.toLocaleString()}</span>
                    <span className="text-[11px] text-[#16A34A] dark:text-[#34D399]">
                      {country.activeSourcesCount} src
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right Executive Workspace Intelligence & Plan Card */}
          <div className="md:col-span-3 xl:col-span-3 p-5 rounded-lg oppsift-card flex flex-col justify-between gap-4 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Crown className="w-4 h-4 text-[#A33B59] dark:text-[#EC4899] shrink-0" />
                <h3 className="font-display text-base font-semibold truncate">Workspace Status</h3>
              </div>
              <span className="text-[11px] font-mono text-[#64748B] dark:text-[#CBD5E1] shrink-0">
                {onboarding.preferredCurrency}
              </span>
            </div>

            <div className="rounded-lg oppsift-executive-card p-4 text-white relative overflow-hidden space-y-3 border border-white/15">
              <svg
                viewBox="0 0 240 140"
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 w-full h-full opacity-20"
              >
                <path d="M 110 140 Q 170 40 240 10" fill="none" stroke="#F472B6" strokeWidth="1.2" />
                <path d="M 140 140 Q 190 60 240 35" fill="none" stroke="#F472B6" strokeWidth="0.9" />
                <path d="M 170 140 Q 210 80 240 60" fill="none" stroke="#38BDF8" strokeWidth="0.8" />
              </svg>

              <div className="relative z-10 flex items-center justify-between gap-2">
                <OppSiftLogo variant="compact" size="sm" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#FFD1DF] truncate">
                  {activePlan.name} Plan
                </span>
              </div>

              <div className="relative z-10 pt-1">
                <p className="text-[11px] text-white/75">Profile Readiness Score</p>
                <p className="font-display text-2xl font-bold tabular-nums">{readinessPct}% Aligned</p>
              </div>

              <div className="relative z-10 grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div>
                  <p className="text-white/70">Active Markets</p>
                  <p className="font-mono font-semibold tabular-nums">
                    {onboarding.countriesOfInterest.length} Jurisdictions
                  </p>
                </div>
                <div>
                  <p className="text-white/70">Pipeline</p>
                  <p className="font-mono font-semibold tabular-nums">{pipeline.length} Tracked</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/settings/billing')}
              className="w-full py-2.5 px-4 rounded-md bg-[#541B32] hover:bg-[#A33B59] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Manage Plan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>

        {/* Row 3: Quick Actions + Recent Opportunities + Activity Feed */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-5">
          {/* Quick Actions */}
          <div className="md:col-span-2 xl:col-span-5 p-5 rounded-lg oppsift-card space-y-4 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Zap className="w-4 h-4 text-[#A33B59] dark:text-[#EC4899] shrink-0" />
                <h3 className="font-display text-base font-semibold truncate">Quick Actions</h3>
              </div>
              <button
                type="button"
                onClick={() => navigate('/discover')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#A33B59] dark:text-[#E8A4B5] hover:underline shrink-0"
              >
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                {
                  label: 'Search Opps',
                  route: '/discover',
                  icon: <Search className="w-4 h-4" />,
                  tileClass:
                    'bg-[#FFF1F2] dark:bg-[#49142B]/70 border-[#F3D6DF] dark:border-[#A33B59]/35 text-[#541B32] dark:text-white',
                  haloClass: 'bg-[#A33B59]/15 dark:bg-[#E11D48]/30 text-[#A33B59] dark:text-[#FB7185]',
                },
                {
                  label: 'Set Alerts',
                  route: '/alerts',
                  icon: <Bell className="w-4 h-4" />,
                  tileClass:
                    'bg-[#EFF6FF] dark:bg-[#132242]/80 border-[#D5E8FA] dark:border-[#38BDF8]/30 text-[#0B1F3A] dark:text-white',
                  haloClass: 'bg-[#164E8B]/15 dark:bg-[#38BDF8]/25 text-[#164E8B] dark:text-[#38BDF8]',
                },
                {
                  label: 'AI Analysis',
                  route: '/intelligence',
                  icon: <Sparkles className="w-4 h-4" />,
                  tileClass:
                    'bg-[#F5F3FF] dark:bg-[#23193D]/80 border-[#DDD6FE] dark:border-[#A855F7]/30 text-[#251019] dark:text-white',
                  haloClass: 'bg-[#7C3AED]/15 dark:bg-[#A855F7]/30 text-[#7C3AED] dark:text-[#C084FC]',
                },
                {
                  label: 'Export Data',
                  route: '/reports',
                  icon: <Download className="w-4 h-4" />,
                  tileClass:
                    'bg-[#ECFDF5] dark:bg-[#0E2925]/80 border-[#BBF7D0] dark:border-[#34D399]/30 text-[#064E3B] dark:text-white',
                  haloClass: 'bg-[#16A34A]/15 dark:bg-[#34D399]/25 text-[#16A34A] dark:text-[#34D399]',
                },
              ].map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => navigate(action.route)}
                  className={`px-1.5 py-3.5 rounded-lg border text-center flex flex-col items-center justify-center gap-2 hover:border-[#A33B59]/50 transition-colors min-w-0 ${action.tileClass}`}
                >
                  <span className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${action.haloClass}`}>
                    {action.icon}
                  </span>
                  <span className="text-[11px] font-semibold leading-tight">{action.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Opportunities */}
          <div className="md:col-span-1 xl:col-span-4 p-5 rounded-lg oppsift-card space-y-3 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-base font-semibold truncate">Recent Opportunities</h3>
              <button
                type="button"
                onClick={() => navigate('/discover')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#A33B59] dark:text-[#E8A4B5] hover:underline shrink-0"
              >
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="divide-y divide-[#E2E8F0] dark:divide-white/8">
              {recentOpportunities.length === 0 && (
                <p className="py-3 text-xs text-[#64748B] dark:text-[#94A3B8]">
                  No opportunities have been published yet.
                </p>
              )}
              {recentOpportunities.map((opp) => (
                <button
                  key={opp.id}
                  type="button"
                  onClick={() => navigate(`/opportunity/${opp.id}`)}
                  className="w-full py-3 px-1.5 flex items-center justify-between gap-3 text-left hover:bg-[#F8FAFC] dark:hover:bg-white/4 rounded-md transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-md bg-[#E0F2FE] dark:bg-[#164E8B]/40 text-[#164E8B] dark:text-[#38BDF8] font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                      {opp.countryCode}
                    </span>
                    <div className="min-w-0">
                      <p className="font-display text-xs sm:text-sm font-semibold truncate text-[#172033] dark:text-white">
                        {opp.title}
                      </p>
                      <p className="text-[11px] text-[#64748B] dark:text-[#CBD5E1] truncate mt-0.5">
                        Deadline: {formatDisplayDate(opp.deadlineDate)}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-[#A33B59] dark:text-[#E8A4B5] shrink-0">
                    {opp.region}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="md:col-span-1 xl:col-span-3 p-5 rounded-lg oppsift-card space-y-3 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Activity className="w-4 h-4 text-[#A33B59] dark:text-[#EC4899] shrink-0" />
                <h3 className="font-display text-base font-semibold truncate">Activity Feed</h3>
              </div>
              <button
                type="button"
                onClick={() => navigate('/notifications')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#A33B59] dark:text-[#E8A4B5] hover:underline shrink-0"
              >
                <span>All</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="divide-y divide-[#E2E8F0] dark:divide-white/8">
              {notifications.length === 0 && (
                <p className="py-3 text-xs text-[#64748B] dark:text-[#94A3B8]">
                  No activity yet. Alerts and amendments will appear here.
                </p>
              )}
              {notifications.slice(0, 3).map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => navigate('/notifications')}
                  className="w-full py-3 px-1.5 flex items-start justify-between gap-2.5 text-left hover:bg-[#F8FAFC] dark:hover:bg-white/4 rounded-md transition-colors"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                        n.type === 'Deadline'
                          ? 'bg-[#FFF1F2] dark:bg-[#E11D48]/25 text-[#E11D48] dark:text-[#FB7185]'
                          : n.type === 'Amendment'
                          ? 'bg-[#EFF6FF] dark:bg-[#38BDF8]/20 text-[#164E8B] dark:text-[#38BDF8]'
                          : 'bg-[#ECFDF5] dark:bg-[#34D399]/20 text-[#16A34A] dark:text-[#34D399]'
                      }`}
                    >
                      <Bell className="w-3.5 h-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate text-[#172033] dark:text-white">{n.title}</p>
                      <p className="text-[11px] text-[#64748B] dark:text-[#CBD5E1] line-clamp-1 mt-0.5">
                        {n.opportunityRef || n.type}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-[#64748B] dark:text-[#CBD5E1] shrink-0 mt-0.5">
                    {n.timestamp}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </WorkspaceLayout>
  );
}
