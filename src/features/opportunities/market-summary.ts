import { useEffect, useState } from "react";
import { neonClient } from "../../app/auth/neon-client";
import { useAuthReady } from "./auth-ready";

// A single database-derived set of market facts (migration 0043). Nothing here
// is hand-maintained — the view is recomputed from the real tables, so new
// countries and sources show up without frontend edits.

export type MarketSummary = {
  totalSources: number;
  activeSources: number;
  verifiedSources: number;
  connectorReadySources: number;
  countriesWithSources: number;
  storedOpportunities: number;
  countriesWithRecords: number;
  liveCountries: number;
  monitoredCountries: number;
  lastIngestionAt: string | null;
};

export type MarketSummaryResult = {
  summary: MarketSummary | null;
  loading: boolean;
  error: string | null;
};

type SummaryRow = {
  total_sources: number | null;
  active_sources: number | null;
  verified_sources: number | null;
  connector_ready_sources: number | null;
  countries_with_sources: number | null;
  stored_opportunities: number | null;
  countries_with_records: number | null;
  live_countries: number | null;
  monitored_countries: number | null;
  last_ingestion_at: string | null;
};

function number(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function errorMessage(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const candidate = value as { message?: unknown; hint?: unknown; details?: unknown };
    if (typeof candidate.message === "string") return candidate.message;
    if (typeof candidate.hint === "string") return candidate.hint;
    if (typeof candidate.details === "string") return candidate.details;
  }
  return "The database request could not be completed.";
}

export type ConnectedSource = {
  id: string;
  name: string;
  publisher: string | null;
  officialWebsite: string | null;
  reliabilityStatus: string | null;
  activationStatus: string | null;
};

/** Verified sources mapped to the given countries, straight from the DB. */
export function useCountrySources(countryCodes: readonly string[]): ConnectedSource[] {
  const authReady = useAuthReady();
  const [sources, setSources] = useState<ConnectedSource[]>([]);
  const key = [...countryCodes].sort().join(",");

  useEffect(() => {
    let cancelled = false;
    if (!neonClient || !authReady || key === "") {
      setSources([]);
      return;
    }
    async function load() {
      try {
        const codes = key.split(",");
        const links = await neonClient!
          .from("source_country_coverage")
          .select("source_id, country_code")
          .in("country_code", codes);
        if (cancelled || links.error) return;
        const ids = [...new Set((links.data ?? []).map((row: { source_id: string }) => row.source_id))];
        if (ids.length === 0) {
          setSources([]);
          return;
        }
        const result = await neonClient!
          .from("opportunity_sources")
          .select("id, name, publisher, official_website, reliability_status, activation_status")
          .in("id", ids);
        if (cancelled || result.error) return;
        setSources((result.data ?? []).map((row: Record<string, string | null>) => ({
          id: String(row.id),
          name: String(row.name ?? "Publisher source"),
          publisher: row.publisher,
          officialWebsite: row.official_website,
          reliabilityStatus: row.reliability_status,
          activationStatus: row.activation_status,
        })));
      } catch {
        if (!cancelled) setSources([]);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [key, authReady]);

  return sources;
}

/** All verified publisher sources, read straight from the DB. */
export function useVerifiedSources(): { sources: ConnectedSource[]; loading: boolean; error: string | null } {
  const authReady = useAuthReady();
  const [state, setState] = useState<{ sources: ConnectedSource[]; loading: boolean; error: string | null }>({
    sources: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    if (!neonClient || !authReady) {
      return;
    }
    async function load() {
      try {
        const result = await neonClient!
          .from("opportunity_sources")
          .select("id, name, publisher, official_website, reliability_status, activation_status")
          .order("name")
          .limit(500);
        if (cancelled) return;
        if (result.error) {
          setState({ sources: [], loading: false, error: errorMessage(result.error) });
          return;
        }
        setState({
          sources: (result.data ?? []).map((row: Record<string, string | null>) => ({
            id: String(row.id),
            name: String(row.name ?? "Publisher source"),
            publisher: row.publisher,
            officialWebsite: row.official_website,
            reliabilityStatus: row.reliability_status,
            activationStatus: row.activation_status,
          })),
          loading: false,
          error: null,
        });
      } catch (error) {
        if (!cancelled) setState({ sources: [], loading: false, error: errorMessage(error) });
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [authReady]);

  return state;
}

export function useMarketSummary(): MarketSummaryResult {
  const authReady = useAuthReady();
  const [state, setState] = useState<MarketSummaryResult>({
    summary: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    if (!neonClient || !authReady) {
      return;
    }
    async function load() {
      try {
        const { data, error } = await neonClient!
          .from("market_intelligence_summary")
          .select("*")
          .limit(1);
        if (cancelled) return;
        if (error) {
          setState({ summary: null, loading: false, error: errorMessage(error) });
          return;
        }
        const row = (data?.[0] ?? null) as SummaryRow | null;
        if (!row) {
          setState({ summary: null, loading: false, error: "Market summary is not available." });
          return;
        }
        setState({
          summary: {
            totalSources: number(row.total_sources),
            activeSources: number(row.active_sources),
            verifiedSources: number(row.verified_sources),
            connectorReadySources: number(row.connector_ready_sources),
            countriesWithSources: number(row.countries_with_sources),
            storedOpportunities: number(row.stored_opportunities),
            countriesWithRecords: number(row.countries_with_records),
            liveCountries: number(row.live_countries),
            monitoredCountries: number(row.monitored_countries),
            lastIngestionAt: row.last_ingestion_at ?? null,
          },
          loading: false,
          error: null,
        });
      } catch (error) {
        if (!cancelled) {
          setState({ summary: null, loading: false, error: errorMessage(error) });
        }
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [authReady]);

  return state;
}
