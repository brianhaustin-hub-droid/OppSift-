import { useEffect, useState } from 'react';
import { neonClient } from '../../app/auth/neon-client';
import type { SourceLead } from '../types/oppsift';

// Reads the unverified lead inventory for one country. Leads are named buying
// functions that have not been verified as sources: nothing is ingested from
// them, so this read is deliberately separate from the source and opportunity
// tables and never adds to coverage counts.

type LeadRow = {
  id: string;
  name: string;
  lead_kind: string;
  sector: string;
  official_website: string | null;
  sort_order: number | string | null;
};

type LeadQuery = {
  select(columns: string): LeadQuery;
  eq(column: string, value: string): LeadQuery;
  order(column: string, options?: { ascending?: boolean }): LeadQuery;
  range(from: number, to: number): PromiseLike<{ data: unknown; error: unknown }>;
};

const LEAD_COLUMNS = 'id, name, lead_kind, sector, official_website, sort_order';
const LEAD_LIMIT = 500;

export interface CountryLeadsState {
  leads: SourceLead[];
  loading: boolean;
  error: string | null;
}

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return 'The lead inventory could not be reached.';
}

export function useCountryLeads(countryCode: string): CountryLeadsState {
  const [state, setState] = useState<CountryLeadsState>(() => ({
    leads: [],
    loading: neonClient !== null,
    error: null,
  }));

  useEffect(() => {
    if (!neonClient || !countryCode) {
      setState({ leads: [], loading: false, error: null });
      return;
    }
    const db = neonClient as unknown as { from(table: string): LeadQuery };
    let cancelled = false;
    setState({ leads: [], loading: true, error: null });

    void (async () => {
      try {
        const result = await db
          .from('source_leads_public')
          .select(LEAD_COLUMNS)
          .eq('country_code', countryCode.toUpperCase())
          .order('sort_order', { ascending: true })
          .range(0, LEAD_LIMIT - 1);
        if (cancelled) return;
        if (result.error) {
          setState({ leads: [], loading: false, error: errorMessage(result.error) });
          return;
        }
        const rows = (Array.isArray(result.data) ? result.data : []) as LeadRow[];
        const leads: SourceLead[] = rows
          .filter((row) => row && row.id && row.name)
          .map((row) => ({
            id: row.id,
            name: row.name,
            leadKind: row.lead_kind,
            sector: row.sector,
            officialWebsite: row.official_website,
          }));
        setState({ leads, loading: false, error: null });
      } catch (error) {
        if (!cancelled) {
          setState({ leads: [], loading: false, error: errorMessage(error) });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [countryCode]);

  return state;
}
