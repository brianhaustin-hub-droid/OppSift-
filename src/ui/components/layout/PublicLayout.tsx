import React, { useState } from 'react';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { LanguageSwitcher } from '../../../i18n/LanguageSwitcher';
import { useI18n } from '../../../i18n/I18nContext';
import { useRouter } from '../../context/RouterContext';
import { useTheme } from '../../context/ThemeContext';
import { OppSiftLogo } from '../brand/OppSiftLogo';
import { DataSourceBanner } from '../ui/DataSourceBanner';

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { path, navigate } = useRouter();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: t('nav.product'), href: '/product' },
    { label: t('nav.opportunities'), href: '/opportunities' },
    { label: t('nav.markets'), href: '/markets' },
    { label: t('nav.sources'), href: '/sources' },
    { label: t('nav.pricing'), href: '/pricing' },
  ];

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-[#F8FAFC] dark:bg-[#101114] text-[#172033] dark:text-[#F8FAFC] transition-colors">
      {/* Strict 3-zone Top Bar Contract */}
      <header className="sticky top-0 z-30 border-b border-[#E2E8F0] dark:border-[#263244] bg-white/95 dark:bg-[#171923]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 sm:gap-8">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A33B59] rounded-md shrink-0"
            aria-label="OppSift Home"
          >
            <OppSiftLogo variant="primary-horizontal" size="md" />
          </button>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#64748B] dark:text-[#CBD5E1]">
            {navLinks.map((link) => {
              const active = path === link.href;
              return (
                <button
                  key={link.href}
                  type="button"
                  onClick={() => navigate(link.href)}
                  className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                    active
                      ? 'border-[#541B32] dark:border-[#E8A4B5] text-[#172033] dark:text-[#F8FAFC] font-semibold'
                      : 'border-transparent hover:text-[#172033] dark:hover:text-white'
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="hidden sm:inline-flex items-center px-4 py-2 rounded-md text-sm font-medium bg-[#541B32] hover:bg-[#A33B59] text-white transition-colors whitespace-nowrap shrink-0"
            >
              {t('nav.openWorkspace')}
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle navigation menu"
              className="md:hidden p-2 rounded-lg border border-[#E2E8F0] dark:border-[#263244] text-[#172033] dark:text-[#F8FAFC]"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923] px-4 py-4 space-y-2">
            {navLinks.map((link) => (
              <button
                key={link.href}
                type="button"
                onClick={() => {
                  navigate(link.href);
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#172033] dark:text-[#F8FAFC] hover:bg-[#F1F5F9] dark:hover:bg-[#1C2433]"
              >
                {link.label}
              </button>
            ))}
            <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#263244] flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  navigate('/dashboard');
                  setMobileMenuOpen(false);
                }}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-[#541B32] text-white"
              >
                Open Workspace
              </button>
              <button
                type="button"
                onClick={() => {
                  navigate('/auth');
                  setMobileMenuOpen(false);
                }}
                className="px-4 py-2.5 rounded-lg text-sm font-medium border border-[#E2E8F0] dark:border-[#263244]"
              >
                Sign In
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 min-w-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <DataSourceBanner />
        </div>
        {children}
      </main>

      {/* Quiet International Footer */}
      <footer className="border-t border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923] mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-4 space-y-3">
              <OppSiftLogo variant="primary-horizontal" size="md" />
              <p className="text-sm text-[#64748B] dark:text-[#CBD5E1] max-w-xs leading-relaxed">
                Global Opportunity Intelligence Platform. Discover tenders, RFPs, grants, and commercial contracts with verified source attribution.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#E2E8F0] dark:border-[#263244] text-xs font-medium text-[#172033] dark:text-[#F8FAFC] hover:bg-[#F1F5F9] dark:hover:bg-[#1C2433]"
                >
                  {resolvedTheme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                  <span>{resolvedTheme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
                </button>
              </div>
            </div>

            <div className="md:col-span-2 space-y-2.5 text-sm">
              <h4 className="font-display font-semibold text-[#172033] dark:text-[#F8FAFC]">Platform</h4>
              <ul className="space-y-2 text-[#64748B] dark:text-[#CBD5E1]">
                <li><button type="button" onClick={() => navigate('/product')} className="hover:text-[#541B32] dark:hover:text-[#E8A4B5]">Product</button></li>
                <li><button type="button" onClick={() => navigate('/opportunities')} className="hover:text-[#541B32] dark:hover:text-[#E8A4B5]">Opportunities</button></li>
                <li><button type="button" onClick={() => navigate('/markets')} className="hover:text-[#541B32] dark:hover:text-[#E8A4B5]">Markets</button></li>
                <li><button type="button" onClick={() => navigate('/sources')} className="hover:text-[#541B32] dark:hover:text-[#E8A4B5]">Sources</button></li>
                <li><button type="button" onClick={() => navigate('/pricing')} className="hover:text-[#541B32] dark:hover:text-[#E8A4B5]">Pricing</button></li>
              </ul>
            </div>

            <div className="md:col-span-3 space-y-2.5 text-sm">
              <h4 className="font-display font-semibold text-[#172033] dark:text-[#F8FAFC]">Resources &amp; Trust</h4>
              <ul className="space-y-2 text-[#64748B] dark:text-[#CBD5E1]">
                <li><button type="button" onClick={() => navigate('/getting-started')} className="hover:text-[#541B32] dark:hover:text-[#E8A4B5]">Getting Started</button></li>
                <li><button type="button" onClick={() => navigate('/docs')} className="hover:text-[#541B32] dark:hover:text-[#E8A4B5]">Documentation</button></li>
                <li><button type="button" onClick={() => navigate('/security')} className="hover:text-[#541B32] dark:hover:text-[#E8A4B5]">Security &amp; Provenance</button></li>
                <li><button type="button" onClick={() => navigate('/how-it-works')} className="hover:text-[#541B32] dark:hover:text-[#E8A4B5]">How It Works</button></li>
                <li><button type="button" onClick={() => navigate('/about')} className="hover:text-[#541B32] dark:hover:text-[#E8A4B5]">About OppSift</button></li>
                <li><button type="button" onClick={() => navigate('/contact')} className="hover:text-[#541B32] dark:hover:text-[#E8A4B5]">Contact</button></li>
              </ul>
            </div>

            <div className="md:col-span-3 space-y-2.5 text-sm">
              <h4 className="font-display font-semibold text-[#172033] dark:text-[#F8FAFC]">Access &amp; Legal</h4>
              <ul className="space-y-2 text-[#64748B] dark:text-[#CBD5E1]">
                <li><button type="button" onClick={() => navigate('/auth')} className="hover:text-[#541B32] dark:hover:text-[#E8A4B5]">Sign In / Create Account</button></li>
                <li><button type="button" onClick={() => navigate('/onboarding')} className="hover:text-[#541B32] dark:hover:text-[#E8A4B5]">Get Started</button></li>
                <li><button type="button" onClick={() => navigate('/dashboard')} className="hover:text-[#541B32] dark:hover:text-[#E8A4B5]">Intelligence Dashboard</button></li>
                <li><button type="button" onClick={() => navigate('/legal/privacy')} className="hover:text-[#541B32] dark:hover:text-[#E8A4B5]">Privacy Policy</button></li>
                <li><button type="button" onClick={() => navigate('/legal/terms')} className="hover:text-[#541B32] dark:hover:text-[#E8A4B5]">Terms of Service</button></li>
                <li><button type="button" onClick={() => navigate('/legal/cookies')} className="hover:text-[#541B32] dark:hover:text-[#E8A4B5]">Cookie Settings</button></li>
                <li><button type="button" onClick={() => navigate('/legal/dpa')} className="hover:text-[#541B32] dark:hover:text-[#E8A4B5]">Data Processing (DPA)</button></li>
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-[#E2E8F0] dark:border-[#263244] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#64748B] dark:text-[#CBD5E1]">
            <p>© 2026 OppSift. International Opportunity Intelligence Platform.</p>
            <p>Global tenders, RFPs, grants &amp; commercial contracts.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
