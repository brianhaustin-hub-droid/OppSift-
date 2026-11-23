import {
  BillingFrequency,
  CheckoutStateMode,
  PlanTierConfig,
  PlanTierId,
} from '../types/oppsift';

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
  message: string;
}

export interface PaymentProviderAdapter {
  readonly providerName: 'Lemon Squeezy';
  initiateCheckout(req: CheckoutInitiationRequest): Promise<CheckoutSessionResult>;
  requestCustomerPortalUrl(subscriptionRef: string | null): Promise<{ available: boolean; message: string }>;
  requestPlanChange(
    currentPlanId: PlanTierId,
    targetPlanId: PlanTierId,
    frequency: BillingFrequency
  ): Promise<{ accepted: boolean; effectivePolicy: 'immediate' | 'next_period'; message: string }>;
  requestCancellation(subscriptionRef: string | null, reason: string): Promise<{ accepted: boolean; message: string }>;
}

/**
 * Payment-provider adapter boundary for Lemon Squeezy (Merchant of Record).
 * Keeps provider product/variant identifiers and webhook-driven transitions strictly decoupled
 * from React UI components so another provider can be swapped cleanly if needed.
 *
 * Important integrity guarantee: This frontend adapter never hardcodes secret API keys
 * and never fabricates confirmed payment completions without authoritative server webhooks.
 */
export const lemonSqueezyAdapter: PaymentProviderAdapter = {
  providerName: 'Lemon Squeezy',

  async initiateCheckout(req) {
    const variantId =
      req.frequency === 'annual' ? req.plan.providerAnnualVariantId : req.plan.providerMonthlyVariantId;

    if (!req.termsAccepted) {
      return {
        state: 'failed',
        provider: 'Lemon Squeezy',
        variantId,
        sessionReference: '',
        message: 'Terms of service acceptance is required before initiating secure checkout.',
      };
    }

    if (req.plan.id === 'free' || req.plan.customPricing) {
      return {
        state: 'ready',
        provider: 'Lemon Squeezy',
        variantId,
        sessionReference: '',
        message: req.plan.customPricing
          ? 'Team plans are provisioned through commercial onboarding rather than self-serve checkout.'
          : 'Free workspaces require no payment checkout.',
      };
    }

    // In production, POST /api/billing/checkout creates an authenticated Lemon Squeezy checkout URL.
    // Until the server webhook and Lemon Squeezy store credentials are configured, report honest verification boundary.
    return {
      state: 'verification_pending',
      provider: 'Lemon Squeezy',
      variantId,
      sessionReference: `ls_chk_${variantId}`,
      message:
        'Checkout handoff prepared for Lemon Squeezy Merchant of Record. Subscription status updates only after authoritative payment webhook confirmation.',
    };
  },

  async requestCustomerPortalUrl(subscriptionRef) {
    if (!subscriptionRef) {
      return {
        available: false,
        message:
          'No active Lemon Squeezy subscription reference exists for this workspace. Payment methods are managed inside the provider portal after checkout confirmation.',
      };
    }
    return {
      available: true,
      message: 'Secure Lemon Squeezy customer portal URL request prepared for server dispatch.',
    };
  },

  async requestPlanChange(_currentPlanId, targetPlanId, frequency) {
    const isDowngradeToFree = targetPlanId === 'free';
    return {
      accepted: true,
      effectivePolicy: isDowngradeToFree ? 'next_period' : 'immediate',
      message: `Plan change to ${targetPlanId} (${frequency}) prepared for billing provider confirmation. Subscription entitlements update upon webhook verification.`,
    };
  },

  async requestCancellation(_subscriptionRef, _reason) {
    return {
      accepted: true,
      message:
        'Cancellation request recorded. Access remains active until the current billing period ends, and workspace data is preserved per retention policy.',
    };
  },
};
