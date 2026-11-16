SELECT name, approval_constraints, jsonb_array_length(approval_constraints) AS n_constraints
FROM public.opportunity_sources
WHERE activation_status = 'active'
ORDER BY name
