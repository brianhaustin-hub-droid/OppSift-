import React, { useState } from 'react';
import {
  CreditCard,
  Edit3,
  FileSpreadsheet,
  RefreshCw,
  ShieldAlert,
  Tag,
  TrendingUp,
} from 'lucide-react';
import { InvoiceHistoryTable, SubscriptionStatusBadge } from '../../components/billing/BillingComponents';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout';
import { useAppState } from '../../context/AppStateContext';
import { useRouter } from '../../context/RouterContext';
import { PlanTierConfig } from '../../types/oppsift';

export function AdminBillingConsolePage({
  section = 'overview',
}: {
  section?: 'overview' | 'subscriptions' | 'transactions' | 'invoices' | 'plans' | 'coupons' | 'refunds';
}) {
  const { navigate } = useRouter();
  const {
    isAdminAuthorized,
    planCatalog,
    updatePlanConfig,
    subscription,
    transactions,
    invoices,
    coupons,
    refunds,
    pushToast,
  } = useAppState();

  const [editingPlan, setEditingPlan] = useState<PlanTierConfig | null>(null);

  const navTabs: { id: typeof section; label: string; route: string }[] = [
    { id: 'overview', label: 'Billing Overview', route: '/admin/billing' },
    { id: 'subscriptions', label: 'Subscriptions', route: '/admin/subscriptions' },
    { id: 'transactions', label: 'Transactions', route: '/admin/transactions' },
    { id: 'invoices', label: 'Invoices', route: '/admin/invoices' },
    { id: 'plans', label: 'Plans & Entitlements', route: '/admin/plans' },
    { id: 'coupons', label: 'Coupons', route: '/admin/coupons' },
    { id: 'refunds', label: 'Refunds & Disputes', route: '/admin/refunds' },
  ];

  // Financial totals are derived only from records the billing service has
  // confirmed. A workspace without a provider subscription is not counted.
  const provisionedSubscriptions = subscription.providerSubscriptionRef ? [subscription] : [];
  const activePaidCount = provisionedSubscriptions.filter(
    (item) => item.status === 'active' && item.planId !== 'free',
  ).length;
  const freeSubCount = provisionedSubscriptions.filter((item) => item.status === 'free').length;
  const cancelledCount = provisionedSubscriptions.filter((item) => item.status === 'cancelled').length;
  const failedTxCount = transactions.filter((t) => t.status === 'Failed').length;
  const monthlyRecurringRevenue = provisionedSubscriptions.reduce((total, item) => {
    if (item.status !== 'active' || item.planId === 'free') return total;
    const planPrice = planCatalog.find((plan) => plan.id === item.planId)?.monthlyPriceUsd ?? 0;
    return typeof planPrice === 'number' ? total + planPrice : total;
  }, 0);
  const annualRecurringRevenue = provisionedSubscriptions.reduce((total, item) => {
    if (item.status !== 'active' || item.planId === 'free' || item.frequency !== 'annual') return total;
    const planPrice = planCatalog.find((plan) => plan.id === item.planId)?.monthlyPriceUsd ?? 0;
    return typeof planPrice === 'number' ? total + planPrice * 12 : total;
  }, 0);
  const formatMoney = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  const handleSavePlanEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    updatePlanConfig(editingPlan.id, {
      name: editingPlan.name,
      monthlyPriceUsd: editingPlan.monthlyPriceUsd,
      annualMonthlyPriceUsd: editingPlan.annualMonthlyPriceUsd,
      available: editingPlan.available,
      providerProductId: editingPlan.providerProductId,
      providerMonthlyVariantId: editingPlan.providerMonthlyVariantId,
      providerAnnualVariantId: editingPlan.providerAnnualVariantId,
      entitlements: editingPlan.entitlements,
    });
    setEditingPlan(null);
  };

  return (
    <WorkspaceLayout title="Financial & Billing Administration" breadcrumb={`Admin / Billing / ${section}`}>
      <div className="space-y-6">
        {!isAdminAuthorized ? (
          <div className="p-10 rounded-lg oppsift-card max-w-xl mx-auto text-center space-y-4">
            <ShieldAlert className="w-10 h-10 mx-auto text-[#DC2626]" />
            <h2 className="font-display text-lg font-bold">Financial administration access restricted</h2>
            <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] max-w-md mx-auto">
              Administrative billing privileges are required to view customer subscriptions, transactions, invoices, and plan configurations.
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
            <div className="p-4 rounded-lg oppsift-card flex flex-wrap items-center justify-between gap-3 text-xs">
              <p className="text-[#64748B] dark:text-[#CBD5E1]">
                Protected financial operations console. All plan entitlement and pricing edits are logged to the administrative audit trail.
              </p>
            </div>

            <div className="flex items-center gap-1.5 p-1.5 rounded-lg oppsift-card max-w-full overflow-x-auto">
              {navTabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => navigate(t.route)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 ${
                    section === t.id ? 'oppsift-sidebar-active text-white' : 'text-[#64748B] dark:text-[#CBD5E1]'
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
                    {
                      label: 'Confirmed Subscriptions',
                      value: provisionedSubscriptions.length.toString(),
                      note: `${activePaidCount} paid · ${freeSubCount} free`,
                    },
                    {
                      label: 'Monthly Recurring Revenue',
                      value: formatMoney(monthlyRecurringRevenue),
                      note: provisionedSubscriptions.length === 0 ? 'No confirmed subscriptions' : 'From confirmed subscriptions',
                    },
                    {
                      label: 'Annual Recurring Revenue',
                      value: formatMoney(annualRecurringRevenue),
                      note: 'Active annual contracts',
                    },
                    {
                      label: 'Payment Failure / Churn',
                      value: `${failedTxCount} / ${cancelledCount}`,
                      note: 'Failed charges / Cancellations',
                    },
                  ].map((m) => (
                    <div key={m.label} className="p-5 rounded-lg oppsift-card space-y-1">
                      <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">{m.label}</p>
                      <p className="font-display text-2xl font-bold tabular-nums">{m.value}</p>
                      <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">{m.note}</p>
                    </div>
                  ))}
                </div>

                <div className="p-6 rounded-lg oppsift-card space-y-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#A33B59] dark:text-[#E8A4B5]" />
                    <h2 className="font-display text-base font-semibold">Revenue Trends &amp; Cohort Settlement</h2>
                  </div>
                  <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">
                    {transactions.length === 0
                      ? 'No settled paid transactions exist in the billing ledger yet. Revenue charts and net dollar retention populate from verified provider settlements.'
                      : `${transactions.length} settled or attempted transactions are recorded. Charting activates when the analytics endpoint returns a time series.`}
                  </p>
                </div>
              </div>
            )}

            {section === 'subscriptions' && (
              <div className="overflow-x-auto rounded-lg oppsift-card">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] dark:bg-white/6 text-[#64748B] dark:text-[#CBD5E1]">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Customer</th>
                      <th className="py-3 px-4 font-semibold">Plan</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Start Date</th>
                      <th className="py-3 px-4 font-semibold">Renewal Date</th>
                      <th className="py-3 px-4 font-semibold">Subscription Ref</th>
                      <th className="py-3 px-4 font-semibold">Provider</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] dark:divide-white/8">
                    {provisionedSubscriptions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 px-4 text-center">
                          <p className="font-semibold">No confirmed subscriptions</p>
                          <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] mt-1">
                            Subscriptions appear here after the billing provider confirms a checkout or renewal.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      provisionedSubscriptions.map((item) => (
                        <tr key={item.id || item.providerSubscriptionRef}>
                          <td className="py-3.5 px-4">
                            <p className="font-semibold">{item.organisationName || 'Organisation not named'}</p>
                            <p className="text-[#64748B] dark:text-[#94A3B8]">{item.billingEmail || '—'}</p>
                          </td>
                          <td className="py-3.5 px-4 capitalize font-medium">
                            {item.planId} ({item.frequency})
                          </td>
                          <td className="py-3.5 px-4">
                            <SubscriptionStatusBadge status={item.status} />
                          </td>
                          <td className="py-3.5 px-4 font-mono tabular-nums">{item.startDate || '—'}</td>
                          <td className="py-3.5 px-4 font-mono tabular-nums">{item.nextRenewalDate || '—'}</td>
                          <td className="py-3.5 px-4 font-mono">
                            {item.providerSubscriptionRef || '—'}
                          </td>
                          <td className="py-3.5 px-4">{item.provider}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {section === 'transactions' &&
              (transactions.length === 0 ? (
                <div className="p-8 rounded-lg oppsift-card text-center space-y-2">
                  <CreditCard className="w-8 h-8 mx-auto text-[#A33B59] dark:text-[#E8A4B5]" />
                  <h2 className="font-display text-base font-semibold">No payment transactions recorded</h2>
                  <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] max-w-md mx-auto">
                    Settled charges, refunds and declined attempts received from the payment provider appear here
                    automatically.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg oppsift-card">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC] dark:bg-white/6 text-[#64748B] dark:text-[#CBD5E1]">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Transaction</th>
                        <th className="py-3 px-4 font-semibold">Customer</th>
                        <th className="py-3 px-4 font-semibold">Amount</th>
                        <th className="py-3 px-4 font-semibold">Status</th>
                        <th className="py-3 px-4 font-semibold">Provider</th>
                        <th className="py-3 px-4 font-semibold">Date</th>
                        <th className="py-3 px-4 font-semibold">Subscription</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] dark:divide-white/8">
                      {transactions.map((transaction) => (
                        <tr key={transaction.id}>
                          <td className="py-3 px-4 font-mono font-semibold">{transaction.transactionRef}</td>
                          <td className="py-3 px-4">{transaction.customer}</td>
                          <td className="py-3 px-4 font-mono tabular-nums">
                            {transaction.currency} {transaction.amount.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 font-semibold">{transaction.status}</td>
                          <td className="py-3 px-4">{transaction.provider}</td>
                          <td className="py-3 px-4 font-mono tabular-nums">{transaction.transactionDate}</td>
                          <td className="py-3 px-4 font-mono">{transaction.subscriptionRef}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}

            {section === 'invoices' && (
              <InvoiceHistoryTable
                invoices={invoices}
                onDownload={(inv) => pushToast('info', `Requested administrative invoice ${inv.invoiceNumber}.`)}
              />
            )}

            {section === 'plans' && (
              <div className="space-y-6">
                <div className="overflow-x-auto rounded-lg oppsift-card">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC] dark:bg-white/6 text-[#64748B] dark:text-[#CBD5E1]">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Plan</th>
                        <th className="py-3 px-4 font-semibold">Monthly (USD)</th>
                        <th className="py-3 px-4 font-semibold">Searches / AI</th>
                        <th className="py-3 px-4 font-semibold">Provider Product ID</th>
                        <th className="py-3 px-4 font-semibold">Availability</th>
                        <th className="py-3 px-4 font-semibold text-right">Edit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] dark:divide-white/8">
                      {planCatalog.map((plan) => (
                        <tr key={plan.id} className="hover:bg-[#F8FAFC] dark:hover:bg-white/4">
                          <td className="py-3 px-4 font-semibold">{plan.name}</td>
                          <td className="py-3 px-4 font-mono tabular-nums">
                            {plan.monthlyPriceUsd === null ? 'Custom' : `$${plan.monthlyPriceUsd}`}
                          </td>
                          <td className="py-3 px-4 font-mono tabular-nums">
                            {plan.entitlements.searchesMonthly} / {plan.entitlements.aiAnalysesMonthly}
                          </td>
                          <td className="py-3 px-4 font-mono text-[#64748B] dark:text-[#94A3B8]">
                            {plan.providerProductId || '—'}
                          </td>
                          <td className="py-3 px-4 font-semibold">{plan.available ? 'Available' : 'Hidden'}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => setEditingPlan({ ...plan, entitlements: { ...plan.entitlements } })}
                              className="inline-flex items-center gap-1 text-[#541B32] dark:text-[#E8A4B5] font-semibold hover:underline"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Configure</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {editingPlan && (
                  <form onSubmit={handleSavePlanEdit} className="p-6 rounded-lg oppsift-card space-y-4 text-xs">
                    <h3 className="font-display text-base font-bold">Configure Plan: {editingPlan.name}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block font-medium mb-1">Display Name</label>
                        <input
                          type="text"
                          value={editingPlan.name}
                          onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                          className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6"
                        />
                      </div>
                      <div>
                        <label className="block font-medium mb-1">Monthly Price (USD)</label>
                        <input
                          type="number"
                          disabled={editingPlan.customPricing}
                          value={editingPlan.monthlyPriceUsd ?? ''}
                          onChange={(e) =>
                            setEditingPlan({ ...editingPlan, monthlyPriceUsd: Number(e.target.value) })
                          }
                          className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6"
                        />
                      </div>
                      <div>
                        <label className="block font-medium mb-1">Lemon Squeezy Product ID</label>
                        <input
                          type="text"
                          value={editingPlan.providerProductId}
                          onChange={(e) =>
                            setEditingPlan({ ...editingPlan, providerProductId: e.target.value })
                          }
                          className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-[#F8FAFC] dark:bg-white/6 font-mono"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="px-4 py-2 rounded-xl oppsift-sidebar-active text-white font-semibold">
                        Save &amp; Log Audit Change
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingPlan(null)}
                        className="px-4 py-2 rounded-xl border border-[#E2E8F0] dark:border-white/15 font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {section === 'coupons' && (
              <div className="overflow-x-auto rounded-lg oppsift-card">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] dark:bg-white/6 text-[#64748B] dark:text-[#CBD5E1]">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Code</th>
                      <th className="py-3 px-4 font-semibold">Discount Rule</th>
                      <th className="py-3 px-4 font-semibold">Provider Reference</th>
                      <th className="py-3 px-4 font-semibold">Redemptions</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] dark:divide-white/8">
                    {coupons.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-10 px-4 text-center">
                          <p className="font-semibold">No coupon codes configured</p>
                          <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] mt-1">
                            Discounts created in the payment provider appear here once synchronised.
                          </p>
                        </td>
                      </tr>
                    )}
                    {coupons.map((c) => (
                      <tr key={c.id}>
                        <td className="py-3 px-4 font-mono font-semibold flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5 text-[#A33B59]" />
                          <span>{c.code}</span>
                        </td>
                        <td className="py-3 px-4">{c.discountLabel}</td>
                        <td className="py-3 px-4 font-mono text-[#64748B] dark:text-[#94A3B8]">{c.providerCouponId}</td>
                        <td className="py-3 px-4 font-mono tabular-nums">
                          {c.redemptions} / {c.maxRedemptions ?? 'Unlimited'}
                        </td>
                        <td className="py-3 px-4 font-semibold">{c.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {section === 'refunds' && (
              <div className="p-8 rounded-lg oppsift-card text-center space-y-2">
                <RefreshCw className="w-8 h-8 mx-auto text-[#164E8B] dark:text-[#38BDF8]" />
                <h2 className="font-display text-base font-semibold">No refunds or chargeback disputes</h2>
                <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] max-w-md mx-auto">
                  {refunds.length === 0
                    ? 'Refund records issued through the Lemon Squeezy Merchant of Record dashboard or dispute webhooks appear here.'
                    : `${refunds.length} refund items tracked.`}
                </p>
              </div>
            )}

            <div className="p-4 rounded-lg oppsift-card flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B] dark:text-[#94A3B8]">
              <span className="inline-flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Need platform ingestion or source coverage admin?</span>
              </span>
              <div className="flex gap-3">
                <button type="button" onClick={() => navigate('/admin')} className="font-semibold text-[#541B32] dark:text-[#E8A4B5] hover:underline">
                  Platform Ops →
                </button>
                <button type="button" onClick={() => navigate('/admin/audit')} className="font-semibold text-[#541B32] dark:text-[#E8A4B5] hover:underline">
                  Audit History →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </WorkspaceLayout>
  );
}
