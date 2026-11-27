import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Search } from 'lucide-react';
import { OppSiftLogo } from '../../components/brand/OppSiftLogo';
import { useAppState } from '../../context/AppStateContext';
import { useRouter } from '../../context/RouterContext';
import { OnboardingProfile, OpportunityCategory } from '../../types/oppsift';

const STEPS = [
  'Welcome',
  'Account Type',
  'Organisation',
  'Geography',
  'Interests',
  'Industry & Sector',
  'Capabilities',
  'Matching',
  'Notifications',
  'Completion',
];

const SECTORS = [
  'Healthcare & Life Sciences',
  'Energy Grid & Decarbonisation',
  'Enterprise Software & Cyber',
  'Water & Environmental Systems',
  'Cybersecurity & Federal IT',
  'Smart Mobility & Logistics',
  'Climate & Clean Technology',
  'Civic Engineering',
  'Public Health Research',
  'Agri-Food & Industrial Decarbonisation',
];

const CATEGORIES: OpportunityCategory[] = [
  'Government Tender',
  'Public Procurement',
  'RFP',
  'Grant & Funding',
  'Commercial Contract',
];

export function OnboardingWizardPage() {
  const { navigate } = useRouter();
  const { onboarding, updateOnboarding, pushToast, countries } = useAppState();
  const [step, setStep] = useState(0);
  const [countrySearch, setCountrySearch] = useState('');
  const [sectorSearch, setSectorSearch] = useState('');

  const isIndividual = onboarding.accountType === 'Individual';

  const toggleCountry = (code: string) => {
    const exists = onboarding.countriesOfInterest.includes(code);
    updateOnboarding({
      countriesOfInterest: exists
        ? onboarding.countriesOfInterest.filter((c) => c !== code)
        : [...onboarding.countriesOfInterest, code],
    });
  };

  const toggleCategory = (cat: OpportunityCategory) => {
    const exists = onboarding.opportunityInterests.includes(cat);
    updateOnboarding({
      opportunityInterests: exists
        ? onboarding.opportunityInterests.filter((c) => c !== cat)
        : [...onboarding.opportunityInterests, cat],
    });
  };

  const toggleSector = (sec: string) => {
    const exists = onboarding.sectors.includes(sec);
    updateOnboarding({
      sectors: exists ? onboarding.sectors.filter((s) => s !== sec) : [...onboarding.sectors, sec],
    });
  };

  const nextStep = () => {
    if (step === 1 && isIndividual) {
      setStep(3);
      return;
    }
    if (step < STEPS.length - 1) setStep((s) => s + 1);
  };

  const prevStep = () => {
    if (step === 3 && isIndividual) {
      setStep(1);
      return;
    }
    if (step > 0) setStep((s) => s - 1);
  };

  const handleFinish = () => {
    updateOnboarding({ completed: true });
    pushToast('success', 'Onboarding preferences saved to your OppSift workspace.');
    navigate('/dashboard');
  };

  const progressPct = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#101114] text-[#172033] dark:text-[#F8FAFC] overflow-x-hidden">
      <header className="border-b border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923] px-4 sm:px-8 min-h-16 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <OppSiftLogo variant="primary-horizontal" size="md" />
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs">
          <span className="font-mono tabular-nums text-[#64748B] dark:text-[#CBD5E1]">
            Step {step + 1}/{STEPS.length} · {STEPS[step]}
          </span>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="font-medium text-[#64748B] hover:text-[#172033] dark:text-[#CBD5E1] dark:hover:text-white whitespace-nowrap"
          >
            Skip to Dashboard
          </button>
        </div>
      </header>

      {/* Progress Strip */}
      <div className="h-1.5 w-full bg-[#E2E8F0] dark:bg-[#263244]">
        <div
          className="h-full bg-[#541B32] dark:bg-[#A33B59] transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10 min-w-0">
        {/* Step tabs for direct step review */}
        <div className="mb-6 flex items-center gap-1.5 max-w-full overflow-x-auto pb-1">
          {STEPS.map((label, idx) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(idx)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors ${
                step === idx
                  ? 'bg-[#541B32] text-white'
                  : idx < step
                  ? 'bg-[#FFF1F2] dark:bg-[#541B32]/35 text-[#541B32] dark:text-[#E8A4B5]'
                  : 'bg-[#F1F5F9] dark:bg-[#1C2433] text-[#64748B] dark:text-[#CBD5E1]'
              }`}
            >
              {idx + 1}. {label}
            </button>
          ))}
        </div>

        <div className="rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-white dark:bg-[#171923] p-6 sm:p-8 shadow-xs">
          {step === 0 && (
            <div className="space-y-5">
              <p className="text-xs font-semibold text-[#541B32] dark:text-[#E8A4B5]">Step 1 · Welcome</p>
              <h1 className="font-display text-2xl sm:text-3xl font-bold">Welcome to OppSift, {onboarding.fullName}</h1>
              <p className="text-sm text-[#64748B] dark:text-[#CBD5E1] leading-relaxed">
                OppSift indexes global tenders, RFPs, grants, and commercial contracts and evaluates how closely they fit your capabilities. This short setup configures your default discovery feed, eligibility baselines, and notification alerts.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                {[
                  { title: 'Markets & Currencies', desc: 'Set your operating country and cross-border regions.' },
                  { title: 'Capabilities & Sectors', desc: 'Inform eligibility checks with your certifications and expertise.' },
                  { title: 'Alert Preferences', desc: 'Choose which deadlines and matches trigger digests.' },
                ].map((b) => (
                  <div key={b.title} className="p-4 rounded-xl border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433]/60">
                    <p className="font-display text-sm font-semibold">{b.title}</p>
                    <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] mt-1">{b.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <p className="text-xs font-semibold text-[#541B32] dark:text-[#E8A4B5]">Step 2 · Account Type</p>
              <h2 className="font-display text-2xl font-bold">How are you using OppSift?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(['Individual', 'Business', 'Organisation', 'Consultant', 'Other'] as OnboardingProfile['accountType'][]).map(
                  (type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => updateOnboarding({ accountType: type })}
                      className={`p-4 rounded-xl border text-left transition-colors ${
                        onboarding.accountType === type
                          ? 'border-[#541B32] dark:border-[#E8A4B5] bg-[#FFF1F2] dark:bg-[#541B32]/30'
                          : 'border-[#E2E8F0] dark:border-[#263244] hover:border-[#A33B59]/50'
                      }`}
                    >
                      <p className="font-display text-sm font-semibold">{type}</p>
                      <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] mt-1">
                        {type === 'Individual'
                          ? 'Personal opportunity tracking without organisation fields.'
                          : `Tailored ${type.toLowerCase()} capability matching and team readiness.`}
                      </p>
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#541B32] dark:text-[#E8A4B5]">Step 3 · Organisation Information</p>
                  <h2 className="font-display text-2xl font-bold mt-1">Tell us about your organisation</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="text-xs font-medium text-[#164E8B] dark:text-[#38BDF8] hover:underline"
                >
                  Skip this step
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Organisation Name</label>
                  <input
                    type="text"
                    value={onboarding.organisationName}
                    onChange={(e) => updateOnboarding({ organisationName: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Website</label>
                  <input
                    type="url"
                    value={onboarding.website}
                    onChange={(e) => updateOnboarding({ website: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Headquarters Country</label>
                  <input
                    type="text"
                    value={onboarding.country}
                    onChange={(e) => updateOnboarding({ country: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Organisation Size</label>
                  <select
                    value={onboarding.organisationSize}
                    onChange={(e) => updateOnboarding({ organisationSize: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433] text-sm"
                  >
                    <option>1–10 employees</option>
                    <option>11–24 employees</option>
                    <option>25–99 employees</option>
                    <option>100–499 employees</option>
                    <option>500+ employees</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Organisation Description</label>
                <textarea
                  rows={3}
                  value={onboarding.organisationDescription}
                  onChange={(e) => updateOnboarding({ organisationDescription: e.target.value })}
                  className="w-full p-3 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433] text-sm"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-[#541B32] dark:text-[#E8A4B5]">Step 4 · Geographic Preferences</p>
              <h2 className="font-display text-2xl font-bold">Select target countries &amp; regions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Primary Operating Country</label>
                  <select
                    value={onboarding.primaryCountry}
                    onChange={(e) => updateOnboarding({ primaryCountry: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433] text-sm"
                  >
                    {countries.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name} ({c.currency})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={onboarding.internationalPreference}
                      onChange={(e) => updateOnboarding({ internationalPreference: e.target.checked })}
                      className="rounded"
                    />
                    <span>Include cross-border &amp; multilateral notices</span>
                  </label>
                </div>
              </div>

              <div>
                <div className="relative mb-3">
                  <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    placeholder="Search supported countries..."
                    className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433] text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {countries.filter(
                    (c) =>
                      !countrySearch.trim() ||
                      c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
                      c.region.toLowerCase().includes(countrySearch.toLowerCase())
                  ).map((c) => {
                    const selected = onboarding.countriesOfInterest.includes(c.code);
                    return (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => toggleCountry(c.code)}
                        className={`px-3 py-2 rounded-lg border text-left text-xs font-medium flex items-center justify-between ${
                          selected
                            ? 'border-[#541B32] dark:border-[#E8A4B5] bg-[#FFF1F2] dark:bg-[#541B32]/30 text-[#541B32] dark:text-[#E8A4B5]'
                            : 'border-[#E2E8F0] dark:border-[#263244]'
                        }`}
                      >
                        <span className="truncate">{c.name}</span>
                        {selected && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-[#541B32] dark:text-[#E8A4B5]">Step 5 · Opportunity Interests</p>
              <h2 className="font-display text-2xl font-bold">Which opportunity categories matter most?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CATEGORIES.map((cat) => {
                  const selected = onboarding.opportunityInterests.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`p-4 rounded-xl border text-left flex items-center justify-between ${
                        selected
                          ? 'border-[#541B32] dark:border-[#E8A4B5] bg-[#FFF1F2] dark:bg-[#541B32]/30'
                          : 'border-[#E2E8F0] dark:border-[#263244]'
                      }`}
                    >
                      <span className="font-display text-sm font-semibold">{cat}</span>
                      {selected && <Check className="w-4 h-4 text-[#541B32] dark:text-[#E8A4B5]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-[#541B32] dark:text-[#E8A4B5]">Step 6 · Industry &amp; Sector</p>
              <h2 className="font-display text-2xl font-bold">Select target sectors</h2>
              <div className="relative">
                <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={sectorSearch}
                  onChange={(e) => setSectorSearch(e.target.value)}
                  placeholder="Filter sectors..."
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433] text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SECTORS.filter((s) => !sectorSearch.trim() || s.toLowerCase().includes(sectorSearch.toLowerCase())).map(
                  (sec) => {
                    const selected = onboarding.sectors.includes(sec);
                    return (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => toggleSector(sec)}
                        className={`px-3.5 py-2.5 rounded-lg border text-left text-xs font-medium flex items-center justify-between ${
                          selected
                            ? 'border-[#541B32] dark:border-[#E8A4B5] bg-[#FFF1F2] dark:bg-[#541B32]/30'
                            : 'border-[#E2E8F0] dark:border-[#263244]'
                        }`}
                      >
                        <span>{sec}</span>
                        {selected && <Check className="w-3.5 h-3.5 text-[#541B32] dark:text-[#E8A4B5]" />}
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-[#541B32] dark:text-[#E8A4B5]">Step 7 · Business Capabilities</p>
              <h2 className="font-display text-2xl font-bold">Describe services, expertise &amp; certifications</h2>
              <div>
                <label className="block text-xs font-medium mb-1">Core Services, Products &amp; Domain Expertise</label>
                <textarea
                  rows={3}
                  value={onboarding.servicesAndProducts}
                  onChange={(e) => updateOnboarding({ servicesAndProducts: e.target.value })}
                  className="w-full p-3 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Certifications, Accreditations &amp; Standards</label>
                <textarea
                  rows={2}
                  value={onboarding.expertiseAndCertifications}
                  onChange={(e) => updateOnboarding({ expertiseAndCertifications: e.target.value })}
                  className="w-full p-3 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433] text-sm"
                />
              </div>
            </div>
          )}

          {step === 7 && (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-[#541B32] dark:text-[#E8A4B5]">Step 8 · Matching Preferences</p>
              <h2 className="font-display text-2xl font-bold">Configure value &amp; deadline thresholds</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Reference Currency</label>
                  <select
                    value={onboarding.preferredCurrency}
                    onChange={(e) => updateOnboarding({ preferredCurrency: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433] text-sm"
                  >
                    <option value="EUR">EUR — Euro</option>
                    <option value="GBP">GBP — British Pound</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="SGD">SGD — Singapore Dollar</option>
                    <option value="CAD">CAD — Canadian Dollar</option>
                    <option value="AUD">AUD — Australian Dollar</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Minimum Days Until Deadline</label>
                  <input
                    type="number"
                    value={onboarding.minLeadDays}
                    onChange={(e) => updateOnboarding({ minLeadDays: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433] text-sm font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Minimum Estimated Value</label>
                  <input
                    type="number"
                    value={onboarding.minContractValue}
                    onChange={(e) => updateOnboarding({ minContractValue: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433] text-sm font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Maximum Estimated Value</label>
                  <input
                    type="number"
                    value={onboarding.maxContractValue}
                    onChange={(e) => updateOnboarding({ maxContractValue: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433] text-sm font-mono tabular-nums"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 8 && (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-[#541B32] dark:text-[#E8A4B5]">Step 9 · Notifications</p>
              <h2 className="font-display text-2xl font-bold">Choose what updates you receive</h2>
              <div className="space-y-3">
                {[
                  { key: 'notifyNewMatches' as const, label: 'New matching opportunities', desc: 'Alert when indexed tenders match your capability profile.' },
                  { key: 'notifyDeadlines' as const, label: 'Deadline reminders', desc: 'Remind 14, 7, and 2 days before pipeline closing dates.' },
                  { key: 'notifyAmendments' as const, label: 'Opportunity amendments', desc: 'Notify immediately when corrigenda or Q&A updates are published.' },
                  { key: 'notifyUpdates' as const, label: 'Platform & source updates', desc: 'Receive announcements when new country sources go live.' },
                ].map((opt) => (
                  <label
                    key={opt.key}
                    className="flex items-start justify-between gap-4 p-4 rounded-xl border border-[#E2E8F0] dark:border-[#263244] cursor-pointer"
                  >
                    <div>
                      <p className="text-sm font-semibold">{opt.label}</p>
                      <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] mt-0.5">{opt.desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={onboarding[opt.key]}
                      onChange={(e) => updateOnboarding({ [opt.key]: e.target.checked })}
                      className="mt-1 rounded"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 9 && (
            <div className="space-y-5">
              <p className="text-xs font-semibold text-[#16A34A]">Step 10 · Ready</p>
              <h2 className="font-display text-2xl font-bold">Your OppSift profile is configured</h2>
              <div className="p-4 rounded-xl border border-[#E2E8F0] dark:border-[#263244] bg-[#F8FAFC] dark:bg-[#1C2433]/60 space-y-2 text-xs">
                <p><span className="font-semibold">Account Context:</span> {onboarding.accountType} · {onboarding.organisationName}</p>
                <p><span className="font-semibold">Countries:</span> {onboarding.countriesOfInterest.join(', ') || 'None selected'}</p>
                <p><span className="font-semibold">Categories:</span> {onboarding.opportunityInterests.join(', ')}</p>
                <p><span className="font-semibold">Sectors:</span> {onboarding.sectors.join(', ')}</p>
                <p><span className="font-semibold">Value Range:</span> {onboarding.preferredCurrency} {onboarding.minContractValue} – {onboarding.maxContractValue}</p>
              </div>
              <p className="text-xs text-[#64748B] dark:text-[#CBD5E1]">
                You can update any of these preferences later in Workspace Settings.
              </p>
            </div>
          )}

          {/* Wizard Navigation Footer */}
          <div className="mt-8 pt-6 border-t border-[#E2E8F0] dark:border-[#263244] flex items-center justify-between">
            <button
              type="button"
              onClick={prevStep}
              disabled={step === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E2E8F0] dark:border-[#263244] text-sm font-medium disabled:opacity-40"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={nextStep}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#541B32] hover:bg-[#A33B59] text-white text-sm font-semibold"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#541B32] hover:bg-[#A33B59] text-white text-sm font-semibold"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
