import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { OpportunityCategory } from '../types/oppsift';

export interface DiscoveryFiltersState {
  query: string;
  exactPhrase: string;
  countryFilter: string;
  regionFilter: string;
  categoryFilter: 'All' | OpportunityCategory;
  sectorFilter: string;
  organisationFilter: string;
  eligibilityFilter: string;
  sourceFilter: string;
  statusFilter: string;
  deadlineWindow: string;
  pubFrom: string;
  pubTo: string;
  minVal: string;
  maxVal: string;
  currencyFilter: string;
  sortBy: 'relevance' | 'deadline' | 'newest' | 'value';
  viewMode: 'cards' | 'table';
  page: number;
}

export const DEFAULT_DISCOVERY_FILTERS: DiscoveryFiltersState = {
  query: '',
  exactPhrase: '',
  countryFilter: 'All',
  regionFilter: 'All',
  categoryFilter: 'All',
  sectorFilter: 'All',
  organisationFilter: 'All',
  eligibilityFilter: 'All',
  sourceFilter: 'All',
  statusFilter: 'All',
  deadlineWindow: 'All',
  pubFrom: '',
  pubTo: '',
  minVal: '',
  maxVal: '',
  currencyFilter: 'All',
  sortBy: 'relevance',
  viewMode: 'cards',
  page: 1,
};

interface HistoryEntry {
  path: string;
  fullUrl: string;
}

interface RouterContextValue {
  path: string;
  searchQueryParam: string;
  historyStack: HistoryEntry[];
  canGoBack: boolean;
  navigate: (to: string, options?: { query?: string; replace?: boolean }) => void;
  goBack: (fallbackPath?: string) => void;
  getBackLabel: (fallbackLabel?: string) => string;
  discoveryFilters: DiscoveryFiltersState;
  setDiscoveryFilters: React.Dispatch<React.SetStateAction<DiscoveryFiltersState>>;
  resetDiscoveryFilters: () => void;
}

const RouterContext = createContext<RouterContextValue | undefined>(undefined);

function getRouteHumanLabel(routePath: string): string {
  if (routePath === '/discover/search') return 'Search Results';
  if (routePath === '/discover') return 'Opportunity Explorer';
  if (routePath === '/discover/government') return 'Government Tenders';
  if (routePath === '/discover/grants') return 'Grants & Funding';
  if (routePath === '/discover/commercial') return 'Commercial RFPs';
  if (routePath === '/discover/compare') return 'Comparison';
  if (routePath.startsWith('/discover/country/')) return 'Country Opportunities';
  if (routePath.startsWith('/sources/')) return 'Source Details';
  if (routePath.startsWith('/opportunity/')) return 'Opportunity Details';
  if (routePath === '/matched') return 'Matched Opportunities';
  if (routePath === '/saved') return 'Saved Opportunities';
  if (routePath === '/saved-searches') return 'Saved Searches';
  if (routePath === '/search-history') return 'Search History';
  if (routePath === '/my-opportunities') return 'My Pipeline';
  if (routePath.startsWith('/my-opportunities/')) return 'Bid Preparation';
  if (routePath === '/alerts') return 'Alerts';
  if (routePath === '/notifications') return 'Notifications';
  if (routePath === '/analytics') return 'Analytics';
  if (routePath === '/reports') return 'Reports';
  if (routePath === '/intelligence') return 'AI Intelligence';
  if (routePath === '/teams') return 'Teams';
  if (routePath === '/profile') return 'My Profile';
  if (routePath === '/settings') return 'Settings';
  if (routePath === '/settings/billing' || routePath === '/billing') return 'Subscription & Billing';
  if (routePath === '/settings/usage') return 'Usage & Limits';
  if (routePath === '/settings/billing/history') return 'Billing History';
  if (routePath === '/settings/billing/change') return 'Change Plan';
  if (routePath === '/settings/security') return 'Account Security';
  if (routePath === '/settings/preferences') return 'Global Preferences';
  if (routePath === '/integrations') return 'Integrations';
  if (routePath === '/support' || routePath === '/help') return 'Help & Support';
  if (routePath === '/dashboard') return 'Dashboard';
  if (routePath === '/pricing') return 'Pricing';
  if (routePath === '/markets') return 'Markets';
  if (routePath === '/sources') return 'Data Sources';
  if (routePath === '/') return 'Homepage';
  return 'Previous Page';
}

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [path, setPath] = useState<string>(() => {
    if (typeof window === 'undefined') return '/';
    const p = window.location.pathname || '/';
    return p === '' ? '/' : p;
  });
  const [searchQueryParam, setSearchQueryParam] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('q') || '';
  });
  const [historyStack, setHistoryStack] = useState<HistoryEntry[]>(() => {
    if (typeof window === 'undefined') return [{ path: '/', fullUrl: '/' }];
    const initialPath = window.location.pathname || '/';
    const initialUrl = `${initialPath}${window.location.search || ''}`;
    return [{ path: initialPath, fullUrl: initialUrl }];
  });

  const [discoveryFilters, setDiscoveryFilters] = useState<DiscoveryFiltersState>(() => ({
    ...DEFAULT_DISCOVERY_FILTERS,
    query:
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('q') || ''
        : '',
  }));

  useEffect(() => {
    const onPopState = () => {
      const nextPath = window.location.pathname || '/';
      const nextSearch = new URLSearchParams(window.location.search).get('q') || '';
      const nextUrl = `${nextPath}${window.location.search || ''}`;
      setPath(nextPath);
      setSearchQueryParam(nextSearch);
      setHistoryStack((prev) => {
        if (prev.length >= 2 && prev[prev.length - 2].fullUrl === nextUrl) {
          return prev.slice(0, -1);
        }
        if (prev[prev.length - 1]?.fullUrl === nextUrl) return prev;
        return [...prev.slice(-24), { path: nextPath, fullUrl: nextUrl }];
      });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((to: string, options?: { query?: string; replace?: boolean }) => {
    const [cleanPath, rawQuery] = to.split('?');
    const normalized = cleanPath || '/';
    const params = new URLSearchParams(rawQuery || '');
    if (options?.query !== undefined) {
      if (options.query) params.set('q', options.query);
      else params.delete('q');
      setDiscoveryFilters((prev) => ({
        ...prev,
        query: options.query ?? '',
        page: 1,
      }));
    }
    const qs = params.toString();
    const fullUrl = qs ? `${normalized}?${qs}` : normalized;

    if (options?.replace) {
      window.history.replaceState({}, '', fullUrl);
      setHistoryStack((prev) => [
        ...prev.slice(0, -1),
        { path: normalized, fullUrl },
      ]);
    } else {
      window.history.pushState({}, '', fullUrl);
      setHistoryStack((prev) => {
        if (prev[prev.length - 1]?.fullUrl === fullUrl) return prev;
        return [...prev.slice(-24), { path: normalized, fullUrl }];
      });
    }

    setPath(normalized);
    setSearchQueryParam(params.get('q') || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const previousEntry =
    historyStack.length >= 2 ? historyStack[historyStack.length - 2] : undefined;
  const canGoBack = Boolean(previousEntry && previousEntry.path !== path);

  const goBack = useCallback(
    (fallbackPath = '/dashboard') => {
      if (previousEntry && previousEntry.path !== path) {
        window.history.replaceState({}, '', previousEntry.fullUrl);
        setHistoryStack((prev) => prev.slice(0, -1));
        setPath(previousEntry.path);
        const qIndex = previousEntry.fullUrl.indexOf('?');
        const qStr = qIndex >= 0 ? previousEntry.fullUrl.slice(qIndex + 1) : '';
        setSearchQueryParam(new URLSearchParams(qStr).get('q') || '');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      navigate(fallbackPath);
    },
    [navigate, path, previousEntry]
  );

  const getBackLabel = useCallback(
    (fallbackLabel = 'Previous Page') => {
      if (previousEntry && previousEntry.path !== path) {
        return getRouteHumanLabel(previousEntry.path);
      }
      return fallbackLabel;
    },
    [path, previousEntry]
  );

  const resetDiscoveryFilters = useCallback(() => {
    setDiscoveryFilters(DEFAULT_DISCOVERY_FILTERS);
  }, []);

  return (
    <RouterContext.Provider
      value={{
        path,
        searchQueryParam,
        historyStack,
        canGoBack,
        navigate,
        goBack,
        getBackLabel,
        discoveryFilters,
        setDiscoveryFilters,
        resetDiscoveryFilters,
      }}
    >
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter(): RouterContextValue {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used inside RouterProvider');
  return ctx;
}
