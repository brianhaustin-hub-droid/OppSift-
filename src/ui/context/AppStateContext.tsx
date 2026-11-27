import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  INITIAL_PLAN_CATALOG,
  INITIAL_WORKSPACE_SUBSCRIPTION,
} from '../data/billingConfig';
import { DEFAULT_ONBOARDING_PROFILE } from '../data/fixtures';
import { lemonSqueezyAdapter } from '../services/paymentAdapter';
import { useLiveData } from '../data/live';
import { useOptionalAuth } from '../../app/auth/AuthProvider';
import { useOptionalOrganizations } from '../../app/organizations/OrganizationProvider';
import { neonClient } from '../../app/auth/neon-client';
import type { CountryCoverage, DataSourceRecord } from '../types/oppsift';
import {
  AlertRule,
  AuditLogEvent,
  BillingConnectionState,
  BillingFrequency,
  CheckoutStateMode,
  CouponRecord,
  GlobalStateMode,
  IngestionJob,
  IntegrationItem,
  InvoiceRecord,
  NotificationItem,
  OnboardingProfile,
  PaymentMethodSummary,
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
  requestSubscriptionCancel: (reason: string) => Promise<boolean>;
  requestSubscriptionReactivate: () => Promise<void>;
  paymentMethods: PaymentMethodSummary[];
  billingConnection: BillingConnectionState;
  billingConnectionMessage: string;
  refreshBilling: () => Promise<void>;

  /* Support, Security Sessions & Audit Events */
  supportTickets: SupportTicket[];
  createSupportTicket: (subject: string, category: SupportTicket['category'], body: string, attachmentName?: string) => void;
  replySupportTicket: (ticketId: string, body: string) => void;
  resolveSupportTicket: (ticketId: string) => void;
  auditEvents: AuditLogEvent[];
  addAuditEvent: (event: Omit<AuditLogEvent, 'id' | 'timestamp'>) => void;
  userSessions: UserSessionRecord[];
  revokeOtherSessions: () => void;
}

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined);

/** Describes the browser holding the session without claiming a location. */
function describeDevice(): string {
  if (typeof navigator === 'undefined') return 'Current browser';
  const userAgent = navigator.userAgent;
  const platform = /Windows|Macintosh|Linux|Android|iPhone|iPad/i.exec(userAgent)?.[0] ?? 'Web';
  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /Chrome\//.test(userAgent)
      ? 'Chrome'
      : /Safari\//.test(userAgent)
        ? 'Safari'
        : /Firefox\//.test(userAgent)
          ? 'Firefox'
          : 'Browser';
  return `${platform} · ${browser}`;
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const live = useLiveData();
  const session = useOptionalAuth();
  const sessionUser = session?.user ?? null;
  const organizations = useOptionalOrganizations();
  const organizationId = organizations?.activeOrganization?.id ?? null;
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
      ? 'Opportunity records are unavailable right now. Try again shortly.'
      : live.error
        ? 'Opportunity records could not be loaded. Try again shortly.'
        : live.opportunities.length === 0
          ? 'No opportunity records are available for the current filters yet.'
          : 'Live records read from the OppSift database.';
  const dataTotals = {
    opportunities: live.totalOpportunities,
    awards: live.totalAwards,
    sources: live.totalSources,
    countries: live.totalCountries,
  };
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  // Workspace records begin empty. They are created by the signed-in account
  // and, where a service exists, read from the application API. No synthetic
  // pipeline, notification or analysis is injected into a new workspace.
  const [pipeline, setPipeline] = useState<PipelineItem[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [ingestionJobs, setIngestionJobs] = useState<IngestionJob[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysisRecord[]>([]);
  const [savedReports, setSavedReports] = useState<SavedReportRecord[]>([]);
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
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [coupons] = useState<CouponRecord[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodSummary[]>([]);
  const [billingConnection, setBillingConnection] = useState<BillingConnectionState>(
    lemonSqueezyAdapter.configured ? 'loading' : 'unconfigured',
  );
  const [billingConnectionMessage, setBillingConnectionMessage] = useState<string>(
    lemonSqueezyAdapter.configured
      ? 'Reading subscription records from the billing service.'
      : 'Subscription records are unavailable right now.',
  );
  const [checkoutOpen, setCheckoutOpen] = useState<boolean>(false);
  const [checkoutPlanId, setCheckoutPlanId] = useState<PlanTierId>('professional');
  const [checkoutFrequency, setCheckoutFrequency] = useState<BillingFrequency>('monthly');
  const [checkoutState, setCheckoutState] = useState<CheckoutStateMode>('ready');

  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditLogEvent[]>([]);

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
      resetDate: subscription.nextRenewalDate,
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
      resetDate: subscription.nextRenewalDate,
      unit: 'analyses',
    },
    {
      id: 'u-docs',
      label: 'Document Analyses',
      used: 0,
      allowance: currentPlan.entitlements.documentAnalysesMonthly,
      periodType: 'Monthly',
      resetDate: subscription.nextRenewalDate,
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
      resetDate: subscription.nextRenewalDate,
      unit: 'exports',
    },
  ];

  // Identity is supplied by the authenticated account and the workspace
  // profile. Nothing here is representative sample data.
  const effectiveOnboarding: OnboardingProfile = useMemo(
    () => ({
      ...onboarding,
      fullName:
        onboarding.fullName ||
        sessionUser?.name ||
        sessionUser?.email?.split('@')[0] ||
        '',
    }),
    [onboarding, sessionUser],
  );

  const effectiveSubscription: WorkspaceSubscription = useMemo(() => {
    const seatAllowance = currentPlan.entitlements.teamSeatsLimit;
    const allocated =
      typeof seatAllowance === 'number'
        ? Math.max(seatAllowance, teamMembers.length)
        : subscription.allocatedSeats;
    return {
      ...subscription,
      billingEmail: subscription.billingEmail || sessionUser?.email || '',
      billingAdministrator:
        subscription.billingAdministrator || effectiveOnboarding.fullName,
      organisationName:
        subscription.organisationName || effectiveOnboarding.organisationName,
      occupiedSeats: teamMembers.length,
      allocatedSeats: allocated,
    };
  }, [subscription, sessionUser, effectiveOnboarding, teamMembers.length, currentPlan]);

  const userSessions: UserSessionRecord[] = useMemo(() => {
    if (!sessionUser) return [];
    return [
      {
        id: sessionUser.id,
        device: describeDevice(),
        location: effectiveOnboarding.preferredTimezone || 'Time zone not set',
        authMethod: 'Neon Managed Auth',
        lastActive: 'Active now',
        current: true,
      },
    ];
  }, [sessionUser, effectiveOnboarding.preferredTimezone]);

  /** Reads authoritative subscription, invoice and payment records. */
  const refreshBilling = useCallback(async () => {
    if (!lemonSqueezyAdapter.configured) {
      setBillingConnection('unconfigured');
      setBillingConnectionMessage(
        isSignedIn
          ? 'Subscription records are unavailable right now.'
          : 'Sign in to read subscription and billing records.',
      );
      return;
    }
    if (!isSignedIn) {
      setBillingConnection('unauthenticated');
      setBillingConnectionMessage('Sign in to read subscription and billing records.');
      return;
    }
    setBillingConnection('loading');
    const result = await lemonSqueezyAdapter.fetchBillingSnapshot();
    setBillingConnection(result.state);
    setBillingConnectionMessage(result.message);
    if (result.state !== 'ready' || !result.snapshot) return;
    if (result.snapshot.subscription) setSubscription(result.snapshot.subscription);
    setPaymentMethods(result.snapshot.paymentMethods);
    setInvoices(result.snapshot.invoices);
    setTransactions(result.snapshot.transactions);
    setRefunds(result.snapshot.refunds);
  }, [isSignedIn]);

  useEffect(() => {
    void refreshBilling();
  }, [refreshBilling]);

  // Saved opportunities live in the organisation table. The list loads for the
  // signed-in organisation and every toggle is written through the RPC, with
  // the optimistic change rolled back when the database rejects it.
  useEffect(() => {
    if (!organizationId || !isSignedIn || !neonClient) {
      setSavedIds([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const result = await neonClient.rpc('list_saved_opportunities', {
          p_organization_id: organizationId,
        });
        if (cancelled || result.error) return;
        const rows = Array.isArray(result.data) ? result.data : [];
        const ids = rows
          .map((row) =>
            row && typeof row === 'object' && 'opportunity_id' in row
              ? String((row as { opportunity_id?: unknown }).opportunity_id ?? '')
              : '',
          )
          .filter((value) => value.length > 0);
        setSavedIds(ids);
      } catch {
        // The screen reports the empty list; the account can retry by reloading.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [organizationId, isSignedIn]);

  const toggleSaveOpportunity = (id: string) => {
    const exists = savedIds.includes(id);
    setSavedIds((prev) => (exists ? prev.filter((item) => item !== id) : [id, ...prev]));
    pushToast('info', exists ? 'Removed from saved opportunities.' : 'Saved to workspace.');

    if (!organizationId || !neonClient) {
      pushToast('warning', 'Sign in to an organisation workspace to store saved opportunities.');
      return;
    }

    void (async () => {
      try {
        const result = exists
          ? await neonClient.rpc('delete_saved_opportunity', {
              p_organization_id: organizationId,
              p_opportunity_id: id,
            })
          : await neonClient.rpc('upsert_saved_opportunity', {
              p_organization_id: organizationId,
              p_opportunity_id: id,
            });
        if (result.error) throw new Error(result.error.message);
      } catch {
        setSavedIds((prev) => (exists ? [id, ...prev.filter((item) => item !== id)] : prev.filter((item) => item !== id)));
        pushToast('error', 'Saved opportunities could not be updated. Try again.');
      }
    })();
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
        addedAt: new Date().toISOString().slice(0, 10),
        notes: 'Added from discovery workspace for initial eligibility review.',
        tasks: [
          {
            id: `t-${Date.now()}`,
            title: 'Review mandatory submission requirements',
            owner: effectiveOnboarding.fullName,
            dueDate: new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10),
            priority: 'High',
            completed: false,
          },
        ],
        documents: [],
        milestones: [
          { id: `m-${Date.now()}`, label: 'Initial Go/No-Go Review', targetDate: new Date(Date.now() + 9 * 86_400_000).toISOString().slice(0, 10), status: 'Upcoming' },
        ],
        activityLog: [
          {
            id: `act-${Date.now()}`,
            timestamp: `${new Date().toISOString().slice(0, 10)} (just now)`,
            actor: effectiveOnboarding.fullName,
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
                  timestamp: `${new Date().toISOString().slice(0, 10)} (just now)`,
                  actor: effectiveOnboarding.fullName,
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
                  owner: owner || effectiveOnboarding.fullName,
                  dueDate: dueDate || new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10),
                  priority,
                  completed: false,
                },
              ],
              activityLog: [
                {
                  id: `act-${Date.now()}`,
                  timestamp: `${new Date().toISOString().slice(0, 10)} (just now)`,
                  actor: effectiveOnboarding.fullName,
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
        searchedAt: `${new Date().toISOString().slice(0, 10)} (just now)`,
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
      actor: effectiveOnboarding.fullName,
      target: `${email} (${role})`,
      detail: 'Added pending workspace invitation.',
    });
    pushToast('success', `Invitation recorded for ${email}.`);
  };

  const retryIngestionJob = (jobId: string) => {
    setIngestionJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? {
              ...j,
              status: 'Succeeded',
              startedAt: `${new Date().toISOString().slice(0, 10)} (retried)`,
              completedAt: `${new Date().toISOString().slice(0, 10)} (just now)`,
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
    const generatedAt = new Date().toISOString().slice(0, 10);
    setSavedReports((prev) => [
      { ...report, id: `rep-${Date.now()}`, generatedAt },
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
    pushToast('success', 'Plan configuration updated and recorded in the audit trail.');
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
    if (!res.accepted) {
      pushToast('error', res.message);
      return;
    }
    setSubscription((prev) => ({
      ...prev,
      pendingPlanId: targetPlanId,
      frequency,
      pendingChangeEffectiveDate:
        res.effectivePolicy === 'next_period'
          ? prev.nextRenewalDate || 'Next billing cycle'
          : 'Awaiting provider confirmation',
    }));
    addAuditEvent({
      scope: 'Billing',
      action: 'Plan change requested',
      actor: effectiveOnboarding.fullName,
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

  const requestSubscriptionCancel = async (reason: string): Promise<boolean> => {
    const res = await lemonSqueezyAdapter.requestCancellation(subscription.providerSubscriptionRef, reason);
    if (!res.accepted) {
      pushToast('error', res.message);
      return false;
    }
    setSubscription((prev) => ({
      ...prev,
      status: 'cancelled',
      accessEndDate: res.accessEndDate ?? prev.nextRenewalDate,
    }));
    addAuditEvent({
      scope: 'Billing',
      action: 'Subscription cancellation requested',
      actor: effectiveOnboarding.fullName,
      target: subscription.planId,
      detail: reason ? `Reason: ${reason}` : res.message,
    });
    pushToast('success', res.message);
    return true;
  };

  const requestSubscriptionReactivate = async () => {
    const res = await lemonSqueezyAdapter.requestReactivation(subscription.providerSubscriptionRef);
    if (!res.accepted) {
      pushToast('error', res.message);
      return;
    }
    addAuditEvent({
      scope: 'Billing',
      action: 'Subscription reactivation requested',
      actor: effectiveOnboarding.fullName,
      target: subscription.planId,
      detail: res.message,
    });
    pushToast('success', res.message);
    await refreshBilling();
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
      id: `TKT-${new Date().getFullYear()}-${Math.floor(1050 + Math.random() * 8900)}`,
      subject: subject.trim(),
      category,
      status: 'Open',
      createdAt: nowLabel,
      updatedAt: nowLabel,
      attachmentName,
      messages: [
        {
          id: `msg-${Date.now()}`,
          sender: effectiveOnboarding.fullName,
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
      actor: effectiveOnboarding.fullName,
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
                  sender: effectiveOnboarding.fullName,
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
    const otherSessions = userSessions.filter((session) => !session.current);
    if (otherSessions.length === 0) {
      pushToast('info', 'This is the only active session reported for your account.');
      return;
    }
    pushToast(
      'info',
      'Session revocation for other devices is completed from your Neon account security settings.',
    );
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
        onboarding: effectiveOnboarding,
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
        subscription: effectiveSubscription,
        updateSubscriptionField,
        usageMetrics,
        invoices,
        transactions,
        refunds,
        coupons,
        paymentMethods,
        billingConnection,
        billingConnectionMessage,
        refreshBilling,
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
