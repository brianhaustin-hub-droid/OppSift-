import { useEffect, useState } from 'react';
import { neonClient } from '../../app/auth/neon-client';
import siteContent from '../../seo/site-content.json';

/**
 * The fifteen official sources on the homepage, matched against the live
 * source registry and the newest stored HTTP check.
 *
 * Nothing here is a hardcoded status: a candidate is only described as
 * delivering records when the registry row says it is operational and records
 * a successful retrieval. A source with no registry row is shown as not
 * integrated, which is the truthful description of a candidate we have not
 * connected.
 */

type RegistryRow = {
  id: string;
  name: string;
  publisher: string | null;
  official_website: string | null;
  integration_status: string | null;
  source_health: string | null;
  last_successful_retrieval: string | null;
  access_method: string | null;
  supported_categories: string[] | null;
};

type LiveRow = {
  source_id: string;
  country_code: string;
  answered_targets: number | string | null;
  probed_targets: number | string | null;
  last_checked_at: string | null;
  last_outcome: string | null;
  answered_checked_at: string | null;
};

type Query = {
  select(columns: string): Query;
  range(from: number, to: number): PromiseLike<{ data: unknown; error: unknown }>;
};

export type SourceStatus =
  | 'delivering'
  | 'connected_unverified'
  | 'unreachable'
  | 'registered'
  | 'not-integrated';

export interface ShowcaseSource {
  key: string;
  name: string;
  publisher: string;
  market: string;
  category: string;
  access: string;
  website: string;
  status: SourceStatus;
  statusLabel: string;
  detail: string;
  registryName: string | null;
}

export interface SourceShowcaseState {
  sources: ShowcaseSource[];
  counts: Record<SourceStatus, number>;
  loading: boolean;
  error: string | null;
}

const CANDIDATES = siteContent.sources.candidates;

const EMPTY_COUNTS: Record<SourceStatus, number> = {
  delivering: 0,
  connected_unverified: 0,
  unreachable: 0,
  registered: 0,
  'not-integrated': 0,
};

function asNumber(value: number | string | null): number {
  if (value === null) return 0;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value: string | null): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

function ageLabel(value: string | null): string {
  if (!value) return '';
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return '';
  const minutes = Math.max(0, Math.round((Date.now() - time) / 60000));
  if (minutes < 90) return 'just now';
  const hours = Math.round(minutes / 60);
  if (hours < 36) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

const STATUS_LABELS: Record<SourceStatus, string> = {
  delivering: 'Delivering records',
  connected_unverified: 'Connected, no retrieval recorded',
  unreachable: 'Latest check did not answer',
  registered: 'Registered, not connected',
  'not-integrated': 'Not integrated',
};

function describeStatus(
  status: SourceStatus,
  row: RegistryRow | undefined,
  live: LiveRow | undefined,
): string {
  if (status === 'not-integrated' || !row) {
    return 'No registry entry and no live check recorded.';
  }
  const retrieval = formatDate(row.last_successful_retrieval);
  const checked = ageLabel(live?.last_checked_at ?? live?.answered_checked_at ?? null);
  if (status === 'delivering') {
    return retrieval
      ? `Successful retrieval recorded ${retrieval}${checked ? ` · latest check ${checked}` : ''}`
      : 'Operational connector with a recorded retrieval.';
  }
  if (status === 'connected_unverified') {
    const answered = asNumber(live?.answered_targets ?? null);
    const probed = asNumber(live?.probed_targets ?? null);
    return answered > 0
      ? `Endpoint answered (${answered}/${probed || answered})${checked ? ` ${checked}` : ''} · no successful ingestion recorded`
      : 'Operational connector, but no retrieval or live check is recorded.';
  }
  if (status === 'unreachable') {
    const outcome = live?.last_outcome;
    return `Latest stored check did not answer${outcome ? ` (${outcome})` : ''}${
      checked ? ` · ${checked}` : ''
    }.`;
  }
  return 'Present in the source catalogue only; no connector is operational.';
}

function matchCandidate(
  candidate: (typeof CANDIDATES)[number],
  rows: readonly RegistryRow[],
): RegistryRow | undefined {
  const pattern = new RegExp(candidate.match, 'i');
  return rows.find((row) => pattern.test(row.name));
}

function buildShowcase(
  rows: readonly RegistryRow[],
  liveRows: readonly LiveRow[],
): SourceShowcaseState {
  const liveBySource = new Map<string, LiveRow>();
  for (const row of liveRows) {
    const existing = liveBySource.get(row.source_id);
    const rowChecked = row.last_checked_at ?? '';
    const existingChecked = existing?.last_checked_at ?? '';
    if (!existing || rowChecked > existingChecked) liveBySource.set(row.source_id, row);
  }

  const counts: Record<SourceStatus, number> = { ...EMPTY_COUNTS };

  const sources: ShowcaseSource[] = CANDIDATES.map((candidate) => {
    const registry = matchCandidate(candidate, rows);
    const live = registry ? liveBySource.get(registry.id) : undefined;

    let status: SourceStatus = 'not-integrated';
    if (registry) {
      const operational = registry.integration_status === 'operational';
      const answered = asNumber(live?.answered_targets ?? null) > 0;
      if (!operational) status = 'registered';
      else if (registry.last_successful_retrieval) status = 'delivering';
      else if (answered) status = 'connected_unverified';
      else if (live) status = 'unreachable';
      else status = 'connected_unverified';
    }
    counts[status] += 1;

    return {
      key: candidate.key,
      name: candidate.name,
      publisher: registry?.publisher?.trim() || candidate.publisher,
      market: candidate.market,
      category: candidate.category,
      access: candidate.access,
      website: registry?.official_website?.trim() || candidate.website,
      status,
      statusLabel: STATUS_LABELS[status],
      detail: describeStatus(status, registry, live),
      registryName: registry?.name ?? null,
    };
  });

  return { sources, counts, loading: false, error: null };
}

export function useSourceShowcase(): SourceShowcaseState {
  const [state, setState] = useState<SourceShowcaseState>(() => ({
    sources: [],
    counts: { ...EMPTY_COUNTS },
    loading: neonClient !== null,
    error: null,
  }));

  useEffect(() => {
    if (!neonClient) {
      setState({
        sources: [],
        counts: { ...EMPTY_COUNTS },
        loading: false,
        error: null,
      });
      return;
    }
    const db = neonClient as unknown as { from(table: string): Query };
    let cancelled = false;

    void (async () => {
      try {
        const [registryResult, liveResult] = await Promise.all([
          db
            .from('opportunity_sources')
            .select(
              'id, name, publisher, official_website, integration_status, source_health, last_successful_retrieval, access_method, supported_categories',
            )
            .range(0, 999),
          db
            .from('country_source_live_status')
            .select(
              'source_id, country_code, answered_targets, probed_targets, last_checked_at, last_outcome, answered_checked_at',
            )
            .range(0, 999),
        ]);
        if (cancelled) return;
        if (registryResult.error) {
          setState({
            sources: [],
            counts: { ...EMPTY_COUNTS },
            loading: false,
            error: 'The source registry could not be read.',
          });
          return;
        }
        const rows = (Array.isArray(registryResult.data) ? registryResult.data : []) as RegistryRow[];
        const liveRows = liveResult.error
          ? []
          : ((Array.isArray(liveResult.data) ? liveResult.data : []) as LiveRow[]);
        setState(buildShowcase(rows, liveRows));
      } catch {
        if (!cancelled) {
          setState({
            sources: [],
            counts: { ...EMPTY_COUNTS },
            loading: false,
            error: 'The source registry could not be read.',
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

export function sourceStatusTone(status: SourceStatus): string {
  if (status === 'delivering') return 'text-[#15803D] dark:text-[#4ADE80]';
  if (status === 'connected_unverified') return 'text-[#0369A1] dark:text-[#7DD3FC]';
  if (status === 'unreachable') return 'text-[#B45309] dark:text-[#FCD34D]';
  if (status === 'registered') return 'text-[#64748B] dark:text-[#CBD5E1]';
  return 'text-[#94A3B8] dark:text-[#94A3B8]';
}

export function sourceStatusDot(status: SourceStatus): string {
  if (status === 'delivering') return 'bg-[#16A34A]';
  if (status === 'connected_unverified') return 'bg-[#0EA5E9]';
  if (status === 'unreachable') return 'bg-[#D97706]';
  if (status === 'registered') return 'bg-[#94A3B8]';
  return 'bg-[#CBD5E1] dark:bg-[#475569]';
}
