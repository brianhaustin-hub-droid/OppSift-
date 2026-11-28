import React, { useState } from 'react';
import { Database, ShieldCheck } from 'lucide-react';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { PhotographicBackdrop } from '../../components/media/PhotographicBackdrop';
import { useRouter } from '../../context/RouterContext';
import { PhotographicThemeId } from '../../types/oppsift';

function PublicHeroBanner({
  initialTheme = 'global-cities',
  overlayTone = 'burgundy-navy',
  kicker,
  title,
  subtitle,
  rightSlot,
}: {
  initialTheme?: PhotographicThemeId;
  overlayTone?: 'burgundy' | 'navy' | 'burgundy-navy';
  kicker: string;
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <PhotographicBackdrop
      initialTheme={initialTheme}
      overlayTone={overlayTone}
      minHeightClass="min-h-[320px] sm:min-h-[380px]"
      className="border-b border-white/10"
    >
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-14 pb-12 lg:pt-20 lg:pb-16">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold tracking-wide text-[#E8A4B5]">{kicker}</p>
            <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight text-white text-balance">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-3 text-sm sm:text-base text-white/85 leading-relaxed max-w-2xl">
                {subtitle}
              </p>
            )}
          </div>
          {rightSlot && <div className="shrink-0">{rightSlot}</div>}
        </div>
      </div>
    </PhotographicBackdrop>
  );
}

export function PublicAboutPage() {
  return (
    <PublicLayout>
      <PublicHeroBanner
        initialTheme="energy-sustainability"
        overlayTone="burgundy-navy"
        kicker="About OppSift"
        title="Clarity and integrity for global opportunity intelligence"
        subtitle="Eliminating fragmented tender tracking across borders with verifiable source provenance and disciplined pipeline architecture."
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        <p className="text-base text-[#64748B] dark:text-[#CBD5E1] leading-relaxed max-w-3xl">
          OppSift was designed to eliminate fragmented tender tracking across borders. Organisations pursuing international public procurement, research grants, and enterprise RFPs deserve accurate source attribution, transparent eligibility analysis, and disciplined pipeline tooling.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: 'Global-First Architecture', body: 'Currencies, languages, time zones, and regulatory frameworks are handled natively—never hardcoded to a single market.' },
            { title: 'Honest Source Provenance', body: 'Every notice links back to its contracting authority and displays real ingestion timestamps and availability status.' },
            { title: 'Human-Verified Decisions', body: 'AI interpretation assists rapid triage, while always keeping final eligibility and submission decisions with your team.' },
          ].map((p) => (
            <div key={p.title} className="p-6 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923]">
              <Database className="w-5 h-5 text-[#164E8B] dark:text-[#38BDF8] mb-3" />
              <h2 className="font-display text-base font-semibold">{p.title}</h2>
              <p className="mt-2 text-sm text-[#64748B] dark:text-[#CBD5E1]">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}

const siteContactEmail = 'hello@getoppsift.com';

export function PublicContactPage({ initialSubmitted = false }: { initialSubmitted?: boolean }) {
  const [name, setName] = useState(initialSubmitted ? 'Workspace Visitor' : '');
  const [email, setEmail] = useState('');
  const [org, setOrg] = useState('');
  const [topic, setTopic] = useState('Enterprise & Team Access');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(initialSubmitted);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.includes('@') || message.trim().length < 10) {
      setError('Please provide your name, a valid email address, and a brief inquiry (at least 10 characters).');
      return;
    }
    setError('');
    // The form composes an email in the visitor's own mail application. It does
    // not claim to have delivered a message, because this deployment has no
    // inbox endpoint behind it.
    const subject = `[OppSift] ${topic}`;
    const body = [
      `Name: ${name}`,
      `Email: ${email}`,
      org.trim() ? `Organisation: ${org}` : '',
      '',
      message,
    ]
      .filter((line) => line !== '')
      .join('\n');
    window.location.href = `mailto:${siteContactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSubmitted(true);
  };

  return (
    <PublicLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-4">
          <p className="text-xs font-semibold text-[#541B32] dark:text-[#E8A4B5]">Contact</p>
          <h1 className="font-display text-3xl font-bold">Speak with the OppSift team</h1>
          <p className="text-sm text-[#64748B] dark:text-[#CBD5E1] leading-relaxed">
            Questions about regional source coverage, team onboarding, or custom data feeds? Send us a structured inquiry.
          </p>
          <div className="p-5 rounded-xl border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923] space-y-2 text-sm">
            <p><span className="font-semibold">General enquiries:</span> {siteContactEmail}</p>
            <p><span className="font-semibold">Source coverage:</span> sources@getoppsift.com</p>
            <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">
              The form below composes a message in your own email application. Nothing is submitted to a server by this page.
            </p>
          </div>
        </div>

        <div className="lg:col-span-7">
          {submitted ? (
            <div className="p-8 rounded-xl border border-[#16A34A]/30 bg-white dark:bg-[#171923] space-y-3">
              <p className="text-sm font-semibold text-[#16A34A]">Email prepared</p>
              <h2 className="font-display text-xl font-bold">Your email application should now be open</h2>
              <p className="text-sm text-[#64748B] dark:text-[#CBD5E1]">
                The message about{' '}
                <span className="font-medium text-[#172033] dark:text-[#F8FAFC]">{topic}</span> was handed to your mail
                application and is not sent until you send it. If nothing opened, write to{' '}
                <span className="font-medium text-[#172033] dark:text-[#F8FAFC]">{siteContactEmail}</span> directly.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setMessage('');
                }}
                className="px-4 py-2 rounded-lg border border-[#E2E8F0] dark:border-[#263244] text-xs font-semibold"
              >
                Send another inquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 rounded-xl border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923] space-y-4">
              {error && <p className="text-xs font-medium text-[#DC2626]">{error}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Work Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@organisation.org"
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433] text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Organisation</label>
                  <input
                    type="text"
                    value={org}
                    onChange={(e) => setOrg(e.target.value)}
                    placeholder="Organisation name"
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Topic</label>
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433] text-sm"
                  >
                    <option>Enterprise &amp; Team Access</option>
                    <option>Country &amp; Source Requests</option>
                    <option>Technical Support</option>
                    <option>Billing Inquiry</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Message</label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us about your target markets and team requirements..."
                  className="w-full p-3 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433] text-sm"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-[#541B32] hover:bg-[#A33B59] text-white text-sm font-semibold"
              >
                Submit Inquiry
              </button>
            </form>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}

export function PublicGettingStartedPage() {
  const { navigate } = useRouter();
  const steps = [
    {
      num: '01',
      title: 'Verify Your Account & Organisation Profile',
      body: 'Sign in with Neon Managed Auth and record your legal jurisdiction, active countries, preferred currencies, and verified certifications.',
    },
    {
      num: '02',
      title: 'Configure Sector & Value Thresholds',
      body: 'Define the contract value range, minimum bid lead days, and tender categories (Government Tenders, Grants, RFPs, Commercial) aligned to your capacity.',
    },
    {
      num: '03',
      title: 'Create Saved Searches & Corrigendum Alerts',
      body: 'Turn multi-country filter combinations into persistent monitors with Immediate, Daily, or Weekly amendment notifications.',
    },
    {
      num: '04',
      title: 'Inspect Eligibility & Launch Bid Preparation',
      body: 'Review clause-level eligibility matrices in the AI Intelligence workspace before moving qualified opportunities into your 7-stage pipeline.',
    },
  ];

  return (
    <PublicLayout>
      <PublicHeroBanner
        initialTheme="international-business"
        overlayTone="navy"
        kicker="Getting Started"
        title="Launch your OppSift intelligence workspace in four steps"
        subtitle="From initial profile calibration to clause-level AI eligibility screening and shared team preparation."
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {steps.map((s) => (
            <div key={s.num} className="p-6 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923] space-y-2">
              <span className="font-mono text-sm font-bold text-[#541B32] dark:text-[#E8A4B5]">{s.num}</span>
              <h2 className="font-display text-lg font-semibold">{s.title}</h2>
              <p className="text-sm text-[#64748B] dark:text-[#CBD5E1] leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate('/onboarding')}
            className="px-5 py-2.5 rounded-md bg-[#541B32] hover:bg-[#A33B59] text-white text-sm font-semibold"
          >
            Start 10-Step Onboarding Wizard
          </button>
          <button
            type="button"
            onClick={() => navigate('/auth')}
            className="px-5 py-2.5 rounded-md border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923] text-sm font-semibold"
          >
            Go to Neon Auth Sign In
          </button>
        </div>
      </div>
    </PublicLayout>
  );
}

export function PublicDocsPage() {
  const [query, setQuery] = useState('');
  const topics = [
    {
      category: 'Discovery',
      title: 'Search Operators & Jurisdiction Filtering',
      summary: 'Combine boolean keywords, ISO country codes (GB, DE, SG, US, EU), minimum lead days, and native contract currencies.',
      snippet: 'sector:"Health Systems" AND country:(GB OR EU) AND min_lead_days>=14',
    },
    {
      category: 'AI Intelligence',
      title: 'Eligibility Assessment & Provenance Rules',
      summary: 'Every criterion separates verified official notice clauses from missing profile fields. Unknown requirements never display as confirmed.',
      snippet: 'status ∈ {"Satisfied", "Unsatisfied", "Unknown", "Potential Disqualifier"}',
    },
    {
      category: 'Data Sources',
      title: 'OCDS & Official Procurement Portal Schema',
      summary: 'Normalised notice fields preserve referenceNumber, sourceUrl, deadlineTimezone, and verifiable amendment history.',
      snippet: 'release.tender.submissionMethod · tenderPeriod.endDate · awards[].currency',
    },
    {
      category: 'Pipeline & Exports',
      title: '7-Stage Preparation & Reporting Formats',
      summary: 'Move items across Interested, Evaluating, Preparing, Submitted, Won, Lost, and Archived with CSV, JSON, and printable briefs.',
      snippet: 'GET /api/reports/export?format=csv|json (pending Neon PostgreSQL API activation)',
    },
  ].filter(
    (t) =>
      !query.trim() ||
      t.title.toLowerCase().includes(query.toLowerCase()) ||
      t.summary.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <PublicLayout>
      <PublicHeroBanner
        initialTheme="research-innovation"
        overlayTone="navy"
        kicker="Documentation"
        title="Platform Documentation & Reference"
        subtitle="Search operational guides for OppSift discovery syntax, eligibility rules, and OCDS source normalisation."
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter documentation topics..."
          className="w-full max-w-md h-10 px-3.5 rounded-md border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923] text-sm"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {topics.map((t) => (
            <div key={t.title} className="p-6 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923] space-y-3">
              <p className="text-xs font-semibold text-[#164E8B] dark:text-[#38BDF8]">{t.category}</p>
              <h2 className="font-display text-lg font-semibold">{t.title}</h2>
              <p className="text-sm text-[#64748B] dark:text-[#CBD5E1] leading-relaxed">{t.summary}</p>
              <pre className="p-3 rounded-md bg-[#F8FAFC] dark:bg-[#101114] border border-[#E2E8F0] dark:border-[#263244] font-mono text-[11px] overflow-x-auto">
                {t.snippet}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}

export function PublicSecurityPage() {
  const pillars = [
    {
      title: 'Neon Managed Authentication & Session Isolation',
      body: 'Authentication, password recovery, email verification, and team invitation acceptance are designed for Neon Managed Auth with scoped workspace tokens.',
    },
    {
      title: 'AI Provenance & Source Separation',
      body: 'OppSift never mutates official solicitation text. AI eligibility interpretations and risk summaries remain visibly separated from verified contracting authority clauses.',
    },
    {
      title: 'Transport & Storage Boundaries',
      body: 'All API communications require TLS 1.3 encryption in transit, while organisation documents and pipeline attachments target encrypted object storage with role-based access.',
    },
  ];

  return (
    <PublicLayout>
      <PublicHeroBanner
        initialTheme="connectivity-emerging"
        overlayTone="navy"
        kicker="Security & Trust"
        title="Enterprise Security & Data Provenance"
        subtitle="Built to protect sensitive bid preparation notes, organisation credentials, and audit records."
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pillars.map((p) => (
            <div key={p.title} className="p-6 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923] space-y-2">
              <ShieldCheck className="w-5 h-5 text-[#164E8B] dark:text-[#38BDF8]" />
              <h2 className="font-display text-base font-semibold pt-1">{p.title}</h2>
              <p className="text-sm text-[#64748B] dark:text-[#CBD5E1] leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}

function LegalNavTabs({ active }: { active: 'privacy' | 'terms' | 'cookies' | 'dpa' }) {
  const { navigate } = useRouter();
  const tabs = [
    { id: 'privacy' as const, label: 'Privacy Policy', route: '/legal/privacy' },
    { id: 'terms' as const, label: 'Terms of Service', route: '/legal/terms' },
    { id: 'cookies' as const, label: 'Cookie Preferences', route: '/legal/cookies' },
    { id: 'dpa' as const, label: 'Data Processing (DPA)', route: '/legal/dpa' },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => navigate(t.route)}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
            active === t.id
              ? 'border-[#A33B59] bg-[#FFF1F2] dark:bg-[#541B32]/50 text-[#541B32] dark:text-[#E8A4B5]'
              : 'border-[#E2E8F0] dark:border-white/15 text-[#64748B] dark:text-[#CBD5E1]'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function PublicPrivacyPage() {
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-6">
        <LegalNavTabs active="privacy" />
        <div>
          <p className="text-xs font-semibold text-[#541B32] dark:text-[#E8A4B5]">Legal &amp; Privacy</p>
          <h1 className="mt-2 font-display text-3xl font-bold">Privacy Policy</h1>
          <p className="mt-1 text-xs text-[#64748B] dark:text-[#CBD5E1]">Effective Version 2026.2 · Last updated November 19, 2026</p>
        </div>
        <div className="p-6 rounded-lg oppsift-card space-y-4 text-sm text-[#64748B] dark:text-[#CBD5E1] leading-relaxed">
          <p>
            <strong className="text-[#172033] dark:text-[#F8FAFC]">1. Workspace Data Processed:</strong> OppSift stores organisation capability profiles, saved searches, pipeline notes, and alert preferences strictly to deliver opportunity matching and monitoring workflows.
          </p>
          <p>
            <strong className="text-[#172033] dark:text-[#F8FAFC]">2. Cross-Border &amp; GDPR Rights:</strong> Organisations may export workspace account data in structured JSON or initiate account deletion from Security Settings at any time.
          </p>
          <p>
            <strong className="text-[#172033] dark:text-[#F8FAFC]">3. Merchant of Record Billing Records:</strong> Subscription payments and statutory tax receipts are processed by Lemon Squeezy. OppSift retains subscription references and invoice metadata without storing payment card numbers.
          </p>
        </div>
        <div className="p-5 rounded-lg oppsift-card space-y-2 text-xs">
          <h2 className="font-display text-sm font-bold">Legal Document Version History</h2>
          <div className="flex justify-between text-[#64748B] dark:text-[#CBD5E1] py-1.5 border-b border-[#E2E8F0] dark:border-white/10">
            <span className="font-mono">v2026.2 · Nov 19, 2026</span>
            <span>Added Lemon Squeezy Merchant of Record processing disclosures</span>
          </div>
          <div className="flex justify-between text-[#64748B] dark:text-[#CBD5E1] py-1.5">
            <span className="font-mono">v2026.1 · Sep 01, 2026</span>
            <span>Initial OppSift platform privacy schedule</span>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

export function PublicTermsPage() {
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-6">
        <LegalNavTabs active="terms" />
        <div>
          <p className="text-xs font-semibold text-[#541B32] dark:text-[#E8A4B5]">Legal &amp; Commercial Terms</p>
          <h1 className="mt-2 font-display text-3xl font-bold">Terms of Service</h1>
          <p className="mt-1 text-xs text-[#64748B] dark:text-[#CBD5E1]">Version 2026.2 · Platform Usage, Billing &amp; Official Notice Disclaimer</p>
        </div>
        <div className="p-6 rounded-lg oppsift-card space-y-4 text-sm text-[#64748B] dark:text-[#CBD5E1] leading-relaxed">
          <p>
            <strong className="text-[#172033] dark:text-[#F8FAFC]">1. Official Source Authority:</strong> While OppSift tracks official tenders, grants, and RFPs, the issuing contracting authority portal remains the sole authoritative record for specifications, corrigenda, and final submission deadlines.
          </p>
          <p>
            <strong className="text-[#172033] dark:text-[#F8FAFC]">2. AI Decision Support Boundary:</strong> Automated eligibility scores and extracted requirements assist capture qualification and do not constitute legal or procurement compliance advice.
          </p>
          <p>
            <strong className="text-[#172033] dark:text-[#F8FAFC]">3. Subscriptions &amp; Renewals:</strong> Paid subscriptions renew automatically until cancelled through Billing Settings or the Lemon Squeezy Customer Portal. Access remains active until the close of the current billing period.
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}

export function PublicCookiesPage() {
  const [prefs, setPrefs] = useState(true);
  const [analytics, setAnalytics] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-6">
        <LegalNavTabs active="cookies" />
        <div>
          <p className="text-xs font-semibold text-[#541B32] dark:text-[#E8A4B5]">Legal &amp; Consent</p>
          <h1 className="mt-2 font-display text-3xl font-bold">Cookie &amp; Consent Preferences</h1>
          <p className="mt-2 text-sm text-[#64748B] dark:text-[#CBD5E1]">
            Control how OppSift stores theme preferences, session tokens, and optional product diagnostics.
          </p>
        </div>

        <div className="p-6 rounded-lg oppsift-card space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-[#E2E8F0] dark:border-[#263244]">
            <div>
              <p className="text-sm font-semibold">Strictly Necessary Session &amp; Auth Cookies</p>
              <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">Required for authentication and workspace security. Always active.</p>
            </div>
            <span className="text-xs font-semibold text-[#16A34A]">Always On</span>
          </div>

          <label className="flex items-center justify-between py-2 border-b border-[#E2E8F0] dark:border-[#263244] cursor-pointer">
            <div>
              <p className="text-sm font-semibold">Interface Preferences (Theme &amp; View Mode)</p>
              <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">Remembers dark/light theme and Explorer table density.</p>
            </div>
            <input type="checkbox" checked={prefs} onChange={(e) => setPrefs(e.target.checked)} />
          </label>

          <label className="flex items-center justify-between py-2 cursor-pointer">
            <div>
              <p className="text-sm font-semibold">Aggregated Product Usage Analytics</p>
              <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">Optional anonymous telemetry to improve search relevance.</p>
            </div>
            <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} />
          </label>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSavedNotice(true)}
              className="px-4 py-2 rounded-lg bg-[#541B32] hover:bg-[#A33B59] text-white text-xs font-semibold"
            >
              Save Consent Preferences
            </button>
            {savedNotice && <span className="text-xs font-medium text-[#16A34A]">Consent preferences updated.</span>}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

export function PublicDataProcessingPage() {
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-6">
        <LegalNavTabs active="dpa" />
        <div>
          <p className="text-xs font-semibold text-[#541B32] dark:text-[#E8A4B5]">Enterprise Governance</p>
          <h1 className="mt-2 font-display text-3xl font-bold">Data Processing Information (DPA)</h1>
          <p className="mt-1 text-xs text-[#64748B] dark:text-[#CBD5E1]">
            Infrastructure processors, tenant isolation boundaries, and international transfer governance.
          </p>
        </div>

        <div className="p-6 rounded-lg oppsift-card space-y-4 text-sm text-[#64748B] dark:text-[#CBD5E1] leading-relaxed">
          <p>
            <strong className="text-[#172033] dark:text-[#F8FAFC]">Sub-Processor Transparency:</strong> OppSift utilises Neon PostgreSQL (database storage), Neon Managed Auth (identity &amp; session management), Cloudflare Pages (web delivery), and Lemon Squeezy (Merchant of Record billing).
          </p>
          <p>
            <strong className="text-[#172033] dark:text-[#F8FAFC]">Tenant Segregation:</strong> Organisation profiles, bid pipeline tasks, notes, and saved reports are logically partitioned per workspace tenant and governed by Role-Based Access Control (Owner, Admin, Analyst, Viewer).
          </p>
          <p>
            <strong className="text-[#172033] dark:text-[#F8FAFC]">Retention &amp; Erasure:</strong> Account holders may export workspace records in structured JSON at any time and request permanent erasure through Account Security Settings.
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
