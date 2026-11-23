import React, { useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Bookmark,
  Check,
  Compass,
  ExternalLink,
  FileText,
  Film,
  LayoutDashboard,
  Plug,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import { OppSiftLogo } from '../../components/brand/OppSiftLogo';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout';
import { useAppState } from '../../context/AppStateContext';
import { useRouter } from '../../context/RouterContext';
import {
  CINEMATIC_MEDIA_MANIFEST,
  CINEMATIC_PLAYLISTS,
  getMediaCountsSummary,
} from '../../data/cinematicMedia';
import { CinematicPlaylistId, GlobalStateMode } from '../../types/oppsift';

export function IntegrationsPage() {
  const { integrations, toggleIntegration, pushToast } = useAppState();

  return (
    <WorkspaceLayout title="Integrations" breadcrumb="Account / Integrations">
      <div className="space-y-5">
        <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
          Only platform-supported integrations are displayed. Connect or configure authorised services below.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrations.map((intg) => (
            <div key={intg.id} className="p-5 oppsift-card flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#164E8B] dark:text-[#38BDF8]">{intg.category}</span>
                  <span className={intg.status === 'Connected' ? 'text-[#16A34A] dark:text-[#34D399] font-semibold' : 'text-[#64748B] dark:text-[#94A3B8] font-semibold'}>
                    {intg.status}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Plug className="w-4 h-4 text-[#541B32] dark:text-[#E8A4B5]" />
                  <h2 className="font-display text-base font-semibold">{intg.name}</h2>
                </div>
                <p className="mt-1.5 text-xs text-[#64748B] dark:text-[#94A3B8]">{intg.description}</p>
                <p className="mt-2 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                  Permissions: {intg.permissions.join(' · ')}
                </p>
              </div>
              <div className="pt-3 border-t border-[#E2E8F0] dark:border-white/10 flex items-center justify-between text-xs">
                <span className="text-[#64748B] dark:text-[#94A3B8]">{intg.lastSynced || 'Not yet synced'}</span>
                <button
                  type="button"
                  onClick={() => {
                    const nextState = intg.status === 'Connected' ? 'disconnected' : 'connected';
                    toggleIntegration(intg.id);
                    pushToast('info', `${intg.name} ${nextState}.`);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg font-semibold ${
                    intg.status === 'Connected'
                      ? 'border border-[#E2E8F0] dark:border-white/15 text-[#DC2626] dark:text-[#FB7185]'
                      : 'bg-[#541B32] hover:bg-[#A33B59] text-white'
                  }`}
                >
                  {intg.status === 'Connected' ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </WorkspaceLayout>
  );
}


export function FirstTimeUserExperiencePage() {
  const { navigate } = useRouter();

  const zeroStates = [
    {
      title: 'Empty Dashboard',
      icon: <LayoutDashboard className="w-4 h-4 text-[#541B32] dark:text-[#E8A4B5]" />,
      desc: 'No matching notices scored yet because operating jurisdictions and sector capabilities are incomplete.',
      cta: 'Complete Onboarding',
      route: '/onboarding',
    },
    {
      title: 'No Saved Opportunities',
      icon: <Bookmark className="w-4 h-4 text-[#164E8B] dark:text-[#38BDF8]" />,
      desc: 'Bookmarks appear here once you save active tenders, grants, or commercial RFPs from the Explorer.',
      cta: 'Browse Explorer',
      route: '/discover',
    },
    {
      title: 'No Saved Searches',
      icon: <Search className="w-4 h-4 text-[#541B32] dark:text-[#E8A4B5]" />,
      desc: 'Store recurring keyword and jurisdiction criteria to monitor newly published tenders automatically.',
      cta: 'Create Search',
      route: '/discover',
    },
    {
      title: 'No Active Alerts',
      icon: <Bell className="w-4 h-4 text-[#164E8B] dark:text-[#38BDF8]" />,
      desc: 'Deadline escalations and corrigendum monitors activate after creating your first alert rule.',
      cta: 'Configure Alerts',
      route: '/alerts',
    },
    {
      title: 'No AI Analysis History',
      icon: <Sparkles className="w-4 h-4 text-[#541B32] dark:text-[#E8A4B5]" />,
      desc: 'Run an eligibility matrix, requirement extraction, or risk review on any notice to build workspace history.',
      cta: 'Open AI Workspace',
      route: '/intelligence',
    },
    {
      title: 'No Organisation Members',
      icon: <Users className="w-4 h-4 text-[#164E8B] dark:text-[#38BDF8]" />,
      desc: 'Single-user workspace active. Invite capture leads, analysts, or reviewers to collaborate on pipelines.',
      cta: 'Invite Members',
      route: '/teams',
    },
  ];

  return (
    <WorkspaceLayout title="First-Time User Workspace States" breadcrumb="Experience / Zero-Data States">
      <div className="space-y-6">
        <div className="p-6 oppsift-card flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-[#541B32] dark:text-[#E8A4B5]">New Workspace Provisioning</p>
            <h2 className="font-display text-lg font-bold">Welcome to OppSift — Clean Workspace Provisioning</h2>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] max-w-2xl">
              Before opportunities are saved or Postgres sync runs, every surface presents clear guidance rather than fabricated metrics.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate('/onboarding')}
              className="px-4 py-2 rounded-lg bg-[#541B32] hover:bg-[#A33B59] text-white text-xs font-semibold"
            >
              Launch 10-Step Setup
            </button>
            <button
              type="button"
              onClick={() => navigate('/discover')}
              className="px-4 py-2 rounded-lg border border-[#E2E8F0] dark:border-white/15 text-xs font-semibold"
            >
              Explore Opportunity Feed
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {zeroStates.map((item) => (
            <div key={item.title} className="p-5 oppsift-card flex flex-col justify-between gap-4">
              <div>
                <div className="w-9 h-9 rounded-lg bg-[#F1F5F9] dark:bg-white/10 flex items-center justify-center mb-3">
                  {item.icon}
                </div>
                <h3 className="font-display text-sm font-semibold">{item.title}</h3>
                <p className="mt-1.5 text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">{item.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => navigate(item.route)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#541B32] dark:text-[#E8A4B5] hover:underline"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>{item.cta} →</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </WorkspaceLayout>
  );
}

export function BrandSystemPage() {
  const { setGlobalStateMode } = useAppState();
  const { navigate } = useRouter();
  const [selectedPlaylist, setSelectedPlaylist] = useState<'all' | CinematicPlaylistId>('all');
  const mediaSummary = getMediaCountsSummary();
  const visibleClips =
    selectedPlaylist === 'all'
      ? CINEMATIC_MEDIA_MANIFEST
      : CINEMATIC_MEDIA_MANIFEST.filter((c) => c.playlistId === selectedPlaylist);

  const burgundySwatches = [
    { name: 'Deep Burgundy', hex: '#251019' },
    { name: 'Executive Burgundy', hex: '#541B32' },
    { name: 'Burgundy Accent', hex: '#A33B59' },
    { name: 'Rose Accent', hex: '#E8A4B5' },
    { name: 'Soft Rose', hex: '#FFF1F2' },
  ];

  const intelligenceSwatches = [
    { name: 'Deep Intelligence Navy', hex: '#0B1F3A' },
    { name: 'Intelligence Blue', hex: '#164E8B' },
    { name: 'Technology Blue', hex: '#38BDF8' },
    { name: 'Pale Blue', hex: '#E0F2FE' },
    { name: 'White', hex: '#FFFFFF' },
  ];

  const stateModes: { mode: GlobalStateMode; label: string }[] = [
    { mode: 'loading', label: 'Initial Loading' },
    { mode: 'empty', label: 'Empty Results' },
    { mode: 'first-time', label: 'First-Time User' },
    { mode: 'source-unavailable', label: 'Source Unavailable' },
    { mode: 'network-error', label: 'Network Failure' },
    { mode: 'permission-denied', label: 'Permission Denied' },
    { mode: 'session-expired', label: 'Session Expired' },
    { mode: 'expired-opportunity', label: 'Expired Notice' },
    { mode: 'removed-opportunity', label: 'Removed Notice' },
    { mode: 'incomplete-source', label: 'Incomplete Source' },
    { mode: 'invalid-filters', label: 'Invalid Filter Range' },
  ];

  return (
    <WorkspaceLayout title="Brand Foundation & Design System" breadcrumb="Phase 1 / Brand Kit">
      <div className="space-y-8">
        <section className="p-6 oppsift-card space-y-5">
          <div>
            <h2 className="font-display text-lg font-bold">Official OppSift Logo &amp; Asset Variations</h2>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
              Preserves the approved Glossy Global Orbit Monogram emblem alongside scalable lockups and reference surface tokens.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl border border-[#E2E8F0] bg-white text-[#172033] flex flex-col justify-between gap-4">
              <OppSiftLogo variant="primary-horizontal" size="md" />
              <p className="text-[11px] text-[#64748B]">1. Primary Horizontal (Light)</p>
            </div>
            <div className="p-5 rounded-xl border border-white/10 bg-[#120713] text-white flex flex-col justify-between gap-4">
              <OppSiftLogo variant="dark-bg" size="md" />
              <p className="text-[11px] text-[#CBD5E1]">2. Dark-Background Lockup</p>
            </div>
            <div className="p-5 rounded-xl oppsift-sidebar-gradient text-white flex flex-col justify-between gap-4">
              <OppSiftLogo variant="compact" size="md" />
              <p className="text-[11px] text-[#E8A4B5]">3. Compact Sidebar Lockup</p>
            </div>
            <div className="p-5 rounded-xl border border-[#E2E8F0] dark:border-white/10 flex flex-col justify-between gap-4">
              <div className="flex items-center gap-4">
                <OppSiftLogo variant="app-icon" size="lg" />
                <OppSiftLogo variant="symbol" size="md" useUploadedEmblem={false} />
                <OppSiftLogo variant="monochrome" size="sm" />
              </div>
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">4–8. App Icon, Vector Symbol &amp; Mono</p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="p-5 oppsift-kpi-burgundy">
            <p className="text-xs font-semibold text-[#A33B59] dark:text-[#E8A4B5]">Surface Token</p>
            <p className="font-display text-base font-bold mt-1">.oppsift-kpi-burgundy</p>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
              Used for primary volume KPIs and burgundy intelligence accents.
            </p>
          </div>
          <div className="p-5 oppsift-kpi-blue">
            <p className="text-xs font-semibold text-[#164E8B] dark:text-[#38BDF8]">Surface Token</p>
            <p className="font-display text-base font-bold mt-1">.oppsift-kpi-blue</p>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
              Used for active pipeline velocity and global source intelligence cards.
            </p>
          </div>
          <div className="p-5 oppsift-executive-card text-white">
            <p className="text-xs font-semibold text-[#E8A4B5]">Surface Token</p>
            <p className="font-display text-base font-bold mt-1">.oppsift-executive-card</p>
            <p className="text-xs text-white/80 mt-1">
              Deep burgundy-to-navy mesh reserved for workspace readiness and upgrade panels.
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 oppsift-card space-y-4">
            <h3 className="font-display text-base font-semibold">Burgundy Executive (Primary Brand)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {burgundySwatches.map((s) => (
                <div key={s.hex} className="space-y-1.5">
                  <div className="h-14 rounded-lg border border-[#E2E8F0] dark:border-white/10" style={{ backgroundColor: s.hex }} />
                  <p className="text-[11px] font-semibold leading-tight">{s.name}</p>
                  <p className="font-mono text-[10px] text-[#64748B] dark:text-[#94A3B8]">{s.hex}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 oppsift-card space-y-4">
            <h3 className="font-display text-base font-semibold">Global Intelligence (Secondary Analytics)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {intelligenceSwatches.map((s) => (
                <div key={s.hex} className="space-y-1.5">
                  <div className="h-14 rounded-lg border border-[#E2E8F0] dark:border-white/10" style={{ backgroundColor: s.hex }} />
                  <p className="text-[11px] font-semibold leading-tight">{s.name}</p>
                  <p className="font-mono text-[10px] text-[#64748B] dark:text-[#94A3B8]">{s.hex}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="p-6 oppsift-card space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-semibold flex items-center gap-2">
                <Film className="w-4 h-4 text-[#A33B59] dark:text-[#E8A4B5]" />
                <span>Verified Cinematic Media &amp; Licensing Registry</span>
              </h3>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
                {mediaSummary.approvedCount}/{mediaSummary.totalClips} commercially cleared clips across {mediaSummary.playlistCount} themed playlists ({mediaSummary.providers.join(' & ')}).
              </p>
            </div>
            <select
              value={selectedPlaylist}
              onChange={(e) => setSelectedPlaylist(e.target.value as 'all' | CinematicPlaylistId)}
              className="h-9 px-3 rounded-md border border-[#E2E8F0] dark:border-white/15 bg-white dark:bg-[#0B1F3A] text-xs font-medium"
            >
              <option value="all">All 10 Playlists ({mediaSummary.totalClips} clips)</option>
              {Object.values(CINEMATIC_PLAYLISTS).map((pl) => (
                <option key={pl.id} value={pl.id}>
                  {pl.label} (5)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {Object.values(CINEMATIC_PLAYLISTS).map((pl) => {
              const count = CINEMATIC_MEDIA_MANIFEST.filter((c) => c.playlistId === pl.id).length;
              return (
                <button
                  key={pl.id}
                  type="button"
                  onClick={() => setSelectedPlaylist(selectedPlaylist === pl.id ? 'all' : pl.id)}
                  className={`p-3 rounded-md border text-left transition-colors ${
                    selectedPlaylist === pl.id
                      ? 'border-[#A33B59] bg-[#FFF1F2] dark:bg-[#541B32]/40'
                      : 'border-[#E2E8F0] dark:border-white/10 hover:border-[#A33B59]/50'
                  }`}
                >
                  <p className="text-xs font-semibold truncate">{pl.label}</p>
                  <p className="text-[11px] font-mono text-[#64748B] dark:text-[#94A3B8] mt-1">{count} clips · Verified</p>
                </button>
              );
            })}
          </div>

          <div className="overflow-x-auto max-h-80 overflow-y-auto rounded-md border border-[#E2E8F0] dark:border-white/10">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-[#F8FAFC] dark:bg-[#1C2433] text-[#64748B] dark:text-[#CBD5E1]">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Title</th>
                  <th className="py-2.5 px-3 font-semibold">Playlist</th>
                  <th className="py-2.5 px-3 font-semibold">Provider</th>
                  <th className="py-2.5 px-3 font-semibold">License</th>
                  <th className="py-2.5 px-3 font-semibold">Resolution</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-white/8">
                {visibleClips.map((clip) => (
                  <tr key={clip.id} className="hover:bg-[#F8FAFC] dark:hover:bg-white/4">
                    <td className="py-2 px-3 font-medium max-w-[240px] truncate">{clip.title}</td>
                    <td className="py-2 px-3 text-[#64748B] dark:text-[#94A3B8]">{clip.playlistId}</td>
                    <td className="py-2 px-3">{clip.provider}</td>
                    <td className="py-2 px-3 font-mono text-[11px] text-[#16A34A]">{clip.licenseName}</td>
                    <td className="py-2 px-3 font-mono tabular-nums text-[11px]">{clip.width}×{clip.height}</td>
                    <td className="py-2 px-3 text-right">
                      <a
                        href={clip.sourcePageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[#164E8B] dark:text-[#38BDF8] hover:underline"
                      >
                        <span>Inspect</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="p-6 oppsift-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#D97706]" />
                <span>Global Application State Inspector ({stateModes.length} States)</span>
              </h3>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
                Trigger any reusable system, source, or edge-case overlay state across the workspace shell:
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/first-time')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#E2E8F0] dark:border-white/15 text-xs font-semibold"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Open First-Time Workspace</span>
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {stateModes.map(({ mode, label }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setGlobalStateMode(mode)}
                className="px-3.5 py-2 rounded-md border border-[#E2E8F0] dark:border-white/15 text-xs font-medium hover:border-[#A33B59]"
              >
                {label}
              </button>
            ))}
          </div>
        </section>
      </div>
    </WorkspaceLayout>
  );
}
