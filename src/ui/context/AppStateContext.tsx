import React, { createContext, useContext, useState } from 'react';
import {
  INITIAL_AUDIT_EVENTS,
  INITIAL_COUPONS,
  INITIAL_INVOICES,
  INITIAL_PLAN_CATALOG,
  INITIAL_REFUNDS,
  INITIAL_SUPPORT_TICKETS,
  INITIAL_TRANSACTIONS,
  INITIAL_USER_SESSIONS,
  INITIAL_WORKSPACE_SUBSCRIPTION,
} from '../data/billingConfig';
import {
  DEFAULT_ONBOARDING_PROFILE,
  INITIAL_ALERT_RULES,
  INITIAL_INGESTION_JOBS,
  INITIAL_INTEGRATIONS,
  INITIAL_NOTIFICATIONS,
  INITIAL_PIPELINE,
  INITIAL_SAVED_ANALYSES,
  INITIAL_SAVED_REPORTS,
  INITIAL_SAVED_SEARCHES,
  INITIAL_SEARCH_HISTORY,
  INITIAL_TEAM_MEMBERS,
} from '../data/fixtures';
import { lemonSqueezyAdapter } from '../services/paymentAdapter';
import { useLiveData } from '../data/live';
import { useOptionalAuth } from '../../app/auth/AuthProvider';
import type { CountryCoverage, DataSourceRecord } from '../types/oppsift';
import {
  AlertRule,
  AuditLogEvent,
  BillingFrequency,
  CheckoutStateMode,
  CouponRecord,
  GlobalStateMode,
  IngestionJob,
  IntegrationItem,
  InvoiceRecord,
  NotificationItem,
  OnboardingProfile,
  Opportunity,
  PipelineItem,
  PipelineStage,
  PlanTierConfig,
  PlanTierId,
  PriorityLevel,
  RefundRecord,
  SavedAnalysisRecord,
  SavedReportRecord,
  SavedSearch,
  SearchHistoryItem,
  SupportTicket,
  TeamMember,
  TransactionRecord,
  UsageMetricRecord,
  UserSessionRecord,
  WorkspaceSubscription,
} from '../types/oppsift';

export interface ToastMessage {
  id: string;
  tone: 'success' | 'info' | 'warning' | 'error';
  message: string;
}

interface AppStateContextValue {
  opportunities: Opportunity[];
  awards: Opportunity[];
  sources: DataSourceRecord[];
  countries: CountryCoverage[];
  dataLoading: boolean;
  dataError: string | null;
  dataConfigured: boolean;
  dataMode: 'live' | 'loading' | 'error';
  dataModeDetail: string;
  dataTotals: {
    opportunities: number;
    awards: number;
    sources: number;
    countries: number;
  };
  dataTruncated: boolean;
  dataLastSyncedAt: string | null;
  savedIds: string[];
  toggleSaveOpportunity: (id: string) => void;
  compareIds: string[];
  toggleCompareOpportunity: (id: string) => void;
  clearCompare: () => void;
  pipeline: PipelineItem[];
  addToPipeline: (opportunityId: string, stage?: PipelineStage) => void;
  updatePipelineStage: (pipelineId: string, stage: PipelineStage) => void;
  updatePipelinePriority: (pipelineId: string, priority: PriorityLevel) => void;
  togglePipelineTask: (pipelineId: string, taskId: string) => void;
  addPipelineTask: (pipelineId: string, title: string, owner: string, dueDate: string, priority: PriorityLevel) => void;
  updatePipelineNotes: (pipelineId: string, notes: string) => void;
  savedSearches: SavedSearch[];
  addSavedSearch: (search: Omit<SavedSearch, 'id' | 'lastChecked'>) => void;
  deleteSavedSearch: (id: string) => void;
  toggleSavedSearchAlert: (id: string) => void;
  searchHistory: SearchHistoryItem[];
  recordSearch: (query: string, filtersSummary: string, resultsCount: number) => void;
  clearSearchHistory: () => void;
  notifications: NotificationItem[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  alertRules: AlertRule[];
  toggleAlertRule: (id: string) => void;
  addAlertRule: (rule: Omit<AlertRule, 'id' | 'lastTriggered' | 'status'>) => void;
  teamMembers: TeamMember[];
  inviteTeamMember: (email: string, role: TeamMember['role']) => void;
  ingestionJobs: IngestionJob[];
  retryIngestionJob: (jobId: string) => void;
  integrations: IntegrationItem[];
  toggleIntegration: (id: string) => void;
  savedAnalyses: SavedAnalysisRecord[];
  toggleSaveAnalysis: (id: string) => void;
  savedReports: SavedReportRecord[];
  addSavedReport: (report: Omit<SavedReportRecord, 'id' | 'generatedAt'>) => void;
  onboarding: OnboardingProfile;
  updateOnboarding: (patch: Partial<OnboardingProfile>) => void;
  isSignedIn: boolean;
  setIsSignedIn: (signedIn: boolean) => void;
  isAdminAuthorized: boolean;
  setIsAdminAuthorized: (admin: boolean) => void;
  globalStateMode: GlobalStateMode;
  setGlobalStateMode: (mode: GlobalStateMode) => void;
  isGlobalSearchOpen: boolean;
  setGlobalSearchOpen: (open: boolean) => void;
  toasts: ToastMessage[];
  pushToast: (tone: ToastMessage['tone'], message: string) => void;
  dismissToast: (id: string) => void;

  /* Commercial Billing & Financial System */
  planCatalog: PlanTierConfig[];
  updatePlanConfig: (planId: PlanTierId, patch: Partial<PlanTierConfig>) => void;
  subscription: WorkspaceSubscription;
  updateSubscriptionField: (patch: Partial<WorkspaceSubscription>) => void;
  usageMetrics: UsageMetricRecord[];
  invoices: InvoiceRecord[];
  transactions: TransactionRecord[];
  refunds: RefundRecord[];
  coupons: CouponRecord[];
  checkoutOpen: boolean;
  checkoutPlanId: PlanTierId;
  checkoutFrequency: BillingFrequency;
  checkoutState: CheckoutStateMode;
  setCheckoutState: (state: CheckoutStateMode) => void;
  openCheckout: (planId: PlanTierId, frequency: BillingFrequency) => void;
  closeCheckout: () => void;
  requestPlanTransition: (targetPlanId: PlanTierId, frequency: BillingFrequency) => Promise<void>;
  cancelPendingPlanTransition: () => void;
  requestSubscriptionCancel: (reason: string) => Promise<void>;
  requestSubscriptionReactivate: () => void;

  /* Support, Security Sessions & Audit Events */
  supportTickets: SupportTicket[];
  createSupportTicket: (subject: string, category: SupportTicket['category'], body: string, attachmentName?: string) => void;
  replySupportTicket: (ticketId: string, body: string) => void;
  resolveSupportTicket: (ticketId: string) => void;
  auditEvents: AuditLogEvent[];
  addAuditEvent: (event: Omit<AuditLogEvent, 'id' | 'timestamp'>) => void;
  userSessions: UserSessionRecord[];
  revokeOtherSessions: () => void;

  /* Background Video Accessibility Preference */
  reduceBackgroundMotion: boolean;
  setReduceBackgroundMotion: (reduce: boolean) => void;
}

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const live = useLiveData();
  const session = useOptionalAuth();
  const sessionUser = session?.user ?? null;
  // Records come only from the live Neon tables. A failed or empty read is
  // reported as such; no bundled sample rows are substituted.
  const opportunities: Opportunity[] = live.opportunities;
  const awards: Opportunity[] = live.awards;
  const sources: DataSourceRecord[] = live.sources;
  const countries: CountryCoverage[] = live.countries;
  const dataMode: 'live' | 'loading' | 'error' = live.loading
    ? 'loading'
    : !live.configured || live.error
      ? 'error'
      : 'live';
  const dataModeDetail = live.loading
    ? 'Reading live opportunity, source and country records from the OppSift database.'
    : !live.configured
      ? 'VITE_NEON_AUTH_URL and VITE_NEON_DATA_API_URL are not set for this build, so no live records are available.'
      : live.error
        ? `The live database request failed: ${live.error}`
        : live.opportunities.length === 0
          ? 'The live database returned no opportunity records. Ingestion has not stored any notices for the current filters.'
          : 'Live records read from the OppSift database.';
  const dataTotals = {
    opportunities: live.totalOpportunities,
    awards: live.totalAwards,
    sources: live.totalSources,
    countries: live.totalCountries,
  };
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [pipeline, setPipeline] = useState<PipelineItem[]>(INITIAL_PIPELINE);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(INITIAL_SAVED_SEARCHES);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>(INITIAL_SEARCH_HISTORY);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [alertRules, setAlertRules] = useState<AlertRule[]>(INITIAL_ALERT_RULES);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(INITIAL_TEAM_MEMBERS);
  const [ingestionJobs, setIngestionJobs] = useState<IngestionJob[]>(INITIAL_INGESTION_JOBS);
  const [integrations, setIntegrations] = useState<IntegrationItem[]>(INITIAL_INTEGRATIONS);
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysisRecord[]>(INITIAL_SAVED_ANALYSES);
  const [savedReports, setSavedReports] = useState<SavedReportRecord[]>(INITIAL_SAVED_REPORTS);
  const [onboarding, setOnboarding] = useState<OnboardingProfile>({
    ...DEFAULT_ONBOARDING_PROFILE,
    preferredLanguage: 'English (International)',
    preferredTimezone: 'Europe/London (UTC+00:00)',
    preferredDateFormat: 'DD MMM YYYY',
  });
  // Sign-in state mirrors the real Neon session; the screens no longer hold a
  // local mock flag.
  const isSignedIn = Boolean(sessionUser);
  const setIsSignedIn = (signedIn: boolean) => {
    if (signedIn) return;
    void session?.signOut().catch(() => {
      // The provider reports the failure; the caller owns any user-facing toast.
    });
  };
  const [isAdminAuthorized, setIsAdminAuthorized] = useState<boolean>(false);
  const [globalStateMode, setGlobalStateMode] = useState<GlobalStateMode>('normal');
  const [isGlobalSearchOpen, setGlobalSearchOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  /* Billing & Operations State */
  const [planCatalog, setPlanCatalog] = useState<PlanTierConfig[]>(INITIAL_PLAN_CATALOG);
  const [subscription, setSubscription] = useState<WorkspaceSubscription>(INITIAL_WORKSPACE_SUBSCRIPTION);
  const [invoices] = useState<InvoiceRecord[]>(INITIAL_INVOICES);
  const [transactions] = useState<TransactionRecord[]>(INITIAL_TRANSACTIONS);
  const [refunds] = useState<RefundRecord[]>(INITIAL_REFUNDS);
  const [coupons] = useState<CouponRecord[]>(INITIAL_COUPONS);
  const [checkoutOpen, setCheckoutOpen] = useState<boolean>(false);
  const [checkoutPlanId, setCheckoutPlanId] = useState<PlanTierId>('professional');
  const [checkoutFrequency, setCheckoutFrequency] = useState<BillingFrequency>('monthly');
  const [checkoutState, setCheckoutState] = useState<CheckoutStateMode>('ready');

  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(INITIAL_SUPPORT_TICKETS);
  const [auditEvents, setAuditEvents] = useState<AuditLogEvent[]>(INITIAL_AUDIT_EVENTS);
  const [userSessions, setUserSessions] = useState<UserSessionRecord[]>(INITIAL_USER_SESSIONS);
  const [reduceBackgroundMotion, setReduceBackgroundMotionState] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && window.localStorage.getItem('oppsift_reduce_motion') === 'true';
    } catch {
      return false;
    }
  });

  const setReduceBackgroundMotion = (reduce: boolean) => {
    setReduceBackgroundMotionState(reduce);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('oppsift_reduce_motion', String(reduce));
      }
    } catch {
      // Ignore storage access errors in restricted frames
    }
  };

  const pushToast = (tone: ToastMessage['tone'], message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, tone, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const addAuditEvent = (event: Omit<AuditLogEvent, 'id' | 'timestamp'>) => {
    const nowLabel = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
    setAuditEvents((prev) => [{ ...event, id: `aud-${Date.now()}`, timestamp: nowLabel }, ...prev]);
  };

  const currentPlan = planCatalog.find((p) => p.id === subscription.planId) ?? planCatalog[0];
  const usageMetrics: UsageMetricRecord[] = [
    {
      id: 'u-searches',
      label: 'Searches Used',
      used: searchHistory.length,
      allowance: currentPlan.entitlements.searchesMonthly,
      periodType: 'Monthly',
      resetDate: '2026-12-01',
      unit: 'queries',
    },
    {
      id: 'u-saved',
      label: 'Saved Opportunities',
      used: savedIds.length,
      allowance: currentPlan.entitlements.savedOpportunitiesLimit,
      periodType: 'Workspace Capacity',
      resetDate: null,
      unit: 'notices',
    },
    {
      id: 'u-ai',
      label: 'AI Analyses Used',
      used: savedAnalyses.length,
      allowance: currentPlan.entitlements.aiAnalysesMonthly,
      periodType: 'Monthly',
      resetDate: '2026-12-01',
      unit: 'analyses',
    },
    {
      id: 'u-docs',
      label: 'Document Analyses',
      used: 2,
      allowance: currentPlan.entitlements.documentAnalysesMonthly,
      periodType: 'Monthly',
      resetDate: '2026-12-01',
      unit: 'documents',
    },
    {
      id: 'u-alerts',
      label: 'Active Alerts',
      used: alertRules.filter((r) => r.status === 'Active').length,
      allowance: currentPlan.entitlements.activeAlertsLimit,
      periodType: 'Workspace Capacity',
      resetDate: null,
      unit: 'rules',
    },
    {
      id: 'u-monitored',
      label: 'Monitored Searches',
      used: savedSearches.length,
      allowance: currentPlan.entitlements.monitoredSearchesLimit,
      periodType: 'Workspace Capacity',
      resetDate: null,
      unit: 'searches',
    },
    {
      id: 'u-seats',
      label: 'Team Seats',
      used: teamMembers.length,
      allowance: currentPlan.entitlements.teamSeatsLimit,
      periodType: 'Workspace Capacity',
      resetDate: null,
      unit: 'seats',
    },
    {
      id: 'u-reports',
      label: 'Report Generation',
      used: savedReports.length,
      allowance: currentPlan.entitlements.reportsMonthly,
      periodType: 'Monthly',
      resetDate: '2026-12-01',
      unit: 'exports',
    },
  ];

  const toggleSaveOpportunity = (id: string) => {
    setSavedIds((prev) => {
      const exists = prev.includes(id);
      pushToast('info', exists ? 'Removed from saved opportunities.' : 'Saved to workspace.');
      return exists ? prev.filter((item) => item !== id) : [id, ...prev];
    });
  };

  const toggleCompareOpportunity = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 3) {
        pushToast('warning', 'Compare up to 3 opportunities simultaneously.');
        return prev;
      }
      pushToast('success', 'Added to opportunity comparison tray.');
      return [...prev, id];
    });
  };

  const clearCompare = () => setCompareIds([]);

  const addToPipeline = (opportunityId: string, stage: PipelineStage = 'Interested') => {
    setPipeline((prev) => {
      if (prev.some((p) => p.opportunityId === opportunityId)) {
        pushToast('info', 'Opportunity is already tracked in your pipeline.');
        return prev;
      }
      const next: PipelineItem = {
        id: `pipe-${Date.now()}`,
        opportunityId,
        stage,
        priority: 'Medium',
        addedAt: '2026-11-19',
        notes: 'Added from discovery workspace for initial eligibility review.',
        tasks: [
          {
            id: `t-${Date.now()}`,
            title: 'Review mandatory submission requirements',
            owner: onboarding.fullName,
            dueDate: '2026-11-26',
            priority: 'High',
            completed: false,
          },
        ],
        documents: [],
        milestones: [
          { id: `m-${Date.now()}`, label: 'Initial Go/No-Go Review', targetDate: '2026-11-28', status: 'Upcoming' },
        ],
        activityLog: [
          {
            id: `act-${Date.now()}`,
            timestamp: '2026-11-19 (just now)',
            actor: onboarding.fullName,
            summary: `Added to pipeline (${stage})`,
          },
        ],
      };
      pushToast('success', `Added to pipeline (${stage}).`);
      return [next, ...prev];
    });
  };

  const updatePipelineStage = (pipelineId: string, stage: PipelineStage) => {
    setPipeline((prev) =>
      prev.map((item) =>
        item.id === pipelineId
          ? {
              ...item,
              stage,
              activityLog: [
                {
                  id: `act-${Date.now()}`,
                  timestamp: '2026-11-19 (just now)',
                  actor: onboarding.fullName,
                  summary: `Moved stage from ${item.stage} to ${stage}`,
                },
                ...item.activityLog,
              ],
            }
          : item
      )
    );
    pushToast('success', `Stage updated to ${stage}.`);
  };

  const updatePipelinePriority = (pipelineId: string, priority: PriorityLevel) => {
    setPipeline((prev) => prev.map((item) => (item.id === pipelineId ? { ...item, priority } : item)));
    pushToast('info', `Priority set to ${priority}.`);
  };

  const togglePipelineTask = (pipelineId: string, taskId: string) => {
    setPipeline((prev) =>
      prev.map((item) =>
        item.id === pipelineId
          ? {
              ...item,
              tasks: item.tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t)),
            }
          : item
      )
    );
  };

  const addPipelineTask = (
    pipelineId: string,
    title: string,
    owner: string,
    dueDate: string,
    priority: PriorityLevel
  ) => {
    if (!title.trim()) return;
    setPipeline((prev) =>
      prev.map((item) =>
        item.id === pipelineId
          ? {
              ...item,
              tasks: [
                ...item.tasks,
                {
                  id: `t-${Date.now()}`,
                  title: title.trim(),
                  owner: owner || onboarding.fullName,
                  dueDate: dueDate || '2026-12-01',
                  priority,
                  completed: false,
                },
              ],
              activityLog: [
                {
                  id: `act-${Date.now()}`,
                  timestamp: '2026-11-19 (just now)',
                  actor: onboarding.fullName,
                  summary: `Created task "${title.trim()}"`,
                },
                ...item.activityLog,
              ],
            }
          : item
      )
    );
    pushToast('success', 'Preparation task added.');
  };

  const updatePipelineNotes = (pipelineId: string, notes: string) => {
    setPipeline((prev) => prev.map((item) => (item.id === pipelineId ? { ...item, notes } : item)));
    pushToast('success', 'Preparation notes saved.');
  };

  const addSavedSearch = (search: Omit<SavedSearch, 'id' | 'lastChecked'>) => {
    const item: SavedSearch = {
      ...search,
      id: `ss-${Date.now()}`,
      lastChecked: new Date().toISOString(),
    };
    setSavedSearches((prev) => [item, ...prev]);
    pushToast('success', `Saved search "${search.name}" created.`);
  };

  const deleteSavedSearch = (id: string) => {
    setSavedSearches((prev) => prev.filter((s) => s.id !== id));
    pushToast('info', 'Saved search deleted.');
  };

  const toggleSavedSearchAlert = (id: string) => {
    setSavedSearches((prev) => prev.map((s) => (s.id === id ? { ...s, emailAlerts: !s.emailAlerts } : s)));
  };

  const recordSearch = (query: string, filtersSummary: string, resultsCount: number) => {
    if (!query.trim()) return;
    setSearchHistory((prev) => [
      {
        id: `sh-${Date.now()}`,
        query: query.trim(),
        filtersSummary,
        searchedAt: '2026-11-19 (just now)',
        resultsCount,
      },
      ...prev.slice(0, 14),
    ]);
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
    pushToast('info', 'Search history cleared.');
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    pushToast('info', 'All notifications marked as read.');
  };

  const toggleAlertRule = (id: string) => {
    setAlertRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: r.status === 'Active' ? 'Paused' : 'Active' } : r))
    );
  };

  const addAlertRule = (rule: Omit<AlertRule, 'id' | 'lastTriggered' | 'status'>) => {
    const next: AlertRule = {
      ...rule,
      id: `al-${Date.now()}`,
      status: 'Active',
      lastTriggered: 'Rule active',
    };
    setAlertRules((prev) => [next, ...prev]);
    pushToast('success', `Alert rule "${rule.name}" activated.`);
  };

  const inviteTeamMember = (email: string, role: TeamMember['role']) => {
    const newMember: TeamMember = {
      id: `tm-${Date.now()}`,
      name: email.split('@')[0],
      email,
      role,
      status: 'Pending Invitation',
      country: 'International',
      lastActive: 'Invitation pending',
      permissions: role === 'Viewer' ? ['Read-only Collections'] : ['Discovery', 'Pipeline Write', 'AI Intelligence'],
      assignedTasksCount: 0,
      recentActivity: ['Invitation queued for dispatch'],
    };
    setTeamMembers((prev) => [...prev, newMember]);
    addAuditEvent({
      scope: 'Team',
      action: 'Member invitation created',
      actor: onboarding.fullName,
      target: `${email} (${role})`,
      detail: 'Added pending workspace invitation.',
    });
    pushToast('success', `Invitation queued for ${email}.`);
  };

  const retryIngestionJob = (jobId: string) => {
    setIngestionJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? {
              ...j,
              status: 'Succeeded',
              startedAt: '2026-11-19 (retried)',
              completedAt: '2026-11-19 (just now)',
              recordsCollected: 42,
              recordsProcessed: 42,
              errorDetail: undefined,
              logs: [...j.logs, '[Retry] Authorised retry succeeded: 42 records processed.'],
            }
          : j
      )
    );
    addAuditEvent({
      scope: 'Admin',
      action: 'Ingestion retry triggered',
      actor: 'Platform Admin',
      target: jobId,
      detail: 'Authorised job retry executed.',
    });
    pushToast('success', `Retry triggered for job ${jobId}.`);
  };

  const toggleIntegration = (id: string) => {
    setIntegrations((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: item.status === 'Connected' ? 'Available' : 'Connected',
              lastSynced: item.status === 'Connected' ? undefined : 'Synced',
            }
          : item
      )
    );
  };

  const toggleSaveAnalysis = (id: string) => {
    setSavedAnalyses((prev) => prev.map((a) => (a.id === id ? { ...a, saved: !a.saved } : a)));
  };

  const addSavedReport = (report: Omit<SavedReportRecord, 'id' | 'generatedAt'>) => {
    setSavedReports((prev) => [
      { ...report, id: `rep-${Date.now()}`, generatedAt: '2026-11-19' },
      ...prev,
    ]);
  };

  const updateOnboarding = (patch: Partial<OnboardingProfile>) => {
    setOnboarding((prev) => ({ ...prev, ...patch }));
  };

  /* Billing & Administration Actions */
  const updatePlanConfig = (planId: PlanTierId, patch: Partial<PlanTierConfig>) => {
    setPlanCatalog((prev) => prev.map((p) => (p.id === planId ? { ...p, ...patch } : p)));
    addAuditEvent({
      scope: 'Admin',
      action: 'Plan entitlement configuration updated',
      actor: 'Platform Admin',
      target: planId,
      detail: 'Updated configurable plan limits, pricing, or provider variant identifiers.',
    });
    pushToast('success', `Plan "${planId}" configuration updated and audited.`);
  };

  const updateSubscriptionField = (patch: Partial<WorkspaceSubscription>) => {
    setSubscription((prev) => ({ ...prev, ...patch }));
  };

  const openCheckout = (planId: PlanTierId, frequency: BillingFrequency) => {
    setCheckoutPlanId(planId);
    setCheckoutFrequency(frequency);
    setCheckoutState('ready');
    setCheckoutOpen(true);
  };

  const closeCheckout = () => {
    setCheckoutOpen(false);
    setCheckoutState('ready');
  };

  const requestPlanTransition = async (targetPlanId: PlanTierId, frequency: BillingFrequency) => {
    const res = await lemonSqueezyAdapter.requestPlanChange(subscription.planId, targetPlanId, frequency);
    setSubscription((prev) => ({
      ...prev,
      pendingPlanId: targetPlanId,
      frequency,
      pendingChangeEffectiveDate: res.effectivePolicy === 'next_period' ? prev.nextRenewalDate || 'Next billing cycle' : 'Pending webhook confirmation',
    }));
    addAuditEvent({
      scope: 'Billing',
      action: 'Plan change requested',
      actor: onboarding.fullName,
      target: `${subscription.planId} -> ${targetPlanId} (${frequency})`,
      detail: res.message,
    });
    pushToast('info', res.message);
  };

  const cancelPendingPlanTransition = () => {
    setSubscription((prev) => ({
      ...prev,
      pendingPlanId: null,
      pendingChangeEffectiveDate: null,
    }));
    pushToast('info', 'Pending plan change cancelled.');
  };

  const requestSubscriptionCancel = async (reason: string) => {
    const res = await lemonSqueezyAdapter.requestCancellation(subscription.providerSubscriptionRef, reason);
    setSubscription((prev) => ({
      ...prev,
      status: 'cancelled',
      accessEndDate: prev.nextRenewalDate || 'End of current period',
    }));
    addAuditEvent({
      scope: 'Billing',
      action: 'Subscription cancellation requested',
      actor: onboarding.fullName,
      target: subscription.planId,
      detail: reason ? `Reason: ${reason}` : res.message,
    });
    pushToast('info', res.message);
  };

  const requestSubscriptionReactivate = () => {
    setSubscription((prev) => ({
      ...prev,
      status: prev.providerSubscriptionRef ? 'active' : 'free',
      accessEndDate: null,
    }));
    addAuditEvent({
      scope: 'Billing',
      action: 'Subscription reactivation requested',
      actor: onboarding.fullName,
      target: subscription.planId,
      detail: 'Reactivation intent recorded for Lemon Squeezy provider confirmation.',
    });
    pushToast('success', 'Subscription reactivation intent recorded.');
  };

  /* Support, Security & Audit */
  const createSupportTicket = (
    subject: string,
    category: SupportTicket['category'],
    body: string,
    attachmentName?: string
  ) => {
    const nowLabel = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
    const next: SupportTicket = {
      id: `TKT-2026-${Math.floor(1050 + Math.random() * 8900)}`,
      subject: subject.trim(),
      category,
      status: 'Open',
      createdAt: nowLabel,
      updatedAt: nowLabel,
      attachmentName,
      messages: [
        {
          id: `msg-${Date.now()}`,
          sender: onboarding.fullName,
          role: 'Customer',
          timestamp: nowLabel,
          body: body.trim(),
        },
      ],
    };
    setSupportTickets((prev) => [next, ...prev]);
    addAuditEvent({
      scope: 'User',
      action: 'Support ticket created',
      actor: onboarding.fullName,
      target: next.id,
      detail: subject.trim(),
    });
    pushToast('success', `Support ticket ${next.id} created.`);
  };

  const replySupportTicket = (ticketId: string, body: string) => {
    if (!body.trim()) return;
    const nowLabel = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
    setSupportTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              updatedAt: nowLabel,
              status: 'Awaiting Reply',
              messages: [
                ...t.messages,
                {
                  id: `msg-${Date.now()}`,
                  sender: onboarding.fullName,
                  role: 'Customer',
                  timestamp: nowLabel,
                  body: body.trim(),
                },
              ],
            }
          : t
      )
    );
    pushToast('success', 'Reply added to support ticket.');
  };

  const resolveSupportTicket = (ticketId: string) => {
    const nowLabel = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
    setSupportTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: 'Resolved', updatedAt: nowLabel } : t))
    );
    pushToast('success', `Ticket ${ticketId} marked resolved.`);
  };

  const revokeOtherSessions = () => {
    setUserSessions((prev) => prev.filter((s) => s.current));
    addAuditEvent({
      scope: 'User',
      action: 'Signed out all secondary sessions',
      actor: onboarding.fullName,
      target: 'Neon Managed Auth Sessions',
      detail: 'Revoked external device sessions.',
    });
    pushToast('info', 'All other active sessions signed out.');
  };

  return (
    <AppStateContext.Provider
      value={{
        opportunities,
        awards,
        sources,
        countries,
        dataLoading: live.loading,
        dataError: live.error,
        dataConfigured: live.configured,
        dataMode,
        dataModeDetail,
        dataTotals,
        dataTruncated: live.truncated,
        dataLastSyncedAt: live.lastSyncedAt,
        savedIds,
        toggleSaveOpportunity,
        compareIds,
        toggleCompareOpportunity,
        clearCompare,
        pipeline,
        addToPipeline,
        updatePipelineStage,
        updatePipelinePriority,
        togglePipelineTask,
        addPipelineTask,
        updatePipelineNotes,
        savedSearches,
        addSavedSearch,
        deleteSavedSearch,
        toggleSavedSearchAlert,
        searchHistory,
        recordSearch,
        clearSearchHistory,
        notifications,
        markNotificationRead,
        markAllNotificationsRead,
        alertRules,
        toggleAlertRule,
        addAlertRule,
        teamMembers,
        inviteTeamMember,
        ingestionJobs,
        retryIngestionJob,
        integrations,
        toggleIntegration,
        savedAnalyses,
        toggleSaveAnalysis,
        savedReports,
        addSavedReport,
        onboarding,
        updateOnboarding,
        isSignedIn,
        setIsSignedIn,
        isAdminAuthorized,
        setIsAdminAuthorized,
        globalStateMode,
        setGlobalStateMode,
        isGlobalSearchOpen,
        setGlobalSearchOpen,
        toasts,
        pushToast,
        dismissToast,
        planCatalog,
        updatePlanConfig,
        subscription,
        updateSubscriptionField,
        usageMetrics,
        invoices,
        transactions,
        refunds,
        coupons,
        checkoutOpen,
        checkoutPlanId,
        checkoutFrequency,
        checkoutState,
        setCheckoutState,
        openCheckout,
        closeCheckout,
        requestPlanTransition,
        cancelPendingPlanTransition,
        requestSubscriptionCancel,
        requestSubscriptionReactivate,
        supportTickets,
        createSupportTicket,
        replySupportTicket,
        resolveSupportTicket,
        auditEvents,
        addAuditEvent,
        userSessions,
        revokeOtherSessions,
        reduceBackgroundMotion,
        setReduceBackgroundMotion,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used inside AppStateProvider');
  return ctx;
}
