#!/usr/bin/env node
// Requests every registered source endpoint and records what actually happened.
//
//   node scripts/check-source-liveness.mjs                     # DATABASE_URL (dev branch)
//   LIVENESS_DATABASE_URL=postgres://... node scripts/...      # any explicit target
//   node scripts/check-source-liveness.mjs --country=BR        # one country
//   node scripts/check-source-liveness.mjs --source=<uuid>     # one source
//   node scripts/check-source-liveness.mjs --stale-minutes=60  # skip fresh checks
//   node scripts/check-source-liveness.mjs --retry-failed     # only sources that have not answered
//
// A check is an HTTP request to the publisher's own endpoint: its API/feed URL
// first, then its official website. The result is one append-only row per
// target in public.source_live_checks. Nothing is invented: an endpoint that
// refuses automated access is stored as `blocked`, a timeout as `unreachable`,
// and an endpoint is never recorded as answered unless a server replied.
//
// This is reachability evidence, not ingestion proof: notices still come only
// from connectors with stored records.

import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';
import {
  alternateHostUrl,
  classifyFailure,
  classifyLiveStatus,
  describePayload,
  isMachineReadablePayload,
  LIVE_CHECK_TIMEOUT_MS,
  LIVE_CHECK_USER_AGENT,
} from '../backend/neon/intelligence/source-liveness.ts';

// A network failure can be a property of the host we asked, not of the
// publisher: an apex host whose certificate belongs to www, a missing DNS
// record that exists on the other name, or a dropped connection. Those are
// retried once on the alternate host before the source is recorded as failing.
const RETRY_ON_ALTERNATE_HOST = new Set([
  'dns_not_found',
  'tls_name_mismatch',
  'tls_incomplete_chain',
  'tls_handshake',
  'timeout',
  'connection_reset',
]);

const ROOT = path.resolve(import.meta.dirname, '..');
const CONCURRENCY = Number(process.env.LIVENESS_CONCURRENCY ?? 6);
const TIMEOUT_MS = Number(process.env.LIVENESS_TIMEOUT_MS ?? LIVE_CHECK_TIMEOUT_MS);

function readDatabaseUrl() {
  if (process.env.LIVENESS_DATABASE_URL) return process.env.LIVENESS_DATABASE_URL;
  if (process.env.SEED_DATABASE_URL) return process.env.SEED_DATABASE_URL;
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.join(ROOT, '.env.local');
  if (!fs.existsSync(envPath)) throw new Error('No LIVENESS_DATABASE_URL, DATABASE_URL or .env.local found');
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?DATABASE_URL\s*=\s*(.*)$/.exec(line);
    if (match) return match[1].trim().replace(/^["']|["']$/g, '');
  }
  throw new Error('DATABASE_URL not found in .env.local');
}

function parseArgs(argv) {
  const args = { country: null, source: null, staleMinutes: null, dryRun: false, limit: null, retryFailed: false };
  for (const arg of argv) {
    const [flag, value] = arg.split('=');
    if (flag === '--country') args.country = (value ?? '').toUpperCase() || null;
    else if (flag === '--source') args.source = value || null;
    else if (flag === '--stale-minutes') args.staleMinutes = Number(value);
    else if (flag === '--limit') args.limit = Number(value);
    else if (flag === '--dry-run') args.dryRun = true;
    else if (flag === '--retry-failed') args.retryFailed = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

// The feed endpoint is the source's declared data surface; the website is the
// publisher's own page. Both are requested when they differ, in that order.
function targetsFor(source) {
  const website = source.official_website;
  const feed = source.api_or_feed_url;
  const targets = [];
  if (feed && feed !== website) targets.push({ kind: 'feed', url: feed });
  if (website) targets.push({ kind: 'website', url: website });
  return targets;
}

async function requestOnce(target, url) {
  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: {
        'user-agent': LIVE_CHECK_USER_AGENT,
        accept: 'application/json, application/xml, text/html;q=0.9, */*;q=0.8',
        'accept-language': 'en',
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const latencyMs = Math.min(Date.now() - startedAt, 600_000);
    const contentType = response.headers.get('content-type');
    // Only a feed target needs its first bytes: they say whether the endpoint
    // delivered data or a web page. Everything else is cancelled unread so a
    // large page or dataset is never downloaded just to close the request.
    let prefix = null;
    try {
      if (target.kind === 'feed' && response.body) {
        const reader = response.body.getReader();
        const first = await reader.read();
        prefix = first.value ? first.value.slice(0, 2048) : null;
        await reader.cancel();
      } else {
        await response.body?.cancel();
      }
    } catch {
      /* the connection is closed either way */
    }

    const payload = target.kind === 'feed' ? describePayload(contentType, prefix) : null;
    const status = classifyLiveStatus(response.status);
    // A 200 that carries an HTML page is not a feed. The source stays reachable
    // (its website is checked separately) but this endpoint is recorded as a
    // failure so no one reads the check as a working data feed. A refusal keeps
    // its `blocked` outcome: the publisher answered, it just said no.
    const silentFeed =
      status === 'answered' && target.kind === 'feed' && payload !== null && !isMachineReadablePayload(payload);
    return {
      outcome: silentFeed ? 'error' : status,
      http_status: response.status,
      latency_ms: latencyMs,
      final_url: response.url || url,
      content_type: contentType,
      payload,
      error_message: silentFeed
        ? `Not a feed: answered HTTP ${response.status} with ${payload} instead of feed data`
        : null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Node's fetch reports "fetch failed" and hides DNS, TLS and reset causes in
    // `cause`; storing that cause is what makes an unreachable result diagnosable.
    const cause = error && typeof error === 'object' && 'cause' in error ? error.cause : null;
    const causeCode =
      cause && typeof cause === 'object' && 'code' in cause && typeof cause.code === 'string' ? cause.code : '';
    const causeMessage = cause instanceof Error ? cause.message : '';
    const reason = [causeCode, causeMessage].filter(Boolean).join(': ') || message;
    const timedOut = /abort|timeout/i.test(`${message} ${causeMessage}`) || causeCode === 'UND_ERR_CONNECT_TIMEOUT';
    return {
      outcome: 'unreachable',
      http_status: null,
      latency_ms: Math.min(Date.now() - startedAt, 600_000),
      final_url: null,
      content_type: null,
      payload: null,
      error_message:
        (timedOut ? 'No response within ' + Math.round(TIMEOUT_MS / 1000) + ' s: ' : '') + reason.slice(0, 300),
    };
  }
}

/**
 * Requests the registered URL, then the alternate host when the failure could
 * be the host's fault. The returned `target_url` is the URL that was actually
 * requested, so the stored check never claims evidence from a URL nobody asked.
 */
async function probe(target) {
  const attempts = [target.url];
  const alternate = alternateHostUrl(target.url);
  if (alternate) attempts.push(alternate);

  let first = null;
  for (const url of attempts) {
    const result = { ...(await requestOnce(target, url)), target_url: url };
    if (!first) first = result;
    if (result.outcome !== 'unreachable') return result;
    if (!RETRY_ON_ALTERNATE_HOST.has(classifyFailure(result.error_message, result.outcome))) break;
  }
  // Nothing answered: the stored check describes the URL the source declares,
  // not the last fallback that was tried.
  return first;
}

const args = parseArgs(process.argv.slice(2));
const sql = postgres(readDatabaseUrl(), { max: 1, connect_timeout: 30 });

try {
  const exists = await sql`select to_regclass('public.source_live_checks')::text as name`;
  if (!exists[0]?.name) throw new Error('public.source_live_checks does not exist: apply migration 0053 first');

  let sources;
  if (args.source) {
    sources = await sql`
      select id, name, api_or_feed_url, official_website
      from public.opportunity_sources
      where id = ${args.source}
    `;
  } else if (args.country) {
    sources = await sql`
      select distinct s.id, s.name, s.api_or_feed_url, s.official_website
      from public.opportunity_sources s
      join public.source_country_coverage c on c.source_id = s.id
      where c.country_code = ${args.country}
      order by s.name
    `;
  } else {
    sources = await sql`
      select id, name, api_or_feed_url, official_website
      from public.opportunity_sources
      order by name
    `;
  }

  if (sources.length === 0) {
    console.log('no matching sources');
    process.exit(0);
  }

  if (args.staleMinutes !== null) {
    const fresh = await sql`
      select source_id
      from public.source_live_status
      where age_seconds < ${Math.max(0, args.staleMinutes) * 60}
    `;
    const freshIds = new Set(fresh.map((row) => row.source_id));
    sources = sources.filter((source) => !freshIds.has(source.id));
  }

  if (args.retryFailed) {
    const answered = await sql`
      select source_id
      from public.source_live_status
      where coalesce(answered_targets, 0) > 0
    `;
    const answeredIds = new Set(answered.map((row) => row.source_id));
    sources = sources.filter((source) => !answeredIds.has(source.id));
  }

  if (args.limit !== null && Number.isFinite(args.limit)) sources = sources.slice(0, Math.max(0, args.limit));

  const jobs = [];
  for (const source of sources) {
    for (const target of targetsFor(source)) jobs.push({ source, target });
  }

  if (args.dryRun) {
    for (const job of jobs) console.log(`${job.target.kind}\t${job.source.name}\t${job.target.url}`);
    console.log(`${jobs.length} requests across ${sources.length} sources (dry run, nothing written)`);
    process.exit(0);
  }

  console.log(`checking ${jobs.length} endpoints across ${sources.length} sources (concurrency ${CONCURRENCY})`);
  const results = [];
  let cursor = 0;
  async function worker() {
    for (;;) {
      const index = cursor++;
      if (index >= jobs.length) return;
      const job = jobs[index];
      const result = await probe(job.target);
      results.push({ ...job, result });
      const mark = result.outcome === 'answered' ? 'ok  ' : 'FAIL';
      const note = result.payload && result.payload !== 'json' && result.payload !== 'xml' ? ` [${result.payload}]` : '';
      console.log(
        `${mark} ${result.outcome.padEnd(11)} ${String(result.http_status ?? '-').padStart(3)} ` +
          `${String(result.latency_ms).padStart(6)} ms  ${job.source.name} — ${job.target.kind}${note}`,
      );
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker));

  if (results.length > 0) {
    await sql.begin(async (tx) => {
      const rows = results.map(({ source, target, result }) => ({
        source_id: source.id,
        target_kind: target.kind,
        // The URL that produced this result, which is the registered one unless
        // the alternate host was the only one that answered.
        target_url: result.target_url ?? target.url,
        outcome: result.outcome,
        http_status: result.http_status,
        latency_ms: result.latency_ms,
        final_url: result.final_url,
        content_type: result.content_type ?? null,
        error_message: result.error_message,
        checked_by: 'liveness-probe',
      }));
      for (let index = 0; index < rows.length; index += 200) {
        const batch = rows.slice(index, index + 200);
        await tx`insert into public.source_live_checks ${tx(
          batch,
          'source_id',
          'target_kind',
          'target_url',
          'outcome',
          'http_status',
          'latency_ms',
          'final_url',
          'content_type',
          'error_message',
          'checked_by',
        )}`;
      }
    });
  }

  const tally = results.reduce((acc, item) => {
    acc[item.result.outcome] = (acc[item.result.outcome] ?? 0) + 1;
    return acc;
  }, {});
  // Grouped by what a publisher would have to change: this is the list the
  // outreach work is built from.
  const failures = results.reduce((acc, item) => {
    if (item.result.outcome === 'answered') return acc;
    const cls = classifyFailure(item.result.error_message, item.result.outcome);
    acc[cls] = (acc[cls] ?? 0) + 1;
    return acc;
  }, {});
  const [countrySummary] = await sql`
    select
      count(*)::int as countries,
      count(*) filter (where answered_count = source_count)::int as verified,
      count(*) filter (where answered_count > 0 and answered_count < source_count)::int as partial,
      count(*) filter (where answered_count = 0)::int as failed
    from public.country_live_summary
  `;
  console.log(
    `recorded ${results.length} checks: ` +
      Object.entries(tally)
        .map(([outcome, count]) => `${outcome}=${count}`)
        .join(' ') || 'recorded 0 checks',
  );
  if (Object.keys(failures).length > 0) {
    console.log(
      'failures by cause: ' +
        Object.entries(failures)
          .sort((a, b) => b[1] - a[1])
          .map(([cls, count]) => `${cls}=${count}`)
          .join(' '),
    );
  }
  console.log(
    `countries: ${countrySummary.countries} total · ${countrySummary.verified} all sources answered · ` +
      `${countrySummary.partial} partial · ${countrySummary.failed} none answered`,
  );
} finally {
  await sql.end();
}
