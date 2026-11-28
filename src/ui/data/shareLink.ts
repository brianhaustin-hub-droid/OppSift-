import { neonClient } from '../../app/auth/neon-client';

/**
 * Creates (or reuses) the explicit share row that authorises one notice to be
 * readable at `/o/<id>`.
 *
 * The write goes through `POST /api/share-links`, which verifies the caller's
 * session against Neon Auth before inserting and records the verified user id.
 * It deliberately does not insert from the browser: the managed Data API still
 * does not expose the new share table, and a client-side insert would make the
 * feature depend on that cache.
 */

type SessionClient = {
  auth: {
    getSession(): PromiseLike<{
      data?: { session?: { access_token?: string } | null } | null;
    }>;
  };
};

export async function createShareLink(opportunityId: string): Promise<boolean> {
  if (!neonClient) return false;
  try {
    const client = neonClient as unknown as SessionClient;
    const { data } = await client.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return false;

    const response = await fetch('/api/share-links', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ opportunityId }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
