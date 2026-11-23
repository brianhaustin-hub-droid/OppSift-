import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Download,
  Globe,
  HelpCircle,
  KeyRound,
  LogOut,
  MessageSquare,
  Paperclip,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout';
import { useAppState } from '../../context/AppStateContext';
import { useRouter } from '../../context/RouterContext';
import { SYSTEM_SERVICES_STATUS } from '../../data/billingConfig';
import type { AuditLogEvent, SupportTicket, SystemServiceStatus } from '../../types/oppsift';

/* ---------------- 1. Account Security (/settings/security) ---------------- */

export function AccountSecurityPage() {
  const {
    onboarding,
    userSessions,
    revokeOtherSessions,
    pushToast,
    addAuditEvent,
  } = useAppState();
  const { navigate, goBack, getBackLabel } = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deletionRequested, setDeletionRequested] = useState(false);

  const handlePasswordResetRequest = () => {
    addAuditEvent({
      scope: 'User',
      action: 'Password reset flow initiated',
      actor: onboarding.fullName,
      target: 'Neon Managed Auth',
      detail: 'Dispatched secure password reset verification request.',
    });
    pushToast('info', 'Password reset verification requested via Neon Managed Auth.');
  };

  const handleExportAccountData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      accountHolder: onboarding.fullName,
      organisation: onboarding.organisationName,
      primaryCountry: onboarding.primaryCountry,
      preferredCurrency: onboarding.preferredCurrency,
      sectors: onboarding.sectors,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `oppsift-account-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addAuditEvent({
      scope: 'User',
      action: 'Account data exported',
      actor: onboarding.fullName,
      target: 'JSON Archive',
      detail: 'Generated structured profile and preferences archive.',
    });
    pushToast('success', 'Structured account export downloaded.');
  };

  const handleRequestAccountDeletion = () => {
    if (deleteConfirmationText.trim().toUpperCase() !== 'DELETE ACCOUNT') {
      pushToast('warning', 'Type DELETE ACCOUNT exactly to confirm deletion request.');
      return;
    }
    setDeletionRequested(true);
    setDeleteDialogOpen(false);
    setDeleteConfirmationText('');
    addAuditEvent({
      scope: 'User',
      action: 'Account deletion request submitted',
      actor: onboarding.fullName,
      target: onboarding.organisationName,
      detail: 'Scheduled identity and workspace erasure verification.',
    });
    pushToast('info', 'Account deletion request logged for administrative and auth verification.');
  };

  return (
    <WorkspaceLayout
      title="Account Security"
      breadcrumb="Settings / Security"
    >
      <div className="space-y-6">
        {/* Top Sub-Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={() => goBack('/settings')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#541B32] dark:text-[#E8A4B5] hover:underline mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to {getBackLabel('Settings')}</span>
            </button>
            <h1 className="font-display text-2xl font-bold">Account Security &amp; Access Controls</h1>
            <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] mt-1">
              Manage active device sessions, authentication methods, recovery procedures, and personal data exports under Neon Managed Auth.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-white/15 font-medium"
            >
              Profile Settings
            </button>
            <button
              type="button"
              onClick={() => navigate('/settings/preferences')}
              className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-white/15 font-medium"
            >
              Global Preferences
            </button>
            <button
              type="button"
              onClick={() => navigate('/settings/activity')}
              className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-white/15 font-medium"
            >
              Audit History
            </button>
          </div>
        </div>

        {/* Authentication & Password Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="p-6 rounded-lg oppsift-card space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FFF1F2] dark:bg-[#541B32]/50 text-[#541B32] dark:text-[#E8A4B5] flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-display text-base font-bold">Authentication Method</h2>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">Neon Managed Auth &amp; OAuth</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#16A34A] dark:text-[#34D399]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified Account</span>
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-white/4 border border-[#E2E8F0] dark:border-white/10 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#64748B] dark:text-[#CBD5E1]">Primary Provider</span>
                <span className="font-semibold">Neon Managed Auth (Email + Password)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B] dark:text-[#CBD5E1]">Secondary Sign-In</span>
                <span className="font-semibold">Google OAuth Federation</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B] dark:text-[#CBD5E1]">Account Holder</span>
                <span className="font-semibold">{onboarding.fullName}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5 pt-1">
              <button
                type="button"
                onClick={handlePasswordResetRequest}
                className="px-4 py-2 rounded-xl oppsift-sidebar-active text-white text-xs font-semibold"
              >
                Send Password Reset Email
              </button>
              <button
                type="button"
                onClick={() => navigate('/auth/forgot-password')}
                className="px-4 py-2 rounded-xl border border-[#E2E8F0] dark:border-white/15 text-xs font-medium"
              >
                Open Account Recovery Flow
              </button>
            </div>
          </section>

          <section className="p-6 rounded-lg oppsift-card space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#E0F2FE] dark:bg-[#164E8B]/40 text-[#164E8B] dark:text-[#38BDF8] flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-display text-base font-bold">Account Recovery &amp; Verification</h2>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">Identity restoration and session continuity</p>
              </div>
            </div>

            <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] leading-relaxed">
              Recovery links and verification codes are issued exclusively through Neon Managed Auth. If your session expires or an invitation email fails delivery, request a fresh verification code below.
            </p>

            <div className="flex flex-wrap gap-2.5 text-xs">
              <button
                type="button"
                onClick={() => navigate('/auth/resend-verification')}
                className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-white/15 text-left hover:border-[#A33B59]"
              >
                <p className="font-semibold">Resend Email Verification</p>
                <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">Trigger fresh verification code</p>
              </button>
            </div>
          </section>
        </div>

        {/* Active Sessions */}
        <section className="p-6 rounded-lg oppsift-card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold">Active Sessions</h2>
              <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">
                Devices currently holding an active OppSift session token.
              </p>
            </div>
            <button
              type="button"
              onClick={revokeOtherSessions}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E2E8F0] dark:border-white/15 text-xs font-semibold hover:border-[#A33B59]"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out All Other Sessions</span>
            </button>
          </div>

          <div className="divide-y divide-[#E2E8F0] dark:divide-white/8">
            {userSessions.map((sess) => (
              <div key={sess.id} className="py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#172033] dark:text-white">{sess.device}</span>
                    {sess.current && (
                      <span className="text-[11px] font-semibold text-[#16A34A] dark:text-[#34D399]">Current</span>
                    )}
                  </div>
                  <p className="text-[#64748B] dark:text-[#94A3B8]">
                    {sess.location} · {sess.authMethod}
                  </p>
                </div>
                <span className="font-mono text-[#64748B] dark:text-[#CBD5E1]">{sess.lastActive}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Data Export & Account Deletion */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="p-6 rounded-lg oppsift-card space-y-3">
            <h2 className="font-display text-base font-bold">Account Data Export</h2>
            <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] leading-relaxed">
              Export your structured organisation profile, target jurisdictions, saved filters, and workspace metadata as a portable JSON file.
            </p>
            <button
              type="button"
              onClick={handleExportAccountData}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E2E8F0] dark:border-white/15 text-xs font-semibold hover:border-[#A33B59]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Account Data (JSON)</span>
            </button>
          </section>

          <section className="p-6 rounded-lg oppsift-card space-y-3 border-[#DC2626]/25">
            <h2 className="font-display text-base font-bold text-[#DC2626] dark:text-[#FB7185]">Account Deletion Request</h2>
            <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] leading-relaxed">
              Permanently deleting your OppSift account terminates active subscriptions at the end of the provider billing cycle and schedules erasure of personal workspace records.
            </p>
            {deletionRequested ? (
              <div className="p-3 rounded-xl bg-[#FEF2F2] dark:bg-[#DC2626]/15 border border-[#DC2626]/30 text-xs text-[#DC2626] dark:text-[#FB7185]">
                Deletion request recorded. Check your primary inbox for final Neon Managed Auth confirmation.
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setDeleteDialogOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#DC2626]/40 text-[#DC2626] dark:text-[#FB7185] text-xs font-semibold hover:bg-[#FEF2F2] dark:hover:bg-[#DC2626]/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Request Account Deletion</span>
              </button>
            )}
          </section>
        </div>

        {deleteDialogOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-md p-6 rounded-lg oppsift-card space-y-4">
              <div className="flex items-center gap-2 text-[#DC2626] dark:text-[#FB7185]">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-display text-base font-bold">Confirm Account Deletion Request</h3>
              </div>
              <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] leading-relaxed">
                This action initiates workspace closure and cancels recurring billing at period end. Type <span className="font-mono font-semibold">DELETE ACCOUNT</span> to submit your request.
              </p>
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="DELETE ACCOUNT"
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] dark:border-white/15 bg-white dark:bg-[#0B1F3A] text-xs font-mono"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteDialogOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] dark:border-white/15 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRequestAccountDeletion}
                  className="px-4 py-2 rounded-lg bg-[#DC2626] text-white text-xs font-semibold"
                >
                  Submit Deletion Request
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}

/* ---------------- 2. Global Preferences (/settings/preferences) ---------------- */

export function GlobalPreferencesPage() {
  const { onboarding, updateOnboarding, addAuditEvent, pushToast, reduceBackgroundMotion, setReduceBackgroundMotion, countries } = useAppState();
  const { navigate, goBack, getBackLabel } = useRouter();

  const [language, setLanguage] = useState(onboarding.preferredLanguage || 'English (International)');
  const [primaryCountry, setPrimaryCountry] = useState(onboarding.primaryCountry);
  const [currency, setCurrency] = useState(onboarding.preferredCurrency);
  const [timezone, setTimezone] = useState(onboarding.preferredTimezone || 'Europe/London (UTC+00:00)');
  const [dateFormat, setDateFormat] = useState<'YYYY-MM-DD' | 'DD MMM YYYY' | 'MM/DD/YYYY'>(
    onboarding.preferredDateFormat || 'DD MMM YYYY'
  );
  const [notifyNewMatches, setNotifyNewMatches] = useState(onboarding.notifyNewMatches);
  const [notifyDeadlines, setNotifyDeadlines] = useState(onboarding.notifyDeadlines);
  const [notifyAmendments, setNotifyAmendments] = useState(onboarding.notifyAmendments);
  const [notifyUpdates, setNotifyUpdates] = useState(onboarding.notifyUpdates);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateOnboarding({
      preferredLanguage: language,
      primaryCountry,
      preferredCurrency: currency,
      preferredTimezone: timezone,
      preferredDateFormat: dateFormat,
      notifyNewMatches,
      notifyDeadlines,
      notifyAmendments,
      notifyUpdates,
    });
    addAuditEvent({
      scope: 'User',
      action: 'Global localization & notification preferences saved',
      actor: onboarding.fullName,
      target: `${primaryCountry} · ${currency} · ${timezone}`,
      detail: `Date format set to ${dateFormat}; language ${language}.`,
    });
    pushToast('success', 'Global localization and notification preferences saved.');
  };

  return (
    <WorkspaceLayout
      title="Global Preferences"
      breadcrumb="Settings / Global Preferences"
    >
      <form onSubmit={handleSave} className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={() => goBack('/settings')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#541B32] dark:text-[#E8A4B5] hover:underline mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to {getBackLabel('Settings')}</span>
            </button>
            <h1 className="font-display text-2xl font-bold">Regional, Currency &amp; Localization Preferences</h1>
            <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] mt-1">
              Standardise how opportunity deadlines, contract values, and alert digests are displayed across international markets.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-white/15 font-medium"
            >
              Profile Settings
            </button>
            <button
              type="button"
              onClick={() => navigate('/settings/security')}
              className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-white/15 font-medium"
            >
              Account Security
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="p-6 rounded-lg oppsift-card space-y-4">
            <div className="flex items-center gap-2.5">
              <Globe className="w-4 h-4 text-[#A33B59] dark:text-[#E8A4B5]" />
              <h2 className="font-display text-base font-bold">Locale &amp; Display Standards</h2>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Interface Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] dark:border-white/15 bg-white dark:bg-[#0B1F3A]"
                >
                  <option value="English (International)">English (International)</option>
                  <option value="English (United Kingdom)">English (United Kingdom)</option>
                  <option value="English (United States)">English (United States)</option>
                  <option value="French (European Union)">French (European Union)</option>
                  <option value="German (DACH)">German (DACH)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Primary Operating Country</label>
                <select
                  value={primaryCountry}
                  onChange={(e) => setPrimaryCountry(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] dark:border-white/15 bg-white dark:bg-[#0B1F3A]"
                >
                  {countries.map((c) => (
                    <option key={c.code} value={c.name}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Display Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] dark:border-white/15 bg-white dark:bg-[#0B1F3A]"
                  >
                    {['USD', 'EUR', 'GBP', 'SGD', 'CAD', 'AUD', 'KES', 'NGN'].map((curr) => (
                      <option key={curr} value={curr}>
                        {curr}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Date Format</label>
                  <select
                    value={dateFormat}
                    onChange={(e) => setDateFormat(e.target.value as 'YYYY-MM-DD' | 'DD MMM YYYY' | 'MM/DD/YYYY')}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] dark:border-white/15 bg-white dark:bg-[#0B1F3A]"
                  >
                    <option value="DD MMM YYYY">19 Nov 2026 (DD MMM YYYY)</option>
                    <option value="YYYY-MM-DD">2026-11-19 (ISO 8601)</option>
                    <option value="MM/DD/YYYY">11/19/2026 (MM/DD/YYYY)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Reference Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] dark:border-white/15 bg-white dark:bg-[#0B1F3A]"
                >
                  <option value="UTC">Coordinated Universal Time (UTC)</option>
                  <option value="Europe/London (UTC+00:00)">Europe/London (UTC+00:00)</option>
                  <option value="Europe/Berlin (UTC+01:00)">Europe/Berlin (UTC+01:00)</option>
                  <option value="America/New_York (UTC-05:00)">America/New_York (UTC-05:00)</option>
                  <option value="Asia/Singapore (UTC+08:00)">Asia/Singapore (UTC+08:00)</option>
                  <option value="Africa/Nairobi (UTC+03:00)">Africa/Nairobi (UTC+03:00)</option>
                </select>
              </div>
            </div>
          </section>

          <section className="p-6 rounded-lg oppsift-card space-y-4">
            <div className="flex items-center gap-2.5">
              <SlidersHorizontal className="w-4 h-4 text-[#164E8B] dark:text-[#38BDF8]" />
              <h2 className="font-display text-base font-bold">Notification &amp; Digest Controls</h2>
            </div>

            <div className="space-y-3 text-xs">
              {[
                {
                  label: 'New Opportunity Match Alerts',
                  desc: 'Trigger alerts when published notices satisfy saved search and capability criteria.',
                  checked: notifyNewMatches,
                  toggle: () => setNotifyNewMatches(!notifyNewMatches),
                },
                {
                  label: 'Closing Deadline Reminders',
                  desc: 'Receive lead-time warnings before official submission windows close.',
                  checked: notifyDeadlines,
                  toggle: () => setNotifyDeadlines(!notifyDeadlines),
                },
                {
                  label: 'Corrigendum & Amendment Notices',
                  desc: 'Immediate notification when tracked notices publish official modifications.',
                  checked: notifyAmendments,
                  toggle: () => setNotifyAmendments(!notifyAmendments),
                },
                {
                  label: 'Platform & Billing Updates',
                  desc: 'Important notices covering subscription renewals, security advisories, and coverage additions.',
                  checked: notifyUpdates,
                  toggle: () => setNotifyUpdates(!notifyUpdates),
                },
              ].map((item) => (
                <label
                  key={item.label}
                  className="flex items-start justify-between gap-4 p-3.5 rounded-md border border-[#E2E8F0] dark:border-white/10 cursor-pointer hover:border-[#A33B59]/50"
                >
                  <div>
                    <p className="font-semibold text-[#172033] dark:text-white">{item.label}</p>
                    <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">{item.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={item.toggle}
                    className="mt-1 accent-[#541B32]"
                  />
                </label>
              ))}
              <label className="flex items-start justify-between gap-4 p-3.5 rounded-md border border-[#E2E8F0] dark:border-white/10 cursor-pointer hover:border-[#A33B59]/50">
                <div>
                  <p className="font-semibold text-[#172033] dark:text-white">Reduce Background Video Motion</p>
                  <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                    Freeze ambient hero and header video backdrops onto static verified posters.
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
          </section>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl oppsift-sidebar-active text-white text-xs font-semibold"
          >
            Save Global Preferences
          </button>
        </div>
      </form>
    </WorkspaceLayout>
  );
}

/* ---------------- 3. Activity & Audit History (/settings/activity & /admin/audit) ---------------- */

export function ActivityAuditPage({ adminMode = false }: { adminMode?: boolean }) {
  const { auditEvents, isAdminAuthorized } = useAppState();
  const { navigate, goBack, getBackLabel } = useRouter();
  const [scopeFilter, setScopeFilter] = useState<'All' | AuditLogEvent['scope']>(adminMode ? 'Admin' : 'All');
  const [query, setQuery] = useState('');

  const scopes: ('All' | AuditLogEvent['scope'])[] = ['All', 'User', 'Organisation', 'Team', 'Billing', 'Admin'];

  const visibleEvents = auditEvents.filter((ev) => {
    if (ev.scope === 'Admin' && !isAdminAuthorized) return false;
    if (scopeFilter !== 'All' && ev.scope !== scopeFilter) return false;
    if (
      query.trim() &&
      !`${ev.action} ${ev.actor} ${ev.target} ${ev.detail}`.toLowerCase().includes(query.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  if (adminMode && !isAdminAuthorized) {
    return (
      <WorkspaceLayout
        title="Platform Audit Log"
        breadcrumb="Admin / Audit History"
      >
        <div className="p-8 rounded-lg oppsift-card max-w-xl mx-auto text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-[#FFF1F2] dark:bg-[#541B32]/40 text-[#541B32] dark:text-[#E8A4B5] flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="font-display text-xl font-bold">Administrative Audit Scope Restricted</h2>
          <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">
            Platform-wide operational and billing audit logs require Platform Administrator authorisation.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/settings/activity')}
              className="px-4 py-2 rounded-xl border border-[#E2E8F0] dark:border-white/15 text-xs font-medium"
            >
              View Workspace Activity
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 rounded-xl oppsift-sidebar-active text-white text-xs font-semibold"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </WorkspaceLayout>
    );
  }

  return (
    <WorkspaceLayout
      title={adminMode ? 'Platform Audit History' : 'Activity & Audit History'}
      breadcrumb={adminMode ? 'Admin / Audit History' : 'Settings / Audit History'}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            {!adminMode && (
              <button
                type="button"
                onClick={() => goBack('/settings')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#541B32] dark:text-[#E8A4B5] hover:underline mb-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to {getBackLabel('Settings')}</span>
              </button>
            )}
            <h1 className="font-display text-2xl font-bold">
              {adminMode ? 'Administrative & Financial Audit Log' : 'Workspace Activity & Audit History'}
            </h1>
            <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] mt-1">
              Immutable trail of account security actions, organisation updates, team invitations, and billing events.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter actor, target, or event..."
              className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-white/15 bg-white dark:bg-[#0B1F3A]"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {scopes.map((sc) => {
            if (sc === 'Admin' && !isAdminAuthorized) return null;
            return (
              <button
                key={sc}
                type="button"
                onClick={() => setScopeFilter(sc)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  scopeFilter === sc
                    ? 'border-[#A33B59] bg-[#FFF1F2] dark:bg-[#541B32]/50 text-[#541B32] dark:text-[#E8A4B5]'
                    : 'border-[#E2E8F0] dark:border-white/12 text-[#64748B] dark:text-[#CBD5E1]'
                }`}
              >
                {sc}
              </button>
            );
          })}
        </div>

        <div className="overflow-x-auto rounded-lg oppsift-card">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] dark:bg-white/6 text-[#64748B] dark:text-[#CBD5E1]">
              <tr>
                <th className="py-3 px-4 font-semibold">Timestamp</th>
                <th className="py-3 px-4 font-semibold">Scope</th>
                <th className="py-3 px-4 font-semibold">Action</th>
                <th className="py-3 px-4 font-semibold">Actor</th>
                <th className="py-3 px-4 font-semibold">Target</th>
                <th className="py-3 px-4 font-semibold">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-white/8">
              {visibleEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 px-4 text-center text-[#64748B] dark:text-[#94A3B8]">
                    No audit log entries match the selected scope or query.
                  </td>
                </tr>
              ) : (
                visibleEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-[#F8FAFC] dark:hover:bg-white/4">
                    <td className="py-3 px-4 font-mono whitespace-nowrap text-[#64748B] dark:text-[#94A3B8]">
                      {ev.timestamp}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#541B32] dark:text-[#E8A4B5]">{ev.scope}</td>
                    <td className="py-3 px-4 font-semibold text-[#172033] dark:text-white">{ev.action}</td>
                    <td className="py-3 px-4">{ev.actor}</td>
                    <td className="py-3 px-4 font-mono text-[#64748B] dark:text-[#CBD5E1]">{ev.target}</td>
                    <td className="py-3 px-4 text-[#64748B] dark:text-[#CBD5E1]">{ev.detail}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </WorkspaceLayout>
  );
}

/* ---------------- 4. Support Ticket Management (/support & /help) ---------------- */

export function SupportTicketsPage() {
  const {
    supportTickets,
    createSupportTicket,
    replySupportTicket,
    resolveSupportTicket,
    pushToast,
  } = useAppState();
  const { navigate } = useRouter();

  const [selectedTicketId, setSelectedTicketId] = useState<string>(supportTickets[0]?.id || '');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<SupportTicket['category']>('Billing & Subscriptions');
  const [body, setBody] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [replyText, setReplyText] = useState('');

  const activeTicket = supportTickets.find((t) => t.id === selectedTicketId) || supportTickets[0];

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) {
      pushToast('warning', 'Enter both a ticket subject and detailed message.');
      return;
    }
    createSupportTicket(subject, category, body, attachmentName || undefined);
    setSubject('');
    setBody('');
    setAttachmentName('');
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !replyText.trim()) return;
    replySupportTicket(activeTicket.id, replyText);
    setReplyText('');
  };

  return (
    <WorkspaceLayout
      title="Support & Help Desk"
      breadcrumb="Support / Tickets"
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold">Support &amp; Ticket Management</h1>
            <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] mt-1">
              Submit source verification requests, billing questions, or account support tickets and track resolution updates.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => navigate('/docs')}
              className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-white/15 font-medium"
            >
              Documentation
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Submit New Ticket */}
          <form onSubmit={handleSubmitTicket} className="xl:col-span-5 p-6 rounded-lg oppsift-card space-y-4">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#A33B59] dark:text-[#E8A4B5]" />
              <h2 className="font-display text-base font-bold">Submit Support Ticket</h2>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as SupportTicket['category'])}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] dark:border-white/15 bg-white dark:bg-[#0B1F3A]"
                >
                  <option value="Billing & Subscriptions">Billing &amp; Subscriptions</option>
                  <option value="Source Coverage">Source Coverage</option>
                  <option value="Eligibility & AI">Eligibility &amp; AI</option>
                  <option value="Account & Security">Account &amp; Security</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Requesting UK or EU source verification"
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] dark:border-white/15 bg-white dark:bg-[#0B1F3A]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Description</label>
                <textarea
                  rows={4}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Include opportunity reference number, invoice reference, or source portal URL..."
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] dark:border-white/15 bg-white dark:bg-[#0B1F3A]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Optional Attachment Reference</label>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E2E8F0] dark:border-white/15 cursor-pointer hover:border-[#A33B59]">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>{attachmentName ? attachmentName : 'Attach Supporting File'}</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setAttachmentName(f.name);
                      }}
                    />
                  </label>
                  {attachmentName && (
                    <button
                      type="button"
                      onClick={() => setAttachmentName('')}
                      className="text-[11px] text-[#DC2626] hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl oppsift-sidebar-active text-white text-xs font-semibold inline-flex items-center justify-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Create Support Ticket</span>
            </button>
          </form>

          {/* Ticket List & Conversation Detail */}
          <div className="xl:col-span-7 space-y-4">
            <div className="p-5 rounded-lg oppsift-card space-y-3">
              <h2 className="font-display text-base font-bold">Your Support Tickets ({supportTickets.length})</h2>
              <div className="space-y-2">
                {supportTickets.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTicketId(t.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                      activeTicket?.id === t.id
                        ? 'border-[#A33B59] bg-[#FFF1F2]/60 dark:bg-[#541B32]/30'
                        : 'border-[#E2E8F0] dark:border-white/10 hover:border-[#A33B59]/50'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-mono font-semibold text-[#541B32] dark:text-[#E8A4B5]">{t.id}</span>
                      <span
                        className={`font-semibold ${
                          t.status === 'Resolved'
                            ? 'text-[#16A34A] dark:text-[#34D399]'
                            : t.status === 'In Review'
                            ? 'text-[#164E8B] dark:text-[#38BDF8]'
                            : 'text-[#D97706]'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-[#172033] dark:text-white">{t.subject}</p>
                    <p className="mt-0.5 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                      {t.category} · Updated {t.updatedAt}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {activeTicket && (
              <div className="p-6 rounded-lg oppsift-card space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-[#E2E8F0] dark:border-white/10">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono text-[#64748B] dark:text-[#94A3B8]">
                      <span>{activeTicket.id}</span>
                      <span>·</span>
                      <span>{activeTicket.category}</span>
                    </div>
                    <h3 className="font-display text-lg font-bold mt-1">{activeTicket.subject}</h3>
                    {activeTicket.attachmentName && (
                      <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-[#64748B] dark:text-[#CBD5E1]">
                        <Paperclip className="w-3 h-3" />
                        <span>Attachment: {activeTicket.attachmentName}</span>
                      </p>
                    )}
                  </div>
                  {activeTicket.status !== 'Resolved' && (
                    <button
                      type="button"
                      onClick={() => resolveSupportTicket(activeTicket.id)}
                      className="px-3.5 py-1.5 rounded-lg border border-[#16A34A]/40 text-[#16A34A] dark:text-[#34D399] text-xs font-semibold hover:bg-[#16A34A]/10"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {activeTicket.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-3.5 rounded-xl text-xs space-y-1 ${
                        msg.role === 'Support'
                          ? 'bg-[#E0F2FE]/50 dark:bg-[#164E8B]/20 border border-[#38BDF8]/25'
                          : 'bg-[#F8FAFC] dark:bg-white/4 border border-[#E2E8F0] dark:border-white/10'
                      }`}
                    >
                      <div className="flex justify-between gap-2 text-[11px]">
                        <span className="font-semibold text-[#172033] dark:text-white">
                          {msg.sender} ({msg.role})
                        </span>
                        <span className="font-mono text-[#64748B] dark:text-[#94A3B8]">{msg.timestamp}</span>
                      </div>
                      <p className="text-[#172033] dark:text-[#CBD5E1] leading-relaxed">{msg.body}</p>
                    </div>
                  ))}
                </div>

                {activeTicket.status !== 'Resolved' ? (
                  <form onSubmit={handleSendReply} className="flex gap-2 pt-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write a follow-up reply..."
                      className="flex-1 px-3 py-2 rounded-lg border border-[#E2E8F0] dark:border-white/15 bg-white dark:bg-[#0B1F3A] text-xs"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg oppsift-sidebar-active text-white text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Reply</span>
                    </button>
                  </form>
                ) : (
                  <div className="p-3 rounded-xl bg-[#ECFDF5] dark:bg-[#16A34A]/15 text-xs text-[#16A34A] dark:text-[#34D399] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Ticket resolved. Open a new support ticket above if further assistance is required.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
}

/* ---------------- 5. System Status (/status) ---------------- */

export function SystemStatusPage() {
  const { navigate } = useRouter();

  const renderBadge = (state: SystemServiceStatus['state']) => {
    if (state === 'Operational') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#16A34A] dark:text-[#34D399]">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Operational</span>
        </span>
      );
    }
    if (state === 'Degraded') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D97706] dark:text-[#FBBF24]">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Partial / Degraded</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#164E8B] dark:text-[#38BDF8]">
        <Clock className="w-3.5 h-3.5" />
        <span>Probe Unverified</span>
      </span>
    );
  };

  return (
    <PublicLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="font-mono text-xs font-semibold text-[#541B32] dark:text-[#E8A4B5]">
              Service Health &amp; Availability
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold">OppSift System Status</h1>
            <p className="text-sm text-[#64748B] dark:text-[#CBD5E1] max-w-2xl">
              Transparent operational reporting across OppSift web delivery, Neon Managed Auth, search indexing, data ingestion, notifications, AI analysis, and Lemon Squeezy billing endpoints.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/support')}
            className="px-4 py-2 rounded-xl border border-[#E2E8F0] dark:border-white/15 text-xs font-semibold hover:border-[#A33B59]"
          >
            Report an Incident
          </button>
        </div>

        <div className="p-5 rounded-lg oppsift-card flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] dark:bg-[#164E8B]/40 text-[#164E8B] dark:text-[#38BDF8] flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold">Genuine Operational Telemetry Boundary</h2>
              <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">
                Services awaiting live external health probe hooks display &ldquo;Probe Unverified&rdquo; rather than synthetic uptime percentages.
              </p>
            </div>
          </div>
          <span className="font-mono text-xs text-[#64748B] dark:text-[#94A3B8]">
            Updated 2026-11-19 11:00 UTC
          </span>
        </div>

        <div className="divide-y divide-[#E2E8F0] dark:divide-white/8 rounded-lg oppsift-card overflow-hidden">
          {SYSTEM_SERVICES_STATUS.map((svc) => (
            <div key={svc.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <h3 className="font-display text-base font-bold">{svc.name}</h3>
                <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">{svc.description}</p>
                <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">{svc.note}</p>
              </div>
              <div className="sm:text-right shrink-0 space-y-1">
                <div>{renderBadge(svc.state)}</div>
                <p className="font-mono text-[11px] text-[#64748B] dark:text-[#94A3B8]">{svc.checkedAt}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}

/* ---------------- 6. Additional User Journeys & Edge-State Hub (/journeys & /first-time) ---------------- */

export function UserJourneysPage() {
  const { setGlobalStateMode, updateSubscriptionField, openCheckout } = useAppState();
  const { navigate } = useRouter();

  const journeys = [
    {
      title: '1. First Login & Empty Workspace',
      summary: 'New authenticated account arriving before completing organisation calibration or saving opportunities.',
      actionLabel: 'Activate Empty State',
      onTrigger: () => {
        setGlobalStateMode('first-time');
        navigate('/dashboard');
      },
    },
    {
      title: '2. Interrupted Onboarding Recovery',
      summary: 'Resume onboarding wizard directly from incomplete step progress without losing capability selections.',
      actionLabel: 'Open Onboarding Wizard',
      onTrigger: () => navigate('/onboarding'),
    },
    {
      title: '3. Completed Onboarding Calibration',
      summary: 'Personalised international discovery feed populated with jurisdiction filters and eligibility calibration.',
      actionLabel: 'Open Active Dashboard',
      onTrigger: () => {
        setGlobalStateMode('normal');
        navigate('/dashboard');
      },
    },
    {
      title: '4. Expired or Closed Opportunity State',
      summary: 'Inspect official deadline expiry warnings with bid submission lock and archived notice framing.',
      actionLabel: 'Inspect Expired Notice',
      onTrigger: () => {
        setGlobalStateMode('expired-opportunity');
        navigate('/opportunity/opp-uk-2026-0841');
      },
    },
    {
      title: '5. Removed or Unavailable Source',
      summary: 'Graceful fallback state when a national procurement feed times out or removes a notice.',
      actionLabel: 'Inspect Unavailable State',
      onTrigger: () => {
        setGlobalStateMode('removed-opportunity');
        navigate('/opportunity/opp-uk-2026-0841');
      },
    },
    {
      title: '6. No Search Results & Filter Recovery',
      summary: 'Clear zero-result recovery offering filter reset and jurisdiction expansion actions.',
      actionLabel: 'Inspect Invalid Filters',
      onTrigger: () => {
        setGlobalStateMode('invalid-filters');
        navigate('/discover/search');
      },
    },
    {
      title: '7. Restricted Permission Boundary',
      summary: 'Standard workspace member attempting access to Platform Administrative or Billing Operations routes.',
      actionLabel: 'Inspect Restricted Admin View',
      onTrigger: () => navigate('/admin/billing'),
    },
    {
      title: '8. Account & Email Recovery Flow',
      summary: 'Neon Managed Auth password reset, resend verification email, and verification code prompts.',
      actionLabel: 'Open Account Recovery',
      onTrigger: () => navigate('/auth/forgot-password'),
    },
    {
      title: '9. Subscription Expiry & Grace Recovery',
      summary: 'Past-due or expired subscription state displaying grace banner and Lemon Squeezy payment update CTA.',
      actionLabel: 'Inspect Past Due Billing',
      onTrigger: () => {
        updateSubscriptionField({
          status: 'past_due',
          failureReason: 'Latest renewal authorisation requires updated card verification in Lemon Squeezy.',
        });
        navigate('/settings/billing');
      },
    },
    {
      title: '10. Upgrade & Checkout Flow',
      summary: 'Direct plan transition from Discovery or Usage limits into the Lemon Squeezy Merchant of Record checkout modal.',
      actionLabel: 'Launch Professional Checkout',
      onTrigger: () => openCheckout('professional', 'monthly'),
    },
  ];

  return (
    <WorkspaceLayout
      title="User Journeys & System States"
      breadcrumb="Operations / User Journeys"
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold">End-to-End User Journeys &amp; Lifecycle States</h1>
            <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] mt-1">
              Verify every primary and edge-case customer journey across authentication, onboarding, opportunity discovery, permissions, and commercial billing.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setGlobalStateMode('normal');
              updateSubscriptionField({ status: 'active', failureReason: null });
              navigate('/dashboard');
            }}
            className="px-4 py-2 rounded-xl border border-[#E2E8F0] dark:border-white/15 text-xs font-semibold"
          >
            Reset to Active State
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {journeys.map((j) => (
            <div key={j.title} className="p-5 rounded-lg oppsift-card flex flex-col justify-between gap-4">
              <div className="space-y-1.5">
                <h2 className="font-display text-base font-bold">{j.title}</h2>
                <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] leading-relaxed">{j.summary}</p>
              </div>
              <div>
                <button
                  type="button"
                  onClick={j.onTrigger}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl oppsift-sidebar-active text-white text-xs font-semibold"
                >
                  <span>{j.actionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </WorkspaceLayout>
  );
}
