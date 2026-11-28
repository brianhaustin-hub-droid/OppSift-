import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from '../../context/RouterContext';
import { usePageMeta } from '../../../seo/usePageMeta';
import { PublicLayout } from './PublicLayout';

export function NotFoundScreen() {
  const { path, canGoBack, goBack, getBackLabel } = useRouter();
  usePageMeta(path);

  return (
    <PublicLayout>
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <p className="font-mono text-xs font-semibold text-[#541B32] dark:text-[#E8A4B5]">404 · Page not found</p>
        <h1 className="font-display text-3xl font-bold">This page does not exist</h1>
        <p className="text-sm text-[#526070] dark:text-[#CBD5E1]">
          No page is mapped to <span className="font-mono break-all">{path}</span>. Return to the homepage or the
          workspace dashboard.
        </p>
        <div className="pt-2 flex flex-wrap justify-center gap-3">
          {canGoBack && (
            <button
              type="button"
              onClick={() => goBack('/')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-[#E2E8F0] dark:border-[#263244] text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to {getBackLabel('previous page')}</span>
            </button>
          )}
          <a href="/" className="px-4 py-2 rounded-md border border-[#E2E8F0] dark:border-[#263244] text-sm font-medium">
            Homepage
          </a>
          <a href="/dashboard" className="px-4 py-2 rounded-md bg-[#541B32] text-sm font-semibold text-white">
            Open workspace
          </a>
        </div>
      </div>
    </PublicLayout>
  );
}
