// Live source verification rules.
//
// A live check answers one question only: did the publisher's registered URL
// reply, and how. It is reachability evidence with a timestamp, not proof that
// notices are being ingested. These helpers classify a real HTTP response,
// describe it without overstating it, and roll a country's checks up into a
// status the UI can show next to the coverage claim.

export type LiveOutcome = 'answered' | 'blocked' | 'unreachable' | 'error';

export type LiveTargetKind = 'feed' | 'website';

/** A stored check is shown as current while it is this fresh. */
export const LIVE_CHECK_FRESH_HOURS = 24;

/** Each probe gives the publisher this long to reply. */
export const LIVE_CHECK_TIMEOUT_MS = 12_000;

export const LIVE_CHECK_USER_AGENT =
  'OppSift-Liveness/1.0 (+source reachability check; https://oppsift.com)';

export const LIVE_OUTCOME_LABELS: Record<LiveOutcome, string> = {
  answered: 'Answered',
  blocked: 'Automated access blocked',
  unreachable: 'Connection failed',
  error: 'Error response',
};

/**
 * Classifies an HTTP status into a live-check outcome.
 *
 * `answered` means the server replied with a usable page or redirect.
 * `blocked` is a deliberate refusal of automated access, which is still a
 * reply: the publisher exists, the crawler is not welcome.
 * `error` is a reply that says the registered resource is not available.
 */
export function classifyLiveStatus(status: number): LiveOutcome {
  if (!Number.isFinite(status) || status <= 0) return 'unreachable';
  if (status >= 200 && status < 400) return 'answered';
  if (status === 401 || status === 403 || status === 407 || status === 429) return 'blocked';
  return 'error';
}

export type LiveCheckLike = {
  last_outcome: string | null;
  last_http_status: number | string | null;
  last_latency_ms: number | string | null;
  last_target_kind: string | null;
  last_checked_at: string | null;
  answered_targets: number | string | null;
  probed_targets: number | string | null;
};

function asOutcome(value: string | null): LiveOutcome | null {
  if (value === 'answered' || value === 'blocked' || value === 'unreachable' || value === 'error') {
    return value;
  }
  return null;
}

function asNumber(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function targetLabel(kind: string | null): string {
  if (kind === 'feed') return 'feed endpoint';
  if (kind === 'website') return 'official website';
  return 'registered URL';
}

/** "Answered · HTTP 200 · 0.9 s · 3 h ago", never more than the check shows. */
export function describeLiveCheck(row: LiveCheckLike, now = Date.now()): string {
  if (!row.last_checked_at) return 'Not yet checked';
  const outcome = asOutcome(row.last_outcome);
  if (!outcome) return 'Not yet checked';
  const parts: string[] = [LIVE_OUTCOME_LABELS[outcome]];
  const status = asNumber(row.last_http_status);
  if (status !== null) parts.push(`HTTP ${status}`);
  const latency = asNumber(row.last_latency_ms);
  if (latency !== null && latency >= 0) {
    parts.push(latency >= 1000 ? `${(latency / 1000).toFixed(1)} s` : `${Math.round(latency)} ms`);
  }
  parts.push(targetLabel(row.last_target_kind));
  const age = formatLiveAge(row.last_checked_at, now);
  if (age) parts.push(age);
  return parts.join(' · ');
}

/** Human age of a stored check: "just now", "12 min ago", "3 d ago". */
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
  const days = Math.round(hours / 24);
  return `${days} d ago`;
}

export function isLiveCheckFresh(checkedAt: string | null, now = Date.now()): boolean {
  if (!checkedAt) return false;
  const time = Date.parse(checkedAt);
  if (!Number.isFinite(time)) return false;
  return now - time <= LIVE_CHECK_FRESH_HOURS * 3_600_000;
}

export type CountryLiveCoverage = 'verified' | 'partial' | 'failed' | 'unchecked';

export type CountryLiveSummary = {
  sourceCount: number;
  checkedCount: number;
  answeredCount: number;
  failedCount: number;
  lastCheckedAt: string | null;
  coverage: CountryLiveCoverage;
  label: string;
  detail: string;
};

export type CountryLiveRow = {
  last_checked_at?: string | null;
  answered_targets?: number | string | null;
};

/**
 * Rolls a country's per-source checks into one honest status.
 *
 * `verified` means every registered source answered at its last check. A
 * blocked publisher is not counted as answered: OppSift could not read it, so
 * it cannot claim it worked.
 */
export function summarizeCountryLive(
  rows: readonly CountryLiveRow[],
  declaredSourceCount = rows.length,
): CountryLiveSummary {
  const sourceCount = Math.max(declaredSourceCount, rows.length);
  let checkedCount = 0;
  let answeredCount = 0;
  let lastCheckedAt: string | null = null;
  for (const row of rows) {
    if (row.last_checked_at) {
      checkedCount += 1;
      if (!lastCheckedAt || row.last_checked_at > lastCheckedAt) lastCheckedAt = row.last_checked_at;
    }
    if (asNumber(row.answered_targets ?? null) !== null && (asNumber(row.answered_targets ?? null) ?? 0) > 0) {
      answeredCount += 1;
    }
  }
  const failedCount = Math.max(0, checkedCount - answeredCount);
  const unseen = Math.max(0, sourceCount - checkedCount);

  let coverage: CountryLiveCoverage;
  if (checkedCount === 0) coverage = 'unchecked';
  else if (answeredCount === sourceCount && sourceCount > 0) coverage = 'verified';
  else if (answeredCount > 0) coverage = 'partial';
  else coverage = 'failed';

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

  return {
    sourceCount,
    checkedCount,
    answeredCount,
    failedCount,
    lastCheckedAt,
    coverage,
    label,
    detail,
  };
}
