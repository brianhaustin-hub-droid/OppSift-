import React, { useState } from "react";
import { ArrowRight, Check, Copy, ExternalLink, Link2, SearchX } from "lucide-react";
import { PublicLayout } from "../../components/layout/PublicLayout";
import { useAppState } from "../../context/AppStateContext";
import { useRouter } from "../../context/RouterContext";
import { useI18n } from "../../../i18n/I18nContext";

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-[#E2E8F0] last:border-0 dark:border-white/10">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B] dark:text-[#CBD5E1]">{label}</dt>
      <dd className="text-sm text-[#172033] dark:text-[#F8FAFC]">{children}</dd>
    </div>
  );
}

/**
 * Public, linkable view of a single opportunity. It reads the same live data as
 * the workspace, so a shared link never shows a stored copy that has drifted
 * from the database, and it always links out to the issuing source notice.
 */
export function PublicOpportunityPage({ opportunityId }: { opportunityId: string }) {
  const { opportunities, dataLoading } = useAppState();
  const { navigate } = useRouter();
  const { t, formatDate, formatCurrency, translateValue, detect } = useI18n();
  const [copied, setCopied] = useState(false);

  const opportunity = opportunities.find((item) => item.id === opportunityId) ?? null;
  const shareUrl = typeof window === "undefined" ? "" : `${window.location.origin}/o/${opportunityId}`;
  const language = opportunity ? detect(opportunity.title) : { code: "und", confidence: 0 };

  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (dataLoading) {
    return (
      <PublicLayout>
        <div className="max-w-3xl mx-auto px-4 py-20 text-center text-sm text-[#64748B] dark:text-[#CBD5E1]">
          Loading the live notice…
        </div>
      </PublicLayout>
    );
  }

  if (!opportunity) {
    return (
      <PublicLayout>
        <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
          <SearchX className="w-8 h-8 mx-auto text-[#94A3B8]" />
          <h1 className="font-display text-2xl font-bold">{t("share.missingTitle")}</h1>
          <p className="text-sm text-[#64748B] dark:text-[#CBD5E1]">{t("share.missingBody")}</p>
          <button
            type="button"
            onClick={() => navigate("/opportunities")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#541B32] hover:bg-[#A33B59] text-white text-sm font-semibold"
          >
            <span>{t("nav.opportunities")}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#64748B] dark:text-[#CBD5E1]">
            <span className="font-semibold text-[#A33B59] dark:text-[#E8A4B5]">
              {translateValue("category", opportunity.category)}
            </span>
            <span aria-hidden="true">·</span>
            <span>{opportunity.countryName}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{opportunity.referenceNumber}</span>
            {language.code !== "und" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#E2E8F0] px-2 py-0.5 font-mono uppercase dark:border-white/15">
                {t("common.detectedLanguage")}: {language.code}
              </span>
            )}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold leading-tight">{opportunity.title}</h1>
          <p className="text-sm text-[#64748B] dark:text-[#CBD5E1]">{opportunity.issuingOrganisation}</p>
        </header>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E2E8F0] text-xs font-semibold hover:bg-[#F8FAFC] dark:border-white/15 dark:hover:bg-white/5"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? t("common.linkCopied") : t("common.copyLink")}</span>
          </button>
          {opportunity.sourceUrl && (
            <a
              href={opportunity.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#541B32] hover:bg-[#A33B59] text-white text-xs font-semibold"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{t("common.openSource")}</span>
            </a>
          )}
          <button
            type="button"
            onClick={() => navigate(`/opportunity/${opportunity.id}`)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E2E8F0] text-xs font-semibold hover:bg-[#F8FAFC] dark:border-white/15 dark:hover:bg-white/5"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>{t("common.viewInWorkspace")}</span>
          </button>
        </div>

        <section className="rounded-lg oppsift-card p-5">
          <dl className="grid sm:grid-cols-2 gap-x-8">
            <DetailRow label={t("opportunity.buyer")}>{opportunity.issuingOrganisation}</DetailRow>
            <DetailRow label={t("opportunity.location")}>{opportunity.location}</DetailRow>
            <DetailRow label={t("opportunity.published")}>{formatDate(opportunity.publicationDate)}</DetailRow>
            <DetailRow label={t("opportunity.deadline")}>
              {formatDate(opportunity.deadlineDate)}{" "}
              <span className="font-mono text-[11px] text-[#64748B] dark:text-[#CBD5E1]">
                {opportunity.deadlineTimezone}
              </span>
            </DetailRow>
            <DetailRow label={t("opportunity.value")}>
              {formatCurrency(opportunity.estimatedValue, opportunity.currency)}
            </DetailRow>
            <DetailRow label={t("opportunity.status")}>{translateValue("status", opportunity.status)}</DetailRow>
            <DetailRow label={t("opportunity.source")}>{opportunity.sourceName}</DetailRow>
          </dl>
        </section>

        {opportunity.description && opportunity.description !== opportunity.title && (
          <section className="rounded-lg oppsift-card p-5 space-y-2">
            <p className="text-sm leading-relaxed whitespace-pre-line">{opportunity.description}</p>
            <p className="text-[11px] text-[#64748B] dark:text-[#CBD5E1]">{t("common.showingOriginal")}</p>
          </section>
        )}

        <p className="flex items-center gap-1.5 text-[11px] font-mono text-[#64748B] dark:text-[#CBD5E1] break-all">
          <Link2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{shareUrl}</span>
        </p>
      </article>
    </PublicLayout>
  );
}
