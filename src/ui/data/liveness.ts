import { useEffect, useState } from 'react';
import { neonClient } from '../../app/auth/neon-client';

// Reads the stored live checks of a country's registered sources.
//
// Each row is the result of a real HTTP request to the publisher's endpoint,
// written by scripts/check-source-liveness.mjs. The view exposes the newest
// check per source plus how many of its endpoints answered, so the page can
// state what was observed and how old the observation is. Nothing here infers
// a result that was not recorded: a source with no check reads as "Not yet
// checked".

export type LiveOutcome = 'answered' | 'blocked' | 'unreachable' | 'error';

export type LiveCoverage = 'verified' | 'partial' | 'failed' | 'unchecked';

export interface SourceLiveStatus {
  sourceId: string;
  /** Result of the newest request, whichever endpoint it went to. */
  outcome: LiveOutcome | null;
  httpStatus: number | null;
  latencyMs: number | null;
  checkedAt: string | null;
  targetKind: 'feed' | 'website' | null;
  targetUrl: string | null;
  lastErrorMessage: string | null;
  lastAnsweredAt: string | null;
  answeredTargets: number;
  probedTargets: number;
  /** Newest request that did answer, used when the newest request did not. */
  answeredHttpStatus: number | null;
  answeredLatencyMs: number | null;
  answeredTargetKind: 'feed' | 'website' | null;
  answeredCheckedAt: string | null;
}

export interface CountryLiveSummary {
  sourceCount: number;
  checkedCount: number;
  answeredCount: number;
  failedCount: number;
  lastCheckedAt: string | null;
  coverage: LiveCoverage;
  label: string;
  detail: string;
}

export interface CountryLiveState {
  bySourceId: Map<string, SourceLiveStatus>;
  summary: CountryLiveSummary;
  loading: boolean;
  error: string | null;
}

type LiveRow = {
  country_code: string;
  source_id: string;
  last_checked_at: string | null;
  last_outcome: string | null;
  last_http_status: number | string | null;
  last_latency_ms: number | string | null;
  last_target_url: string | null;
  last_target_kind: string | null;
  last_error_message: string | null;
  probed_targets: number | string | null;
  answered_targets: number | string | null;
  last_answered_at: string | null;
  answered_http_status: number | string | null;
  answered_latency_ms: number | string | null;
  answered_target_kind: string | null;
  answered_target_url: string | null;
  answered_checked_at: string | null;
};

type LiveQuery = {
  select(columns: string): LiveQuery;
  eq(column: string, value: string): LiveQuery;
  range(from: number, to: number): PromiseLike<{ data: unknown; error: unknown }>;
};

const LIVE_COLUMNS = [
  'country_code',
  'source_id',
  'last_checked_at',
  'last_outcome',
  'last_http_status',
  'last_latency_ms',
  'last_target_url',
  'last_target_kind',
  'last_error_message',
  'probed_targets',
  'answered_targets',
  'last_answered_at',
  'answered_http_status',
  'answered_latency_ms',
  'answered_target_kind',
  'answered_target_url',
  'answered_checked_at',
].join(', ');

const LIVE_LIMIT = 500;

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return 'The live source checks could not be reached.';
}

function asNumber(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asOutcome(value: string | null): LiveOutcome | null {
  if (value === 'answered' || value === 'blocked' || value === 'unreachable' || value === 'error') {
    return value;
  }
  return null;
}

export function formatLiveAge(checkedAt: string | null, now = Date.now()): string {
  if (!checkedAt) return '';
  const time = Date.parse(checkedAt);
  if (!Number.isFinite(time)) return '';
  const seconds = Math.max(0, Math.round((now - time) / 1000));
  if (seconds < 90) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 90) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 36) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

const OUTCOME_LABELS: Record<LiveOutcome, string> = {
  answered: 'Answered',
  blocked: 'Automated access blocked',
  unreachable: 'Connection failed',
  error: 'Error response',
};

function targetLabel(kind: string | null): string {
  if (kind === 'feed') return 'feed endpoint';
  if (kind === 'website') return 'official website';
  return 'registered URL';
}

/** "Answered · HTTP 200 · 908 ms · official website · 12 min ago". */
export function describeLiveCheck(row: SourceLiveStatus, now = Date.now()): string {
  if (!row.checkedAt || !row.outcome) return 'Not yet checked';
  const parts: string[] = [OUTCOME_LABELS[row.outcome]];
  if (row.httpStatus !== null) parts.push(`HTTP ${row.httpStatus}`);
  if (row.latencyMs !== null && row.latencyMs >= 0) {
    parts.push(row.latencyMs >= 1000 ? `${(row.latencyMs / 1000).toFixed(1)} s` : `${row.latencyMs} ms`);
  }
  parts.push(targetLabel(row.targetKind));
  const age = formatLiveAge(row.checkedAt, now);
  if (age) parts.push(age);
  return parts.join(' · ');
}

/**
 * Describes the endpoint that answered when one did, so a source whose feed
 * refuses automated access but whose website replied reads as reachable — and
 * a source that never answered reads as its failure.
 */
export function describeLiveStatus(row: SourceLiveStatus, now = Date.now()): string {
  if (row.answeredTargets > 0 && row.answeredCheckedAt) {
    return describeLiveCheck(
      {
        ...row,
        outcome: 'answered',
        httpStatus: row.answeredHttpStatus,
        latencyMs: row.answeredLatencyMs,
        targetKind: row.answeredTargetKind,
        checkedAt: row.answeredCheckedAt,
      },
      now,
    );
  }
  return describeLiveCheck(row, now);
}

export function liveOutcomeTone(outcome: LiveOutcome | null): string {
  if (outcome === 'answered') return 'text-[#16A34A]';
  if (outcome === 'blocked') return 'text-[#D97706]';
  if (outcome === 'unreachable' || outcome === 'error') return 'text-[#DC2626]';
  return 'text-[#64748B] dark:text-[#CBD5E1]';
}

function summarize(statuses: readonly SourceLiveStatus[], declaredSourceCount: number): CountryLiveSummary {
  const sourceCount = Math.max(declaredSourceCount, statuses.length);
  let checkedCount = 0;
  let answeredCount = 0;
  let lastCheckedAt: string | null = null;
  for (const status of statuses) {
    if (status.checkedAt) {
      checkedCount += 1;
      if (!lastCheckedAt || status.checkedAt > lastCheckedAt) lastCheckedAt = status.checkedAt;
    }
    if (status.answeredTargets > 0) answeredCount += 1;
  }
  const failedCount = Math.max(0, checkedCount - answeredCount);
  const unseen = Math.max(0, sourceCount - checkedCount);

  const coverage: LiveCoverage =
    checkedCount === 0
      ? 'unchecked'
      : answeredCount === sourceCount && sourceCount > 0
        ? 'verified'
        : answeredCount > 0
          ? 'partial'
          : 'failed';

  const label =
    coverage === 'verified'
      ? 'Verified live'
      : coverage === 'partial'
        ? 'Partially verified'
        : coverage === 'failed'
          ? 'Sources unreachable'
          : 'Live check pending';

  const age = formatLiveAge(lastCheckedAt);
  const detail =
    coverage === 'unchecked'
      ? `${sourceCount} registered source${sourceCount === 1 ? '' : 's'} awaiting a live check`
      : `${answeredCount} of ${sourceCount} sources answered${age ? ` · checked ${age}` : ''}${
          failedCount > 0 ? ` · ${failedCount} did not answer` : ''
        }${unseen > 0 ? ` · ${unseen} unchecked` : ''}`;

  return { sourceCount, checkedCount, answeredCount, failedCount, lastCheckedAt, coverage, label, detail };
}

function parseLiveRows(rows: readonly LiveRow[]): Map<string, SourceLiveStatus> {
  const bySourceId = new Map<string, SourceLiveStatus>();
  for (const row of rows) {
    if (!row?.source_id || bySourceId.has(row.source_id)) continue;
    bySourceId.set(row.source_id, {
      sourceId: row.source_id,
      outcome: asOutcome(row.last_outcome),
      httpStatus: asNumber(row.last_http_status),
      latencyMs: asNumber(row.last_latency_ms),
      checkedAt: row.last_checked_at,
      lastAnsweredAt: row.last_answered_at,
      answeredTargets: asNumber(row.answered_targets) ?? 0,
      probedTargets: asNumber(row.probed_targets) ?? 0,
      targetKind:
        row.last_target_kind === 'feed' || row.last_target_kind === 'website' ? row.last_target_kind : null,
      targetUrl: row.last_target_url,
      lastErrorMessage: row.last_error_message,
      answeredHttpStatus: asNumber(row.answered_http_status),
      answeredLatencyMs: asNumber(row.answered_latency_ms),
      answeredTargetKind:
        row.answered_target_kind === 'feed' || row.answered_target_kind === 'website'
          ? row.answered_target_kind
          : null,
      answeredCheckedAt: row.answered_checked_at,
    });
  }
  return bySourceId;
}

const EMPTY_SUMMARY: CountryLiveSummary = {
  sourceCount: 0,
  checkedCount: 0,
  answeredCount: 0,
  failedCount: 0,
  lastCheckedAt: null,
  coverage: 'unchecked',
  label: 'Live check pending',
  detail: 'Registered sources awaiting a live check',
};

export function useCountryLiveStatus(countryCode: string, declaredSourceCount = 0): CountryLiveState {
  const [state, setState] = useState<CountryLiveState>(() => ({
    bySourceId: new Map(),
    summary: { ...EMPTY_SUMMARY, sourceCount: declaredSourceCount },
    loading: neonClient !== null,
    error: null,
  }));

  useEffect(() => {
    if (!neonClient || !countryCode) {
      setState({
        bySourceId: new Map(),
        summary: { ...EMPTY_SUMMARY, sourceCount: declaredSourceCount },
        loading: false,
        error: null,
      });
      return;
    }
    const db = neonClient as unknown as { from(table: string): LiveQuery };
    let cancelled = false;
    setState({
      bySourceId: new Map(),
      summary: { ...EMPTY_SUMMARY, sourceCount: declaredSourceCount },
      loading: true,
      error: null,
    });

    void (async () => {
      try {
        const result = await db
          .from('country_source_live_status')
          .select(LIVE_COLUMNS)
          .eq('country_code', countryCode.toUpperCase())
          .range(0, LIVE_LIMIT - 1);
        if (cancelled) return;
        if (result.error) {
          setState({
            bySourceId: new Map(),
            summary: { ...EMPTY_SUMMARY, sourceCount: declaredSourceCount },
            loading: false,
            error: errorMessage(result.error),
          });
          return;
        }
        const rows = (Array.isArray(result.data) ? result.data : []) as LiveRow[];
        const bySourceId = parseLiveRows(rows);
        setState({
          bySourceId,
          summary: summarize([...bySourceId.values()], declaredSourceCount),
          loading: false,
          error: null,
        });
      } catch (error) {
        if (!cancelled) {
          setState({
            bySourceId: new Map(),
            summary: { ...EMPTY_SUMMARY, sourceCount: declaredSourceCount },
            loading: false,
            error: errorMessage(error),
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [countryCode, declaredSourceCount]);

  return state;
}

export interface SourceLiveState {
  status: SourceLiveStatus | null;
  loading: boolean;
  error: string | null;
}

/** Newest stored live check for one source, read from the source-keyed view. */
export function useSourceLiveStatus(sourceId: string): SourceLiveState {
  const [state, setState] = useState<SourceLiveState>(() => ({
    status: null,
    loading: neonClient !== null,
    error: null,
  }));

  useEffect(() => {
    if (!neonClient || !sourceId) {
      setState({ status: null, loading: false, error: null });
      return;
    }
    const db = neonClient as unknown as { from(table: string): LiveQuery };
    let cancelled = false;
    setState({ status: null, loading: true, error: null });

    void (async () => {
      try {
        const result = await db
          .from('country_source_live_status')
          .select(LIVE_COLUMNS)
          .eq('source_id', sourceId)
          .range(0, 0);
        if (cancelled) return;
        if (result.error) {
          setState({ status: null, loading: false, error: errorMessage(result.error) });
          return;
        }
        const rows = (Array.isArray(result.data) ? result.data : []) as LiveRow[];
        setState({ status: parseLiveRows(rows).get(sourceId) ?? null, loading: false, error: null });
      } catch (error) {
        if (!cancelled) setState({ status: null, loading: false, error: errorMessage(error) });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sourceId]);

  return state;
}
