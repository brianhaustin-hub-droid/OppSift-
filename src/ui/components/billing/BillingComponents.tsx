import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Ban,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  ExternalLink,
  Loader2,
  Lock,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react';
import { BILLING_PROVIDER_CONFIG } from '../../data/billingConfig';
import { lemonSqueezyAdapter } from '../../services/paymentAdapter';
import {
  BillingFrequency,
  CheckoutStateMode,
  InvoiceRecord,
  PlanTierConfig,
  PlanTierId,
  SubscriptionStatus,
  UsageMetricRecord,
} from '../../types/oppsift';

export function SubscriptionStatusBadge({ status }: { status: SubscriptionStatus }) {
  const map: Record<SubscriptionStatus, { label: string; icon: React.ReactNode; cls: string }> = {
    free: {
      label: 'Free Tier',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      cls: 'text-[#64748B] dark:text-[#CBD5E1]',
    },
    active: {
      label: 'Active',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      cls: 'text-[#16A34A] dark:text-[#34D399]',
    },
    trialing: {
      label: 'Trialing',
      icon: <Sparkles className="w-3.5 h-3.5" />,
      cls: 'text-[#164E8B] dark:text-[#38BDF8]',
    },
    past_due: {
      label: 'Past Due',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      cls: 'text-[#D97706] dark:text-[#FBBF24]',
    },
    payment_pending: {
      label: 'Payment Pending',
      icon: <Clock className="w-3.5 h-3.5" />,
      cls: 'text-[#164E8B] dark:text-[#38BDF8]',
    },
    cancelled: {
      label: 'Cancelled',
      icon: <Ban className="w-3.5 h-3.5" />,
      cls: 'text-[#D97706] dark:text-[#FBBF24]',
    },
    expired: {
      label: 'Expired',
      icon: <XCircle className="w-3.5 h-3.5" />,
      cls: 'text-[#DC2626] dark:text-[#FB7185]',
    },
    suspended: {
      label: 'Suspended',
      icon: <AlertCircle className="w-3.5 h-3.5" />,
      cls: 'text-[#DC2626] dark:text-[#FB7185]',
    },
  };

  const item = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${item.cls}`}>
      {item.icon}
      <span>{item.label}</span>
    </span>
  );
}

export function PlanTierCard({
  plan,
  frequency,
  isCurrent,
  onSelect,
}: {
  plan: PlanTierConfig;
  frequency: BillingFrequency;
  isCurrent: boolean;
  onSelect: (plan: PlanTierConfig) => void;
}) {
  const unitPrice = frequency === 'annual' ? plan.annualMonthlyPriceUsd : plan.monthlyPriceUsd;

  return (
    <div
      className={`p-6 rounded-2xl flex flex-col justify-between transition-all ${
        plan.recommended
          ? 'oppsift-card border-[#A33B59] dark:border-[#E8A4B5] ring-1 ring-[#A33B59]/25'
          : 'oppsift-card'
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-[#541B32] dark:text-[#E8A4B5]">{plan.audience}</span>
          {plan.recommended && (
            <span className="font-semibold text-[#A33B59] dark:text-[#E8A4B5]">Recommended</span>
          )}
        </div>

        <h2 className="mt-2 font-display text-xl font-bold text-[#172033] dark:text-[#F8FAFC]">{plan.name}</h2>
        <p className="mt-1.5 text-xs text-[#64748B] dark:text-[#CBD5E1] leading-relaxed min-h-[36px]">{plan.summary}</p>

        <div className="mt-5 pb-4 border-b border-[#E2E8F0] dark:border-white/10">
          {plan.customPricing || unitPrice === null ? (
            <>
              <p className="font-display text-2xl font-bold text-[#172033] dark:text-white">Custom Pricing</p>
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1">
                Configured by seat count &amp; organisation scope
              </p>
            </>
          ) : (
            <>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-3xl font-bold tabular-nums text-[#172033] dark:text-white">
                  ${unitPrice}
                </span>
                <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">/ month</span>
              </div>
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1">
                {unitPrice === 0
                  ? 'Free tier · No card required'
                  : frequency === 'annual'
                  ? `Billed annually ($${unitPrice * 12}/year) · Taxes by MoR`
                  : 'Billed monthly · Taxes calculated at checkout'}
              </p>
            </>
          )}
        </div>

        <div className="mt-4 space-y-2 text-[11px] font-mono tabular-nums text-[#64748B] dark:text-[#CBD5E1]">
          <div className="flex justify-between">
            <span>Searches / mo</span>
            <span className="font-semibold text-[#172033] dark:text-white">{plan.entitlements.searchesMonthly}</span>
          </div>
          <div className="flex justify-between">
            <span>AI analyses / mo</span>
            <span className="font-semibold text-[#172033] dark:text-white">{plan.entitlements.aiAnalysesMonthly}</span>
          </div>
          <div className="flex justify-between">
            <span>Saved opportunities</span>
            <span className="font-semibold text-[#172033] dark:text-white">{plan.entitlements.savedOpportunitiesLimit}</span>
          </div>
          <div className="flex justify-between">
            <span>Active alerts</span>
            <span className="font-semibold text-[#172033] dark:text-white">{plan.entitlements.activeAlertsLimit}</span>
          </div>
          <div className="flex justify-between">
            <span>Team seats</span>
            <span className="font-semibold text-[#172033] dark:text-white">{plan.entitlements.teamSeatsLimit}</span>
          </div>
        </div>

        <ul className="mt-5 space-y-2 text-xs text-[#172033] dark:text-[#CBD5E1]">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-[#16A34A] shrink-0 mt-0.5" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={() => onSelect(plan)}
        disabled={isCurrent}
        className={`mt-6 w-full py-2.5 px-4 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
          isCurrent
            ? 'border border-[#16A34A]/40 bg-[#16A34A]/10 text-[#16A34A] cursor-default'
            : plan.recommended
            ? 'oppsift-sidebar-active text-white hover:brightness-110'
            : 'border border-[#E2E8F0] dark:border-white/15 hover:border-[#A33B59] text-[#172033] dark:text-white'
        }`}
      >
        {isCurrent
          ? 'Current Workspace Plan'
          : plan.customPricing
          ? 'Contact Sales for Team'
          : plan.id === 'free'
          ? 'Select Free Tier'
          : `Continue with ${plan.name} →`}
      </button>
    </div>
  );
}

export function PlanComparisonMatrix({ catalog }: { catalog: PlanTierConfig[] }) {
  const rows: { label: string; accessor: (p: PlanTierConfig) => string | number }[] = [
    { label: 'Monthly Discovery Searches', accessor: (p) => p.entitlements.searchesMonthly },
    { label: 'Saved Opportunity Capacity', accessor: (p) => p.entitlements.savedOpportunitiesLimit },
    { label: 'AI Eligibility & Risk Analyses / mo', accessor: (p) => p.entitlements.aiAnalysesMonthly },
    { label: 'Document Requirement Extractions / mo', accessor: (p) => p.entitlements.documentAnalysesMonthly },
    { label: 'Active Monitoring Alert Rules', accessor: (p) => p.entitlements.activeAlertsLimit },
    { label: 'Monitored Saved Searches', accessor: (p) => p.entitlements.monitoredSearchesLimit },
    { label: 'Monthly Intelligence Reports', accessor: (p) => p.entitlements.reportsMonthly },
    { label: 'Client / Team Workspaces', accessor: (p) => p.entitlements.workspacesLimit },
    { label: 'Team Member Seats', accessor: (p) => p.entitlements.teamSeatsLimit },
  ];

  return (
    <div className="overflow-x-auto rounded-2xl oppsift-card">
      <table className="w-full text-left text-xs">
        <thead className="bg-[#F8FAFC] dark:bg-white/6 text-[#64748B] dark:text-[#CBD5E1]">
          <tr>
            <th className="py-3.5 px-4 font-semibold">Entitlement Metric</th>
            {catalog.map((plan) => (
              <th key={plan.id} className="py-3.5 px-4 font-semibold text-right">
                {plan.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E2E8F0] dark:divide-white/8">
          {rows.map((row) => (
            <tr key={row.label} className="hover:bg-[#F8FAFC] dark:hover:bg-white/4">
              <td className="py-3 px-4 font-medium text-[#172033] dark:text-[#F8FAFC]">{row.label}</td>
              {catalog.map((plan) => (
                <td key={plan.id} className="py-3 px-4 text-right font-mono tabular-nums text-[#64748B] dark:text-[#CBD5E1]">
                  {row.accessor(plan)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function UsageMetricCard({
  metric,
  onUpgrade,
}: {
  metric: UsageMetricRecord;
  onUpgrade?: () => void;
}) {
  const isCustom = metric.allowance === 'Custom';
  const numericAllowance = typeof metric.allowance === 'number' ? metric.allowance : Math.max(metric.used * 2, 1);
  const pct = isCustom ? 18 : Math.min(100, Math.round((metric.used / Math.max(numericAllowance, 1)) * 100));
  const remaining = isCustom ? 'Contracted' : `${Math.max(0, numericAllowance - metric.used)} ${metric.unit}`;
  const isNearCap = !isCustom && pct >= 80;

  return (
    <div className="p-5 rounded-2xl oppsift-card space-y-3 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-[#172033] dark:text-white">{metric.label}</span>
          <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">{metric.periodType}</span>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="font-display text-2xl font-bold tabular-nums">
            {metric.used.toLocaleString()}
          </span>
          <span className="font-mono text-xs tabular-nums text-[#64748B] dark:text-[#CBD5E1]">
            of {isCustom ? 'Custom' : numericAllowance.toLocaleString()} {metric.unit}
          </span>
        </div>
        <div className="mt-3 h-2 w-full rounded-full bg-[#F1F5F9] dark:bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isNearCap ? 'bg-[#D97706]' : 'bg-gradient-to-r from-[#A33B59] to-[#38BDF8]'
            }`}
            style={{ width: `${Math.max(pct, metric.used > 0 ? 6 : 0)}%` }}
          />
        </div>
      </div>

      <div className="pt-2 border-t border-[#E2E8F0] dark:border-white/8 flex items-center justify-between text-[11px]">
        <span className="text-[#64748B] dark:text-[#94A3B8]">
          Remaining: <strong className="font-mono tabular-nums text-[#172033] dark:text-white">{remaining}</strong>
        </span>
        {metric.resetDate ? (
          <span className="font-mono text-[#64748B] dark:text-[#94A3B8]">Resets {metric.resetDate}</span>
        ) : onUpgrade && isNearCap ? (
          <button
            type="button"
            onClick={onUpgrade}
            className="font-semibold text-[#A33B59] dark:text-[#E8A4B5] hover:underline"
          >
            Upgrade Limit →
          </button>
        ) : (
          <span className="text-[#64748B] dark:text-[#94A3B8]">Workspace Total</span>
        )}
      </div>
    </div>
  );
}

export function InvoiceHistoryTable({
  invoices,
  onDownload,
}: {
  invoices: InvoiceRecord[];
  onDownload: (invoice: InvoiceRecord) => void;
}) {
  if (invoices.length === 0) {
    return (
      <div className="p-10 rounded-2xl oppsift-card text-center space-y-2">
        <div className="mx-auto w-11 h-11 rounded-xl bg-[#FFF1F2] dark:bg-[#541B32]/40 text-[#541B32] dark:text-[#E8A4B5] flex items-center justify-center">
          <Receipt className="w-5 h-5" />
        </div>
        <h3 className="font-display text-base font-semibold">No invoices available</h3>
        <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] max-w-md mx-auto">
          Billing statements and VAT/GST tax receipts issued by {BILLING_PROVIDER_CONFIG.providerName} appear here once a paid subscription transaction is recorded.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl oppsift-card">
      <table className="w-full text-left text-xs">
        <thead className="bg-[#F8FAFC] dark:bg-white/6 text-[#64748B] dark:text-[#CBD5E1]">
          <tr>
            <th className="py-3 px-4 font-semibold">Invoice #</th>
            <th className="py-3 px-4 font-semibold">Date</th>
            <th className="py-3 px-4 font-semibold">Description</th>
            <th className="py-3 px-4 font-semibold">Provider Ref</th>
            <th className="py-3 px-4 font-semibold">Amount</th>
            <th className="py-3 px-4 font-semibold">Status</th>
            <th className="py-3 px-4 font-semibold text-right">Receipt</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E2E8F0] dark:divide-white/8">
          {invoices.map((inv) => (
            <tr key={inv.id} className="hover:bg-[#F8FAFC] dark:hover:bg-white/4">
              <td className="py-3 px-4 font-mono font-semibold">{inv.invoiceNumber}</td>
              <td className="py-3 px-4 font-mono tabular-nums">{inv.issuedAt}</td>
              <td className="py-3 px-4">{inv.description}</td>
              <td className="py-3 px-4 font-mono text-[#64748B] dark:text-[#94A3B8]">{inv.providerReference}</td>
              <td className="py-3 px-4 font-mono tabular-nums font-semibold">
                {inv.currency} {inv.amount.toFixed(2)}
              </td>
              <td className="py-3 px-4 font-semibold">
                <span
                  className={
                    inv.status === 'Paid'
                      ? 'text-[#16A34A]'
                      : inv.status === 'Failed'
                      ? 'text-[#DC2626]'
                      : inv.status === 'Refunded'
                      ? 'text-[#164E8B] dark:text-[#38BDF8]'
                      : 'text-[#D97706]'
                  }
                >
                  {inv.status}
                </span>
              </td>
              <td className="py-3 px-4 text-right">
                <button
                  type="button"
                  onClick={() => onDownload(inv)}
                  className="inline-flex items-center gap-1 text-[#541B32] dark:text-[#E8A4B5] font-semibold hover:underline"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PaymentRecoveryBanner({
  status,
  reason,
  gracePeriodDays,
  onRetry,
  onUpdateMethod,
}: {
  status: SubscriptionStatus;
  reason: string | null;
  gracePeriodDays: number;
  onRetry: () => void;
  onUpdateMethod: () => void;
}) {
  if (status !== 'past_due' && status !== 'suspended') return null;

  return (
    <div className="p-5 rounded-2xl border border-[#DC2626]/35 bg-[#DC2626]/8 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <p className="font-display text-sm font-bold text-[#DC2626]">
            {status === 'suspended' ? 'Paid workspace features suspended' : 'Subscription renewal payment unsuccessful'}
          </p>
          <p className="text-[#172033] dark:text-[#F8FAFC]">
            {reason || 'Authoritative billing notice: renewal charge could not be completed by Lemon Squeezy.'}
          </p>
          <p className="text-[#64748B] dark:text-[#CBD5E1]">
            Grace policy: Your saved opportunities, pipeline tasks, and notes remain preserved for {gracePeriodDays} days during recovery. No workspace records are deleted on payment failure.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 shrink-0">
        <button
          type="button"
          onClick={onRetry}
          className="px-3.5 py-2 rounded-xl bg-[#541B32] hover:bg-[#A33B59] text-white text-xs font-semibold"
        >
          Retry Payment
        </button>
        <button
          type="button"
          onClick={onUpdateMethod}
          className="px-3.5 py-2 rounded-xl border border-[#E2E8F0] dark:border-white/15 bg-white dark:bg-white/8 text-xs font-semibold"
        >
          Update Payment Method
        </button>
      </div>
    </div>
  );
}

export function CheckoutExperiencePanel({
  plan,
  frequency,
  billingEmail,
  organisationName,
  stateMode,
  onChangeState,
  onClose,
}: {
  plan: PlanTierConfig;
  frequency: BillingFrequency;
  billingEmail: string;
  organisationName: string;
  stateMode: CheckoutStateMode;
  onChangeState: (mode: CheckoutStateMode) => void;
  onClose?: () => void;
}) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [emailInput, setEmailInput] = useState(billingEmail);
  const [orgInput, setOrgInput] = useState(organisationName);
  const [resultMessage, setResultMessage] = useState('');

  const monthlyUnit = frequency === 'annual' ? plan.annualMonthlyPriceUsd : plan.monthlyPriceUsd;
  const totalCharge = monthlyUnit === null ? null : frequency === 'annual' ? monthlyUnit * 12 : monthlyUnit;

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || stateMode === 'pending' || stateMode === 'opening') {
      onChangeState('duplicate_prevented');
      setResultMessage('A checkout request is already in progress. Duplicate submission prevented.');
      return;
    }
    setSubmitting(true);
    onChangeState('opening');
    const res = await lemonSqueezyAdapter.initiateCheckout({
      plan,
      frequency,
      billingEmail: emailInput,
      organisationName: orgInput,
      termsAccepted,
    });
    setSubmitting(false);
    onChangeState(res.state);
    setResultMessage(res.message);
  };

  return (
    <div className="oppsift-card rounded-2xl p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 border-b border-[#E2E8F0] dark:border-white/10 pb-4">
        <div>
          <p className="text-xs font-semibold text-[#A33B59] dark:text-[#E8A4B5]">
            Merchant of Record · {BILLING_PROVIDER_CONFIG.providerName}
          </p>
          <h2 className="font-display text-xl font-bold mt-1">Secure Subscription Checkout</h2>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close checkout"
            className="p-1.5 rounded-lg border border-[#E2E8F0] dark:border-white/15"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Order & Billing Identity */}
        <form onSubmit={handleCheckoutSubmit} className="lg:col-span-7 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium mb-1">Billing Organisation</label>
              <input
                type="text"
                value={orgInput}
                onChange={(e) => setOrgInput(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Billing Receipt Email</label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[#E2E8F0] dark:border-white/10 bg-[#F8FAFC] dark:bg-white/4 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-[#172033] dark:text-white">
              <Lock className="w-3.5 h-3.5 text-[#16A34A]" />
              <span>Hosted Provider Security</span>
            </div>
            <p className="text-[#64748B] dark:text-[#CBD5E1]">
              OppSift never collects or stores raw card numbers. Payment credentials and VAT/GST calculations are handled directly inside {BILLING_PROVIDER_CONFIG.providerName}&apos;s secure checkout overlay.
            </p>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-[#64748B] dark:text-[#CBD5E1]">
              I accept the OppSift Terms of Service, recurring subscription terms, and Merchant of Record tax calculation by {BILLING_PROVIDER_CONFIG.providerName}.
            </span>
          </label>

          {/* Checkout Lifecycle Status Box */}
          <div className="p-4 rounded-xl border border-[#E2E8F0] dark:border-white/12 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Checkout Status</span>
              <span className="font-mono text-[11px] text-[#A33B59] dark:text-[#E8A4B5] uppercase">
                {stateMode.replace('_', ' ')}
              </span>
            </div>

            {stateMode === 'opening' && (
              <p className="flex items-center gap-2 text-[#164E8B] dark:text-[#38BDF8]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Preparing secure {BILLING_PROVIDER_CONFIG.providerName} session...</span>
              </p>
            )}
            {stateMode === 'pending' && (
              <p className="flex items-center gap-2 text-[#D97706]">
                <Clock className="w-4 h-4" />
                <span>Checkout window open. Complete payment in the provider modal to trigger webhook confirmation.</span>
              </p>
            )}
            {stateMode === 'verification_pending' && (
              <p className="flex items-center gap-2 text-[#164E8B] dark:text-[#38BDF8]">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>
                  {resultMessage || 'Checkout request prepared. Entitlements activate only upon authoritative payment webhook confirmation.'}
                </span>
              </p>
            )}
            {stateMode === 'succeeded' && (
              <p className="flex items-center gap-2 text-[#16A34A]">
                <CheckCircle2 className="w-4 h-4" />
                <span>Authoritative webhook verified. Subscription entitlements activated.</span>
              </p>
            )}
            {(stateMode === 'failed' || stateMode === 'expired' || stateMode === 'cancelled' || stateMode === 'duplicate_prevented') && (
              <p className="flex items-center gap-2 text-[#DC2626]">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  {resultMessage ||
                    (stateMode === 'expired'
                      ? 'Checkout session expired before completion. Start a fresh checkout session.'
                      : stateMode === 'cancelled'
                      ? 'Checkout cancelled by user. No charge occurred.'
                      : 'Payment could not be completed. Review card authorisation or contact support.')}
                </span>
              </p>
            )}
            {stateMode === 'ready' && (
              <p className="text-[#64748B] dark:text-[#CBD5E1]">
                Ready for handoff to {BILLING_PROVIDER_CONFIG.providerName} ({frequency === 'annual' ? plan.providerAnnualVariantId : plan.providerMonthlyVariantId}).
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl oppsift-sidebar-active text-white font-semibold disabled:opacity-60"
            >
              <CreditCard className="w-4 h-4" />
              <span>{submitting ? 'Initiating Checkout...' : `Proceed to ${BILLING_PROVIDER_CONFIG.providerName}`}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            {stateMode !== 'ready' && (
              <button
                type="button"
                onClick={() => {
                  onChangeState('ready');
                  setResultMessage('');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-white/15 font-medium"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Session</span>
              </button>
            )}
          </div>
        </form>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-xl border border-[#E2E8F0] dark:border-white/10 bg-[#F8FAFC] dark:bg-white/4 space-y-3 text-xs">
            <h3 className="font-display text-sm font-bold">Order Summary</h3>
            <div className="flex justify-between">
              <span className="text-[#64748B] dark:text-[#CBD5E1]">Selected Plan</span>
              <span className="font-semibold">{plan.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B] dark:text-[#CBD5E1]">Billing Frequency</span>
              <span className="capitalize font-semibold">{frequency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B] dark:text-[#CBD5E1]">Currency</span>
              <span className="font-mono font-semibold">{plan.currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B] dark:text-[#CBD5E1]">Taxes / VAT / GST</span>
              <span>Calculated by Lemon Squeezy</span>
            </div>
            <div className="pt-3 border-t border-[#E2E8F0] dark:border-white/10 flex justify-between items-baseline">
              <span className="font-semibold">Subtotal Estimate</span>
              <span className="font-display text-xl font-bold tabular-nums">
                {totalCharge === null ? 'Custom' : `$${totalCharge.toFixed(2)}`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CheckoutModal({
  open,
  plan,
  frequency,
  billingEmail,
  organisationName,
  stateMode,
  onChangeState,
  onClose,
}: {
  open: boolean;
  plan: PlanTierConfig;
  frequency: BillingFrequency;
  billingEmail: string;
  organisationName: string;
  stateMode: CheckoutStateMode;
  onChangeState: (mode: CheckoutStateMode) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-4xl my-6">
        <CheckoutExperiencePanel
          plan={plan}
          frequency={frequency}
          billingEmail={billingEmail}
          organisationName={organisationName}
          stateMode={stateMode}
          onChangeState={onChangeState}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
