import React from 'react';
import { AuthProvider } from '../app/auth/AuthProvider';
import { OrganizationProvider } from '../app/organizations/OrganizationProvider';
import { AuthScreensPage } from './pages/auth/AuthScreens';
import { OnboardingWizardPage } from './pages/onboarding/OnboardingWizard';

/**
 * Sign-in, registration, verification, recovery and onboarding.
 *
 * These screens need the auth and organisation providers, so the providers are
 * loaded with this module rather than wrapping the whole website. A public
 * visitor therefore makes no session request and downloads no auth client code
 * beyond what the public data reads already require.
 */
export default function AuthApp({ mode }: { mode: 'auth' | 'onboarding' }) {
  return (
    <AuthProvider>
      <OrganizationProvider>
        {mode === 'onboarding' ? <OnboardingWizardPage /> : <AuthScreensPage />}
      </OrganizationProvider>
    </AuthProvider>
  );
}
