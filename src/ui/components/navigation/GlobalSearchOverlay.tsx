import React, { useEffect, useState } from 'react';
import { ArrowRight, Clock, Compass, Globe, Search, X } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useRouter } from '../../context/RouterContext';
import { formatCurrencyValue } from '../../data/fixtures';

export function GlobalSearchOverlay() {
  const { navigate } = useRouter();
  const {
    isGlobalSearchOpen,
    setGlobalSearchOpen,
    opportunities,
    countries,
    searchHistory,
    recordSearch,
  } = useAppState();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setGlobalSearchOpen(!isGlobalSearchOpen);
      }
      if (e.key === 'Escape' && isGlobalSearchOpen) {
        setGlobalSearchOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isGlobalSearchOpen, setGlobalSearchOpen]);

  if (!isGlobalSearchOpen) return null;

  const q = query.trim().toLowerCase();
  const oppMatches = opportunities
    .filter(
      (o) =>
        !q ||
        o.title.toLowerCase().includes(q) ||
        o.referenceNumber.toLowerCase().includes(q) ||
        o.issuingOrganisation.toLowerCase().includes(q) ||
        o.sector.toLowerCase().includes(q)
    )
    .slice(0, 4);

  const countryMatches = countries.filter(
    (c) => !q || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
  ).slice(0, 3);

  const categories = [
    { label: 'Government Tenders', route: '/discover/government' },
    { label: 'Grants & Funding', route: '/discover/grants' },
    { label: 'Commercial Contracts', route: '/discover/commercial' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      recordSearch(query.trim(), 'Global Search Overlay', oppMatches.length);
    }
    setGlobalSearchOpen(false);
    navigate('/discover/search', { query: query.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/55 backdrop-blur-xs" role="dialog" aria-modal="true" aria-label="Global Opportunity Search">
      <div className="w-full max-w-2xl rounded-lg border border-[#E2E8F0] dark:border-white/15 bg-white dark:bg-[#171324] shadow-2xl overflow-hidden">
        <form onSubmit={handleSubmit} className="flex items-center gap-3 px-4 py-3.5 border-b border-[#E2E8F0] dark:border-white/10">
          <Search className="w-4 h-4 text-[#A33B59] dark:text-[#E8A4B5] shrink-0" />
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search opportunities, countries, references, or categories..."
            className="flex-1 bg-transparent text-sm text-[#172033] dark:text-[#F8FAFC] placeholder:text-[#64748B] dark:placeholder:text-[#CBD5E1]/70 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-xs text-[#64748B] hover:text-[#172033] dark:hover:text-white px-2"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={() => setGlobalSearchOpen(false)}
            aria-label="Close global search"
            className="p-1.5 rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </form>

        <div className="max-h-[70vh] overflow-y-auto p-4 space-y-5">
          {/* Opportunities */}
          <div>
            <p className="text-[11px] font-semibold text-[#64748B] dark:text-[#CBD5E1] mb-2">
              {q ? 'Matching Opportunities' : 'Featured Opportunities'}
            </p>
            {oppMatches.length === 0 ? (
              <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] py-2">No notices match &ldquo;{query}&rdquo;.</p>
            ) : (
              <div className="space-y-1">
                {oppMatches.map((opp) => (
                  <button
                    key={opp.id}
                    type="button"
                    onClick={() => {
                      setGlobalSearchOpen(false);
                      navigate(`/opportunity/${opp.id}`);
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[#F8FAFC] dark:hover:bg-white/6 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#172033] dark:text-[#F8FAFC] truncate">{opp.title}</p>
                      <p className="text-[11px] text-[#64748B] dark:text-[#CBD5E1] truncate">
                        {opp.countryName} · {opp.referenceNumber} · {opp.issuingOrganisation}
                      </p>
                    </div>
                    <span className="font-mono text-[11px] tabular-nums text-[#541B32] dark:text-[#E8A4B5] shrink-0">
                      {formatCurrencyValue(opp.estimatedValue, opp.currency)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Countries & Categories */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#E2E8F0] dark:border-white/10">
            <div>
              <p className="text-[11px] font-semibold text-[#64748B] dark:text-[#CBD5E1] mb-2">Markets &amp; Countries</p>
              <div className="space-y-1">
                {countryMatches.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      setGlobalSearchOpen(false);
                      navigate(`/discover/country/${c.code}`);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#F8FAFC] dark:hover:bg-white/6 flex items-center justify-between text-xs"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-[#164E8B] dark:text-[#38BDF8]" />
                      <span>{c.name}</span>
                    </span>
                    <span className="font-mono text-[11px] text-[#64748B]">{c.currency}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-[#64748B] dark:text-[#CBD5E1] mb-2">Category Shortcuts</p>
              <div className="space-y-1">
                {categories.map((cat) => (
                  <button
                    key={cat.route}
                    type="button"
                    onClick={() => {
                      setGlobalSearchOpen(false);
                      navigate(cat.route);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#F8FAFC] dark:hover:bg-white/6 flex items-center justify-between text-xs"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Compass className="w-3.5 h-3.5 text-[#A33B59] dark:text-[#E8A4B5]" />
                      <span>{cat.label}</span>
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#64748B]" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Queries */}
          {searchHistory.length > 0 && (
            <div className="pt-3 border-t border-[#E2E8F0] dark:border-white/10">
              <p className="text-[11px] font-semibold text-[#64748B] dark:text-[#CBD5E1] mb-2">Recent Searches</p>
              <div className="flex flex-wrap gap-2">
                {searchHistory.slice(0, 4).map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => {
                      setGlobalSearchOpen(false);
                      navigate('/discover/search', { query: h.query });
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#E2E8F0] dark:border-white/12 text-xs hover:border-[#A33B59]"
                  >
                    <Clock className="w-3 h-3 text-[#64748B]" />
                    <span>{h.query}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
