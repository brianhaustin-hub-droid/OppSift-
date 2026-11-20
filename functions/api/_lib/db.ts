import postgres from "postgres";
import type { PagesEnv } from "./http";

export function getDatabaseUrl(env: PagesEnv): string | null {
  const direct = typeof env.DATABASE_URL === "string" ? env.DATABASE_URL.trim() : "";
  if (direct) return direct;
  const hyperdrive = env.HYPERDRIVE && typeof env.HYPERDRIVE.connectionString === "string"
    ? env.HYPERDRIVE.connectionString.trim()
    : "";
  return hyperdrive || null;
}

export function createSql(env: PagesEnv) {
  const url = getDatabaseUrl(env);
  if (!url) return null;
  return postgres(url, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
    prepare: false,
  });
}
