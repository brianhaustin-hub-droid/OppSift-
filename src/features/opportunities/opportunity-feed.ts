import { useEffect, useState } from "react";
import { neonClient } from "../../app/auth/neon-client";
import { supportedCountries } from "./country-registry";

export type OpportunityCategory = "commercial" | "government" | "grants";

export const categoryLabels: Readonly<Record<OpportunityCategory, string>> = {
  commercial: "Commercial opportunities",
  government: "Government contracts",
  grants: "Grants & funding",
};

export type LiveOpportunity = {
  canonicalUrl: string;
  category: OpportunityCategory;
  categoryLabel: string;
  closingAt: string | null;
  countryCode: string;
  countryLabel: string;
  deadlineLabel: string;
  id: string;
  organization: string;
  publishedAt: string | null;
  publishedLabel: string;
  reference: string;
  status: string;
  title: string;
};

export type OpportunityFilters = {
  category: OpportunityCategory | "all";
  countryCodes: readonly string[];
  query: string;
  status?: string;
};

export type OpportunityFeedResult = {
  error: string;
  opportunities: readonly LiveOpportunity[];
};

type OpportunityRow = {
  canonical_url: string;
  category_code: string;
  closing_at: string | null;
  country_code: string;
  id: string;
  procuring_organization: string | null;
  published_at: string | null;
  reference_number: string | null;
  status: string;
  title: string;
};

const SELECTED_COLUMNS =
  "id, title, category_code, country_code, closing_at, published_at, procuring_organization, reference_number, status, canonical_url";

const dateFormatter = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });

// A build without Neon endpoints has no feed to read. That is reported on the
// Backend status page rather than as a failed request on every listing.
export const liveFeedConfigured = neonClient !== null;

function isOpportunityCategory(value: string): value is OpportunityCategory {
  return value === "commercial" || value === "government" || value === "grants";
}

function dateLabel(value: string | null): string {
  if (!value) return "Not published";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not published" : dateFormatter.format(date);
}

function deadlineLabel(value: string | null): string {
  if (!value) return "No closing date";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "No closing date" : dateFormatter.format(date);
}

function countryLabel(code: string): string {
  return supportedCountries.find((country) => country.code === code)?.name ?? code;
}

// PostgREST .or() splits on commas and treats % and _ as LIKE wildcards, so the
// search term has to be stripped of both before it reaches the query string.
function sanitizeSearchTerm(value: string): string {
  return value.replace(/[%_,()]/g, " ").replace(/\s+/g, " ").trim();
}

function toLiveOpportunity(row: OpportunityRow): LiveOpportunity | null {
  if (!isOpportunityCategory(row.category_code)) return null;
  return {
    canonicalUrl: row.canonical_url,
    category: row.category_code,
    categoryLabel: categoryLabels[row.category_code],
    closingAt: row.closing_at,
    countryCode: row.country_code,
    countryLabel: countryLabel(row.country_code),
    deadlineLabel: deadlineLabel(row.closing_at),
    id: row.id,
    organization: row.procuring_organization?.trim() || "Publisher not stated",
    publishedAt: row.published_at,
    publishedLabel: dateLabel(row.published_at),
    reference: row.reference_number?.trim() || "No reference",
    status: row.status,
    title: row.title,
  };
}

function readRows(data: unknown): readonly LiveOpportunity[] {
  const rows = (data ?? []) as unknown as OpportunityRow[];
  return rows
    .map(toLiveOpportunity)
    .filter((row): row is LiveOpportunity => row !== null);
}

function describeFailure(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "The live opportunity feed could not be reached.";
}

export async function fetchLiveOpportunities(
  filters: OpportunityFilters,
): Promise<OpportunityFeedResult> {
  if (!neonClient) return { error: "", opportunities: [] };

  let request = neonClient.from("opportunities").select(SELECTED_COLUMNS);
  // Live opportunities first by default; closed/awarded records are kept in
  // the database but should not crowd out current opportunities in the feed.
  request = request.eq("status", filters.status ?? "open");
  if (filters.category !== "all") request = request.eq("category_code", filters.category);
  if (filters.countryCodes.length > 0) {
    request = request.in("country_code", [...filters.countryCodes]);
  }

  const term = sanitizeSearchTerm(filters.query);
  if (term) {
    request = request.or(
      `title.ilike.%${term}%,procuring_organization.ilike.%${term}%,reference_number.ilike.%${term}%`,
    );
  }

  try {
    const result = await request
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(200);
    if (result.error) return { error: result.error.message, opportunities: [] };
    return { error: "", opportunities: readRows(result.data) };
  } catch (error) {
    return { error: describeFailure(error), opportunities: [] };
  }
}

export async function fetchLiveOpportunity(
  id: string,
): Promise<OpportunityFeedResult> {
  if (!neonClient) return { error: "", opportunities: [] };

  try {
    const result = await neonClient
      .from("opportunities")
      .select(SELECTED_COLUMNS)
      .eq("id", id)
      .limit(1);
    if (result.error) return { error: result.error.message, opportunities: [] };
    return { error: "", opportunities: readRows(result.data) };
  } catch (error) {
    return { error: describeFailure(error), opportunities: [] };
  }
}

export async function fetchLiveOpportunitiesByIds(
  ids: readonly string[],
): Promise<OpportunityFeedResult> {
  if (ids.length === 0) return { error: "", opportunities: [] };
  if (!neonClient) return { error: "", opportunities: [] };

  try {
    const result = await neonClient
      .from("opportunities")
      .select(SELECTED_COLUMNS)
      .in("id", [...ids]);
    if (result.error) return { error: result.error.message, opportunities: [] };
    return { error: "", opportunities: readRows(result.data) };
  } catch (error) {
    return { error: describeFailure(error), opportunities: [] };
  }
}

export async function fetchActiveSourceCount(): Promise<{ count: number; error: string }> {
  if (!neonClient) return { count: 0, error: "" };

  try {
    const result = await neonClient
      .from("opportunity_sources")
      .select("id")
      .eq("activation_status", "active");
    if (result.error) return { count: 0, error: result.error.message };
    return { count: (result.data ?? []).length, error: "" };
  } catch (error) {
    return { count: 0, error: describeFailure(error) };
  }
}

export type LiveOpportunityState = {
  error: string;
  isLoading: boolean;
  opportunity: LiveOpportunity | null;
};

export function useLiveOpportunity(id: string): LiveOpportunityState {
  const [state, setState] = useState<LiveOpportunityState>({
    error: "",
    isLoading: true,
    opportunity: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState({ error: "", isLoading: true, opportunity: null });
    void fetchLiveOpportunity(id).then((result) => {
      if (cancelled) return;
      setState({
        error: result.error,
        isLoading: false,
        opportunity: result.opportunities[0] ?? null,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return state;
}

export function useLiveOpportunityIndex(ids: readonly string[]) {
  // Joined into a primitive so a new array identity each render cannot retrigger
  // the effect and loop.
  const key = ids.join(",");
  const [index, setIndex] = useState<ReadonlyMap<string, LiveOpportunity>>(
    () => new Map(),
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!key) {
      setIndex(new Map());
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    void fetchLiveOpportunitiesByIds(key.split(",")).then((result) => {
      if (cancelled) return;
      setIndex(new Map(result.opportunities.map((item) => [item.id, item])));
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return { index, isLoading };
}
