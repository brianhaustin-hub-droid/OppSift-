import { useEffect, useState } from 'react';

/**
 * Public marketing statistics.
 *
 * The website reads a build-time snapshot (`public/platform-stats.json`, written
 * by `scripts/build-public-stats.mjs` from the aggregate views). It does not
 * query the database from the browser at all: anonymous visitors have no read
 * access to the opportunity, provenance or source-registry tables (migration
 * 0057), and the marketing bundle therefore ships no database client.
 *
 * Definitions, one per figure:
 *
 *   marketsRegistered      markets in the country registry
 *   marketsWithSources     markets with at least one linked source
 *   marketsWithNotices     markets holding verified notices
 *   verifiedNotices        notices marked valid, source-verified and linked to a
 *                          verified source — the only notices OppSift presents
 *                          as verified
 *   registeredSources      source integrations registered in the acquisition
 *                          registry
 *   operationalSources     of those, integrations marked operational
 *   sourcesCollected7d     integrations with a successful retrieval in 7 days
 *
 * A failed read reports the failure; it never falls back to remembered numbers.
 */

type Snapshot = {
  generatedAt?: string;
  stats?: {
    marketsRegistered?: number;
    marketsWithSources?: number;
    marketsWithNotices?: number;
    verifiedNotices?: number;
    registeredSources?: number;
    operationalSources?: number;
    sourcesCollectedRecently?: number;
    newestCollectionAt?: string | null;
  };
  markets?: Array<{
    code?: string;
    name?: string | null;
    region?: string | null;
    records?: number;
    sources?: number;
    activeSources?: number;
    lastSuccessAt?: string | null;
  }>;
  regions?: Array<{
    region?: string | null;
    markets?: number;
    marketsWithNotices?: number;
    records?: number;
  }>;
};

export interface MarketRow {
  code: string;
  name: string;
  region: string;
  records: number;
  sources: number;
  activeSources: number;
  lastSuccessAt: string | null;
}

export interface RegionRow {
  region: string;
  markets: number;
  marketsWithNotices: number;
  records: number;
}

export interface PlatformStats {
  registeredMarkets: number;
  marketsWithSources: number;
  marketsWithNotices: number;
  verifiedNotices: number;
  registeredSources: number;
  operationalSources: number;
  sourcesCollectedRecently: number;
  newestCollectionAt: string | null;
  generatedAt: string | null;
  markets: MarketRow[];
  regions: RegionRow[];
}

export interface PlatformStatsState {
  stats: PlatformStats | null;
  loading: boolean;
  error: string | null;
  configured: boolean;
}

function asNumber(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function formatRegion(region: string | null): string {
  if (!region) return 'International';
  return region
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (character) => character.toUpperCase());
}

async function loadSnapshot(): Promise<PlatformStats> {
  const response = await fetch('/platform-stats.json', { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`The coverage snapshot is unavailable (HTTP ${response.status}).`);
  const snapshot = (await response.json()) as Snapshot;
  const stats = snapshot.stats;
  if (!stats) throw new Error('The coverage snapshot has no figures.');

  const markets: MarketRow[] = (snapshot.markets ?? [])
    .map((row) => ({
      code: row.code ?? '',
      name: row.name?.trim() || row.code || '',
      region: formatRegion(row.region ?? null),
      records: asNumber(row.records),
      sources: asNumber(row.sources),
      activeSources: asNumber(row.activeSources),
      lastSuccessAt: row.lastSuccessAt ?? null,
    }))
    .filter((row) => row.code);
  markets.sort((a, b) => b.records - a.records || a.name.localeCompare(b.name));

  const regions: RegionRow[] = (snapshot.regions ?? [])
    .map((row) => ({
      region: formatRegion(row.region ?? null),
      markets: asNumber(row.markets),
      marketsWithNotices: asNumber(row.marketsWithNotices),
      records: asNumber(row.records),
    }))
    .sort((a, b) => b.records - a.records || a.region.localeCompare(b.region));

  return {
    registeredMarkets: asNumber(stats.marketsRegistered),
    marketsWithSources: asNumber(stats.marketsWithSources),
    marketsWithNotices: asNumber(stats.marketsWithNotices),
    verifiedNotices: asNumber(stats.verifiedNotices),
    registeredSources: asNumber(stats.registeredSources),
    operationalSources: asNumber(stats.operationalSources),
    sourcesCollectedRecently: asNumber(stats.sourcesCollectedRecently),
    newestCollectionAt: stats.newestCollectionAt ?? null,
    generatedAt: snapshot.generatedAt ?? null,
    markets,
    regions,
  };
}

export function usePlatformStats(): PlatformStatsState {
  const [state, setState] = useState<PlatformStatsState>({
    stats: null,
    loading: true,
    error: null,
    configured: true,
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const stats = await loadSnapshot();
        if (!cancelled) setState({ stats, loading: false, error: null, configured: true });
      } catch (error) {
        if (!cancelled) {
          setState({
            stats: null,
            loading: false,
            error: error instanceof Error ? error.message : 'The platform statistics could not be read.',
            configured: true,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
