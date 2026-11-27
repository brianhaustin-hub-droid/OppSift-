/**
 * Per-country lead inventory.
 *
 * A lead is a *named buying function* identified for a country. It is not a
 * source: nothing is crawled, no notices are collected, and no lead is counted
 * in coverage. A lead becomes a source only after its publisher, official
 * tender URL, access method and reuse terms are confirmed, a connector exists
 * and `coverage_truth` reports stored records.
 *
 * The catalogue below is deliberately functional rather than speculative. Each
 * entry names a public buying function that exists in every national
 * administration (a health ministry or department, a central bank, a ports
 * authority, a capital-city council). No portal URL is invented: `officialWebsite`
 * is null until a real URL has been read from the publisher, so the country page
 * can show the lead without implying a link exists.
 */

export type LeadKind =
  | 'national_buyer'
  | 'central_agency'
  | 'state_owned_enterprise'
  | 'subnational'
  | 'sector_programme'
  | 'development_partner'
  | 'grants_funding'
  | 'commercial';

export interface LeadDefinition {
  readonly name: string;
  readonly kind: LeadKind;
  readonly sector: string;
}

export interface CountryLead extends LeadDefinition {
  readonly countryCode: string;
  readonly status: 'unverified_lead';
  readonly sortOrder: number;
  readonly officialWebsite: null;
  readonly discoveryBasis: string;
}

export const MINIMUM_LEADS_PER_COUNTRY = 50;

export const LEAD_KIND_LABELS: Record<LeadKind, string> = {
  national_buyer: 'National ministries and departments',
  central_agency: 'Central agencies and regulators',
  state_owned_enterprise: 'State-owned enterprises and utilities',
  subnational: 'Subnational government',
  sector_programme: 'Public programmes and funds',
  development_partner: 'Development partners',
  grants_funding: 'Grants and business support',
  commercial: 'Commercial and membership bodies',
};

const DISCOVERY_BASIS: Record<LeadKind, string> = {
  national_buyer:
    'Named national buying function identified for this jurisdiction. Tender publication, official URL and reuse terms not yet confirmed.',
  central_agency:
    'Named central agency or regulator identified for this jurisdiction. Whether it publishes its own tenders, and under what terms, is not yet confirmed.',
  state_owned_enterprise:
    'Named state-owned provider identified for this jurisdiction. Procurement publication route and terms not yet confirmed.',
  subnational:
    'Named subnational tier identified for this jurisdiction. Individual council procurement pages are not yet confirmed.',
  sector_programme:
    'Named publicly funded programme or fund identified for this jurisdiction. Procurement route not yet confirmed.',
  development_partner:
    'Named development-finance or donor channel that advertises country work. Country-specific publication route not yet confirmed.',
  grants_funding:
    'Named public grant or business-support channel identified for this jurisdiction. Call publication route not yet confirmed.',
  commercial:
    'Named commercial or membership body that aggregates supplier opportunities. Publication route and terms not yet confirmed.',
};

/**
 * 73 named buying functions, ordered so the country page reads from national
 * government down to commercial channels. The list is intentionally identical
 * across countries: it is a checklist of institutions to verify, not a claim
 * that each one advertises tenders online.
 */
const LEAD_DEFINITIONS: readonly LeadDefinition[] = [
  // National ministries and departments (20)
  { name: 'Health — national ministry or department', kind: 'national_buyer', sector: 'Health' },
  { name: 'Education — national ministry or department', kind: 'national_buyer', sector: 'Education' },
  { name: 'Finance and treasury — national ministry', kind: 'national_buyer', sector: 'Finance' },
  { name: 'Public works — national ministry or agency', kind: 'national_buyer', sector: 'Infrastructure' },
  { name: 'Transport — national ministry or agency', kind: 'national_buyer', sector: 'Transport' },
  { name: 'Water and sanitation — national ministry', kind: 'national_buyer', sector: 'Water' },
  { name: 'Energy — national ministry or regulator', kind: 'national_buyer', sector: 'Energy' },
  { name: 'Agriculture — national ministry or agency', kind: 'national_buyer', sector: 'Agriculture' },
  { name: 'Defence — national ministry or armed forces procurement', kind: 'national_buyer', sector: 'Defence' },
  { name: 'Interior and police — national ministry', kind: 'national_buyer', sector: 'Public order' },
  { name: 'Environment and climate — national ministry', kind: 'national_buyer', sector: 'Environment' },
  { name: 'Housing and urban development — national ministry', kind: 'national_buyer', sector: 'Housing' },
  { name: 'Digital government and ICT — national ministry or agency', kind: 'national_buyer', sector: 'Digital government' },
  { name: 'Trade and industry — national ministry', kind: 'national_buyer', sector: 'Trade and industry' },
  { name: 'Labour and social affairs — national ministry', kind: 'national_buyer', sector: 'Labour' },
  { name: 'Justice and corrections — national ministry', kind: 'national_buyer', sector: 'Justice' },
  { name: 'Foreign affairs — national ministry and missions abroad', kind: 'national_buyer', sector: 'Foreign affairs' },
  { name: 'Fisheries and marine resources — national authority', kind: 'national_buyer', sector: 'Fisheries' },
  { name: 'Mining and geology — national ministry or survey', kind: 'national_buyer', sector: 'Mining' },
  { name: 'Tourism and culture — national ministry or authority', kind: 'national_buyer', sector: 'Tourism and culture' },

  // Central agencies and regulators (9)
  { name: 'Public procurement regulator', kind: 'central_agency', sector: 'Procurement oversight' },
  { name: 'National audit office', kind: 'central_agency', sector: 'Audit' },
  { name: 'Central bank', kind: 'central_agency', sector: 'Monetary' },
  { name: 'National statistics office', kind: 'central_agency', sector: 'Statistics' },
  { name: 'Official gazette and procurement bulletin', kind: 'central_agency', sector: 'Publishing' },
  { name: 'Anti-corruption commission', kind: 'central_agency', sector: 'Anti-corruption' },
  { name: 'Public service commission', kind: 'central_agency', sector: 'Public administration' },
  { name: 'National revenue authority', kind: 'central_agency', sector: 'Revenue' },
  { name: 'Public-private partnership unit', kind: 'central_agency', sector: 'PPP' },

  // State-owned enterprises and utilities (12)
  { name: 'National electricity utility', kind: 'state_owned_enterprise', sector: 'Utilities' },
  { name: 'National water utility', kind: 'state_owned_enterprise', sector: 'Water' },
  { name: 'National oil and gas company', kind: 'state_owned_enterprise', sector: 'Oil and gas' },
  { name: 'National ports authority', kind: 'state_owned_enterprise', sector: 'Ports' },
  { name: 'National airports authority', kind: 'state_owned_enterprise', sector: 'Aviation' },
  { name: 'National railway corporation', kind: 'state_owned_enterprise', sector: 'Rail' },
  { name: 'National roads authority', kind: 'state_owned_enterprise', sector: 'Roads' },
  { name: 'National telecommunications operator', kind: 'state_owned_enterprise', sector: 'Telecommunications' },
  { name: 'National postal service', kind: 'state_owned_enterprise', sector: 'Postal' },
  { name: 'National housing corporation', kind: 'state_owned_enterprise', sector: 'Housing' },
  { name: 'National mining company', kind: 'state_owned_enterprise', sector: 'Mining' },
  { name: 'National broadcaster', kind: 'state_owned_enterprise', sector: 'Media' },

  // Subnational government (7)
  { name: 'Capital city municipal council', kind: 'subnational', sector: 'Local government' },
  { name: 'Capital region metropolitan authority', kind: 'subnational', sector: 'Local government' },
  { name: 'Provincial and state governments — procurement offices', kind: 'subnational', sector: 'Local government' },
  { name: 'District and county governments — procurement offices', kind: 'subnational', sector: 'Local government' },
  { name: 'Public hospitals — group purchasing', kind: 'subnational', sector: 'Health' },
  { name: 'Public universities — procurement offices', kind: 'subnational', sector: 'Higher education' },
  { name: 'Public schools — regional procurement', kind: 'subnational', sector: 'Education' },

  // Public programmes and funds (8)
  { name: 'National health insurance fund', kind: 'sector_programme', sector: 'Health insurance' },
  { name: 'Social security institution', kind: 'sector_programme', sector: 'Social protection' },
  { name: 'University grants commission or higher education council', kind: 'sector_programme', sector: 'Higher education' },
  { name: 'National research and innovation fund', kind: 'sector_programme', sector: 'Research' },
  { name: 'National scholarship programme', kind: 'sector_programme', sector: 'Scholarships' },
  { name: 'National agricultural development programme', kind: 'sector_programme', sector: 'Agriculture' },
  { name: 'National infrastructure programme', kind: 'sector_programme', sector: 'Infrastructure' },
  { name: 'National digital government programme', kind: 'sector_programme', sector: 'Digital government' },

  // Development partners (8)
  { name: 'Multilateral development bank-financed projects', kind: 'development_partner', sector: 'Development finance' },
  { name: 'Regional development bank-financed projects', kind: 'development_partner', sector: 'Development finance' },
  { name: 'United Nations country team — procurement', kind: 'development_partner', sector: 'Humanitarian' },
  { name: 'UN agency country offices (UNDP, UNICEF, WFP)', kind: 'development_partner', sector: 'Humanitarian' },
  { name: 'European Union delegation — calls for proposals', kind: 'development_partner', sector: 'EU funding' },
  { name: 'Bilateral development agencies — local programmes', kind: 'development_partner', sector: 'Development cooperation' },
  { name: 'Global health programmes (Global Fund, Gavi)', kind: 'development_partner', sector: 'Health' },
  { name: 'Climate and environment funds — national programmes', kind: 'development_partner', sector: 'Climate' },

  // Grants and business support (5)
  { name: 'National innovation and startup fund', kind: 'grants_funding', sector: 'Innovation' },
  { name: 'National SME development agency', kind: 'grants_funding', sector: 'SME support' },
  { name: 'National export promotion agency', kind: 'grants_funding', sector: 'Export promotion' },
  { name: 'National environment and climate fund', kind: 'grants_funding', sector: 'Environment' },
  { name: 'National arts, culture and heritage fund', kind: 'grants_funding', sector: 'Culture' },

  // Commercial and membership bodies (4)
  { name: 'National chamber of commerce — tender notices', kind: 'commercial', sector: 'Business membership' },
  { name: 'National employers federation — procurement notices', kind: 'commercial', sector: 'Employers' },
  { name: 'Industry associations — supplier opportunities', kind: 'commercial', sector: 'Industry' },
  { name: 'Private utilities and concessions — procurement', kind: 'commercial', sector: 'Concessions' },
];

export const LEAD_DEFINITION_COUNT = LEAD_DEFINITIONS.length;

/** Leads for one country, in a stable order, all marked unverified. */
export function buildCountryLeads(countryCode: string): CountryLead[] {
  const code = countryCode.trim().toUpperCase();
  if (code.length !== 2) throw new Error(`Expected a two-letter country code, received "${countryCode}"`);
  return LEAD_DEFINITIONS.map((definition, index) => ({
    ...definition,
    countryCode: code,
    status: 'unverified_lead' as const,
    sortOrder: index + 1,
    officialWebsite: null,
    discoveryBasis: DISCOVERY_BASIS[definition.kind],
  }));
}

export function leadKindCounts(leads: readonly CountryLead[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const lead of leads) counts[lead.kind] = (counts[lead.kind] ?? 0) + 1;
  return counts;
}
