import { useEffect, useState } from 'react';
import { neonClient } from '../../app/auth/neon-client';

/**
 * Public marketing statistics, read from the small aggregate views.
 *
 * The public website must never pull the opportunity corpus: it would expose
 * records to anonymous visitors and download the whole table for a handful of
 * numbers. This hook reads only the country registry, the coverage roll-up and
 * the source registry, and derives every figure from rows it can actually see.
 * A figure with no rows behind it is reported as unavailable, never estimated.
 */

type CountryRow = {
  alpha2_code: string;
  name: string;
  region: string | null;
};

type CoverageRow = {
  code: string;
  status: string | null;
  last_success_at: string | null;
  record_count: number | string | null;
  source_count: number | string | null;
  active_source_count: number | string | null;
};

type SourceRow = {
  id: string;
  integration_status: string | null;
  source_health: string | null;
  last_successful_retrieval: string | null;
};

type Query = {
  select(columns: string): Query;
  range(from: number, to: number): PromiseLike<{ data: unknown; error: unknown }>;
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
  marketsWithRecords: number;
  records: number;
}

export interface PlatformStats {
  registeredMarkets: number;
  marketsWithRecords: number;
  marketsWithSources: number;
  storedNotices: number;
  registeredSources: number;
  operationalSources: number;
  sourcesCollectedRecently: number;
  newestCollectionAt: string | null;
  markets: MarketRow[];
  regions: RegionRow[];
}

export interface PlatformStatsState {
  stats: PlatformStats | null;
  loading: boolean;
  error: string | null;
  configured: boolean;
}

const EMPTY_STATE: PlatformStatsState = {
  stats: null,
  loading: false,
  error: null,
  configured: false,
};

const ROW_LIMIT = 1000;

function asNumber(value: number | string | null): number {
  if (value === null) return 0;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return 'The platform statistics could not be read.';
}

export function formatRegion(region: string | null): string {
  if (!region) return 'International';
  return region
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (character) => character.toUpperCase());
}

function buildStats(
  countryRows: readonly CountryRow[],
  coverageRows: readonly CoverageRow[],
  sourceRows: readonly SourceRow[],
): PlatformStats {
  const countryByCode = new Map(
    countryRows.map((row) => [row.alpha2_code.toUpperCase(), row]),
  );

  const regions = new Map<string, RegionRow>();
  const markets: MarketRow[] = [];
  let storedNotices = 0;
  let marketsWithRecords = 0;
  let marketsWithSources = 0;
  let newestCollectionAt: string | null = null;

  for (const row of coverageRows) {
    const code = row.code.toUpperCase();
    const country = countryByCode.get(code);
    const region = formatRegion(country?.region ?? null);
    const records = asNumber(row.record_count);
    const sources = asNumber(row.source_count);
    const activeSources = asNumber(row.active_source_count);
    if (records > 0) marketsWithRecords += 1;
    if (sources > 0) marketsWithSources += 1;
    storedNotices += records;
    if (row.last_success_at && (!newestCollectionAt || row.last_success_at > newestCollectionAt)) {
      newestCollectionAt = row.last_success_at;
    }

    const regionEntry =
      regions.get(region) ?? { region, markets: 0, marketsWithRecords: 0, records: 0 };
    regionEntry.markets += 1;
    if (records > 0) regionEntry.marketsWithRecords += 1;
    regionEntry.records += records;
    regions.set(region, regionEntry);

    markets.push({
      code,
      name: country?.name ?? code,
      region,
      records,
      sources,
      activeSources,
      lastSuccessAt: row.last_success_at,
    });
  }

  const registeredMarkets = countryRows.length || coverageRows.length;
  const operationalSources = sourceRows.filter(
    (row) => row.integration_status === 'operational',
  ).length;
  const recentCutoff = Date.now() - 7 * 86_400_000;
  const sourcesCollectedRecently = sourceRows.filter((row) => {
    if (!row.last_successful_retrieval) return false;
    const time = Date.parse(row.last_successful_retrieval);
    return Number.isFinite(time) && time >= recentCutoff;
  }).length;

  markets.sort((a, b) => b.records - a.records || a.name.localeCompare(b.name));

  return {
    registeredMarkets,
    marketsWithRecords,
    marketsWithSources,
    storedNotices,
    registeredSources: sourceRows.length,
    operationalSources,
    sourcesCollectedRecently,
    newestCollectionAt,
    markets,
    regions: [...regions.values()].sort((a, b) => b.records - a.records || a.region.localeCompare(b.region)),
  };
}

export function usePlatformStats(): PlatformStatsState {
  const [state, setState] = useState<PlatformStatsState>(() =>
    neonClient
      ? { stats: null, loading: true, error: null, configured: true }
      : EMPTY_STATE,
  );

  useEffect(() => {
    if (!neonClient) {
      setState(EMPTY_STATE);
      return;
    }
    const db = neonClient as unknown as { from(table: string): Query };
    let cancelled = false;

    void (async () => {
      try {
        const [countryResult, coverageResult, sourceResult] = await Promise.all([
          db.from('global_countries').select('alpha2_code, name, region').range(0, ROW_LIMIT - 1),
          db
            .from('coverage_truth')
            .select('code, status, last_success_at, record_count, source_count, active_source_count')
            .range(0, ROW_LIMIT - 1),
          db
            .from('opportunity_sources')
            .select('id, integration_status, source_health, last_successful_retrieval')
            .range(0, ROW_LIMIT - 1),
        ]);
        if (cancelled) return;

        const failure = countryResult.error ?? coverageResult.error ?? sourceResult.error;
        if (failure) {
          setState({
            stats: null,
            loading: false,
            error: errorMessage(failure),
            configured: true,
          });
          return;
        }

        const countryRows = (Array.isArray(countryResult.data) ? countryResult.data : []) as CountryRow[];
        const coverageRows = (Array.isArray(coverageResult.data) ? coverageResult.data : []) as CoverageRow[];
        const sourceRows = (Array.isArray(sourceResult.data) ? sourceResult.data : []) as SourceRow[];

        if (coverageRows.length === 0 && sourceRows.length === 0) {
          setState({
            stats: null,
            loading: false,
            error: 'No platform coverage has been recorded yet.',
            configured: true,
          });
          return;
        }

        setState({
          stats: buildStats(countryRows, coverageRows, sourceRows),
          loading: false,
          error: null,
          configured: true,
        });
      } catch (error) {
        if (!cancelled) {
          setState({
            stats: null,
            loading: false,
            error: errorMessage(error),
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
