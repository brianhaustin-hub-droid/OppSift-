export type QueryResult<Row> = {
  rows: Row[];
  rowCount: number;
};

export type DatabaseParameter =
  | string
  | number
  | bigint
  | boolean
  | Date
  | null
  | readonly string[]
  | Record<string, unknown>;

export interface QueryExecutor {
  query<Row extends Record<string, unknown>>(
    statement: string,
    parameters?: readonly DatabaseParameter[],
  ): Promise<QueryResult<Row>>;
}

export type DatabaseTransaction = QueryExecutor;

export interface DatabaseExecutor extends QueryExecutor {
  transaction<Result>(
    work: (transaction: DatabaseTransaction) => Promise<Result>,
  ): Promise<Result>;
}

export class DatabaseOperationError extends Error {
  readonly code: string | null;
  readonly constraint: string | null;

  constructor(error: unknown) {
    // PG error messages carry diagnostic context (constraint names, state
    // codes) but no secret values; they are what makes an outage
    // diagnosable from a worker log alone.
    const detail = error instanceof Error
      ? error.message.replace(/\s+/g, " ").slice(0, 300)
      : "";
    const code = getSafePostgresField(error, "code");
    const constraint = getSafePostgresField(error, "constraint");
    const suffix = [
      code ? `code=${code}` : null,
      constraint ? `constraint=${constraint}` : null,
      detail ? `detail="${detail}"` : null,
    ].filter(Boolean).join(" ");
    super(suffix ? `Database operation failed. (${suffix})` : "Database operation failed.");
    this.name = "DatabaseOperationError";
    this.code = code;
    this.constraint = constraint;
  }
}

export function isDatabaseOperationError(error: unknown): error is DatabaseOperationError {
  return error instanceof DatabaseOperationError;
}

function getSafePostgresField(error: unknown, key: "code" | "constraint"): string | null {
  if (
    error === null ||
    typeof error !== "object" ||
    !(key in error)
  ) {
    return null;
  }
  const value: unknown = Reflect.get(error, key);
  if (typeof value !== "string") return null;
  return key === "code" && !/^[0-9A-Z]{5}$/.test(value)
    ? null
    : value.slice(0, 128);
}

export function databaseOperation<T>(operation: () => Promise<T>): Promise<T> {
  return Promise.resolve().then(operation).catch((error: unknown) => {
    if (error instanceof DatabaseOperationError) throw error;
    throw new DatabaseOperationError(error);
  });
}
