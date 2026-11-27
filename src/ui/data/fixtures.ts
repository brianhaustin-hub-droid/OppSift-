import { OnboardingProfile, ScreenCatalogItem } from '../types/oppsift';

export function formatCurrencyValue(amount: number | null, currency: string, locale = 'en-GB'): string {
  if (amount === null || Number.isNaN(amount)) {
    return 'Value not disclosed';
  }
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export function formatDisplayDate(isoDate: string): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

export function getDaysRemaining(isoDate: string): number {
  const now = Date.now();
  const target = new Date(isoDate).getTime();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

/**
 * A new account starts with an unfilled profile. Identity fields are supplied
 * by the authenticated Neon session and the onboarding wizard; no
 * representative person or company is pre-populated.
 */
export const DEFAULT_ONBOARDING_PROFILE: OnboardingProfile = {
  accountType: 'Business',
  fullName: '',
  organisationName: '',
  website: '',
  country: '',
  organisationDescription: '',
  industry: '',
  organisationSize: '',
  primaryCountry: '',
  countriesOfInterest: [],
  regionsOfInterest: [],
  internationalPreference: true,
  opportunityInterests: [],
  sectors: [],
  servicesAndProducts: '',
  expertiseAndCertifications: '',
  minContractValue: '',
  maxContractValue: '',
  preferredCurrency: '',
  minLeadDays: '',
  notifyNewMatches: true,
  notifyDeadlines: true,
  notifyAmendments: true,
  notifyUpdates: false,
  completed: false,
  lastCompletedStep: 0,
};

export const SCREEN_CATALOG: ScreenCatalogItem[] = [
  // Phase 1: Brand Foundation
  { route: '/brand-system', title: 'Brand & Design System', phase: 'Phase 1 — Brand Foundation', status: 'Existing', role: 'Public', description: 'Logo variations, burgundy & intelligence palettes, typography, cards, and state primitives.' },

  // Phase 2: Public Website
  { route: '/', title: 'Homepage', phase: 'Phase 2 — Public Website', status: 'Existing', role: 'Public', description: 'International SaaS homepage with interactive feed overview, coverage & source transparency.' },
  { route: '/product', title: 'Product Capabilities', phase: 'Phase 2 — Public Website', status: 'Existing', role: 'Public', description: 'Discovery, matching, eligibility interpretation, monitoring, preparation & reporting.' },
  { route: '/opportunities', title: 'Opportunities Overview', phase: 'Phase 2 — Public Website', status: 'Existing', role: 'Public', description: 'Supported procurement, RFP, grant, and commercial opportunity categories.' },
  { route: '/markets', title: 'Global Markets', phase: 'Phase 2 — Public Website', status: 'Existing', role: 'Public', description: 'Supported countries, regions, currencies, and transparent coverage status.' },
  { route: '/sources', title: 'Data Sources', phase: 'Phase 2 — Public Website', status: 'Existing', role: 'Public', description: 'Official portal feeds, access methods, attribution, and availability.' },
  { route: '/solutions', title: 'Solutions by Role', phase: 'Phase 2 — Public Website', status: 'Existing', role: 'Public', description: 'Tailored workflows for businesses, consultants, NGOs, and researchers.' },
  { route: '/how-it-works', title: 'How It Works', phase: 'Phase 2 — Public Website', status: 'Existing', role: 'Public', description: 'Step-by-step discovery-to-submission intelligence workflow.' },
  { route: '/about', title: 'About OppSift', phase: 'Phase 2 — Public Website', status: 'Existing', role: 'Public', description: 'Mission, international neutrality, and source transparency principles.' },
  { route: '/contact', title: 'Contact & Inquiries', phase: 'Phase 2 — Public Website', status: 'Existing', role: 'Public', description: 'Validated enterprise contact form and confirmation state.' },
  { route: '/pricing', title: 'Commercial Pricing (5 Tiers)', phase: 'Phase 2 — Public Website', status: 'Existing', role: 'Public', description: 'Free ($0), Solo ($19), Professional ($49), Consultant ($99), and Team (Custom) with comparison matrix & MoR transparency.' },
  { route: '/status', title: 'System Status & Health', phase: 'Phase 2 — Public Website', status: 'New Expansion', role: 'Public', description: 'Service availability across Web App, Neon Auth, Search, Ingestion, Notifications, AI, and Payments.' },
  { route: '/getting-started', title: 'Getting Started Guide', phase: 'Phase 2 — Public Website', status: 'New Expansion', role: 'Public', description: 'Step-by-step onboarding and portal setup guide for new organisations.' },
  { route: '/docs', title: 'Documentation Hub', phase: 'Phase 2 — Public Website', status: 'New Expansion', role: 'Public', description: 'Technical documentation for search operators, OCDS mapping & eligibility rules.' },
  { route: '/security', title: 'Security & Data Provenance', phase: 'Phase 2 — Public Website', status: 'New Expansion', role: 'Public', description: 'Neon Managed Auth, encryption posture, and AI provenance boundaries.' },
  { route: '/legal/privacy', title: 'Privacy Policy', phase: 'Phase 2 — Public Website', status: 'New Expansion', role: 'Public', description: 'Data handling, GDPR rights, Lemon Squeezy disclosures & version history.' },
  { route: '/legal/terms', title: 'Terms of Service', phase: 'Phase 2 — Public Website', status: 'New Expansion', role: 'Public', description: 'Platform usage terms, billing cadence & official source disclaimer.' },
  { route: '/legal/cookies', title: 'Cookie & Consent Preferences', phase: 'Phase 2 — Public Website', status: 'New Expansion', role: 'Public', description: 'Manage essential session, interface, and diagnostic storage consent.' },
  { route: '/legal/dpa', title: 'Data Processing Agreement (DPA)', phase: 'Phase 2 — Public Website', status: 'New Expansion', role: 'Public', description: 'Sub-processor transparency, tenant isolation & erasure governance.' },

  // Phase 3 & 4: Auth & Onboarding
  { route: '/auth', title: 'Authentication Suite (15 States)', phase: 'Phase 3 — Authentication', status: 'Existing', role: 'Public', description: 'Login, Registration, Password Reset, Verification, Invitation & Error states.' },
  { route: '/onboarding', title: '10-Step Onboarding Wizard', phase: 'Phase 4 — Onboarding', status: 'Existing', role: 'Authenticated', description: 'Resumable wizard configuring account type, geography, sectors & capabilities.' },

  // Phase 5: Main Workspace & Discovery
  { route: '/dashboard', title: 'Intelligence Dashboard', phase: 'Phase 5 — Main Workspace', status: 'Existing', role: 'Authenticated', description: 'Reference-aligned dark/light dashboard with KPIs, overview chart, top countries, quick actions & activity feed.' },
  { route: '/discover', title: 'Opportunity Explorer', phase: 'Phase 5 — Main Workspace', status: 'Existing', role: 'Authenticated', description: 'Advanced keyword/phrase/value/date search, filters, quick actions & comparison tray.' },
  { route: '/discover/compare', title: 'Opportunity Comparison', phase: 'Phase 5 — Main Workspace', status: 'New Expansion', role: 'Authenticated', description: 'Side-by-side comparison matrix across requirements, eligibility, risks & value.' },
  { route: '/discover/government', title: 'Government Contracts', phase: 'Phase 5 — Main Workspace', status: 'Existing', role: 'Authenticated', description: 'Public procurement tenders, issuing agencies, reference numbers & statuses.' },
  { route: '/discover/grants', title: 'Grants & Funding', phase: 'Phase 5 — Main Workspace', status: 'Existing', role: 'Authenticated', description: 'Funding organisations, beneficiary types, amounts & eligibility.' },
  { route: '/discover/commercial', title: 'Commercial Opportunities', phase: 'Phase 5 — Main Workspace', status: 'Existing', role: 'Authenticated', description: 'Private-sector RFPs, enterprise contracts & estimated values.' },
  { route: '/discover/search', title: 'Search Results', phase: 'Phase 5 — Main Workspace', status: 'Existing', role: 'Authenticated', description: 'Query results, active filters, sorting, pagination & save search.' },
  { route: '/discover/country/GB', title: 'Country Profile & Discovery', phase: 'Phase 5 — Main Workspace', status: 'Existing', role: 'Authenticated', description: 'Jurisdiction profile, issuing institutions, sources, sectors & recent notices.' },
  { route: '/sources/src-uk-fts', title: 'Source Profile Detail', phase: 'Phase 5 — Main Workspace', status: 'New Expansion', role: 'Authenticated', description: 'Detailed ingestion source profile, access method, attribution & verification log.' },
  { route: '/opportunity/opp-uk-2026-0841', title: 'Opportunity Details & Dossier', phase: 'Phase 5 — Main Workspace', status: 'Existing', role: 'Authenticated', description: 'Full dossier with persistent action panel, evaluation criteria, clarifications & verification history.' },

  // Phase 6: Personal Workspace
  { route: '/saved', title: 'Saved Opportunities', phase: 'Phase 6 — Personal Workspace', status: 'Existing', role: 'Authenticated', description: 'Bookmarked notices with lifecycle actions and deadline sorting.' },
  { route: '/saved-searches', title: 'Saved Searches', phase: 'Phase 6 — Personal Workspace', status: 'Existing', role: 'Authenticated', description: 'Managed queries with alert frequency and match counts.' },
  { route: '/search-history', title: 'Search History', phase: 'Phase 6 — Personal Workspace', status: 'Existing', role: 'Authenticated', description: 'Chronological query log with instant repeat-search actions.' },
  { route: '/my-opportunities', title: 'My Opportunities Pipeline', phase: 'Phase 6 — Personal Workspace', status: 'Existing', role: 'Authenticated', description: '7-stage pipeline across Kanban, List, Card & Table views with priority & deadline filters.' },
  { route: '/my-opportunities/pipe-1', title: 'Opportunity Preparation', phase: 'Phase 6 — Personal Workspace', status: 'Existing', role: 'Authenticated', description: 'Checklist, task creation, document workspace, milestones, notes & activity log.' },

  // Phase 7: Deep AI Intelligence & Monitoring
  { route: '/intelligence', title: 'AI Intelligence Workspace', phase: 'Phase 7 — Intelligence & Monitoring', status: 'Existing', role: 'Authenticated', description: 'Full 8-module research workspace: Overview, Analysis, Eligibility Matrix, Extraction, Risks, Research Chat, Comparison & Printable Report.' },
  { route: '/alerts', title: 'Alerts & Monitoring', phase: 'Phase 7 — Intelligence & Monitoring', status: 'Existing', role: 'Authenticated', description: 'Monitoring dashboard with full multi-criteria alert rule configuration drawer.' },
  { route: '/notifications', title: 'Notifications Centre', phase: 'Phase 7 — Intelligence & Monitoring', status: 'Existing', role: 'Authenticated', description: 'Split notification list + detailed event inspection pane.' },
  { route: '/analytics', title: 'Global, Country & Sector Analytics', phase: 'Phase 7 — Intelligence & Monitoring', status: 'Existing', role: 'Authenticated', description: 'Multi-tab market, country, and sector intelligence visualisations.' },
  { route: '/reports', title: 'Reporting Studio', phase: 'Phase 7 — Intelligence & Monitoring', status: 'Existing', role: 'Authenticated', description: 'Interactive report builder with CSV/JSON/Print export & report history.' },

  // Phase 8: Organisations & Account Security
  { route: '/teams', title: 'Organisations, Members & Settings', phase: 'Phase 8 — Organisations & Account', status: 'Existing', role: 'Authenticated', description: 'Member directory with profile drawer, roles, invitations, capabilities & shared workspaces.' },
  { route: '/accept-invitation', title: 'Accept Invitation', phase: 'Phase 8 — Organisations & Account', status: 'Existing', role: 'Authenticated', description: 'Invitation acceptance flow with pending, accepted, declined & expired states.' },
  { route: '/settings', title: 'Account & Profile Settings', phase: 'Phase 8 — Organisations & Account', status: 'Existing', role: 'Authenticated', description: 'Profile completeness, Appearance, Notifications, Security & Account Lifecycle.' },
  { route: '/settings/security', title: 'Account Security Console', phase: 'Phase 8 — Organisations & Account', status: 'New Expansion', role: 'Authenticated', description: 'Active sessions, secondary session sign-out, Neon Auth recovery, JSON data export & account deletion.' },
  { route: '/settings/preferences', title: 'Global Localization Preferences', phase: 'Phase 8 — Organisations & Account', status: 'New Expansion', role: 'Authenticated', description: 'Language, operating country, currency, timezone, date format & digest controls.' },
  { route: '/settings/activity', title: 'Workspace Activity & Audit History', phase: 'Phase 8 — Organisations & Account', status: 'New Expansion', role: 'Authenticated', description: 'Scoped activity trail across User, Organisation, Team & Billing events.' },

  // Phase 9: Operations & Financial Administration
  { route: '/admin', title: 'Admin Platform Overview', phase: 'Phase 9 — Administration', status: 'Existing', role: 'Admin', description: 'Protected operations console for source health, ingestion & quality.' },
  { route: '/admin/sources', title: 'Source Registry & Management', phase: 'Phase 9 — Administration', status: 'Existing', role: 'Admin', description: 'Source configuration, sync frequency, history & retry triggers.' },
  { route: '/admin/coverage', title: 'Country Coverage Management', phase: 'Phase 9 — Administration', status: 'Existing', role: 'Admin', description: 'Jurisdiction-level category availability and data freshness.' },
  { route: '/admin/ingestion', title: 'Ingestion Job Details & Logs', phase: 'Phase 9 — Administration', status: 'Existing', role: 'Admin', description: 'Detailed job logs, collected/processed counts, error traces & authorised retry.' },
  { route: '/admin/quality', title: 'Data Quality Review Queue', phase: 'Phase 9 — Administration', status: 'Existing', role: 'Admin', description: 'Duplicate records, missing fields, validation status & attribution checks.' },
  { route: '/admin/audit', title: 'Platform Audit Log', phase: 'Phase 9 — Administration', status: 'New Expansion', role: 'Admin', description: 'Protected administrative and billing event audit trail.' },
  { route: '/admin/billing', title: 'Financial Operations Overview', phase: 'Phase 9 — Financial Admin', status: 'New Expansion', role: 'Admin', description: 'Protected Merchant of Record billing overview & lifecycle status controls.' },
  { route: '/admin/subscriptions', title: 'Admin Subscription Directory', phase: 'Phase 9 — Financial Admin', status: 'New Expansion', role: 'Admin', description: 'Inspect workspace subscription states, grace periods & seat counts.' },
  { route: '/admin/transactions', title: 'Admin Transactions Ledger', phase: 'Phase 9 — Financial Admin', status: 'New Expansion', role: 'Admin', description: 'Lemon Squeezy transaction verification and webhook sync log.' },
  { route: '/admin/invoices', title: 'Admin Invoice Registry', phase: 'Phase 9 — Financial Admin', status: 'New Expansion', role: 'Admin', description: 'Authoritative tax invoices issued via Merchant of Record.' },
  { route: '/admin/plans', title: 'Plan Pricing & Entitlement Editor', phase: 'Phase 9 — Financial Admin', status: 'New Expansion', role: 'Admin', description: 'Editable and audited plan tier pricing, search/AI quotas, and provider variant IDs.' },
  { route: '/admin/coupons', title: 'Promotions & Coupons Registry', phase: 'Phase 9 — Financial Admin', status: 'New Expansion', role: 'Admin', description: 'Configurable discount codes and redemption tracking.' },
  { route: '/admin/refunds', title: 'Refunds & Disputes Review', phase: 'Phase 9 — Financial Admin', status: 'New Expansion', role: 'Admin', description: 'Refund eligibility review queue and Merchant of Record dispute tracking.' },

  // Phase 10: Commercial Billing, Support & User Journeys
  { route: '/integrations', title: 'Integrations', phase: 'Phase 10 — Commercial & Support', status: 'Existing', role: 'Authenticated', description: 'Connected authentication, SMTP, calendar feeds & webhooks.' },
  { route: '/checkout', title: 'Lemon Squeezy Checkout Flow', phase: 'Phase 10 — Commercial & Support', status: 'New Expansion', role: 'Authenticated', description: '9-state MoR checkout flow with order summary, terms acceptance & webhook confirmation boundary.' },
  { route: '/settings/billing', title: 'Subscription & Billing Settings', phase: 'Phase 10 — Commercial & Support', status: 'New Expansion', role: 'Authenticated', description: 'Active plan, renewal lifecycle, payment recovery, seat overview & Lemon Squeezy portal handoff.' },
  { route: '/settings/usage', title: 'Entitlements & Usage Quotas', phase: 'Phase 10 — Commercial & Support', status: 'New Expansion', role: 'Authenticated', description: '8-metric monthly & workspace usage meters against active plan limits.' },
  { route: '/settings/billing/history', title: 'Invoices & Billing History', phase: 'Phase 10 — Commercial & Support', status: 'New Expansion', role: 'Authenticated', description: 'Downloadable Merchant of Record receipts & payment transaction status.' },
  { route: '/settings/billing/change', title: 'Upgrade or Downgrade Plan', phase: 'Phase 10 — Commercial & Support', status: 'New Expansion', role: 'Authenticated', description: 'Interactive tier comparison & billing cadence transition request.' },
  { route: '/settings/billing/cancel', title: 'Cancel Subscription Flow', phase: 'Phase 10 — Commercial & Support', status: 'New Expansion', role: 'Authenticated', description: 'Reason capture, retention clarity & access-end period confirmation.' },
  { route: '/support', title: 'Support Ticket Console', phase: 'Phase 10 — Commercial & Support', status: 'New Expansion', role: 'Authenticated', description: 'Submit support requests with attachment handling, reply threads & ticket resolution.' },
  { route: '/journeys', title: 'User Journeys & Edge States Hub', phase: 'Phase 10 — Commercial & Support', status: 'New Expansion', role: 'Authenticated', description: 'Interactive hub covering first login, recovery, expired notices, billing grace & upgrade journeys.' },
  { route: '/first-time', title: 'First-Time User Experience (FTUE)', phase: 'Phase 10 — Commercial & Support', status: 'New Expansion', role: 'Authenticated', description: 'Clean zero-data states for empty dashboard, searches, saved items, alerts & analyses.' },
];
