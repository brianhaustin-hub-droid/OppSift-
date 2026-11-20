import {
  useEffect,
  useLayoutEffect,
  useMemo,
  type ReactNode,
} from "react";
import { AuthProvider, useAuth } from "./auth/AuthProvider";
import { OrganizationProvider } from "./organizations/OrganizationProvider";
import { RouteLink, useCurrentLocation, RouterProvider } from "./routing/router";
import { resolveRoute } from "./routing/routes";
import { currentPreviewRole, hasPermission } from "./security/permissions";
import { getPageTitle, getRoutePath } from "./route-titles";
import { ScreenPlaceholder } from "../features/placeholder/ScreenPlaceholder";
import { AuthScreenPlaceholder } from "./auth/AuthScreenPlaceholder";
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
    return <p className="integration-placeholder__note" role="status">Checking your account…</p>;
  }
  if (!user) {
    return (
      <section className="integration-placeholder">
        <p className="integration-placeholder__eyebrow">Account access</p>
        <h1>Sign in to continue</h1>
        <p className="integration-placeholder__note">
          This workspace area requires an authenticated account.
        </p>
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
      <section className="integration-placeholder">
        <p className="integration-placeholder__eyebrow">Account verification</p>
        <h1>Verify your email to continue</h1>
        <p className="integration-placeholder__note">
          Organization and account data is available after email verification.
        </p>
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
  const route = useMemo(() => resolveRoute(pathname), [pathname]);
  const pageTitle = getPageTitle(route);
  const theme = useMemo(readThemePreference, []);

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
  }, [location, pageTitle]);

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
    accessibleRoute.kind === "page" && authenticatedRoutes.has(accessibleRoute.route.id);
  const path = getRoutePath(accessibleRoute);
  const title = pageTitle;

  // Public routes: minimal placeholder boundary (visual design pending Stitch).
  if (accessibleRoute.kind === "public") {
    return (
      <div className="platform-shell">
        <ScreenPlaceholder path={path} title={title} />
      </div>
    );
  }

  // Auth routes: keep Neon Managed Auth wiring; visual layer removed.
  if (accessibleRoute.kind === "auth") {
    return (
      <div className="platform-shell">
        <AuthScreenPlaceholder page={accessibleRoute.page} />
      </div>
    );
  }

  if (accessibleRoute.kind === "accept-invitation") {
    return (
      <div className="platform-shell">
        <ScreenPlaceholder path={path} title={title} />
      </div>
    );
  }

  const content = <ScreenPlaceholder path={path} title={title} />;
  return (
    <div className="platform-shell">
      {requiresAccount ? (
        <AuthenticationRequired
          loading={auth.loading}
          location={path}
          user={auth.user}
        >
          {content}
        </AuthenticationRequired>
      ) : (
        content
      )}
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
