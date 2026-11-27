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

/**
 * Why a probe failed, in the terms a publisher can act on.
 *
 * "Connection failed" is useless in an outreach email; "TLS certificate
 * expired" or "chain incomplete" is something their web team can fix today.
 * The class is derived from what Node reported, never assumed.
 */
export type LiveFailureClass =
  | 'dns_not_found'
  | 'tls_expired'
  | 'tls_incomplete_chain'
  | 'tls_name_mismatch'
  | 'tls_handshake'
  | 'timeout'
  | 'connection_reset'
  | 'blocked'
  | 'http_error'
  | 'not_a_feed'
  | 'unknown';

export const LIVE_FAILURE_LABELS: Record<LiveFailureClass, string> = {
  dns_not_found: 'Domain does not resolve',
  tls_expired: 'TLS certificate expired',
  tls_incomplete_chain: 'TLS chain incomplete (intermediate certificate missing)',
  tls_name_mismatch: 'TLS certificate does not match the hostname',
  tls_handshake: 'TLS handshake refused',
  timeout: 'No response before the timeout',
  connection_reset: 'Connection reset by the publisher',
  blocked: 'Automated access refused',
  http_error: 'Publisher returned an error status',
  not_a_feed: 'Answered without feed data',
  unknown: 'Unclassified failure',
};

/** What the publisher's team would have to change for the check to pass. */
export const LIVE_FAILURE_ACTIONS: Record<LiveFailureClass, string> = {
  dns_not_found: 'Confirm the current portal hostname and re-register it; the DNS name no longer exists.',
  tls_expired: 'Renew the TLS certificate on the portal host.',
  tls_incomplete_chain: 'Serve the full certificate chain, including the intermediate CA.',
  tls_name_mismatch: 'Issue the certificate for the hostname clients actually request (apex or www).',
  tls_handshake: 'Check the TLS version and cipher configuration of the portal.',
  timeout: 'Check the portal from outside its own network; connections are not completing.',
  connection_reset: 'Check the edge/WAF rules that close requests from non-browser clients.',
  blocked: 'Register OppSift for API access, an allowlisted client, or a data-use agreement.',
  http_error: 'The registered URL returns an error; confirm the current notice or feed path.',
  not_a_feed: 'The feed URL returns a web page; publish an OCDS/JSON/XML endpoint or document the HTML listing.',
  unknown: 'Re-run the probe and capture the failure detail before contacting the publisher.',
};

export function classifyFailure(
  errorMessage: string | null | undefined,
  outcome: LiveOutcome | null = null,
): LiveFailureClass {
  const message = (errorMessage ?? '').toUpperCase();
  if (/NOT_A_FEED|NOT A FEED|NO MACHINE FEED/.test(message)) return 'not_a_feed';
  if (!message) {
    if (outcome === 'blocked') return 'blocked';
    if (outcome === 'error') return 'http_error';
    return 'unknown';
  }
  if (outcome === 'blocked' || /\bHTTP 40[137]\b|\bHTTP 429\b/.test(message)) return 'blocked';
  if (outcome === 'error') return 'http_error';
  if (/CERT_HAS_EXPIRED|CERTIFICATE HAS EXPIRED/.test(message)) return 'tls_expired';
  if (/UNABLE_TO_VERIFY_LEAF_SIGNATURE|SELF_SIGNED_CERT_IN_CHAIN|UNABLE_TO_GET_ISSUER_CERT/.test(message)) {
    return 'tls_incomplete_chain';
  }
  if (/ALTNAME_INVALID|DOES NOT MATCH CERTIFICATE/.test(message)) return 'tls_name_mismatch';
  if (/ENOTFOUND|EAI_AGAIN|GETADDRINFO/.test(message)) return 'dns_not_found';
  if (/ETIMEDOUT|TIMEOUT|ABORT|UND_ERR_CONNECT_TIMEOUT/.test(message)) return 'timeout';
  if (/ECONNRESET/.test(message)) return 'connection_reset';
  if (/EPROTO|TLSV1_ALERT|SSL ROUTINES|ERR_SSL|HANDSHAKE/.test(message)) return 'tls_handshake';
  return 'unknown';
}

/**
 * The other host a publisher's site may answer on: www ↔ apex.
 *
 * Several catalogued portals fail on the registered host only because the
 * certificate or DNS record belongs to the other one. The probe retries once
 * there and records the URL that actually answered, so the evidence names the
 * endpoint that was requested.
 */
export function alternateHostUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.startsWith('www.')) {
      const bare = parsed.hostname.slice(4);
      if (!bare.includes('.')) return null;
      parsed.hostname = bare;
    } else {
      if (parsed.hostname.split('.').length < 2) return null;
      parsed.hostname = `www.${parsed.hostname}`;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export type LivePayloadKind =
  | 'json'
  | 'xml'
  | 'gzip'
  | 'csv'
  | 'binary'
  | 'html'
  | 'text'
  | 'empty'
  | 'unknown';

/**
 * What a 200 response actually delivered.
 *
 * A source can answer HTTP 200 and still be silent for our purposes: several
 * catalogued "feed" URLs return an HTML tender page, which a browser can read
 * and a connector cannot. Naming the payload keeps an answered check from
 * being mistaken for a machine-readable feed.
 */
export function describePayload(
  contentType: string | null | undefined,
  prefix: Uint8Array | string | null | undefined,
): LivePayloadKind {
  const type = (contentType ?? '').toLowerCase();
  const head = typeof prefix === 'string' ? prefix : prefix ? new TextDecoder().decode(prefix.slice(0, 512)) : '';
  const trimmed = head.replace(/^\uFEFF/, '').trimStart();
  if (type.includes('json') || trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
  if (type.includes('gzip') || (prefix instanceof Uint8Array && prefix[0] === 0x1f && prefix[1] === 0x8b)) {
    return 'gzip';
  }
  if (type.includes('octet-stream') || type.includes('zip')) return 'binary';
  if (type.includes('html') || /^<(!doctype|html)/i.test(trimmed)) return 'html';
  if (type.includes('xml') || trimmed.startsWith('<?xml') || trimmed.startsWith('<')) return 'xml';
  if (type.includes('csv')) return 'csv';
  if (!type && !trimmed) return 'empty';
  return 'text';
}

const MACHINE_PAYLOADS: ReadonlySet<LivePayloadKind> = new Set(['json', 'xml', 'gzip', 'csv', 'binary']);

/** True when a feed target delivered data a connector could parse. */
export function isMachineReadablePayload(kind: LivePayloadKind): boolean {
  return MACHINE_PAYLOADS.has(kind);
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
