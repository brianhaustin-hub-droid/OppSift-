/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useEffect } from 'react';
import { I18nProvider } from '../i18n/I18nContext';
import { PublicLayout } from './components/layout/PublicLayout';
import { NotFoundScreen } from './components/layout/NotFoundScreen';
import { PublicHomepage } from './pages/public/PublicHomePage';
import { PublicLandingPage } from './pages/public/LandingPages';
import { PublicOpportunityPage } from './pages/public/PublicOpportunityPage';
import {
  PublicAboutPage,
  PublicContactPage,
  PublicCookiesPage,
  PublicDataProcessingPage,
  PublicDocsPage,
  PublicGettingStartedPage,
  PublicPrivacyPage,
  PublicSecurityPage,
  PublicTermsPage,
} from './pages/public/PublicPages';
import { RouterProvider, useRouter } from './context/RouterContext';
import { ThemeProvider } from './context/ThemeContext';
import { isApplicationPath } from './routing/applicationPaths';
import { usePageMeta } from '../seo/usePageMeta';

/**
 * The public website is the default bundle. The authenticated application is a
 * separate module, so a marketing visitor never downloads workspace code or
 * issues a query for opportunity records.
 */
const WorkspaceApp = lazy(() => import('./WorkspaceApp'));
const AuthApp = lazy(() => import('./AuthApp'));

const LANDING_PATHS = new Set([
  '/global-government-tenders',
  '/international-grants',
  '/official-data-sources',
  '/commercial-rfp-opportunities',
]);

/**
 * The five public marketing sections used to be separate pages. Their content
 * now lives on the consolidated homepage, so the old URLs forward to the
 * matching section rather than serving a second, thinner page.
 */
function SectionRedirect({ section }: { section: string }) {
  const { navigate } = useRouter();

  useEffect(() => {
    navigate('/', { replace: true });
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(section);
      if (!target) return;
      window.history.replaceState({}, '', `/#${section}`);
      target.scrollIntoView({ block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [navigate, section]);

  return (
    <PublicLayout>
      <div role="status" className="max-w-xl mx-auto px-4 py-20 text-center text-sm text-[#526070] dark:text-[#CBD5E1]">
        This section is part of the OppSift homepage. Opening it…
      </div>
    </PublicLayout>
  );
}

function AppRoutes() {
  const { path } = useRouter();
  usePageMeta(path);

  const renderPublicRoute = () => {
    if (path === '/') return <PublicHomepage />;
    if (LANDING_PATHS.has(path)) return <PublicLandingPage path={path} />;

    // Retired marketing URLs, forwarded to their homepage section
    if (path === '/product' || path === '/platform') return <SectionRedirect section="product" />;
    if (path === '/opportunities') return <SectionRedirect section="opportunities" />;
    if (path === '/markets') return <SectionRedirect section="markets" />;
    if (path === '/sources') return <SectionRedirect section="sources" />;
    if (path === '/pricing') return <SectionRedirect section="pricing" />;
    if (path === '/how-it-works') return <SectionRedirect section="how-it-works" />;
    if (path === '/solutions') return <SectionRedirect section="opportunities" />;

    // Utility and trust pages that keep their own URL
    if (path === '/about') return <PublicAboutPage />;
    if (path === '/contact') return <PublicContactPage />;
    if (path === '/contact/confirmed') return <PublicContactPage initialSubmitted={true} />;
    if (path === '/getting-started') return <PublicGettingStartedPage />;
    if (path === '/docs') return <PublicDocsPage />;
    if (path === '/security') return <PublicSecurityPage />;
    if (path === '/privacy' || path === '/legal/privacy') return <PublicPrivacyPage />;
    if (path === '/terms' || path === '/legal/terms') return <PublicTermsPage />;
    if (path === '/cookies' || path === '/legal/cookies') return <PublicCookiesPage />;
    if (path === '/legal/dpa') return <PublicDataProcessingPage />;

    // Shareable notice link: public on purpose and part of the approved
    // product model. It renders one notice snapshot, never the workspace.
    if (path.startsWith('/o/')) {
      return <PublicOpportunityPage opportunityId={path.replace('/o/', '')} />;
    }

    // Authentication and onboarding
    if (
      path === '/login' ||
      path === '/register' ||
      path === '/verify-email' ||
      path === '/reset-password' ||
      path === '/auth' ||
      path.startsWith('/auth/')
    ) {
      return <AuthApp mode="auth" />;
    }
    if (path === '/onboarding') return <AuthApp mode="onboarding" />;

    if (isApplicationPath(path)) return <WorkspaceApp path={path} />;

    return <NotFoundScreen />;
  };

  return (
    <Suspense
      fallback={
        <div role="status" className="px-4 py-24 text-center text-sm text-[#526070] dark:text-[#CBD5E1]">
          Loading…
        </div>
      }
    >
      {renderPublicRoute()}
    </Suspense>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <RouterProvider>
          <AppRoutes />
        </RouterProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
