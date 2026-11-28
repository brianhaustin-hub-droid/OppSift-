import React from 'react';
import { LockKeyhole } from 'lucide-react';
import { useOptionalAuth } from '../../../app/auth/AuthProvider';
import { useRouter } from '../../context/RouterContext';
import { PublicLayout } from '../layout/PublicLayout';

/**
 * Session boundary for every route that renders workspace data.
 *
 * A signed-out visitor sees a prompt, never the child route: the workspace
 * content is not mounted, so no opportunity query is issued and no record is
 * serialised into the document. This is the client boundary; database row-level
 * security remains the authorization boundary for the data itself.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const auth = useOptionalAuth();
  const { navigate } = useRouter();
  const next =
    typeof window === 'undefined' ? '/' : `${window.location.pathname}${window.location.search}`;

  if (!auth || !auth.configured) {
    return (
      <PublicLayout>
        <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-3">
          <LockKeyhole className="w-6 h-6 mx-auto text-[#541B32] dark:text-[#E8A4B5]" />
          <h1 className="font-display text-2xl font-bold">Workspace access is not configured</h1>
          <p className="text-sm text-[#526070] dark:text-[#CBD5E1]">
            This deployment has no authentication service configured, so workspace records cannot be opened. No
            opportunity data has been loaded.
          </p>
          <a href="/" className="inline-block rounded-md bg-[#541B32] px-4 py-2 text-sm font-semibold text-white">
            Return to the public site
          </a>
        </div>
      </PublicLayout>
    );
  }

  if (auth.loading) {
    return (
      <PublicLayout>
        <div role="status" className="max-w-xl mx-auto px-4 py-24 text-center text-sm text-[#526070] dark:text-[#CBD5E1]">
          Checking your session…
        </div>
      </PublicLayout>
    );
  }

  if (!auth.user) {
    return (
      <PublicLayout>
        <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-3">
          <LockKeyhole className="w-6 h-6 mx-auto text-[#541B32] dark:text-[#E8A4B5]" />
          <h1 className="font-display text-2xl font-bold">Sign in to open the workspace</h1>
          <p className="text-sm text-[#526070] dark:text-[#CBD5E1]">
            Opportunity records, saved searches and pursuit workspaces are only available inside an authenticated
            account. Nothing from the workspace has been loaded on this page.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <a
              href={`/login?next=${encodeURIComponent(next)}`}
              className="rounded-md bg-[#541B32] px-4 py-2 text-sm font-semibold text-white hover:bg-[#A33B59]"
            >
              Sign in
            </a>
            <a
              href="/register"
              className="rounded-md border border-[#E2E8F0] dark:border-[#263244] px-4 py-2 text-sm font-semibold"
            >
              Create an account
            </a>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="rounded-md px-4 py-2 text-sm font-medium text-[#541B32] dark:text-[#E8A4B5] hover:underline"
            >
              Back to the public site
            </button>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return <>{children}</>;
}
