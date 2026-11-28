import { useEffect, useState } from 'react';

/**
 * Public share links.
 *
 * The `opportunities` table is not readable without a session (migration 0057).
 * `/o/<id>` therefore asks the Pages Function `/api/shared-notice/:id`, which
 * runs `get_shared_notice(id)` as the database owner. That function returns one
 * verified notice only when an authenticated owner has created an explicit,
 * revocable row in `opportunity_share_links` for it; with no share row it
 * returns nothing, so a signed-out visitor cannot enumerate notices by guessing
 * ids. No workspace data is mounted on this page.
 */

export interface SharedNotice {
  id: string;
  title: string;
  description: string | null;
  categoryCode: string | null;
  opportunityTypeCode: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  buyerName: string | null;
  referenceNumber: string | null;
  publishedAt: string | null;
  closingAt: string | null;
  timeZone: string | null;
  status: string | null;
  currencyCode: string | null;
  publishedAmount: number | null;
  sourceName: string | null;
  sourceUrl: string | null;
  lastVerifiedAt: string | null;
}

type ApiRow = {
  id: string;
  title: string | null;
  description: string | null;
  category_code: string | null;
  opportunity_type_code: string | null;
  country_code: string | null;
  region: string | null;
  city: string | null;
  buyer_name: string | null;
  reference_number: string | null;
  published_at: string | null;
  closing_at: string | null;
  time_zone: string | null;
  status: string | null;
  currency_code: string | null;
  published_amount: number | string | null;
  source_name: string | null;
  source_url: string | null;
  last_verified_at: string | null;
};

export interface SharedNoticeState {
  notice: SharedNotice | null;
  loading: boolean;
  notShared: boolean;
  error: string | null;
}

function asAmount(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNotice(row: ApiRow): SharedNotice {
  return {
    id: row.id,
    title: row.title ?? 'Shared notice',
    description: row.description,
    categoryCode: row.category_code,
    opportunityTypeCode: row.opportunity_type_code,
    countryCode: row.country_code,
    region: row.region,
    city: row.city,
    buyerName: row.buyer_name,
    referenceNumber: row.reference_number,
    publishedAt: row.published_at,
    closingAt: row.closing_at,
    timeZone: row.time_zone,
    status: row.status,
    currencyCode: row.currency_code,
    publishedAmount: asAmount(row.published_amount),
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    lastVerifiedAt: row.last_verified_at,
  };
}

export function useSharedNotice(opportunityId: string): SharedNoticeState {
  const [state, setState] = useState<SharedNoticeState>({
    notice: null,
    loading: true,
    notShared: false,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`/api/shared-notice/${encodeURIComponent(opportunityId)}`, {
          headers: { accept: 'application/json' },
        });
        if (cancelled) return;
        if (response.status === 404) {
          setState({ notice: null, loading: false, notShared: true, error: null });
          return;
        }
        if (response.status === 503) {
          setState({
            notice: null,
            loading: false,
            notShared: false,
            error: 'Share links are not configured in this deployment.',
          });
          return;
        }
        if (!response.ok) {
          setState({ notice: null, loading: false, notShared: false, error: 'This shared notice could not be read.' });
          return;
        }
        const payload = (await response.json()) as { notice?: ApiRow };
        if (!payload.notice) {
          setState({ notice: null, loading: false, notShared: true, error: null });
          return;
        }
        setState({ notice: toNotice(payload.notice), loading: false, notShared: false, error: null });
      } catch {
        if (!cancelled) {
          setState({ notice: null, loading: false, notShared: false, error: 'This shared notice could not be read.' });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [opportunityId]);

  return state;
}
