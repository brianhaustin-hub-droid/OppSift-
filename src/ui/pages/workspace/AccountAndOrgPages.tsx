import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  LogOut,
  MailPlus,
  Monitor,
  Moon,
  Shield,
  Sun,
  Users,
  X,
} from 'lucide-react';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout';
import { ConfirmationDialog } from '../../components/ui/StateViews';
import { useAppState } from '../../context/AppStateContext';
import { useRouter } from '../../context/RouterContext';
import { useTheme } from '../../context/ThemeContext';
import { TeamMember } from '../../types/oppsift';

export function TeamsOrganisationPage() {
  const { navigate } = useRouter();
  const { teamMembers, inviteTeamMember, onboarding, updateOnboarding, pushToast } = useAppState();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamMember['role']>('Analyst');
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [orgTab, setOrgTab] = useState<'members' | 'org-settings'>('members');

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.includes('@')) return;
    inviteTeamMember(inviteEmail.trim(), inviteRole);
    setInviteEmail('');
  };

  return (
    <WorkspaceLayout title="Organisations & Teams" breadcrumb="Organisation / Team Management">
      <div className="space-y-6">
        <div className="p-6 rounded-2xl oppsift-card flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#A33B59] dark:text-[#E8A4B5]">Active Organisation</p>
            <h2 className="mt-1 font-display text-xl font-bold">{onboarding.organisationName}</h2>
            <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] mt-1">
              {onboarding.country} · {onboarding.industry} · {teamMembers.length} members
            </p>
          </div>
          <form onSubmit={handleInvite} className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@organisation.org"
              className="h-9 px-3 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-xs min-w-0 flex-1 sm:flex-initial"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as TeamMember['role'])}
              className="h-9 px-2.5 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-xs"
            >
              <option value="Admin">Admin</option>
              <option value="Analyst">Analyst</option>
              <option value="Viewer">Viewer</option>
            </select>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#541B32] hover:bg-[#A33B59] text-white text-xs font-semibold whitespace-nowrap"
            >
              <MailPlus className="w-3.5 h-3.5" />
              <span>Send Invitation</span>
            </button>
          </form>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-2xl oppsift-card max-w-full overflow-x-auto">
          {[
            { id: 'members' as const, label: 'Members & Shared Collections' },
            { id: 'org-settings' as const, label: 'Organisation Capabilities & Settings' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setOrgTab(t.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 ${
                orgTab === t.id ? 'oppsift-sidebar-active text-white' : 'text-[#64748B] dark:text-[#CBD5E1]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {orgTab === 'members' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 overflow-x-auto rounded-2xl oppsift-card">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] dark:bg-white/6 text-[#64748B] dark:text-[#CBD5E1]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Member (Click to Inspect)</th>
                    <th className="py-3 px-4 font-semibold">Role</th>
                    <th className="py-3 px-4 font-semibold">Country</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-white/8">
                  {teamMembers.map((m) => (
                    <tr
                      key={m.id}
                      onClick={() => setSelectedMember(m)}
                      className="hover:bg-[#F8FAFC] dark:hover:bg-white/5 cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <p className="font-semibold">{m.name}</p>
                        <p className="text-[#64748B] dark:text-[#CBD5E1]">{m.email}</p>
                      </td>
                      <td className="py-3 px-4 font-medium">{m.role}</td>
                      <td className="py-3 px-4 text-[#64748B] dark:text-[#CBD5E1]">{m.country}</td>
                      <td className="py-3 px-4">
                        <span className={m.status === 'Active' ? 'text-[#16A34A] font-semibold' : 'text-[#D97706] font-semibold'}>
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-[#64748B] dark:text-[#CBD5E1]">{m.lastActive}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="lg:col-span-4 p-5 rounded-2xl oppsift-card space-y-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#164E8B] dark:text-[#38BDF8]" />
                <h3 className="font-display text-base font-semibold">Shared Opportunity Collections</h3>
              </div>
              <div className="space-y-2.5 text-xs">
                {[
                  { name: 'Q4 UK & EU Digital Health Frameworks', items: 8 },
                  { name: 'APAC Environmental Telemetry Bids', items: 5 },
                  { name: 'Horizon Europe Consortium Watchlist', items: 4 },
                ].map((col) => (
                  <button
                    key={col.name}
                    type="button"
                    onClick={() => {
                      pushToast('info', `Opened shared collection: ${col.name}`);
                      navigate('/discover');
                    }}
                    className="w-full text-left p-3 rounded-xl border border-[#E2E8F0] dark:border-white/10 hover:border-[#A33B59] flex items-center justify-between transition-colors"
                  >
                    <span className="font-medium truncate pr-2">{col.name}</span>
                    <span className="font-mono tabular-nums text-[#64748B] dark:text-[#CBD5E1] shrink-0">{col.items}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl oppsift-card space-y-4 max-w-3xl text-xs">
            <h3 className="font-display text-base font-semibold">Organisation Capability &amp; Market Settings</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium mb-1">Organisation Legal Name</label>
                <input
                  type="text"
                  value={onboarding.organisationName}
                  onChange={(e) => updateOnboarding({ organisationName: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Website</label>
                <input
                  type="url"
                  value={onboarding.website}
                  onChange={(e) => updateOnboarding({ website: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-medium mb-1">Services &amp; Capabilities Summary</label>
                <textarea
                  rows={3}
                  value={onboarding.servicesAndProducts}
                  onChange={(e) => updateOnboarding({ servicesAndProducts: e.target.value })}
                  className="w-full p-3 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => pushToast('success', 'Organisation capability settings saved.')}
              className="px-4 py-2 rounded-xl bg-[#541B32] text-white font-semibold"
            >
              Save Organisation Settings
            </button>
          </div>
        )}

        {/* Team Member Profile Drawer */}
        {selectedMember && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/55 backdrop-blur-xs">
            <div className="w-full max-w-md h-full bg-white dark:bg-[#161224] border-l border-[#E2E8F0] dark:border-white/12 p-6 overflow-y-auto space-y-5 text-xs shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-white/10 pb-3">
                <div>
                  <p className="font-semibold text-[#A33B59] dark:text-[#E8A4B5]">Team Member Profile</p>
                  <h3 className="font-display text-lg font-bold">{selectedMember.name}</h3>
                </div>
                <button type="button" onClick={() => setSelectedMember(null)} className="p-1 text-[#64748B]">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-1.5">
                <p><span className="font-semibold">Email:</span> {selectedMember.email}</p>
                <p><span className="font-semibold">Role:</span> {selectedMember.role}</p>
                <p><span className="font-semibold">Operating Location:</span> {selectedMember.country}</p>
                <p><span className="font-semibold">Assigned Pipeline Tasks:</span> {selectedMember.assignedTasksCount}</p>
              </div>
              <div>
                <p className="font-semibold mb-2">Role Permissions</p>
                <ul className="space-y-1 text-[#64748B] dark:text-[#CBD5E1]">
                  {selectedMember.permissions.map((perm) => (
                    <li key={perm}>• {perm}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-2">Recent Activity</p>
                <ul className="space-y-1.5 text-[#64748B] dark:text-[#CBD5E1]">
                  {selectedMember.recentActivity.map((act) => (
                    <li key={act} className="p-2.5 rounded-lg border border-[#E2E8F0] dark:border-white/10">{act}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}

export function AcceptInvitationPage() {
  const { navigate } = useRouter();
  const { isSignedIn, pushToast } = useAppState();
  const [status, setStatus] = useState<'pending' | 'accepted' | 'declined'>('pending');

  return (
    <div className="min-h-screen flex items-center justify-center oppsift-workspace-canvas text-[#172033] dark:text-[#F8FAFC] p-4">
      <div className="w-full max-w-lg rounded-2xl oppsift-card p-8 space-y-5 shadow-xl">
        <p className="text-xs font-semibold text-[#A33B59] dark:text-[#E8A4B5]">Organisation Invitation</p>
        <h1 className="font-display text-2xl font-bold">Join Meridian Civic &amp; Cloud Advisory Ltd</h1>
        <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-white/6 border border-[#E2E8F0] dark:border-white/10 text-xs space-y-1.5">
          <p><span className="font-semibold">Invited by:</span> Elena Vance (Owner)</p>
          <p><span className="font-semibold">Assigned Role:</span> Analyst (Discover, Eligibility Review, Shared Pipeline)</p>
          <p><span className="font-semibold">Authentication Gate:</span> {isSignedIn ? 'Verified Neon Auth session active' : 'Sign-in required before acceptance'}</p>
        </div>

        {status === 'accepted' ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-[#16A34A] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Invitation accepted</span>
            </p>
            <button
              type="button"
              onClick={() => navigate('/teams')}
              className="w-full h-10 rounded-xl bg-[#541B32] text-white text-sm font-semibold"
            >
              Open Organisation Workspace
            </button>
          </div>
        ) : status === 'declined' ? (
          <div className="space-y-3">
            <p className="text-sm text-[#64748B] dark:text-[#CBD5E1]">Invitation declined. No membership was added.</p>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full h-10 rounded-xl border border-[#E2E8F0] dark:border-white/12 text-sm font-medium"
            >
              Return Home
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => {
                if (!isSignedIn) {
                  navigate('/auth');
                  return;
                }
                setStatus('accepted');
                pushToast('success', 'Organisation membership accepted.');
              }}
              className="flex-1 h-10 rounded-xl bg-[#541B32] hover:bg-[#A33B59] text-white text-sm font-semibold"
            >
              Accept Invitation
            </button>
            <button
              type="button"
              onClick={() => setStatus('declined')}
              className="flex-1 h-10 rounded-xl border border-[#E2E8F0] dark:border-white/12 text-sm font-medium"
            >
              Decline
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function SettingsPage({
  initialTab = 'profile',
  title = 'Profile & Settings',
  breadcrumb = 'Account / Settings',
}: {
  initialTab?: 'profile' | 'appearance' | 'notifications' | 'security' | 'account';
  title?: string;
  breadcrumb?: string;
} = {}) {
  const { navigate } = useRouter();
  const { onboarding, updateOnboarding, pushToast, reduceBackgroundMotion, setReduceBackgroundMotion } = useAppState();
  const { preference, setPreference } = useTheme();
  const [tab, setTab] = useState<'profile' | 'appearance' | 'notifications' | 'security' | 'account'>(initialTab);
  const [confirmAction, setConfirmAction] = useState<'deactivate' | 'delete' | null>(null);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const completenessFields = [
    onboarding.fullName,
    onboarding.organisationName,
    onboarding.country,
    onboarding.servicesAndProducts,
    onboarding.expertiseAndCertifications,
  ];
  const completenessPct = Math.round(
    (completenessFields.filter((f) => f && f.trim().length > 0).length / completenessFields.length) * 100
  );

  return (
    <WorkspaceLayout title={title} breadcrumb={breadcrumb}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5 p-1.5 rounded-2xl oppsift-card max-w-full">
            {(['profile', 'appearance', 'notifications', 'security', 'account'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap ${
                  tab === t
                    ? 'oppsift-sidebar-active text-white'
                    : 'text-[#64748B] dark:text-[#CBD5E1]'
                }`}
              >
                {t === 'account' ? 'Account Management' : t}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => navigate('/settings/billing')}
              className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-white/15 font-medium hover:border-[#A33B59]"
            >
              Billing &amp; Usage
            </button>
            <button
              type="button"
              onClick={() => navigate('/settings/preferences')}
              className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-white/15 font-medium hover:border-[#A33B59]"
            >
              Global Preferences
            </button>
            <button
              type="button"
              onClick={() => navigate('/settings/security')}
              className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-white/15 font-medium hover:border-[#A33B59]"
            >
              Security Console
            </button>
            <button
              type="button"
              onClick={() => navigate('/settings/activity')}
              className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-white/15 font-medium hover:border-[#A33B59]"
            >
              Audit History
            </button>
          </div>
        </div>

        {tab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 p-6 rounded-2xl oppsift-card space-y-4">
              <h2 className="font-display text-lg font-bold">Profile &amp; Organisation Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Full Name</label>
                  <input
                    type="text"
                    value={onboarding.fullName}
                    onChange={(e) => updateOnboarding({ fullName: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Organisation</label>
                  <input
                    type="text"
                    value={onboarding.organisationName}
                    onChange={(e) => updateOnboarding({ organisationName: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Operating Country</label>
                  <input
                    type="text"
                    value={onboarding.country}
                    onChange={(e) => updateOnboarding({ country: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Industry</label>
                  <input
                    type="text"
                    value={onboarding.industry}
                    onChange={(e) => updateOnboarding({ industry: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Certifications &amp; Accreditations</label>
                <textarea
                  rows={3}
                  value={onboarding.expertiseAndCertifications}
                  onChange={(e) => updateOnboarding({ expertiseAndCertifications: e.target.value })}
                  className="w-full p-3 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => pushToast('success', 'Profile preferences updated.')}
                className="px-4 py-2 rounded-xl bg-[#541B32] hover:bg-[#A33B59] text-white text-xs font-semibold"
              >
                Save Changes
              </button>
            </div>

            <div className="lg:col-span-4 p-6 rounded-2xl oppsift-card space-y-4">
              <h3 className="font-display text-base font-semibold">Profile Completeness</h3>
              <p className="font-display text-3xl font-bold tabular-nums text-[#A33B59] dark:text-[#E8A4B5]">
                {completenessPct}%
              </p>
              <div className="h-2 w-full rounded-full bg-[#F1F5F9] dark:bg-white/10 overflow-hidden">
                <div className="h-full bg-[#541B32] dark:bg-[#D94673]" style={{ width: `${completenessPct}%` }} />
              </div>
              <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">
                Complete organisation capabilities and certifications to improve eligibility screening precision.
              </p>
              <button
                type="button"
                onClick={() => navigate('/onboarding')}
                className="w-full py-2 rounded-xl border border-[#E2E8F0] dark:border-white/12 text-xs font-medium"
              >
                {onboarding.completed ? 'Re-open Onboarding Wizard' : `Resume Onboarding (Step ${onboarding.lastCompletedStep})`}
              </button>
            </div>
          </div>
        )}

        {tab === 'appearance' && (
          <div className="p-6 rounded-lg oppsift-card space-y-5 max-w-2xl">
            <h2 className="font-display text-lg font-bold">Theme &amp; Interface Appearance</h2>
            <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">
              Switch between OppSift Light, Dark, or System preference, and control ambient video motion. Persists locally.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'light' as const, label: 'Light Mode', icon: <Sun className="w-4 h-4" /> },
                { id: 'dark' as const, label: 'Dark Mode', icon: <Moon className="w-4 h-4" /> },
                { id: 'system' as const, label: 'System Default', icon: <Monitor className="w-4 h-4" /> },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPreference(opt.id)}
                  className={`p-4 rounded-md border text-left space-y-2 ${
                    preference === opt.id
                      ? 'border-[#A33B59] bg-[#FFF1F2] dark:bg-[#541B32]/40'
                      : 'border-[#E2E8F0] dark:border-white/12'
                  }`}
                >
                  {opt.icon}
                  <p className="font-display text-sm font-semibold">{opt.label}</p>
                </button>
              ))}
            </div>
            <label className="flex items-start justify-between gap-4 p-4 rounded-md border border-[#E2E8F0] dark:border-white/12 cursor-pointer hover:border-[#A33B59]/50">
              <div>
                <p className="font-display text-sm font-semibold">Reduce Background Video Motion</p>
                <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] mt-0.5">
                  Pauses ambient hero and banner video playback across public and intelligence headers, displaying crisp static posters instead.
                </p>
              </div>
              <input
                type="checkbox"
                checked={reduceBackgroundMotion}
                onChange={(e) => setReduceBackgroundMotion(e.target.checked)}
                className="mt-1 accent-[#541B32]"
              />
            </label>
          </div>
        )}

        {tab === 'notifications' && (
          <div className="p-6 rounded-2xl oppsift-card space-y-4 max-w-2xl">
            <h2 className="font-display text-lg font-bold">Notification Preferences</h2>
            {[
              { key: 'notifyNewMatches' as const, label: 'Email & In-App New Match Digests' },
              { key: 'notifyDeadlines' as const, label: 'Pipeline Deadline Reminders' },
              { key: 'notifyAmendments' as const, label: 'Corrigendum & Amendment Alerts' },
              { key: 'notifyUpdates' as const, label: 'Platform Coverage Releases' },
            ].map((item) => (
              <label key={item.key} className="flex items-center justify-between py-2 border-b last:border-b-0 border-[#E2E8F0] dark:border-white/10 text-sm">
                <span>{item.label}</span>
                <input
                  type="checkbox"
                  checked={onboarding[item.key]}
                  onChange={(e) => updateOnboarding({ [item.key]: e.target.checked })}
                />
              </label>
            ))}
          </div>
        )}

        {tab === 'security' && (
          <div className="p-6 rounded-2xl oppsift-card space-y-4 max-w-2xl">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#16A34A]" />
              <h2 className="font-display text-lg font-bold">Security &amp; Neon Managed Auth</h2>
            </div>
            <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-white/6 border border-[#E2E8F0] dark:border-white/10 text-xs space-y-1.5">
              <p><span className="font-semibold">Authentication Provider:</span> Neon Managed Auth + Google OAuth</p>
              <p><span className="font-semibold">Session Status:</span> Active Authenticated Session</p>
              <p><span className="font-semibold">Password Recovery:</span> Handled via Neon Auth verification flow</p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => navigate('/settings/security')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl oppsift-sidebar-active text-white text-xs font-semibold"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Open Full Security Console</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/auth')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E2E8F0] dark:border-white/12 text-xs font-semibold"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Open Authentication Flow</span>
              </button>
            </div>
          </div>
        )}

        {tab === 'account' && (
          <div className="p-6 rounded-2xl oppsift-card space-y-5 max-w-2xl">
            <div className="flex items-center gap-2 text-[#DC2626]">
              <AlertTriangle className="w-5 h-5" />
              <h2 className="font-display text-lg font-bold">Account Lifecycle &amp; Governance</h2>
            </div>
            <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">
              Deactivation pauses workspace alerts and sessions. Permanent deletion removes organisational records upon identity verification.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setConfirmAction('deactivate')}
                className="px-4 py-2 rounded-xl border border-[#D97706] text-[#D97706] text-xs font-semibold"
              >
                Deactivate Account
              </button>
              <button
                type="button"
                onClick={() => setConfirmAction('delete')}
                className="px-4 py-2 rounded-xl bg-[#DC2626] text-white text-xs font-semibold"
              >
                Request Account Deletion
              </button>
            </div>
          </div>
        )}

        <ConfirmationDialog
          open={confirmAction !== null}
          title={confirmAction === 'delete' ? 'Request permanent account deletion?' : 'Deactivate workspace account?'}
          description={
            confirmAction === 'delete'
              ? 'This submits an account deletion request to Neon Managed Auth identity verification. Shared organisation assets must be reassigned first.'
              : 'Deactivating pauses alert digests and signs out active sessions until reactivated.'
          }
          confirmLabel={confirmAction === 'delete' ? 'Submit Deletion Request' : 'Confirm Deactivation'}
          destructive={confirmAction === 'delete'}
          onConfirm={() => {
            pushToast('warning', `Account ${confirmAction} request requires Neon Managed Auth identity confirmation.`);
            setConfirmAction(null);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      </div>
    </WorkspaceLayout>
  );
}
