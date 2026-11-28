import { neonClient } from '../../app/auth/neon-client';

/**
 * Creates (or reuses) the explicit share row that authorises one notice to be
 * readable at `/o/<id>`. Workspace-only: the public marketing bundle must not
 * import the database client.
 *
 * The row records who authorised the share, so it can be revoked; a unique
 * index keeps one active share per notice.
 */
type InsertClient = {
  from(table: string): {
    insert(row: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>;
  };
};

export async function createShareLink(opportunityId: string, userId: string | null): Promise<boolean> {
  if (!neonClient) return false;
  const db = neonClient as unknown as InsertClient;
  try {
    const { error } = await db.from('opportunity_share_links').insert({
      opportunity_id: opportunityId,
      created_by: userId,
    });
    if (!error) return true;
    // A second copy of the same link hits the unique index; that means the
    // active share row already exists, which is the success case for the caller.
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message?: unknown }).message ?? '')
        : '';
    return /duplicate key|unique|23505/i.test(message);
  } catch {
    return false;
  }
}
