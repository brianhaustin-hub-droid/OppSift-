import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import type { OpportunityCategory } from "../features/opportunities/opportunity-feed";
import { AuthPage } from "./auth/AuthPages";
import { AuthProvider, useAuth } from "./auth/AuthProvider";
import { OrganizationProvider } from "./organizations/OrganizationProvider";
import { AcceptInvitationPage } from "./organizations/OrganizationPages";
import { RouteLink, useCurrentLocation, RouterProvider } from "./routing/router";
import { resolveRoute } from "./routing/routes";
import { currentPreviewRole, hasPermission } from "./security/permissions";
import { GlobalSidebar } from "./shell/GlobalSidebar";
import { GlobalTopbar } from "./shell/GlobalTopbar";
import {
  getPageTitle,
  PlatformBreadcrumbs,
  PlatformPage,
} from "./PlatformPage";
import { PublicLayout } from "../features/public/PublicLayout";
import { HomePage } from "../features/public/HomePage";
import { MarketsPage } from "../features/public/MarketsPage";
import { PlatformPublicPage } from "../features/public/PlatformPublicPage";
import { SolutionsPage } from "../features/public/SolutionsPage";
import { HowItWorksPage } from "../features/public/HowItWorksPage";
import { OpportunityCategoriesPage } from "../features/public/OpportunityCategoriesPage";
import { AboutPage } from "../features/public/AboutPage";
import { ContactPage } from "../features/public/ContactPage";
import "./app.css";

type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "oppsift-theme";
const authenticatedRoutes = new Set([
  "dashboard",
  "saved",
  "applications",
  "teams",
  "alerts",
  "analytics",
  "settings",
]);

function readThemePreference(): Theme {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark"
      ? "dark"
      : "light";
  } catch (error) {
    console.error("Unable to read the saved theme preference.", error);
    return "light";
  }
}

function AuthenticationRequired({
  children,
  loading,
  location,
  user,
}: {
  children: ReactNode;
  loading: boolean;
  location: string;
  user: ReturnType<typeof useAuth>["user"];
}) {
  if (loading) {
    return <p className="auth-panel" role="status">Checking your account…</p>;
  }
  if (!user) {
    return (
      <section className="auth-panel">
        <p className="page-heading__eyebrow">Account access</p>
        <h1>Sign in to continue</h1>
        <p>This workspace area requires an authenticated account.</p>
        <RouteLink
          className="ui-button ui-button--primary"
          href={`/login?redirectTo=${encodeURIComponent(location)}`}
        >
          Sign in
        </RouteLink>
      </section>
    );
  }
  if (!user.emailVerified) {
    return (
      <section className="auth-panel">
        <p className="page-heading__eyebrow">Account verification</p>
        <h1>Verify your email to continue</h1>
        <p>Organization and account data is available after email verification.</p>
        <RouteLink
          className="ui-button ui-button--primary"
          href={`/verify-email?email=${encodeURIComponent(user.email)}`}
        >
          Verify email
        </RouteLink>
      </section>
    );
  }
  return children;
}

function PlatformApplication() {
  const auth = useAuth();
  const location = useCurrentLocation();
  const pathname = location.split(/[?#]/, 1)[0] || "/";
  const search = location.includes("?")
    ? location.slice(location.indexOf("?") + 1).split("#", 1)[0]
    : "";
  const route = useMemo(() => resolveRoute(pathname), [pathname]);
  const pageTitle = getPageTitle(route);
  const [theme, setTheme] = useState<Theme>(readThemePreference);
  const [collapsed, setCollapsed] = useState(true);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [country, setCountry] = useState<string | "all">("all");
  const [category, setCategory] = useState<OpportunityCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState(
    () => new URLSearchParams(window.location.search).get("q") ?? "",
  );
  const sidebarCollapsed = collapsed && !sidebarHovered;

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    const backgroundColor = window
      .getComputedStyle(document.documentElement)
      .getPropertyValue("--color-background")
      .trim();
    if (backgroundColor) {
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", backgroundColor);
    }

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      console.error("Unable to save the theme preference.", error);
    }
  }, [theme]);

  useEffect(() => {
    document.title = `${pageTitle} · OppSift`;
    document.getElementById("platform-main")?.focus({ preventScroll: true });
  }, [location, pageTitle]);

  useEffect(() => {
    function syncLocationState() {
      const currentParams = new URLSearchParams(window.location.search);
      setSearchQuery(currentParams.get("q") ?? "");
      const categoryParam = currentParams.get("category");
      if (
        categoryParam === "all" ||
        categoryParam === "government" ||
        categoryParam === "grants" ||
        categoryParam === "commercial"
      ) {
        setCategory(categoryParam);
      } else if (window.location.pathname === "/discover/government") {
        setCategory("government");
      } else if (window.location.pathname === "/discover/grants") {
        setCategory("grants");
      } else if (window.location.pathname === "/discover/commercial") {
        setCategory("commercial");
      }
      setMobileNavigationOpen(false);
      setSidebarHovered(false);
    }

    window.addEventListener("popstate", syncLocationState);
    return () => window.removeEventListener("popstate", syncLocationState);
  }, []);

  useEffect(() => {
    if (!mobileNavigationOpen) return;

    document
      .querySelector<HTMLElement>("#platform-navigation nav a")
      ?.focus({ preventScroll: true });

    function closeNavigationOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileNavigationOpen(false);
        document
          .querySelector<HTMLButtonElement>(".mobile-menu-button")
          ?.focus({ preventScroll: true });
      }
    }

    window.addEventListener("keydown", closeNavigationOnEscape);
    return () => window.removeEventListener("keydown", closeNavigationOnEscape);
  }, [mobileNavigationOpen]);

  // Handle Public Website Routes
  if (route.kind === "public") {
    return (
      <PublicLayout currentPath={pathname}>
        {route.page === "home" && <HomePage />}
        {route.page === "markets" && <MarketsPage />}
        {route.page === "platform" && <PlatformPublicPage />}
        {route.page === "opportunities" && <OpportunityCategoriesPage />}
        {route.page === "solutions" && <SolutionsPage />}
        {route.page === "how-it-works" && <HowItWorksPage />}
        {route.page === "about" && <AboutPage />}
        {route.page === "contact" && <ContactPage />}
      </PublicLayout>
    );
  }

  if (route.kind === "auth") {
    return (
      <div className="auth-app-shell">
        <AuthPage key={location} page={route.page} />
      </div>
    );
  }

  const accessibleRoute =
    route.kind === "page" &&
    route.route.permission &&
    !hasPermission(currentPreviewRole, route.route.permission)
      ? {
          kind: "page" as const,
          route: { ...route.route, status: "restricted" as const },
        }
      : route;
  const requiresAccount =
    route.kind === "page" && authenticatedRoutes.has(route.route.id);

  return (
    <div className={`platform-shell ${sidebarCollapsed ? "platform-shell--collapsed" : ""}`}>
      <GlobalSidebar
        collapsed={sidebarCollapsed}
        location={{ pathname, search }}
        mobileOpen={mobileNavigationOpen}
        onNavigate={() => setMobileNavigationOpen(false)}
        onToggleCollapsed={() => setCollapsed((value) => !value)}
        onInteractionExpand={setSidebarHovered}
      />

      <div className="platform-main">
        <GlobalTopbar
          category={category}
          country={country}
          onCategoryChange={setCategory}
          onCountryChange={setCountry}
          mobileNavigationOpen={mobileNavigationOpen}
          onOpenMobileNavigation={() =>
            setMobileNavigationOpen((isOpen) => !isOpen)
          }
          onToggleTheme={() =>
            setTheme((value) => (value === "light" ? "dark" : "light"))
          }
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          theme={theme}
        />
        <main
          aria-label="Main content"
          className="platform-content"
          id="platform-main"
          tabIndex={-1}
        >
          <PlatformBreadcrumbs route={accessibleRoute} />
          {route.kind === "accept-invitation" ? (
            <AcceptInvitationPage key={location} />
          ) : requiresAccount ? (
            <AuthenticationRequired
              loading={auth.loading}
              location={location}
              user={auth.user}
            >
              {route.kind === "page" && route.route.id === "dashboard" ? (
                <DashboardPage
                  category={category}
                  country={country}
                  query={searchQuery}
                />
              ) : (
                <PlatformPage
                  category={category}
                  country={country}
                  locationQuery={search}
                  onCategoryChange={setCategory}
                  path={pathname}
                  route={accessibleRoute}
                  userId={auth.user?.id}
                />
              )}
            </AuthenticationRequired>
          ) : route.kind === "page" && route.route.id === "dashboard" ? (
            <DashboardPage
              category={category}
              country={country}
              query={searchQuery}
            />
          ) : (
            <PlatformPage
              category={category}
              country={country}
              locationQuery={search}
              onCategoryChange={setCategory}
              path={pathname}
              route={accessibleRoute}
              userId={auth.user?.id}
            />
          )}
        </main>
        <footer className="platform-footer">
          <span>OppSift · Global Opportunity Intelligence</span>
          <span>
            {auth.user ? "Authenticated account" : "Guest workspace"}
          </span>
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <OrganizationProvider>
          <PlatformApplication />
        </OrganizationProvider>
      </AuthProvider>
    </RouterProvider>
  );
}
