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
  /** Content-Type of the newest request, when the endpoint sent one. */
  contentType: string | null;
  /** Content-Type of the newest request that answered. */
  answeredContentType: string | null;
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
  last_content_type: string | null;
  answered_content_type: string | null;
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
  'last_content_type',
  'answered_content_type',
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

/**
 * Names what a feed endpoint delivered, so an HTML tender page is never read as
 * a working data feed just because it answered HTTP 200.
 */
function feedPayloadLabel(contentType: string | null): string | null {
  if (!contentType) return null;
  const type = contentType.toLowerCase();
  if (type.includes('json')) return 'JSON feed';
  if (type.includes('xml')) return 'XML feed';
  if (type.includes('csv')) return 'CSV feed';
  if (type.includes('gzip') || type.includes('zip') || type.includes('octet-stream')) return 'dataset download';
  if (type.includes('html')) return 'HTML page, not a feed';
  return null;
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
  if (row.targetKind === 'feed') {
    const payload = feedPayloadLabel(row.contentType);
    if (payload) parts.push(payload);
  }
  const age = formatLiveAge(row.checkedAt, now);
  if (age) parts.push(age);
  return parts.join(' · ');
}

/**
 * A feed that answered with a web page instead of data, stated separately: the
 * source is reachable through its website, but nobody should read its feed as
 * a working data surface.
 */
export function feedPayloadNote(row: SourceLiveStatus | null | undefined, now = Date.now()): string | null {
  if (!row || row.targetKind !== 'feed' || !row.contentType) return null;
  if (!row.contentType.toLowerCase().includes('html')) return null;
  const age = formatLiveAge(row.checkedAt, now);
  return `Feed check: HTML page, not a feed${row.httpStatus !== null ? ` (HTTP ${row.httpStatus})` : ''}${
    age ? ` · ${age}` : ''
  }`;
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
        contentType: row.answeredContentType,
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

/** The one place coverage is decided, used by both the per-country and index reads. */
function buildSummary(
  declaredSourceCount: number,
  checkedCount: number,
  answeredCount: number,
  lastCheckedAt: string | null,
): CountryLiveSummary {
  const sourceCount = Math.max(0, declaredSourceCount);
  const checked = Math.min(checkedCount, sourceCount);
  const answered = Math.min(answeredCount, checked);
  const failedCount = Math.max(0, checked - answered);
  const unseen = Math.max(0, sourceCount - checked);

  const coverage: LiveCoverage =
    checked === 0
      ? 'unchecked'
      : answered === sourceCount && sourceCount > 0
        ? 'verified'
        : answered > 0
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
      : `${answered} of ${sourceCount} sources answered${age ? ` · checked ${age}` : ''}${
          failedCount > 0 ? ` · ${failedCount} did not answer` : ''
        }${unseen > 0 ? ` · ${unseen} unchecked` : ''}`;

  return {
    sourceCount,
    checkedCount: checked,
    answeredCount: answered,
    failedCount,
    lastCheckedAt,
    coverage,
    label,
    detail,
  };
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
  return buildSummary(sourceCount, checkedCount, answeredCount, lastCheckedAt);
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
      contentType: row.last_content_type,
      answeredContentType: row.answered_content_type,
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

export interface CountryLiveEntry extends CountryLiveSummary {
  countryCode: string;
}

export interface CountryLiveIndexTotals {
  countries: number;
  verified: number;
  partial: number;
  failed: number;
  unchecked: number;
  sources: number;
  answered: number;
  lastCheckedAt: string | null;
}

export interface CountryLiveIndexState {
  byCountry: Map<string, CountryLiveEntry>;
  totals: CountryLiveIndexTotals;
  loading: boolean;
  error: string | null;
}

type CountryLiveRow = {
  country_code: string;
  source_count: number | string | null;
  checked_count: number | string | null;
  answered_count: number | string | null;
  last_checked_at: string | null;
};

const EMPTY_TOTALS: CountryLiveIndexTotals = {
  countries: 0,
  verified: 0,
  partial: 0,
  failed: 0,
  unchecked: 0,
  sources: 0,
  answered: 0,
  lastCheckedAt: null,
};

/** Short label for a country row in a list. */
export function liveCountryTag(entry: CountryLiveEntry | undefined): string {
  if (!entry) return 'not checked';
  if (entry.coverage === 'verified') return 'verified live';
  if (entry.coverage === 'partial') return 'partially verified';
  if (entry.coverage === 'failed') return 'no source answered';
  return 'check pending';
}

export function liveCoverageTone(coverage: LiveCoverage): string {
  if (coverage === 'verified') return 'text-[#16A34A]';
  if (coverage === 'partial') return 'text-[#D97706]';
  if (coverage === 'failed') return 'text-[#DC2626]';
  return 'text-[#64748B] dark:text-[#CBD5E1]';
}

/**
 * Live status for every country in one read, from the stored roll-up view.
 *
 * Lists (All Markets, the Explorer's country filter) need the same evidence the
 * country page shows, without one request per country. A country with no row
 * is absent from the map and renders as "not checked" — never as verified.
 */
export function useCountryLiveIndex(): CountryLiveIndexState {
  const [state, setState] = useState<CountryLiveIndexState>(() => ({
    byCountry: new Map(),
    totals: EMPTY_TOTALS,
    loading: neonClient !== null,
    error: null,
  }));

  useEffect(() => {
    if (!neonClient) {
      setState({ byCountry: new Map(), totals: EMPTY_TOTALS, loading: false, error: null });
      return;
    }
    const db = neonClient as unknown as { from(table: string): LiveQuery };
    let cancelled = false;
    setState({ byCountry: new Map(), totals: EMPTY_TOTALS, loading: true, error: null });

    void (async () => {
      try {
        const result = await db
          .from('country_live_summary')
          .select('country_code, source_count, checked_count, answered_count, last_checked_at')
          .range(0, LIVE_LIMIT - 1);
        if (cancelled) return;
        if (result.error) {
          setState({ byCountry: new Map(), totals: EMPTY_TOTALS, loading: false, error: errorMessage(result.error) });
          return;
        }
        const rows = (Array.isArray(result.data) ? result.data : []) as CountryLiveRow[];
        const byCountry = new Map<string, CountryLiveEntry>();
        const totals: CountryLiveIndexTotals = { ...EMPTY_TOTALS };
        for (const row of rows) {
          if (!row?.country_code) continue;
          const code = row.country_code.toUpperCase();
          const summary = buildSummary(
            asNumber(row.source_count) ?? 0,
            asNumber(row.checked_count) ?? 0,
            asNumber(row.answered_count) ?? 0,
            row.last_checked_at,
          );
          byCountry.set(code, { ...summary, countryCode: code });
          totals.countries += 1;
          totals.sources += summary.sourceCount;
          totals.answered += summary.answeredCount;
          totals[summary.coverage] += 1;
          if (summary.lastCheckedAt && (!totals.lastCheckedAt || summary.lastCheckedAt > totals.lastCheckedAt)) {
            totals.lastCheckedAt = summary.lastCheckedAt;
          }
        }
        setState({ byCountry, totals, loading: false, error: null });
      } catch (error) {
        if (!cancelled) {
          setState({ byCountry: new Map(), totals: EMPTY_TOTALS, loading: false, error: errorMessage(error) });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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
