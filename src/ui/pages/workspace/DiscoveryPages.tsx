import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Columns,
  Database,
  ExternalLink,
  Globe,
  History,
  LayoutGrid,
  List,
  MoreVertical,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout';
import { HorizontalBarChart } from '../../components/ui/Charts';
import { EmptyStatePanel } from '../../components/ui/StateViews';
import { useAppState } from '../../context/AppStateContext';
import { useRouter } from '../../context/RouterContext';
import {
  formatCurrencyValue,
  formatDisplayDate,
  getDaysRemaining,
} from '../../data/fixtures';
import { Opportunity, OpportunityCategory } from '../../types/oppsift';

function OpportunityExplorerCore({
  pageTitle,
  breadcrumb,
  lockedCategory,
  initialQuery = '',
  isSearchResultsPage = false,
}: {
  pageTitle: string;
  breadcrumb: string;
  lockedCategory?: OpportunityCategory | 'Commercial';
  initialQuery?: string;
  isSearchResultsPage?: boolean;
}) {
  const {
    navigate,
    discoveryFilters,
    setDiscoveryFilters,
    resetDiscoveryFilters,
  } = useRouter();
  const {
    opportunities,
    countries,
    sources,
    savedIds,
    toggleSaveOpportunity,
    compareIds,
    toggleCompareOpportunity,
    clearCompare,
    addToPipeline,
    addSavedSearch,
    recordSearch,
    searchHistory,
  } = useAppState();

  const {
    query,
    exactPhrase,
    countryFilter,
    regionFilter,
    categoryFilter,
    sectorFilter,
    organisationFilter,
    eligibilityFilter,
    sourceFilter,
    statusFilter,
    deadlineWindow,
    pubFrom,
    pubTo,
    minVal,
    maxVal,
    currencyFilter,
    sortBy,
    viewMode,
    page,
  } = discoveryFilters;

  const setFilter = <K extends keyof typeof discoveryFilters>(
    key: K,
    value: (typeof discoveryFilters)[K],
    resetPage = true
  ) => {
    setDiscoveryFilters((prev) => ({
      ...prev,
      [key]: value,
      ...(resetPage ? { page: 1 } : {}),
    }));
  };

  React.useEffect(() => {
    if (isSearchResultsPage && initialQuery) {
      setDiscoveryFilters((prev) =>
        prev.query === initialQuery ? prev : { ...prev, query: initialQuery, page: 1 }
      );
    }
  }, [initialQuery, isSearchResultsPage, setDiscoveryFilters]);

  const [showFilters, setShowFilters] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const pageSize = 4;

  const suggestions = ['HL7 FHIR', 'Zero-Trust', 'Horizon Europe', 'Stormwater', 'eForms'];
  const sectors = Array.from(new Set(opportunities.map((o) => o.sector)));
  const regions = Array.from(new Set(countries.map((c) => c.region)));

  const invalidValueRange =
    minVal !== '' && maxVal !== '' && Number(minVal) > Number(maxVal);
  const invalidDateRange =
    pubFrom !== '' && pubTo !== '' && pubFrom > pubTo;
  const hasInvalidFilters = invalidValueRange || invalidDateRange;

  const filtered = useMemo(() => {
    if (hasInvalidFilters) return [];
    const q = query.trim().toLowerCase();
    const phrase = exactPhrase.trim().toLowerCase();
    const orgQ = organisationFilter === 'All' ? '' : organisationFilter.trim().toLowerCase();
    const minN = minVal !== '' ? Number(minVal) : null;
    const maxN = maxVal !== '' ? Number(maxVal) : null;

    return opportunities
      .filter((o) => {
        if (lockedCategory === 'Government Tender') {
          if (o.category !== 'Government Tender' && o.category !== 'Public Procurement') return false;
        } else if (lockedCategory === 'Commercial') {
          if (o.category !== 'Commercial Contract' && o.category !== 'RFP') return false;
        } else if (lockedCategory && o.category !== lockedCategory) {
          return false;
        }
        if (countryFilter !== 'All' && o.countryCode !== countryFilter) return false;
        if (regionFilter !== 'All' && o.region !== regionFilter) return false;
        if (categoryFilter !== 'All' && o.category !== categoryFilter) return false;
        if (sectorFilter !== 'All' && o.sector !== sectorFilter) return false;
        if (eligibilityFilter !== 'All' && o.eligibility.status !== eligibilityFilter) return false;
        if (sourceFilter !== 'All' && o.sourceId !== sourceFilter) return false;
        if (statusFilter !== 'All' && o.status !== statusFilter) return false;
        if (currencyFilter !== 'All' && o.currency !== currencyFilter) return false;
        if (pubFrom && o.publicationDate < pubFrom) return false;
        if (pubTo && o.publicationDate > pubTo) return false;

        if (deadlineWindow !== 'All') {
          const days = getDaysRemaining(o.deadlineDate);
          if (days < 0 || days > Number(deadlineWindow)) return false;
        }
        if (minN !== null && (o.estimatedValue === null || o.estimatedValue < minN)) return false;
        if (maxN !== null && (o.estimatedValue === null || o.estimatedValue > maxN)) return false;
        if (orgQ && !o.issuingOrganisation.toLowerCase().includes(orgQ)) return false;

        const haystack = `${o.title} ${o.summary} ${o.description} ${o.issuingOrganisation} ${o.sector} ${o.referenceNumber}`.toLowerCase();
        if (q && !haystack.includes(q)) return false;
        if (phrase && !haystack.includes(phrase)) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'relevance') return b.matchScore - a.matchScore;
        if (sortBy === 'deadline') return a.deadlineDate.localeCompare(b.deadlineDate);
        if (sortBy === 'value') return (b.estimatedValue ?? -1) - (a.estimatedValue ?? -1);
        return b.publicationDate.localeCompare(a.publicationDate);
      });
  }, [
    opportunities,
    hasInvalidFilters,
    lockedCategory,
    countryFilter,
    regionFilter,
    categoryFilter,
    sectorFilter,
    eligibilityFilter,
    sourceFilter,
    statusFilter,
    currencyFilter,
    pubFrom,
    pubTo,
    deadlineWindow,
    minVal,
    maxVal,
    organisationFilter,
    query,
    exactPhrase,
    sortBy,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const resetAllFilters = () => {
    resetDiscoveryFilters();
  };

  const applyPreset = (preset: 'high-fit-eu-uk' | 'urgent' | 'grants') => {
    resetDiscoveryFilters();
    setTimeout(() => {
      if (preset === 'high-fit-eu-uk') {
        setDiscoveryFilters((prev) => ({
          ...prev,
          regionFilter: 'Europe',
          eligibilityFilter: 'Likely Eligible',
          page: 1,
        }));
      } else if (preset === 'urgent') {
        setDiscoveryFilters((prev) => ({ ...prev, deadlineWindow: '30', page: 1 }));
      } else if (preset === 'grants') {
        setDiscoveryFilters((prev) => ({ ...prev, categoryFilter: 'Grant & Funding', page: 1 }));
      }
    }, 0);
  };

  const handleSaveCurrentSearch = () => {
    addSavedSearch({
      name: query.trim() ? `Search: ${query.trim()}` : `${pageTitle} Watch`,
      query: query.trim() || exactPhrase.trim() || '*',
      countries: countryFilter === 'All' ? [] : [countryFilter],
      categories: categoryFilter === 'All' ? [] : [categoryFilter as OpportunityCategory],
      sectors: sectorFilter === 'All' ? [] : [sectorFilter],
      matchingCount: filtered.length,
      emailAlerts: true,
      frequency: 'Daily Digest',
    });
  };

  return (
    <WorkspaceLayout title={pageTitle} breadcrumb={breadcrumb}>
      <div className="space-y-5 pb-14">
        {/* Search & Advanced Filters Card */}
        <div className="p-5 rounded-lg oppsift-card space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={query}
                onChange={(e) => setFilter('query', e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && query.trim()) {
                    recordSearch(query, `${countryFilter} · ${categoryFilter}`, filtered.length);
                  }
                }}
                placeholder="Search titles, reference IDs, issuing agencies, or keywords..."
                className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className={`inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl border text-xs font-medium transition-colors ${
                  showFilters
                    ? 'border-[#A33B59] bg-[#FFF1F2] dark:bg-[#541B32]/40 text-[#541B32] dark:text-[#E8A4B5]'
                    : 'border-[#E2E8F0] dark:border-white/12'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Advanced Filters</span>
              </button>

              <select
                value={sortBy}
                onChange={(e) => setFilter('sortBy', e.target.value as 'relevance' | 'deadline' | 'newest' | 'value', false)}
                aria-label="Sort results"
                className="h-10 px-3 rounded-xl border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-xs font-medium"
              >
                <option value="relevance">Sort: Best Match</option>
                <option value="deadline">Sort: Soonest Deadline</option>
                <option value="newest">Sort: Recently Published</option>
                <option value="value">Sort: Highest Est. Value</option>
              </select>

              <div className="flex items-center p-1 rounded-xl bg-[#F1F5F9] dark:bg-white/8">
                <button
                  type="button"
                  onClick={() => setFilter('viewMode', 'cards', false)}
                  aria-label="Card view"
                  className={`p-1.5 rounded-lg ${viewMode === 'cards' ? 'bg-white dark:bg-[#23192D] shadow-xs' : 'text-[#64748B]'}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('viewMode', 'table', false)}
                  aria-label="Table view"
                  className={`p-1.5 rounded-lg ${viewMode === 'table' ? 'bg-white dark:bg-[#23192D] shadow-xs' : 'text-[#64748B]'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleSaveCurrentSearch}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-[#541B32] hover:bg-[#A33B59] text-white text-xs font-semibold whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save Search</span>
              </button>
            </div>
          </div>

          {/* Suggestions, Recent History & Presets */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[#64748B] dark:text-[#CBD5E1]">Keywords:</span>
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFilter('query', s)}
                  className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] dark:border-white/12 hover:border-[#A33B59] text-[#172033] dark:text-[#F8FAFC]"
                >
                  {s}
                </button>
              ))}
              {searchHistory.slice(0, 2).map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setFilter('query', h.query)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F8FAFC] dark:bg-white/6 text-[#64748B] dark:text-[#CBD5E1] hover:text-[#172033] dark:hover:text-white"
                >
                  <History className="w-3 h-3" />
                  <span>{h.query}</span>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[#64748B] dark:text-[#CBD5E1]">Presets:</span>
              <button
                type="button"
                onClick={() => applyPreset('high-fit-eu-uk')}
                className="text-xs font-medium text-[#541B32] dark:text-[#E8A4B5] hover:underline"
              >
                Likely Eligible in Europe
              </button>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => applyPreset('urgent')}
                className="text-xs font-medium text-[#164E8B] dark:text-[#38BDF8] hover:underline"
              >
                Closing ≤30d
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="pt-4 border-t border-[#E2E8F0] dark:border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="min-w-0">
                <label className="block text-[11px] font-medium text-[#64748B] dark:text-[#CBD5E1] mb-1">Exact Phrase</label>
                <input
                  type="text"
                  value={exactPhrase}
                  onChange={(e) => setFilter('exactPhrase', e.target.value)}
                  placeholder='e.g. "HL7 FHIR"'
                  className="w-full min-w-0 h-9 px-2.5 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-xs"
                />
              </div>
              <div className="min-w-0">
                <label className="block text-[11px] font-medium text-[#64748B] dark:text-[#CBD5E1] mb-1">Country</label>
                <select
                  value={countryFilter}
                  onChange={(e) => setFilter('countryFilter', e.target.value)}
                  className="w-full min-w-0 h-9 px-2.5 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-xs"
                >
                  <option value="All">All Countries</option>
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.currency})
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0">
                <label className="block text-[11px] font-medium text-[#64748B] dark:text-[#CBD5E1] mb-1">Region</label>
                <select
                  value={regionFilter}
                  onChange={(e) => setFilter('regionFilter', e.target.value)}
                  className="w-full min-w-0 h-9 px-2.5 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-xs"
                >
                  <option value="All">All Regions</option>
                  {regions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              {!lockedCategory && (
                <div className="min-w-0">
                  <label className="block text-[11px] font-medium text-[#64748B] dark:text-[#CBD5E1] mb-1">Category</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setFilter('categoryFilter', e.target.value as 'All' | OpportunityCategory)}
                    className="w-full min-w-0 h-9 px-2.5 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-xs"
                  >
                    <option value="All">All Categories</option>
                    <option value="Government Tender">Government Tender</option>
                    <option value="Public Procurement">Public Procurement</option>
                    <option value="RFP">RFP</option>
                    <option value="Grant & Funding">Grant &amp; Funding</option>
                    <option value="Commercial Contract">Commercial Contract</option>
                  </select>
                </div>
              )}
              <div className="min-w-0">
                <label className="block text-[11px] font-medium text-[#64748B] dark:text-[#CBD5E1] mb-1">Sector</label>
                <select
                  value={sectorFilter}
                  onChange={(e) => setFilter('sectorFilter', e.target.value)}
                  className="w-full min-w-0 h-9 px-2.5 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-xs"
                >
                  <option value="All">All Sectors</option>
                  {sectors.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0">
                <label className="block text-[11px] font-medium text-[#64748B] dark:text-[#CBD5E1] mb-1">Issuing Organisation</label>
                <input
                  type="text"
                  value={organisationFilter === 'All' ? '' : organisationFilter}
                  onChange={(e) => setFilter('organisationFilter', e.target.value || 'All')}
                  placeholder="e.g. NHS England, PUB, CINEA"
                  className="w-full min-w-0 h-9 px-2.5 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-xs"
                />
              </div>
              <div className="min-w-0">
                <label className="block text-[11px] font-medium text-[#64748B] dark:text-[#CBD5E1] mb-1">Eligibility Status</label>
                <select
                  value={eligibilityFilter}
                  onChange={(e) => setFilter('eligibilityFilter', e.target.value)}
                  className="w-full min-w-0 h-9 px-2.5 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-xs"
                >
                  <option value="All">All Eligibility States</option>
                  <option value="Likely Eligible">Likely Eligible</option>
                  <option value="Review Required">Review Required</option>
                  <option value="Unverified">Unverified</option>
                  <option value="Potential Disqualifier">Potential Disqualifier</option>
                </select>
              </div>
              <div className="min-w-0">
                <label className="block text-[11px] font-medium text-[#64748B] dark:text-[#CBD5E1] mb-1">Official Source</label>
                <select
                  value={sourceFilter}
                  onChange={(e) => setFilter('sourceFilter', e.target.value)}
                  className="w-full min-w-0 h-9 px-2.5 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-xs"
                >
                  <option value="All">All Sources</option>
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0">
                <label className="block text-[11px] font-medium text-[#64748B] dark:text-[#CBD5E1] mb-1">Deadline Window</label>
                <select
                  value={deadlineWindow}
                  onChange={(e) => setFilter('deadlineWindow', e.target.value)}
                  className="w-full min-w-0 h-9 px-2.5 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-xs"
                >
                  <option value="All">Any Closing Date</option>
                  <option value="14">Closing within 14 days</option>
                  <option value="30">Closing within 30 days</option>
                  <option value="60">Closing within 60 days</option>
                </select>
              </div>
              <div className="min-w-0">
                <label className="block text-[11px] font-medium text-[#64748B] dark:text-[#CBD5E1] mb-1">Notice Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setFilter('statusFilter', e.target.value)}
                  className="w-full min-w-0 h-9 px-2.5 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-xs"
                >
                  <option value="All">All Statuses</option>
                  <option value="Open">Open</option>
                  <option value="Closing Soon">Closing Soon</option>
                  <option value="Amended">Amended</option>
                  <option value="Awarded">Awarded</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              <div className="min-w-0">
                <label className="block text-[11px] font-medium text-[#64748B] dark:text-[#CBD5E1] mb-1">Published From / To</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="date"
                    value={pubFrom}
                    onChange={(e) => setFilter('pubFrom', e.target.value)}
                    aria-label="Published from date"
                    className="w-full min-w-0 h-9 px-2 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-[11px]"
                  />
                  <input
                    type="date"
                    value={pubTo}
                    onChange={(e) => setFilter('pubTo', e.target.value)}
                    aria-label="Published to date"
                    className="w-full min-w-0 h-9 px-2 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-[11px]"
                  />
                </div>
              </div>
              <div className="min-w-0">
                <label className="block text-[11px] font-medium text-[#64748B] dark:text-[#CBD5E1] mb-1">Est. Value &amp; Currency</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <input
                    type="number"
                    value={minVal}
                    onChange={(e) => setFilter('minVal', e.target.value)}
                    placeholder="Min"
                    className="w-full min-w-0 h-9 px-2 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-xs font-mono"
                  />
                  <input
                    type="number"
                    value={maxVal}
                    onChange={(e) => setFilter('maxVal', e.target.value)}
                    placeholder="Max"
                    className="w-full min-w-0 h-9 px-2 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-xs font-mono"
                  />
                  <select
                    value={currencyFilter}
                    onChange={(e) => setFilter('currencyFilter', e.target.value)}
                    aria-label="Currency filter"
                    className="w-full min-w-0 h-9 px-1.5 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-xs font-mono"
                  >
                    <option value="All">Any</option>
                    <option value="GBP">GBP</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="SGD">SGD</option>
                    <option value="AUD">AUD</option>
                    <option value="CAD">CAD</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {hasInvalidFilters && (
            <div className="p-3 rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/10 text-xs text-[#DC2626] flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {invalidValueRange
                  ? 'Minimum value exceeds maximum value. Adjust contract value range.'
                  : 'Published "From" date is later than "To" date.'}
              </span>
              <button type="button" onClick={resetAllFilters} className="font-semibold underline shrink-0">
                Reset
              </button>
            </div>
          )}
        </div>

        {/* Results Meta Strip */}
        <div className="flex items-center justify-between text-xs text-[#64748B] dark:text-[#CBD5E1]">
          <p className="font-mono tabular-nums">
            Showing {paged.length} of {filtered.length} matching opportunities
            {isSearchResultsPage && query ? ` for "${query}"` : ''}
          </p>
          <button
            type="button"
            onClick={resetAllFilters}
            className="text-[#541B32] dark:text-[#E8A4B5] font-medium hover:underline"
          >
            Reset all filters
          </button>
        </div>

        {/* Results Grid / Table */}
        {filtered.length === 0 ? (
          <EmptyStatePanel
            title={hasInvalidFilters ? 'Invalid filter range' : 'No matching opportunities found'}
            description={
              hasInvalidFilters
                ? 'Correct the minimum/maximum contract value or publication date boundaries to inspect matching notices.'
                : 'Adjust your keywords, jurisdiction, or value filters to broaden results.'
            }
            actionLabel="Reset All Filters"
            onAction={resetAllFilters}
          />
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paged.map((opp: Opportunity) => {
              const isSaved = savedIds.includes(opp.id);
              const isCompared = compareIds.includes(opp.id);
              const menuOpen = openMenuId === opp.id;
              return (
                <article
                  key={opp.id}
                  className="p-5 rounded-lg oppsift-card flex flex-col justify-between gap-4 relative"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs text-[#64748B] dark:text-[#CBD5E1]">
                      <span>
                        {opp.countryName} · {opp.category} ·{' '}
                        <span className="font-mono font-semibold text-[#541B32] dark:text-[#E8A4B5]">
                          {opp.matchScore}% match
                        </span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold ${
                            opp.status === 'Closing Soon'
                              ? 'text-[#D97706]'
                              : opp.status === 'Amended'
                              ? 'text-[#164E8B] dark:text-[#38BDF8]'
                              : 'text-[#16A34A]'
                          }`}
                        >
                          {opp.status}
                        </span>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setOpenMenuId(menuOpen ? null : opp.id)}
                            aria-label="Opportunity quick actions"
                            className="p-1 rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-white/10"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {menuOpen && (
                            <div className="absolute right-0 mt-1 w-48 rounded-xl border border-[#E2E8F0] dark:border-white/12 bg-white dark:bg-[#181326] shadow-xl p-1.5 z-20 text-xs">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  navigate(`/opportunity/${opp.id}`);
                                }}
                                className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-white/8"
                              >
                                Inspect Full Dossier
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  navigate('/intelligence');
                                }}
                                className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-white/8"
                              >
                                Analyse in AI Workspace
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  navigate(`/sources/${opp.sourceId}`);
                                }}
                                className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-white/8"
                              >
                                Inspect Official Source
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate(`/opportunity/${opp.id}`)}
                      className="mt-2 text-left font-display text-base font-semibold text-[#172033] dark:text-[#F8FAFC] hover:text-[#A33B59] dark:hover:text-[#E8A4B5]"
                    >
                      {opp.title}
                    </button>

                    <p className="mt-1 text-xs text-[#64748B] dark:text-[#CBD5E1]">
                      {opp.issuingOrganisation} · <span className="font-mono">{opp.referenceNumber}</span>
                    </p>
                    <p className="mt-2 text-xs text-[#64748B] dark:text-[#CBD5E1] line-clamp-2">{opp.summary}</p>
                  </div>

                  <div className="pt-3 border-t border-[#E2E8F0] dark:border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <p className="font-mono tabular-nums font-semibold text-[#172033] dark:text-[#F8FAFC]">
                        {formatCurrencyValue(opp.estimatedValue, opp.currency)}
                      </p>
                      <p className="text-[11px] text-[#64748B] dark:text-[#CBD5E1]">
                        Due {formatDisplayDate(opp.deadlineDate)} ({opp.deadlineTimezone}) · {opp.eligibility.status}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggleCompareOpportunity(opp.id)}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1 ${
                          isCompared
                            ? 'border-[#164E8B] bg-[#E0F2FE] dark:bg-[#164E8B]/40 text-[#164E8B] dark:text-[#38BDF8]'
                            : 'border-[#E2E8F0] dark:border-white/12'
                        }`}
                      >
                        <Columns className="w-3.5 h-3.5" />
                        <span>{isCompared ? 'Comparing' : 'Compare'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSaveOpportunity(opp.id)}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium ${
                          isSaved
                            ? 'border-[#541B32] bg-[#FFF1F2] dark:bg-[#541B32]/40 text-[#541B32] dark:text-[#E8A4B5]'
                            : 'border-[#E2E8F0] dark:border-white/12'
                        }`}
                      >
                        <Bookmark className="w-3.5 h-3.5 inline mr-1" />
                        {isSaved ? 'Saved' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => addToPipeline(opp.id)}
                        className="px-3 py-1.5 rounded-lg bg-[#541B32] hover:bg-[#A33B59] text-white text-xs font-semibold"
                      >
                        Track
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg oppsift-card">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] dark:bg-white/6 text-[#64748B] dark:text-[#CBD5E1]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Opportunity</th>
                  <th className="py-3 px-4 font-semibold">Issuing Authority</th>
                  <th className="py-3 px-4 font-semibold">Country</th>
                  <th className="py-3 px-4 font-semibold">Deadline</th>
                  <th className="py-3 px-4 font-semibold text-right">Est. Value</th>
                  <th className="py-3 px-4 font-semibold text-right">Match</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-white/8">
                {paged.map((opp) => (
                  <tr
                    key={opp.id}
                    onClick={() => navigate(`/opportunity/${opp.id}`)}
                    className="hover:bg-[#F8FAFC] dark:hover:bg-white/5 cursor-pointer"
                  >
                    <td className="py-3 px-4 font-medium max-w-[280px]">
                      <p className="truncate text-[#172033] dark:text-[#F8FAFC]">{opp.title}</p>
                      <p className="font-mono text-[11px] text-[#64748B]">{opp.referenceNumber}</p>
                    </td>
                    <td className="py-3 px-4 text-[#64748B] dark:text-[#CBD5E1] max-w-[200px] truncate">
                      {opp.issuingOrganisation}
                    </td>
                    <td className="py-3 px-4">{opp.countryName}</td>
                    <td className="py-3 px-4 font-mono tabular-nums">{formatDisplayDate(opp.deadlineDate)}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {formatCurrencyValue(opp.estimatedValue, opp.currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[#541B32] dark:text-[#E8A4B5]">
                      {opp.matchScore}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-mono tabular-nums text-[#64748B] dark:text-[#CBD5E1]">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setFilter('page', Math.max(1, page - 1), false)}
                className="p-2 rounded-lg border border-[#E2E8F0] dark:border-white/12 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setFilter('page', Math.min(totalPages, page + 1), false)}
                className="p-2 rounded-lg border border-[#E2E8F0] dark:border-white/12 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Persistent Comparison Tray */}
      {compareIds.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-1.5rem)] max-w-2xl rounded-lg border border-[#A33B59]/40 bg-white dark:bg-[#1B1226] shadow-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Columns className="w-4 h-4 text-[#A33B59] dark:text-[#E8A4B5] shrink-0" />
            <span className="font-semibold truncate">
              {compareIds.length} / 3 opportunities selected for comparison
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={clearCompare}
              className="px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-white/12 font-medium"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => navigate('/discover/compare')}
              className="px-3.5 py-1.5 rounded-lg bg-[#541B32] hover:bg-[#A33B59] text-white font-semibold"
            >
              Compare Side-by-Side →
            </button>
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
}

export function DiscoverExplorerPage() {
  return <OpportunityExplorerCore pageTitle="Opportunity Explorer" breadcrumb="Discovery / Global Explorer" />;
}

export function DiscoverGovernmentPage() {
  return (
    <OpportunityExplorerCore
      pageTitle="Government Contracts & Public Tenders"
      breadcrumb="Discovery / Government"
      lockedCategory="Government Tender"
    />
  );
}

export function DiscoverGrantsPage() {
  return (
    <OpportunityExplorerCore
      pageTitle="Grants & Funding Programmes"
      breadcrumb="Discovery / Grants & Funding"
      lockedCategory="Grant & Funding"
    />
  );
}

export function DiscoverCommercialPage() {
  return (
    <OpportunityExplorerCore
      pageTitle="Commercial Opportunities & Enterprise RFPs"
      breadcrumb="Discovery / Commercial"
      lockedCategory="Commercial"
    />
  );
}

export function DiscoverSearchResultsPage() {
  const { searchQueryParam } = useRouter();
  return (
    <OpportunityExplorerCore
      pageTitle="Search Results"
      breadcrumb="Discovery / Search Results"
      initialQuery={searchQueryParam}
      isSearchResultsPage
    />
  );
}

export function OpportunityComparisonPage() {
  const { navigate, goBack, getBackLabel } = useRouter();
  const { opportunities, compareIds, toggleCompareOpportunity, addToPipeline } = useAppState();
  const selected = opportunities.filter((o) => compareIds.includes(o.id));
  const candidates = opportunities.filter((o) => !compareIds.includes(o.id));

  return (
    <WorkspaceLayout title="Opportunity Comparison" breadcrumb="Discovery / Side-by-Side Comparison">
      <div className="space-y-6">
        <div className="p-5 rounded-lg oppsift-card flex flex-wrap items-center justify-between gap-4 text-xs">
          <div>
            <h2 className="font-display text-base font-bold">Compare Up to 3 Opportunities</h2>
            <p className="text-[#64748B] dark:text-[#CBD5E1] mt-0.5">
              Evaluate contract value, submission deadlines, eligibility confidence, and risk signals side by side.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {compareIds.length < 3 && candidates.length > 0 && (
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) toggleCompareOpportunity(e.target.value);
                }}
                aria-label="Add opportunity to comparison"
                className="h-9 max-w-full px-3 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-xs"
              >
                <option value="">+ Add opportunity to compare...</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.referenceNumber} ({c.countryCode}) — {c.title.slice(0, 42)}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={() => goBack('/discover')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E2E8F0] dark:border-white/12 font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to {getBackLabel('Opportunity Explorer')}</span>
            </button>
          </div>
        </div>

        {selected.length === 0 ? (
          <EmptyStatePanel
            title="No opportunities selected for comparison"
            description="Select 2 or 3 opportunities in Opportunity Explorer to compare requirements, eligibility, and deadlines side by side."
            actionLabel="Browse Opportunities"
            onAction={() => navigate('/discover')}
          />
        ) : (
          <div className="overflow-x-auto rounded-lg oppsift-card">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] dark:bg-white/6 border-b border-[#E2E8F0] dark:border-white/10">
                <tr>
                  <th className="py-4 px-4 font-semibold w-44">Dimension</th>
                  {selected.map((opp) => (
                    <th key={opp.id} className="py-4 px-4 align-top min-w-[260px]">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-mono text-[11px] text-[#A33B59] dark:text-[#E8A4B5]">{opp.referenceNumber}</p>
                          <button
                            type="button"
                            onClick={() => navigate(`/opportunity/${opp.id}`)}
                            className="mt-1 font-display text-sm font-bold text-left hover:underline"
                          >
                            {opp.title}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleCompareOpportunity(opp.id)}
                          aria-label={`Remove ${opp.referenceNumber}`}
                          className="p-1 text-[#64748B] hover:text-[#DC2626]"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-white/8">
                <tr>
                  <td className="py-3 px-4 font-semibold">Issuing Organisation</td>
                  {selected.map((o) => (
                    <td key={o.id} className="py-3 px-4">{o.issuingOrganisation}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold">Jurisdiction &amp; Location</td>
                  {selected.map((o) => (
                    <td key={o.id} className="py-3 px-4">{o.countryName} · {o.location}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold">Estimated Value</td>
                  {selected.map((o) => (
                    <td key={o.id} className="py-3 px-4 font-mono tabular-nums font-semibold">
                      {formatCurrencyValue(o.estimatedValue, o.currency)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold">Deadline &amp; Remaining</td>
                  {selected.map((o) => (
                    <td key={o.id} className="py-3 px-4 font-mono tabular-nums">
                      {formatDisplayDate(o.deadlineDate)} ({getDaysRemaining(o.deadlineDate)}d left)
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold">Profile Alignment</td>
                  {selected.map((o) => (
                    <td key={o.id} className="py-3 px-4 font-mono tabular-nums font-semibold text-[#541B32] dark:text-[#E8A4B5]">
                      {o.matchScore}% match
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold">Eligibility Assessment</td>
                  {selected.map((o) => (
                    <td key={o.id} className="py-3 px-4">
                      <p className="font-semibold">{o.eligibility.status}</p>
                      <p className="text-[#64748B] dark:text-[#CBD5E1] mt-0.5">{o.eligibility.confidenceLabel}</p>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold">Mandatory Docs &amp; Clauses</td>
                  {selected.map((o) => (
                    <td key={o.id} className="py-3 px-4 font-mono tabular-nums">
                      {o.documents.filter((d) => d.isMandatory).length} mandatory docs · {o.requirements.length} clauses
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold">Primary Risks / Gaps</td>
                  {selected.map((o) => (
                    <td key={o.id} className="py-3 px-4 space-y-1 text-[#64748B] dark:text-[#CBD5E1]">
                      {o.eligibility.potentialDisqualifiers.map((d) => (
                        <p key={d} className="text-[#DC2626]">• {d}</p>
                      ))}
                      {o.eligibility.missingInformation.map((m) => (
                        <p key={m} className="text-[#D97706]">• {m}</p>
                      ))}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold">Actions</td>
                  {selected.map((o) => (
                    <td key={o.id} className="py-3 px-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => addToPipeline(o.id)}
                          className="px-3 py-1.5 rounded-lg bg-[#541B32] text-white font-semibold"
                        >
                          Track
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate('/intelligence')}
                          className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-white/12 font-medium inline-flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>AI Brief</span>
                        </button>
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}

export function SourceDetailPage({ sourceId }: { sourceId: string }) {
  const { navigate, goBack, getBackLabel } = useRouter();
  const { opportunities, sources } = useAppState();
  const source = sources.find((s) => s.id === sourceId) ?? null;

  if (!source) {
    return (
      <WorkspaceLayout title="Source unavailable" breadcrumb="Discovery / Sources">
        <EmptyStatePanel
          title="This source is not registered"
          description="Source profiles are published from the live source registry. This source is not present for the current deployment."
          actionLabel="Back to Opportunity Explorer"
          onAction={() => navigate('/discover')}
        />
      </WorkspaceLayout>
    );
  }

  const sourceOpps = opportunities.filter((o) => o.sourceId === source.id);

  return (
    <WorkspaceLayout title={source.name} breadcrumb={`Discovery / ${source.countryCode} / ${source.id}`}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => goBack('/discover')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B] dark:text-[#CBD5E1] hover:text-[#172033] dark:hover:text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to {getBackLabel('Opportunity Explorer')}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/sources')}
            className="text-xs font-medium text-[#164E8B] dark:text-[#38BDF8] hover:underline"
          >
            All Public Sources
          </button>
        </div>

        <section className="p-6 rounded-lg oppsift-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-[#A33B59] dark:text-[#E8A4B5]">
                {source.countryName} · {source.category}
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold">{source.name}</h2>
              <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] mt-1">
                Attribution: {source.attribution}
              </p>
            </div>
            <a
              href={source.officialWebsite}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#541B32] hover:bg-[#A33B59] text-white text-xs font-semibold shrink-0"
            >
              <span>Visit Official Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-[#E2E8F0] dark:border-white/10 text-xs">
            <div>
              <p className="text-[#64748B] dark:text-[#CBD5E1]">Access Method</p>
              <p className="mt-1 font-mono font-semibold">{source.accessMethod}</p>
            </div>
            <div>
              <p className="text-[#64748B] dark:text-[#CBD5E1]">Sync Frequency</p>
              <p className="mt-1 font-semibold">{source.syncFrequency}</p>
            </div>
            <div>
              <p className="text-[#64748B] dark:text-[#CBD5E1]">Availability State</p>
              <p
                className={`mt-1 font-semibold ${
                  source.availability === 'Connected'
                    ? 'text-[#16A34A]'
                    : source.availability === 'Scheduled'
                    ? 'text-[#38BDF8]'
                    : 'text-[#DC2626]'
                }`}
              >
                {source.availability}
              </p>
            </div>
            <div>
              <p className="text-[#64748B] dark:text-[#CBD5E1]">Last Verified Update</p>
              <p className="mt-1 font-mono">{source.lastUpdated}</p>
            </div>
          </div>

          <div className="p-4 rounded-md bg-[#F8FAFC] dark:bg-white/6 border border-[#E2E8F0] dark:border-white/10 text-xs space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-[#164E8B] dark:text-[#38BDF8]" />
              <span>Verification &amp; Normalisation Notes</span>
            </p>
            <p className="text-[#64748B] dark:text-[#CBD5E1]">{source.verificationNotes}</p>
            {source.lastError && <p className="text-[#DC2626] font-mono pt-1">Last Error: {source.lastError}</p>}
          </div>
        </section>

        <section className="p-6 rounded-lg oppsift-card space-y-4">
          <h3 className="font-display text-base font-semibold">
            Indexed Opportunities from {source.name} ({sourceOpps.length})
          </h3>
          {sourceOpps.length === 0 ? (
            <EmptyStatePanel
              title="No active notices loaded from this feed"
              description="OppSift shows only verified portal records matching current sync state."
              actionLabel="Browse Explorer"
              onAction={() => navigate('/discover')}
            />
          ) : (
            <div className="divide-y divide-[#E2E8F0] dark:divide-white/8">
              {sourceOpps.map((o) => (
                <div key={o.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => navigate(`/opportunity/${o.id}`)}
                      className="font-display text-sm font-semibold hover:text-[#A33B59] dark:hover:text-[#E8A4B5] text-left"
                    >
                      {o.title}
                    </button>
                    <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] mt-0.5">
                      {o.issuingOrganisation} · Ref: <span className="font-mono">{o.referenceNumber}</span> · Due{' '}
                      {formatDisplayDate(o.deadlineDate)}
                    </p>
                  </div>
                  <span className="font-mono text-xs tabular-nums shrink-0">
                    {formatCurrencyValue(o.estimatedValue, o.currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </WorkspaceLayout>
  );
}

export function CountryDiscoveryPage({ countryCode }: { countryCode: string }) {
  const { navigate, goBack, getBackLabel } = useRouter();
  const { opportunities, countries, sources } = useAppState();
  const country = countries.find((c) => c.code === countryCode) ?? null;

  if (!country) {
    return (
      <WorkspaceLayout title="Country coverage unavailable" breadcrumb="Discovery / Country">
        <EmptyStatePanel
          title="No coverage record for this jurisdiction"
          description="Country profiles are published from the live coverage table. This jurisdiction has no records yet."
          actionLabel="Back to Opportunity Explorer"
          onAction={() => navigate('/discover')}
        />
      </WorkspaceLayout>
    );
  }

  const countryOpps = opportunities.filter((o) => o.countryCode === country.code);
  // A source counts for every jurisdiction it covers, not only the first one it
  // was registered against; otherwise multi-country feeds disappear from all
  // but their primary market.
  const countrySources = sources.filter((s) =>
    s.countryCodes.includes(country.code) || s.countryCode === country.code,
  );

  return (
    <WorkspaceLayout title={`${country.name} Opportunity Discovery`} breadcrumb={`Discovery / Country / ${country.code}`}>
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => goBack('/discover')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B] dark:text-[#CBD5E1] hover:text-[#172033] dark:hover:text-white"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to {getBackLabel('Opportunity Explorer')}</span>
        </button>

        <div className="rounded-lg oppsift-executive-card text-white border border-[#E2E8F0] dark:border-white/10">
          <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-md bg-white/12 border border-white/20 text-white font-mono text-sm font-bold flex items-center justify-center shrink-0">
                {country.code}
              </div>
              <div>
                <p className="text-xs font-medium text-[#E8A4B5]">
                  {country.region} · Currency: {country.currency} · Timezone: {country.timezone}
                </p>
                <h2 className="mt-0.5 font-display text-2xl font-bold text-white">{country.name} Market Dossier</h2>
                <p className="text-xs text-white/80 mt-1">
                  Coverage: <span className="font-semibold text-[#4ADE80]">{country.coverageStatus}</span> ·{' '}
                  {country.activeSourcesCount} configured sources · Categories: {country.categoriesSupported.join(', ')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="country-jump" className="text-xs text-white/80">
                Switch Country:
              </label>
              <select
                id="country-jump"
                value={country.code}
                onChange={(e) => navigate(`/discover/country/${e.target.value}`)}
                className="h-9 px-3 rounded-md border border-white/20 bg-[#120812]/80 text-white text-xs font-medium"
              >
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.coverageStatus})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="oppsift-intel-rule pt-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 p-5 rounded-lg oppsift-card">
            <h3 className="font-display text-base font-semibold mb-4">Sector Distribution ({country.code})</h3>
            <HorizontalBarChart
              items={country.topSectors.map((s) => ({
                label: s.sector,
                value: s.count,
                accent: 'blue',
              }))}
            />
          </div>

          <div className="lg:col-span-4 p-5 rounded-lg oppsift-card space-y-3">
            <h3 className="font-display text-base font-semibold">Connected Sources</h3>
            {countrySources.length === 0 ? (
              <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">
                No direct feeds configured yet for {country.name}. Coverage status is {country.coverageStatus}.
              </p>
            ) : (
              <div className="space-y-2.5">
                {countrySources.map((src) => (
                  <button
                    key={src.id}
                    type="button"
                    onClick={() => navigate(`/sources/${src.id}`)}
                    className="w-full text-left p-3 rounded-md border border-[#E2E8F0] dark:border-white/12 hover:border-[#A33B59] text-xs flex items-center justify-between gap-2 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{src.name}</p>
                      <p className="text-[#64748B] dark:text-[#CBD5E1] truncate">{src.accessMethod}</p>
                    </div>
                    <span className={src.availability === 'Connected' ? 'text-[#16A34A] font-semibold shrink-0' : 'text-[#DC2626] font-semibold shrink-0'}>
                      {src.availability}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-3 p-5 rounded-lg oppsift-card space-y-3">
            <h3 className="font-display text-base font-semibold">Major Issuing Authorities</h3>
            <ul className="space-y-2 text-xs">
              {country.issuingInstitutions.map((inst) => (
                <li key={inst} className="flex items-start gap-2 text-[#64748B] dark:text-[#CBD5E1]">
                  <Globe className="w-3.5 h-3.5 text-[#164E8B] dark:text-[#38BDF8] shrink-0 mt-0.5" />
                  <span>{inst}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="p-5 rounded-lg oppsift-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-base font-semibold">Indexed Opportunities in {country.name}</h3>
            <button
              type="button"
              onClick={() => navigate('/discover')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#541B32] dark:text-[#E8A4B5] hover:underline"
            >
              <span>All Markets</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {countryOpps.length === 0 ? (
            <EmptyStatePanel
              title={`No active notices loaded for ${country.name}`}
              description="OppSift shows only verified notices rather than fabricating regional records."
              actionLabel="Browse All Markets"
              onAction={() => navigate('/discover')}
            />
          ) : (
            <div className="divide-y divide-[#E2E8F0] dark:divide-white/8">
              {countryOpps.map((o) => (
                <div key={o.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => navigate(`/opportunity/${o.id}`)}
                      className="font-display text-sm font-semibold hover:text-[#541B32] dark:hover:text-[#E8A4B5] text-left"
                    >
                      {o.title}
                    </button>
                    <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] mt-0.5">
                      {o.issuingOrganisation} · {o.category} · Due {formatDisplayDate(o.deadlineDate)}
                    </p>
                  </div>
                  <span className="font-mono text-xs tabular-nums shrink-0">
                    {formatCurrencyValue(o.estimatedValue, o.currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
}
