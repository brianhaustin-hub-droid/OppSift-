import React, { useState } from 'react';
import {
  BarChart3,
  Bell,
  Bookmark,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Compass,
  Crown,
  FileText,
  Heart,
  HelpCircle,
  Kanban,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Plug,
  Search,
  Settings,
  Sparkles,
  Sun,
  Target,
  User,
  Users,
  X,
} from 'lucide-react';
import { LanguageSwitcher } from '../../../i18n/LanguageSwitcher';
import { useAppState } from '../../context/AppStateContext';
import { useRouter } from '../../context/RouterContext';
import { useTheme } from '../../context/ThemeContext';
import { OppSiftLogo } from '../brand/OppSiftLogo';
import { GlobalSearchOverlay } from '../navigation/GlobalSearchOverlay';
import { DataSourceBanner } from '../ui/DataSourceBanner';
import { GlobalStatePreviewBanner } from '../ui/StateViews';

const BREADCRUMB_ROUTE_MAP: Record<string, string> = {
  Workspace: '/dashboard',
  Discovery: '/discover',
  Explorer: '/discover',
  Opportunities: '/discover',
  'Matched Opportunities': '/matched',
  'Saved Opportunities': '/saved',
  'Saved Searches': '/saved-searches',
  Alerts: '/alerts',
  Analytics: '/analytics',
  Reports: '/reports',
  'AI Intelligence': '/intelligence',
  Intelligence: '/intelligence',
  Pipeline: '/my-opportunities',
  'My Pipeline': '/my-opportunities',
  Teams: '/teams',
  Account: '/settings',
  Settings: '/settings',
  Billing: '/settings/billing',
  'Subscription & Billing': '/settings/billing',
  'My Profile': '/profile',
  Integrations: '/integrations',
  Support: '/support',
  'Help & Support': '/support',
};

export function WorkspaceLayout({
  title,
  breadcrumb,
  children,
}: {
  title: string;
  breadcrumb?: string;
  children: React.ReactNode;
}) {
  const { path, navigate } = useRouter();
  const { resolvedTheme, setPreference } = useTheme();
  const {
    notifications,
    markAllNotificationsRead,
    markNotificationRead,
    onboarding,
    globalStateMode,
    setGlobalStateMode,
    setGlobalSearchOpen,
    compareIds,
    savedIds,
    isSignedIn,
    setIsSignedIn,
    subscription,
    planCatalog,
    pushToast,
  } = useAppState();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const activePlan = planCatalog.find((p) => p.id === subscription.planId) ?? planCatalog[0];

  const primaryNav = [
    { label: 'Dashboard', route: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: 'Discover Opportunities', route: '/discover', icon: <Compass className="w-4 h-4" /> },
    { label: 'Matched for You', route: '/matched', icon: <Target className="w-4 h-4" /> },
    { label: 'Saved Opportunities', route: '/saved', icon: <Heart className="w-4 h-4" />, count: savedIds.length },
    { label: 'Saved Searches', route: '/saved-searches', icon: <Bookmark className="w-4 h-4" /> },
    { label: 'Alerts', route: '/alerts', icon: <Bell className="w-4 h-4" />, count: unreadCount },
    { label: 'Analytics', route: '/analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { label: 'Reports', route: '/reports', icon: <FileText className="w-4 h-4" /> },
    { label: 'AI Intelligence', route: '/intelligence', icon: <Sparkles className="w-4 h-4" /> },
    { label: 'My Pipeline', route: '/my-opportunities', icon: <Kanban className="w-4 h-4" /> },
    { label: 'Teams', route: '/teams', icon: <Users className="w-4 h-4" /> },
    { label: 'My Profile', route: '/profile', icon: <User className="w-4 h-4" /> },
    { label: 'Settings', route: '/settings', icon: <Settings className="w-4 h-4" /> },
    { label: 'Integrations', route: '/integrations', icon: <Plug className="w-4 h-4" /> },
    { label: 'Help & Support', route: '/support', icon: <HelpCircle className="w-4 h-4" /> },
  ];

  const isRouteActive = (route: string) => {
    if (route === '/discover' && (path.startsWith('/discover') || path.startsWith('/opportunity/') || path.startsWith('/sources/'))) {
      return true;
    }
    if (route === '/my-opportunities' && (path.startsWith('/my-opportunities') || path === '/search-history')) {
      return true;
    }
    if (route === '/settings' && (path === '/settings' || path.startsWith('/settings/') || path === '/billing' || path === '/checkout')) {
      return true;
    }
    if (route === '/support' && (path === '/support' || path === '/help')) return true;
    if (route === '/alerts' && (path === '/alerts' || path === '/notifications')) return true;
    return path === route;
  };

  const breadcrumbParts = (breadcrumb || 'Workspace').split('/').map((s) => s.trim()).filter(Boolean);

  const renderSidebarContent = (isMobile = false) => (
    <div className="relative flex flex-col h-full text-white overflow-hidden">
      {/* Subtle geometric globe meridian watermark */}
      <svg
        viewBox="0 0 220 220"
        aria-hidden="true"
        className="pointer-events-none absolute bottom-10 -left-14 w-64 h-64 opacity-[0.12] text-white"
      >
        <circle cx="110" cy="110" r="90" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 4" />
        <ellipse cx="110" cy="110" rx="45" ry="90" fill="none" stroke="currentColor" strokeWidth="1" />
        <ellipse cx="110" cy="110" rx="72" ry="90" fill="none" stroke="currentColor" strokeWidth="0.7" />
        <line x1="20" y1="110" x2="200" y2="110" stroke="currentColor" strokeWidth="1" />
        <line x1="35" y1="65" x2="185" y2="65" stroke="currentColor" strokeWidth="0.9" />
        <line x1="35" y1="155" x2="185" y2="155" stroke="currentColor" strokeWidth="0.9" />
      </svg>

      {/* Brand Header */}
      <div className="relative z-10 h-18 px-4 pt-3 pb-2 flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={() => {
            navigate('/dashboard');
            if (isMobile) setMobileDrawerOpen(false);
          }}
          className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded-lg"
        >
          {collapsed && !isMobile ? (
            <OppSiftLogo variant="app-icon" size="sm" />
          ) : (
            <div className="flex flex-col">
              <OppSiftLogo variant="compact" size="md" />
              <span className="text-[10.5px] text-[#FFD1DF]/90 pl-[46px] -mt-1 tracking-wide">
                Find. Analyze. Win.
              </span>
            </div>
          )}
        </button>

        {!isMobile ? (
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1.5 rounded-lg text-white/75 hover:text-white hover:bg-white/10 transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(false)}
            aria-label="Close navigation drawer"
            className="p-1.5 rounded-lg text-white/75 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Customer Navigation Items */}
      <nav aria-label="Workspace navigation" className="relative z-10 flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {primaryNav.map((item) => {
          const active = isRouteActive(item.route);
          return (
            <button
              key={item.route}
              type="button"
              onClick={() => {
                navigate(item.route);
                if (isMobile) setMobileDrawerOpen(false);
              }}
              title={collapsed && !isMobile ? item.label : undefined}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-[13px] font-medium transition-colors whitespace-nowrap ${
                active
                  ? 'oppsift-sidebar-active text-white font-semibold'
                  : 'text-white/85 hover:text-white hover:bg-white/10'
              } ${collapsed && !isMobile ? 'justify-center px-2' : ''}`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <span className="shrink-0">{item.icon}</span>
                {(!collapsed || isMobile) && <span className="truncate">{item.label}</span>}
              </span>
              {(!collapsed || isMobile) && typeof item.count === 'number' && item.count > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-[#E11D48] text-white font-mono text-[10.5px] tabular-nums font-semibold">
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Plan Upgrade Card */}
      {(!collapsed || isMobile) && (
        <div className="relative z-10 p-3 shrink-0">
          <div className="rounded-lg border border-white/15 bg-black/30 p-3.5 text-center space-y-2">
            <div className="mx-auto w-8 h-8 rounded-md bg-[#F59E0B]/20 text-[#FBBF24] flex items-center justify-center border border-[#FBBF24]/30">
              <Crown className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">
                {activePlan.id === 'free' ? 'Upgrade to Pro' : `${activePlan.name} Plan`}
              </p>
              <p className="text-[11px] text-white/75 leading-snug mt-0.5">
                {activePlan.id === 'free'
                  ? 'Unlock unlimited global alerts and AI eligibility reviews.'
                  : 'Manage subscription, usage limits, and invoices.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                navigate('/settings/billing');
                if (isMobile) setMobileDrawerOpen(false);
              }}
              className="w-full py-1.5 px-4 rounded-md bg-[#C93564] hover:bg-[#DF4574] text-white text-xs font-semibold transition-colors"
            >
              Manage Plan →
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex oppsift-workspace-canvas text-[#172033] dark:text-[#F8FAFC] transition-colors">
      {/* Desktop Left Burgundy Gradient Sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 oppsift-sidebar-gradient border-r border-[#251019]/50 transition-all duration-200 sticky top-0 h-screen ${
          collapsed ? 'w-[76px]' : 'w-[252px]'
        }`}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/55" onClick={() => setMobileDrawerOpen(false)} />
          <aside className="relative w-72 max-w-[85vw] h-full oppsift-sidebar-gradient z-10 shadow-2xl">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-16 px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-4 border-b border-[#E5E7EB]/80 dark:border-white/8 bg-[#F6F5F9]/85 dark:bg-[#110917]/80 backdrop-blur-md">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 rounded-lg border border-[#E2E8F0] dark:border-white/15 shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Universal Search Trigger (Ctrl + K) */}
            <button
              type="button"
              onClick={() => setGlobalSearchOpen(true)}
              className="flex-1 min-w-0 max-w-xl h-9 px-3 sm:px-3.5 rounded-md border border-[#E2E8F0] dark:border-white/14 bg-white dark:bg-white/6 hover:border-[#A33B59]/60 flex items-center justify-between gap-2 text-left transition-colors"
            >
              <span className="flex items-center gap-2 min-w-0 text-xs sm:text-sm text-[#64748B] dark:text-[#CBD5E1]">
                <Search className="w-4 h-4 shrink-0" />
                <span className="truncate sm:hidden">Search opportunities...</span>
                <span className="hidden sm:inline truncate">Search opportunities across supported jurisdictions...</span>
              </span>
              <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded border border-[#E2E8F0] dark:border-white/15 bg-[#F8FAFC] dark:bg-white/8 font-mono text-[11px] text-[#64748B] dark:text-[#CBD5E1] shrink-0">
                Ctrl + K
              </kbd>
            </button>
          </div>

          {/* Right Controls: Compare Tray, Theme Toggle, Notifications, Account */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 relative">
            {compareIds.length > 0 && (
              <button
                type="button"
                onClick={() => navigate('/discover/compare')}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#A33B59]/40 bg-[#FFF1F2] dark:bg-[#541B32]/40 text-[#541B32] dark:text-[#E8A4B5] text-xs font-semibold whitespace-nowrap"
              >
                <span>Compare ({compareIds.length})</span>
              </button>
            )}

            <LanguageSwitcher />

            {/* Dual-Theme Moon/Sun Switcher */}
            <div
              role="group"
              aria-label="Theme switcher"
              className="inline-flex items-center p-0.5 rounded-md border border-[#E2E8F0] dark:border-white/15 bg-[#ECEAF2] dark:bg-[#22142B]"
            >
              <button
                type="button"
                onClick={() => setPreference('dark')}
                aria-label="Dark mode"
                className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
                  resolvedTheme === 'dark'
                    ? 'bg-[#6A2040] text-white'
                    : 'text-[#64748B] hover:text-[#172033]'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPreference('light')}
                aria-label="Light mode"
                className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
                  resolvedTheme === 'light'
                    ? 'bg-white text-[#541B32] shadow-xs'
                    : 'text-[#CBD5E1] hover:text-white'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((v) => !v);
                  setAccountOpen(false);
                }}
                aria-label="Notifications"
                className="relative p-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <Bell className="w-[18px] h-[18px]" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded bg-[#E11D48] text-white text-[10px] font-mono tabular-nums font-semibold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-16 sm:top-full sm:mt-2 w-auto sm:w-96 rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-white dark:bg-[#181326] shadow-lg z-40 overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#E2E8F0] dark:border-white/10 flex items-center justify-between">
                    <span className="font-display text-sm font-semibold">Notifications</span>
                    <div className="flex items-center gap-3 text-xs">
                      <button
                        type="button"
                        onClick={markAllNotificationsRead}
                        className="text-[#164E8B] dark:text-[#38BDF8] hover:underline"
                      >
                        Mark all read
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNotifOpen(false);
                          navigate('/notifications');
                        }}
                        className="text-[#541B32] dark:text-[#E8A4B5] font-medium hover:underline"
                      >
                        View all
                      </button>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-[#E2E8F0] dark:divide-white/10">
                    {notifications.slice(0, 4).map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => {
                          markNotificationRead(n.id);
                          setNotifOpen(false);
                          navigate('/notifications');
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-[#F8FAFC] dark:hover:bg-white/6 transition-colors ${
                          !n.read ? 'bg-[#FFF1F2]/50 dark:bg-[#541B32]/20' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px] text-[#64748B] dark:text-[#CBD5E1]">
                          <span>{n.type} · {n.read ? 'Read' : 'Unread'}</span>
                          <span className="font-mono tabular-nums">{n.timestamp}</span>
                        </div>
                        <p className="text-xs font-semibold mt-1">{n.title}</p>
                        <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] mt-0.5 line-clamp-2">{n.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Clean Customer Account Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setAccountOpen((v) => !v);
                  setNotifOpen(false);
                }}
                aria-label="Account menu"
                className="flex items-center gap-2 pl-1 pr-1 sm:pr-1.5 py-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <span className="w-8 h-8 rounded-full oppsift-sidebar-active text-white text-xs font-semibold flex items-center justify-center shrink-0">
                  {onboarding.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
                <div className="hidden md:block text-left leading-tight">
                  <p className="text-xs font-semibold max-w-[125px] truncate">{onboarding.fullName}</p>
                  <p className="text-[10.5px] text-[#64748B] dark:text-[#CBD5E1]">{activePlan.name} Plan</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#64748B] hidden md:block" />
              </button>

              {accountOpen && (
                <div className="absolute right-0 mt-2 w-60 max-w-[calc(100vw-1.5rem)] rounded-lg border border-[#E2E8F0] dark:border-white/12 bg-white dark:bg-[#181326] shadow-lg p-1.5 z-40">
                  <div className="px-3 py-2 border-b border-[#E2E8F0] dark:border-white/10 mb-1">
                    <p className="text-xs font-semibold truncate">{onboarding.fullName}</p>
                    <p className="text-[11px] text-[#64748B] dark:text-[#CBD5E1] truncate">{onboarding.organisationName}</p>
                  </div>
                  {[
                    { label: 'My Profile', route: '/profile', icon: <User className="w-3.5 h-3.5" /> },
                    { label: 'Account Settings', route: '/settings', icon: <Settings className="w-3.5 h-3.5" /> },
                    { label: 'Subscription & Billing', route: '/settings/billing', icon: <Crown className="w-3.5 h-3.5" /> },
                    { label: 'Help & Support', route: '/support', icon: <HelpCircle className="w-3.5 h-3.5" /> },
                  ].map((item) => (
                    <button
                      key={item.route}
                      type="button"
                      onClick={() => {
                        setAccountOpen(false);
                        navigate(item.route);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium hover:bg-[#F1F5F9] dark:hover:bg-white/8 text-left"
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  ))}

                  <div className="mt-1 pt-1 border-t border-[#E2E8F0] dark:border-white/10">
                    {isSignedIn ? (
                      <button
                        type="button"
                        onClick={() => {
                          setAccountOpen(false);
                          setIsSignedIn(false);
                          pushToast('info', 'You have signed out of your OppSift session.');
                          navigate('/auth');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[#DC2626] dark:text-[#FB7185] hover:bg-[#FFF1F2] dark:hover:bg-[#541B32]/30 text-left"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setAccountOpen(false);
                          navigate('/auth');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[#541B32] dark:text-[#E8A4B5] hover:bg-[#F1F5F9] dark:hover:bg-white/8 text-left"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Sign In</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Sub-header clickable breadcrumb strip for non-dashboard pages */}
        {path !== '/dashboard' && (
          <div className="px-4 sm:px-6 lg:px-8 pt-5 pb-1 max-w-[1440px] w-full mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#64748B] dark:text-[#CBD5E1]">
                {breadcrumbParts.map((part, idx) => {
                  const isLast = idx === breadcrumbParts.length - 1;
                  const target = BREADCRUMB_ROUTE_MAP[part];
                  return (
                    <React.Fragment key={`${part}-${idx}`}>
                      {idx > 0 && <span aria-hidden="true">/</span>}
                      {!isLast && target ? (
                        <button
                          type="button"
                          onClick={() => navigate(target)}
                          className="hover:text-[#541B32] dark:hover:text-[#E8A4B5] hover:underline transition-colors"
                        >
                          {part}
                        </button>
                      ) : (
                        <span className={isLast ? 'font-medium text-[#172033] dark:text-[#F8FAFC]' : ''}>
                          {part}
                        </span>
                      )}
                    </React.Fragment>
                  );
                })}
              </nav>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-[#172033] dark:text-[#F8FAFC] break-words">
                {title}
              </h1>
            </div>
          </div>
        )}

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto min-w-0">
          <DataSourceBanner />
          {globalStateMode !== 'normal' ? (
            <GlobalStatePreviewBanner
              mode={globalStateMode}
              onReset={() => setGlobalStateMode('normal')}
              onSignIn={() => {
                setGlobalStateMode('normal');
                navigate('/auth');
              }}
            />
          ) : (
            children
          )}
        </main>
      </div>

      <GlobalSearchOverlay />
    </div>
  );
}
