import { useEffect, useState } from 'react';
import { neonClient } from '../../app/auth/neon-client';
import { getSupportedCountry } from '../../features/opportunities/country-registry';
import type {
  CountryCoverage,
  DataSourceRecord,
  EligibilityAssessment,
  Opportunity,
  OpportunityCategory,
  OpportunityStatus,
} from '../types/oppsift';

// Reads the production Neon tables and maps them onto the UI's opportunity,
// source and country shapes. There is no bundled fallback: when the database
// is unreachable the screens show the connection error instead of sample rows.

type OpportunityRow = {
  id: string;
  title: string;
  description: string | null;
  category_code: string;
  country_code: string;
  region: string | null;
  city: string | null;
  issuing_institution: string | null;
  procuring_organization: string | null;
  publisher: string;
  reference_number: string | null;
  published_at: string | null;
  closing_at: string | null;
  time_zone: string | null;
  status: string;
  canonical_url: string;
  original_currency_code: string | null;
  published_amount: number | string | null;
  keywords: string[] | null;
  source_verified_at: string | null;
};

type SourceRow = {
  id: string;
  name: string;
  publisher: string;
  official_website: string;
  source_category: string | null;
  access_method: string | null;
  integration_status: string | null;
  source_health: string | null;
  expected_refresh_hours: number | null;
  last_successful_retrieval: string | null;
  supported_categories: string[] | null;
  attribution_requirements: string | null;
  connector_identifier: string | null;
};

type CoverageLinkRow = { source_id: string; country_code: string };

type CountryRow = {
  alpha2_code: string;
  name: string;
  region: string | null;
  primary_currency_code: string | null;
  time_zones: string[] | null;
};

type CoverageTruthRow = {
  code: string;
  status: string | null;
  last_success_at: string | null;
  record_count: number | string | null;
  source_count: number | string | null;
  active_source_count: number | string | null;
  verified_source_count: number | string | null;
};

const OPPORTUNITY_COLUMNS = [
  'id',
  'title',
  'description',
  'category_code',
  'country_code',
  'region',
  'city',
  'issuing_institution',
  'procuring_organization',
  'publisher',
  'reference_number',
  'published_at',
  'closing_at',
  'time_zone',
  'status',
  'canonical_url',
  'original_currency_code',
  'published_amount',
  'keywords',
  'source_verified_at',
].join(', ');

const SOURCE_COLUMNS = [
  'id',
  'name',
  'publisher',
  'official_website',
  'source_category',
  'access_method',
  'integration_status',
  'source_health',
  'expected_refresh_hours',
  'last_successful_retrieval',
  'supported_categories',
  'attribution_requirements',
  'connector_identifier',
].join(', ');

const PAGE_SIZE = 1000;
// Guards the browser against an unbounded table scan; the exact database
// totals are reported separately so a truncated view is never mistaken for
// the whole corpus.
const MAX_ROWS = 25_000;

type QueryBuilder = {
  select(columns: string): QueryBuilder;
  eq(column: string, value: string): QueryBuilder;
  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }): QueryBuilder;
  range(from: number, to: number): PromiseLike<{ data: unknown; error: unknown }>;
};

type Result<T> = { rows: T[]; error: string | null; truncated: boolean };

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return 'The live data feed could not be reached.';
}

async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>,
): Promise<Result<T>> {
  const rows: T[] = [];
  let from = 0;
  for (;;) {
    const result = await build(from, from + PAGE_SIZE - 1);
    if (result.error) {
      return { rows, error: errorMessage(result.error), truncated: false };
    }
    const batch = (Array.isArray(result.data) ? result.data : []) as T[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) return { rows, error: null, truncated: false };
    from += PAGE_SIZE;
    if (rows.length >= MAX_ROWS) return { rows, error: null, truncated: true };
  }
}

function countryName(code: string): string {
  return getSupportedCountry(code)?.name ?? code;
}

function countryRegion(code: string): string {
  return getSupportedCountry(code)?.region ?? 'International';
}

function toCategory(code: string): OpportunityCategory {
  if (code === 'grants') return 'Grant & Funding';
  if (code === 'commercial') return 'Commercial Contract';
  return 'Government Tender';
}

function toStatus(status: string, closingAt: string | null): OpportunityStatus {
  if (status === 'awarded') return 'Awarded';
  if (status === 'closed' || status === 'cancelled') return 'Closed';
  if (closingAt) {
    const remaining = new Date(closingAt).getTime() - Date.now();
    if (Number.isFinite(remaining) && remaining > 0 && remaining <= 5 * 86_400_000) {
      return 'Closing Soon';
    }
  }
  return 'Open';
}

function isoDay(value: string | null): string {
  if (!value) return '';
  return value.slice(0, 10);
}

function amountOf(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function unverifiedEligibility(canonicalUrl: string): EligibilityAssessment {
  return {
    status: 'Unverified',
    confidenceLabel: 'Low Confidence',
    matchedCriteria: [],
    potentialDisqualifiers: [],
    missingInformation: ['Eligibility criteria have not been extracted from this source notice.'],
    evidenceReferences: [canonicalUrl],
    explanation:
      'OppSift holds the verified notice fields from the issuing source. The eligibility matrix is generated only after the notice documents are analysed.',
    disclaimer:
      'Eligibility guidance is decision support, not legal advice. Always confirm requirements against the issuing authority documents.',
    criteriaMatrix: [],
    recommendedNextSteps: ['Open the issuing source notice and review the submission requirements.'],
    riskObservations: [],
  };
}

function toOpportunity(row: OpportunityRow): Opportunity {
  const code = row.country_code.toUpperCase();
  const organization =
    row.procuring_organization?.trim() ||
    row.issuing_institution?.trim() ||
    row.publisher?.trim() ||
    'Publisher not stated';
  return {
    id: row.id,
    referenceNumber: row.reference_number?.trim() || 'No reference',
    title: row.title,
    category: toCategory(row.category_code),
    issuingOrganisation: organization,
    issuerProfile: {
      type: row.category_code === 'commercial' ? 'Commercial publisher' : 'Public authority',
      jurisdiction: countryName(code),
      portal: row.publisher,
      contactNote: 'Clarification routes are set by the issuing authority.',
    },
    countryCode: code,
    countryName: countryName(code),
    region: row.region?.trim() || countryRegion(code),
    location: row.city?.trim() || row.region?.trim() || countryName(code),
    sector: row.keywords?.[0] || 'General procurement',
    publicationDate: isoDay(row.published_at),
    deadlineDate: row.closing_at ?? '',
    deadlineTimezone: row.time_zone || 'UTC',
    estimatedValue: amountOf(row.published_amount),
    currency: row.original_currency_code || 'USD',
    status: toStatus(row.status, row.closing_at),
    sourceId: '',
    sourceName: row.publisher,
    sourceUrl: row.canonical_url,
    lastVerifiedAt: row.source_verified_at ?? row.published_at ?? '',
    summary: row.description?.trim() || `${row.title} — published by ${organization}.`,
    description: row.description?.trim() || `${row.title} — published by ${organization}.`,
    requirements: [],
    evaluationCriteria: [],
    keyObligations: [],
    restrictions: [],
    applicationInstructions: 'Follow the submission instructions on the issuing source notice.',
    documents: [],
    amendments: [],
    clarifications: [],
    verificationHistory: row.source_verified_at
      ? [
          {
            timestamp: row.source_verified_at.replace('T', ' ').slice(0, 16) + ' UTC',
            event: 'Notice verified against the issuing source',
            actor: row.publisher,
          },
        ]
      : [],
    eligibility: unverifiedEligibility(row.canonical_url),
    matchScore: 0,
  };
}

function accessMethodOf(value: string | null): DataSourceRecord['accessMethod'] {
  if (value === 'api') return 'Official API';
  if (value === 'feed' || value === 'download') return 'Structured Feed';
  return 'Portal Monitor';
}

function availabilityOf(row: SourceRow): DataSourceRecord['availability'] {
  if (row.integration_status === 'operational') return 'Connected';
  if (row.integration_status === 'tested' || row.integration_status === 'in_development') {
    return 'Scheduled';
  }
  return 'Unavailable';
}

function toSource(
  row: SourceRow,
  countryCodes: readonly string[],
  primaryCode: string,
): DataSourceRecord {
  const availability = availabilityOf(row);
  const hours = row.expected_refresh_hours;
  const extraMarkets = countryCodes.length - 1;
  const scopeName = primaryCode === 'INT'
    ? 'Multi-country'
    : extraMarkets > 0
      ? `${countryName(primaryCode)} +${extraMarkets}`
      : countryName(primaryCode);
  return {
    id: row.id,
    name: row.name,
    countryCode: primaryCode,
    countryName: scopeName,
    category: row.supported_categories?.join(', ') || row.source_category || 'Public procurement',
    officialWebsite: row.official_website,
    accessMethod: accessMethodOf(row.access_method),
    availability,
    syncFrequency: hours ? `Every ${hours} hours` : 'Scheduled refresh',
    lastUpdated: row.last_successful_retrieval ?? '',
    attribution: row.attribution_requirements?.trim() || row.publisher,
    verificationNotes:
      availability === 'Connected'
        ? 'Operational connector verified against the official source.'
        : 'Source registered in the catalogue; connector not yet operational.',
    lastError:
      row.source_health === 'unavailable' || row.source_health === 'degraded'
        ? 'Last retrieval did not complete successfully.'
        : undefined,
  };
}

function numberOr(value: number | string | null, fallback: number): number {
  if (value === null) return fallback;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildCountries(
  opportunities: readonly Opportunity[],
  sources: readonly DataSourceRecord[],
  countryRows: readonly CountryRow[],
  coverageRows: readonly CoverageTruthRow[],
): CountryCoverage[] {
  const truthByCode = new Map(coverageRows.map((row) => [row.code.toUpperCase(), row]));
  const codes = new Set<string>([
    ...countryRows.map((row) => row.alpha2_code.toUpperCase()),
    ...opportunities.map((o) => o.countryCode),
    ...sources.map((s) => s.countryCode),
    ...coverageRows.map((row) => row.code.toUpperCase()),
  ]);
  codes.delete('INT');

  const metadata = new Map(countryRows.map((row) => [row.alpha2_code.toUpperCase(), row]));
  const coverage: CountryCoverage[] = [];

  for (const code of codes) {
    const records = opportunities.filter((o) => o.countryCode === code);
    const countrySources = sources.filter((s) => s.countryCode === code);
    const truth = truthByCode.get(code);
    const meta = metadata.get(code);
    const sectorCounts = new Map<string, number>();
    const institutions = new Set<string>();
    for (const record of records) {
      sectorCounts.set(record.sector, (sectorCounts.get(record.sector) ?? 0) + 1);
      institutions.add(record.issuingOrganisation);
    }
    const lastUpdated =
      [truth?.last_success_at ?? '', ...records.map((r) => r.lastVerifiedAt), ...countrySources.map((s) => s.lastUpdated)]
        .filter(Boolean)
        .sort()
        .at(-1) ?? '';
    const storedRecords = numberOr(truth?.record_count ?? null, records.length);
    const sourceCount = numberOr(truth?.source_count ?? null, countrySources.length);
    const activeSources = numberOr(
      truth?.active_source_count ?? null,
      countrySources.filter((s) => s.availability === 'Connected').length,
    );

    coverage.push({
      code,
      name: meta?.name ?? countryName(code),
      region: meta?.region
        ? meta.region.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
        : countryRegion(code),
      currency: meta?.primary_currency_code || records[0]?.currency || 'USD',
      timezone: meta?.time_zones?.[0] || records[0]?.deadlineTimezone || 'UTC',
      activeSourcesCount: activeSources,
      categoriesSupported: [...new Set(records.map((r) => r.category))],
      coverageStatus:
        storedRecords > 0 ? 'Active' : sourceCount > 0 ? 'Partial' : 'Planned',
      lastUpdated,
      sampleRecordCount: storedRecords,
      topSectors: [...sectorCounts.entries()]
        .map(([sector, count]) => ({ sector, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3),
      issuingInstitutions: [...institutions].slice(0, 5),
    });
  }

  return coverage.sort((a, b) => b.sampleRecordCount - a.sampleRecordCount);
}

export type LiveData = {
  opportunities: Opportunity[];
  awards: Opportunity[];
  sources: DataSourceRecord[];
  countries: CountryCoverage[];
  totalOpportunities: number;
  totalAwards: number;
  totalSources: number;
  totalCountries: number;
  truncated: boolean;
  loading: boolean;
  error: string | null;
  configured: boolean;
  lastSyncedAt: string | null;
};

const EMPTY: LiveData = {
  opportunities: [],
  awards: [],
  sources: [],
  countries: [],
  totalOpportunities: 0,
  totalAwards: 0,
  totalSources: 0,
  totalCountries: 0,
  truncated: false,
  loading: false,
  error: null,
  configured: false,
  lastSyncedAt: null,
};

export function useLiveData(): LiveData {
  const [state, setState] = useState<LiveData>(() => ({
    ...EMPTY,
    loading: neonClient !== null,
    configured: neonClient !== null,
  }));

  useEffect(() => {
    if (!neonClient) {
      setState(EMPTY);
      return;
    }
    const db = neonClient as unknown as { from(table: string): QueryBuilder };
    let cancelled = false;

    async function load() {
      try {
        const [opportunityResult, awardResult, sourceResult, coverageResult, countryResult, truthResult] =
          await Promise.all([
            fetchAll<OpportunityRow>((from, to) =>
              db
                .from('opportunities')
                .select(OPPORTUNITY_COLUMNS)
                .order('published_at', { ascending: false, nullsFirst: false })
                .range(from, to),
            ),
            fetchAll<OpportunityRow>((from, to) =>
              db
                .from('opportunities')
                .select(OPPORTUNITY_COLUMNS)
                .eq('status', 'awarded')
                .order('published_at', { ascending: false, nullsFirst: false })
                .range(from, to),
            ),
            fetchAll<SourceRow>((from, to) =>
              db.from('opportunity_sources').select(SOURCE_COLUMNS).order('name').range(from, to),
            ),
            fetchAll<CoverageLinkRow>((from, to) =>
              db
                .from('source_country_coverage')
                .select('source_id, country_code')
                .range(from, to),
            ),
            fetchAll<CountryRow>((from, to) =>
              db
                .from('global_countries')
                .select('alpha2_code, name, region, primary_currency_code, time_zones')
                .order('name')
                .range(from, to),
            ),
            fetchAll<CoverageTruthRow>((from, to) =>
              db
                .from('coverage_truth')
                .select('code, status, last_success_at, record_count, source_count, active_source_count, verified_source_count')
                .range(from, to),
            ),
          ]);
        if (cancelled) return;

        const failure =
          opportunityResult.error ??
          sourceResult.error ??
          coverageResult.error ??
          countryResult.error ??
          truthResult.error;
        if (failure) {
          setState({ ...EMPTY, configured: true, loading: false, error: failure });
          return;
        }

        // A failing award query (for example a permissions restriction) must
        // not blank the opportunity feed, so it is reported separately.
        const baseOpportunities = opportunityResult.rows
          .filter((row) => row && row.id && row.title)
          .map(toOpportunity);
        const awards = awardResult.rows
          .filter((row) => row && row.id && row.title)
          .map(toOpportunity);
        const opportunities = [...baseOpportunities];
        for (const award of awards) {
          if (!opportunities.some((item) => item.id === award.id)) opportunities.push(award);
        }

        const countryCodesBySource = new Map<string, string[]>();
        for (const link of coverageResult.rows) {
          if (!link?.source_id || !link.country_code) continue;
          const code = link.country_code.toUpperCase();
          const existing = countryCodesBySource.get(link.source_id);
          if (existing) {
            if (!existing.includes(code)) existing.push(code);
          } else {
            countryCodesBySource.set(link.source_id, [code]);
          }
        }

        const sources = sourceResult.rows
          .filter((row) => row && row.id && row.name)
          .map((row) => {
            const codes = countryCodesBySource.get(row.id) ?? [];
            return toSource(row, codes, codes[0] ?? 'INT');
          });

        const countries = buildCountries(opportunities, sources, countryResult.rows, truthResult.rows);

        setState({
          opportunities,
          awards: awards.length > 0 ? awards : opportunities.filter((item) => item.status === 'Awarded'),
          sources,
          countries,
          totalOpportunities: opportunities.length,
          totalAwards: awards.length,
          totalSources: sources.length,
          totalCountries: countries.length,
          truncated:
            opportunityResult.truncated ||
            sourceResult.truncated ||
            coverageResult.truncated ||
            countryResult.truncated,
          loading: false,
          error: null,
          configured: true,
          lastSyncedAt: new Date().toISOString(),
        });
      } catch (error) {
        if (!cancelled) {
          setState({ ...EMPTY, configured: true, loading: false, error: errorMessage(error) });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
