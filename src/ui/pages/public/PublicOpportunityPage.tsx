import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, Copy, ExternalLink, Link2, Lock, SearchX } from 'lucide-react';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { useSharedNotice } from '../../data/sharedNotice';

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-[#E2E8F0] last:border-0 dark:border-white/10">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B] dark:text-[#CBD5E1]">{label}</dt>
      <dd className="text-sm text-[#172033] dark:text-[#F8FAFC]">{children}</dd>
    </div>
  );
}

function formatDate(value: string | null, timeZone?: string | null): string {
  if (!value) return 'Not published';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Not published';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: timeZone || undefined,
    }).format(parsed);
  } catch {
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed);
  }
}

function formatMoney(amount: number | null, currency: string | null): string {
  if (amount === null) return 'Not disclosed';
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${new Intl.NumberFormat('en-GB').format(amount)} ${currency ?? ''}`.trim();
  }
}

function humanise(value: string | null): string {
  if (!value) return 'Not stated';
  return value.replace(/[_-]+/g, ' ').replace(/^./, (character) => character.toUpperCase());
}

/**
 * Public, linkable view of one notice.
 *
 * The record is read through `get_shared_notice`, which returns a row only when
 * an owner has explicitly shared that notice (migration 0057). A signed-out
 * visitor cannot open a notice by guessing its id, and no workspace data is
 * mounted on this page.
 */
export function PublicOpportunityPage({ opportunityId }: { opportunityId: string }) {
  const { notice, loading, notShared, error } = useSharedNotice(opportunityId);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex,nofollow';
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, []);

  const shareUrl = typeof window === 'undefined' ? '' : `${window.location.origin}/o/${opportunityId}`;

  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (loading) {
    return (
      <PublicLayout>
        <div className="max-w-3xl mx-auto px-4 py-20 text-center text-sm text-[#64748B] dark:text-[#CBD5E1]">
          Reading the shared notice…
        </div>
      </PublicLayout>
    );
  }

  if (!notice) {
    return (
      <PublicLayout>
        <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
          {notShared ? (
            <Lock className="w-8 h-8 mx-auto text-[#94A3B8]" />
          ) : (
            <SearchX className="w-8 h-8 mx-auto text-[#94A3B8]" />
          )}
          <h1 className="font-display text-2xl font-bold">
            {notShared ? 'This notice is not shared publicly' : 'This shared notice is unavailable'}
          </h1>
          <p className="text-sm text-[#64748B] dark:text-[#CBD5E1]">
            {notShared
              ? 'Public links are created deliberately by the team that owns the notice, and can be withdrawn at any time. Ask the sender to share it again, or sign in to open it in the workspace.'
              : error ?? 'The notice could not be read. Try again, or open the workspace.'}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <a
              href="/login"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#541B32] hover:bg-[#A33B59] text-white text-sm font-semibold"
            >
              Sign in
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
            <a
              href="/register"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-[#E2E8F0] dark:border-white/15 text-sm font-semibold hover:bg-[#F8FAFC] dark:hover:bg-white/5"
            >
              Create an account
            </a>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#64748B] dark:text-[#CBD5E1]">
            <span className="font-semibold text-[#A33B59] dark:text-[#E8A4B5]">{humanise(notice.categoryCode)}</span>
            {notice.countryCode && (
              <>
                <span aria-hidden="true">·</span>
                <span>{notice.countryCode}</span>
              </>
            )}
            {notice.referenceNumber && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{notice.referenceNumber}</span>
              </>
            )}
            <span className="inline-flex items-center gap-1 rounded-full border border-[#E2E8F0] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide dark:border-white/15">
              <Lock className="w-3 h-3" aria-hidden="true" />
              Shared notice
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold leading-tight">{notice.title}</h1>
          {notice.buyerName && <p className="text-sm text-[#64748B] dark:text-[#CBD5E1]">{notice.buyerName}</p>}
        </header>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-[#E2E8F0] text-xs font-semibold hover:bg-[#F8FAFC] dark:border-white/15 dark:hover:bg-white/5"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Link copied' : 'Copy link'}</span>
          </button>
          {notice.sourceUrl && (
            <a
              href={notice.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#541B32] hover:bg-[#A33B59] text-white text-xs font-semibold"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open the original notice</span>
            </a>
          )}
          <a
            href="/register"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-[#E2E8F0] text-xs font-semibold hover:bg-[#F8FAFC] dark:border-white/15 dark:hover:bg-white/5"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>Open in the workspace</span>
          </a>
        </div>

        <section className="rounded-lg oppsift-card p-5">
          <dl className="grid sm:grid-cols-2 gap-x-8">
            <DetailRow label="Buyer">{notice.buyerName ?? 'Not stated'}</DetailRow>
            <DetailRow label="Location">
              {[notice.city, notice.region, notice.countryCode].filter(Boolean).join(', ') || 'Not stated'}
            </DetailRow>
            <DetailRow label="Published">{formatDate(notice.publishedAt)}</DetailRow>
            <DetailRow label="Deadline">
              {formatDate(notice.closingAt, notice.timeZone)}{' '}
              {notice.timeZone && (
                <span className="font-mono text-[11px] text-[#64748B] dark:text-[#CBD5E1]">{notice.timeZone}</span>
              )}
            </DetailRow>
            <DetailRow label="Value">{formatMoney(notice.publishedAmount, notice.currencyCode)}</DetailRow>
            <DetailRow label="Status">{humanise(notice.status)}</DetailRow>
            <DetailRow label="Notice type">{humanise(notice.opportunityTypeCode)}</DetailRow>
            <DetailRow label="Issuing source">{notice.sourceName ?? 'Attribution stored with the record'}</DetailRow>
          </dl>
        </section>

        {notice.description && notice.description !== notice.title && (
          <section className="rounded-lg oppsift-card p-5 space-y-2">
            <p className="text-sm leading-relaxed whitespace-pre-line">{notice.description}</p>
          </section>
        )}

        {notice.lastVerifiedAt && (
          <p className="text-[11px] text-[#64748B] dark:text-[#CBD5E1]">
            Source-verified {formatDate(notice.lastVerifiedAt)}. The issuing authority&apos;s published documents always
            govern.
          </p>
        )}

        <p className="flex items-center gap-1.5 text-[11px] font-mono text-[#64748B] dark:text-[#CBD5E1] break-all">
          <Link2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{shareUrl}</span>
        </p>

        <p className="text-[11px] leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
          This is a single notice shared by an OppSift user. Search, monitoring and eligibility work require an account.
        </p>
      </article>
    </PublicLayout>
  );
}
