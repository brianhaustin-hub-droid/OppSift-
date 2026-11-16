import type { SearchRequest } from "./contracts";

export type ParameterizedSearchQuery = {
  text: string;
  values: unknown[];
};

const orderBy: Readonly<Record<SearchRequest["sort"], string>> = {
  relevance:
    "exact_title_match DESC, reference_match DESC, relevance DESC, opportunity.published_at DESC NULLS LAST, opportunity.id DESC",
  recent: "opportunity.published_at DESC NULLS LAST, opportunity.id DESC",
  closing: "opportunity.closing_at ASC NULLS LAST, opportunity.id DESC",
  value:
    "opportunity.original_currency_code ASC NULLS LAST, opportunity.published_amount DESC NULLS LAST, opportunity.id DESC",
  updated: "opportunity.updated_at DESC, opportunity.id DESC",
};
const verifiedSourceCondition = `
  opportunity.source_verified_at IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.opportunity_source_records AS verified_record
    JOIN public.opportunity_sources AS verified_source
      ON verified_source.id = verified_record.source_id
    WHERE verified_record.opportunity_id = opportunity.id
      AND verified_source.integration_status = 'operational'
      AND verified_source.reliability_status IN ('verified', 'reliable')
  )`;

export function buildOpportunitySearchQuery(
  request: SearchRequest,
): ParameterizedSearchQuery {
  const values: unknown[] = [];
  const predicates: string[] = [];
  const addValue = (value: unknown) => {
    values.push(value);
    return `$${values.length}`;
  };

  if (request.query) {
    const query = addValue(request.query);
    predicates.push(
      `(opportunity.search_document @@ websearch_to_tsquery('simple', ${query})
        OR opportunity.reference_number ILIKE ('%' || ${query} || '%')
        OR opportunity.issuing_institution ILIKE ('%' || ${query} || '%')
        OR opportunity.procuring_organization ILIKE ('%' || ${query} || '%')
        OR array_to_string(opportunity.industry_codes || opportunity.keywords, ' ') ILIKE ('%' || ${query} || '%')
        OR EXISTS (
          SELECT 1
          FROM public.opportunity_source_records AS searchable_record
          WHERE searchable_record.opportunity_id = opportunity.id
            AND searchable_record.original_title ILIKE ('%' || ${query} || '%')
        ))`,
    );
  }
  if (request.countries.length) {
    predicates.push(`opportunity.country_code = ANY(${addValue(request.countries)}::text[])`);
  }
  if (request.regions.length) {
    predicates.push(`market.region = ANY(${addValue(request.regions)}::text[])`);
  }
  if (request.categories.length) {
    predicates.push(`opportunity.category_code = ANY(${addValue(request.categories)}::text[])`);
  }
  if (request.opportunityTypes.length) {
    predicates.push(`opportunity.opportunity_type_code = ANY(${addValue(request.opportunityTypes)}::text[])`);
  }
  if (request.industries.length) {
    predicates.push(`opportunity.industry_codes && ${addValue(request.industries)}::text[]`);
  }
  if (request.publishers.length) {
    predicates.push(`opportunity.publisher = ANY(${addValue(request.publishers)}::text[])`);
  }
  if (request.sourceIds.length) {
    predicates.push(
      `EXISTS (SELECT 1 FROM public.opportunity_source_records AS source_record WHERE source_record.opportunity_id = opportunity.id AND source_record.source_id = ANY(${addValue(request.sourceIds)}::uuid[]))`,
    );
  }
  if (request.languages.length) {
    predicates.push(
      `EXISTS (SELECT 1 FROM public.opportunity_source_records AS language_record JOIN public.opportunity_sources AS language_source ON language_source.id = language_record.source_id WHERE language_record.opportunity_id = opportunity.id AND language_source.languages && ${addValue(request.languages)}::text[])`,
    );
  }
  if (request.publishedFrom) {
    predicates.push(`opportunity.published_at >= ${addValue(request.publishedFrom)}::date`);
  }
  if (request.publishedTo) {
    predicates.push(`opportunity.published_at < (${addValue(request.publishedTo)}::date + INTERVAL '1 day')`);
  }
  if (request.closingFrom) {
    predicates.push(`opportunity.closing_at >= ${addValue(request.closingFrom)}::date`);
  }
  if (request.closingTo) {
    predicates.push(`opportunity.closing_at < (${addValue(request.closingTo)}::date + INTERVAL '1 day')`);
  }
  if (request.statuses.length) {
    predicates.push(`opportunity.status = ANY(${addValue(request.statuses)}::text[])`);
  }
  if (request.currency) {
    predicates.push(`opportunity.original_currency_code = ${addValue(request.currency)}`);
  }
  if (request.minimumValue !== undefined) {
    predicates.push(`opportunity.published_amount >= ${addValue(request.minimumValue)}`);
  }
  if (request.maximumValue !== undefined) {
    predicates.push(`opportunity.published_amount <= ${addValue(request.maximumValue)}`);
  }
  if (request.verification === "verified") {
    predicates.push(verifiedSourceCondition);
  } else if (request.verification === "unverified") {
    predicates.push(`NOT (${verifiedSourceCondition})`);
  }

  const limit = addValue(request.pageSize);
  const offset = addValue((request.page - 1) * request.pageSize);
  const relevance = request.query
    ? `ts_rank(opportunity.search_document, websearch_to_tsquery('simple', $1))`
    : "0::real";
  const exactTitleMatch = request.query
    ? "CASE WHEN lower(opportunity.title) = lower($1) THEN 1 ELSE 0 END"
    : "0";
  const referenceMatch = request.query
    ? "CASE WHEN lower(coalesce(opportunity.reference_number, '')) = lower($1) THEN 1 ELSE 0 END"
    : "0";

  return {
    text: `
      SELECT opportunity.id, opportunity.title, opportunity.category_code,
        opportunity.country_code, opportunity.publisher, opportunity.published_at,
        opportunity.closing_at, opportunity.status, opportunity.canonical_url,
        opportunity.original_currency_code, opportunity.published_amount,
        opportunity.industry_codes, opportunity.source_verified_at,
        ${exactTitleMatch} AS exact_title_match,
        ${referenceMatch} AS reference_match,
        ${relevance} AS relevance,
        COUNT(*) OVER() AS total_count
      FROM public.opportunities AS opportunity
      ${request.regions.length ? "JOIN public.global_countries AS market ON market.alpha2_code = opportunity.country_code" : ""}
      ${predicates.length ? `WHERE ${predicates.join("\n        AND ")}` : ""}
      ORDER BY ${orderBy[request.sort]}
      LIMIT ${limit} OFFSET ${offset}
    `,
    values,
  };
}
