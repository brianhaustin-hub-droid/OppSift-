import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { RouteLink, useNavigate } from "../../app/routing/router";
import { Badge, Button, Card } from "../../shared/ui/components";
import { EmptyState } from "../../shared/ui/feedback";
import {
  categoryLabels,
  fetchLiveOpportunities,
  fetchLiveOpportunitiesByIds,
  type LiveOpportunity,
  type OpportunityCategory,
} from "../opportunities/opportunity-feed";
import { getSupportedCountry, supportedCountries } from "../opportunities/country-registry";
import {
  sourceCatalog,
  type SourceCatalogRecord,
} from "../../../backend/neon/intelligence/source-catalog";

type Props = {
  defaultCategory?: OpportunityCategory | "all";
  demonstrationCountry?: string | "all";
  countryCode?: string;
  locationQuery: string;
  onCategoryChange?: (category: OpportunityCategory | "all") => void;
  path: string;
  routeId: string;
  userId?: string;
};

type SavedSearch = {
  id: string;
  name: string;
  query: string;
  createdAt: string;
  lastExecutedAt: string | null;
};

type RecentSearch = {
  id: string;
  query: string;
  search: string;
  createdAt: string;
};

type BrowserSearchState = {
  savedSearches: SavedSearch[];
  history: RecentSearch[];
  savedOpportunityIds: string[];
};

const EMPTY_STATE: BrowserSearchState = {
  savedSearches: [],
  history: [],
  savedOpportunityIds: [],
};
const CATEGORY_OPTIONS: readonly {
  label: string;
  value: OpportunityCategory | "all";
}[] = [
  { label: "All opportunities", value: "all" },
  { label: "Government contracts", value: "government" },
  { label: "Grants & funding", value: "grants" },
  { label: "Commercial", value: "commercial" },
];
const SEARCH_SUGGESTIONS = [
  "Renewable energy",
  "Small business innovation",
  "Regional logistics",
  "Construction tenders",
  "Healthcare supplies",
  "Agricultural funding",
];
const VALID_SORTS = ["relevance", "recent", "deadline", "alphabetical"] as const;
const VALID_VIEWS = ["list", "card", "table"] as const;
const PAGE_SIZE = 2;
const OPPORTUNITY_SOURCE_TYPES = new Set([
  "procurement_notices",
  "grant_opportunities",
  "unverified_grant_search",
]);

function getPublisherSources(
  countryCodes: readonly string[],
  category: OpportunityCategory | "all",
) {
  if (countryCodes.length === 0 || category === "commercial") return [];
  return sourceCatalog.filter((source) => {
    const categoryMatches =
      category === "all" ||
      (category === "government" && source.recordType === "procurement_notices") ||
      (category === "grants" &&
        (source.recordType === "grant_opportunities" ||
          source.recordType === "unverified_grant_search"));
    return (
      OPPORTUNITY_SOURCE_TYPES.has(source.recordType) &&
      categoryMatches &&
      source.countryCodes.some((code) => countryCodes.includes(code))
    );
  });
}

function readBrowserSearchState(storageKey: string): BrowserSearchState {
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return EMPTY_STATE;
    const parsed: unknown = JSON.parse(stored);
    if (!isBrowserSearchState(parsed)) {
      throw new Error("Stored discovery data has an invalid shape.");
    }
    return parsed;
  } catch (error) {
    console.error("Unable to read local discovery data.", error);
    return EMPTY_STATE;
  }
}

function isBrowserSearchState(value: unknown): value is BrowserSearchState {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    Array.isArray(record.savedSearches) &&
    record.savedSearches.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        typeof item.id === "string" &&
        "name" in item &&
        typeof item.name === "string" &&
        "query" in item &&
        typeof item.query === "string" &&
        "createdAt" in item &&
        typeof item.createdAt === "string" &&
        "lastExecutedAt" in item &&
        (typeof item.lastExecutedAt === "string" || item.lastExecutedAt === null),
    ) &&
    Array.isArray(record.history) &&
    record.history.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        typeof item.id === "string" &&
        "query" in item &&
        typeof item.query === "string" &&
        "search" in item &&
        typeof item.search === "string" &&
        "createdAt" in item &&
        typeof item.createdAt === "string",
    ) &&
    Array.isArray(record.savedOpportunityIds) &&
    record.savedOpportunityIds.every((id) => typeof id === "string")
  );
}

function writeBrowserSearchState(
  storageKey: string,
  state: BrowserSearchState,
): string | null {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
    return null;
  } catch (error) {
    console.error("Unable to save local discovery data.", error);
    return "This browser could not save the change. Try again or check browser storage settings.";
  }
}

function getCategoryFromPath(path: string): OpportunityCategory | "all" {
  if (path.endsWith("/government")) return "government";
  if (path.endsWith("/grants")) return "grants";
  if (path.endsWith("/commercial")) return "commercial";
  return "all";
}

function makeSearchHref(
  query: string,
  updates: URLSearchParams,
  resetPage = true,
) {
  const cleanQuery = query.trim();
  if (cleanQuery) updates.set("q", cleanQuery);
  else updates.delete("q");
  if (resetPage) updates.delete("page");
  const suffix = updates.toString();
  return `/discover/search${suffix ? `?${suffix}` : ""}`;
}

function applyCategory(url: URLSearchParams, value: string) {
  const next = new URLSearchParams(url);
  if (value === "all") next.delete("category");
  else next.set("category", value);
  return next;
}

function hasUnsupportedDemoFilter(params: URLSearchParams) {
  return [
    "region",
    "type",
    "industry",
    "publisher",
    "source",
    "publishedFrom",
    "publishedTo",
    "closingFrom",
    "closingTo",
    "status",
    "currency",
    "minValue",
    "maxValue",
    "verification",
    "language",
    "keywordMode",
  ].some((key) => params.has(key));
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    dateStyle: "medium",
  });
}

function isValidDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function scoreRelevance(opportunity: LiveOpportunity, phrase: string) {
  const normalized = phrase.trim().toLocaleLowerCase();
  if (!normalized) return 0;
  const title = opportunity.title.toLocaleLowerCase();
  const organization = opportunity.organization.toLocaleLowerCase();
  if (title === normalized) return 100;
  if (title.includes(normalized)) return 80;
  if (organization.includes(normalized)) return 50;
  if (
    opportunity.countryLabel.toLocaleLowerCase().includes(normalized) ||
    opportunity.categoryLabel.toLocaleLowerCase().includes(normalized)
  ) {
    return 25;
  }
  return 0;
}

function timestampOrInfinity(value: string | null) {
  if (!value) return Number.POSITIVE_INFINITY;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}

export function DiscoveryExperience({
  defaultCategory = "all",
  demonstrationCountry = "all",
  countryCode,
  locationQuery,
  onCategoryChange,
  path,
  routeId,
  userId,
}: Props) {
  const navigate = useNavigate();
  const storageKey = `oppsift-discovery-preview:${userId ?? "anonymous"}`;
  const [browserState, setBrowserState] = useState<BrowserSearchState>(() =>
    readBrowserSearchState(storageKey),
  );
  const [storageError, setStorageError] = useState("");
  const [draftQuery, setDraftQuery] = useState(
    () => new URLSearchParams(locationQuery).get("q") ?? "",
  );
  const [selectedOpportunity, setSelectedOpportunity] =
    useState<LiveOpportunity | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const [savedSearchName, setSavedSearchName] = useState("");
  const [view, setView] = useState<"list" | "card" | "table">(() => {
    const storedView = new URLSearchParams(locationQuery).get("view");
    return VALID_VIEWS.includes(storedView as (typeof VALID_VIEWS)[number])
      ? (storedView as "list" | "card" | "table")
      : "list";
  });
  const [copyLinkError, setCopyLinkError] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    setBrowserState(readBrowserSearchState(storageKey));
  }, [storageKey]);
  useEffect(() => {
    setDraftQuery(new URLSearchParams(locationQuery).get("q") ?? "");
  }, [locationQuery]);
  useEffect(() => {
    const storedView = new URLSearchParams(locationQuery).get("view");
    setView(
      VALID_VIEWS.includes(storedView as (typeof VALID_VIEWS)[number])
        ? (storedView as "list" | "card" | "table")
        : "list",
    );
  }, [locationQuery]);
  useEffect(() => {
    const editId = new URLSearchParams(locationQuery).get("edit");
    const saved = browserState.savedSearches.find((item) => item.id === editId);
    if (saved) setSavedSearchName(saved.name);
    else if (!editId) setSavedSearchName("");
  }, [browserState.savedSearches, locationQuery]);
  useEffect(() => {
    if (!selectedOpportunity) return;
    previousFocus.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.querySelector<HTMLButtonElement>(".quick-view__close")?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedOpportunity(null);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      previousFocus.current?.focus();
    };
  }, [selectedOpportunity]);

  const params = useMemo(
    () => new URLSearchParams(locationQuery),
    [locationQuery],
  );
  const query = params.get("q") ?? "";
  const category =
    (params.get("category") as OpportunityCategory | null) ??
    (getCategoryFromPath(path) === "all" ? defaultCategory : getCategoryFromPath(path));
  const selectedCountries = params.getAll("country");
  const effectiveCountries =
    selectedCountries.length > 0
      ? selectedCountries
      : demonstrationCountry === "all"
        ? []
        : [demonstrationCountry];
  const selectedRegions = params.getAll("region");
  const unsupportedFilters = hasUnsupportedDemoFilter(params);
  const validCountries = effectiveCountries.filter((code) => getSupportedCountry(code));
  const invalidCountry = selectedCountries.some(
    (code) => !getSupportedCountry(code),
  );
  const categoryValue = params.get("category");
  const invalidCategory =
    categoryValue !== null &&
    !CATEGORY_OPTIONS.some((option) => option.value === categoryValue);
  const pageValue = params.get("page");
  const invalidPage =
    pageValue !== null &&
    (!/^\d+$/.test(pageValue) || Number(pageValue) < 1 || Number(pageValue) > 100_000);
  const minimumValue = params.get("minValue");
  const maximumValue = params.get("maxValue");
  const currencyValue = params.get("currency");
  const invalidValueRange =
    (minimumValue !== null &&
      (!Number.isFinite(Number(minimumValue)) || Number(minimumValue) < 0)) ||
    (maximumValue !== null &&
      (!Number.isFinite(Number(maximumValue)) || Number(maximumValue) < 0)) ||
    (minimumValue !== null &&
      maximumValue !== null &&
      Number(minimumValue) > Number(maximumValue)) ||
    ((minimumValue !== null || maximumValue !== null) &&
      !/^[A-Z]{3}$/.test(currencyValue ?? ""));
  const invalidCurrency =
    currencyValue !== null && !/^[A-Z]{3}$/.test(currencyValue);
  const dateValues = [
    params.get("publishedFrom"),
    params.get("publishedTo"),
    params.get("closingFrom"),
    params.get("closingTo"),
  ].filter((value): value is string => value !== null);
  const invalidDates =
    dateValues.some(
      (value) =>
        !isValidDateOnly(value),
    ) ||
    (params.has("publishedFrom") &&
      params.has("publishedTo") &&
      (params.get("publishedFrom") ?? "") > (params.get("publishedTo") ?? "")) ||
    (params.has("closingFrom") &&
      params.has("closingTo") &&
      (params.get("closingFrom") ?? "") > (params.get("closingTo") ?? ""));
  const invalidSort =
    params.has("sort") &&
    !VALID_SORTS.includes(params.get("sort") as (typeof VALID_SORTS)[number]);
  const invalidView =
    params.has("view") &&
    !VALID_VIEWS.includes(params.get("view") as (typeof VALID_VIEWS)[number]);
  const invalidQueryParams =
    invalidCountry ||
    invalidCategory ||
    invalidPage ||
    invalidValueRange ||
    invalidCurrency ||
    invalidDates ||
    invalidSort ||
    invalidView;
  const validCategory =
    category === "government" || category === "grants" || category === "commercial"
      ? category
      : "all";
  const sourceCountryCodes = countryCode
    ? [countryCode]
    : validCountries.length
      ? validCountries
      : selectedRegions.length
        ? supportedCountries
            .filter((country) => selectedRegions.includes(country.regionCode))
            .map((country) => country.code)
        : [];
  const publisherSources = getPublisherSources(sourceCountryCodes, validCategory);

  const sourceCountryKey = sourceCountryCodes.join(",");
  const filtersBlocked = invalidQueryParams || unsupportedFilters;

  const [feedError, setFeedError] = useState("");
  const [feedLoading, setFeedLoading] = useState(false);
  const [filteredOpportunities, setFilteredOpportunities] = useState<
    readonly LiveOpportunity[]
  >([]);

  useEffect(() => {
    if (filtersBlocked) {
      setFilteredOpportunities([]);
      setFeedError("");
      setFeedLoading(false);
      return;
    }
    let cancelled = false;
    setFeedLoading(true);
    void fetchLiveOpportunities({
      category: validCategory,
      countryCodes: sourceCountryKey ? sourceCountryKey.split(",") : [],
      query,
    }).then((result) => {
      if (cancelled) return;
      setFilteredOpportunities(result.opportunities);
      setFeedError(result.error);
      setFeedLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [filtersBlocked, query, sourceCountryKey, validCategory]);

  const savedOpportunityIds = browserState.savedOpportunityIds;
  const [savedOpportunities, setSavedOpportunities] = useState<
    readonly LiveOpportunity[]
  >([]);

  useEffect(() => {
    if (routeId !== "saved" || savedOpportunityIds.length === 0) {
      setSavedOpportunities([]);
      return;
    }
    let cancelled = false;
    void fetchLiveOpportunitiesByIds(savedOpportunityIds).then((result) => {
      if (cancelled) return;
      setSavedOpportunities(result.opportunities);
    });
    return () => {
      cancelled = true;
    };
  }, [routeId, savedOpportunityIds]);

  const sortedOpportunities = useMemo(() => {
    const sorted = [...filteredOpportunities];
    const sort = params.get("sort") ?? "relevance";
    if (sort === "alphabetical") {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === "deadline") {
      sorted.sort((a, b) => {
        const left = timestampOrInfinity(a.closingAt);
        const right = timestampOrInfinity(b.closingAt);
        if (left === right) return 0;
        return left > right ? 1 : -1;
      });
    } else if (sort === "recent") {
      sorted.sort((a, b) => {
        const left = timestampOrInfinity(a.publishedAt);
        const right = timestampOrInfinity(b.publishedAt);
        if (left === right) return 0;
        return left > right ? -1 : 1;
      });
    } else if (sort === "relevance" && query) {
      sorted.sort(
        (a, b) => scoreRelevance(b, query) - scoreRelevance(a, query),
      );
    }
    return sorted;
  }, [filteredOpportunities, params, query]);
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const pageCount = Math.max(1, Math.ceil(sortedOpportunities.length / PAGE_SIZE));
  const visibleOpportunities = sortedOpportunities.slice(
    (Math.min(page, pageCount) - 1) * PAGE_SIZE,
    Math.min(page, pageCount) * PAGE_SIZE,
  );

  function persist(nextState: BrowserSearchState) {
    setBrowserState(nextState);
    setStorageError(writeBrowserSearchState(storageKey, nextState) ?? "");
  }

  function navigateSearch(
    nextParams: URLSearchParams,
    replace = false,
    preservePage = false,
  ) {
    navigate(makeSearchHref(query, nextParams, !preservePage), replace);
  }

  function changeView(nextView: "list" | "card" | "table") {
    setView(nextView);
    const next = new URLSearchParams(params);
    next.set("view", nextView);
    navigateSearch(next, true);
  }

  function recordSearch(term: string, search: string) {
    const normalized = term.trim();
    if (!normalized && !search) return;
    const next: RecentSearch = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      query: normalized || "Filtered search",
      search,
      createdAt: new Date().toISOString(),
    };
    persist({
      ...browserState,
      history: [
        next,
        ...browserState.history.filter((item) => item.query !== normalized),
      ].slice(0, 25),
    });
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = new URLSearchParams(params);
    if (category !== "all") next.set("category", category);
    if (countryCode) next.set("country", countryCode);
    next.delete("page");
    const href = makeSearchHref(draftQuery, next);
    recordSearch(draftQuery, href.split("?", 2)[1] ?? "");
    navigate(href);
  }

  function selectSuggestion(term: string) {
    setDraftQuery(term);
    const next = new URLSearchParams(params);
    if (category !== "all") next.set("category", category);
    if (countryCode) next.set("country", countryCode);
    const href = makeSearchHref(term, next);
    recordSearch(term, href.split("?", 2)[1] ?? "");
    navigate(href);
  }

  function saveCurrentSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = savedSearchName.trim();
    if (!name) return;
    const nextParams = new URLSearchParams(locationQuery);
    const editId = nextParams.get("edit");
    nextParams.delete("edit");
    const updatedSearch = nextParams.toString();
    const edited = browserState.savedSearches.find((item) => item.id === editId);
    if (edited) {
      persist({
        ...browserState,
        savedSearches: browserState.savedSearches.map((item) =>
          item.id === edited.id
            ? { ...item, name, query: updatedSearch }
            : item,
        ),
      });
    } else {
      const saved: SavedSearch = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        query: updatedSearch,
        createdAt: new Date().toISOString(),
        lastExecutedAt: null,
      };
      persist({ ...browserState, savedSearches: [saved, ...browserState.savedSearches] });
    }
    setSavedSearchName("");
  }

  function runSavedSearch(saved: SavedSearch) {
    persist({
      ...browserState,
      savedSearches: browserState.savedSearches.map((item) =>
        item.id === saved.id
          ? { ...item, lastExecutedAt: new Date().toISOString() }
          : item,
      ),
    });
    navigate(`/discover/search${saved.query ? `?${saved.query}` : ""}`);
  }

  function toggleSavedOpportunity(id: string) {
    const nextIds = browserState.savedOpportunityIds.includes(id)
      ? browserState.savedOpportunityIds.filter((savedId) => savedId !== id)
      : [...browserState.savedOpportunityIds, id];
    persist({ ...browserState, savedOpportunityIds: nextIds });
  }

  function renderCompactRow(opportunity: LiveOpportunity) {
    const isSaved = browserState.savedOpportunityIds.includes(opportunity.id);
    return (
      <tr key={opportunity.id}>
        <th scope="row">
          <button className="discovery-result__title" onClick={() => setSelectedOpportunity(opportunity)} type="button">{opportunity.title}</button>
        </th>
        <td>{opportunity.categoryLabel}</td>
        <td>{opportunity.countryLabel}</td>
        <td>{opportunity.organization}</td>
        <td>{opportunity.publishedLabel}</td>
        <td>{opportunity.deadlineLabel}</td>
        <td>{opportunity.reference}</td>
        <td>
          <Button aria-pressed={isSaved} onClick={() => toggleSavedOpportunity(opportunity.id)} size="sm" variant="tertiary">
            {isSaved ? "Remove" : "Save"}
          </Button>
        </td>
      </tr>
    );
  }

  function renderOpportunity(opportunity: LiveOpportunity) {
    const isSaved = browserState.savedOpportunityIds.includes(opportunity.id);
    return (
      <Card as="article" className={`discovery-result discovery-result--${view}`} key={opportunity.id}>
        <div className="discovery-result__topline">
          <Badge tone="neutral">{opportunity.categoryLabel}</Badge>
          <span>{opportunity.publishedLabel}</span>
        </div>
        <h3>
          <button
            className="discovery-result__title"
            onClick={() => setSelectedOpportunity(opportunity)}
            type="button"
          >
            {opportunity.title}
          </button>
        </h3>
        <p className="discovery-result__publisher">{opportunity.organization}</p>
        <div className="discovery-result__metadata">
          <span>{opportunity.countryLabel}</span>
          <span>{opportunity.deadlineLabel}</span>
          <span>Reference: {opportunity.reference}</span>
        </div>
        <div className="discovery-result__actions">
          <Button onClick={() => setSelectedOpportunity(opportunity)} size="sm" variant="secondary">
            Quick view
          </Button>
          <Button
            aria-pressed={isSaved}
            onClick={() => toggleSavedOpportunity(opportunity.id)}
            size="sm"
            variant="tertiary"
          >
            {isSaved ? "Remove saved" : "Save"}
          </Button>
          <RouteLink className="discovery-result__link" href={`/opportunity/${opportunity.id}`}>
            Full details
          </RouteLink>
        </div>
      </Card>
    );
  }

  if (routeId === "saved-searches") {
    return (
      <main className="discovery-page">
        <PageIntro eyebrow="Your workspace" title="Saved searches" description="Keep reusable search configurations in this browser." />
        <BrowserOnlyNotice />
        <StorageError message={storageError} />
        {browserState.savedSearches.length === 0 ? (
          <EmptyState description="Run a search and save its filters to see it here." title="No saved searches yet" />
        ) : (
          <div className="saved-search-list">
            {browserState.savedSearches.map((saved) => (
              <Card as="article" className="saved-search-card" key={saved.id}>
                <div>
                  <h2>{saved.name}</h2>
                  <p>{new URLSearchParams(saved.query).get("q") || "No keywords"} · Saved {formatDate(saved.createdAt)} · Last run {saved.lastExecutedAt ? formatDate(saved.lastExecutedAt) : "Never"}</p>
                </div>
                <div className="discovery-result__actions">
                  <Button onClick={() => runSavedSearch(saved)} size="sm">Run search</Button>
                  <Button onClick={() => navigate(`/discover/search${saved.query ? `?${saved.query}&` : "?"}edit=${encodeURIComponent(saved.id)}`)} size="sm" variant="secondary">Edit filters</Button>
                  <Button onClick={() => {
                    const copy = { ...saved, id: `${Date.now()}`, name: `${saved.name} (copy)`, createdAt: new Date().toISOString(), lastExecutedAt: null };
                    persist({ ...browserState, savedSearches: [copy, ...browserState.savedSearches] });
                  }} size="sm" variant="secondary">Duplicate</Button>
                  <Button onClick={() => {
                    const revised = window.prompt("Edit saved search name", saved.name);
                    if (revised === null) return;
                    if (!revised.trim()) {
                      setStorageError("Saved search names cannot be empty.");
                      return;
                    }
                    persist({ ...browserState, savedSearches: browserState.savedSearches.map((item) => item.id === saved.id ? { ...item, name: revised.trim() } : item) });
                  }} size="sm" variant="secondary">Rename</Button>
                  <Button onClick={() => persist({ ...browserState, savedSearches: browserState.savedSearches.filter((item) => item.id !== saved.id) })} size="sm" variant="danger">Delete</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    );
  }

  if (routeId === "saved") {
    return (
      <main className="discovery-page">
        <PageIntro eyebrow="Your workspace" title="Saved opportunities" description="Your shortlist is stored in this browser only." />
        <BrowserOnlyNotice />
        <StorageError message={storageError} />
        {savedOpportunities.length ? (
          <div className="discovery-result-list">{savedOpportunities.map(renderOpportunity)}</div>
        ) : (
          <EmptyState description="No verified opportunity listings are available to add to your shortlist." title="No saved opportunities" />
        )}
      </main>
    );
  }

  if (routeId === "search-history") {
    return (
      <main className="discovery-page">
        <PageIntro eyebrow="Your workspace" title="Search history" description="Recent search phrases entered in this browser." />
        <BrowserOnlyNotice />
        <StorageError message={storageError} />
        <div className="history-actions">
          <Button disabled={!browserState.history.length} onClick={() => persist({ ...browserState, history: [] })} variant="secondary">Clear history</Button>
        </div>
        {browserState.history.length === 0 ? (
          <EmptyState description="Submitted searches will appear here in this browser." title="No recent searches" />
        ) : (
          <div className="saved-search-list">
            {browserState.history.map((item) => (
              <Card as="article" className="history-row" key={item.id}>
                <div><h2>{item.query}</h2><p>{formatDate(item.createdAt)}</p></div>
                <div className="discovery-result__actions">
                  <Button onClick={() => navigate(makeSearchHref(item.query, new URLSearchParams(item.search)))} size="sm">Repeat</Button>
                  <Button onClick={() => {
                    const saved: SavedSearch = { id: `${Date.now()}`, name: item.query.slice(0, 80), query: item.search, createdAt: new Date().toISOString(), lastExecutedAt: null };
                    persist({ ...browserState, savedSearches: [saved, ...browserState.savedSearches] });
                  }} size="sm" variant="secondary">Save search</Button>
                  <Button onClick={() => persist({ ...browserState, history: browserState.history.filter((entry) => entry.id !== item.id) })} size="sm" variant="tertiary">Remove</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    );
  }

  if (countryCode) {
    const market = getSupportedCountry(countryCode);
    if (!market) {
      return <EmptyState description="That country is not in the approved launch-market registry." title="Country not found" />;
    }
    return (
      <main className="discovery-page">
        <PageIntro eyebrow={market.region} title={`Opportunities in ${market.name}`} description="Country scope is approved for research; source coverage and live opportunities have not been verified." />
        <CoverageStatus />
        <SearchHero
          initialQuery={draftQuery}
          isResults
          onChange={setDraftQuery}
          onSubmit={submitSearch}
          onSuggestion={selectSuggestion}
        />
        <CategoryTabs category={validCategory} onChange={(value) => {
          onCategoryChange?.(value);
          const next = applyCategory(params, value);
          next.set("country", market.code);
          navigate(makeSearchHref(query, next));
        }} />
        <CountrySelector selected={market.code} onChange={(codes) => {
          const next = new URLSearchParams(params);
          next.delete("country");
          codes.forEach((code) => next.append("country", code));
          navigate(makeSearchHref(query, next));
        }} />
        <OpportunityResults
          count={sortedOpportunities.length}
          error={feedError}
          items={visibleOpportunities}
          loading={feedLoading}
          onPageChange={(nextPage) => {
            const next = new URLSearchParams(params);
            next.set("page", String(nextPage));
            navigateSearch(next, false, true);
          }}
          page={Math.min(page, pageCount)}
          pageCount={pageCount}
          renderCompactRow={renderCompactRow}
          renderOpportunity={renderOpportunity}
          sources={publisherSources}
          view={view}
        />
      </main>
    );
  }

  const isResults = path.startsWith("/discover/search");
  const categoryLanding = getCategoryFromPath(path);
  const title =
    categoryLanding === "all"
      ? isResults ? "Search opportunities" : "Discover Global Opportunities"
      : categoryLabels[categoryLanding];
  const description =
    categoryLanding === "all"
      ? "Find contracts, funding and commercial opportunities across global markets."
      : `Explore ${categoryLabels[categoryLanding].toLocaleLowerCase()} using the same global search experience.`;

  return (
    <main className="discovery-page">
      <PageIntro eyebrow={isResults ? "Opportunity discovery" : "Global opportunity intelligence"} title={title} description={description} />
      <SearchHero
        initialQuery={draftQuery}
        isResults={isResults}
        onChange={setDraftQuery}
        onSubmit={submitSearch}
        onSuggestion={selectSuggestion}
      />
      {!isResults && <DiscoveryMetrics />}
      <div className="discovery-layout">
        <aside aria-label="Advanced search filters" className={`discovery-filters ${filterOpen ? "is-mobile-open" : ""}`}>
          <div className="discovery-filters__heading">
            <h2>Filters</h2>
            <div>
              <button aria-expanded={filterOpen} className="discovery-filter-toggle" onClick={() => setFilterOpen((open) => !open)} type="button">{filterOpen ? "Close filters" : "Show filters"}</button>
              <button className="text-button" onClick={() => navigate("/discover/search")} type="button">Clear all</button>
            </div>
          </div>
          <FilterForm
            params={params}
            selectedCountries={selectedCountries}
            onApply={(next) => {
              if (categoryLanding !== "all" && !next.has("category")) {
                next.set("category", categoryLanding);
              }
              navigateSearch(next);
              setFilterOpen(false);
            }}
          />
        </aside>
        {filterOpen && <button aria-label="Close opportunity filters" className="discovery-filter-backdrop" onClick={() => setFilterOpen(false)} type="button" />}
        <section aria-label="Opportunity results" className="discovery-results">
          <CategoryTabs
            category={validCategory}
            onChange={(value) => {
              onCategoryChange?.(value);
              const next = applyCategory(params, value);
              if (!isResults) {
                const suffix = next.toString();
                navigate(
                  `/discover${value === "all" ? "" : `/${value}`}${suffix ? `?${suffix}` : ""}`,
                );
              } else {
                navigate(makeSearchHref(query, next));
              }
            }}
          />
          <div className="results-toolbar">
            <p aria-live="polite">
              {filteredOpportunities.length
                ? `${filteredOpportunities.length} result${filteredOpportunities.length === 1 ? "" : "s"}`
                : "No live opportunity records are available"}
            </p>
            <label>Sort
              <select aria-label="Sort results" onChange={(event) => {
                const next = new URLSearchParams(params);
                next.set("sort", event.currentTarget.value);
                navigateSearch(next, true);
              }} value={params.get("sort") ?? "relevance"}>
                <option value="relevance">Most relevant</option>
                <option value="recent">Recently published</option>
                <option value="deadline">Closing date</option>
                <option value="alphabetical">Title A–Z</option>
              </select>
            </label>
            <label>View
              <select aria-label="Results view" onChange={(event) => changeView(event.currentTarget.value as typeof view)} value={view}>
                <option value="list">List</option><option value="card">Cards</option><option value="table">Compact</option>
              </select>
            </label>
          </div>
          <ActiveFilters params={params} onRemove={(key, value) => {
            const next = new URLSearchParams(params);
            if (value) next.delete(key, value);
            else next.delete(key);
            navigateSearch(next, false, true);
          }} />
          {invalidQueryParams && (
            <p className="discovery-error" role="alert">
              One or more URL filters are invalid. Remove or correct the affected filter and try again.
            </p>
          )}
          {unsupportedFilters && (
            <p className="discovery-limitation" role="status">Some selected filters need listing fields that are not currently available in OppSift.</p>
          )}
          {isResults && (
            <form className="save-search-form" onSubmit={saveCurrentSearch}>
              <label htmlFor="saved-search-name">{params.has("edit") ? "Update saved search" : "Save this search"}</label>
              <input id="saved-search-name" maxLength={80} onChange={(event) => setSavedSearchName(event.currentTarget.value)} placeholder="Name this search" required value={savedSearchName} />
              <Button size="sm" type="submit" variant="secondary">Save search</Button>
            </form>
          )}
          <StorageError message={storageError} />
          <OpportunityResults
            count={sortedOpportunities.length}
            error={feedError}
            items={visibleOpportunities}
            loading={feedLoading}
            onPageChange={(nextPage) => {
              const next = new URLSearchParams(params);
              next.set("page", String(nextPage));
              navigateSearch(next, false, true);
            }}
            page={Math.min(page, pageCount)}
            pageCount={pageCount}
            renderCompactRow={renderCompactRow}
            renderOpportunity={renderOpportunity}
            sources={publisherSources}
            view={view}
          />
        </section>
      </div>
      {!isResults && <BrowseMarkets onSelect={(code) => navigate(`/discover/country/${code}`)} />}
      {selectedOpportunity && (
        <div className="quick-view-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedOpportunity(null);
        }}>
          <section aria-label="Opportunity quick view" aria-modal="true" className="quick-view" role="dialog">
            <button aria-label="Close opportunity quick view" className="quick-view__close" onClick={() => setSelectedOpportunity(null)} type="button">×</button>
            <Badge tone="neutral">{selectedOpportunity.categoryLabel}</Badge>
            <h2>{selectedOpportunity.title}</h2>
            <dl>
              <div><dt>Country</dt><dd>{selectedOpportunity.countryLabel}</dd></div>
              <div><dt>Issuing organisation</dt><dd>{selectedOpportunity.organization}</dd></div>
              <div><dt>Publication date</dt><dd>{selectedOpportunity.publishedLabel}</dd></div>
              <div><dt>Closing date</dt><dd>{selectedOpportunity.deadlineLabel}</dd></div>
              <div><dt>Reference</dt><dd>{selectedOpportunity.reference}</dd></div>
              <div>
                <dt>Source / verification</dt>
                <dd>
                  <a href={selectedOpportunity.canonicalUrl} rel="noreferrer noopener" target="_blank">
                    Open publisher notice ↗
                  </a>
                </dd>
              </div>
            </dl>
            <p>Eligibility and AI analysis have not been assessed for this record.</p>
            <Button onClick={() => toggleSavedOpportunity(selectedOpportunity.id)} variant="secondary">
              {browserState.savedOpportunityIds.includes(selectedOpportunity.id) ? "Remove saved opportunity" : "Save opportunity"}
            </Button>
            <RouteLink className="ui-button ui-button--secondary" href={`/opportunity/${selectedOpportunity.id}`}>Open full details</RouteLink>
            <Button
              onClick={() => {
                setCopyLinkError("");
                if (!navigator.clipboard?.writeText) {
                  setCopyLinkError("Clipboard access is unavailable. Copy the link from the browser address bar instead.");
                  return;
                }
                void navigator.clipboard
                  .writeText(`${window.location.origin}/opportunity/${selectedOpportunity.id}`)
                  .catch((error: unknown) => {
                    console.error("Unable to copy the opportunity link.", error);
                    setCopyLinkError("Could not copy the link. Copy it from the browser address bar instead.");
                  });
              }}
              variant="tertiary"
            >
              Copy opportunity link
            </Button>
            <Button disabled variant="tertiary">No original source linked for this record</Button>
            <StorageError message={copyLinkError} />
          </section>
        </div>
      )}
    </main>
  );
}

function SearchHero({ initialQuery, isResults, onChange, onSubmit, onSuggestion }: {
  initialQuery: string;
  isResults: boolean;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSuggestion: (value: string) => void;
}) {
  return (
    <section className="search-hero">
      <form className="discovery-search-form" onSubmit={onSubmit} role="search">
        <label className="ui-visually-hidden" htmlFor="discovery-query">Search keywords, titles, organisations or reference numbers</label>
        <input autoComplete="off" id="discovery-query" maxLength={300} onChange={(event) => onChange(event.currentTarget.value)} placeholder="Try a keyword, title, institution or reference" type="search" value={initialQuery} />
        <Button type="submit">Search opportunities</Button>
      </form>
      {!isResults && <div aria-label="Search suggestions" className="search-suggestions"><span>Suggested searches</span>{SEARCH_SUGGESTIONS.slice(0, 4).map((suggestion) => <button key={suggestion} onClick={() => onSuggestion(suggestion)} type="button">{suggestion}</button>)}</div>}
    </section>
  );
}

function DiscoveryMetrics() {
  return (
    <section aria-label="Discovery configuration status" className="discovery-metrics">
      <Card><strong>0</strong><span>Live opportunities</span></Card>
      <Card><strong>{supportedCountries.length}</strong><span>Approved research markets</span></Card>
      <Card><strong>0</strong><span>Verified active sources</span></Card>
      <Card><strong>0</strong><span>Live source records</span></Card>
    </section>
  );
}

function CategoryTabs({ category, onChange }: { category: OpportunityCategory | "all"; onChange: (category: OpportunityCategory | "all") => void }) {
  return (
    <nav aria-label="Opportunity categories" className="category-tabs">
      {CATEGORY_OPTIONS.map((option) => (
        <button aria-current={category === option.value ? "page" : undefined} className={category === option.value ? "is-current" : ""} key={option.value} onClick={() => onChange(option.value)} type="button">
          {option.label}
        </button>
      ))}
    </nav>
  );
}

function FilterForm({ params, selectedCountries, onApply }: { params: URLSearchParams; selectedCountries: string[]; onApply: (params: URLSearchParams) => void }) {
  return (
    <form className="filter-form" onSubmit={(event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const next = new URLSearchParams(params);
      ["country", "region", "industry", "publisher", "source", "type", "status", "currency", "language"].forEach((key) => next.delete(key));
      formData.getAll("country").forEach((value) => next.append("country", String(value)));
      const filters = ["region", "industry", "publisher", "source", "type", "status", "currency", "language", "publishedFrom", "publishedTo", "closingFrom", "closingTo", "minValue", "maxValue", "verification", "keywordMode"];
      filters.forEach((key) => {
        const value = String(formData.get(key) ?? "").trim();
        const normalized = key === "currency" ? value.toUpperCase() : value;
        if (normalized) next.set(key, normalized);
        else next.delete(key);
      });
      onApply(next);
    }}>
      <label>Country
        <select aria-label="Country" defaultValue={selectedCountries} multiple name="country" size={5}>
          {supportedCountries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
        </select>
        <small>Hold Ctrl or Command to select multiple.</small>
      </label>
      <label>Region
        <select defaultValue={params.get("region") ?? ""} name="region">
          <option value="">All regions</option>
          {Array.from(new Set(supportedCountries.map((country) => country.regionCode))).map((region) => <option key={region} value={region}>{region.split("_").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ")}</option>)}
        </select>
      </label>
      <label>Opportunity type<input defaultValue={params.get("type") ?? ""} name="type" placeholder="Tender, grant…" /></label>
      <label>Industry<input defaultValue={params.get("industry") ?? ""} name="industry" placeholder="Industry keyword" /></label>
      <label>Issuing organisation<input defaultValue={params.get("publisher") ?? ""} name="publisher" /></label>
      <label>Source institution<input defaultValue={params.get("source") ?? ""} name="source" /></label>
      <label>Published from<input defaultValue={params.get("publishedFrom") ?? ""} name="publishedFrom" type="date" /></label>
      <label>Published to<input defaultValue={params.get("publishedTo") ?? ""} name="publishedTo" type="date" /></label>
      <label>Closing from<input defaultValue={params.get("closingFrom") ?? ""} name="closingFrom" type="date" /></label>
      <label>Closing to<input defaultValue={params.get("closingTo") ?? ""} name="closingTo" type="date" /></label>
      <label>Status
        <select defaultValue={params.get("status") ?? ""} name="status"><option value="">Any status</option>{["open", "closed", "cancelled", "awarded", "unknown"].map((item) => <option key={item} value={item}>{item}</option>)}</select>
      </label>
      <label>Original currency<input defaultValue={params.get("currency") ?? ""} maxLength={3} name="currency" pattern="[A-Za-z]{3}" placeholder="ISO code" /></label>
      <div className="filter-form__inline"><label>Minimum value<input defaultValue={params.get("minValue") ?? ""} min="0" name="minValue" type="number" /></label><label>Maximum value<input defaultValue={params.get("maxValue") ?? ""} min="0" name="maxValue" type="number" /></label></div>
      <label>Source verification
        <select defaultValue={params.get("verification") ?? ""} name="verification"><option value="">Any status</option><option value="verified">Verified only</option><option value="unverified">Unverified</option></select>
      </label>
      <label>Language<input defaultValue={params.get("language") ?? ""} name="language" placeholder="e.g. en" /></label>
      <label>Keyword matching
        <select defaultValue={params.get("keywordMode") ?? "all"} name="keywordMode"><option value="all">All terms</option><option value="any">Any term</option><option value="exact">Exact phrase</option></select>
      </label>
      <div className="filter-form__actions"><Button size="sm" type="submit">Apply filters</Button><Button onClick={() => onApply(new URLSearchParams(params.get("q") ? `q=${encodeURIComponent(params.get("q") ?? "")}` : ""))} size="sm" type="button" variant="secondary">Reset</Button></div>
    </form>
  );
}

function ActiveFilters({ params, onRemove }: { params: URLSearchParams; onRemove: (key: string, value?: string) => void }) {
  const visible = ["country", "region", "industry", "publisher", "source", "type", "status", "currency", "language", "publishedFrom", "publishedTo", "closingFrom", "closingTo", "minValue", "maxValue", "verification", "keywordMode"];
  const entries = visible.flatMap((key) => params.getAll(key).map((value) => ({ key, value })));
  return entries.length ? <div aria-label="Active filters" className="active-filter-chips">{entries.map(({ key, value }) => <button key={`${key}-${value}`} onClick={() => onRemove(key, value)} type="button">{key}: {value} <span aria-hidden="true">×</span></button>)}</div> : null;
}

function OpportunityResults({ count, error, items, loading, onPageChange, page, pageCount, renderCompactRow, renderOpportunity, sources, view }: {
  count: number;
  error: string;
  items: readonly LiveOpportunity[];
  loading: boolean;
  onPageChange: (page: number) => void;
  page: number;
  pageCount: number;
  renderCompactRow: (item: LiveOpportunity) => ReactNode;
  renderOpportunity: (item: LiveOpportunity) => ReactNode;
  sources: readonly SourceCatalogRecord[];
  view: "list" | "card" | "table";
}) {
  if (count === 0) {
    return (
      <>
        {loading ? (
          <EmptyState
            description="Reading verified opportunities from the OppSift database."
            title="Loading opportunities"
          />
        ) : error ? (
          <EmptyState
            description={error}
            title="Live opportunities could not be loaded"
          />
        ) : (
          <EmptyState
            description="No verified opportunities match these filters. Records appear once an approved source completes a collection run."
            title="No live opportunities to display"
          />
        )}
        {sources.length > 0 && (
          <section aria-labelledby="publisher-links-title" className="discovery-source-links">
            <div>
              <h2 id="publisher-links-title">Publisher source websites</h2>
              <p>These are source leads, not live OppSift feeds. Check each site for current notices.</p>
            </div>
            <ul>
              {sources.map((source) => (
                <li key={source.id}>
                  <a href={source.officialUrl} rel="noreferrer" target="_blank">
                    {source.name}
                    <span aria-hidden="true"> ↗</span>
                  </a>
                  <span>{source.scope}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </>
    );
  }
  if (view === "table") {
    return (
      <>
        <div aria-label="Compact opportunity results" className="ui-table-scroll discovery-table" role="region" tabIndex={0}>
          <table className="ui-table">
            <caption>Opportunity search results</caption>
            <thead>
              <tr><th scope="col">Title</th><th scope="col">Category</th><th scope="col">Country</th><th scope="col">Publisher</th><th scope="col">Published</th><th scope="col">Closing</th><th scope="col">Source</th><th scope="col">Action</th></tr>
            </thead>
            <tbody>{items.map(renderCompactRow)}</tbody>
          </table>
        </div>
        <SearchPagination count={count} onPageChange={onPageChange} page={page} pageCount={pageCount} />
      </>
    );
  }
  const displayView = view;
  return (
    <div className={`discovery-result-list discovery-result-list--${displayView}`}>
      {items.map(renderOpportunity)}
      <SearchPagination count={count} onPageChange={onPageChange} page={page} pageCount={pageCount} />
    </div>
  );
}

function SearchPagination({ count, onPageChange, page, pageCount }: {
  count: number;
  onPageChange: (page: number) => void;
  page: number;
  pageCount: number;
}) {
  return (
    <nav aria-label="Search result pages" className="search-pagination">
      <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, count)} of {count} records</span>
      <div><Button disabled={page <= 1} onClick={() => onPageChange(page - 1)} size="sm" variant="secondary">Previous</Button><span>Page {page} of {pageCount}</span><Button disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} size="sm" variant="secondary">Next</Button></div>
    </nav>
  );
}

function CountrySelector({ selected, onChange }: { selected: string; onChange: (codes: string[]) => void }) {
  return <label className="country-page-selector">Country scope
    <select aria-label="Country scope" onChange={(event) => onChange(Array.from(event.currentTarget.selectedOptions, (option) => option.value))} multiple value={[selected]}>
      {supportedCountries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
    </select>
  </label>;
}

function CoverageStatus() {
  return <p className="discovery-limitation">Research market recorded · source permissions, live feeds and category coverage are not verified.</p>;
}

function BrowseMarkets({ onSelect }: { onSelect: (code: string) => void }) {
  return (
    <section className="browse-markets">
      <div><h2>Browse approved research markets</h2><p>Market scope is not a claim of operational source coverage.</p></div>
      <div>{supportedCountries.map((country) => <button key={country.code} onClick={() => onSelect(country.code)} type="button"><strong>{country.name}</strong><span>{country.region}</span></button>)}</div>
    </section>
  );
}

function PageIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <header className="discovery-intro"><p>{eyebrow}</p><h1>{title}</h1><span>{description}</span></header>;
}

function BrowserOnlyNotice() {
  return <p className="browser-only-notice">This information is stored in this browser only. It is not server-synced, shared with an organisation, or a secure account record.</p>;
}

function StorageError({ message }: { message: string }) {
  return message ? <p className="discovery-error" role="alert">{message}</p> : null;
}
