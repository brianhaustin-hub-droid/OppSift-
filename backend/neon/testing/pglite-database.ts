import { PGlite, type Transaction } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type {
  DatabaseExecutor,
  DatabaseParameter,
  DatabaseTransaction,
  QueryResult,
} from "../intelligence/database-executor";

type PGliteConnection = Pick<PGlite, "query"> | Pick<Transaction, "query">;

class PGliteQueryExecutor implements DatabaseTransaction {
  constructor(private readonly connection: PGliteConnection) {}

  async query<Row extends Record<string, unknown>>(
    statement: string,
    parameters: readonly DatabaseParameter[] = [],
  ): Promise<QueryResult<Row>> {
    const result = await this.connection.query<Row>(statement, [...parameters]);
    return {
      rows: result.rows,
      rowCount: result.rowCount ?? result.affectedRows ?? result.rows.length,
    };
  }
}

class PGliteDatabaseExecutor extends PGliteQueryExecutor implements DatabaseExecutor {
  constructor(private readonly database: PGlite) {
    super(database);
  }

  transaction<Result>(
    work: (transaction: DatabaseTransaction) => Promise<Result>,
  ): Promise<Result> {
    return this.database.transaction((transaction) =>
      work(new PGliteQueryExecutor(transaction)),
    );
  }
}

const migrationDirectory = resolve(process.cwd(), "backend", "neon", "migrations");
const migrationNames = [
  "0001_identity_organizations.sql",
  "0002_global_opportunity_intelligence.sql",
  "0003_durable_ingestion_foundation.sql",
  "0004_ingestion_orchestration.sql",
  "0005_world_bank_procurement_notices_source.sql",
  "0006_api_client_source_candidates.sql",
  // Additive ingestion-schema migrations the repository writes against:
  // parse_status on opportunities (0028) and the canonical dedupe key
  // written at insert time (0031). Kept explicit so fixture drift from the
  // live schema is caught here instead of as a failing column mid-insert.
  "0028_ingestion_parse_status.sql",
  "0031_canonical_dedupe_key.sql",
] as const;

export async function createMigratedTestDatabase() {
  const database = new PGlite({ extensions: { pgcrypto } });
  await database.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE SCHEMA neon_auth;
    CREATE TABLE neon_auth."user" (
      id uuid PRIMARY KEY,
      email text NOT NULL,
      "emailVerified" boolean NOT NULL DEFAULT false
    );
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.user_id()
      RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;
  `);
  for (const migrationName of migrationNames) {
    await database.exec(
      await readFile(resolve(migrationDirectory, migrationName), "utf8"),
    );
  }
  await database.exec(
    await readFile(
      resolve(process.cwd(), "backend", "neon", "provisioning", "ingestion-worker-permissions.sql"),
      "utf8",
    ),
  );
  return {
    database,
    executor: new PGliteDatabaseExecutor(database),
  };
}
