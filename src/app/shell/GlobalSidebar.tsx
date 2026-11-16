import { RouteLink } from "../routing/router";
import { routes, type RouteDefinition } from "../routing/routes";
import type { RouteLocation } from "../routing/route-types";
import { useAuth } from "../auth/AuthProvider";
import { BrandLogo } from "../../shared/ui/BrandLogo";
import { PlatformIcon, type PlatformIconName } from "./PlatformIcon";

type GlobalSidebarProps = {
  collapsed: boolean;
  location: RouteLocation;
  mobileOpen: boolean;
  onNavigate: () => void;
  onToggleCollapsed: () => void;
  onInteractionExpand: (expanded: boolean) => void;
};

const groupLabels = {
  workspace: "DISCOVER",
  manage: "WORKSPACE",
  account: "PREFERENCES",
} as const;

const routeIcons: Readonly<Record<string, PlatformIconName>> = {
  dashboard: "overview",
  discover: "search",
  government: "government",
  grants: "funding",
  commercial: "commercial",
  intelligence: "intelligence",
  saved: "saved",
  "my-opportunities": "applications",
  "backend-status": "settings",
  applications: "applications",
  teams: "team",
  alerts: "alerts",
  analytics: "analytics",
  settings: "settings",
  admin: "admin",
  support: "help",
};

function isRouteActive(route: RouteDefinition, pathname: string) {
  const normalizedPathname =
    pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;

  if (route.id === "dashboard") {
    return normalizedPathname === "/" || normalizedPathname === "/dashboard";
  }
  if (route.id === "discover") {
    return (
      normalizedPathname === "/discover" ||
      normalizedPathname === "/discover/search" ||
      normalizedPathname.startsWith("/discover/country/") ||
      normalizedPathname.startsWith("/opportunity/")
    );
  }
  if (route.id === "government") {
    return normalizedPathname === "/discover/government";
  }
  if (route.id === "grants") return normalizedPathname === "/discover/grants";
  if (route.id === "commercial") {
    return normalizedPathname === "/discover/commercial";
  }
  if (route.id === "admin") return normalizedPathname === "/admin";
  if (route.id === "support") return normalizedPathname.startsWith("/support");
  return (
    normalizedPathname === route.href ||
    normalizedPathname.startsWith(`${route.href}/`)
  );
}

function SidebarRoute({
  collapsed,
  onNavigate,
  pathname,
  route,
}: {
  collapsed: boolean;
  onNavigate: () => void;
  pathname: string;
  route: RouteDefinition;
}) {
  const active = isRouteActive(route, pathname);
  const planned = route.status === "planned";
  const restricted = route.status === "restricted";

  return (
    <RouteLink
      aria-label={
        collapsed
          ? `${route.label}${planned ? ", planned" : ""}${restricted ? ", permission required" : ""}`
          : undefined
      }
      className={`sidebar-link ${active ? "is-current" : ""} ${restricted ? "is-restricted" : ""}`}
      current={active}
      href={route.href}
      onClick={onNavigate}
      title={
        collapsed
          ? `${route.label}${planned ? " · Planned" : ""}${restricted ? " · Requires administrator permission" : ""}`
          : undefined
      }
    >
      <PlatformIcon name={routeIcons[route.id] ?? "overview"} />
      <span className="sidebar-link__label">{route.label}</span>
      {planned && !collapsed && (
        <span className="sidebar-link__status">Planned</span>
      )}
      {restricted && !collapsed && (
        <span className="sidebar-link__status" title="Admin permission required">
          Restricted
        </span>
      )}
    </RouteLink>
  );
}

export function GlobalSidebar({
  collapsed,
  location,
  mobileOpen,
  onNavigate,
  onToggleCollapsed,
  onInteractionExpand,
}: GlobalSidebarProps) {
  const { user } = useAuth();
  const groups = (["workspace", "manage", "account"] as const).map((group) => ({
    id: group,
    label: groupLabels[group],
    routes: routes.filter((route) => route.group === group),
  }));

  return (
    <>
      {mobileOpen && (
        <button
          aria-label="Close navigation"
          className="sidebar-backdrop"
          onClick={onNavigate}
          type="button"
        />
      )}
      <aside
        aria-label="OppSift platform navigation"
        className={`sidebar ${collapsed ? "sidebar--collapsed" : ""} ${mobileOpen ? "sidebar--mobile-open" : ""}`}
        id="platform-navigation"
        onPointerEnter={(event) => {
          if (event.pointerType !== "touch") onInteractionExpand(true);
        }}
        onPointerLeave={(event) => {
          if (
            event.pointerType !== "touch" &&
            !event.currentTarget.contains(document.activeElement)
          ) {
            onInteractionExpand(false);
          }
        }}
        onFocus={() => onInteractionExpand(true)}
        onBlur={(event) => {
          const nextTarget = event.relatedTarget;
          if (
            !(nextTarget instanceof Node) ||
            !event.currentTarget.contains(nextTarget)
          ) {
            onInteractionExpand(false);
          }
        }}
      >
        <div className="sidebar__brand-row">
          <RouteLink
            aria-label="OppSift overview"
            className="sidebar__brand"
            href="/dashboard"
            onClick={onNavigate}
          >
            <BrandLogo
              markOnly={collapsed}
              size={collapsed ? "sm" : "md"}
              className="sidebar__brand-logo"
            />
          </RouteLink>
          <button
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            className="sidebar__collapse"
            onClick={onToggleCollapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            type="button"
          >
            <PlatformIcon name="collapse" />
          </button>
        </div>

        <nav aria-label="Platform" className="sidebar__nav">
          {groups.map((group) => (
            <div className="sidebar__group" key={group.id}>
              <p className="sidebar__group-label">{group.label}</p>
              {group.routes.map((route) => (
                <SidebarRoute
                  collapsed={collapsed}
                  key={route.id}
                  onNavigate={onNavigate}
                  pathname={location.pathname}
                  route={route}
                />
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar__footer">
          <span className="sidebar__preview-dot" aria-hidden="true" />
          <span className="sidebar__footer-copy">
            {user ? "Authenticated account" : "Guest workspace"}
          </span>
        </div>
      </aside>
    </>
  );
}
