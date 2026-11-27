/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { PublicLayout } from './components/layout/PublicLayout';
import { ToastContainer } from './components/ui/StateViews';
import { AppStateProvider, useAppState } from './context/AppStateContext';
import { RouterProvider, useRouter } from './context/RouterContext';
import { ThemeProvider } from './context/ThemeContext';
import { AdminBillingConsolePage } from './pages/admin/AdminBillingPages';
import { AdminConsolePage } from './pages/admin/AdminPages';
import { AuthScreensPage } from './pages/auth/AuthScreens';
import {
  BillingHistoryPage,
  CancelSubscriptionPage,
  PlanChangePage,
  StandaloneCheckoutPage,
  SubscriptionBillingPage,
  UsageLimitsPage,
} from './pages/billing/BillingPages';
import { OnboardingWizardPage } from './pages/onboarding/OnboardingWizard';
import {
  PublicAboutPage,
  PublicContactPage,
  PublicCookiesPage,
  PublicDataProcessingPage,
  PublicDocsPage,
  PublicGettingStartedPage,
  PublicHomepage,
  PublicHowItWorksPage,
  PublicMarketsPage,
  PublicOpportunitiesPage,
  PublicPricingPage,
  PublicPrivacyPage,
  PublicProductPage,
  PublicSecurityPage,
  PublicSolutionsPage,
  PublicSourcesPage,
  PublicTermsPage,
} from './pages/public/PublicPages';
import { AcceptInvitationPage, SettingsPage, TeamsOrganisationPage } from './pages/workspace/AccountAndOrgPages';
import {
  BrandSystemPage,
  FirstTimeUserExperiencePage,
  IntegrationsPage,
} from './pages/workspace/CommercialSupportAndBrandPages';
import { DashboardPage } from './pages/workspace/DashboardPage';
import {
  CountryDiscoveryPage,
  DiscoverCommercialPage,
  DiscoverExplorerPage,
  DiscoverGovernmentPage,
  DiscoverGrantsPage,
  DiscoverSearchResultsPage,
  OpportunityComparisonPage,
  SourceDetailPage,
} from './pages/workspace/DiscoveryPages';
import {
  AlertsMonitoringPage,
  AnalyticsPage,
  IntelligenceWorkspacePage,
  MatchedOpportunitiesPage,
  NotificationsCentrePage,
  ReportsPage,
} from './pages/workspace/IntelligenceAndMonitoringPages';
import { OpportunityDetailPage } from './pages/workspace/OpportunityDetailPage';
import {
  MyOpportunitiesPage,
  OpportunityPreparationPage,
  SavedOpportunitiesPage,
  SavedSearchesPage,
  SearchHistoryPage,
} from './pages/workspace/PersonalWorkspacePages';
import {
  AccountSecurityPage,
  ActivityAuditPage,
  GlobalPreferencesPage,
  SupportTicketsPage,
  SystemStatusPage,
  UserJourneysPage,
} from './pages/workspace/PlatformOperationsPages';

function NotFoundScreen() {
  const { path, navigate, canGoBack, goBack, getBackLabel } = useRouter();
  return (
    <PublicLayout>
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <p className="font-mono text-xs font-semibold text-[#541B32] dark:text-[#E8A4B5]">404 · Route Not Found</p>
        <h1 className="font-display text-3xl font-bold">This OppSift route does not exist</h1>
        <p className="text-sm text-[#64748B] dark:text-[#CBD5E1]">
          No screen is mapped to <span className="font-mono break-all">{path}</span>. Return to the previous page, homepage, or workspace dashboard.
        </p>
        <div className="pt-2 flex flex-wrap justify-center gap-3">
          {canGoBack && (
            <button
              type="button"
              onClick={() => goBack('/')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#E2E8F0] dark:border-[#263244] text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to {getBackLabel('Previous Page')}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-4 py-2 rounded-lg border border-[#E2E8F0] dark:border-[#263244] text-sm font-medium"
          >
            Public Homepage
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 rounded-lg bg-[#541B32] hover:bg-[#A33B59] text-white text-sm font-semibold"
          >
            Open Dashboard
          </button>
        </div>
      </div>
    </PublicLayout>
  );
}

function AppRoutes() {
  const { path } = useRouter();
  const { isAdminAuthorized } = useAppState();

  const renderRoute = () => {
    // Public Website & Legal
    if (path === '/') return <PublicHomepage />;
    if (path === '/product') return <PublicProductPage />;
    if (path === '/opportunities') return <PublicOpportunitiesPage />;
    if (path === '/markets') return <PublicMarketsPage />;
    if (path === '/sources') return <PublicSourcesPage />;
    if (path === '/solutions') return <PublicSolutionsPage />;
    if (path === '/how-it-works') return <PublicHowItWorksPage />;
    if (path === '/about') return <PublicAboutPage />;
    if (path === '/contact') return <PublicContactPage />;
    if (path === '/contact/confirmed') return <PublicContactPage initialSubmitted={true} />;
    if (path === '/pricing') return <PublicPricingPage />;
    if (path === '/status') return <SystemStatusPage />;
    if (path === '/getting-started') return <PublicGettingStartedPage />;
    if (path === '/docs') return <PublicDocsPage />;
    if (path === '/security') return <PublicSecurityPage />;
    if (path === '/privacy' || path === '/legal/privacy') return <PublicPrivacyPage />;
    if (path === '/terms' || path === '/legal/terms') return <PublicTermsPage />;
    if (path === '/cookies' || path === '/legal/cookies') return <PublicCookiesPage />;
    if (path === '/legal/dpa') return <PublicDataProcessingPage />;

    // Authentication & Onboarding (legacy /login, /register and /verify-email
    // URLs are kept and rendered by the current auth screens)
    if (
      path === '/login' ||
      path === '/register' ||
      path === '/verify-email' ||
      path === '/reset-password'
    ) {
      return <AuthScreensPage />;
    }
    if (path === '/auth' || path.startsWith('/auth/')) return <AuthScreensPage />;
    if (path === '/onboarding') return <OnboardingWizardPage />;
    if (path === '/first-time') return isAdminAuthorized ? <FirstTimeUserExperiencePage /> : <NotFoundScreen />;
    if (path === '/journeys') return isAdminAuthorized ? <UserJourneysPage /> : <NotFoundScreen />;

    // Brand Foundation (Internal Only)
    if (path === '/brand-system') return isAdminAuthorized ? <BrandSystemPage /> : <NotFoundScreen />;

    // Main Workspace & Discovery
    if (path === '/dashboard') return <DashboardPage />;
    if (path === '/matched') return <MatchedOpportunitiesPage />;
    if (path === '/discover') return <DiscoverExplorerPage />;
    if (path === '/discover/government') return <DiscoverGovernmentPage />;
    if (path === '/discover/grants') return <DiscoverGrantsPage />;
    if (path === '/discover/commercial') return <DiscoverCommercialPage />;
    if (path === '/discover/search') return <DiscoverSearchResultsPage />;
    if (path === '/discover/compare') return <OpportunityComparisonPage />;
    if (path.startsWith('/discover/country/')) {
      const code = path.replace('/discover/country/', '').toUpperCase() || 'GB';
      return <CountryDiscoveryPage countryCode={code} />;
    }
    if (path.startsWith('/sources/')) {
      const sourceId = path.replace('/sources/', '');
      return <SourceDetailPage sourceId={sourceId} />;
    }
    if (path.startsWith('/opportunity/')) {
      const id = path.replace('/opportunity/', '');
      return <OpportunityDetailPage opportunityId={id} />;
    }

    // Personal Workspace
    if (path === '/saved') return <SavedOpportunitiesPage />;
    if (path === '/saved-searches') return <SavedSearchesPage />;
    if (path === '/search-history') return <SearchHistoryPage />;
    if (path === '/my-opportunities') return <MyOpportunitiesPage />;
    if (path.startsWith('/my-opportunities/')) {
      const pipeId = path.replace('/my-opportunities/', '');
      return <OpportunityPreparationPage pipelineId={pipeId} />;
    }

    // Intelligence & Monitoring
    if (path === '/intelligence') return <IntelligenceWorkspacePage />;
    if (path === '/alerts') return <AlertsMonitoringPage />;
    if (path === '/notifications') return <NotificationsCentrePage />;
    if (path === '/analytics') return <AnalyticsPage />;
    if (path === '/reports') return <ReportsPage />;

    // Organisations, Security, Preferences & Account
    if (path === '/teams') return <TeamsOrganisationPage />;
    if (path === '/accept-invitation') return <AcceptInvitationPage />;
    if (path === '/profile') {
      return <SettingsPage initialTab="profile" title="My Profile" breadcrumb="Workspace / My Profile" />;
    }
    if (path === '/settings') return <SettingsPage />;
    if (path === '/settings/security') return <AccountSecurityPage />;
    if (path === '/settings/preferences') return <GlobalPreferencesPage />;
    if (path === '/settings/activity') return <ActivityAuditPage adminMode={false} />;

    // Commercial Billing & Subscription Management (Lemon Squeezy MoR)
    if (path === '/checkout') return <StandaloneCheckoutPage />;
    if (path === '/billing' || path === '/settings/billing') return <SubscriptionBillingPage />;
    if (path === '/settings/usage') return <UsageLimitsPage />;
    if (path === '/settings/billing/history') return <BillingHistoryPage />;
    if (path === '/settings/billing/change') return <PlanChangePage />;
    if (path === '/settings/billing/cancel') return <CancelSubscriptionPage />;

    // Platform & Financial Administration (Protected)
    if (path === '/admin') return <AdminConsolePage section="overview" />;
    if (path === '/admin/sources') return <AdminConsolePage section="sources" />;
    if (path === '/admin/coverage') return <AdminConsolePage section="coverage" />;
    if (path === '/admin/ingestion') return <AdminConsolePage section="ingestion" />;
    if (path === '/admin/quality') return <AdminConsolePage section="quality" />;
    if (path === '/admin/audit') return <ActivityAuditPage adminMode={true} />;
    if (path === '/admin/billing') return <AdminBillingConsolePage section="overview" />;
    if (path === '/admin/subscriptions') return <AdminBillingConsolePage section="subscriptions" />;
    if (path === '/admin/transactions') return <AdminBillingConsolePage section="transactions" />;
    if (path === '/admin/invoices') return <AdminBillingConsolePage section="invoices" />;
    if (path === '/admin/plans') return <AdminBillingConsolePage section="plans" />;
    if (path === '/admin/coupons') return <AdminBillingConsolePage section="coupons" />;
    if (path === '/admin/refunds') return <AdminBillingConsolePage section="refunds" />;

    // Integrations & Support
    if (path === '/integrations') return <IntegrationsPage />;
    if (path === '/support' || path === '/help') return <SupportTicketsPage />;

    return <NotFoundScreen />;
  };

  return (
    <>
      {renderRoute()}
      <ToastContainer />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <RouterProvider>
        <AppStateProvider>
          <AppRoutes />
        </AppStateProvider>
      </RouterProvider>
    </ThemeProvider>
  );
}
