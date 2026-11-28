import React, { Suspense } from 'react';
import { AuthProvider } from '../app/auth/AuthProvider';
import { OrganizationProvider } from '../app/organizations/OrganizationProvider';
import { AppStateProvider, useAppState } from './context/AppStateContext';
import { AuthGate } from './components/auth/AuthGate';
import { NotFoundScreen } from './components/layout/NotFoundScreen';
import { ToastContainer } from './components/ui/StateViews';
import { isGatedPath } from './routing/applicationPaths';

/**
 * The authenticated application: workspace, account, billing and operations.
 *
 * This module is loaded only when an application route is opened. The public
 * marketing site never mounts `AppStateProvider`, which means it never issues
 * the opportunity-data queries the workspace needs — anonymous visitors cannot
 * download records by loading the homepage.
 */

const AdminBillingConsolePage = React.lazy(() =>
  import('./pages/admin/AdminBillingPages').then((module) => ({ default: module.AdminBillingConsolePage })),
);
const AdminConsolePage = React.lazy(() =>
  import('./pages/admin/AdminPages').then((module) => ({ default: module.AdminConsolePage })),
);
const BillingHistoryPage = React.lazy(() =>
  import('./pages/billing/BillingPages').then((module) => ({ default: module.BillingHistoryPage })),
);
const CancelSubscriptionPage = React.lazy(() =>
  import('./pages/billing/BillingPages').then((module) => ({ default: module.CancelSubscriptionPage })),
);
const PlanChangePage = React.lazy(() =>
  import('./pages/billing/BillingPages').then((module) => ({ default: module.PlanChangePage })),
);
const StandaloneCheckoutPage = React.lazy(() =>
  import('./pages/billing/BillingPages').then((module) => ({ default: module.StandaloneCheckoutPage })),
);
const SubscriptionBillingPage = React.lazy(() =>
  import('./pages/billing/BillingPages').then((module) => ({ default: module.SubscriptionBillingPage })),
);
const UsageLimitsPage = React.lazy(() =>
  import('./pages/billing/BillingPages').then((module) => ({ default: module.UsageLimitsPage })),
);
const AcceptInvitationPage = React.lazy(() =>
  import('./pages/workspace/AccountAndOrgPages').then((module) => ({ default: module.AcceptInvitationPage })),
);
const SettingsPage = React.lazy(() =>
  import('./pages/workspace/AccountAndOrgPages').then((module) => ({ default: module.SettingsPage })),
);
const TeamsOrganisationPage = React.lazy(() =>
  import('./pages/workspace/AccountAndOrgPages').then((module) => ({ default: module.TeamsOrganisationPage })),
);
const BrandSystemPage = React.lazy(() =>
  import('./pages/workspace/CommercialSupportAndBrandPages').then((module) => ({
    default: module.BrandSystemPage,
  })),
);
const FirstTimeUserExperiencePage = React.lazy(() =>
  import('./pages/workspace/CommercialSupportAndBrandPages').then((module) => ({
    default: module.FirstTimeUserExperiencePage,
  })),
);
const IntegrationsPage = React.lazy(() =>
  import('./pages/workspace/CommercialSupportAndBrandPages').then((module) => ({ default: module.IntegrationsPage })),
);
const DashboardPage = React.lazy(() =>
  import('./pages/workspace/DashboardPage').then((module) => ({ default: module.DashboardPage })),
);
const CountryDiscoveryPage = React.lazy(() =>
  import('./pages/workspace/DiscoveryPages').then((module) => ({ default: module.CountryDiscoveryPage })),
);
const DiscoverCommercialPage = React.lazy(() =>
  import('./pages/workspace/DiscoveryPages').then((module) => ({ default: module.DiscoverCommercialPage })),
);
const DiscoverExplorerPage = React.lazy(() =>
  import('./pages/workspace/DiscoveryPages').then((module) => ({ default: module.DiscoverExplorerPage })),
);
const DiscoverGovernmentPage = React.lazy(() =>
  import('./pages/workspace/DiscoveryPages').then((module) => ({ default: module.DiscoverGovernmentPage })),
);
const DiscoverGrantsPage = React.lazy(() =>
  import('./pages/workspace/DiscoveryPages').then((module) => ({ default: module.DiscoverGrantsPage })),
);
const DiscoverSearchResultsPage = React.lazy(() =>
  import('./pages/workspace/DiscoveryPages').then((module) => ({ default: module.DiscoverSearchResultsPage })),
);
const OpportunityComparisonPage = React.lazy(() =>
  import('./pages/workspace/DiscoveryPages').then((module) => ({ default: module.OpportunityComparisonPage })),
);
const SourceDetailPage = React.lazy(() =>
  import('./pages/workspace/DiscoveryPages').then((module) => ({ default: module.SourceDetailPage })),
);
const AlertsMonitoringPage = React.lazy(() =>
  import('./pages/workspace/IntelligenceAndMonitoringPages').then((module) => ({
    default: module.AlertsMonitoringPage,
  })),
);
const AnalyticsPage = React.lazy(() =>
  import('./pages/workspace/IntelligenceAndMonitoringPages').then((module) => ({ default: module.AnalyticsPage })),
);
const IntelligenceWorkspacePage = React.lazy(() =>
  import('./pages/workspace/IntelligenceAndMonitoringPages').then((module) => ({
    default: module.IntelligenceWorkspacePage,
  })),
);
const MatchedOpportunitiesPage = React.lazy(() =>
  import('./pages/workspace/IntelligenceAndMonitoringPages').then((module) => ({
    default: module.MatchedOpportunitiesPage,
  })),
);
const NotificationsCentrePage = React.lazy(() =>
  import('./pages/workspace/IntelligenceAndMonitoringPages').then((module) => ({
    default: module.NotificationsCentrePage,
  })),
);
const ReportsPage = React.lazy(() =>
  import('./pages/workspace/IntelligenceAndMonitoringPages').then((module) => ({ default: module.ReportsPage })),
);
const OpportunityDetailPage = React.lazy(() =>
  import('./pages/workspace/OpportunityDetailPage').then((module) => ({ default: module.OpportunityDetailPage })),
);
const MyOpportunitiesPage = React.lazy(() =>
  import('./pages/workspace/PersonalWorkspacePages').then((module) => ({ default: module.MyOpportunitiesPage })),
);
const OpportunityPreparationPage = React.lazy(() =>
  import('./pages/workspace/PersonalWorkspacePages').then((module) => ({
    default: module.OpportunityPreparationPage,
  })),
);
const SavedOpportunitiesPage = React.lazy(() =>
  import('./pages/workspace/PersonalWorkspacePages').then((module) => ({ default: module.SavedOpportunitiesPage })),
);
const SavedSearchesPage = React.lazy(() =>
  import('./pages/workspace/PersonalWorkspacePages').then((module) => ({ default: module.SavedSearchesPage })),
);
const SearchHistoryPage = React.lazy(() =>
  import('./pages/workspace/PersonalWorkspacePages').then((module) => ({ default: module.SearchHistoryPage })),
);
const AccountSecurityPage = React.lazy(() =>
  import('./pages/workspace/PlatformOperationsPages').then((module) => ({ default: module.AccountSecurityPage })),
);
const ActivityAuditPage = React.lazy(() =>
  import('./pages/workspace/PlatformOperationsPages').then((module) => ({ default: module.ActivityAuditPage })),
);
const GlobalPreferencesPage = React.lazy(() =>
  import('./pages/workspace/PlatformOperationsPages').then((module) => ({ default: module.GlobalPreferencesPage })),
);
const SupportTicketsPage = React.lazy(() =>
  import('./pages/workspace/PlatformOperationsPages').then((module) => ({ default: module.SupportTicketsPage })),
);
const SystemStatusPage = React.lazy(() =>
  import('./pages/workspace/PlatformOperationsPages').then((module) => ({ default: module.SystemStatusPage })),
);
const UserJourneysPage = React.lazy(() =>
  import('./pages/workspace/PlatformOperationsPages').then((module) => ({ default: module.UserJourneysPage })),
);

function WorkspaceRoutes({ path }: { path: string }) {
  const { isAdminAuthorized } = useAppState();

  const route = () => {
    // Public status board (reads only connection state, never records)
    if (path === '/status') return <SystemStatusPage />;

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

    if (path === '/saved') return <SavedOpportunitiesPage />;
    if (path === '/saved-searches') return <SavedSearchesPage />;
    if (path === '/search-history') return <SearchHistoryPage />;
    if (path === '/my-opportunities') return <MyOpportunitiesPage />;
    if (path.startsWith('/my-opportunities/')) {
      return <OpportunityPreparationPage pipelineId={path.replace('/my-opportunities/', '')} />;
    }

    if (path === '/intelligence') return <IntelligenceWorkspacePage />;
    if (path === '/alerts') return <AlertsMonitoringPage />;
    if (path === '/notifications') return <NotificationsCentrePage />;
    if (path === '/analytics') return <AnalyticsPage />;
    if (path === '/reports') return <ReportsPage />;

    if (path === '/teams') return <TeamsOrganisationPage />;
    if (path === '/accept-invitation') return <AcceptInvitationPage />;
    if (path === '/profile') {
      return <SettingsPage initialTab="profile" title="My Profile" breadcrumb="Workspace / My Profile" />;
    }
    if (path === '/settings') return <SettingsPage />;
    if (path === '/settings/security') return <AccountSecurityPage />;
    if (path === '/settings/preferences') return <GlobalPreferencesPage />;
    if (path === '/settings/activity') return <ActivityAuditPage adminMode={false} />;

    if (path === '/checkout') return <StandaloneCheckoutPage />;
    if (path === '/billing' || path === '/settings/billing') return <SubscriptionBillingPage />;
    if (path === '/settings/usage') return <UsageLimitsPage />;
    if (path === '/settings/billing/history') return <BillingHistoryPage />;
    if (path === '/settings/billing/change') return <PlanChangePage />;
    if (path === '/settings/billing/cancel') return <CancelSubscriptionPage />;

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

    if (path === '/integrations') return <IntegrationsPage />;
    if (path === '/support' || path === '/help') return <SupportTicketsPage />;

    if (path === '/first-time') return isAdminAuthorized ? <FirstTimeUserExperiencePage /> : <NotFoundScreen />;
    if (path === '/journeys') return isAdminAuthorized ? <UserJourneysPage /> : <NotFoundScreen />;
    if (path === '/brand-system') return isAdminAuthorized ? <BrandSystemPage /> : <NotFoundScreen />;

    return <NotFoundScreen />;
  };

  const content = (
    <Suspense
      fallback={
        <div role="status" className="px-4 py-24 text-center text-sm text-[#526070] dark:text-[#CBD5E1]">
          Loading…
        </div>
      }
    >
      {route()}
    </Suspense>
  );

  return isGatedPath(path) ? <AuthGate>{content}</AuthGate> : content;
}

export default function WorkspaceApp({ path }: { path: string }) {
  return (
    <AuthProvider>
      <OrganizationProvider>
        <AppStateProvider>
          <WorkspaceRoutes path={path} />
          <ToastContainer />
        </AppStateProvider>
      </OrganizationProvider>
    </AuthProvider>
  );
}
