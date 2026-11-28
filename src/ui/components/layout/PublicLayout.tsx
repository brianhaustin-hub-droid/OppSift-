import React, { useEffect, useRef, useState } from 'react';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { LanguageSwitcher } from '../../../i18n/LanguageSwitcher';
import { useRouter } from '../../context/RouterContext';
import { useTheme } from '../../context/ThemeContext';
import { OppSiftLogo } from '../brand/OppSiftLogo';
import siteContent from '../../../seo/site-content.json';

const NAV = siteContent.nav;

const PRODUCT_LINKS = [
  { label: 'Platform overview', href: '/#product' },
  { label: 'Opportunity categories', href: '/#opportunities' },
  { label: 'Market coverage', href: '/#markets' },
  { label: 'Data sources', href: '/#sources' },
  { label: 'Pricing and access', href: '/#pricing' },
];

const RESOURCE_LINKS = [
  { label: 'Documentation', href: '/docs' },
  { label: 'Getting started', href: '/getting-started' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Global government tenders', href: '/global-government-tenders' },
  { label: 'International grants', href: '/international-grants' },
  { label: 'Official data sources', href: '/official-data-sources' },
  { label: 'System status', href: '/status' },
];

const COMPANY_LINKS = [
  { label: 'About OppSift', href: '/about' },
  { label: 'Contact', href: '/contact' },
  { label: 'Security and provenance', href: '/security' },
];

const LEGAL_LINKS = [
  { label: 'Privacy policy', href: '/legal/privacy' },
  { label: 'Terms of service', href: '/legal/terms' },
  { label: 'Cookies and storage', href: '/legal/cookies' },
  { label: 'Data processing agreement', href: '/legal/dpa' },
];

function FooterColumn({ title, links }: { title: string; links: readonly { label: string; href: string }[] }) {
  return (
    <div className="space-y-2.5 text-sm">
      <h3 className="font-display text-xs font-semibold uppercase tracking-[0.12em] text-[#172033] dark:text-[#F8FAFC]">
        {title}
      </h3>
      <ul className="space-y-1.5 text-[#526070] dark:text-[#CBD5E1]">
        {links.map((link) => (
          <li key={link.href}>
            <a className="hover:text-[#541B32] dark:hover:text-[#E8A4B5]" href={link.href}>
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { path } = useRouter();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const isHome = path === '/';

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [path]);

  // A hash link on first load has to scroll after the page has rendered.
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;
    const target = document.getElementById(hash);
    if (!target) return;
    const frame = window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [path]);

  // Active section indication follows the section actually in view.
  useEffect(() => {
    if (!isHome || typeof IntersectionObserver === 'undefined') {
      setActiveSection('');
      return;
    }
    const sections = NAV.map((item) => document.getElementById(item.section)).filter(
      (element): element is HTMLElement => Boolean(element),
    );
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActiveSection(visible.target.id);
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: [0.05, 0.25, 0.6] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [isHome]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

  const sectionHref = (section: string) => (isHome ? `#${section}` : `/#${section}`);

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-[#F6F5F9] dark:bg-[#101114] text-[#172033] dark:text-[#F8FAFC] transition-colors">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#541B32]"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-[#E2E8F0]/90 dark:border-[#263244] bg-white/95 dark:bg-[#12131A]/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <a
            href="/"
            aria-label="OppSift — Global Opportunity Intelligence"
            className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A33B59]"
          >
            <OppSiftLogo variant="primary-horizontal" size="md" />
          </a>

          <nav aria-label="Primary" className="hidden lg:flex items-center gap-6 text-sm font-medium text-[#526070] dark:text-[#CBD5E1]">
            {NAV.map((item) => {
              const active = isHome && activeSection === item.section;
              return (
                <a
                  key={item.section}
                  href={sectionHref(item.section)}
                  aria-current={active ? 'true' : undefined}
                  className={`whitespace-nowrap border-b-2 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A33B59] rounded-sm ${
                    active
                      ? 'border-[#541B32] font-semibold text-[#172033] dark:border-[#E8A4B5] dark:text-white'
                      : 'border-transparent hover:text-[#172033] dark:hover:text-white'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>
            <a
              href="/login"
              className="hidden md:inline-flex items-center rounded-md px-3 py-2 text-sm font-medium text-[#172033] dark:text-[#F8FAFC] hover:bg-[#F1F5F9] dark:hover:bg-[#1C2433] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A33B59]"
            >
              Sign In
            </a>
            <a
              href="/register"
              className="hidden sm:inline-flex items-center rounded-md bg-[#541B32] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#A33B59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A33B59] focus-visible:ring-offset-2 dark:ring-offset-[#12131A]"
            >
              Get Started
            </a>
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMobileMenuOpen((value) => !value)}
              aria-expanded={mobileMenuOpen}
              aria-controls="public-mobile-menu"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#E2E8F0] dark:border-[#263244] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A33B59]"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div
            id="public-mobile-menu"
            className="lg:hidden border-t border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#12131A] px-4 pb-4 pt-3 max-h-[calc(100vh-4rem)] overflow-y-auto"
          >
            <nav aria-label="Mobile" className="space-y-0.5">
              {NAV.map((item) => (
                <a
                  key={item.section}
                  href={sectionHref(item.section)}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-md px-3 py-2.5 text-sm font-medium hover:bg-[#F1F5F9] dark:hover:bg-[#1C2433]"
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#E2E8F0] dark:border-[#263244] pt-3">
              <a
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md border border-[#E2E8F0] dark:border-[#263244] px-3 py-2.5 text-center text-sm font-medium"
              >
                Sign In
              </a>
              <a
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md bg-[#541B32] px-3 py-2.5 text-center text-sm font-semibold text-white"
              >
                Get Started
              </a>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-[#E2E8F0] dark:border-[#263244] pt-3 text-xs">
              <span className="text-[#64748B] dark:text-[#94A3B8]">Language and theme</span>
              <div className="flex items-center gap-2">
                <LanguageSwitcher />
                <button
                  type="button"
                  onClick={toggleTheme}
                  aria-label={resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E2E8F0] dark:border-[#263244]"
                >
                  {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main id="main-content" className="flex-1 min-w-0">
        {children}
      </main>

      <footer className="border-t border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#12131A] mt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-4 space-y-3">
              <OppSiftLogo variant="primary-horizontal" size="md" />
              <p className="max-w-sm text-sm leading-relaxed text-[#526070] dark:text-[#CBD5E1]">
                Global opportunity intelligence for official tenders, grants and commercial notices — with the issuing
                source preserved on every record.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[#E2E8F0] dark:border-[#263244] px-3 py-1.5 text-xs font-medium hover:bg-[#F1F5F9] dark:hover:bg-[#1C2433]"
                >
                  {resolvedTheme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                  <span>{resolvedTheme === 'dark' ? 'Light theme' : 'Dark theme'}</span>
                </button>
                <a
                  href="/contact"
                  className="inline-flex items-center rounded-md border border-[#E2E8F0] dark:border-[#263244] px-3 py-1.5 text-xs font-medium hover:bg-[#F1F5F9] dark:hover:bg-[#1C2433]"
                >
                  hello@getoppsift.com
                </a>
              </div>
            </div>

            <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-8">
              <FooterColumn title="Product" links={PRODUCT_LINKS} />
              <FooterColumn title="Resources" links={RESOURCE_LINKS} />
              <FooterColumn title="Company" links={COMPANY_LINKS} />
              <FooterColumn title="Legal" links={LEGAL_LINKS} />
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-[#E2E8F0] dark:border-[#263244] pt-6 text-xs text-[#64748B] dark:text-[#94A3B8] sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} OppSift. All rights reserved.</p>
            <p>Official-source procurement, grant and commercial opportunity intelligence.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
