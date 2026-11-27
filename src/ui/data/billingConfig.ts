import { PlanTierConfig, PlanTierId, SystemServiceStatus, WorkspaceSubscription } from '../types/oppsift';

/**
 * Public billing configuration.
 *
 * Only non-secret values belong here: provider product/variant identifiers and
 * commercial policy. Secret API keys are never bundled into the browser.
 * Product and variant identifiers are read from deployment variables so the
 * same build can target separate Lemon Squeezy stores for preview and
 * production, and so a different Merchant of Record can be adopted without
 * touching the presentation layer.
 */
const PUBLIC_ENV: Record<string, string | undefined> =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

function readPublicValue(key: string): string {
  const value = PUBLIC_ENV[key];
  return typeof value === 'string' ? value.trim() : '';
}

/** Twelve months are charged on an annual subscription unless a discount is approved. */
export const ANNUAL_BILLING_MONTHS = 12;

/**
 * Commercial policy: no annual discount is published until it is approved.
 * Set VITE_ANNUAL_DISCOUNT_PERCENT to a reviewed value to advertise one.
 */
export const ANNUAL_DISCOUNT_PERCENT = (() => {
  const configured = Number(readPublicValue('VITE_ANNUAL_DISCOUNT_PERCENT'));
  return Number.isFinite(configured) && configured > 0 && configured < 100 ? configured : 0;
})();

export const BILLING_PROVIDER_CONFIG = {
  providerKey: 'lemon_squeezy' as const,
  providerName: 'Lemon Squeezy' as const,
  relationship: 'Merchant of Record (MoR)',
  supportedCurrencies: ['USD', 'EUR', 'GBP', 'SGD', 'CAD', 'AUD'],
  defaultCurrency: 'USD',
  gracePeriodDays: 7,
  annualBillingMonths: ANNUAL_BILLING_MONTHS,
  annualDiscountPercent: ANNUAL_DISCOUNT_PERCENT,
  refundWindowPolicy:
    'Refund eligibility is governed by the OppSift commercial refund policy and Merchant of Record review of the individual transaction.',
  taxNote:
    'Applicable VAT, GST, or regional sales tax is calculated and collected by Lemon Squeezy at checkout.',
};

interface ProviderPlanIdentifiers {
  productId: string;
  monthlyVariantId: string;
  annualVariantId: string;
}

function readProviderPlanIdentifiers(key: string): ProviderPlanIdentifiers {
  return {
    productId: readPublicValue(`VITE_LEMON_SQUEEZY_PRODUCT_${key}`),
    monthlyVariantId: readPublicValue(`VITE_LEMON_SQUEEZY_VARIANT_${key}_MONTHLY`),
    annualVariantId: readPublicValue(`VITE_LEMON_SQUEEZY_VARIANT_${key}_ANNUAL`),
  };
}

function plan(
  config: Omit<
    PlanTierConfig,
    'currency' | 'available' | 'providerProductId' | 'providerMonthlyVariantId' | 'providerAnnualVariantId'
  > &
    Partial<Pick<PlanTierConfig, 'available'>>,
): PlanTierConfig {
  const identifiers = readProviderPlanIdentifiers(config.id.toUpperCase());
  return {
    currency: BILLING_PROVIDER_CONFIG.defaultCurrency,
    available: config.available ?? true,
    providerProductId: identifiers.productId,
    providerMonthlyVariantId: identifiers.monthlyVariantId,
    providerAnnualVariantId: identifiers.annualVariantId,
    ...config,
  };
}

/**
 * Commercial hypothesis, intentionally separated from every presentation
 * component. Prices, limits and availability are configurable in
 * Admin → Plans and remain editable without a frontend release once the
 * billing service persists them.
 */
export const INITIAL_PLAN_CATALOG: PlanTierConfig[] = [
  plan({
    id: 'free',
    name: 'Free',
    audience: 'Individuals exploring OppSift',
    summary: 'Discover public notices across supported jurisdictions, apply core filters, and complete a baseline profile.',
    monthlyPriceUsd: 0,
    annualMonthlyPriceUsd: 0,
    customPricing: false,
    features: [
      'Basic opportunity discovery across supported jurisdictions',
      'Up to 10 saved opportunities',
      'Standard keyword, country and category filters',
      'Basic organisation profile',
      'Up to 2 active monitoring alerts',
      'Public notice metadata and source links',
    ],
    entitlements: {
      searchesMonthly: 50,
      savedOpportunitiesLimit: 10,
      aiAnalysesMonthly: 3,
      documentAnalysesMonthly: 2,
      activeAlertsLimit: 2,
      monitoredSearchesLimit: 2,
      teamSeatsLimit: 1,
      reportsMonthly: 2,
      workspacesLimit: 1,
    },
  }),
  plan({
    id: 'solo',
    name: 'Solo',
    audience: 'Independent professionals and small businesses',
    summary: 'Expanded discovery volume, saved searches, deadline monitoring and standard AI intelligence allowances.',
    monthlyPriceUsd: 19,
    annualMonthlyPriceUsd: 19,
    customPricing: false,
    features: [
      'Increased monthly opportunity discovery allowance',
      'Advanced multi-country, currency and value filters',
      'Up to 75 saved opportunities and 15 saved searches',
      'Custom matching preferences and profile weighting',
      'Opportunity tracking with deadline monitoring',
      'Standard AI eligibility analysis (40 per month)',
      'Basic CSV and JSON reporting',
    ],
    entitlements: {
      searchesMonthly: 500,
      savedOpportunitiesLimit: 75,
      aiAnalysesMonthly: 40,
      documentAnalysesMonthly: 25,
      activeAlertsLimit: 15,
      monitoredSearchesLimit: 15,
      teamSeatsLimit: 1,
      reportsMonthly: 15,
      workspacesLimit: 1,
    },
  }),
  plan({
    id: 'professional',
    name: 'Professional',
    audience: 'Growing businesses and opportunity researchers',
    summary: 'Deeper eligibility analysis, document requirement extraction, comparison and advanced reporting.',
    monthlyPriceUsd: 49,
    annualMonthlyPriceUsd: 49,
    customPricing: false,
    recommended: true,
    features: [
      'High-volume cross-border discovery and search capacity',
      'Criterion-by-criterion eligibility analysis',
      'Document and technical requirement extraction (120 per month)',
      'Side-by-side opportunity comparison',
      'Up to 40 monitored searches and amendment watches',
      'Enhanced preparation workflow and document checks',
      'Advanced printable and structured intelligence reports',
    ],
    entitlements: {
      searchesMonthly: 2500,
      savedOpportunitiesLimit: 300,
      aiAnalysesMonthly: 150,
      documentAnalysesMonthly: 120,
      activeAlertsLimit: 40,
      monitoredSearchesLimit: 40,
      teamSeatsLimit: 3,
      reportsMonthly: 60,
      workspacesLimit: 2,
    },
  }),
  plan({
    id: 'consultant',
    name: 'Consultant',
    audience: 'Independent advisors managing multi-client bids',
    summary: 'Client workspace isolation, elevated research allowances, executive reporting and higher monitoring limits.',
    monthlyPriceUsd: 99,
    annualMonthlyPriceUsd: 99,
    customPricing: false,
    features: [
      'Higher research allowances (500 AI analyses per month)',
      'Up to 5 isolated client workspaces',
      'Client-ready executive briefs and multi-currency exports',
      'Up to 1,000 saved opportunities',
      'Risk and suitability evaluation across workflows',
      'Up to 100 active alerts with amendment tracking',
      'Professional workflow and reporting capacity',
    ],
    entitlements: {
      searchesMonthly: 10000,
      savedOpportunitiesLimit: 1000,
      aiAnalysesMonthly: 500,
      documentAnalysesMonthly: 400,
      activeAlertsLimit: 100,
      monitoredSearchesLimit: 100,
      teamSeatsLimit: 5,
      reportsMonthly: 200,
      workspacesLimit: 5,
    },
  }),
  plan({
    id: 'team',
    name: 'Team',
    audience: 'Businesses and multi-seat organisations',
    summary: 'Centralised billing administration, configurable seats, role-based access and shared collections.',
    monthlyPriceUsd: null,
    annualMonthlyPriceUsd: null,
    customPricing: true,
    features: [
      'Configurable multi-member seat allocation',
      'Shared opportunity collections and pipeline boards',
      'Role-based permissions (Owner, Admin, Analyst, Viewer)',
      'Collaborative task assignment and document readiness',
      'Centralised organisation billing with consolidated invoices',
      'Organisation administration and usage reporting',
    ],
    entitlements: {
      searchesMonthly: 'Custom',
      savedOpportunitiesLimit: 'Custom',
      aiAnalysesMonthly: 'Custom',
      documentAnalysesMonthly: 'Custom',
      activeAlertsLimit: 'Custom',
      monitoredSearchesLimit: 'Custom',
      teamSeatsLimit: 'Custom',
      reportsMonthly: 'Custom',
      workspacesLimit: 'Custom',
    },
  }),
];

export function getPlanConfig(catalog: PlanTierConfig[], id: PlanTierId): PlanTierConfig {
  return catalog.find((p) => p.id === id) ?? catalog[0];
}

export interface PlanCharge {
  /** Price displayed per month, in the plan currency. */
  perMonthUsd: number | null;
  /** Amount charged per billing cycle. */
  totalUsd: number | null;
  discountPercent: number;
  billingMonths: number;
}

/** Computes the charge for a frequency without inventing an unpublished discount. */
export function getPlanCharge(
  plan: PlanTierConfig,
  frequency: 'monthly' | 'annual',
  discountPercent = BILLING_PROVIDER_CONFIG.annualDiscountPercent,
): PlanCharge {
  if (plan.customPricing || plan.monthlyPriceUsd === null) {
    return { perMonthUsd: null, totalUsd: null, discountPercent: 0, billingMonths: 0 };
  }
  if (frequency === 'monthly') {
    return {
      perMonthUsd: plan.monthlyPriceUsd,
      totalUsd: plan.monthlyPriceUsd,
      discountPercent: 0,
      billingMonths: 1,
    };
  }
  const perMonth = Math.round(plan.monthlyPriceUsd * (1 - discountPercent / 100) * 100) / 100;
  return {
    perMonthUsd: perMonth,
    totalUsd: Math.round(perMonth * ANNUAL_BILLING_MONTHS * 100) / 100,
    discountPercent,
    billingMonths: ANNUAL_BILLING_MONTHS,
  };
}

export function formatUsd(amount: number | null): string {
  if (amount === null) return 'Custom';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

/**
 * A workspace without a confirmed provider subscription is a free workspace.
 * No organisation name, billing email or provider reference is assumed here;
 * they are supplied from the authenticated account and authoritative billing
 * events.
 */
export const INITIAL_WORKSPACE_SUBSCRIPTION: WorkspaceSubscription = {
  id: '',
  organisationName: '',
  billingEmail: '',
  billingAdministrator: '',
  planId: 'free',
  pendingPlanId: null,
  pendingChangeEffectiveDate: null,
  frequency: 'monthly',
  status: 'free',
  provider: 'Lemon Squeezy',
  providerSubscriptionRef: null,
  startDate: '',
  nextRenewalDate: null,
  accessEndDate: null,
  gracePeriodDays: BILLING_PROVIDER_CONFIG.gracePeriodDays,
  failureReason: null,
  occupiedSeats: 0,
  allocatedSeats: 1,
};

export interface SystemStatusConfig {
  authConfigured: boolean;
  dataConfigured: boolean;
  paymentsConfigured: boolean;
}

function statusTimestamp(): string {
  return `${new Date().toISOString().replace('T', ' ').slice(0, 16)} UTC`;
}

/**
 * Builds the status board from values this client can actually observe. A
 * service without a monitoring probe is reported as unverified rather than
 * given an invented uptime figure or incident history.
 */
export function buildSystemServicesStatus(config: SystemStatusConfig): SystemServiceStatus[] {
  const checkedAt = statusTimestamp();
  const unmonitored = 'No operational monitoring probe is attached to this service in the current deployment.';

  return [
    {
      id: 'svc-app',
      name: 'Web Application',
      description: 'OppSift client interface and static asset delivery.',
      state: 'Operational',
      note: 'This status page was rendered by the deployed application.',
      checkedAt,
    },
    {
      id: 'svc-auth',
      name: 'Authentication',
      description: 'Neon Managed Auth sign-in, session and verification services.',
      state: config.authConfigured ? 'Operational' : 'Unverified',
      note: config.authConfigured
        ? 'Sign-in and session services are available.'
        : 'Authentication status could not be confirmed.',
      checkedAt,
    },
    {
      id: 'svc-search',
      name: 'Opportunity Search',
      description: 'Indexed search across stored opportunity notices.',
      state: config.dataConfigured ? 'Operational' : 'Unverified',
      note: config.dataConfigured ? 'Opportunity records are available.' : unmonitored,
      checkedAt,
    },
    {
      id: 'svc-ingestion',
      name: 'Data Ingestion',
      description: 'Scheduled source collection and normalisation.',
      state: 'Unverified',
      note: unmonitored,
      checkedAt,
    },
    {
      id: 'svc-notif',
      name: 'Notifications',
      description: 'Deadline, amendment and match notifications.',
      state: 'Unverified',
      note: unmonitored,
      checkedAt,
    },
    {
      id: 'svc-ai',
      name: 'AI Intelligence',
      description: 'Eligibility analysis and document requirement extraction.',
      state: 'Unverified',
      note: unmonitored,
      checkedAt,
    },
    {
      id: 'svc-payments',
      name: 'Billing & Payments',
      description: 'Subscription checkout, renewals and provider notifications.',
      state: config.paymentsConfigured ? 'Operational' : 'Unverified',
      note: config.paymentsConfigured
        ? 'Checkout and payment status are available.'
        : 'Payment status could not be confirmed.',
      checkedAt,
    },
  ];
}
