import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Layers,
  Receipt,
  RefreshCw,
  Users,
} from 'lucide-react';
import {
  CheckoutExperiencePanel,
  CheckoutModal,
  InvoiceHistoryTable,
  PaymentRecoveryBanner,
  PlanTierCard,
  SubscriptionStatusBadge,
  UsageMetricCard,
} from '../../components/billing/BillingComponents';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout';
import { useAppState } from '../../context/AppStateContext';
import { useRouter } from '../../context/RouterContext';
import { BILLING_PROVIDER_CONFIG, getPlanConfig } from '../../data/billingConfig';
import { lemonSqueezyAdapter } from '../../services/paymentAdapter';
import {
  BillingFrequency,
  InvoiceRecord,
  PlanTierId,
  SubscriptionStatus,
} from '../../types/oppsift';

export function SubscriptionBillingPage() {
  const { navigate } = useRouter();
  const {
    planCatalog,
    subscription,
    updateSubscriptionField,
    usageMetrics,
    refunds,
    teamMembers,
    checkoutOpen,
    checkoutPlanId,
    checkoutFrequency,
    checkoutState,
    setCheckoutState,
    openCheckout,
    closeCheckout,
    cancelPendingPlanTransition,
    requestSubscriptionReactivate,
    pushToast,
  } = useAppState();

  const currentPlan = getPlanConfig(planCatalog, subscription.planId);
  const checkoutPlan = getPlanConfig(planCatalog, checkoutPlanId);

  const handleManagePaymentMethod = async () => {
    const res = await lemonSqueezyAdapter.requestCustomerPortalUrl(subscription.providerSubscriptionRef);
    pushToast(res.available ? 'info' : 'warning', res.message);
  };

  const navSubTabs = [
    { label: 'Overview & Subscription', route: '/settings/billing' },
    { label: 'Usage & Limits', route: '/settings/usage' },
    { label: 'Billing History & Invoices', route: '/settings/billing/history' },
    { label: 'Change Plan', route: '/settings/billing/change' },
    { label: 'Cancel Subscription', route: '/settings/billing/cancel' },
  ];

  return (
    <WorkspaceLayout title="Subscription & Billing" breadcrumb="Settings / Billing">
      <div className="space-y-6">
        {/* Sub-navigation across billing suite */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl oppsift-card max-w-full overflow-x-auto">
          {navSubTabs.map((t) => (
            <button
              key={t.route}
              type="button"
              onClick={() => navigate(t.route)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                t.route === '/settings/billing'
                  ? 'oppsift-sidebar-active text-white'
                  : 'text-[#64748B] dark:text-[#CBD5E1] hover:text-[#172033] dark:hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Failed Payment & Grace Policy Recovery Banner */}
        <PaymentRecoveryBanner
          status={subscription.status}
          reason={subscription.failureReason}
          gracePeriodDays={subscription.gracePeriodDays}
          onRetry={() => openCheckout(subscription.planId, subscription.frequency)}
          onUpdateMethod={handleManagePaymentMethod}
        />

        {/* Pending Plan Change Notice */}
        {subscription.pendingPlanId && (
          <div className="p-4 rounded-2xl oppsift-card border-[#164E8B]/35 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <p className="font-semibold text-[#164E8B] dark:text-[#38BDF8]">
                Pending plan transition to {getPlanConfig(planCatalog, subscription.pendingPlanId).name}
              </p>
              <p className="text-[#64748B] dark:text-[#CBD5E1] mt-0.5">
                Effective: {subscription.pendingChangeEffectiveDate}. Active once authoritative {BILLING_PROVIDER_CONFIG.providerName} webhook confirms.
              </p>
            </div>
            <button
              type="button"
              onClick={cancelPendingPlanTransition}
              className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-white/15 font-semibold"
            >
              Cancel Pending Change
            </button>
          </div>
        )}

        {/* Current Subscription & Entitlement Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 p-6 rounded-2xl oppsift-card space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#A33B59] dark:text-[#E8A4B5]">Current Workspace Plan</p>
                <div className="flex items-center gap-3 mt-1">
                  <h2 className="font-display text-2xl font-bold">{currentPlan.name}</h2>
                  <SubscriptionStatusBadge status={subscription.status} />
                </div>
                <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] mt-1">{currentPlan.audience}</p>
              </div>
              <div className="text-right font-mono text-xs tabular-nums">
                <p className="text-[#64748B] dark:text-[#94A3B8]">Billing Frequency</p>
                <p className="font-semibold capitalize text-sm mt-0.5">{subscription.frequency}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-xl border border-[#E2E8F0] dark:border-white/10">
                <p className="text-[#64748B] dark:text-[#94A3B8]">Billing Provider</p>
                <p className="font-semibold mt-0.5">{subscription.provider}</p>
              </div>
              <div className="p-3 rounded-xl border border-[#E2E8F0] dark:border-white/10">
                <p className="text-[#64748B] dark:text-[#94A3B8]">Next Renewal</p>
                <p className="font-mono font-semibold mt-0.5 tabular-nums">
                  {subscription.nextRenewalDate || 'Not scheduled'}
                </p>
              </div>
              <div className="p-3 rounded-xl border border-[#E2E8F0] dark:border-white/10">
                <p className="text-[#64748B] dark:text-[#94A3B8]">AI Analyses / mo</p>
                <p className="font-mono font-semibold mt-0.5 tabular-nums">
                  {currentPlan.entitlements.aiAnalysesMonthly}
                </p>
              </div>
              <div className="p-3 rounded-xl border border-[#E2E8F0] dark:border-white/10">
                <p className="text-[#64748B] dark:text-[#94A3B8]">Team Seats</p>
                <p className="font-mono font-semibold mt-0.5 tabular-nums">
                  {currentPlan.entitlements.teamSeatsLimit}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => navigate('/settings/billing/change')}
                className="px-4 py-2 rounded-xl oppsift-sidebar-active text-white text-xs font-semibold"
              >
                Upgrade or Change Plan
              </button>
              <button
                type="button"
                onClick={() =>
                  updateSubscriptionField({
                    frequency: subscription.frequency === 'monthly' ? 'annual' : 'monthly',
                  })
                }
                className="px-4 py-2 rounded-xl border border-[#E2E8F0] dark:border-white/15 text-xs font-semibold"
              >
                Switch to {subscription.frequency === 'monthly' ? 'Annual' : 'Monthly'} Billing
              </button>
              {subscription.status === 'cancelled' || subscription.status === 'expired' ? (
                <button
                  type="button"
                  onClick={requestSubscriptionReactivate}
                  className="px-4 py-2 rounded-xl border border-[#16A34A] text-[#16A34A] text-xs font-semibold"
                >
                  Reactivate Subscription
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('/settings/billing/cancel')}
                  className="px-4 py-2 rounded-xl border border-[#E2E8F0] dark:border-white/15 text-[#DC2626] dark:text-[#FB7185] text-xs font-semibold"
                >
                  Cancel Subscription
                </button>
              )}
            </div>
          </div>

          {/* Payment Method Overview (Hosted Lemon Squeezy Flow) */}
          <div className="lg:col-span-5 p-6 rounded-2xl oppsift-card flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#164E8B] dark:text-[#38BDF8]" />
                  <h3 className="font-display text-base font-semibold">Payment Method</h3>
                </div>
                <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">Hosted via {BILLING_PROVIDER_CONFIG.providerName}</span>
              </div>

              <div className="p-4 rounded-xl border border-[#E2E8F0] dark:border-white/10 bg-[#F8FAFC] dark:bg-white/4 text-xs space-y-1.5">
                <p className="font-semibold">
                  {subscription.status === 'free'
                    ? 'No payment method stored on file'
                    : 'Managed securely inside Lemon Squeezy Customer Portal'}
                </p>
                <p className="text-[#64748B] dark:text-[#CBD5E1]">
                  Accepted methods (Cards, PayPal, Apple Pay where supported) are verified securely through {BILLING_PROVIDER_CONFIG.providerName} during checkout. OppSift never stores raw card credentials.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleManagePaymentMethod}
              className="w-full py-2.5 px-4 rounded-xl border border-[#E2E8F0] dark:border-white/15 hover:border-[#A33B59] text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <span>Manage Payment Method via Lemon Squeezy</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Team Seat & Organisation Billing Summary */}
        <div className="p-6 rounded-2xl oppsift-card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#A33B59] dark:text-[#E8A4B5]" />
              <h3 className="font-display text-base font-semibold">Organisation &amp; Seat Billing</h3>
            </div>
            <button
              type="button"
              onClick={() => navigate('/teams')}
              className="text-xs font-semibold text-[#A33B59] dark:text-[#E8A4B5] hover:underline"
            >
              Manage Team Members →
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-[#E2E8F0] dark:border-white/10">
              <p className="text-[#64748B] dark:text-[#94A3B8]">Billing Administrator</p>
              <p className="font-semibold mt-1">{subscription.billingAdministrator}</p>
            </div>
            <div className="p-4 rounded-xl border border-[#E2E8F0] dark:border-white/10">
              <p className="text-[#64748B] dark:text-[#94A3B8]">Occupied Seats</p>
              <p className="font-mono font-semibold tabular-nums mt-1">{teamMembers.length} active / invited</p>
            </div>
            <div className="p-4 rounded-xl border border-[#E2E8F0] dark:border-white/10">
              <p className="text-[#64748B] dark:text-[#94A3B8]">Plan Seat Allowance</p>
              <p className="font-mono font-semibold tabular-nums mt-1">{currentPlan.entitlements.teamSeatsLimit}</p>
            </div>
            <div className="p-4 rounded-xl border border-[#E2E8F0] dark:border-white/10">
              <p className="text-[#64748B] dark:text-[#94A3B8]">Billing Identity</p>
              <p className="font-mono truncate mt-1">{subscription.billingEmail}</p>
            </div>
          </div>
        </div>

        {/* Usage Snapshot */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-semibold">Entitlement Usage Summary</h3>
            <button
              type="button"
              onClick={() => navigate('/settings/usage')}
              className="text-xs font-semibold text-[#A33B59] dark:text-[#E8A4B5] hover:underline"
            >
              Full Usage Dashboard →
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {usageMetrics.slice(0, 4).map((m) => (
              <UsageMetricCard key={m.id} metric={m} onUpgrade={() => navigate('/settings/billing/change')} />
            ))}
          </div>
        </div>

        {/* Refunds & Disputes Policy Card */}
        <div className="p-6 rounded-2xl oppsift-card space-y-3">
          <h3 className="font-display text-base font-semibold">Refunds &amp; Payment Disputes</h3>
          {refunds.length === 0 ? (
            <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">
              No refund requests or payment disputes recorded. {BILLING_PROVIDER_CONFIG.refundWindowPolicy}
            </p>
          ) : null}
        </div>
      </div>

      <CheckoutModal
        open={checkoutOpen}
        plan={checkoutPlan}
        frequency={checkoutFrequency}
        billingEmail={subscription.billingEmail}
        organisationName={subscription.organisationName}
        stateMode={checkoutState}
        onChangeState={setCheckoutState}
        onClose={closeCheckout}
      />
    </WorkspaceLayout>
  );
}

export function UsageLimitsPage() {
  const { navigate, goBack, getBackLabel } = useRouter();
  const { planCatalog, subscription, usageMetrics } = useAppState();
  const currentPlan = getPlanConfig(planCatalog, subscription.planId);

  return (
    <WorkspaceLayout title="Usage & Entitlement Limits" breadcrumb="Settings / Usage">
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => goBack('/settings/billing')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#541B32] dark:text-[#E8A4B5] hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to {getBackLabel('Subscription & Billing')}</span>
        </button>

        <div className="p-5 rounded-2xl oppsift-card flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-[#A33B59] dark:text-[#E8A4B5]">
              Active Entitlement Plan: {currentPlan.name}
            </p>
            <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">
              Monthly metered allowances reset on the 1st of each billing cycle. Workspace capacity allowances apply across active records.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate('/settings/billing')}
              className="px-3.5 py-2 rounded-xl border border-[#E2E8F0] dark:border-white/15 text-xs font-semibold"
            >
              Billing Overview
            </button>
            <button
              type="button"
              onClick={() => navigate('/settings/billing/change')}
              className="px-4 py-2 rounded-xl oppsift-sidebar-active text-white text-xs font-semibold"
            >
              Increase Allowances
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {usageMetrics.map((metric) => (
            <UsageMetricCard
              key={metric.id}
              metric={metric}
              onUpgrade={() => navigate('/settings/billing/change')}
            />
          ))}
        </div>
      </div>
    </WorkspaceLayout>
  );
}

export function BillingHistoryPage() {
  const { goBack, getBackLabel } = useRouter();
  const { invoices, refunds, pushToast } = useAppState();
  const [filterStatus, setFilterStatus] = useState<'All' | InvoiceRecord['status']>('All');

  const visibleInvoices = invoices.filter(
    (inv) => filterStatus === 'All' || inv.status === filterStatus
  );

  return (
    <WorkspaceLayout title="Billing History & Invoices" breadcrumb="Settings / Billing / History">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 rounded-xl oppsift-card max-w-full overflow-x-auto text-xs">
            {(['All', 'Paid', 'Pending', 'Failed', 'Refunded'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap shrink-0 ${
                  filterStatus === st ? 'oppsift-sidebar-active text-white' : 'text-[#64748B] dark:text-[#CBD5E1]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => goBack('/settings/billing')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#A33B59] dark:text-[#E8A4B5] hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to {getBackLabel('Subscription & Billing')}</span>
          </button>
        </div>

        <InvoiceHistoryTable
          invoices={visibleInvoices}
          onDownload={(inv) => pushToast('info', `Invoice ${inv.invoiceNumber} PDF retrieval requested.`)}
        />

        <div className="p-6 rounded-2xl oppsift-card space-y-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#164E8B] dark:text-[#38BDF8]" />
            <h3 className="font-display text-base font-semibold">Refund &amp; Dispute History</h3>
          </div>
          {refunds.length === 0 ? (
            <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">
              No refund transactions or billing disputes have been recorded for this workspace.
            </p>
          ) : null}
        </div>
      </div>
    </WorkspaceLayout>
  );
}

export function PlanChangePage() {
  const { navigate, goBack, getBackLabel } = useRouter();
  const {
    planCatalog,
    subscription,
    requestPlanTransition,
    openCheckout,
    checkoutOpen,
    checkoutPlanId,
    checkoutFrequency,
    checkoutState,
    setCheckoutState,
    closeCheckout,
  } = useAppState();
  const [frequency, setFrequency] = useState<BillingFrequency>(subscription.frequency);
  const [targetId, setTargetId] = useState<PlanTierId>('professional');

  const currentPlan = getPlanConfig(planCatalog, subscription.planId);
  const targetPlan = getPlanConfig(planCatalog, targetId);
  const checkoutPlan = getPlanConfig(planCatalog, checkoutPlanId);

  const handleSelectPlan = (plan: typeof targetPlan) => {
    setTargetId(plan.id);
    if (plan.customPricing) {
      navigate('/contact');
      return;
    }
    if (subscription.status === 'free' && plan.id !== 'free') {
      openCheckout(plan.id, frequency);
    }
  };

  return (
    <WorkspaceLayout title="Change Subscription Plan" breadcrumb="Settings / Billing / Change Plan">
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => goBack('/settings/billing')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#541B32] dark:text-[#E8A4B5] hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to {getBackLabel('Subscription & Billing')}</span>
        </button>

        <div className="p-5 rounded-2xl oppsift-card flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#A33B59] dark:text-[#E8A4B5]">
              Current Plan: {currentPlan.name} ({subscription.frequency})
            </p>
            <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] mt-0.5">
              Compare entitlements before initiating checkout or scheduling a downgrade. Billing adjustments follow {BILLING_PROVIDER_CONFIG.providerName} settlement rules without synthetic proration guesses.
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F1F5F9] dark:bg-white/8 text-xs">
            {(['monthly', 'annual'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFrequency(f)}
                className={`px-3 py-1.5 rounded-lg font-semibold capitalize ${
                  frequency === f
                    ? 'bg-white dark:bg-[#2B152A] text-[#541B32] dark:text-[#E8A4B5] shadow-xs'
                    : 'text-[#64748B] dark:text-[#CBD5E1]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-4">
          {planCatalog.map((plan) => (
            <PlanTierCard
              key={plan.id}
              plan={plan}
              frequency={frequency}
              isCurrent={subscription.planId === plan.id}
              onSelect={handleSelectPlan}
            />
          ))}
        </div>

        {targetId !== subscription.planId && !targetPlan.customPricing && (
          <div className="p-6 rounded-2xl oppsift-card space-y-4">
            <h3 className="font-display text-base font-semibold">
              Plan Transition Summary: {currentPlan.name} → {targetPlan.name}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-[#E2E8F0] dark:border-white/10">
                <p className="text-[#64748B] dark:text-[#94A3B8]">AI Analyses Allowance</p>
                <p className="font-mono font-semibold mt-1">
                  {currentPlan.entitlements.aiAnalysesMonthly} → {targetPlan.entitlements.aiAnalysesMonthly} / mo
                </p>
              </div>
              <div className="p-4 rounded-xl border border-[#E2E8F0] dark:border-white/10">
                <p className="text-[#64748B] dark:text-[#94A3B8]">Saved Opportunities</p>
                <p className="font-mono font-semibold mt-1">
                  {currentPlan.entitlements.savedOpportunitiesLimit} → {targetPlan.entitlements.savedOpportunitiesLimit}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-[#E2E8F0] dark:border-white/10">
                <p className="text-[#64748B] dark:text-[#94A3B8]">Effective Timing</p>
                <p className="font-semibold mt-1">
                  {targetId === 'free' ? 'End of current billing period' : 'Upon payment webhook confirmation'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  targetId === 'free'
                    ? requestPlanTransition(targetId, frequency)
                    : openCheckout(targetId, frequency)
                }
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl oppsift-sidebar-active text-white text-xs font-semibold"
              >
                <span>{targetId === 'free' ? 'Confirm Scheduled Downgrade' : `Checkout ${targetPlan.name} Plan`}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/settings/billing')}
                className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-white/15 text-xs font-semibold"
              >
                Back to Billing
              </button>
            </div>
          </div>
        )}
      </div>

      <CheckoutModal
        open={checkoutOpen}
        plan={checkoutPlan}
        frequency={checkoutFrequency}
        billingEmail={subscription.billingEmail}
        organisationName={subscription.organisationName}
        stateMode={checkoutState}
        onChangeState={setCheckoutState}
        onClose={closeCheckout}
      />
    </WorkspaceLayout>
  );
}

export function CancelSubscriptionPage() {
  const { navigate, goBack, getBackLabel } = useRouter();
  const { planCatalog, subscription, requestSubscriptionCancel } = useAppState();
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(subscription.status === 'cancelled');

  const currentPlan = getPlanConfig(planCatalog, subscription.planId);

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    await requestSubscriptionCancel(reason);
    setConfirmed(true);
  };

  return (
    <WorkspaceLayout title="Cancel Subscription" breadcrumb="Settings / Billing / Cancel">
      <div className="max-w-3xl space-y-6">
        <button
          type="button"
          onClick={() => goBack('/settings/billing')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#541B32] dark:text-[#E8A4B5] hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to {getBackLabel('Subscription & Billing')}</span>
        </button>

        {confirmed ? (
          <div className="p-8 rounded-2xl oppsift-card space-y-4">
            <div className="flex items-center gap-2 text-[#16A34A]">
              <CheckCircle2 className="w-5 h-5" />
              <h2 className="font-display text-lg font-bold">Cancellation recorded cleanly</h2>
            </div>
            <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] leading-relaxed">
              Your workspace subscription cancellation has been submitted. Access to paid entitlements remains active through{' '}
              <span className="font-semibold text-[#172033] dark:text-white">
                {subscription.accessEndDate || 'the end of your current billing period'}
              </span>
              . All saved opportunities, preparation notes, and historical reports remain preserved.
            </p>
            <button
              type="button"
              onClick={() => navigate('/settings/billing')}
              className="px-4 py-2 rounded-xl oppsift-sidebar-active text-white text-xs font-semibold"
            >
              Return to Billing Overview
            </button>
          </div>
        ) : (
          <form onSubmit={handleConfirmCancel} className="p-6 rounded-2xl oppsift-card space-y-5">
            <div className="flex items-start gap-3">
              <Ban className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
              <div>
                <h2 className="font-display text-lg font-bold">Cancel {currentPlan.name} Subscription</h2>
                <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] mt-1">
                  Review the exact entitlement impact before confirming. We do not apply exit fees or unexpected data removal.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[#E2E8F0] dark:border-white/10 bg-[#F8FAFC] dark:bg-white/4 space-y-2 text-xs">
              <p className="font-semibold">What changes at the end of your current period:</p>
              <ul className="space-y-1 text-[#64748B] dark:text-[#CBD5E1]">
                <li>• Plan reverts to the Free tier limits (10 saved opportunities, 3 monthly AI analyses, 1 workspace).</li>
                <li>• Access continues until: {subscription.nextRenewalDate || 'Immediate (Free tier)'}.</li>
                <li>• Existing saved notices, bid checklists, and notes remain safely stored in read-accessible history.</li>
              </ul>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Optional cancellation feedback</label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Share optional context on why this plan no longer fits your workflow..."
                className="w-full p-3 rounded-xl border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 text-xs"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate('/settings/billing')}
                className="px-5 py-2.5 rounded-xl oppsift-sidebar-active text-white text-xs font-semibold"
              >
                Keep Current Subscription
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl border border-[#DC2626] text-[#DC2626] text-xs font-semibold hover:bg-[#DC2626]/10"
              >
                Confirm Subscription Cancellation
              </button>
            </div>
          </form>
        )}
      </div>
    </WorkspaceLayout>
  );
}

export function StandaloneCheckoutPage() {
  const { goBack, getBackLabel } = useRouter();
  const {
    planCatalog,
    subscription,
    checkoutPlanId,
    checkoutFrequency,
    checkoutState,
    setCheckoutState,
  } = useAppState();
  const [selectedPlanId, setSelectedPlanId] = useState<PlanTierId>(checkoutPlanId);
  const [frequency, setFrequency] = useState<BillingFrequency>(checkoutFrequency);

  const selectedPlan = getPlanConfig(planCatalog, selectedPlanId);

  return (
    <WorkspaceLayout title="Checkout" breadcrumb="Commercial / Checkout">
      <div className="max-w-5xl space-y-5">
        <button
          type="button"
          onClick={() => goBack('/settings/billing')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#541B32] dark:text-[#E8A4B5] hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to {getBackLabel('Subscription & Billing')}</span>
        </button>

        <div className="p-4 rounded-2xl oppsift-card flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#A33B59] dark:text-[#E8A4B5]" />
            <span className="font-semibold">Plan Selection:</span>
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value as PlanTierId)}
              className="h-8 px-2.5 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6"
            >
              {planCatalog.filter((p) => !p.customPricing && p.id !== 'free').map((p) => (
                <option key={p.id} value={p.id}>{p.name} (${p.monthlyPriceUsd}/mo)</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 text-[#64748B]" />
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as BillingFrequency)}
              className="h-8 px-2.5 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6"
            >
              <option value="monthly">Monthly Billing</option>
              <option value="annual">Annual Billing</option>
            </select>
          </div>
        </div>

        <CheckoutExperiencePanel
          plan={selectedPlan}
          frequency={frequency}
          billingEmail={subscription.billingEmail}
          organisationName={subscription.organisationName}
          stateMode={checkoutState}
          onChangeState={setCheckoutState}
        />
      </div>
    </WorkspaceLayout>
  );
}
