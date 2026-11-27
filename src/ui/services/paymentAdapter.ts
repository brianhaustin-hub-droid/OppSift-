import {
  BillingFrequency,
  CheckoutStateMode,
  InvoiceRecord,
  PaymentMethodSummary,
  PlanTierConfig,
  PlanTierId,
  RefundRecord,
  SubscriptionStatus,
  TransactionRecord,
  WorkspaceSubscription,
} from '../types/oppsift';

const PUBLIC_ENV: Record<string, string | undefined> =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

/**
 * Base URL of the OppSift billing service. The service owns provider secrets,
 * creates checkout sessions, verifies provider signatures and is the only
 * writer of subscription state. The browser never receives a Lemon Squeezy API
 * key, and no product identifier is invented when the deployment has not
 * configured one.
 */
export const BILLING_API_BASE = (() => {
  const configured = (PUBLIC_ENV.VITE_BILLING_API_URL ?? '').trim().replace(/\/+$/, '');
  return configured;
})();

export const isBillingServiceConfigured = BILLING_API_BASE.length > 0;

const UNAVAILABLE_MESSAGE =
  'Secure checkout is currently unavailable. No payment has been taken. Please try again shortly or contact support.';

export interface CheckoutInitiationRequest {
  plan: PlanTierConfig;
  frequency: BillingFrequency;
  billingEmail: string;
  organisationName: string;
  termsAccepted: boolean;
}

export interface CheckoutSessionResult {
  state: CheckoutStateMode;
  provider: 'Lemon Squeezy';
  variantId: string;
  sessionReference: string;
  checkoutUrl?: string;
  message: string;
}

export interface PortalResult {
  available: boolean;
  url?: string;
  message: string;
}

export interface PlanChangeResult {
  accepted: boolean;
  effectivePolicy: 'immediate' | 'next_period';
  message: string;
}

export interface CancellationResult {
  accepted: boolean;
  accessEndDate?: string | null;
  message: string;
}

export interface ReactivationResult {
  accepted: boolean;
  message: string;
}

export interface BillingSnapshot {
  subscription: WorkspaceSubscription | null;
  paymentMethods: PaymentMethodSummary[];
  invoices: InvoiceRecord[];
  transactions: TransactionRecord[];
  refunds: RefundRecord[];
}

export type BillingSnapshotState = 'ready' | 'unconfigured' | 'unauthenticated' | 'error';

export interface BillingSnapshotResult {
  state: BillingSnapshotState;
  snapshot: BillingSnapshot | null;
  message: string;
}

export interface PaymentProviderAdapter {
  readonly providerName: 'Lemon Squeezy';
  readonly configured: boolean;
  initiateCheckout(req: CheckoutInitiationRequest): Promise<CheckoutSessionResult>;
  requestCustomerPortalUrl(subscriptionRef: string | null): Promise<PortalResult>;
  requestPlanChange(
    currentPlanId: PlanTierId,
    targetPlanId: PlanTierId,
    frequency: BillingFrequency,
  ): Promise<PlanChangeResult>;
  requestCancellation(subscriptionRef: string | null, reason: string): Promise<CancellationResult>;
  requestReactivation(subscriptionRef: string | null): Promise<ReactivationResult>;
  fetchBillingSnapshot(): Promise<BillingSnapshotResult>;
}

interface ApiEnvelope {
  error?: string;
  message?: string;
  [key: string]: unknown;
}

async function postJson<T extends ApiEnvelope>(path: string, body: unknown): Promise<{ status: number; data: T }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`${BILLING_API_BASE}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = (await response.json().catch(() => ({}))) as T;
    return { status: response.status, data };
  } finally {
    clearTimeout(timeout);
  }
}

function unconfiguredCheckout(variantId: string): CheckoutSessionResult {
  return {
    state: 'unavailable',
    provider: 'Lemon Squeezy',
    variantId,
    sessionReference: '',
    message: UNAVAILABLE_MESSAGE,
  };
}

function normaliseStatus(value: unknown): SubscriptionStatus {
  const allowed: SubscriptionStatus[] = [
    'free',
    'active',
    'trialing',
    'past_due',
    'payment_pending',
    'cancelled',
    'expired',
    'suspended',
  ];
  return allowed.includes(value as SubscriptionStatus) ? (value as SubscriptionStatus) : 'free';
}

function normaliseSubscription(value: unknown): WorkspaceSubscription | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<WorkspaceSubscription>;
  if (typeof raw.planId !== 'string') return null;
  const planIds: PlanTierId[] = ['free', 'solo', 'professional', 'consultant', 'team'];
  const planId = planIds.includes(raw.planId as PlanTierId) ? (raw.planId as PlanTierId) : 'free';
  return {
    id: typeof raw.id === 'string' ? raw.id : '',
    organisationName: typeof raw.organisationName === 'string' ? raw.organisationName : '',
    billingEmail: typeof raw.billingEmail === 'string' ? raw.billingEmail : '',
    billingAdministrator:
      typeof raw.billingAdministrator === 'string' ? raw.billingAdministrator : '',
    planId,
    pendingPlanId: raw.pendingPlanId ?? null,
    pendingChangeEffectiveDate: raw.pendingChangeEffectiveDate ?? null,
    frequency: raw.frequency === 'annual' ? 'annual' : 'monthly',
    status: normaliseStatus(raw.status),
    provider: 'Lemon Squeezy',
    providerSubscriptionRef:
      typeof raw.providerSubscriptionRef === 'string' ? raw.providerSubscriptionRef : null,
    startDate: typeof raw.startDate === 'string' ? raw.startDate : '',
    nextRenewalDate: typeof raw.nextRenewalDate === 'string' ? raw.nextRenewalDate : null,
    accessEndDate: typeof raw.accessEndDate === 'string' ? raw.accessEndDate : null,
    gracePeriodDays:
      typeof raw.gracePeriodDays === 'number' ? raw.gracePeriodDays : 7,
    failureReason: typeof raw.failureReason === 'string' ? raw.failureReason : null,
    occupiedSeats: typeof raw.occupiedSeats === 'number' ? raw.occupiedSeats : 0,
    allocatedSeats: typeof raw.allocatedSeats === 'number' ? raw.allocatedSeats : 1,
  };
}

/** Provider rows are untrusted input: keep only object entries. */
function asArray<T>(value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is T => typeof entry === 'object' && entry !== null);
}

/**
 * Lemon Squeezy adapter — Merchant of Record.
 *
 * Every operation is delegated to the OppSift billing service. The adapter
 * never reports a subscription as active because a browser action completed;
 * activation, renewal, cancellation and refunds are applied only from
 * provider-confirmed service responses (which are themselves webhook-driven).
 */
export const lemonSqueezyAdapter: PaymentProviderAdapter = {
  providerName: 'Lemon Squeezy',
  configured: isBillingServiceConfigured,

  async initiateCheckout(req) {
    const variantId =
      req.frequency === 'annual' ? req.plan.providerAnnualVariantId : req.plan.providerMonthlyVariantId;

    if (!req.termsAccepted) {
      return {
        state: 'failed',
        provider: 'Lemon Squeezy',
        variantId,
        sessionReference: '',
        message: 'Accept the Terms of Service before continuing to secure checkout.',
      };
    }

    if (req.plan.id === 'free' || req.plan.customPricing) {
      return {
        state: 'ready',
        provider: 'Lemon Squeezy',
        variantId,
        sessionReference: '',
        message: req.plan.customPricing
          ? 'Team plans are arranged with OppSift commercial operations.'
          : 'The Free plan does not require checkout.',
      };
    }

    if (!BILLING_API_BASE || !variantId) {
      return unconfiguredCheckout(variantId);
    }

    try {
      const { status, data } = await postJson<ApiEnvelope>('/checkout', {
        planId: req.plan.id,
        frequency: req.frequency,
        variantId,
        billingEmail: req.billingEmail,
        organisationName: req.organisationName,
      });

      if (status === 401 || status === 403) {
        return {
          state: 'failed',
          provider: 'Lemon Squeezy',
          variantId,
          sessionReference: '',
          message: 'Your session has expired. Sign in again to continue checkout.',
        };
      }
      if (status === 409) {
        return {
          state: 'duplicate_prevented',
          provider: 'Lemon Squeezy',
          variantId,
          sessionReference: '',
          message: 'A checkout for this plan is already in progress. Complete it in the payment window.',
        };
      }
      if (status === 410) {
        return {
          state: 'expired',
          provider: 'Lemon Squeezy',
          variantId,
          sessionReference: '',
          message: 'This checkout session has expired. Start a new checkout to continue.',
        };
      }
      if (status < 200 || status >= 300) {
        return {
          ...unconfiguredCheckout(variantId),
          message:
            'The secure checkout service could not start this checkout. No payment has been taken. Please try again shortly.',
        };
      }

      const checkoutUrl = typeof data.checkoutUrl === 'string' ? data.checkoutUrl : '';
      const sessionReference =
        typeof data.sessionReference === 'string' ? data.sessionReference : '';
      if (!checkoutUrl) {
        return {
          state: 'verification_pending',
          provider: 'Lemon Squeezy',
          variantId,
          sessionReference,
          message:
            'Checkout request received. Subscription access activates after the payment provider confirms the transaction.',
        };
      }

      return {
        state: 'pending',
        provider: 'Lemon Squeezy',
        variantId,
        sessionReference,
        checkoutUrl,
        message: 'Opening the secure payment window. Complete payment to confirm your subscription.',
      };
    } catch {
      return {
        ...unconfiguredCheckout(variantId),
        message:
          'We could not reach the secure checkout service. No payment has been taken. Check your connection and try again.',
      };
    }
  },

  async requestCustomerPortalUrl(subscriptionRef) {
    if (!subscriptionRef) {
      return {
        available: false,
        message:
          'Payment methods are managed by the billing provider after a paid subscription is confirmed.',
      };
    }
    if (!BILLING_API_BASE) {
      return {
        available: false,
        message:
          'Payment method management is unavailable right now. No changes have been made to your subscription.',
      };
    }
    try {
      const { status, data } = await postJson<ApiEnvelope>('/portal', { subscriptionRef });
      const url = typeof data.url === 'string' ? data.url : '';
      if (status >= 200 && status < 300 && url) {
        return { available: true, url, message: 'Opening the secure billing portal.' };
      }
      return {
        available: false,
        message:
          typeof data.message === 'string'
            ? data.message
            : 'The billing portal is unavailable right now. No changes have been made to your subscription.',
      };
    } catch {
      return {
        available: false,
        message: 'We could not reach the billing portal. Check your connection and try again.',
      };
    }
  },

  async requestPlanChange(_currentPlanId, targetPlanId, frequency) {
    if (!BILLING_API_BASE) {
      return {
        accepted: false,
        effectivePolicy: 'next_period',
        message:
          'Plan changes are unavailable right now. Your current subscription has not been changed.',
      };
    }
    try {
      const { status, data } = await postJson<ApiEnvelope>('/subscription/change-plan', {
        targetPlanId,
        frequency,
      });
      if (status >= 200 && status < 300) {
        return {
          accepted: true,
          effectivePolicy: data.effectivePolicy === 'immediate' ? 'immediate' : 'next_period',
          message:
            typeof data.message === 'string'
              ? data.message
              : 'Plan change requested. Subscription access updates after provider confirmation.',
        };
      }
      return {
        accepted: false,
        effectivePolicy: 'next_period',
        message:
          typeof data.message === 'string'
            ? data.message
            : 'The plan change could not be requested. Your current subscription has not been changed.',
      };
    } catch {
      return {
        accepted: false,
        effectivePolicy: 'next_period',
        message: 'We could not reach the billing service. Your current subscription has not been changed.',
      };
    }
  },

  async requestCancellation(subscriptionRef, reason) {
    if (!BILLING_API_BASE) {
      return {
        accepted: false,
        message:
          'Cancellation is unavailable right now. Your subscription remains active and no changes have been made.',
      };
    }
    try {
      const { status, data } = await postJson<ApiEnvelope>('/subscription/cancel', {
        subscriptionRef,
        reason,
      });
      if (status >= 200 && status < 300) {
        return {
          accepted: true,
          accessEndDate: typeof data.accessEndDate === 'string' ? data.accessEndDate : null,
          message:
            typeof data.message === 'string'
              ? data.message
              : 'Cancellation confirmed. Paid access continues until the end of the current billing period.',
        };
      }
      return {
        accepted: false,
        message:
          typeof data.message === 'string'
            ? data.message
            : 'The cancellation could not be completed. Your subscription remains active.',
      };
    } catch {
      return {
        accepted: false,
        message: 'We could not reach the billing service. Your subscription remains active.',
      };
    }
  },

  async requestReactivation(subscriptionRef) {
    if (!BILLING_API_BASE) {
      return {
        accepted: false,
        message:
          'Reactivation is unavailable right now. Your subscription has not been changed.',
      };
    }
    try {
      const { status, data } = await postJson<ApiEnvelope>('/subscription/reactivate', {
        subscriptionRef,
      });
      if (status >= 200 && status < 300) {
        return {
          accepted: true,
          message:
            typeof data.message === 'string'
              ? data.message
              : 'Reactivation confirmed. Access continues under the current plan.',
        };
      }
      return {
        accepted: false,
        message:
          typeof data.message === 'string'
            ? data.message
            : 'The subscription could not be reactivated.',
      };
    } catch {
      return {
        accepted: false,
        message: 'We could not reach the billing service. Your subscription has not been changed.',
      };
    }
  },

  async fetchBillingSnapshot() {
    if (!BILLING_API_BASE) {
      return {
        state: 'unconfigured',
        snapshot: null,
        message: 'Billing service configuration is unavailable in this deployment.',
      };
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(`${BILLING_API_BASE}/snapshot`, {
        credentials: 'include',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      if (response.status === 401 || response.status === 403) {
        return {
          state: 'unauthenticated',
          snapshot: null,
          message: 'Sign in to read subscription and billing records.',
        };
      }
      if (!response.ok) {
        return {
          state: 'error',
          snapshot: null,
          message: 'Billing records could not be read. Try again shortly.',
        };
      }
      const data = (await response.json().catch(() => ({}))) as ApiEnvelope;
      return {
        state: 'ready',
        snapshot: {
          subscription: normaliseSubscription(data.subscription),
          paymentMethods: asArray<PaymentMethodSummary>(data.paymentMethods),
          invoices: asArray<InvoiceRecord>(data.invoices),
          transactions: asArray<TransactionRecord>(data.transactions),
          refunds: asArray<RefundRecord>(data.refunds),
        },
        message: 'Billing records read from the billing service.',
      };
    } catch {
      return {
        state: 'error',
        snapshot: null,
        message: 'Billing records could not be read. Check your connection and try again.',
      };
    } finally {
      clearTimeout(timeout);
    }
  },
};
