SELECT name, connector_identifier, expected_refresh_hours,
       licensing_status, terms_status, permissions_evidence_url IS NOT NULL AS has_evidence,
       license_url IS NOT NULL AS has_license, terms_url IS NOT NULL AS has_terms,
       reliability_status, approval_expires_at
FROM public.opportunity_sources
WHERE activation_status = 'active'
  AND integration_status = 'operational'
  AND approval_status IN ('approved', 'approved_with_constraints')
  AND licensing_status = 'approved'
  AND terms_status = 'verified'
  AND permissions_evidence_url IS NOT NULL
  AND license_url IS NOT NULL
  AND terms_url IS NOT NULL
  AND reliability_status IN ('verified', 'reliable')
  AND reuse_permission_status IN ('permitted', 'conditional')
  AND (approval_status = 'approved' OR approval_constraints_enforced)
  AND connector_identifier = ANY(ARRAY[
    'world-bank-procurement-notices',
    'ted-published-notices',
    'contracts-finder-ocds',
    'sam-gov-opportunities'
  ]::text[])
  AND (approval_expires_at IS NULL OR approval_expires_at > now())
  AND (next_scheduled_collection_at IS NULL OR next_scheduled_collection_at <= now())
  AND (
    last_successful_retrieval IS NULL
    OR last_successful_retrieval + GREATEST(
      expected_refresh_hours * interval '1 hour',
      900000::double precision * interval '1 millisecond'
    ) <= now()
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.ingestion_jobs AS job
    WHERE job.source_id = opportunity_sources.id
      AND job.status IN ('pending', 'running')
  )
ORDER BY name
