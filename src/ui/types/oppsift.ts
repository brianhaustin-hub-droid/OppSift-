export type ThemePreference = 'light' | 'dark' | 'system';

export type OpportunityCategory =
  | 'Government Tender'
  | 'Public Procurement'
  | 'RFP'
  | 'Grant & Funding'
  | 'Commercial Contract';

export type OpportunityStatus = 'Open' | 'Closing Soon' | 'Amended' | 'Closed' | 'Awarded';

export type EligibilityStatus = 'Likely Eligible' | 'Review Required' | 'Unverified' | 'Potential Disqualifier';

export type PipelineStage =
  | 'Interested'
  | 'Evaluating'
  | 'Preparing'
  | 'Submitted'
  | 'Won'
  | 'Lost'
  | 'Archived';

export type PriorityLevel = 'High' | 'Medium' | 'Standard';

export type AuthScreenMode =
  | 'login'
  | 'register'
  | 'signup-unavailable'
  | 'forgot-password'
  | 'reset-password'
  | 'email-verification'
  | 'verification-code'
  | 'resend-verification'
  | 'already-signed-in'
  | 'auth-not-configured'
  | 'session-loading'
  | 'sign-in-required'
  | 'invitation-sign-in'
  | 'invitation-verification'
  | 'auth-error';

export type GlobalStateMode =
  | 'normal'
  | 'loading'
  | 'empty'
  | 'first-time'
  | 'source-unavailable'
  | 'network-error'
  | 'permission-denied'
  | 'session-expired'
  | 'expired-opportunity'
  | 'removed-opportunity'
  | 'incomplete-source'
  | 'invalid-filters';

export interface OpportunityDocument {
  id: string;
  name: string;
  format: string;
  size: string;
  updatedAt: string;
  isMandatory: boolean;
  category?: 'Specification' | 'Questionnaire' | 'Corrigendum' | 'Financial' | 'Compliance';
}

export interface OpportunityAmendment {
  id: string;
  date: string;
  summary: string;
  fieldChanged: string;
}

export interface OpportunityClarification {
  id: string;
  date: string;
  question: string;
  answer: string;
}

export interface RequirementCriterion {
  id: string;
  category: 'Mandatory' | 'Technical' | 'Financial' | 'Administrative' | 'Submission';
  requirementText: string;
  userEvidence: string;
  status: 'Satisfied' | 'Unsatisfied' | 'Unknown' | 'Potential Disqualifier';
  confidence: 'High' | 'Moderate' | 'Low';
  documentRef: string;
  explanation: string;
}

export interface EligibilityAssessment {
  status: EligibilityStatus;
  confidenceLabel: 'High Confidence' | 'Moderate Confidence' | 'Low Confidence';
  matchedCriteria: string[];
  potentialDisqualifiers: string[];
  missingInformation: string[];
  evidenceReferences: string[];
  explanation: string;
  disclaimer: string;
  criteriaMatrix: RequirementCriterion[];
  recommendedNextSteps: string[];
  riskObservations: {
    dimension: 'Deadline' | 'Eligibility' | 'Documentation' | 'Competition' | 'Completeness';
    severity: 'High' | 'Moderate' | 'Low';
    detail: string;
    isVerifiedFact: boolean;
  }[];
}

export interface Opportunity {
  id: string;
  referenceNumber: string;
  title: string;
  category: OpportunityCategory;
  issuingOrganisation: string;
  issuerProfile: {
    type: string;
    jurisdiction: string;
    portal: string;
    contactNote: string;
  };
  countryCode: string;
  countryName: string;
  region: string;
  location: string;
  sector: string;
  publicationDate: string;
  deadlineDate: string;
  deadlineTimezone: string;
  estimatedValue: number | null;
  currency: string;
  status: OpportunityStatus;
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  lastVerifiedAt: string;
  summary: string;
  description: string;
  requirements: string[];
  evaluationCriteria: { criterion: string; weight: string }[];
  keyObligations: string[];
  restrictions: string[];
  applicationInstructions: string;
  beneficiaryType?: string;
  contractDuration?: string;
  procurementMethod?: string;
  documents: OpportunityDocument[];
  amendments: OpportunityAmendment[];
  clarifications: OpportunityClarification[];
  verificationHistory: { timestamp: string; event: string; actor: string }[];
  eligibility: EligibilityAssessment;
  matchScore: number;
}

export interface CountryCoverage {
  code: string;
  name: string;
  region: string;
  currency: string;
  timezone: string;
  activeSourcesCount: number;
  categoriesSupported: OpportunityCategory[];
  coverageStatus: 'Active' | 'Partial' | 'Planned';
  lastUpdated: string;
  sampleRecordCount: number;
  topSectors: { sector: string; count: number }[];
  issuingInstitutions: string[];
}

export interface DataSourceRecord {
  id: string;
  name: string;
  countryCode: string;
  countryName: string;
  category: string;
  officialWebsite: string;
  accessMethod: 'Official API' | 'Structured Feed' | 'Open Contracting OCDS' | 'Portal Monitor';
  availability: 'Connected' | 'Scheduled' | 'Unavailable';
  syncFrequency: string;
  lastUpdated: string;
  attribution: string;
  verificationNotes: string;
  lastError?: string;
}

export interface PipelineTask {
  id: string;
  title: string;
  owner: string;
  dueDate: string;
  priority: PriorityLevel;
  completed: boolean;
}

export interface PipelineDocument {
  id: string;
  name: string;
  category: 'Compliance' | 'Technical Response' | 'Pricing' | 'Administrative';
  uploadedAt: string;
  status: 'Ready' | 'In Review' | 'Pending Upload';
}

export interface PipelineItem {
  id: string;
  opportunityId: string;
  stage: PipelineStage;
  priority: PriorityLevel;
  addedAt: string;
  notes: string;
  tasks: PipelineTask[];
  documents: PipelineDocument[];
  milestones: { id: string; label: string; targetDate: string; status: 'Done' | 'In Progress' | 'Upcoming' }[];
  activityLog: { id: string; timestamp: string; actor: string; summary: string }[];
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  countries: string[];
  categories: OpportunityCategory[];
  sectors: string[];
  lastChecked: string;
  matchingCount: number;
  emailAlerts: boolean;
  frequency: 'Immediate' | 'Daily Digest' | 'Weekly Digest';
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  filtersSummary: string;
  searchedAt: string;
  resultsCount: number;
}

export interface NotificationItem {
  id: string;
  type: 'Match' | 'Deadline' | 'Amendment' | 'Eligibility' | 'System';
  title: string;
  description: string;
  detailBody: string;
  timestamp: string;
  read: boolean;
  targetRoute?: string;
  opportunityRef?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  triggerType: 'Saved Search' | 'Deadline Reminder' | 'Amendment Watch' | 'Source Update';
  keywords: string;
  countries: string[];
  categories: OpportunityCategory[];
  sectors: string[];
  leadDays: number;
  channel: 'In-App & Email' | 'In-App Only' | 'Email Digest';
  frequency: 'Immediate' | 'Daily' | 'Weekly';
  status: 'Active' | 'Paused';
  lastTriggered: string;
  scopeDescription: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Analyst' | 'Viewer';
  status: 'Active' | 'Pending Invitation';
  country: string;
  lastActive: string;
  permissions: string[];
  assignedTasksCount: number;
  recentActivity: string[];
}

export interface IngestionJob {
  id: string;
  sourceId: string;
  sourceName: string;
  countryCode: string;
  startedAt: string;
  completedAt: string;
  duration: string;
  recordsCollected: number;
  recordsProcessed: number;
  status: 'Succeeded' | 'Partial' | 'Failed';
  errorDetail?: string;
  logs: string[];
}

export interface IntegrationItem {
  id: string;
  name: string;
  category: string;
  description: string;
  status: 'Connected' | 'Available' | 'Configuration Required';
  permissions: string[];
  lastSynced?: string;
}

export interface SavedAnalysisRecord {
  id: string;
  opportunityId: string;
  title: string;
  createdAt: string;
  eligibilityOutcome: EligibilityStatus;
  confidence: string;
  saved: boolean;
}

export interface SavedReportRecord {
  id: string;
  name: string;
  type: 'Country' | 'Sector' | 'Eligibility' | 'Pipeline';
  scope: string;
  generatedAt: string;
  format: 'CSV' | 'JSON' | 'Printable Brief';
}

export interface OnboardingProfile {
  accountType: 'Individual' | 'Business' | 'Organisation' | 'Consultant' | 'Other';
  fullName: string;
  organisationName: string;
  website: string;
  country: string;
  organisationDescription: string;
  industry: string;
  organisationSize: string;
  primaryCountry: string;
  countriesOfInterest: string[];
  regionsOfInterest: string[];
  internationalPreference: boolean;
  opportunityInterests: OpportunityCategory[];
  sectors: string[];
  servicesAndProducts: string;
  expertiseAndCertifications: string;
  minContractValue: string;
  maxContractValue: string;
  preferredCurrency: string;
  minLeadDays: string;
  preferredLanguage?: string;
  preferredTimezone?: string;
  preferredDateFormat?: 'YYYY-MM-DD' | 'DD MMM YYYY' | 'MM/DD/YYYY';
  notifyNewMatches: boolean;
  notifyDeadlines: boolean;
  notifyAmendments: boolean;
  notifyUpdates: boolean;
  completed: boolean;
  lastCompletedStep: number;
}

export interface ScreenCatalogItem {
  route: string;
  title: string;
  phase: string;
  status: 'Existing' | 'New Expansion';
  role: 'Public' | 'Authenticated' | 'Admin';
  description: string;
}

/* ---------------- Commercial Billing & Financial System Types ---------------- */

export type PlanTierId = 'free' | 'solo' | 'professional' | 'consultant' | 'team';
export type BillingFrequency = 'monthly' | 'annual';
export type SubscriptionStatus =
  | 'free'
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'payment_pending'
  | 'cancelled'
  | 'expired'
  | 'suspended';

export type CheckoutStateMode =
  | 'ready'
  | 'opening'
  | 'pending'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'verification_pending'
  | 'expired'
  | 'duplicate_prevented';

export interface PlanEntitlements {
  searchesMonthly: number | 'Custom';
  savedOpportunitiesLimit: number | 'Custom';
  aiAnalysesMonthly: number | 'Custom';
  documentAnalysesMonthly: number | 'Custom';
  activeAlertsLimit: number | 'Custom';
  monitoredSearchesLimit: number | 'Custom';
  teamSeatsLimit: number | 'Custom';
  reportsMonthly: number | 'Custom';
  workspacesLimit: number | 'Custom';
}

export interface PlanTierConfig {
  id: PlanTierId;
  name: string;
  audience: string;
  summary: string;
  monthlyPriceUsd: number | null;
  annualMonthlyPriceUsd: number | null;
  currency: string;
  customPricing: boolean;
  recommended?: boolean;
  available: boolean;
  providerProductId: string;
  providerMonthlyVariantId: string;
  providerAnnualVariantId: string;
  features: string[];
  entitlements: PlanEntitlements;
}

export interface WorkspaceSubscription {
  id: string;
  organisationName: string;
  billingEmail: string;
  billingAdministrator: string;
  planId: PlanTierId;
  pendingPlanId: PlanTierId | null;
  pendingChangeEffectiveDate: string | null;
  frequency: BillingFrequency;
  status: SubscriptionStatus;
  provider: 'Lemon Squeezy';
  providerSubscriptionRef: string | null;
  startDate: string;
  nextRenewalDate: string | null;
  accessEndDate: string | null;
  gracePeriodDays: number;
  failureReason: string | null;
  occupiedSeats: number;
  allocatedSeats: number;
}

export interface UsageMetricRecord {
  id: string;
  label: string;
  used: number;
  allowance: number | 'Custom';
  periodType: 'Monthly' | 'Workspace Capacity';
  resetDate: string | null;
  unit: string;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  issuedAt: string;
  description: string;
  amount: number;
  currency: string;
  status: 'Paid' | 'Pending' | 'Failed' | 'Refunded';
  providerReference: string;
  customerName: string;
  planName: string;
}

export interface TransactionRecord {
  id: string;
  transactionRef: string;
  customer: string;
  amount: number;
  currency: string;
  status: 'Succeeded' | 'Pending' | 'Failed' | 'Refunded';
  provider: 'Lemon Squeezy';
  transactionDate: string;
  subscriptionRef: string;
}

export interface PaymentMethodSummary {
  id: string;
  label: string;
  brand: string;
  last4: string | null;
  expiry: string | null;
  status: 'Active' | 'Verification Required' | 'Failed' | 'Not Configured';
  managedBy: 'Lemon Squeezy';
}

export interface CouponRecord {
  id: string;
  code: string;
  discountLabel: string;
  applicablePlans: PlanTierId[];
  redemptions: number;
  maxRedemptions: number | null;
  status: 'Active' | 'Paused' | 'Expired';
  providerCouponId: string;
}

export interface RefundRecord {
  id: string;
  refundRef: string;
  transactionRef: string;
  customer: string;
  amount: number;
  currency: string;
  reason: string;
  status: 'Refunded' | 'Under Review' | 'Disputed' | 'Declined';
  issuedAt: string;
}

/* ---------------- Operations, Security, Support & Audit Types ---------------- */

export interface SupportTicket {
  id: string;
  subject: string;
  category: 'Billing & Subscriptions' | 'Source Coverage' | 'Eligibility & AI' | 'Account & Security';
  status: 'Open' | 'In Review' | 'Awaiting Reply' | 'Resolved';
  createdAt: string;
  updatedAt: string;
  attachmentName?: string;
  messages: {
    id: string;
    sender: string;
    role: 'Customer' | 'Support';
    timestamp: string;
    body: string;
  }[];
}

export interface AuditLogEvent {
  id: string;
  scope: 'User' | 'Organisation' | 'Team' | 'Billing' | 'Admin';
  action: string;
  actor: string;
  target: string;
  timestamp: string;
  detail: string;
}

export interface SystemServiceStatus {
  id: string;
  name: string;
  description: string;
  state: 'Operational' | 'Degraded' | 'Unverified' | 'Maintenance';
  note: string;
  checkedAt: string;
}

export interface UserSessionRecord {
  id: string;
  device: string;
  location: string;
  authMethod: 'Neon Auth Password' | 'Google OAuth';
  lastActive: string;
  current: boolean;
}

/* ---------------- Cinematic Media & Visual Identity Types ---------------- */

export type CinematicPlaylistId =
  | 'global-cities'
  | 'international-trade'
  | 'infrastructure'
  | 'international-business'
  | 'procurement'
  | 'global-markets'
  | 'research-innovation'
  | 'energy-sustainability'
  | 'agriculture-development'
  | 'connectivity-emerging';

export interface CinematicPlaylistMeta {
  id: CinematicPlaylistId;
  label: string;
  description: string;
  intendedSurface: string;
}

export interface CinematicVideoAsset {
  id: string;
  playlistId: CinematicPlaylistId;
  title: string;
  provider: 'Wikimedia Commons' | 'NASA Image & Video Library';
  creator: string;
  sourcePageUrl: string;
  streamUrl: string;
  posterUrl: string;
  licenseName: string;
  licenseUrl: string;
  commercialVerified: boolean;
  embedVerified: boolean;
  attributionRequired: boolean;
  attributionText: string;
  intendedSection: string;
  aspectRatio: string;
  durationSeconds: number;
  width: number;
  height: number;
  status: 'Approved' | 'Fallback';
}


