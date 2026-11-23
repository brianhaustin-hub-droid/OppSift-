import {
  AlertRule,
  IngestionJob,
  IntegrationItem,
  NotificationItem,
  OnboardingProfile,
  PipelineItem,
  SavedAnalysisRecord,
  SavedReportRecord,
  SavedSearch,
  ScreenCatalogItem,
  SearchHistoryItem,
  TeamMember,
} from '../types/oppsift';

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
  const now = new Date('2026-11-19T09:00:00Z').getTime();
  const target = new Date(isoDate).getTime();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

export const INITIAL_PIPELINE: PipelineItem[] = [
  {
    id: 'pipe-1',
    opportunityId: 'opp-uk-2026-0841',
    stage: 'Preparing',
    priority: 'High',
    addedAt: '2026-11-08',
    notes: 'Confirming Cyber Essentials Plus renewal certificate with security lead before final SQ upload.',
    tasks: [
      { id: 't-1', title: 'Download and map Selection Questionnaire sections', owner: 'E. Vance', dueDate: '2026-11-22', priority: 'High', completed: true },
      { id: 't-2', title: 'Attach audited financial statements (FY24–FY25)', owner: 'M. Lindqvist', dueDate: '2026-11-26', priority: 'High', completed: true },
      { id: 't-3', title: 'Verify Cyber Essentials Plus certificate ID', owner: 'E. Vance', dueDate: '2026-11-29', priority: 'High', completed: false },
      { id: 't-4', title: 'Draft HL7 FHIR R4 architecture case study', owner: 'R. Patel', dueDate: '2026-12-05', priority: 'Medium', completed: false },
    ],
    documents: [
      { id: 'pd-1', name: 'Meridian-ISO27001-Certificate-2026.pdf', category: 'Compliance', uploadedAt: '2026-11-10', status: 'Ready' },
      { id: 'pd-2', name: 'NHS-SQ-Draft-Response-v2.docx', category: 'Technical Response', uploadedAt: '2026-11-17', status: 'In Review' },
      { id: 'pd-3', name: 'Cyber-Essentials-Plus-Attestation.pdf', category: 'Compliance', uploadedAt: 'Pending', status: 'Pending Upload' },
    ],
    milestones: [
      { id: 'm-1', label: 'Clarification Questions Deadline', targetDate: '2026-11-28', status: 'In Progress' },
      { id: 'm-2', label: 'Internal Red-Team Review', targetDate: '2026-12-08', status: 'Upcoming' },
      { id: 'm-3', label: 'Portal Submission (Atamis)', targetDate: '2026-12-12', status: 'Upcoming' },
    ],
    activityLog: [
      { id: 'act-1', timestamp: '2026-11-17 15:20 UTC', actor: 'E. Vance', summary: 'Moved stage from Evaluating to Preparing' },
      { id: 'act-2', timestamp: '2026-11-12 09:40 UTC', actor: 'M. Lindqvist', summary: 'Completed audited financial statements task' },
      { id: 'act-3', timestamp: '2026-11-08 11:05 UTC', actor: 'E. Vance', summary: 'Added opportunity to pipeline' },
    ],
  },
  {
    id: 'pipe-2',
    opportunityId: 'opp-sg-2026-1190',
    stage: 'Evaluating',
    priority: 'High',
    addedAt: '2026-11-12',
    notes: 'Registered for mandatory virtual technical briefing on 27 Nov. Evaluating GCC 2.0 compliance effort.',
    tasks: [
      { id: 't-5', title: 'Review Corrigendum 01 schedule changes', owner: 'K. Tan', dueDate: '2026-11-20', priority: 'High', completed: true },
      { id: 't-6', title: 'Confirm GCC 2.0 hosting partner quote', owner: 'K. Tan', dueDate: '2026-11-25', priority: 'Medium', completed: false },
    ],
    documents: [
      { id: 'pd-4', name: 'PUB-Briefing-Registration-Confirmation.pdf', category: 'Administrative', uploadedAt: '2026-11-16', status: 'Ready' },
    ],
    milestones: [
      { id: 'm-4', label: 'Mandatory Technical Briefing', targetDate: '2026-11-27', status: 'Upcoming' },
      { id: 'm-5', label: 'Go / No-Go Decision Gate', targetDate: '2026-12-03', status: 'Upcoming' },
    ],
    activityLog: [
      { id: 'act-4', timestamp: '2026-11-16 08:15 UTC', actor: 'K. Tan', summary: 'Logged Corrigendum 01 schedule extension' },
    ],
  },
  {
    id: 'pipe-3',
    opportunityId: 'opp-eu-2026-4419',
    stage: 'Interested',
    priority: 'Medium',
    addedAt: '2026-11-15',
    notes: 'Exploring consortium partnership with Fraunhofer and TU Delft energy teams.',
    tasks: [
      { id: 't-7', title: 'Send consortium LOI draft to EU partners', owner: 'M. Lindqvist', dueDate: '2026-11-23', priority: 'High', completed: false },
    ],
    documents: [],
    milestones: [
      { id: 'm-6', label: 'Consortium Sign-off', targetDate: '2026-11-26', status: 'Upcoming' },
      { id: 'm-7', label: 'EU Portal Deadline', targetDate: '2026-12-04', status: 'Upcoming' },
    ],
    activityLog: [
      { id: 'act-5', timestamp: '2026-11-15 10:00 UTC', actor: 'M. Lindqvist', summary: 'Added Horizon grant to Interested stage' },
    ],
  },
  {
    id: 'pipe-4',
    opportunityId: 'opp-com-2026-2240',
    stage: 'Submitted',
    priority: 'Standard',
    addedAt: '2026-11-16',
    notes: 'Initial expression of interest and NDA executed; awaiting shortlist workshop.',
    tasks: [
      { id: 't-8', title: 'Execute supplier NDA', owner: 'E. Vance', dueDate: '2026-11-17', priority: 'Medium', completed: true },
    ],
    documents: [
      { id: 'pd-5', name: 'Nordic-Maritime-Mutual-NDA-Signed.pdf', category: 'Administrative', uploadedAt: '2026-11-17', status: 'Ready' },
    ],
    milestones: [
      { id: 'm-8', label: 'Shortlist Notification Expected', targetDate: '2026-12-10', status: 'Upcoming' },
    ],
    activityLog: [
      { id: 'act-6', timestamp: '2026-11-17 16:45 UTC', actor: 'E. Vance', summary: 'Submitted NDA & expression of interest' },
    ],
  },
];

export const INITIAL_SAVED_SEARCHES: SavedSearch[] = [
  {
    id: 'ss-1',
    name: 'EU & UK Health Cloud Frameworks',
    query: 'interoperability OR FHIR OR cloud governance',
    countries: ['GB', 'EU', 'DE'],
    categories: ['Government Tender', 'Public Procurement'],
    sectors: ['Healthcare & Life Sciences', 'Enterprise Software & Cyber'],
    lastChecked: '2026-11-19T07:45:00Z',
    matchingCount: 14,
    emailAlerts: true,
    frequency: 'Daily Digest',
  },
  {
    id: 'ss-2',
    name: 'APAC Environmental & Water Telemetry',
    query: 'telemetry OR flood OR environmental registry',
    countries: ['SG', 'AU'],
    categories: ['RFP', 'Commercial Contract'],
    sectors: ['Water & Environmental Systems', 'Climate & Clean Technology'],
    lastChecked: '2026-11-19T08:10:00Z',
    matchingCount: 7,
    emailAlerts: true,
    frequency: 'Immediate',
  },
  {
    id: 'ss-3',
    name: 'Clean Grid & Decarbonisation Grants',
    query: 'grid resilience OR forecasting grant',
    countries: ['EU', 'CA', 'US'],
    categories: ['Grant & Funding'],
    sectors: ['Energy Grid & Decarbonisation', 'Climate & Clean Technology'],
    lastChecked: '2026-11-18T18:30:00Z',
    matchingCount: 9,
    emailAlerts: false,
    frequency: 'Weekly Digest',
  },
];

export const INITIAL_SEARCH_HISTORY: SearchHistoryItem[] = [
  { id: 'sh-1', query: 'HL7 FHIR interoperability', filtersSummary: 'UK, EU · Government Tender', searchedAt: '2026-11-19 08:14 UTC', resultsCount: 4 },
  { id: 'sh-2', query: 'zero trust identity', filtersSummary: 'US · Public Procurement', searchedAt: '2026-11-18 16:40 UTC', resultsCount: 6 },
  { id: 'sh-3', query: 'stormwater telemetry', filtersSummary: 'Singapore · RFP', searchedAt: '2026-11-18 11:22 UTC', resultsCount: 2 },
  { id: 'sh-4', query: 'eForms procurement portal', filtersSummary: 'Germany · All Categories', searchedAt: '2026-11-17 14:05 UTC', resultsCount: 3 },
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'not-1',
    type: 'Amendment',
    title: 'Amendment published on GeBIZ-MND-2026-1190',
    description: 'PUB Singapore issued Corrigendum 01 extending the deadline by 7 days and updating briefing registration.',
    detailBody:
      'Corrigendum 01 was detected during the 08:10 UTC GeBIZ monitor cycle. Submission deadline moved from 08 Jan 2027 to 15 Jan 2027 at 16:00 SGT, and virtual technical briefing registration instructions were updated in §1.3.',
    timestamp: '42 mins ago',
    read: false,
    targetRoute: '/opportunity/opp-sg-2026-1190',
    opportunityRef: 'GEBIZ-MND-2026-1190',
  },
  {
    id: 'not-2',
    type: 'Deadline',
    title: 'Horizon Europe grant closes in 15 days',
    description: 'TED-2026-S218-441902 requires 3-country consortium confirmation ahead of 04 Dec 2026.',
    detailBody:
      'Triggered by your 14-Day Pipeline Deadline Escalation rule. Your tracked Horizon Europe notice has an uncompleted consortium LOI task due 23 Nov 2026.',
    timestamp: '3 hours ago',
    read: false,
    targetRoute: '/opportunity/opp-eu-2026-4419',
    opportunityRef: 'TED-2026-S218-441902',
  },
  {
    id: 'not-3',
    type: 'Match',
    title: 'New high-alignment tender in United Kingdom',
    description: 'UK-CCS-2026-0841 matched your saved search "EU & UK Health Cloud Frameworks".',
    detailBody:
      'NHS England published a GBP 4.85M interoperability framework matching ISO 27001 and HL7 FHIR capability tags in your organisation profile.',
    timestamp: 'Yesterday, 17:20',
    read: false,
    targetRoute: '/opportunity/opp-uk-2026-0841',
    opportunityRef: 'UK-CCS-2026-0841',
  },
  {
    id: 'not-4',
    type: 'Eligibility',
    title: 'Missing accreditation noted for NHS framework',
    description: 'Cyber Essentials Plus expiry date is missing from your organisation capability record.',
    detailBody:
      'During eligibility comparison against UK-CCS-2026-0841 §6.2, no Cyber Essentials Plus certificate date was found in your workspace profile.',
    timestamp: '17 Nov 2026',
    read: true,
    targetRoute: '/settings',
    opportunityRef: 'UK-CCS-2026-0841',
  },
];

export const INITIAL_ALERT_RULES: AlertRule[] = [
  {
    id: 'al-1',
    name: 'EU & UK Health Cloud Frameworks',
    triggerType: 'Saved Search',
    keywords: 'interoperability OR FHIR OR cloud governance',
    countries: ['GB', 'DE', 'EU'],
    categories: ['Government Tender', 'Public Procurement'],
    sectors: ['Healthcare & Life Sciences'],
    leadDays: 21,
    channel: 'In-App & Email',
    frequency: 'Daily',
    status: 'Active',
    lastTriggered: '2026-11-19 07:45 UTC',
    scopeDescription: 'Notifies when new open notices match health interoperability or cloud governance in GB, DE, EU.',
  },
  {
    id: 'al-2',
    name: '14-Day Pipeline Deadline Escalation',
    triggerType: 'Deadline Reminder',
    keywords: 'Pipeline active stages',
    countries: ['GB', 'SG', 'EU', 'DE'],
    categories: ['Government Tender', 'RFP', 'Grant & Funding'],
    sectors: ['All'],
    leadDays: 14,
    channel: 'In-App & Email',
    frequency: 'Immediate',
    status: 'Active',
    lastTriggered: '2026-11-19 06:00 UTC',
    scopeDescription: 'Triggers at 14, 7, and 2 days prior to closing for opportunities in Evaluating or Preparing stages.',
  },
  {
    id: 'al-3',
    name: 'Corrigendum & Amendment Watch',
    triggerType: 'Amendment Watch',
    keywords: 'Saved & Tracked opportunities',
    countries: ['SG', 'GB', 'EU'],
    categories: ['RFP', 'Government Tender'],
    sectors: ['All'],
    leadDays: 30,
    channel: 'In-App Only',
    frequency: 'Immediate',
    status: 'Active',
    lastTriggered: '2026-11-16 11:30 UTC',
    scopeDescription: 'Monitors saved and pipeline opportunities for specification updates or deadline shifts.',
  },
  {
    id: 'al-4',
    name: 'East Africa OCDS Feed Recovery',
    triggerType: 'Source Update',
    keywords: 'PPIP status transition',
    countries: ['KE'],
    categories: ['Public Procurement'],
    sectors: ['All'],
    leadDays: 0,
    channel: 'Email Digest',
    frequency: 'Daily',
    status: 'Paused',
    lastTriggered: '2026-11-18 19:15 UTC',
    scopeDescription: 'Alerts operations team when PPIP Kenya feed transitions from Unavailable to Connected.',
  },
];

export const INITIAL_TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'tm-1',
    name: 'Elena Vance',
    email: 'e.vance@meridian-advisory.org',
    role: 'Owner',
    status: 'Active',
    country: 'United Kingdom',
    lastActive: 'Online now',
    permissions: ['Billing & Subscription', 'Team & Role Management', 'Pipeline Write', 'AI Intelligence', 'Report Exports'],
    assignedTasksCount: 2,
    recentActivity: ['Moved UK-CCS-2026-0841 to Preparing', 'Executed NDA for EXT-MAERSK-2026-2240'],
  },
  {
    id: 'tm-2',
    name: 'Marcus Lindqvist',
    email: 'm.lindqvist@meridian-advisory.org',
    role: 'Admin',
    status: 'Active',
    country: 'Germany',
    lastActive: '18 mins ago',
    permissions: ['Team Invitations', 'Pipeline Write', 'AI Intelligence', 'Report Exports'],
    assignedTasksCount: 2,
    recentActivity: ['Uploaded FY24–FY25 financial statements', 'Initiated Horizon Europe consortium outreach'],
  },
  {
    id: 'tm-3',
    name: 'Kenji Tan',
    email: 'k.tan@meridian-advisory.org',
    role: 'Analyst',
    status: 'Active',
    country: 'Singapore',
    lastActive: '2 hours ago',
    permissions: ['Discovery & Saved Searches', 'Pipeline Write', 'AI Intelligence'],
    assignedTasksCount: 2,
    recentActivity: ['Reviewed GeBIZ Corrigendum 01', 'Logged PUB briefing registration'],
  },
  {
    id: 'tm-4',
    name: 'Riya Patel',
    email: 'r.patel@meridian-advisory.org',
    role: 'Analyst',
    status: 'Active',
    country: 'Canada',
    lastActive: 'Yesterday',
    permissions: ['Discovery & Saved Searches', 'Pipeline Write', 'AI Intelligence'],
    assignedTasksCount: 1,
    recentActivity: ['Drafting HL7 FHIR case study'],
  },
  {
    id: 'tm-5',
    name: 'Henrik Solberg',
    email: 'h.solberg@nordic-partners.eu',
    role: 'Viewer',
    status: 'Pending Invitation',
    country: 'Norway',
    lastActive: 'Invited 17 Nov 2026',
    permissions: ['Read-only Opportunity Collections', 'Read-only Reports'],
    assignedTasksCount: 0,
    recentActivity: ['Invitation email dispatched; awaiting acceptance'],
  },
];

export const INITIAL_INGESTION_JOBS: IngestionJob[] = [
  {
    id: 'job-9482',
    sourceId: 'src-us-sam',
    sourceName: 'SAM.gov Contract Opportunities',
    countryCode: 'US',
    startedAt: '2026-11-19 08:20:00 UTC',
    completedAt: '2026-11-19 08:20:42 UTC',
    duration: '42s',
    recordsCollected: 192,
    recordsProcessed: 184,
    status: 'Succeeded',
    logs: [
      '[08:20:01] Connected to SAM.gov v2 Opportunities API',
      '[08:20:28] Fetched 192 delta notices; 8 duplicates skipped by canonical ID',
      '[08:20:42] Indexed 184 records cleanly',
    ],
  },
  {
    id: 'job-9481',
    sourceId: 'src-sg-gebiz',
    sourceName: 'GeBIZ Singapore Procurement Portal',
    countryCode: 'SG',
    startedAt: '2026-11-19 08:05:00 UTC',
    completedAt: '2026-11-19 08:05:28 UTC',
    duration: '28s',
    recordsCollected: 47,
    recordsProcessed: 47,
    status: 'Succeeded',
    logs: [
      '[08:05:02] Polled GeBIZ public tender feed',
      '[08:05:21] Detected 1 corrigendum update (GEBIZ-MND-2026-1190)',
      '[08:05:28] Completed with 0 errors',
    ],
  },
  {
    id: 'job-9480',
    sourceId: 'src-uk-fts',
    sourceName: 'UK Find a Tender Service (FTS)',
    countryCode: 'GB',
    startedAt: '2026-11-19 07:40:00 UTC',
    completedAt: '2026-11-19 07:40:54 UTC',
    duration: '54s',
    recordsCollected: 115,
    recordsProcessed: 112,
    status: 'Succeeded',
    logs: [
      '[07:40:04] Retrieved OCDS release cursor',
      '[07:40:54] Normalised 112 notices in GBP',
    ],
  },
  {
    id: 'job-9479',
    sourceId: 'src-eu-ted',
    sourceName: 'TED — Tenders Electronic Daily',
    countryCode: 'EU',
    startedAt: '2026-11-19 07:15:00 UTC',
    completedAt: '2026-11-19 07:16:18 UTC',
    duration: '1m 18s',
    recordsCollected: 270,
    recordsProcessed: 263,
    status: 'Succeeded',
    logs: [
      '[07:15:02] Queried TED eForms Search API',
      '[07:16:18] Processed 263 cross-border notices',
    ],
  },
  {
    id: 'job-9478',
    sourceId: 'src-ke-ppip',
    sourceName: 'Public Procurement Information Portal (PPIP)',
    countryCode: 'KE',
    startedAt: '2026-11-18 19:12:00 UTC',
    completedAt: '2026-11-18 19:12:31 UTC',
    duration: '31s',
    recordsCollected: 0,
    recordsProcessed: 0,
    status: 'Failed',
    errorDetail: 'Upstream TLS handshake timeout (ETIMEDOUT) after 3 retries.',
    logs: [
      '[19:12:00] Initiating OCDS sync for tenders.go.ke',
      '[19:12:10] Retry 1/3 failed: ETIMEDOUT',
      '[19:12:20] Retry 2/3 failed: ETIMEDOUT',
      '[19:12:31] Job marked Failed; prior verified records preserved',
    ],
  },
  {
    id: 'job-9477',
    sourceId: 'src-de-bund',
    sourceName: 'evergabe-online.de Federal Portal',
    countryCode: 'DE',
    startedAt: '2026-11-19 06:25:00 UTC',
    completedAt: '2026-11-19 06:25:39 UTC',
    duration: '39s',
    recordsCollected: 68,
    recordsProcessed: 68,
    status: 'Partial',
    errorDetail: '2 attachment PDFs returned HTTP 403; metadata indexed.',
    logs: [
      '[06:25:01] Fetched 68 federal notices',
      '[06:25:32] Warning: 2 protected documents skipped (HTTP 403)',
      '[06:25:39] Notice metadata stored with source URL fallback',
    ],
  },
];

export const INITIAL_INTEGRATIONS: IntegrationItem[] = [
  {
    id: 'int-google-oauth',
    name: 'Google OAuth (Neon Managed Auth)',
    category: 'Identity & Authentication',
    description: 'Single sign-on via Google Workspace credentials managed through Neon Auth.',
    status: 'Connected',
    permissions: ['Profile email', 'Verified identity token'],
    lastSynced: 'Active session',
  },
  {
    id: 'int-email-digest',
    name: 'SMTP / Transactional Alert Delivery',
    category: 'Notifications',
    description: 'Delivers saved-search digests, deadline reminders, and team invitations.',
    status: 'Connected',
    permissions: ['Send alert digests', 'Deliver verification emails'],
    lastSynced: '2026-11-19 07:45 UTC',
  },
  {
    id: 'int-calendar-ics',
    name: 'iCalendar (.ics) Deadline Feed',
    category: 'Scheduling & Deadlines',
    description: 'Subscribe to submission deadlines and briefing milestones in Outlook or Google Calendar.',
    status: 'Available',
    permissions: ['Read-only calendar feed URL'],
  },
  {
    id: 'int-webhook',
    name: 'Outbound JSON Webhook',
    category: 'Automation',
    description: 'Forward high-alignment opportunities and amendment alerts to internal CRM or Slack workflows.',
    status: 'Configuration Required',
    permissions: ['Opportunity summary payload', 'Amendment events'],
  },
];

export const INITIAL_SAVED_ANALYSES: SavedAnalysisRecord[] = [
  {
    id: 'an-1',
    opportunityId: 'opp-uk-2026-0841',
    title: 'NHS England Clinical Interoperability Eligibility & Gap Brief',
    createdAt: '2026-11-18 14:20 UTC',
    eligibilityOutcome: 'Likely Eligible',
    confidence: 'High Confidence',
    saved: true,
  },
  {
    id: 'an-2',
    opportunityId: 'opp-eu-2026-4419',
    title: 'Horizon Europe Grid Resilience Consortium Check',
    createdAt: '2026-11-17 09:45 UTC',
    eligibilityOutcome: 'Review Required',
    confidence: 'Moderate Confidence',
    saved: true,
  },
  {
    id: 'an-3',
    opportunityId: 'opp-sg-2026-1190',
    title: 'PUB Singapore Stormwater Telemetry Requirements Extract',
    createdAt: '2026-11-16 17:05 UTC',
    eligibilityOutcome: 'Likely Eligible',
    confidence: 'High Confidence',
    saved: false,
  },
];

export const INITIAL_SAVED_REPORTS: SavedReportRecord[] = [
  {
    id: 'rep-1',
    name: 'Q4 UK & EU Public Health Tender Digest',
    type: 'Country',
    scope: 'GB, EU · Healthcare & Life Sciences',
    generatedAt: '2026-11-18 16:00 UTC',
    format: 'CSV',
  },
  {
    id: 'rep-2',
    name: 'Active Pipeline Eligibility Summary',
    type: 'Eligibility',
    scope: '4 Tracked Opportunities',
    generatedAt: '2026-11-17 11:30 UTC',
    format: 'Printable Brief',
  },
];

export const DEFAULT_ONBOARDING_PROFILE: OnboardingProfile = {
  accountType: 'Business',
  fullName: 'Elena Vance',
  organisationName: 'Meridian Civic & Cloud Advisory Ltd',
  website: 'https://meridian-advisory.org',
  country: 'United Kingdom',
  organisationDescription:
    'International technology & regulatory advisory specialising in sovereign cloud, health data interoperability, and environmental telemetry.',
  industry: 'Technology & Public Sector Advisory',
  organisationSize: '25–99 employees',
  primaryCountry: 'GB',
  countriesOfInterest: ['GB', 'EU', 'DE', 'SG', 'US'],
  regionsOfInterest: ['Europe', 'Asia-Pacific', 'North America'],
  internationalPreference: true,
  opportunityInterests: ['Government Tender', 'Public Procurement', 'RFP', 'Grant & Funding'],
  sectors: ['Healthcare & Life Sciences', 'Enterprise Software & Cyber', 'Water & Environmental Systems'],
  servicesAndProducts:
    'HL7 FHIR integration, zero-trust cloud architecture, hydrological telemetry analytics, regulatory compliance engineering.',
  expertiseAndCertifications: 'ISO/IEC 27001:2022, SOC 2 Type II, NHS DSPT Compliant, Multi-region Cloud Delivery.',
  minContractValue: '250000',
  maxContractValue: '10000000',
  preferredCurrency: 'EUR',
  minLeadDays: '14',
  notifyNewMatches: true,
  notifyDeadlines: true,
  notifyAmendments: true,
  notifyUpdates: false,
  completed: false,
  lastCompletedStep: 6,
};

export const DISCOVERY_TREND_SERIES = [
  { label: 'May', total: 1620, matched: 540, tracked: 280 },
  { label: 'Jun', total: 1840, matched: 610, tracked: 330 },
  { label: 'Jul', total: 2150, matched: 740, tracked: 410 },
  { label: 'Aug', total: 1920, matched: 680, tracked: 390 },
  { label: 'Sep', total: 2480, matched: 890, tracked: 510 },
  { label: 'Oct', total: 2743, matched: 1020, tracked: 615 },
];

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
