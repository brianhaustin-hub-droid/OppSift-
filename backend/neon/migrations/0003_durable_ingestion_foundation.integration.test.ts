// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMigratedTestDatabase } from "../testing/pglite-database";

describe("migrations 0001-0006 on isolated PostgreSQL", () => {
  let context: Awaited<ReturnType<typeof createMigratedTestDatabase>>;

  beforeAll(async () => {
    context = await createMigratedTestDatabase();
  }, 120_000);

  afterAll(async () => {
    await context?.database.close();
  });

  it("creates the reconciled tables, columns, foreign keys, indexes, policies and functions", async () => {
    const tables = await context.executor.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
    );
    const expectedTables = [
      "opportunity_sources",
      "source_country_coverage",
      "opportunities",
      "opportunity_source_records",
      "opportunity_versions",
      "ingestion_runs",
      "ingestion_errors",
      "ingestion_review_queue",
      "opportunity_quality_issues",
      "source_cursors",
      "ingestion_jobs",
      "raw_source_records",
    ];
    expect(tables.rows.map(({ table_name }) => table_name)).toEqual(
      expect.arrayContaining(expectedTables),
    );

    const columns = await context.executor.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'ingestion_runs'`,
    );
    expect(columns.rows.map(({ column_name }) => column_name)).toEqual(
      expect.arrayContaining([
        "collector_identifier",
        "parsed_count",
        "accepted_count",
        "duplicate_count",
        "failed_count",
        "execution_duration_ms",
        "job_id",
      ]),
    );
    const sourceColumns = await context.executor.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'opportunity_sources'`,
    );
    expect(sourceColumns.rows.map(({ column_name }) => column_name))
      .toContain("approval_expires_at");

    const foreignKeys = await context.executor.query<{ conname: string }>(
      `SELECT conname FROM pg_catalog.pg_constraint
       WHERE contype = 'f'
         AND conrelid IN (
           'public.ingestion_runs'::regclass,
           'public.raw_source_records'::regclass
         )`,
    );
    expect(foreignKeys.rows.map(({ conname }) => conname)).toEqual(
      expect.arrayContaining([
        "ingestion_runs_job_source_fkey",
        "raw_source_records_run_source_fkey",
        "raw_source_records_source_record_source_fkey",
      ]),
    );

    const indexes = await context.executor.query<{ indexname: string }>(
      `SELECT indexname FROM pg_catalog.pg_indexes
       WHERE schemaname = 'public'`,
    );
    expect(indexes.rows.map(({ indexname }) => indexname)).toEqual(
      expect.arrayContaining([
        "ingestion_jobs_pending_schedule",
        "ingestion_jobs_expired_lease",
        "raw_source_records_source_external_seen",
        "raw_source_records_processing",
        "opportunity_sources_approval_expiry",
      ]),
    );

    const rls = await context.executor.query<{ relrowsecurity: boolean }>(
      `SELECT c.relrowsecurity
       FROM pg_catalog.pg_class AS c
       WHERE c.oid IN (
         'public.source_cursors'::regclass,
         'public.ingestion_jobs'::regclass,
         'public.raw_source_records'::regclass
       )`,
    );
    expect(rls.rows).toHaveLength(3);
    expect(rls.rows.every(({ relrowsecurity }) => relrowsecurity)).toBe(true);

    const policies = await context.executor.query<{ policyname: string }>(
      `SELECT policyname FROM pg_catalog.pg_policies
       WHERE schemaname = 'public'`,
    );
    expect(policies.rows.map(({ policyname }) => policyname)).toEqual(
      expect.arrayContaining([
        "ingestion_worker_jobs_write",
        "ingestion_worker_raw_records_write",
        "ingestion_worker_source_registry_read",
      ]),
    );
    const functions = await context.executor.query<{ proname: string }>(
      `SELECT proname FROM pg_catalog.pg_proc AS p
       JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public'
         AND proname = 'opportunity_has_verified_source'`,
    );
    expect(functions.rows).toHaveLength(1);
  });

  it("rejects unapproved, inactive, denied and insufficient-reuse source activation", async () => {
    const inserted = await context.executor.query<{ id: string }>(
      `INSERT INTO public.opportunity_sources (
         name, publisher, official_website, source_category, source_type,
         access_method, supported_categories, languages, publication_frequency,
         expected_refresh_hours
       ) VALUES (
         'Test registry source', 'Test publisher', 'https://source.example.test',
         'government', 'api', 'api', ARRAY['government'], ARRAY['en'],
         'Daily', 24
       ) RETURNING id`,
    );
    const sourceId = inserted.rows[0]?.id;
    expect(sourceId).toBeTruthy();

    await expect(context.executor.query(
      `UPDATE public.opportunity_sources
       SET activation_status = 'active'
       WHERE id = $1`,
      [sourceId],
    )).rejects.toThrow();
    await expect(context.executor.query(
      `UPDATE public.opportunity_sources
       SET approval_status = 'approved'
       WHERE id = $1`,
      [sourceId],
    )).rejects.toThrow();
    await expect(context.executor.query(
      `UPDATE public.opportunity_sources SET
         approval_status = 'denied', activation_status = 'active'
       WHERE id = $1`,
      [sourceId],
    )).rejects.toThrow();

    const approved = await context.executor.query<{ id: string }>(
      `UPDATE public.opportunity_sources SET
         licensing_status = 'approved',
         terms_status = 'verified',
         reliability_status = 'verified',
         permissions_evidence_url = 'https://source.example.test/permissions',
         license_url = 'https://source.example.test/license',
         terms_url = 'https://source.example.test/terms',
         reuse_permission_status = 'permitted',
         approval_status = 'approved',
         connector_identifier = 'test-connector',
         integration_status = 'operational',
         activation_status = 'active'
       WHERE id = $1
       RETURNING id`,
      [sourceId],
    );
    expect(approved.rows).toHaveLength(1);
  });

  it("registers the World Bank candidate without approving or activating collection", async () => {
    const result = await context.executor.query<{
      name: string;
      connector_identifier: string;
      coverage_scope: string;
      approval_status: string;
      activation_status: string;
      integration_status: string;
      reuse_permission_status: string;
    }>(
      `SELECT name, connector_identifier, coverage_scope, approval_status,
              activation_status, integration_status, reuse_permission_status
       FROM public.opportunity_sources
       WHERE id = '87c9b57a-2de4-447c-9b0f-255b0d484400'::uuid`,
    );
    expect(result.rows).toEqual([{
      name: "World Bank Procurement Notices",
      connector_identifier: "world-bank-procurement-notices",
      coverage_scope: "global",
      approval_status: "unreviewed",
      activation_status: "inactive",
      integration_status: "in_development",
      reuse_permission_status: "unknown",
    }]);
  });

  it("registers API-client candidates inactive and unreviewed", async () => {
    const result = await context.executor.query<{
      connector_identifier: string;
      approval_status: string;
      activation_status: string;
      integration_status: string;
      reuse_permission_status: string;
      licensing_status: string;
      terms_status: string;
    }>(
      `SELECT connector_identifier, approval_status, activation_status,
              integration_status, reuse_permission_status, licensing_status,
              terms_status
       FROM public.opportunity_sources
       WHERE connector_identifier = ANY($1::text[])
       ORDER BY connector_identifier`,
      [["contracts-finder-ocds", "sam-gov-opportunities", "ted-published-notices"]],
    );
    expect(result.rows).toHaveLength(3);
    for (const candidate of result.rows) {
      expect(candidate).toMatchObject({
        approval_status: "unreviewed",
        activation_status: "inactive",
        integration_status: "in_development",
        reuse_permission_status: "unknown",
        licensing_status: "review_required",
        terms_status: "review_required",
      });
    }
  });

  it("limits the server-side worker role to explicit non-tenant ingestion privileges", async () => {
    const permissions = await context.executor.query<{
      rolcanlogin: boolean;
      rolsuper: boolean;
      rolcreatedb: boolean;
      rolcreaterole: boolean;
      rolbypassrls: boolean;
      raw_select: boolean;
      raw_insert: boolean;
      raw_update: boolean;
      raw_delete: boolean;
      tenant_read: boolean;
      authenticated_raw_read: boolean;
      source_schedule_update: boolean;
      source_approval_update: boolean;
    }>(
      `SELECT role.rolcanlogin, role.rolsuper, role.rolcreatedb,
              role.rolcreaterole, role.rolbypassrls,
              has_table_privilege(role.rolname, 'public.raw_source_records', 'SELECT') AS raw_select,
              has_table_privilege(role.rolname, 'public.raw_source_records', 'INSERT') AS raw_insert,
              has_table_privilege(role.rolname, 'public.raw_source_records', 'UPDATE') AS raw_update,
              has_table_privilege(role.rolname, 'public.raw_source_records', 'DELETE') AS raw_delete,
              has_table_privilege(role.rolname, 'public.organization_settings', 'SELECT') AS tenant_read,
              has_table_privilege('authenticated', 'public.raw_source_records', 'SELECT') AS authenticated_raw_read,
              has_column_privilege(
                role.rolname,
                'public.opportunity_sources',
                'next_scheduled_collection_at',
                'UPDATE'
              ) AS source_schedule_update,
              has_column_privilege(
                role.rolname,
                'public.opportunity_sources',
                'approval_status',
                'UPDATE'
              ) AS source_approval_update
       FROM pg_catalog.pg_roles AS role
       WHERE role.rolname = 'oppsift_ingestion_worker'`,
    );
    expect(permissions.rows).toEqual([{
      rolcanlogin: false,
      rolsuper: false,
      rolcreatedb: false,
      rolcreaterole: false,
      rolbypassrls: false,
      raw_select: true,
      raw_insert: true,
      raw_update: true,
      raw_delete: false,
      tenant_read: false,
      authenticated_raw_read: false,
      source_schedule_update: true,
      source_approval_update: false,
    }]);
  });

  it("enforces durable job lease, completion, retry and idempotency constraints", async () => {
    const source = await context.executor.query<{ id: string }>(
      `INSERT INTO public.opportunity_sources (
         name, publisher, official_website, source_category, source_type,
         access_method, supported_categories, languages, publication_frequency,
         expected_refresh_hours
       ) VALUES (
         'Job test source', 'Test publisher', 'https://jobs.example.test',
         'government', 'api', 'api', ARRAY['government'], ARRAY['en'],
         'Daily', 24
       ) RETURNING id`,
    );
    const sourceId = source.rows[0]?.id;
    expect(sourceId).toBeTruthy();
    const job = await context.executor.query<{ id: string }>(
      `INSERT INTO public.ingestion_jobs (
         source_id, job_type, idempotency_key
       ) VALUES ($1, 'incremental_sync', 'integration-job')
       RETURNING id`,
      [sourceId],
    );
    const jobId = job.rows[0]?.id;
    expect(jobId).toBeTruthy();
    await expect(context.executor.query(
      `INSERT INTO public.ingestion_jobs (
         source_id, job_type, idempotency_key
       ) VALUES ($1, 'incremental_sync', 'integration-job')`,
      [sourceId],
    )).rejects.toThrow();

    await expect(context.executor.query(
      `UPDATE public.ingestion_jobs
       SET status = 'running'
       WHERE id = $1`,
      [jobId],
    )).rejects.toThrow();
    await expect(context.executor.query(
      `UPDATE public.ingestion_jobs
       SET status = 'succeeded', completed_at = now()
       WHERE id = $1`,
      [jobId],
    )).rejects.toThrow();

    const claimed = await context.executor.query<{ id: string }>(
      `UPDATE public.ingestion_jobs SET
         status = 'running', attempt_count = 1,
         locked_by = 'test-worker', locked_until = now() + interval '1 minute',
         lease_token = gen_random_uuid(), started_at = now()
       WHERE id = $1 RETURNING id`,
      [jobId],
    );
    expect(claimed.rows).toHaveLength(1);
    const completed = await context.executor.query<{ status: string }>(
      `UPDATE public.ingestion_jobs SET
         status = 'succeeded', locked_by = NULL, locked_until = NULL,
         lease_token = NULL, completed_at = now()
       WHERE id = $1 RETURNING status`,
      [jobId],
    );
    expect(completed.rows[0]?.status).toBe("succeeded");
  });

  it("limits the worker role to ingestion/global data and applies worker RLS policies", async () => {
    const grants = await context.executor.query<{ table_name: string; can_select: boolean }>(
      `SELECT table_name,
              has_table_privilege('oppsift_ingestion_worker', 'public.' || table_name, 'SELECT') AS can_select
       FROM (VALUES ('opportunities'), ('raw_source_records'), ('organizations')) AS requested(table_name)`,
    );
    const permissions = new Map(
      grants.rows.map((row) => [row.table_name, row.can_select]),
    );
    expect(permissions.get("opportunities")).toBe(true);
    expect(permissions.get("raw_source_records")).toBe(true);
    expect(permissions.get("organizations")).toBe(false);
    const sourcePolicies = await context.executor.query<{ policyname: string }>(
      `SELECT policyname FROM pg_catalog.pg_policies
       WHERE schemaname = 'public' AND tablename = 'opportunities'`,
    );
    expect(sourcePolicies.rows.map(({ policyname }) => policyname)).toContain(
      "ingestion_worker_opportunities_write",
    );
    const sourceSchedulePolicies = await context.executor.query<{ policyname: string }>(
      `SELECT policyname FROM pg_catalog.pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'opportunity_sources'
         AND policyname = 'ingestion_worker_source_schedule_update'`,
    );
    expect(sourceSchedulePolicies.rows).toHaveLength(1);
  });
});
