import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Bookmark,
  CheckCircle2,
  Columns,
  Copy,
  ExternalLink,
  FileText,
  HelpCircle,
  Layers,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout';
import { useAppState } from '../../context/AppStateContext';
import { useRouter } from '../../context/RouterContext';
import { formatCurrencyValue, formatDisplayDate, getDaysRemaining } from '../../data/fixtures';

type DetailTab =
  | 'overview'
  | 'issuer-criteria'
  | 'documents'
  | 'clarifications'
  | 'verification'
  | 'requirements';

export function OpportunityDetailPage({ opportunityId }: { opportunityId: string }) {
  const { navigate, goBack, getBackLabel } = useRouter();
  const {
    opportunities,
    savedIds,
    toggleSaveOpportunity,
    compareIds,
    toggleCompareOpportunity,
    addToPipeline,
    pipeline,
    pushToast,
  } = useAppState();
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');

  const opp = opportunities.find((o) => o.id === opportunityId) || opportunities[0];
  const isSaved = savedIds.includes(opp.id);
  const isCompared = compareIds.includes(opp.id);
  const existingPipe = pipeline.find((p) => p.opportunityId === opp.id);
  const daysLeft = getDaysRemaining(opp.deadlineDate);

  const tabs: { id: DetailTab; label: string }[] = [
    { id: 'overview', label: 'Overview & Scope' },
    { id: 'issuer-criteria', label: 'Issuer & Evaluation' },
    { id: 'documents', label: `Documents (${opp.documents.length})` },
    { id: 'clarifications', label: `Amendments & Q&A (${opp.amendments.length + opp.clarifications.length})` },
    { id: 'verification', label: 'Source & Verification' },
    { id: 'requirements', label: `Requirements (${opp.requirements.length})` },
  ];

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(`${window.location.origin}/opportunity/${opp.id}`);
    pushToast('info', `Copied notice link for ${opp.referenceNumber}.`);
  };

  return (
    <WorkspaceLayout title={opp.referenceNumber} breadcrumb={`Discovery / ${opp.countryCode} / ${opp.referenceNumber}`}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => goBack('/discover')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B] dark:text-[#CBD5E1] hover:text-[#172033] dark:hover:text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to {getBackLabel('Opportunity Explorer')}</span>
          </button>
          <span className="text-xs font-mono text-[#64748B] dark:text-[#CBD5E1]">
            Verified via {opp.sourceName} · {opp.lastVerifiedAt}
          </span>
        </div>

        {/* Opportunity Header + Persistent Action Panel */}
        <section className="p-6 rounded-2xl oppsift-card space-y-5">
          <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-5">
            <div className="space-y-2 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#64748B] dark:text-[#CBD5E1]">
                <span className="font-semibold text-[#A33B59] dark:text-[#E8A4B5]">{opp.category}</span>
                <span aria-hidden="true">·</span>
                <span>{opp.countryName}</span>
                <span aria-hidden="true">·</span>
                <span>{opp.sector}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{opp.referenceNumber}</span>
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-[#172033] dark:text-[#F8FAFC]">
                {opp.title}
              </h2>
              <p className="text-sm text-[#64748B] dark:text-[#CBD5E1]">{opp.issuingOrganisation}</p>
            </div>

            {/* Persistent Action Toolbar */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => toggleSaveOpportunity(opp.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold ${
                  isSaved
                    ? 'border-[#541B32] bg-[#FFF1F2] dark:bg-[#541B32]/40 text-[#541B32] dark:text-[#E8A4B5]'
                    : 'border-[#E2E8F0] dark:border-white/12'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>{isSaved ? 'Saved' : 'Save'}</span>
              </button>

              <button
                type="button"
                onClick={() => toggleCompareOpportunity(opp.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold ${
                  isCompared
                    ? 'border-[#164E8B] bg-[#E0F2FE] dark:bg-[#164E8B]/40 text-[#164E8B] dark:text-[#38BDF8]'
                    : 'border-[#E2E8F0] dark:border-white/12'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span>{isCompared ? 'In Compare' : 'Compare'}</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/intelligence')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E2E8F0] dark:border-white/12 text-xs font-semibold hover:border-[#A33B59]"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#A33B59] dark:text-[#E8A4B5]" />
                <span>AI Analysis</span>
              </button>

              {existingPipe ? (
                <button
                  type="button"
                  onClick={() => navigate(`/my-opportunities/${existingPipe.id}`)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#164E8B] hover:bg-[#164E8B]/90 text-white text-xs font-semibold"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Preparation ({existingPipe.stage})</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => addToPipeline(opp.id)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#541B32] hover:bg-[#A33B59] text-white text-xs font-semibold"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Add to Pipeline</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => navigate('/alerts')}
                aria-label="Set deadline or amendment alert"
                className="p-2 rounded-xl border border-[#E2E8F0] dark:border-white/12 hover:bg-[#F1F5F9] dark:hover:bg-white/8"
              >
                <Bell className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                aria-label="Copy link"
                className="p-2 rounded-xl border border-[#E2E8F0] dark:border-white/12 hover:bg-[#F1F5F9] dark:hover:bg-white/8"
              >
                <Copy className="w-4 h-4" />
              </button>

              <a
                href={opp.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E2E8F0] dark:border-white/12 text-xs font-medium hover:bg-[#F1F5F9] dark:hover:bg-white/8"
              >
                <span>Source</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E2E8F0] dark:border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <p className="text-[#64748B] dark:text-[#CBD5E1]">Submission Deadline</p>
              <p className="mt-0.5 font-mono tabular-nums font-semibold">
                {formatDisplayDate(opp.deadlineDate)} ({opp.deadlineTimezone}) · {daysLeft > 0 ? `${daysLeft}d left` : 'Closed'}
              </p>
            </div>
            <div>
              <p className="text-[#64748B] dark:text-[#CBD5E1]">Published Date</p>
              <p className="mt-0.5 font-mono tabular-nums font-semibold">{formatDisplayDate(opp.publicationDate)}</p>
            </div>
            <div>
              <p className="text-[#64748B] dark:text-[#CBD5E1]">Estimated Value</p>
              <p className="mt-0.5 font-mono tabular-nums font-semibold">
                {formatCurrencyValue(opp.estimatedValue, opp.currency)}
              </p>
            </div>
            <div>
              <p className="text-[#64748B] dark:text-[#CBD5E1]">Status &amp; Location</p>
              <p className="mt-0.5 font-semibold">
                {opp.status} · {opp.location}
              </p>
            </div>
          </div>
        </section>

        {/* Main 2-column Dossier + Eligibility Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4 min-w-0">
            <div className="flex items-center gap-1 p-1.5 rounded-2xl oppsift-card max-w-full overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === tab.id
                      ? 'oppsift-sidebar-active text-white font-semibold'
                      : 'text-[#64748B] dark:text-[#CBD5E1]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6 rounded-2xl oppsift-card space-y-5 text-sm">
              {activeTab === 'overview' && (
                <>
                  <div>
                    <h3 className="font-display text-base font-semibold">Official Summary</h3>
                    <p className="mt-2 text-[#64748B] dark:text-[#CBD5E1] leading-relaxed">{opp.summary}</p>
                  </div>
                  <div>
                    <h4 className="font-display text-sm font-semibold">Detailed Scope</h4>
                    <p className="mt-1.5 text-[#64748B] dark:text-[#CBD5E1] leading-relaxed">{opp.description}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E2E8F0] dark:border-white/10 text-xs">
                    <div>
                      <h4 className="font-semibold mb-1.5">Key Contractual Obligations</h4>
                      <ul className="space-y-1 text-[#64748B] dark:text-[#CBD5E1]">
                        {opp.keyObligations.map((ob) => (
                          <li key={ob}>• {ob}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1.5">Restrictions &amp; Exclusions</h4>
                      <ul className="space-y-1 text-[#DC2626]">
                        {opp.restrictions.map((r) => (
                          <li key={r}>• {r}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-display text-sm font-semibold">Application Instructions</h4>
                    <p className="mt-1.5 text-[#64748B] dark:text-[#CBD5E1] leading-relaxed">{opp.applicationInstructions}</p>
                  </div>
                </>
              )}

              {activeTab === 'issuer-criteria' && (
                <div className="space-y-5 text-xs">
                  <div>
                    <h3 className="font-display text-base font-semibold mb-3">Issuing Authority Profile</h3>
                    <dl className="divide-y divide-[#E2E8F0] dark:divide-white/8">
                      <div className="py-2.5 flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4">
                        <dt className="text-[#64748B] dark:text-[#CBD5E1]">Organisation</dt>
                        <dd className="font-semibold sm:text-right">{opp.issuingOrganisation}</dd>
                      </div>
                      <div className="py-2.5 flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4">
                        <dt className="text-[#64748B] dark:text-[#CBD5E1]">Authority Type</dt>
                        <dd className="font-medium sm:text-right">{opp.issuerProfile.type}</dd>
                      </div>
                      <div className="py-2.5 flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4">
                        <dt className="text-[#64748B] dark:text-[#CBD5E1]">Submission Portal</dt>
                        <dd className="font-medium sm:text-right">{opp.issuerProfile.portal}</dd>
                      </div>
                      {opp.procurementMethod && (
                        <div className="py-2.5 flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4">
                          <dt className="text-[#64748B] dark:text-[#CBD5E1]">Procedure</dt>
                          <dd className="font-medium sm:text-right">{opp.procurementMethod}</dd>
                        </div>
                      )}
                      {opp.contractDuration && (
                        <div className="py-2.5 flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4">
                          <dt className="text-[#64748B] dark:text-[#CBD5E1]">Duration</dt>
                          <dd className="font-medium sm:text-right">{opp.contractDuration}</dd>
                        </div>
                      )}
                      <div className="py-2.5 flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4">
                        <dt className="text-[#64748B] dark:text-[#CBD5E1]">Authority Contact Note</dt>
                        <dd className="sm:text-right text-[#64748B] dark:text-[#CBD5E1]">{opp.issuerProfile.contactNote}</dd>
                      </div>
                    </dl>
                  </div>

                  <div>
                    <h3 className="font-display text-base font-semibold mb-2">Published Evaluation Criteria</h3>
                    <div className="space-y-2">
                      {opp.evaluationCriteria.map((ec) => (
                        <div key={ec.criterion} className="p-3 rounded-xl border border-[#E2E8F0] dark:border-white/10 flex items-center justify-between gap-3">
                          <span className="font-medium">{ec.criterion}</span>
                          <span className="font-mono font-bold text-[#164E8B] dark:text-[#38BDF8] shrink-0">{ec.weight}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'documents' && (
                <div className="space-y-3">
                  <h3 className="font-display text-base font-semibold">Published Solicitation Documents</h3>
                  <div className="divide-y divide-[#E2E8F0] dark:divide-white/8 border border-[#E2E8F0] dark:border-white/10 rounded-xl">
                    {opp.documents.map((doc) => (
                      <div key={doc.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="w-4 h-4 text-[#164E8B] dark:text-[#38BDF8] shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium truncate">{doc.name}</p>
                            <p className="text-[#64748B] dark:text-[#CBD5E1]">
                              {doc.category || doc.format} · {doc.size} · Updated {doc.updatedAt} ·{' '}
                              {doc.isMandatory ? 'Mandatory' : 'Supporting'}
                            </p>
                          </div>
                        </div>
                        <a
                          href={opp.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-[#A33B59] dark:text-[#E8A4B5] hover:underline shrink-0"
                        >
                          Source Portal
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'clarifications' && (
                <div className="space-y-5 text-xs">
                  <div>
                    <h3 className="font-display text-base font-semibold mb-2">Amendments &amp; Corrigenda</h3>
                    {opp.amendments.length === 0 ? (
                      <p className="text-[#64748B] dark:text-[#CBD5E1]">No amendments recorded since initial notice.</p>
                    ) : (
                      <div className="space-y-2">
                        {opp.amendments.map((am) => (
                          <div key={am.id} className="p-3.5 rounded-xl border border-[#E2E8F0] dark:border-white/10">
                            <p className="font-mono text-[11px] text-[#A33B59] dark:text-[#E8A4B5]">{am.date} · {am.fieldChanged}</p>
                            <p className="mt-1">{am.summary}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="font-display text-base font-semibold mb-2">Authority Clarifications (Q&amp;A)</h3>
                    {opp.clarifications.length === 0 ? (
                      <p className="text-[#64748B] dark:text-[#CBD5E1]">No public clarification batches published yet.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {opp.clarifications.map((cl) => (
                          <div key={cl.id} className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-white/6 border border-[#E2E8F0] dark:border-white/10 space-y-1.5">
                            <p className="font-semibold flex items-center gap-1.5">
                              <MessageSquareText className="w-3.5 h-3.5 text-[#164E8B] dark:text-[#38BDF8]" />
                              <span>Q ({cl.date}): {cl.question}</span>
                            </p>
                            <p className="text-[#64748B] dark:text-[#CBD5E1]">A: {cl.answer}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'verification' && (
                <div className="space-y-4 text-xs">
                  <h3 className="font-display text-base font-semibold">Source Provenance &amp; Verification Timeline</h3>
                  <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-white/6 border border-[#E2E8F0] dark:border-white/10 space-y-1.5">
                    <p><span className="font-semibold">Official Source:</span>{' '}
                      <button
                        type="button"
                        onClick={() => navigate(`/sources/${opp.sourceId}`)}
                        className="underline text-[#164E8B] dark:text-[#38BDF8]"
                      >
                        {opp.sourceName}
                      </button>
                    </p>
                    <p className="break-all"><span className="font-semibold">Canonical URL:</span> {opp.sourceUrl}</p>
                  </div>
                  <div className="space-y-2">
                    {opp.verificationHistory.map((vh, idx) => (
                      <div key={idx} className="p-3 rounded-xl border border-[#E2E8F0] dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3">
                        <div className="min-w-0">
                          <p className="font-medium">{vh.event}</p>
                          <p className="text-[11px] text-[#64748B] dark:text-[#CBD5E1]">{vh.actor}</p>
                        </div>
                        <span className="font-mono text-[11px] text-[#64748B] dark:text-[#CBD5E1] shrink-0">{vh.timestamp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'requirements' && (
                <div className="space-y-3">
                  <h3 className="font-display text-base font-semibold">Published Mandatory &amp; Technical Requirements</h3>
                  <ul className="space-y-2 text-xs">
                    {opp.requirements.map((req) => (
                      <li key={req} className="p-3 rounded-xl border border-[#E2E8F0] dark:border-white/10 flex items-start gap-2.5">
                        <ShieldCheck className="w-4 h-4 text-[#164E8B] dark:text-[#38BDF8] shrink-0 mt-0.5" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Right Eligibility Intelligence Panel */}
          <aside className="lg:col-span-5 min-w-0">
            <div className="p-6 rounded-2xl oppsift-card space-y-4 lg:sticky lg:top-20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#A33B59] dark:text-[#E8A4B5]" />
                  <h3 className="font-display text-base font-semibold">Eligibility Intelligence</h3>
                </div>
                <span className="font-mono text-xs tabular-nums font-semibold text-[#A33B59] dark:text-[#E8A4B5]">
                  {opp.matchScore}% match
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-white/6 border border-[#E2E8F0] dark:border-white/10">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold">{opp.eligibility.status}</span>
                  <span className="text-[#164E8B] dark:text-[#38BDF8] font-medium">{opp.eligibility.confidenceLabel}</span>
                </div>
                <p className="mt-2 text-xs text-[#64748B] dark:text-[#CBD5E1] leading-relaxed">
                  {opp.eligibility.explanation}
                </p>
              </div>

              {opp.eligibility.matchedCriteria.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-[#16A34A] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Matched Profile Criteria</span>
                  </p>
                  <ul className="space-y-1 text-xs text-[#64748B] dark:text-[#CBD5E1]">
                    {opp.eligibility.matchedCriteria.map((m) => (
                      <li key={m}>• {m}</li>
                    ))}
                  </ul>
                </div>
              )}

              {opp.eligibility.potentialDisqualifiers.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-[#DC2626] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Potential Disqualifiers</span>
                  </p>
                  <ul className="space-y-1 text-xs text-[#64748B] dark:text-[#CBD5E1]">
                    {opp.eligibility.potentialDisqualifiers.map((d) => (
                      <li key={d}>• {d}</li>
                    ))}
                  </ul>
                </div>
              )}

              {opp.eligibility.missingInformation.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-[#D97706] flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Unknown / Missing Profile Info</span>
                  </p>
                  <ul className="space-y-1 text-xs text-[#64748B] dark:text-[#CBD5E1]">
                    {opp.eligibility.missingInformation.map((m) => (
                      <li key={m}>• {m}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-3 border-t border-[#E2E8F0] dark:border-white/10 space-y-1.5 text-xs">
                <p className="font-semibold">Source Evidence Citations</p>
                {opp.eligibility.evidenceReferences.map((ref) => (
                  <p key={ref} className="font-mono text-[11px] text-[#64748B] dark:text-[#CBD5E1]">
                    {ref}
                  </p>
                ))}
              </div>

              <button
                type="button"
                onClick={() => navigate('/intelligence')}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#541B32] to-[#C83764] text-white text-xs font-semibold"
              >
                Open Full Requirement Matrix &amp; AI Research →
              </button>

              <p className="text-[11px] text-[#64748B] dark:text-[#CBD5E1] leading-snug">
                {opp.eligibility.disclaimer}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
