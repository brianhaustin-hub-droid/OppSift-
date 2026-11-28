/**
 * Which URL paths belong to the authenticated application rather than the
 * public website. Kept free of imports so the public bundle can decide the
 * split without pulling in the workspace.
 */
const GATED_PREFIXES = [
  '/dashboard',
  '/discover',
  '/opportunity',
  '/saved',
  '/saved-searches',
  '/search-history',
  '/my-opportunities',
  '/intelligence',
  '/alerts',
  '/notifications',
  '/analytics',
  '/reports',
  '/teams',
  '/settings',
  '/profile',
  '/billing',
  '/checkout',
  '/admin',
  '/integrations',
  '/support',
  '/help',
  '/first-time',
  '/journeys',
  '/brand-system',
  '/matched',
] as const;

function matches(path: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/** Paths that render workspace data and therefore require a session. */
export function isGatedPath(path: string): boolean {
  return matches(path, GATED_PREFIXES);
}

/** Paths that render from the application module (gated or not). */
export function isApplicationPath(path: string): boolean {
  return path === '/status' || matches(path, GATED_PREFIXES);
}
