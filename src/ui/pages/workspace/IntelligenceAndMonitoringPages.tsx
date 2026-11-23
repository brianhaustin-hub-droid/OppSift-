import React, { useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Bookmark,
  CheckCheck,
  CheckCircle2,
  ClipboardList,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  MessageSquare,
  Plus,
  Printer,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout';
import { CinematicVideoBackdrop } from '../../components/media/CinematicVideoBackdrop';
import { CategorySplitRing, DiscoveryTrendChart, HorizontalBarChart } from '../../components/ui/Charts';
import { EmptyStatePanel } from '../../components/ui/StateViews';
import { useAppState } from '../../context/AppStateContext';
import { useRouter } from '../../context/RouterContext';
import {
  DISCOVERY_TREND_SERIES,
  formatCurrencyValue,
  formatDisplayDate,
} from '../../data/fixtures';
import { OpportunityCategory } from '../../types/oppsift';

type AiModuleTab =
  | 'overview'
  | 'analysis'
  | 'eligibility'
  | 'extraction'
  | 'risks'
  | 'research'
  | 'compare'
  | 'report';

interface ResearchMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  citations?: string[];
  timestamp: string;
}

export function IntelligenceWorkspacePage() {
  const { navigate } = useRouter();
  const { opportunities, savedAnalyses, toggleSaveAnalysis, onboarding, pushToast } = useAppState();
  const [activeTab, setActiveTab] = useState<AiModuleTab>('overview');
  const [primaryId, setPrimaryId] = useState(opportunities[0].id);
  const [compareId, setCompareId] = useState(opportunities[2].id);
  const [docFilter, setDocFilter] = useState<string>('All');
  const [reqCatFilter, setReqCatFilter] = useState<string>('All');

  const [chatInput, setChatInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [chatHistory, setChatHistory] = useState<ResearchMessage[]>([
    {
      id: 'msg-1',
      role: 'user',
      text: 'Summarize the biggest blockers for UK-CCS-2026-0841 against our current Meridian profile.',
      timestamp: '09:12 UTC',
    },
    {
      id: 'msg-2',
      role: 'assistant',
      text: 'Based on UK-CCS-2026-0841 documentation vs your saved profile: (1) Verified Match — Active ISO/IEC 27001:2022 and HL7 FHIR delivery experience align with §6.1 and §3.2. (2) Unverified Gap — UK Cyber Essentials Plus certification expiry is not stored in your profile and is mandatory prior to award (Clarification Batch 1). (3) Unverified Financial Standing — Audited turnover of GBP 2.5M+ across the last 2 years must be confirmed by your finance lead before Selection Questionnaire submission.',
      citations: ['ITT-Volume-1-Specification.pdf §4.2, §6.1, §6.2', 'Clarification Q&A Batch 1'],
      timestamp: '09:12 UTC',
    },
  ]);

  const primary = opportunities.find((o) => o.id === primaryId) || opportunities[0];
  const secondary = opportunities.find((o) => o.id === compareId) || opportunities[1];

  const handleSendChat = (promptText?: string) => {
    const content = (promptText ?? chatInput).trim();
    if (!content) return;
    const userMsg: ResearchMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: content,
      timestamp: 'Just now',
    };
    setChatHistory((prev) => [...prev, userMsg]);
    if (!promptText) setChatInput('');
    setIsThinking(true);
    setTimeout(() => {
      setChatHistory((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: `Structured intelligence summary for ${primary.referenceNumber}: Live generative reasoning requires connecting the server-side Gemini API key. Currently indexed clauses show ${primary.requirements.length} published requirements and status "${primary.eligibility.status}" (${primary.eligibility.confidenceLabel}). Next recommended step: ${primary.eligibility.recommendedNextSteps[0] || 'Review source specification directly.'}`,
          citations: primary.eligibility.evidenceReferences,
          timestamp: 'Just now',
        },
      ]);
      setIsThinking(false);
    }, 650);
  };

  const modules: { id: AiModuleTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'analysis', label: 'Opportunity Analysis' },
    { id: 'eligibility', label: 'Eligibility Matrix' },
    { id: 'extraction', label: 'Requirements Extraction' },
    { id: 'risks', label: 'Risk & Suitability' },
    { id: 'research', label: 'Research Chat' },
    { id: 'compare', label: 'Compare Briefs' },
    { id: 'report', label: 'Printable Report' },
  ];

  const filteredCriteria = primary.eligibility.criteriaMatrix.filter(
    (c) => reqCatFilter === 'All' || c.category === reqCatFilter
  );

  return (
    <WorkspaceLayout title="AI Intelligence Research Workspace" breadcrumb="Intelligence / Research & Eligibility">
      <div className="space-y-6">
        {/* Workspace Header + Selector + Boundary Notice */}
        <div className="p-4 rounded-2xl oppsift-card flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-[#A33B59] dark:text-[#E8A4B5] shrink-0 mt-0.5" />
            <p className="text-[#64748B] dark:text-[#CBD5E1]">
              <span className="font-semibold text-[#172033] dark:text-[#F8FAFC]">Provenance &amp; Integration Boundary:</span>{' '}
              OppSift separates verbatim official requirements from AI interpretation. Unknown items are never shown as confirmed eligibility. Live generative re-analysis awaits Gemini API backend activation.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="intel-opp-select" className="font-medium text-[#64748B] dark:text-[#CBD5E1]">Focus Notice:</label>
            <select
              id="intel-opp-select"
              value={primaryId}
              onChange={(e) => setPrimaryId(e.target.value)}
              className="h-9 px-3 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-xs font-medium"
            >
              {opportunities.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.referenceNumber} ({o.countryCode}) — {o.matchScore}% match
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 8-Module Navigation Strip */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl oppsift-card max-w-full overflow-x-auto no-print">
          {modules.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setActiveTab(m.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                activeTab === m.id
                  ? 'oppsift-sidebar-active text-white'
                  : 'text-[#64748B] dark:text-[#CBD5E1] hover:bg-[#F1F5F9] dark:hover:bg-white/8'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Module A: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  tab: 'analysis' as const,
                  title: 'Opportunity Intelligence Dossier',
                  desc: 'Issuer profile, evaluation weights, obligations, restrictions & missing notice data.',
                  icon: <FileText className="w-4 h-4 text-[#A33B59] dark:text-[#E8A4B5]" />,
                },
                {
                  tab: 'eligibility' as const,
                  title: 'Profile vs Requirement Matrix',
                  desc: 'Clause-by-clause status (Satisfied, Unsatisfied, Unknown, Disqualifier) with evidence.',
                  icon: <ShieldCheck className="w-4 h-4 text-[#164E8B] dark:text-[#38BDF8]" />,
                },
                {
                  tab: 'extraction' as const,
                  title: 'Requirements Extraction',
                  desc: 'Mandatory, Technical, Financial, Administrative & Submission deliverables indexed by file.',
                  icon: <ClipboardList className="w-4 h-4 text-[#A33B59] dark:text-[#E8A4B5]" />,
                },
                {
                  tab: 'risks' as const,
                  title: 'Risk & Suitability Assessment',
                  desc: 'Deadline, documentation, competition & eligibility risks separating fact from inference.',
                  icon: <AlertTriangle className="w-4 h-4 text-[#D97706]" />,
                },
                {
                  tab: 'research' as const,
                  title: 'Enterprise AI Research Chat',
                  desc: 'Cited Q&A workspace scoped to solicitation documents and organisational credentials.',
                  icon: <MessageSquare className="w-4 h-4 text-[#164E8B] dark:text-[#38BDF8]" />,
                },
                {
                  tab: 'report' as const,
                  title: 'Printable Intelligence Brief',
                  desc: 'Executive decision report formatted for internal bid review & PDF print export.',
                  icon: <Printer className="w-4 h-4 text-[#A33B59] dark:text-[#E8A4B5]" />,
                },
              ].map((tool) => (
                <button
                  key={tool.tab}
                  type="button"
                  onClick={() => setActiveTab(tool.tab)}
                  className="text-left p-5 rounded-2xl oppsift-card hover:border-[#A33B59] transition-colors space-y-2"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#F8FAFC] dark:bg-white/8 flex items-center justify-center">
                    {tool.icon}
                  </div>
                  <h2 className="font-display text-sm font-bold">{tool.title}</h2>
                  <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] leading-relaxed">{tool.desc}</p>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 p-5 rounded-2xl oppsift-card space-y-3 min-w-0">
                <h3 className="font-display text-base font-semibold">Recent &amp; Saved Analyses</h3>
                <div className="divide-y divide-[#E2E8F0] dark:divide-white/8">
                  {savedAnalyses.map((an) => (
                    <div key={an.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => {
                            setPrimaryId(an.opportunityId);
                            setActiveTab('analysis');
                          }}
                          className="font-semibold text-left hover:underline truncate block"
                        >
                          {an.title}
                        </button>
                        <p className="text-[#64748B] dark:text-[#CBD5E1] mt-0.5">
                          {an.eligibilityOutcome} · {an.confidence} · <span className="font-mono">{an.createdAt}</span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleSaveAnalysis(an.id)}
                        aria-label="Toggle saved analysis"
                        className={`p-1.5 rounded-lg border ${
                          an.saved
                            ? 'border-[#541B32] bg-[#FFF1F2] dark:bg-[#541B32]/40 text-[#541B32] dark:text-[#E8A4B5]'
                            : 'border-[#E2E8F0] dark:border-white/12 text-[#64748B]'
                        }`}
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-5 p-5 rounded-2xl oppsift-card space-y-4 min-w-0">
                <h3 className="font-display text-base font-semibold">Workspace Analysis Quota &amp; Tasks</h3>
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-white/6 border border-[#E2E8F0] dark:border-white/10 text-xs space-y-1">
                  <p className="font-semibold">Monthly AI Briefs Used: <span className="font-mono">8 / 250</span></p>
                  <p className="text-[#64748B] dark:text-[#CBD5E1]">
                    Structured eligibility indexing active; generative document re-analysis invokes server-side Gemini inference.
                  </p>
                </div>
                <div className="space-y-2 text-xs">
                  <p className="font-semibold">Suggested Research Actions</p>
                  {primary.eligibility.recommendedNextSteps.map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => {
                        setActiveTab('research');
                        handleSendChat(`How should we address: ${step}`);
                      }}
                      className="w-full text-left p-2.5 rounded-lg border border-[#E2E8F0] dark:border-white/12 hover:border-[#A33B59]"
                    >
                      {step} →
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Module B: Detailed Opportunity Intelligence Analysis */}
        {activeTab === 'analysis' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 p-6 rounded-2xl oppsift-card space-y-5 text-xs min-w-0">
              <div>
                <p className="font-mono text-[#A33B59] dark:text-[#E8A4B5] font-semibold">
                  {primary.referenceNumber} · {primary.category} · {primary.countryName}
                </p>
                <h2 className="mt-1 font-display text-xl font-bold">{primary.title}</h2>
                <p className="mt-2 text-sm text-[#64748B] dark:text-[#CBD5E1] leading-relaxed">{primary.summary}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[#F8FAFC] dark:bg-white/6 border border-[#E2E8F0] dark:border-white/10">
                <div>
                  <p className="text-[#64748B] dark:text-[#CBD5E1]">Issuer Profile</p>
                  <p className="font-semibold mt-0.5">{primary.issuingOrganisation}</p>
                  <p className="text-[11px] text-[#64748B] dark:text-[#CBD5E1]">
                    {primary.issuerProfile.type} · {primary.issuerProfile.portal}
                  </p>
                </div>
                <div>
                  <p className="text-[#64748B] dark:text-[#CBD5E1]">Important Dates &amp; Value</p>
                  <p className="font-semibold mt-0.5 font-mono">
                    Closes {formatDisplayDate(primary.deadlineDate)} ({primary.deadlineTimezone})
                  </p>
                  <p className="font-mono text-[11px] text-[#64748B] dark:text-[#CBD5E1]">
                    {formatCurrencyValue(primary.estimatedValue, primary.currency)}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-display text-sm font-semibold mb-2">Evaluation Criteria &amp; Weighting</h3>
                <div className="space-y-2">
                  {primary.evaluationCriteria.map((ec) => (
                    <div key={ec.criterion} className="flex items-center justify-between p-2.5 rounded-lg border border-[#E2E8F0] dark:border-white/10">
                      <span>{ec.criterion}</span>
                      <span className="font-mono font-bold text-[#164E8B] dark:text-[#38BDF8]">{ec.weight}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-1.5">Key Contractual Obligations</h4>
                  <ul className="space-y-1 text-[#64748B] dark:text-[#CBD5E1]">
                    {primary.keyObligations.map((ob) => (
                      <li key={ob}>• {ob}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-1.5">Important Restrictions</h4>
                  <ul className="space-y-1 text-[#DC2626]">
                    {primary.restrictions.map((r) => (
                      <li key={r}>• {r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-5 min-w-0">
              <div className="p-6 rounded-2xl oppsift-card space-y-3 text-xs">
                <h3 className="font-display text-base font-semibold">Required Documents ({primary.documents.length})</h3>
                {primary.documents.map((doc) => (
                  <div key={doc.id} className="p-3 rounded-xl border border-[#E2E8F0] dark:border-white/10 flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold truncate">{doc.name}</p>
                      <p className="text-[#64748B] dark:text-[#CBD5E1]">
                        {doc.category || doc.format} · {doc.size}
                      </p>
                    </div>
                    <span className={doc.isMandatory ? 'text-[#DC2626] font-semibold' : 'text-[#64748B]'}>
                      {doc.isMandatory ? 'Mandatory' : 'Supporting'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-6 rounded-2xl oppsift-card space-y-3 text-xs">
                <h3 className="font-display text-base font-semibold">Missing Information &amp; Source Citations</h3>
                {primary.eligibility.missingInformation.length === 0 ? (
                  <p className="text-[#16A34A]">No missing profile fields flagged.</p>
                ) : (
                  <ul className="space-y-1.5 text-[#D97706]">
                    {primary.eligibility.missingInformation.map((m) => (
                      <li key={m}>• {m}</li>
                    ))}
                  </ul>
                )}
                <div className="pt-2 border-t border-[#E2E8F0] dark:border-white/10 space-y-1 font-mono text-[11px] text-[#64748B] dark:text-[#CBD5E1]">
                  {primary.eligibility.evidenceReferences.map((ref) => (
                    <p key={ref}>{ref}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Module C: Eligibility Intelligence Matrix */}
        {activeTab === 'eligibility' && (
          <div className="space-y-5">
            <div className="p-6 rounded-2xl oppsift-card flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#A33B59] dark:text-[#E8A4B5]">
                  Profile Comparison: {onboarding.organisationName} vs {primary.referenceNumber}
                </p>
                <h2 className="mt-1 font-display text-xl font-bold">
                  Overall Screening: {primary.eligibility.status} ({primary.eligibility.confidenceLabel})
                </h2>
                <p className="mt-1 text-xs text-[#64748B] dark:text-[#CBD5E1] max-w-3xl">
                  {primary.eligibility.explanation}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="font-display text-3xl font-bold tabular-nums text-[#541B32] dark:text-[#E8A4B5]">
                  {primary.matchScore}%
                </span>
                <p className="text-[11px] text-[#64748B] dark:text-[#CBD5E1]">Weighted Alignment</p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl oppsift-card">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] dark:bg-white/6 text-[#64748B] dark:text-[#CBD5E1]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Category</th>
                    <th className="py-3 px-4 font-semibold">Published Requirement</th>
                    <th className="py-3 px-4 font-semibold">Organisation Profile Evidence</th>
                    <th className="py-3 px-4 font-semibold">Assessment</th>
                    <th className="py-3 px-4 font-semibold">Confidence</th>
                    <th className="py-3 px-4 font-semibold">Document Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-white/8">
                  {primary.eligibility.criteriaMatrix.map((row) => (
                    <tr key={row.id}>
                      <td className="py-3.5 px-4 font-semibold">{row.category}</td>
                      <td className="py-3.5 px-4">
                        <p className="font-medium">{row.requirementText}</p>
                        <p className="text-[11px] text-[#64748B] dark:text-[#CBD5E1] mt-0.5">{row.explanation}</p>
                      </td>
                      <td className="py-3.5 px-4 text-[#64748B] dark:text-[#CBD5E1]">{row.userEvidence}</td>
                      <td className="py-3.5 px-4 font-semibold whitespace-nowrap">
                        <span
                          className={
                            row.status === 'Satisfied'
                              ? 'text-[#16A34A]'
                              : row.status === 'Potential Disqualifier' || row.status === 'Unsatisfied'
                              ? 'text-[#DC2626]'
                              : 'text-[#D97706]'
                          }
                        >
                          {row.status === 'Unknown' ? 'Unknown (Verify)' : row.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono">{row.confidence}</td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#164E8B] dark:text-[#38BDF8]">
                        {row.documentRef}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-5 rounded-2xl oppsift-card space-y-2 text-xs">
              <h3 className="font-display text-sm font-semibold">Recommended Verification Steps</h3>
              <ul className="space-y-1.5 text-[#64748B] dark:text-[#CBD5E1]">
                {primary.eligibility.recommendedNextSteps.map((s) => (
                  <li key={s} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#164E8B] dark:text-[#38BDF8] shrink-0" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Module D: Requirements Extraction */}
        {activeTab === 'extraction' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 p-5 rounded-2xl oppsift-card space-y-3 text-xs min-w-0">
              <h2 className="font-display text-base font-semibold">Indexed Documents ({primary.documents.length})</h2>
              <button
                type="button"
                onClick={() => setDocFilter('All')}
                className={`w-full text-left p-3 rounded-xl border ${
                  docFilter === 'All'
                    ? 'border-[#A33B59] bg-[#FFF1F2] dark:bg-[#541B32]/30 font-semibold'
                    : 'border-[#E2E8F0] dark:border-white/10'
                }`}
              >
                All Extracted Clauses
              </button>
              {primary.documents.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setDocFilter(doc.name)}
                  className={`w-full text-left p-3 rounded-xl border ${
                    docFilter === doc.name
                      ? 'border-[#A33B59] bg-[#FFF1F2] dark:bg-[#541B32]/30 font-semibold'
                      : 'border-[#E2E8F0] dark:border-white/10'
                  }`}
                >
                  <p className="truncate">{doc.name}</p>
                  <p className="text-[11px] text-[#64748B] dark:text-[#CBD5E1] mt-0.5">
                    {doc.format} · {doc.size} · {doc.isMandatory ? 'Mandatory' : 'Supporting'}
                  </p>
                </button>
              ))}
            </div>

            <div className="lg:col-span-8 p-6 rounded-2xl oppsift-card space-y-4 text-xs min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-base font-semibold">Categorised Requirement Breakdown</h2>
                <div className="flex flex-wrap gap-1">
                  {['All', 'Mandatory', 'Technical', 'Financial', 'Administrative', 'Submission'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setReqCatFilter(cat)}
                      className={`px-2.5 py-1 rounded-lg font-medium ${
                        reqCatFilter === cat
                          ? 'bg-[#541B32] text-white'
                          : 'bg-[#F1F5F9] dark:bg-white/8 text-[#64748B] dark:text-[#CBD5E1]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {filteredCriteria.map((c) => (
                  <div key={c.id} className="p-4 rounded-xl border border-[#E2E8F0] dark:border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#A33B59] dark:text-[#E8A4B5]">{c.category} Requirement</span>
                      <span className="font-mono text-[11px] text-[#164E8B] dark:text-[#38BDF8]">{c.documentRef}</span>
                    </div>
                    <p className="text-sm font-semibold">{c.requirementText}</p>
                    <p className="text-[#64748B] dark:text-[#CBD5E1]">Extracted note: {c.explanation}</p>
                  </div>
                ))}
                {filteredCriteria.length === 0 && (
                  <p className="text-[#64748B] dark:text-[#CBD5E1]">No clauses in this category filter for {primary.referenceNumber}.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Module E: Risk & Suitability */}
        {activeTab === 'risks' && (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl oppsift-card text-xs">
              <h2 className="font-display text-base font-bold">Risk, Blocker &amp; Completeness Register</h2>
              <p className="text-[#64748B] dark:text-[#CBD5E1] mt-1">
                Explicitly marks whether each risk comes from a verified notice clause or AI-assisted suitability inference.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {primary.eligibility.riskObservations.map((r, idx) => (
                <div key={idx} className="p-5 rounded-2xl oppsift-card space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold flex items-center gap-1.5">
                      <ShieldAlert className={`w-4 h-4 ${r.severity === 'High' ? 'text-[#DC2626]' : 'text-[#D97706]'}`} />
                      {r.dimension} Risk
                    </span>
                    <span className={r.severity === 'High' ? 'text-[#DC2626] font-semibold' : 'text-[#D97706] font-semibold'}>
                      {r.severity} Severity
                    </span>
                  </div>
                  <p className="text-sm font-medium">{r.detail}</p>
                  <p className="text-[11px] font-mono text-[#164E8B] dark:text-[#38BDF8]">
                    Source Basis: {r.isVerifiedFact ? 'Verified Notice Fact' : 'AI Suitability Observation'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Module F: Enterprise AI Research Workspace */}
        {activeTab === 'research' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 p-5 rounded-2xl oppsift-card space-y-4 text-xs min-w-0">
              <h2 className="font-display text-base font-semibold">Research Context</h2>
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-white/6 border border-[#E2E8F0] dark:border-white/10 space-y-1">
                <p className="font-mono text-[#A33B59] dark:text-[#E8A4B5]">{primary.referenceNumber}</p>
                <p className="font-semibold">{primary.title}</p>
                <p className="text-[#64748B] dark:text-[#CBD5E1]">{primary.documents.length} source documents attached</p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold">Suggested Research Prompts</p>
                {[
                  'List mandatory documents and submission deadlines',
                  'What are our unverified eligibility requirements?',
                  'Identify sovereign cloud or residency restrictions',
                ].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleSendChat(prompt)}
                    className="w-full text-left p-2.5 rounded-lg border border-[#E2E8F0] dark:border-white/12 hover:border-[#A33B59]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-8 rounded-2xl oppsift-card flex flex-col overflow-hidden min-h-[420px] min-w-0">
              <div className="px-5 py-3.5 border-b border-[#E2E8F0] dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-display font-semibold text-sm">Structured Opportunity Q&amp;A</span>
                <span className="text-[#64748B] dark:text-[#CBD5E1]">Requires Gemini API backend for live inference</span>
              </div>
              <div className="flex-1 p-4 sm:p-5 space-y-4 overflow-y-auto max-h-[380px]">
                {chatHistory.map((m) => (
                  <div
                    key={m.id}
                    className={`p-4 rounded-2xl text-xs space-y-2 ${
                      m.role === 'user'
                        ? 'ml-2 sm:ml-8 bg-[#541B32] text-white'
                        : 'mr-2 sm:mr-8 bg-[#F8FAFC] dark:bg-white/6 border border-[#E2E8F0] dark:border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between opacity-80 text-[11px]">
                      <span className="font-semibold">{m.role === 'user' ? onboarding.fullName : 'OppSift Research Assistant'}</span>
                      <span className="font-mono">{m.timestamp}</span>
                    </div>
                    <p className="leading-relaxed text-xs sm:text-sm">{m.text}</p>
                    {m.citations && (
                      <div className="pt-2 border-t border-black/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <span className="font-mono text-[#164E8B] dark:text-[#38BDF8]">
                          Citations: {m.citations.join(' · ')}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(m.text);
                            pushToast('info', 'Analysis excerpt copied to clipboard.');
                          }}
                          className="inline-flex items-center gap-1 hover:underline"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {isThinking && (
                  <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] font-mono">
                    Synthesising published requirements and citation clauses...
                  </p>
                )}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChat();
                }}
                className="p-4 border-t border-[#E2E8F0] dark:border-white/10 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={`Ask about requirements, deadlines, or risks in ${primary.referenceNumber}...`}
                  className="flex-1 h-10 px-3.5 rounded-xl border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-xs"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-[#541B32] hover:bg-[#A33B59] text-white text-xs font-semibold"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Ask</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Module G: Side-by-Side Comparison */}
        {activeTab === 'compare' && (
          <section className="p-6 rounded-2xl oppsift-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-semibold">Side-by-Side Intelligence Comparison</h2>
                <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">Evaluate effort, deadline, value, and eligibility risks</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <select
                  value={compareId}
                  onChange={(e) => setCompareId(e.target.value)}
                  className="h-9 px-2.5 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6"
                >
                  {opportunities.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.referenceNumber} ({o.countryCode})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => navigate('/discover/compare')}
                  className="px-3.5 py-2 rounded-lg bg-[#541B32] text-white font-semibold"
                >
                  Open Multi-Compare Matrix →
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#E2E8F0] dark:border-white/10 text-[#64748B] dark:text-[#CBD5E1]">
                  <tr>
                    <th className="py-2.5 pr-4 font-semibold">Dimension</th>
                    <th className="py-2.5 px-4 font-semibold">{primary.referenceNumber}</th>
                    <th className="py-2.5 pl-4 font-semibold">{secondary.referenceNumber}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-white/8">
                  <tr>
                    <td className="py-2.5 pr-4 font-medium">Title</td>
                    <td className="py-2.5 px-4">{primary.title}</td>
                    <td className="py-2.5 pl-4">{secondary.title}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-medium">Estimated Value</td>
                    <td className="py-2.5 px-4 font-mono tabular-nums">{formatCurrencyValue(primary.estimatedValue, primary.currency)}</td>
                    <td className="py-2.5 pl-4 font-mono tabular-nums">{formatCurrencyValue(secondary.estimatedValue, secondary.currency)}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-medium">Deadline</td>
                    <td className="py-2.5 px-4 font-mono tabular-nums">{formatDisplayDate(primary.deadlineDate)}</td>
                    <td className="py-2.5 pl-4 font-mono tabular-nums">{formatDisplayDate(secondary.deadlineDate)}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-medium">Eligibility</td>
                    <td className="py-2.5 px-4 font-semibold">{primary.eligibility.status}</td>
                    <td className="py-2.5 pl-4 font-semibold">{secondary.eligibility.status}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Module H: Printable Analysis Report */}
        {activeTab === 'report' && (
          <div className="p-8 rounded-2xl oppsift-card space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E8F0] dark:border-white/10 pb-4">
              <div>
                <p className="text-xs font-mono text-[#A33B59] dark:text-[#E8A4B5]">OPPSIFT EXECUTIVE INTELLIGENCE BRIEF</p>
                <h2 className="mt-1 font-display text-xl font-bold">{primary.title}</h2>
                <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] mt-1">
                  Prepared for {onboarding.organisationName} · Reference: {primary.referenceNumber} · Verified {primary.lastVerifiedAt}
                </p>
              </div>
              <div className="flex items-center gap-2 no-print">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#541B32] text-white text-xs font-semibold"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save PDF</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-2">
                <h3 className="font-display text-sm font-semibold">1. Official Scope &amp; Value</h3>
                <p className="text-[#64748B] dark:text-[#CBD5E1] leading-relaxed">{primary.description}</p>
                <p className="font-mono font-semibold">
                  Est. Value: {formatCurrencyValue(primary.estimatedValue, primary.currency)} · Due {formatDisplayDate(primary.deadlineDate)}
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-display text-sm font-semibold">2. Eligibility Verdict</h3>
                <p className="font-semibold">{primary.eligibility.status} ({primary.eligibility.confidenceLabel})</p>
                <p className="text-[#64748B] dark:text-[#CBD5E1] leading-relaxed">{primary.eligibility.explanation}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <h3 className="font-display text-sm font-semibold">3. Recommended Decision Next Steps</h3>
              <ul className="space-y-1 text-[#64748B] dark:text-[#CBD5E1]">
                {primary.eligibility.recommendedNextSteps.map((s) => (
                  <li key={s}>• {s}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}

export function AlertsMonitoringPage() {
  const { alertRules, toggleAlertRule, addAlertRule, countries } = useAppState();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [ruleName, setRuleName] = useState('');
  const [triggerType, setTriggerType] = useState<'Saved Search' | 'Deadline Reminder' | 'Amendment Watch' | 'Source Update'>('Saved Search');
  const [keywords, setKeywords] = useState('');
  const [selectedCountries, setSelectedCountries] = useState<string[]>(['GB', 'EU']);
  const [selectedCategories, setSelectedCategories] = useState<OpportunityCategory[]>(['Government Tender']);
  const [leadDays, setLeadDays] = useState(14);
  const [frequency, setFrequency] = useState<'Immediate' | 'Daily' | 'Weekly'>('Daily');
  const [channel, setChannel] = useState<'In-App & Email' | 'In-App Only' | 'Email Digest'>('In-App & Email');

  const activeCount = alertRules.filter((r) => r.status === 'Active').length;

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) return;
    addAlertRule({
      name: ruleName.trim(),
      triggerType,
      keywords: keywords.trim() || 'All matching notices',
      countries: selectedCountries.length ? selectedCountries : ['GB'],
      categories: selectedCategories,
      sectors: ['All'],
      leadDays,
      frequency,
      channel,
      scopeDescription: `${triggerType} watching ${selectedCountries.join(', ')} (${frequency}, ${channel}).`,
    });
    setRuleName('');
    setKeywords('');
    setDrawerOpen(false);
  };

  const toggleCountry = (code: string) => {
    setSelectedCountries((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  return (
    <WorkspaceLayout title="Alerts & Active Monitoring" breadcrumb="Monitoring / Alerts">
      <div className="space-y-6">
        <div className="p-5 rounded-2xl oppsift-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold">Alert Rules &amp; Watchdogs</h2>
            <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">
              {activeCount} active monitoring rules · Instant notifications for corrigenda, deadlines &amp; high-match tenders.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-[#541B32] hover:bg-[#A33B59] text-white text-xs font-semibold whitespace-nowrap self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Configure New Alert Rule</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alertRules.map((rule) => (
            <div key={rule.id} className="p-5 rounded-2xl oppsift-card space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#164E8B] dark:text-[#38BDF8]">{rule.triggerType}</span>
                <span className={rule.status === 'Active' ? 'text-[#16A34A] font-semibold' : 'text-[#64748B] font-semibold'}>
                  {rule.status}
                </span>
              </div>
              <h3 className="font-display text-base font-semibold">{rule.name}</h3>
              <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">{rule.scopeDescription}</p>
              <div className="text-[11px] font-mono text-[#64748B] dark:text-[#CBD5E1]">
                Markets: {rule.countries.join(', ')} · Frequency: {rule.frequency} · Lead: {rule.leadDays}d
              </div>
              <div className="pt-3 border-t border-[#E2E8F0] dark:border-white/10 flex items-center justify-between text-xs">
                <span className="text-[#64748B] dark:text-[#CBD5E1]">{rule.channel} · Last: {rule.lastTriggered}</span>
                <button
                  type="button"
                  onClick={() => toggleAlertRule(rule.id)}
                  className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-white/12 font-medium"
                >
                  {rule.status === 'Active' ? 'Pause' : 'Resume'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Alert Rule Configuration Modal */}
        {drawerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <form
              onSubmit={handleCreateRule}
              className="w-full max-w-xl rounded-2xl border border-[#E2E8F0] dark:border-white/15 bg-white dark:bg-[#161224] p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold">Configure Monitoring Alert Rule</h3>
                <button type="button" onClick={() => setDrawerOpen(false)} className="p-1 text-[#64748B]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-medium mb-1">Rule Name</label>
                  <input
                    type="text"
                    required
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    placeholder="e.g., Nordic & UK Zero-Trust Security Tenders"
                    className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Trigger Type</label>
                  <select
                    value={triggerType}
                    onChange={(e) => setTriggerType(e.target.value as typeof triggerType)}
                    className="w-full h-9 px-2.5 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6"
                  >
                    <option value="Saved Search">Saved Search Match</option>
                    <option value="Deadline Reminder">Deadline Reminder</option>
                    <option value="Amendment Watch">Amendment Watch</option>
                    <option value="Source Update">Source Update</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Keywords / Boolean Query</label>
                  <input
                    type="text"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="zero-trust OR interoperability"
                    className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-medium mb-1">Target Jurisdictions</label>
                  <div className="flex flex-wrap gap-1.5">
                    {countries.slice(0, 7).map((c) => {
                      const active = selectedCountries.includes(c.code);
                      return (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => toggleCountry(c.code)}
                          className={`px-2.5 py-1 rounded-lg border text-xs ${
                            active
                              ? 'border-[#541B32] bg-[#FFF1F2] dark:bg-[#541B32]/40 text-[#541B32] dark:text-[#E8A4B5] font-semibold'
                              : 'border-[#E2E8F0] dark:border-white/12'
                          }`}
                        >
                          {c.code}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="block font-medium mb-1">Digest Frequency</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as typeof frequency)}
                    className="w-full h-9 px-2.5 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6"
                  >
                    <option value="Immediate">Immediate</option>
                    <option value="Daily">Daily Digest</option>
                    <option value="Weekly">Weekly Summary</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Delivery Channel</label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as typeof channel)}
                    className="w-full h-9 px-2.5 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6"
                  >
                    <option value="In-App & Email">In-App &amp; Email</option>
                    <option value="In-App Only">In-App Only</option>
                    <option value="Email Digest">Email Digest</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Deadline Lead Warning (Days)</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={leadDays}
                    onChange={(e) => setLeadDays(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Primary Category</label>
                  <select
                    value={selectedCategories[0]}
                    onChange={(e) => setSelectedCategories([e.target.value as OpportunityCategory])}
                    className="w-full h-9 px-2.5 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6"
                  >
                    <option value="Government Tender">Government Tender</option>
                    <option value="Public Procurement">Public Procurement</option>
                    <option value="RFP">RFP</option>
                    <option value="Grant & Funding">Grant &amp; Funding</option>
                    <option value="Commercial Contract">Commercial Contract</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] dark:border-white/12 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#541B32] hover:bg-[#A33B59] text-white text-xs font-semibold"
                >
                  Save Alert Rule
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}

export function NotificationsCentrePage() {
  const { navigate } = useRouter();
  const { notifications, markNotificationRead, markAllNotificationsRead } = useAppState();
  const [filter, setFilter] = useState<'All' | 'Unread' | 'Read'>('All');
  const [selectedId, setSelectedId] = useState<string>(notifications[0]?.id || '');

  const list = notifications.filter((n) =>
    filter === 'Unread' ? !n.read : filter === 'Read' ? n.read : true
  );
  const activeNotif = notifications.find((n) => n.id === selectedId) || list[0];

  return (
    <WorkspaceLayout title="Notifications Centre" breadcrumb="Monitoring / Notifications">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 rounded-xl oppsift-card max-w-full overflow-x-auto">
            {(['All', 'Unread', 'Read'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 ${
                  filter === tab
                    ? 'bg-[#541B32] text-white'
                    : 'text-[#64748B] dark:text-[#CBD5E1]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={markAllNotificationsRead}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-white/12 text-xs font-medium"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark All as Read</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-white/12 text-xs font-medium"
            >
              Preferences
            </button>
          </div>
        </div>

        {list.length === 0 ? (
          <EmptyStatePanel
            title="No notifications in this view"
            description="New matching opportunities, deadline alerts, and amendment notices will appear here."
            actionLabel="View All Notifications"
            onAction={() => setFilter('All')}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-6 divide-y divide-[#E2E8F0] dark:divide-white/8 rounded-2xl oppsift-card overflow-hidden min-w-0">
              {list.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(n.id);
                    markNotificationRead(n.id);
                  }}
                  className={`w-full text-left p-4 transition-colors ${
                    activeNotif?.id === n.id
                      ? 'bg-[#FFF1F2]/60 dark:bg-[#541B32]/30'
                      : 'hover:bg-[#F8FAFC] dark:hover:bg-white/4'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] text-[#64748B] dark:text-[#CBD5E1]">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-[#A33B59] dark:text-[#E8A4B5]">
                      <Bell className="w-3 h-3" />
                      {n.type} · {n.read ? 'Read' : 'Unread'}
                    </span>
                    <span className="font-mono">{n.timestamp}</span>
                  </div>
                  <p className="mt-1 font-display text-sm font-semibold">{n.title}</p>
                  <p className="mt-0.5 text-xs text-[#64748B] dark:text-[#CBD5E1] line-clamp-2">{n.description}</p>
                </button>
              ))}
            </div>

            {activeNotif && (
              <div className="lg:col-span-6 p-6 rounded-2xl oppsift-card space-y-4 min-w-0">
                <div className="flex items-center justify-between text-xs text-[#64748B] dark:text-[#CBD5E1]">
                  <span className="font-semibold text-[#164E8B] dark:text-[#38BDF8]">{activeNotif.type} Event</span>
                  <span className="font-mono">{activeNotif.timestamp}</span>
                </div>
                <h2 className="font-display text-lg font-bold">{activeNotif.title}</h2>
                {activeNotif.opportunityRef && (
                  <p className="font-mono text-xs text-[#A33B59] dark:text-[#E8A4B5]">
                    Reference: {activeNotif.opportunityRef}
                  </p>
                )}
                <p className="text-sm text-[#64748B] dark:text-[#CBD5E1] leading-relaxed">
                  {activeNotif.detailBody}
                </p>
                {activeNotif.targetRoute && (
                  <div className="pt-3 border-t border-[#E2E8F0] dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => navigate(activeNotif.targetRoute!)}
                      className="px-4 py-2 rounded-xl bg-[#541B32] hover:bg-[#A33B59] text-white text-xs font-semibold"
                    >
                      Open Referenced Record →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}

export function AnalyticsPage() {
  const { countries } = useAppState();
  const [regionScope, setRegionScope] = useState('All');
  const [intelTab, setIntelTab] = useState<'global' | 'country' | 'sector'>('global');
  const scopedCountries = countries.filter((c) => regionScope === 'All' || c.region === regionScope);

  return (
    <WorkspaceLayout title="Global, Country & Sector Analytics" breadcrumb="Analytics / Market Intelligence">
      <div className="space-y-6">
        <CinematicVideoBackdrop
          playlistIds={['global-markets', 'energy-sustainability', 'research-innovation']}
          overlayTone="navy"
          className="rounded-lg border border-[#E2E8F0] dark:border-white/10"
          showControls={true}
        >
          <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-[#38BDF8]">Market &amp; Sector Intelligence</p>
              <h2 className="mt-1 font-display text-xl sm:text-2xl font-bold text-white">
                Cross-Border Procurement Volume &amp; Sector Concentration
              </h2>
              <p className="mt-1 text-xs text-white/80 max-w-2xl">
                Normalised multi-country series tracking publication cadence, eligibility alignment, and active deadline windows.
              </p>
            </div>
            <select
              value={regionScope}
              onChange={(e) => setRegionScope(e.target.value)}
              className="h-9 px-3 rounded-md border border-white/20 bg-[#0B1F3A]/85 text-white text-xs font-medium self-start lg:self-auto"
            >
              <option value="All">All Regions</option>
              <option value="Europe">Europe</option>
              <option value="Asia-Pacific">Asia-Pacific</option>
              <option value="North America">North America</option>
            </select>
          </div>
        </CinematicVideoBackdrop>

        <div className="oppsift-intel-rule pt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 rounded-lg oppsift-card max-w-full overflow-x-auto">
            {[
              { id: 'global' as const, label: 'Global Market Intelligence' },
              { id: 'country' as const, label: 'Country Intelligence' },
              { id: 'sector' as const, label: 'Sector Intelligence' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setIntelTab(t.id)}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 ${
                  intelTab === t.id ? 'bg-[#541B32] text-white' : 'text-[#64748B] dark:text-[#CBD5E1]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <span className="font-mono text-xs text-[#64748B] dark:text-[#94A3B8]">
            Scope: {regionScope} · {scopedCountries.length} jurisdiction(s)
          </span>
        </div>

        {intelTab === 'global' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 p-5 rounded-lg oppsift-card min-w-0">
                <h2 className="font-display text-base font-semibold mb-4">Publication, Match &amp; Pipeline Trends</h2>
                <DiscoveryTrendChart data={DISCOVERY_TREND_SERIES} />
              </div>
              <div className="lg:col-span-5 p-5 rounded-lg oppsift-card min-w-0">
                <h2 className="font-display text-base font-semibold mb-4">Category Composition</h2>
                <CategorySplitRing
                  segments={[
                    { label: 'Government Tender', value: 842, color: '#EC4899' },
                    { label: 'Public Procurement', value: 718, color: '#A855F7' },
                    { label: 'Grant & Funding', value: 524, color: '#38BDF8' },
                    { label: 'RFP & Commercial', value: 659, color: '#164E8B' },
                  ]}
                />
              </div>
            </div>
            <div className="p-5 rounded-lg oppsift-card">
              <h3 className="font-display text-base font-semibold mb-4">Deadline Window Distribution</h3>
              <HorizontalBarChart
                items={[
                  { label: '0–14 days (Urgent)', value: 184, accent: 'burgundy' },
                  { label: '15–30 days (Active Prep)', value: 492, accent: 'burgundy' },
                  { label: '31–60 days (Pipeline)', value: 816, accent: 'blue' },
                  { label: '60+ days (Early Watch)', value: 641, accent: 'blue' },
                ]}
              />
            </div>
          </>
        )}

        {intelTab === 'country' && (
          <div className="p-6 rounded-lg oppsift-card space-y-5">
            <h2 className="font-display text-base font-semibold">Indexed Notices &amp; Freshness by Jurisdiction</h2>
            <HorizontalBarChart
              items={scopedCountries.map((c) => ({
                label: `${c.name} (${c.currency})`,
                value: c.sampleRecordCount,
                sublabel: `${c.coverageStatus} · ${c.activeSourcesCount} sources`,
                accent: 'blue',
              }))}
            />
          </div>
        )}

        {intelTab === 'sector' && (
          <div className="p-6 rounded-lg oppsift-card space-y-5">
            <h2 className="font-display text-base font-semibold">Sector Demand &amp; Funding Concentration</h2>
            <HorizontalBarChart
              items={[
                { label: 'Healthcare & Life Sciences', value: 312, sublabel: 'UK / EU lead', accent: 'burgundy' },
                { label: 'Cybersecurity & Federal IT', value: 289, sublabel: 'US / DE lead', accent: 'blue' },
                { label: 'Energy Grid & Decarbonisation', value: 244, sublabel: 'EU / CA lead', accent: 'burgundy' },
                { label: 'Water & Environmental Systems', value: 196, sublabel: 'SG / AU lead', accent: 'blue' },
                { label: 'Smart Mobility & Logistics', value: 168, sublabel: 'DE / SG lead', accent: 'burgundy' },
              ]}
            />
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}

export function ReportsPage() {
  const { opportunities, savedReports, addSavedReport, pushToast, countries } = useAppState();
  const [reportType, setReportType] = useState<'Country' | 'Sector' | 'Eligibility' | 'Pipeline'>('Country');
  const [reportTitle, setReportTitle] = useState('');
  const [countryScope, setCountryScope] = useState('All');

  const scopedOpps = opportunities.filter(
    (o) => countryScope === 'All' || o.countryCode === countryScope
  );

  const exportCsv = () => {
    const header = ['Reference', 'Title', 'Country', 'Category', 'Deadline', 'Currency', 'Value', 'Eligibility'];
    const rows = scopedOpps.map((o) => [
      o.referenceNumber,
      `"${o.title.replace(/"/g, '""')}"`,
      o.countryCode,
      o.category,
      o.deadlineDate,
      o.currency,
      o.estimatedValue ?? '',
      o.eligibility.status,
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `oppsift-${reportType.toLowerCase()}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addSavedReport({
      name: reportTitle.trim() || `${reportType} Intelligence Export (${countryScope})`,
      type: reportType,
      scope: `${countryScope} · ${scopedOpps.length} notices`,
      format: 'CSV',
    });
    pushToast('success', `Exported ${reportType} report as CSV.`);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(scopedOpps, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `oppsift-${reportType.toLowerCase()}-report.json`;
    a.click();
    URL.revokeObjectURL(url);
    addSavedReport({
      name: reportTitle.trim() || `${reportType} Structured Dataset (${countryScope})`,
      type: reportType,
      scope: `${countryScope} · ${scopedOpps.length} notices`,
      format: 'JSON',
    });
    pushToast('success', `Exported ${reportType} report as JSON.`);
  };

  return (
    <WorkspaceLayout title="Reporting Studio" breadcrumb="Analytics / Reports">
      <div className="space-y-6">
        <div className="p-5 rounded-2xl oppsift-card space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-[#F1F5F9] dark:bg-white/6">
              {(['Country', 'Sector', 'Eligibility', 'Pipeline'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setReportType(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                    reportType === t
                      ? 'bg-[#541B32] text-white'
                      : 'text-[#64748B] dark:text-[#CBD5E1]'
                  }`}
                >
                  {t} Report
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={exportCsv}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#541B32] hover:bg-[#A33B59] text-white text-xs font-semibold"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={exportJson}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E2E8F0] dark:border-white/12 text-xs font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E2E8F0] dark:border-white/12 text-xs font-medium"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Brief</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-[#E2E8F0] dark:border-white/10">
            <div>
              <label className="block text-[#64748B] dark:text-[#CBD5E1] mb-1">Custom Report Name</label>
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder={`${reportType} Intelligence Brief — Q4 2026`}
                className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6"
              />
            </div>
            <div>
              <label className="block text-[#64748B] dark:text-[#CBD5E1] mb-1">Country Scope</label>
              <select
                value={countryScope}
                onChange={(e) => setCountryScope(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6"
              >
                <option value="All">All Supported Countries</option>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 p-6 rounded-2xl oppsift-card space-y-4 min-w-0">
            <h2 className="font-display text-lg font-bold">{reportType} Intelligence Report ({scopedOpps.length} rows)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#E2E8F0] dark:border-white/10 text-[#64748B] dark:text-[#CBD5E1]">
                  <tr>
                    <th className="py-2.5 pr-4 font-semibold">Reference</th>
                    <th className="py-2.5 px-4 font-semibold">Country</th>
                    <th className="py-2.5 px-4 font-semibold">Sector</th>
                    <th className="py-2.5 px-4 font-semibold">Eligibility</th>
                    <th className="py-2.5 pl-4 font-semibold text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-white/8">
                  {scopedOpps.map((o) => (
                    <tr key={o.id}>
                      <td className="py-2.5 pr-4 font-mono">{o.referenceNumber}</td>
                      <td className="py-2.5 px-4">{o.countryName}</td>
                      <td className="py-2.5 px-4">{o.sector}</td>
                      <td className="py-2.5 px-4">{o.eligibility.status}</td>
                      <td className="py-2.5 pl-4 text-right font-mono tabular-nums">
                        {formatCurrencyValue(o.estimatedValue, o.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-4 p-6 rounded-2xl oppsift-card space-y-3 text-xs min-w-0">
            <h3 className="font-display text-base font-semibold">Saved &amp; Exported Reports</h3>
            <div className="space-y-2.5">
              {savedReports.map((rep) => (
                <div key={rep.id} className="p-3 rounded-xl border border-[#E2E8F0] dark:border-white/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#A33B59] dark:text-[#E8A4B5]">{rep.type}</span>
                    <span className="font-mono text-[11px]">{rep.format}</span>
                  </div>
                  <p className="font-semibold">{rep.name}</p>
                  <p className="text-[#64748B] dark:text-[#CBD5E1]">{rep.scope} · {rep.generatedAt}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
}

export function MatchedOpportunitiesPage() {
  const { navigate } = useRouter();
  const { opportunities, onboarding, savedIds, toggleSaveOpportunity, addToPipeline } = useAppState();
  const [onlyPreferredMarkets, setOnlyPreferredMarkets] = useState(false);
  const [onlyLikelyEligible, setOnlyLikelyEligible] = useState(false);

  const matchedList = opportunities
    .map((opp) => {
      const inPreferredCountry = onboarding.countriesOfInterest.includes(opp.countryCode);
      const inPreferredSector = onboarding.sectors.some((s) =>
        opp.sector.toLowerCase().includes(s.toLowerCase()) ||
        s.toLowerCase().includes(opp.sector.toLowerCase())
      );
      const calibratedScore = Math.min(
        99,
        opp.matchScore + (inPreferredCountry ? 4 : 0) + (inPreferredSector ? 3 : 0)
      );
      return {
        opp,
        inPreferredCountry,
        inPreferredSector,
        calibratedScore,
      };
    })
    .filter(({ opp, inPreferredCountry }) => {
      if (onlyPreferredMarkets && !inPreferredCountry) return false;
      if (onlyLikelyEligible && opp.eligibility.status !== 'Likely Eligible') return false;
      return true;
    })
    .sort((a, b) => b.calibratedScore - a.calibratedScore);

  return (
    <WorkspaceLayout title="Matched for You" breadcrumb="Workspace / Matched Opportunities">
      <div className="space-y-6">
        <div className="p-5 rounded-2xl oppsift-card flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs">
          <div className="space-y-1 max-w-2xl">
            <p className="font-semibold text-[#A33B59] dark:text-[#E8A4B5]">
              Profile Calibration · {onboarding.organisationName}
            </p>
            <h2 className="font-display text-lg font-bold">
              Opportunities Ranked Against Your Jurisdictions &amp; Capabilities
            </h2>
            <p className="text-[#64748B] dark:text-[#CBD5E1]">
              Active markets: {onboarding.countriesOfInterest.join(', ') || 'Global'} · Preferred currency: {onboarding.preferredCurrency}.
              Missing profile details remain flagged as Unverified rather than assumed eligible.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setOnlyPreferredMarkets((v) => !v)}
              className={`px-3 py-2 rounded-xl border font-semibold transition-colors ${
                onlyPreferredMarkets
                  ? 'border-[#A33B59] bg-[#FFF1F2] dark:bg-[#541B32]/40 text-[#541B32] dark:text-[#E8A4B5]'
                  : 'border-[#E2E8F0] dark:border-white/12'
              }`}
            >
              Preferred Markets Only
            </button>
            <button
              type="button"
              onClick={() => setOnlyLikelyEligible((v) => !v)}
              className={`px-3 py-2 rounded-xl border font-semibold transition-colors ${
                onlyLikelyEligible
                  ? 'border-[#164E8B] bg-[#E0F2FE] dark:bg-[#164E8B]/40 text-[#164E8B] dark:text-[#38BDF8]'
                  : 'border-[#E2E8F0] dark:border-white/12'
              }`}
            >
              Likely Eligible Only
            </button>
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="px-3.5 py-2 rounded-xl bg-[#541B32] hover:bg-[#A33B59] text-white font-semibold"
            >
              Calibrate Profile
            </button>
          </div>
        </div>

        {matchedList.length === 0 ? (
          <EmptyStatePanel
            title="No matches under these strict filters"
            description="Disable one of the market or eligibility filters, or expand your target countries in My Profile."
            actionLabel="Show All Ranked Matches"
            onAction={() => {
              setOnlyPreferredMarkets(false);
              setOnlyLikelyEligible(false);
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matchedList.map(({ opp, inPreferredCountry, inPreferredSector, calibratedScore }) => {
              const isSaved = savedIds.includes(opp.id);
              return (
                <article key={opp.id} className="p-5 rounded-2xl oppsift-card flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-mono font-bold text-[#541B32] dark:text-[#E8A4B5]">
                        {calibratedScore}% profile fit · {opp.countryName}
                      </span>
                      <span
                        className={`font-semibold ${
                          opp.eligibility.status === 'Likely Eligible'
                            ? 'text-[#16A34A]'
                            : opp.eligibility.status === 'Potential Disqualifier'
                            ? 'text-[#DC2626]'
                            : 'text-[#D97706]'
                        }`}
                      >
                        {opp.eligibility.status}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate(`/opportunity/${opp.id}`)}
                      className="text-left font-display text-base font-bold hover:text-[#A33B59] dark:hover:text-[#E8A4B5]"
                    >
                      {opp.title}
                    </button>

                    <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">
                      {opp.issuingOrganisation} · <span className="font-mono">{opp.referenceNumber}</span>
                    </p>

                    <div className="flex flex-wrap gap-2 text-[11px] text-[#64748B] dark:text-[#CBD5E1]">
                      <span className="px-2 py-0.5 rounded-md bg-[#F8FAFC] dark:bg-white/6 border border-[#E2E8F0] dark:border-white/10">
                        {inPreferredCountry ? 'Target Jurisdiction' : 'Adjacent Market'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-[#F8FAFC] dark:bg-white/6 border border-[#E2E8F0] dark:border-white/10">
                        {inPreferredSector ? 'Core Sector' : opp.sector}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-[#F8FAFC] dark:bg-white/6 border border-[#E2E8F0] dark:border-white/10">
                        {opp.eligibility.missingInformation.length} unverified field(s)
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#E2E8F0] dark:border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                      <p className="font-mono tabular-nums font-semibold">
                        {formatCurrencyValue(opp.estimatedValue, opp.currency)}
                      </p>
                      <p className="text-[11px] text-[#64748B] dark:text-[#CBD5E1]">
                        Due {formatDisplayDate(opp.deadlineDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggleSaveOpportunity(opp.id)}
                        className={`px-2.5 py-1.5 rounded-lg border font-medium ${
                          isSaved
                            ? 'border-[#541B32] bg-[#FFF1F2] dark:bg-[#541B32]/40 text-[#541B32] dark:text-[#E8A4B5]'
                            : 'border-[#E2E8F0] dark:border-white/12'
                        }`}
                      >
                        {isSaved ? 'Saved' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => addToPipeline(opp.id)}
                        className="px-3 py-1.5 rounded-lg bg-[#541B32] hover:bg-[#A33B59] text-white font-semibold"
                      >
                        Track
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/opportunity/${opp.id}`)}
                        className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-white/12 font-medium"
                      >
                        Inspect
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
