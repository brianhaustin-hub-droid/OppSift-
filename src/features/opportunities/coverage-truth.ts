import { useEffect, useState } from "react";
import { neonClient } from "../../app/auth/neon-client";
import { useAuthReady } from "./auth-ready";

// Coverage truth (migration 0029): a derived view over actual ingestion data.
// Status is never hand-maintained:
//   live      — a successful run with stored rows in the last 72 hours
//   monitored — an active operational source covers the country, but no
//               recent successful stored run
//   roadmap   — neither
// /markets reads this view so the public claim can never drift from reality.

export type CoverageStatus = "live" | "monitored" | "roadmap";

export type CoverageTruthRow = {
  code: string;
  status: CoverageStatus;
  lastSuccessAt: string | null;
  recordCount: number;
  sourceCount: number;
  activeSourceCount: number;
  verifiedSourceCount: number;
};

export type CoverageTruthResult = {
  error: string | null;
  rows: ReadonlyMap<string, CoverageTruthRow>;
};

type CoverageTruthRaw = {
  code: string;
  status: string;
  last_success_at: string | null;
  record_count: number | null;
  source_count: number | null;
  active_source_count: number | null;
  verified_source_count: number | null;
};

function isCoverageStatus(value: string): value is CoverageStatus {
  return value === "live" || value === "monitored" || value === "roadmap";
}

export function useCoverageTruth(): CoverageTruthResult {
  const authReady = useAuthReady();
  const [result, setResult] = useState<CoverageTruthResult>({
    error: null,
    rows: new Map(),
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (neonClient === null || !authReady) {
        if (!cancelled) {
          setResult({
            error: "Coverage truth is unavailable without Neon configuration.",
            rows: new Map(),
          });
        }
        return;
      }
      try {
        const { data, error } = await neonClient
          .from("coverage_truth")
          .select("code, status, last_success_at, record_count, source_count, active_source_count, verified_source_count");
        if (cancelled) return;
        if (error) {
          setResult({ error: (error as { message?: string })?.message ?? "Coverage request failed.", rows: new Map() });
          return;
        }
        const rows = new Map<string, CoverageTruthRow>();
        for (const raw of (data ?? []) as CoverageTruthRaw[]) {
          if (!isCoverageStatus(raw.status)) continue;
          rows.set(raw.code, {
            code: raw.code,
            status: raw.status,
            lastSuccessAt: raw.last_success_at,
            recordCount: raw.record_count ?? 0,
            sourceCount: raw.source_count ?? 0,
            activeSourceCount: raw.active_source_count ?? 0,
            verifiedSourceCount: raw.verified_source_count ?? 0,
          });
        }
        setResult({ error: null, rows });
      } catch (error) {
        if (!cancelled) {
          setResult({ error: (error as { message?: string })?.message ?? "Coverage request failed.", rows: new Map() });
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [authReady]);

  return result;
}
