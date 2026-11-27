# OppSift Billing Architecture & Handoff

This document describes the commercial subscription system added to the
OppSift frontend. It is an engineering/handoff document, not customer-facing
copy. The application deliberately separates **presentation**, **commercial
policy**, and **authoritative payment state** so that a Merchant of Record can
be replaced without rewriting billing screens.

## 1. Boundaries

| Layer | Location | Responsibility |
| --- | --- | --- |
| Presentation | `src/ui/components/billing/*`, `src/ui/pages/billing/*`, `src/ui/pages/admin/AdminBillingPages.tsx` | Pricing, checkout, subscription, usage, invoices, payment methods, refunds, seats, financial administration. Contains no provider secrets and no card fields. |
| Commercial catalogue | `src/ui/data/billingConfig.ts` | Plan names, audiences, prices, entitlements, currencies, grace period, annual policy, public provider product/variant identifiers. |
| Provider adapter | `src/ui/services/paymentAdapter.ts` | Only boundary allowed to start checkout, open the provider portal, change/cancel/reactivate a subscription, and read billing snapshots. Talks exclusively to the OppSift billing service. |
| Billing service (server) | **Not yet deployed** | Holds the Lemon Squeezy API key and webhook secret, creates checkout sessions, verifies webhook signatures, writes subscription/transaction/invoice records, enforces metering. |
| Identity | Existing Neon Managed Auth session (`src/app/auth`) | Authenticates the billing administrator. No second auth system is introduced. |
| Database | Existing Neon PostgreSQL | Billing tables must be added by server migration; this frontend reads only through the billing service. |

**No payment is simulated.** If the billing service is not configured or does
not answer, checkout returns a production-safe unavailable state and the UI
states that no payment has been taken. Subscription state never becomes
`active` because a browser action finished.

## 2. Configuration

Client-visible (public, no secrets):

| Variable | Purpose |
| --- | --- |
| `VITE_BILLING_API_URL` | Base URL of the OppSift billing service (for example `/api/app/billing`). When absent, checkout/portal operations return an unavailable state. |
| `VITE_LEMON_SQUEEZY_PRODUCT_FREE`, `..._SOLO`, `..._PROFESSIONAL`, `..._CONSULTANT`, `..._TEAM` | Provider product identifiers. Empty by default. |
| `VITE_LEMON_SQUEEZY_VARIANT_<PLAN>_MONTHLY` | Monthly variant identifier per plan. |
| `VITE_LEMON_SQUEEZY_VARIANT_<PLAN>_ANNUAL` | Annual variant identifier per plan. |
| `VITE_ANNUAL_DISCOUNT_PERCENT` | Optional approved annual discount. Absent/zero means no discount is advertised. |

Server-only (never bundled, never committed):

- `LEMON_SQUEEZY_API_KEY`
- `LEMON_SQUEEZY_STORE_ID`
- `LEMON_SQUEEZY_WEBHOOK_SECRET`
- Database connection string already used by the Neon backend.

## 3. Subscription lifecycle

```
free ──checkout──▶ payment_pending ──webhook: subscription_created──▶ active
active ──webhook: subscription_updated / payment_succeeded──▶ active
active ──webhook: payment_failed──▶ past_due ──grace period──▶ suspended
active ──cancellation confirmed──▶ cancelled ──period end──▶ expired ──▶ free
past_due ──payment recovered──▶ active
cancelled ──reactivation confirmed──▶ active
trialing is supported by the status model where the provider supplies it
```

Rules enforced by the UI:

- A workspace with no provider subscription is **Free**.
- `active` is only displayed after the billing service returns a confirmed
  subscription; the browser cannot activate a plan.
- Cancellation, plan changes and reactivation call the billing service. On
  failure the UI reports the failure and leaves the current subscription
  unchanged.
- Cancellation preserves workspace data and paid access until
  `accessEndDate` / period end.
- Payment failure shows a recovery banner with retry and update-method actions,
  the configured grace period (`BILLING_PROVIDER_CONFIG.gracePeriodDays`), and
  an explicit statement that workspace records are not deleted.
- Renewal dates and reset dates come from the subscription record, never from a
  hard-coded calendar.

## 4. Billing service API contract

All endpoints are same-origin, authenticated with the existing session cookie,
CSRF-checked for mutations, and return JSON. Only the service talks to Lemon
Squeezy.

### `GET /snapshot`

```json
{
  "subscription": {
    "id": "sub_...",
    "planId": "professional",
    "status": "active",
    "frequency": "monthly",
    "organisationName": "Example Ltd",
    "billingEmail": "billing@example.com",
    "billingAdministrator": "A. Person",
    "providerSubscriptionRef": "ls_sub_...",
    "startDate": "2026-11-01",
    "nextRenewalDate": "2026-12-01",
    "accessEndDate": null,
    "pendingPlanId": null,
    "pendingChangeEffectiveDate": null,
    "failureReason": null,
    "occupiedSeats": 4,
    "allocatedSeats": 5,
    "gracePeriodDays": 7
  },
  "paymentMethods": [],
  "invoices": [],
  "transactions": [],
  "refunds": []
}
```

Images/PDFs are never proxied: each invoice may carry `receiptUrl` pointing at
the provider-hosted document. Missing receipts render an em dash, not a fake
download.

### `POST /checkout`

Request: `{ planId, frequency, variantId, billingEmail, organisationName }`

Responses:

- `200 { checkoutUrl, sessionReference }` — the browser navigates to the
  provider-hosted checkout.
- `409` — a checkout is already open for this workspace (duplicate submission
  prevention).
- `410` — the checkout session expired.
- `401/403` — the session is not authorised.

The service must create the session with the configured variant ID for the
requested plan/frequency and attach the authenticated account and organisation
IDs to the provider metadata.

### `POST /portal`

Request: `{ subscriptionRef }` → `200 { url }`. The customer portal is the only
place payment methods are viewed, added or replaced.

### `POST /subscription/change-plan`

Request: `{ targetPlanId, frequency }` → `200 { effectivePolicy, message }`.
`effectivePolicy` is `immediate` for upgrades the provider applies now and
`next_period` for downgrades/period-end changes. **No proration is calculated in
the browser.**

### `POST /subscription/cancel`

Request: `{ subscriptionRef, reason }` → `200 { accessEndDate, message }`.
Cancellation is applied at period end unless the provider states otherwise.
The reason is optional and stored for product learning; no retention dark
patterns are used.

### `POST /subscription/reactivate`

Request: `{ subscriptionRef }` → `200 { message }`. Only available while the
provider still permits reactivation.

### Webhooks (server only)

Verify the Lemon Squeezy signature, reject replayed event IDs, and upsert by
provider subscription/order IDs. Required events include subscription created,
updated, cancelled, resumed, expired, payment succeeded, payment failed, refund
created, and dispute created/updated. Webhook processing is the sole writer of
subscription status, invoices, transactions and refunds.

## 5. Data model required on the server

- `billing_subscriptions` — one row per organisation; provider refs, plan,
  status, frequency, period dates, grace, failure reason, seat counts.
- `billing_transactions` — provider transaction ref, amount, currency, status,
  provider, date, subscription ref.
- `billing_invoices` — invoice number, issued date, description, amount,
  currency, status, provider reference, receipt URL, customer and plan name.
- `billing_refunds` — refund ref, transaction ref, amount, currency, reason,
  status, issued date.
- `billing_payment_methods` — provider token/brand/last4/expiry only; no PAN,
  CVV or full card data.
- `billing_plan_catalog` + `billing_plan_catalog_audit` — prices, entitlements,
  availability, provider IDs, actor, timestamp.
- `billing_usage_counters` — per organisation/per period counters for searches,
  AI analyses, document analyses, reports and alerts, so entitlements are
  enforced server-side rather than by the browser.

All tables are tenant-scoped and protected by the existing PostgreSQL RLS
model. Plan edits and refunds require a platform-administrator claim checked on
the server, not only in the UI.

## 6. Screens and coverage

| Route | Screen | State |
| --- | --- | --- |
| `/pricing` | Five-plan pricing, monthly/annual toggle, comparison matrix, FAQ, MoR transparency | Complete |
| `/checkout` | Standalone checkout with plan/frequency selection | Complete (provider-dependent) |
| `/settings/billing` | Subscription overview, entitlement summary, recovery banner, seats, payment summary | Complete |
| `/settings/usage` | Eight metered allowances with usage, remaining, reset and upgrade actions | Complete |
| `/settings/billing/history` | Invoice history with Paid/Pending/Failed/Refunded filters | Complete |
| `/settings/billing/change` | Plan comparison, frequency, effective timing, pending-change cancellation | Complete |
| `/settings/billing/cancel` | Consequence review, optional reason, keep-subscription action, confirmation | Complete |
| `/admin/billing` … `/admin/refunds` | Protected financial administration | Complete (empty states) |

Checkout states covered: ready, opening, pending, succeeded, failed, cancelled,
verification pending, expired, duplicate prevented, unavailable.

Subscription statuses covered: free, active, trialing, past due, payment
pending, cancelled, expired, suspended.

## 7. Deliberate limitations

1. **The billing service is not deployed in this repository.** Checkout,
   portal, plan changes, cancellation and billing snapshots therefore return
   honest unavailable/empty states until it exists. Nothing is faked.
2. Plan catalogue edits made in `/admin/plans` live in the current session
   only; they need the catalogue migration and write endpoint to persist.
3. Usage counters are derived from workspace actions. Server-side metering and
   enforcement are required before limits are commercially binding.
4. No proration, coupon creation, refund initiation or dunning schedule is
   calculated in the browser; these remain provider/commercial operations.
5. Team seat billing is presented for custom agreements; automated per-seat
   invoicing requires the seat metering above.
6. Refund documents/dispute evidence are provider-hosted; the UI links rather
   than duplicating them.
