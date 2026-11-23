import React, { useState } from 'react';
import { Eye, RefreshCw, ShieldAlert, X } from 'lucide-react';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout';
import { useAppState } from '../../context/AppStateContext';
import { useRouter } from '../../context/RouterContext';
import { IngestionJob } from '../../types/oppsift';

export function AdminConsolePage({
  section = 'overview',
}: {
  section?: 'overview' | 'sources' | 'coverage' | 'ingestion' | 'quality';
}) {
  const { navigate } = useRouter();
  const { isAdminAuthorized, ingestionJobs, retryIngestionJob, countries, sources } = useAppState();
  const [selectedJob, setSelectedJob] = useState<IngestionJob | null>(null);

  const tabs: { id: typeof section; label: string; route: string }[] = [
    { id: 'overview', label: 'Overview', route: '/admin' },
    { id: 'sources', label: 'Source Registry', route: '/admin/sources' },
    { id: 'coverage', label: 'Country Coverage', route: '/admin/coverage' },
    { id: 'ingestion', label: 'Ingestion Logs', route: '/admin/ingestion' },
    { id: 'quality', label: 'Data Quality Queue', route: '/admin/quality' },
  ];

  const qualityQueue = [
    {
      id: 'dq-104',
      reference: 'EVERGABE-BMI-2026-3091',
      issue: '2 encrypted tender attachments skipped (HTTP 403)',
      source: 'evergabe-online.de',
      state: 'Fallback URL Preserved',
    },
    {
      id: 'dq-105',
      reference: 'EXT-MAERSK-2026-2240',
      issue: 'Contract budget marked undisclosed by commercial issuer',
      source: 'TED Commercial',
      state: 'Verified Non-Disclosed',
    },
    {
      id: 'dq-106',
      reference: 'PPIP-KE-SYNC',
      issue: 'Upstream TLS handshake timeout interrupted delta cursor',
      source: 'PPIP Kenya',
      state: 'Awaiting Source Recovery',
    },
  ];

  return (
    <WorkspaceLayout title="Administration & Platform Operations" breadcrumb={`Admin / ${section}`}>
      <div className="space-y-6">
        {!isAdminAuthorized ? (
          <div className="p-10 rounded-2xl oppsift-card max-w-xl mx-auto text-center space-y-4">
            <ShieldAlert className="w-10 h-10 mx-auto text-[#DC2626]" />
            <h2 className="font-display text-lg font-bold">Administrative permissions required</h2>
            <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] max-w-md mx-auto">
              Ordinary organisation members cannot view ingestion logs or modify source configurations.
            </p>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 rounded-xl oppsift-sidebar-active text-white text-xs font-semibold"
            >
              Return to Dashboard
            </button>
          </div>
        ) : (
          <>
            <div className="p-4 rounded-2xl oppsift-card flex flex-wrap items-center justify-between gap-3 text-xs">
              <p className="text-[#64748B] dark:text-[#CBD5E1]">
                Protected administrative console. Platform Administrator permissions active.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/admin/billing')}
                  className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-white/12 font-semibold text-[#541B32] dark:text-[#E8A4B5]"
                >
                  Financial &amp; Billing Admin
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/admin/audit')}
                  className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-white/12 font-medium"
                >
                  Platform Audit Log
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 p-1.5 rounded-2xl oppsift-card max-w-full overflow-x-auto">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => navigate(t.route)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 ${
                    section === t.id
                      ? 'oppsift-sidebar-active text-white'
                      : 'text-[#64748B] dark:text-[#CBD5E1]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {section === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Configured Sources', value: `${sources.length}` },
                    { label: 'Connected Feeds', value: `${sources.filter((s) => s.availability === 'Connected').length}` },
                    { label: 'Active Jurisdictions', value: `${countries.filter((c) => c.coverageStatus === 'Active').length}` },
                    { label: 'Failed Sync Jobs (24h)', value: `${ingestionJobs.filter((j) => j.status === 'Failed').length}` },
                  ].map((m) => (
                    <div key={m.label} className="p-4 rounded-2xl oppsift-card">
                      <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">{m.label}</p>
                      <p className="mt-1 font-display text-2xl font-bold tabular-nums">{m.value}</p>
                    </div>
                  ))}
                </div>
                <div className="p-5 rounded-2xl oppsift-card">
                  <h2 className="font-display text-base font-semibold mb-3">Recent Ingestion Jobs</h2>
                  <div className="space-y-2 text-xs">
                    {ingestionJobs.slice(0, 4).map((j) => (
                      <div key={j.id} className="flex items-center justify-between py-2 border-b last:border-b-0 border-[#E2E8F0] dark:border-white/8">
                        <span>{j.sourceName} ({j.countryCode})</span>
                        <span className={j.status === 'Succeeded' ? 'text-[#16A34A] font-semibold' : j.status === 'Failed' ? 'text-[#DC2626] font-semibold' : 'text-[#D97706] font-semibold'}>
                          {j.status} · {j.recordsProcessed} records
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {section === 'sources' && (
              <div className="overflow-x-auto rounded-2xl oppsift-card">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] dark:bg-white/6 text-[#64748B] dark:text-[#CBD5E1]">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Source</th>
                      <th className="py-3 px-4 font-semibold">Country</th>
                      <th className="py-3 px-4 font-semibold">Method &amp; Sync</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Last Error / Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] dark:divide-white/8">
                    {sources.map((s) => (
                      <tr key={s.id}>
                        <td className="py-3 px-4 font-medium">
                          <button
                            type="button"
                            onClick={() => navigate(`/sources/${s.id}`)}
                            className="hover:underline text-left font-semibold"
                          >
                            {s.name}
                          </button>
                        </td>
                        <td className="py-3 px-4">{s.countryName}</td>
                        <td className="py-3 px-4 font-mono">{s.accessMethod} · {s.syncFrequency}</td>
                        <td className="py-3 px-4 font-semibold">{s.availability}</td>
                        <td className="py-3 px-4 text-[#DC2626]">{s.lastError || 'Healthy'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {section === 'coverage' && (
              <div className="overflow-x-auto rounded-2xl oppsift-card">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] dark:bg-white/6 text-[#64748B] dark:text-[#CBD5E1]">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Country</th>
                      <th className="py-3 px-4 font-semibold">Categories</th>
                      <th className="py-3 px-4 font-semibold">Sources</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Last Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] dark:divide-white/8">
                    {countries.map((c) => (
                      <tr key={c.code}>
                        <td className="py-3 px-4 font-medium">{c.name} ({c.code})</td>
                        <td className="py-3 px-4">{c.categoriesSupported.join(', ')}</td>
                        <td className="py-3 px-4 font-mono tabular-nums">{c.activeSourcesCount}</td>
                        <td className="py-3 px-4 font-semibold">{c.coverageStatus}</td>
                        <td className="py-3 px-4 font-mono">{c.lastUpdated}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {section === 'ingestion' && (
              <div className="overflow-x-auto rounded-2xl oppsift-card">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] dark:bg-white/6 text-[#64748B] dark:text-[#CBD5E1]">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Job ID</th>
                      <th className="py-3 px-4 font-semibold">Source</th>
                      <th className="py-3 px-4 font-semibold">Duration</th>
                      <th className="py-3 px-4 font-semibold">Collected / Processed</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] dark:divide-white/8">
                    {ingestionJobs.map((j) => (
                      <tr key={j.id}>
                        <td className="py-3 px-4 font-mono">{j.id}</td>
                        <td className="py-3 px-4">
                          <p className="font-medium">{j.sourceName}</p>
                          {j.errorDetail && <p className="text-[#DC2626] mt-0.5">{j.errorDetail}</p>}
                        </td>
                        <td className="py-3 px-4 font-mono">{j.duration}</td>
                        <td className="py-3 px-4 font-mono tabular-nums">
                          {j.recordsCollected} / {j.recordsProcessed}
                        </td>
                        <td className="py-3 px-4 font-semibold">{j.status}</td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => setSelectedJob(j)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#E2E8F0] dark:border-white/12 font-medium"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Logs</span>
                          </button>
                          {j.status !== 'Succeeded' && (
                            <button
                              type="button"
                              onClick={() => retryIngestionJob(j.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#541B32] text-white font-semibold"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Retry</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {section === 'quality' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { title: 'Duplicate Notice Deduplication', value: '99.4%', note: 'Matched by canonical reference + authority URI' },
                    { title: 'Missing Disclosed Value', value: '12.5%', note: 'Explicitly rendered as "Value not disclosed"' },
                    { title: 'Source Attribution Completeness', value: '100%', note: 'All indexed records retain canonical portal links' },
                  ].map((q) => (
                    <div key={q.title} className="p-5 rounded-2xl oppsift-card">
                      <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">{q.title}</p>
                      <p className="mt-2 font-display text-2xl font-bold tabular-nums">{q.value}</p>
                      <p className="mt-1 text-xs text-[#64748B] dark:text-[#CBD5E1]">{q.note}</p>
                    </div>
                  ))}
                </div>

                <div className="overflow-x-auto rounded-2xl oppsift-card">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC] dark:bg-white/6 text-[#64748B] dark:text-[#CBD5E1]">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Queue ID</th>
                        <th className="py-3 px-4 font-semibold">Reference</th>
                        <th className="py-3 px-4 font-semibold">Validation Observation</th>
                        <th className="py-3 px-4 font-semibold">Source</th>
                        <th className="py-3 px-4 font-semibold">Resolution Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] dark:divide-white/8">
                      {qualityQueue.map((row) => (
                        <tr key={row.id}>
                          <td className="py-3 px-4 font-mono">{row.id}</td>
                          <td className="py-3 px-4 font-mono font-semibold">{row.reference}</td>
                          <td className="py-3 px-4">{row.issue}</td>
                          <td className="py-3 px-4">{row.source}</td>
                          <td className="py-3 px-4 font-semibold text-[#164E8B] dark:text-[#38BDF8]">{row.state}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Ingestion Job Log Modal */}
        {selectedJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-xl rounded-2xl border border-[#E2E8F0] dark:border-white/15 bg-white dark:bg-[#161224] p-6 space-y-4 text-xs shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-[#A33B59] dark:text-[#E8A4B5]">{selectedJob.id}</p>
                  <h3 className="font-display text-lg font-bold">{selectedJob.sourceName}</h3>
                </div>
                <button type="button" onClick={() => setSelectedJob(null)} className="p-1 text-[#64748B]">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-white/6 font-mono">
                <p>Started: {selectedJob.startedAt}</p>
                <p>Completed: {selectedJob.completedAt}</p>
                <p>Collected: {selectedJob.recordsCollected}</p>
                <p>Processed: {selectedJob.recordsProcessed}</p>
              </div>
              <div className="p-4 rounded-xl bg-[#0D0A14] text-[#CBD5E1] font-mono text-[11px] space-y-1 max-h-56 overflow-y-auto">
                {selectedJob.logs.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
