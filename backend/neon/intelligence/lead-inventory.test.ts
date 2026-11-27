import { describe, expect, it } from 'vitest';
import {
  LEAD_DEFINITION_COUNT,
  LEAD_KIND_LABELS,
  MINIMUM_LEADS_PER_COUNTRY,
  buildCountryLeads,
  leadKindCounts,
} from './lead-inventory';

describe('country lead inventory', () => {
  it('offers at least 50 named leads per country', () => {
    const leads = buildCountryLeads('ke');
    expect(leads.length).toBeGreaterThanOrEqual(MINIMUM_LEADS_PER_COUNTRY);
    expect(leads.length).toBe(LEAD_DEFINITION_COUNT);
  });

  it('keeps every lead name unique within a country', () => {
    const names = buildCountryLeads('BR').map((lead) => lead.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('marks every lead unverified and invents no website', () => {
    for (const lead of buildCountryLeads('GH')) {
      expect(lead.status).toBe('unverified_lead');
      expect(lead.officialWebsite).toBeNull();
      expect(lead.discoveryBasis.length).toBeGreaterThan(20);
    }
  });

  it('assigns the requested country and a stable order', () => {
    const leads = buildCountryLeads('za');
    expect(leads.every((lead) => lead.countryCode === 'ZA')).toBe(true);
    expect(leads.map((lead) => lead.sortOrder)).toEqual(leads.map((_, index) => index + 1));
    expect(buildCountryLeads('ZA')).toEqual(leads);
  });

  it('covers every lead kind and labels it', () => {
    const counts = leadKindCounts(buildCountryLeads('US'));
    const kinds = Object.keys(LEAD_KIND_LABELS);
    for (const kind of kinds) {
      expect(counts[kind] ?? 0).toBeGreaterThan(0);
    }
    expect(Object.keys(counts).sort()).toEqual([...kinds].sort());
  });

  it('rejects anything that is not a two-letter country code', () => {
    expect(() => buildCountryLeads('KEN')).toThrow(/two-letter/);
    expect(() => buildCountryLeads('')).toThrow(/two-letter/);
  });
});
