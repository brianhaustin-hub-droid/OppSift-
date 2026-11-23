import React from 'react';
import {
  AlertTriangle,
  ArchiveX,
  CheckCircle2,
  Clock,
  DatabaseZap,
  FilterX,
  Inbox,
  Lock,
  RefreshCw,
  ServerCrash,
  ShieldAlert,
  Sparkles,
  WifiOff,
  X,
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { GlobalStateMode } from '../../types/oppsift';

export function TableSkeletonState({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl oppsift-card p-5 space-y-4" aria-busy="true">
      <div className="flex items-center justify-between">
        <div className="h-4 w-48 rounded bg-[#F1F5F9] dark:bg-white/10" />
        <div className="h-4 w-24 rounded bg-[#F1F5F9] dark:bg-white/10" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="grid grid-cols-12 gap-4 py-2 border-t border-[#E2E8F0] dark:border-white/10">
            <div className="col-span-5 h-4 rounded bg-[#F1F5F9] dark:bg-white/10" />
            <div className="col-span-3 h-4 rounded bg-[#F1F5F9] dark:bg-white/10" />
            <div className="col-span-2 h-4 rounded bg-[#F1F5F9] dark:bg-white/10" />
            <div className="col-span-2 h-4 rounded bg-[#F1F5F9] dark:bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmptyStatePanel({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-xl oppsift-card px-6 py-12 text-center">
      <div className="mx-auto w-11 h-11 rounded-lg bg-[#FFF1F2] dark:bg-[#541B32]/50 text-[#541B32] dark:text-[#E8A4B5] flex items-center justify-center mb-4">
        <Inbox className="w-5 h-5" />
      </div>
      <h3 className="font-display text-base font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-[#64748B] dark:text-[#CBD5E1] max-w-md mx-auto">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#541B32] hover:bg-[#A33B59] text-white transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function GlobalStatePreviewBanner({
  mode,
  onReset,
  onSignIn,
}: {
  mode: GlobalStateMode;
  onReset: () => void;
  onSignIn: () => void;
}) {
  if (mode === 'normal') return null;
  if (mode === 'loading') return <TableSkeletonState rows={6} />;

  const configs: Record<
    Exclude<GlobalStateMode, 'normal' | 'loading'>,
    { icon: React.ReactNode; title: string; body: string; ctaLabel: string; cta: () => void }
  > = {
    empty: {
      icon: <Inbox className="w-5 h-5" />,
      title: 'No records match this workspace view',
      body: 'No synthetic records are displayed. Clear your filters or configure source subscriptions to populate this view.',
      ctaLabel: 'Restore Active Feed',
      cta: onReset,
    },
    'first-time': {
      icon: <Sparkles className="w-5 h-5" />,
      title: 'Welcome to your clean OppSift workspace',
      body: 'You have no saved opportunities, searches, or analyses yet. Start by completing onboarding preferences or exploring supported jurisdictions.',
      ctaLabel: 'Return to Active Workspace',
      cta: onReset,
    },
    'source-unavailable': {
      icon: <DatabaseZap className="w-5 h-5" />,
      title: 'Upstream source temporarily unavailable',
      body: 'The requested procurement portal did not respond within the sync threshold. Last verified snapshot metadata remains intact.',
      ctaLabel: 'Return to Active View',
      cta: onReset,
    },
    'expired-opportunity': {
      icon: <Clock className="w-5 h-5" />,
      title: 'Opportunity submission deadline has passed',
      body: 'This notice is archived as Closed. Historical requirements and verification records remain readable for market intelligence.',
      ctaLabel: 'Browse Open Opportunities',
      cta: onReset,
    },
    'removed-opportunity': {
      icon: <ArchiveX className="w-5 h-5" />,
      title: 'Opportunity withdrawn by issuing authority',
      body: 'The contracting authority cancelled or removed this solicitation from its source feed.',
      ctaLabel: 'Return to Workspace',
      cta: onReset,
    },
    'incomplete-source': {
      icon: <AlertTriangle className="w-5 h-5" />,
      title: 'Incomplete source metadata notice',
      body: 'The upstream feed omitted estimated contract value and full attachment PDFs. Only verified published fields are shown.',
      ctaLabel: 'Restore Full View',
      cta: onReset,
    },
    'invalid-filters': {
      icon: <FilterX className="w-5 h-5" />,
      title: 'Invalid filter range supplied',
      body: 'Minimum contract value exceeds maximum value, or the selected deadline window is malformed. Adjust filter bounds and retry.',
      ctaLabel: 'Clear Invalid Filters',
      cta: onReset,
    },
    'network-error': {
      icon: <WifiOff className="w-5 h-5" />,
      title: 'Network connection interrupted',
      body: 'Unable to reach the OppSift API gateway. Check your connection and retry.',
      ctaLabel: 'Retry Connection',
      cta: onReset,
    },
    'permission-denied': {
      icon: <ShieldAlert className="w-5 h-5" />,
      title: 'Permission required for this workspace resource',
      body: 'Your current organisation role does not permit viewing or modifying this protected section.',
      ctaLabel: 'Return to Workspace',
      cta: onReset,
    },
    'session-expired': {
      icon: <Lock className="w-5 h-5" />,
      title: 'Your Neon Auth session has expired',
      body: 'Please re-authenticate with your credentials or Google OAuth to continue.',
      ctaLabel: 'Go to Sign In',
      cta: onSignIn,
    },
  };

  const cfg = configs[mode];
  return (
    <div className="rounded-xl oppsift-card px-6 py-12 text-center">
      <div className="mx-auto w-11 h-11 rounded-lg bg-[#FFF1F2] dark:bg-[#541B32]/50 text-[#541B32] dark:text-[#E8A4B5] flex items-center justify-center mb-4">
        {cfg.icon}
      </div>
      <h3 className="font-display text-base font-semibold">{cfg.title}</h3>
      <p className="mt-1.5 text-sm text-[#64748B] dark:text-[#CBD5E1] max-w-lg mx-auto">{cfg.body}</p>
      <div className="mt-5 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={cfg.cta}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#541B32] hover:bg-[#A33B59] text-white transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>{cfg.ctaLabel}</span>
        </button>
      </div>
    </div>
  );
}

export function ErrorStatusBanner({
  tone,
  title,
  message,
  onRetry,
}: {
  tone: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  const styles = {
    warning: 'border-[#D97706]/30 bg-[#D97706]/8 text-[#D97706]',
    error: 'border-[#DC2626]/30 bg-[#DC2626]/8 text-[#DC2626]',
    info: 'border-[#2563EB]/30 bg-[#2563EB]/8 text-[#2563EB] dark:text-[#38BDF8]',
    success: 'border-[#16A34A]/30 bg-[#16A34A]/8 text-[#16A34A]',
  };
  const icons = {
    warning: <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />,
    error: <ServerCrash className="w-4 h-4 shrink-0 mt-0.5" />,
    info: <DatabaseZap className="w-4 h-4 shrink-0 mt-0.5" />,
    success: <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />,
  };

  return (
    <div className={`rounded-xl border px-4 py-3 flex items-start justify-between gap-4 ${styles[tone]}`}>
      <div className="flex items-start gap-2.5">
        {icons[tone]}
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs opacity-90 mt-0.5">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-xs font-medium underline underline-offset-2 shrink-0 whitespace-nowrap"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-lg border border-[#E2E8F0] dark:border-white/15 bg-white dark:bg-[#171324] p-6 shadow-lg">
        <h3 className="font-display text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-[#64748B] dark:text-[#CBD5E1]">{description}</p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-md text-sm font-medium border border-[#E2E8F0] dark:border-white/15 hover:bg-[#F1F5F9] dark:hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
              destructive ? 'bg-[#DC2626] hover:bg-[#B91C1C]' : 'bg-[#541B32] hover:bg-[#A33B59]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, dismissToast } = useAppState();
  if (toasts.length === 0) return null;

  return (
    <div className="no-print fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center justify-between gap-3 rounded-lg border border-[#E2E8F0] dark:border-white/15 bg-white dark:bg-[#171324] px-4 py-3 shadow-md text-sm"
        >
          <span className="leading-snug">{t.message}</span>
          <button
            type="button"
            onClick={() => dismissToast(t.id)}
            aria-label="Dismiss notification"
            className="text-[#64748B] hover:text-[#172033] dark:text-[#CBD5E1] dark:hover:text-white shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
