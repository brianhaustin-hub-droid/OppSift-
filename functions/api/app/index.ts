import { json } from "../_lib/http";

/**
 * App API index (backend foundations). Lists available scaffolded endpoints.
 * UI hookup should prefer authenticated Data API/RPCs where defined, or these
 * endpoints once auth/tenant wiring and DB migrations are applied.
 */
export async function onRequest(): Promise<Response> {
  return json({
    ok: true,
    name: "OppSift app backend foundations",
    evidenceBackedCoverage: true,
    endpoints: [
      { path: "/api/app/coverage", methods: ["GET"], status: "implemented-read (DB required)" },
      { path: "/api/app/discover", methods: ["POST"], status: "implemented-validate/query-attempt (DB/search schema dependent)" },
      { path: "/api/app/onboarding", methods: ["GET", "POST"], status: "rpc-attempt (authenticated session required)" },
      { path: "/api/app/saved-searches", methods: ["GET", "POST", "DELETE"], status: "rpc-attempt (auth/org session required)" },
      { path: "/api/app/alerts", methods: ["GET", "POST", "PATCH"], status: "rpc-attempt (auth/org session required; GET ?resource=notifications)" },
      { path: "/api/app/applications", methods: ["GET", "POST"], status: "rpc-attempt (auth/org session required)" },
      { path: "/api/app/saved-opportunities", methods: ["GET", "POST", "DELETE"], status: "rpc-attempt (auth/org session required)" },
      { path: "/api/app/settings", methods: ["GET", "POST"], status: "rpc-attempt (authenticated session required; org settings via 0001 RPCs)" },
      { path: "/api/app/teams", methods: ["GET"], status: "scaffold (auth/org-manager RPC wiring pending)" },
      { path: "/api/app/support", methods: ["POST"], status: "implemented-insert-attempt (DB/auth/RLS dependent)" },
      { path: "/api/app/events", methods: ["POST"], status: "implemented-insert-attempt (DB/auth/RLS dependent)" },
    ],
    migrationsDrafted: ["0033", "0034", "0035", "0036", "0037", "0038", "0039"],
    notes: [
      "Migrations 0032–0039 applied on Neon dev (see migration-status.json); continue smoke-testing RPC/RLS with authenticated sessions.",
      "Tenant-scoped operations require authenticated session/org-member context and RLS-compliant execution (see functions/api/_lib/auth.ts). Prefer authenticated Data API/RPC calls from client where available.",
      "Do not claim sources/coverage operational without evidence (records/runs/health/errors).",
    ],
  });
}
