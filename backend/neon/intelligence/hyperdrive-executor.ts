import postgres, { type Sql, type TransactionSql } from "postgres";
import {
  databaseOperation,
  type DatabaseExecutor,
  type DatabaseParameter,
  type DatabaseTransaction,
  type QueryResult,
} from "./database-executor";

export interface CloudflareHyperdriveBinding {
  readonly connectionString: string;
}

type PostgresClient = Sql | TransactionSql<Record<string, never>>;

class PostgresQueryExecutor implements DatabaseTransaction {
  constructor(private readonly client: PostgresClient) {}

  async query<Row extends Record<string, unknown>>(
    statement: string,
    parameters: readonly DatabaseParameter[] = [],
  ): Promise<QueryResult<Row>> {
    return databaseOperation(async () => {
      const rows = await this.client.unsafe<Row[]>(statement, [...parameters]);
      return { rows: [...rows], rowCount: rows.count };
    });
  }
}

export class HyperdriveDatabaseExecutor extends PostgresQueryExecutor implements DatabaseExecutor {
  constructor(
    private readonly connection: Sql,
  ) {
    super(connection);
  }

  transaction<Result>(
    work: (transaction: DatabaseTransaction) => Promise<Result>,
  ): Promise<Result> {
    return databaseOperation(() =>
      this.connection.begin((transaction) =>
        work(new PostgresQueryExecutor(transaction)),
      ),
    );
  }

  close(): Promise<void> {
    return this.connection.end({ timeout: 5 }).then(() => undefined);
  }
}

export function createHyperdriveDatabaseExecutor(
  binding: CloudflareHyperdriveBinding,
): HyperdriveDatabaseExecutor {
  if (!binding.connectionString.trim()) {
    throw new Error("Cloudflare Hyperdrive binding is missing its connection string.");
  }
  const connection = postgres(binding.connectionString, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    // postgres.js JSON.stringify's any JS value bound to a `::jsonb` parameter,
    // so a pre-serialized JSON string becomes a jsonb *string* rather than an
    // object (which trips `jsonb_typeof(...) = 'object'` CHECKs). The repository
    // passes JSON.stringify'd strings for jsonb columns, so pass strings through
    // verbatim and only JSON.stringify non-strings (objects/arrays).
    types: {
      jsonb: {
        to: 3802,
        from: [3802],
        serialize: (value: unknown): string =>
          typeof value === "string" ? value : JSON.stringify(value),
      },
    },
  });
  return new HyperdriveDatabaseExecutor(connection);
}
