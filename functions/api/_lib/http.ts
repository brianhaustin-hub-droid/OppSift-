export type PagesEnv = {
  DATABASE_URL?: string;
  HYPERDRIVE?: { connectionString: string };
  [key: string]: unknown;
};

export type PagesContext = {
  request: Request;
  env: PagesEnv;
};

export function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...(headers || {}),
    },
  });
}

export function errorResponse(status: number, message: string, details?: unknown): Response {
  return json({ ok: false, error: { message, details } }, status);
}

export async function readJsonBody<T = unknown>(request: Request): Promise<T | null> {
  try {
    const text = await request.text();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function methodNotAllowed(allowed: string[]): Response {
  return errorResponse(405, "Method not allowed", { allowed });
}
