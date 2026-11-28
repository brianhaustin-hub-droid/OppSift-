/**
 * Relative-time formatting for public surfaces.
 *
 * Kept in its own module with no imports so public pages can format a timestamp
 * without pulling in the database client that `liveness.ts` needs.
 */
export function formatLiveAge(checkedAt: string | null, now = Date.now()): string {
  if (!checkedAt) return '';
  const time = Date.parse(checkedAt);
  if (!Number.isFinite(time)) return '';
  const seconds = Math.max(0, Math.round((now - time) / 1000));
  if (seconds < 90) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 90) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 36) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}
