import { describe, expect, it } from 'vitest';
import {
  classifyLiveStatus,
  describeLiveCheck,
  formatLiveAge,
  isLiveCheckFresh,
  summarizeCountryLive,
} from './source-liveness';

describe('classifyLiveStatus', () => {
  it('treats a usable reply as answered', () => {
    expect(classifyLiveStatus(200)).toBe('answered');
    expect(classifyLiveStatus(204)).toBe('answered');
    expect(classifyLiveStatus(302)).toBe('answered');
  });

  it('separates a deliberate automation block from a broken resource', () => {
    expect(classifyLiveStatus(401)).toBe('blocked');
    expect(classifyLiveStatus(403)).toBe('blocked');
    expect(classifyLiveStatus(429)).toBe('blocked');
    expect(classifyLiveStatus(404)).toBe('error');
    expect(classifyLiveStatus(500)).toBe('error');
  });

  it('treats a missing status as no response', () => {
    expect(classifyLiveStatus(0)).toBe('unreachable');
    expect(classifyLiveStatus(Number.NaN)).toBe('unreachable');
  });
});

describe('formatLiveAge', () => {
  const now = Date.parse('2026-11-27T15:00:00.000Z');

  it('describes the evidence age without rounding a fresh check up', () => {
    expect(formatLiveAge('2026-11-27T14:59:40.000Z', now)).toBe('just now');
    expect(formatLiveAge('2026-11-27T14:48:00.000Z', now)).toBe('12 min ago');
    expect(formatLiveAge('2026-11-27T12:00:00.000Z', now)).toBe('3 h ago');
    expect(formatLiveAge('2026-11-24T15:00:00.000Z', now)).toBe('3 d ago');
  });

  it('returns an empty string when there is no check', () => {
    expect(formatLiveAge(null, now)).toBe('');
    expect(formatLiveAge('not-a-date', now)).toBe('');
  });
});

describe('describeLiveCheck', () => {
  const now = Date.parse('2026-11-27T15:00:00.000Z');

  it('reports the status, latency, target and age of a real check', () => {
    expect(
      describeLiveCheck(
        {
          last_outcome: 'answered',
          last_http_status: 200,
          last_latency_ms: 908,
          last_target_kind: 'feed',
          last_checked_at: '2026-11-27T14:48:00.000Z',
          answered_targets: 2,
          probed_targets: 2,
        },
        now,
      ),
    ).toBe('Answered · HTTP 200 · 908 ms · feed endpoint · 12 min ago');
  });

  it('says a source was never checked instead of guessing', () => {
    expect(
      describeLiveCheck({
        last_outcome: null,
        last_http_status: null,
        last_latency_ms: null,
        last_target_kind: null,
        last_checked_at: null,
        answered_targets: null,
        probed_targets: null,
      }),
    ).toBe('Not yet checked');
  });
});

describe('isLiveCheckFresh', () => {
  const now = Date.parse('2026-11-27T15:00:00.000Z');

  it('keeps evidence for a day and then asks for a new check', () => {
    expect(isLiveCheckFresh('2026-11-27T01:00:00.000Z', now)).toBe(true);
    expect(isLiveCheckFresh('2026-11-25T15:00:00.000Z', now)).toBe(false);
    expect(isLiveCheckFresh(null, now)).toBe(false);
  });
});

describe('summarizeCountryLive', () => {
  const checked = (answered: number, at = '2026-11-27T14:58:00.000Z') => ({
    last_checked_at: at,
    answered_targets: answered,
  });

  it('only calls a country verified when every registered source answered', () => {
    const summary = summarizeCountryLive([checked(1), checked(2), checked(1)], 3);
    expect(summary.coverage).toBe('verified');
    expect(summary.label).toBe('Verified live');
    expect(summary.answeredCount).toBe(3);
    expect(summary.detail).toContain('3 of 3 sources answered');
  });

  it('reports a partial country when some sources refused or failed', () => {
    const summary = summarizeCountryLive([checked(1), checked(0), { last_checked_at: '2026-11-27T14:58:00.000Z', answered_targets: 0 }], 3);
    expect(summary.coverage).toBe('partial');
    expect(summary.answeredCount).toBe(1);
    expect(summary.failedCount).toBe(2);
    expect(summary.detail).toContain('2 did not answer');
  });

  it('does not treat a blocked publisher as answered', () => {
    const summary = summarizeCountryLive([{ last_checked_at: '2026-11-27T14:58:00.000Z', answered_targets: 0 }], 1);
    expect(summary.coverage).toBe('failed');
    expect(summary.answeredCount).toBe(0);
  });

  it('reports an unchecked country without inventing a result', () => {
    const summary = summarizeCountryLive([{}, {}], 2);
    expect(summary.coverage).toBe('unchecked');
    expect(summary.checkedCount).toBe(0);
    expect(summary.label).toBe('Live check pending');
  });

  it('counts registered sources that have no status row at all', () => {
    const summary = summarizeCountryLive([checked(1)], 4);
    expect(summary.coverage).toBe('partial');
    expect(summary.sourceCount).toBe(4);
    expect(summary.detail).toContain('3 unchecked');
  });
});
