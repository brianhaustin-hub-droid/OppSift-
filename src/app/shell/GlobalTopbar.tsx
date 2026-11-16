import { useEffect, useRef, useState, type FormEvent } from "react";
import { RouteLink, useNavigate } from "../routing/router";
import type { OpportunityCategory } from "../../features/opportunities/opportunity-feed";
import { Button } from "../../shared/ui/components";
import { useAuth } from "../auth/AuthProvider";
import { useOrganizations } from "../organizations/OrganizationProvider";
import { PlatformIcon } from "./PlatformIcon";
import { getSupportedCountry, supportedCountries } from "../../features/opportunities/country-registry";

type GlobalTopbarProps = {
  category: OpportunityCategory | "all";
  onToggleTheme: () => void;
  onCategoryChange: (category: OpportunityCategory | "all") => void;
  onCountryChange: (country: string | "all") => void;
  onOpenMobileNavigation: () => void;
  mobileNavigationOpen: boolean;
  country: string | "all";
  theme: "light" | "dark";
  searchQuery: string;
  setSearchQuery: (query: string) => void;
};

function getRecentSearchTerms(storageKey: string) {
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return [];
    const value: unknown = JSON.parse(stored);
    if (
      typeof value !== "object" ||
      value === null ||
      !("history" in value) ||
      !Array.isArray(value.history)
    ) {
      throw new Error("Stored search history has an invalid shape.");
    }
    return value.history.flatMap((item) =>
      typeof item === "object" &&
      item !== null &&
      "query" in item &&
      typeof item.query === "string"
        ? [item.query]
        : [],
    ).slice(0, 3);
  } catch (error) {
    console.error("Unable to read recent search suggestions.", error);
    return [];
  }
}

const categoryOptions: readonly {
  label: string;
  value: OpportunityCategory | "all";
}[] = [
  { label: "All categories", value: "all" },
  { label: "Government contracts", value: "government" },
  { label: "Grants & funding", value: "grants" },
  { label: "Commercial opportunities", value: "commercial" },
];

export function GlobalTopbar({
  category,
  country,
  onToggleTheme,
  onCategoryChange,
  onCountryChange,
  onOpenMobileNavigation,
  mobileNavigationOpen,
  searchQuery,
  setSearchQuery,
  theme,
}: GlobalTopbarProps) {
  const navigate = useNavigate();
  const { configured, signOut, user } = useAuth();
  const {
    activeOrganization,
    error: organizationError,
    loading: organizationsLoading,
    organizations,
    setActiveOrganization,
  } = useOrganizations();
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [suggestionQuery, setSuggestionQuery] = useState(searchQuery);
  const noticeRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const discoveryStorageKey = `oppsift-discovery-preview:${user?.id ?? "anonymous"}`;

  useEffect(() => {
    setRecentSearches([]);
  }, [discoveryStorageKey]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setSuggestionQuery(searchQuery),
      180,
    );
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    function closePopovers(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setNoticeOpen(false);
        setWorkspaceOpen(false);
        setProfileOpen(false);
        setFiltersOpen(false);
      }
    }

    function closeOutsidePopovers(event: PointerEvent) {
      if (!(event.target instanceof Node)) return;

      if (!noticeRef.current?.contains(event.target)) setNoticeOpen(false);
      if (!workspaceRef.current?.contains(event.target)) setWorkspaceOpen(false);
      if (!profileRef.current?.contains(event.target)) setProfileOpen(false);
      if (!filtersRef.current?.contains(event.target)) setFiltersOpen(false);
      if (!searchRef.current?.contains(event.target)) setSuggestionsOpen(false);
    }

    window.addEventListener("keydown", closePopovers);
    window.addEventListener("pointerdown", closeOutsidePopovers);
    return () => {
      window.removeEventListener("keydown", closePopovers);
      window.removeEventListener("pointerdown", closeOutsidePopovers);
    };
  }, []);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchQuery.trim();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (category !== "all") params.set("category", category);
    if (getSupportedCountry(country)) params.set("country", country);
    const search = params.toString();
    navigate(`/discover/search${search ? `?${search}` : ""}`);
    setSuggestionsOpen(false);
  }

  function chooseSearchSuggestion(query: string) {
    setSearchQuery(query);
    navigate(`/discover/search?q=${encodeURIComponent(query)}`);
    setSuggestionsOpen(false);
  }

  async function handleSignOut() {
    setSignOutError("");
    try {
      await signOut();
      setProfileOpen(false);
      navigate("/dashboard");
    } catch (error) {
      setSignOutError(
        error instanceof Error ? error.message : "Unable to sign out.",
      );
    }
  }

  const countryLabel =
    country === "all"
      ? "All markets"
      : (getSupportedCountry(country)?.name ?? "All markets");

  return (
    <header className="platform-topbar">
      <Button
        aria-controls="platform-navigation"
        aria-expanded={mobileNavigationOpen}
        aria-label={mobileNavigationOpen ? "Close navigation" : "Open navigation"}
        className="mobile-menu-button"
        onClick={onOpenMobileNavigation}
        size="icon"
        variant="secondary"
      >
        <PlatformIcon name="menu" />
      </Button>

      <div className="global-search-shell" ref={searchRef}>
        <form
          aria-label="Search opportunities"
          className="global-search"
          onSubmit={handleSearchSubmit}
          role="search"
        >
          <PlatformIcon name="search" />
          <input
            aria-autocomplete="list"
            aria-controls="global-search-suggestions"
            aria-expanded={suggestionsOpen}
            aria-label="Search opportunities"
            onChange={(event) => setSearchQuery(event.currentTarget.value)}
            onFocus={() => {
              setSuggestionsOpen(true);
              setRecentSearches(getRecentSearchTerms(discoveryStorageKey));
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") setSuggestionsOpen(false);
              if (event.key === "ArrowDown" && suggestionsOpen) {
                event.preventDefault();
                document.querySelector<HTMLButtonElement>("#global-search-suggestions button")?.focus();
              }
            }}
            placeholder="Search opportunities, sources, or markets"
            type="search"
            value={searchQuery}
          />
          <kbd aria-hidden="true">Enter</kbd>
          <Button
            aria-label="Submit search"
            className="global-search__submit"
            size="icon"
            type="submit"
            variant="tertiary"
          >
            <PlatformIcon name="search" />
          </Button>
        </form>
        {suggestionsOpen && (
          <div
            aria-label="Search suggestions"
            className="global-search-suggestions"
            id="global-search-suggestions"
            role="region"
          >
            {recentSearches.length > 0 && (
              <>
                <p>Recent searches</p>
                {recentSearches.map((recent, index) => (
                  <button
                    id={`global-search-recent-${index}`}
                    key={`${recent}-${index}`}
                    onClick={() => chooseSearchSuggestion(recent)}
                    type="button"
                  >
                    {recent}
                  </button>
                ))}
              </>
            )}
            <p>Suggested search terms</p>
            {["Renewable energy", "Construction tenders", "Healthcare supplies"]
              .filter((suggestion) =>
                !suggestionQuery ||
                suggestion.toLocaleLowerCase().includes(suggestionQuery.toLocaleLowerCase()),
              )
              .map((suggestion, index) => (
                <button
                  id={`global-search-suggestion-${index}`}
                  key={suggestion}
                  onClick={() => chooseSearchSuggestion(suggestion)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setSuggestionsOpen(false);
                      document.querySelector<HTMLInputElement>(".global-search input")?.focus();
                    } else if (event.key === "ArrowDown") {
                      event.preventDefault();
                      document.getElementById(`global-search-suggestion-${index + 1}`)?.focus();
                    } else if (event.key === "ArrowUp") {
                      event.preventDefault();
                      if (index === 0) {
                        document.querySelector<HTMLInputElement>(".global-search input")?.focus();
                      } else {
                        document.getElementById(`global-search-suggestion-${index - 1}`)?.focus();
                      }
                    }
                  }}
                  type="button"
                >
                  {suggestion}
                </button>
              ))}
            <p>Categories</p>
            <div className="global-search-suggestions__links">
              <RouteLink href="/discover/government" onClick={() => setSuggestionsOpen(false)}>Government</RouteLink>
              <RouteLink href="/discover/grants" onClick={() => setSuggestionsOpen(false)}>Grants & funding</RouteLink>
              <RouteLink href="/discover/commercial" onClick={() => setSuggestionsOpen(false)}>Commercial</RouteLink>
            </div>
            {supportedCountries
              .filter((market) =>
                suggestionQuery &&
                market.name.toLocaleLowerCase().includes(suggestionQuery.toLocaleLowerCase()),
              )
              .slice(0, 3)
              .map((market) => (
                <RouteLink
                  className="global-search-suggestions__country"
                  href={`/discover/country/${market.code}`}
                  key={market.code}
                  onClick={() => setSuggestionsOpen(false)}
                >
                  Explore {market.name}
                </RouteLink>
              ))}
            <button className="global-search-suggestions__close" onClick={() => setSuggestionsOpen(false)} type="button">Close suggestions</button>
          </div>
        )}
      </div>

      <div className="global-topbar__controls">
        <label className="topbar-select">
          <PlatformIcon name="globe" />
          <span className="ui-visually-hidden">Market filter</span>
          <select
            aria-label={`Market filter. Current selection: ${countryLabel}`}
            onChange={(event) =>
              onCountryChange(event.currentTarget.value)
            }
            value={country}
          >
            <option value="all">All markets</option>
            {supportedCountries.map((market) => (
              <option key={market.code} value={market.code}>
                {market.name}
              </option>
            ))}
          </select>
        </label>

        <label className="topbar-select topbar-select--category">
          <PlatformIcon name="categories" />
          <span className="ui-visually-hidden">Opportunity category filter</span>
          <select
            aria-label="Opportunity category filter"
            onChange={(event) => {
              const selected = categoryOptions.find(
                (option) => option.value === event.currentTarget.value,
              );
              if (selected) onCategoryChange(selected.value);
            }}
            value={category}
          >
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="topbar-popover topbar-popover--workspace" ref={workspaceRef}>
          <Button
            aria-expanded={workspaceOpen}
            aria-haspopup="dialog"
            className="workspace-picker"
            onClick={() => setWorkspaceOpen((open) => !open)}
            variant="secondary"
          >
            <PlatformIcon name="workspace" />
            <span>{activeOrganization?.name ?? (user ? "No organization" : "Workspace")}</span>
          </Button>
          {workspaceOpen && (
            <section
              aria-label="Organization selector"
              className="topbar-popover__panel"
              role="dialog"
            >
              {user ? (
                <>
                  {organizationsLoading ? (
                    <p role="status">Loading organizations…</p>
                  ) : organizations.length > 0 ? (
                    <label className="organization-switcher">
                      Active organization
                      <select
                        onChange={(event) => setActiveOrganization(event.currentTarget.value)}
                        value={activeOrganization?.id ?? ""}
                      >
                        {organizations.map((organization) => (
                          <option key={organization.id} value={organization.id}>
                            {organization.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <p>No organization membership is available for this account.</p>
                  )}
                  {organizationError && <p className="auth-panel__error" role="alert">{organizationError}</p>}
                  <RouteLink href="/teams" onClick={() => setWorkspaceOpen(false)}>
                    Manage organizations
                  </RouteLink>
                </>
              ) : (
                <>
                  <strong>{configured ? "Sign in to access an organization" : "Organization access isn’t configured"}</strong>
                  <p>Organization and team data is available only to authenticated members.</p>
                  {configured && <RouteLink href="/login" onClick={() => setWorkspaceOpen(false)}>Sign in</RouteLink>}
                </>
              )}
            </section>
          )}
        </div>

        <div
          className="topbar-popover topbar-popover--mobile-filters"
          ref={filtersRef}
        >
          <Button
            aria-expanded={filtersOpen}
            aria-haspopup="dialog"
            aria-label={`${filtersOpen ? "Close" : "Open"} opportunity filters`}
            className="topbar-icon-button"
            onClick={() => setFiltersOpen((open) => !open)}
            size="icon"
            variant="secondary"
          >
            <PlatformIcon name="categories" />
          </Button>
          {filtersOpen && (
            <section
              aria-label="Opportunity filters"
              className="topbar-popover__panel topbar-filter-panel"
              role="dialog"
            >
              <label>
                <span>Market</span>
                <select
                  onChange={(event) => onCountryChange(event.currentTarget.value)}
                  value={country}
                >
                  <option value="all">All markets</option>
                  {supportedCountries.map((market) => (
                    <option key={market.code} value={market.code}>
                      {market.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Opportunity category</span>
                <select
                  onChange={(event) => {
                    const selected = categoryOptions.find(
                      (option) => option.value === event.currentTarget.value,
                    );
                    if (selected) onCategoryChange(selected.value);
                  }}
                  value={category}
                >
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                className="topbar-filter-panel__done"
                onClick={() => setFiltersOpen(false)}
                variant="secondary"
              >
                Done
              </Button>
            </section>
          )}
        </div>

        <Button
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
          aria-pressed={theme === "dark"}
          className="topbar-theme-toggle"
          onClick={onToggleTheme}
          size="icon"
          title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
          variant="secondary"
        >
          <PlatformIcon name={theme === "light" ? "moon" : "sun"} />
        </Button>

        <div className="topbar-popover" ref={noticeRef}>
          <Button
            aria-expanded={noticeOpen}
            aria-haspopup="dialog"
            aria-label="Notifications"
            className="topbar-icon-button"
            onClick={() => setNoticeOpen((open) => !open)}
            size="icon"
            variant="secondary"
          >
            <PlatformIcon name="alerts" />
          </Button>
          {noticeOpen && (
            <section
              aria-label="Notifications"
              className="topbar-popover__panel"
              role="dialog"
            >
              <strong>No connected notifications</strong>
              <p>
                Alerts will appear here after authenticated notification
                delivery is implemented.
              </p>
              <RouteLink
                href="/alerts"
                onClick={() => setNoticeOpen(false)}
              >
                View alert setup
              </RouteLink>
            </section>
          )}
        </div>

        <RouteLink
          aria-label="Help and support"
          className="topbar-icon-button topbar-icon-button--link"
          href="/support"
          title="Help & support"
        >
          <PlatformIcon name="help" />
        </RouteLink>
        {user ? (
          <div className="topbar-popover topbar-popover--profile" ref={profileRef}>
            <Button
              aria-expanded={profileOpen}
              aria-haspopup="dialog"
              className="topbar-profile"
              onClick={() => setProfileOpen((open) => !open)}
              variant="tertiary"
            >
              <span aria-hidden="true" className="topbar-profile__avatar">
                <PlatformIcon name="profile" />
              </span>
              <span className="topbar-profile__name">{user.name || user.email}</span>
            </Button>
            {profileOpen && (
              <section aria-label="Account menu" className="topbar-popover__panel" role="dialog">
                <strong>{user.email}</strong>
                <RouteLink href="/settings" onClick={() => setProfileOpen(false)}>Account settings</RouteLink>
                <button className="ui-button ui-button--secondary" onClick={() => void handleSignOut()} type="button">Sign out</button>
                {signOutError && <p className="auth-panel__error" role="alert">{signOutError}</p>}
              </section>
            )}
          </div>
        ) : (
          <RouteLink aria-label="Sign in" className="topbar-profile" href="/login">
            <span aria-hidden="true" className="topbar-profile__avatar">
              <PlatformIcon name="profile" />
            </span>
            <span className="topbar-profile__name">Sign in</span>
          </RouteLink>
        )}
      </div>
    </header>
  );
}
