// Marketing landing page — Server Component
//
// SEO-first: all content is server-rendered. The search input is the only
// client-interactive element and is extracted to CompanySearchBar.
// No auth required to view this page.

import Link from 'next/link'
import { CompanySearchBar } from '@/components/search/company-search-bar'

const PILLARS = [
  {
    icon: '📋',
    title: 'WARN Act Filings',
    description:
      'Every mass layoff and plant closing reported under federal law — the most direct signal of workforce instability.',
    source: 'U.S. Department of Labor / State agencies',
  },
  {
    icon: '📊',
    title: 'SEC Disclosures',
    description:
      'Annual reports, going concern opinions, auditor changes, and executive departures from public company filings.',
    source: 'SEC EDGAR public database',
  },
  {
    icon: '💰',
    title: 'Financial Health',
    description:
      'Cash runway, revenue trajectory, operating cash flow, and debt ratios — extracted from XBRL-tagged financials.',
    source: 'SEC XBRL inline data',
  },
  {
    icon: '📈',
    title: 'Risk Momentum',
    description:
      'Score trends over time. A rising score approaching a tier boundary is more urgent than a static score at the same level.',
    source: 'JoinSafe historical scores',
  },
]

const TIERS = [
  { label: 'Stable', color: 'bg-emerald-500', range: '0–20', description: 'Low indicators' },
  { label: 'Watch', color: 'bg-amber-500', range: '21–40', description: 'Minor signals' },
  { label: 'Elevated', color: 'bg-orange-500', range: '41–60', description: 'Multiple indicators' },
  { label: 'High', color: 'bg-red-500', range: '61–80', description: 'Significant risk' },
  { label: 'Critical', color: 'bg-red-800', range: '81–100', description: 'Severe signals' },
]

const FAQS = [
  {
    q: 'Where does the data come from?',
    a: 'All data is sourced from government databases: WARN Act notices from U.S. state labor agencies, and financial data from SEC EDGAR. No third-party data brokers.',
  },
  {
    q: "Can JoinSafe access private company data?",
    a: "No. JoinSafe analyzes only public records. Private companies without public filings are evaluated solely on WARN notice history. Private company scores carry a lower confidence rating, shown alongside the score.",
  },
  {
    q: 'How often are scores updated?',
    a: 'WARN data is ingested nightly. SEC filings are processed within 24 hours of publication on EDGAR. Scores are recomputed automatically after each ingestion.',
  },
  {
    q: 'Is this legal advice?',
    a: 'No. JoinSafe provides informational analysis of public data. It is not legal, financial, or employment advice. Use it as one input in your own due diligence.',
  },
]

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* ── Navigation ── */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-gray-900">JoinSafe</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-gray-600 sm:flex">
            <Link href="/methodology" className="transition-colors hover:text-gray-900">
              Methodology
            </Link>
            <Link href="/pricing" className="transition-colors hover:text-gray-900">
              Pricing
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden text-sm text-gray-600 transition-colors hover:text-gray-900 sm:block"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
            >
              Get started free
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-gray-100 bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Real government data. Transparent methodology.
          </div>

          <h1 className="text-balance mt-6 text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Know the risk before
            <br />
            you sign.
          </h1>

          <p className="mt-6 text-balance text-lg leading-relaxed text-gray-600">
            JoinSafe analyzes WARN Act layoff filings, SEC disclosures, and financial indicators
            to surface employer stability risk — before you accept an offer.
          </p>

          <div className="mt-10">
            <CompanySearchBar />
          </div>

          <p className="mt-4 text-xs text-gray-400">
            Free · No account required for basic searches · Based on public records
          </p>
        </div>
      </section>

      {/* ── Risk tier legend ── */}
      <section className="border-b border-gray-100 bg-gray-50 py-12">
        <div className="mx-auto max-w-4xl px-4">
          <p className="mb-6 text-center text-sm font-medium uppercase tracking-wide text-gray-400">
            Risk Tiers
          </p>
          <div className="grid grid-cols-5 gap-3">
            {TIERS.map((tier) => (
              <div key={tier.label} className="flex flex-col items-center gap-2 text-center">
                <div className={`h-2 w-full rounded-full ${tier.color}`} />
                <span className="text-sm font-semibold text-gray-900">{tier.label}</span>
                <span className="font-mono text-xs text-gray-400">{tier.range}</span>
                <span className="hidden text-xs text-gray-500 sm:block">{tier.description}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What we analyze ── */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Four signal categories. One score.
            </h2>
            <p className="mt-4 text-gray-600">
              Every point of the risk score is traceable to a specific data source and human-readable
              explanation. We show our work.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((pillar) => (
              <div
                key={pillar.title}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 text-2xl" aria-hidden="true">
                  {pillar.icon}
                </div>
                <h3 className="mb-2 font-semibold text-gray-900">{pillar.title}</h3>
                <p className="mb-4 text-sm leading-relaxed text-gray-600">{pillar.description}</p>
                <p className="text-xs text-gray-400">Source: {pillar.source}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="border-t border-gray-100 bg-gray-50 py-24">
        <div className="mx-auto max-w-4xl px-4">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Due diligence in under a minute.
            </h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Search a company',
                description:
                  'Enter any employer name. JoinSafe searches across public and private companies with WARN history.',
              },
              {
                step: '02',
                title: 'Review the risk score',
                description:
                  'See a transparent 0–100 score broken down by category, with plain-English explanations for each signal.',
              },
              {
                step: '03',
                title: 'Set a watchlist alert',
                description:
                  'Save companies and get notified when their tier changes or a new WARN notice is filed.',
              },
            ].map((step) => (
              <div key={step.step} className="relative">
                <div className="mb-4 font-mono text-4xl font-bold text-gray-200">{step.step}</div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">{step.title}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-4">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Free for job seekers.
            </h2>
            <p className="mt-4 text-gray-600">
              Basic searches are always free. Upgrade to Pro for unlimited searches,
              watchlist alerts, and score history.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-8">
              <div className="mb-2 text-sm font-medium uppercase tracking-wide text-gray-400">Free</div>
              <div className="mb-6 text-4xl font-bold text-gray-900">$0</div>
              <ul className="mb-8 space-y-3 text-sm text-gray-600">
                {['5 company searches / month', 'Risk score + tier', 'Top 3 signals', 'WARN notice count'].map(
                  (f) => (
                    <li key={f} className="flex items-center gap-2">
                      <span className="text-emerald-500">✓</span> {f}
                    </li>
                  ),
                )}
              </ul>
              <Link
                href="/signup"
                className="block rounded-md border border-gray-300 py-2.5 text-center text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Start free
              </Link>
            </div>

            <div className="rounded-xl border-2 border-gray-900 bg-white p-8">
              <div className="mb-2 text-sm font-medium uppercase tracking-wide text-gray-400">Pro</div>
              <div className="mb-1 text-4xl font-bold text-gray-900">$12</div>
              <div className="mb-6 text-xs text-gray-400">per month, billed annually</div>
              <ul className="mb-8 space-y-3 text-sm text-gray-600">
                {[
                  'Unlimited searches',
                  'Full signal breakdown',
                  'Watchlist with tier-change alerts',
                  'Score history & trend chart',
                  'WARN timeline with raw data',
                  'Export to PDF',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-emerald-500">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup?plan=pro"
                className="block rounded-md bg-gray-900 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-gray-700"
              >
                Start 14-day trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="border-t border-gray-100 bg-gray-50 py-24">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight text-gray-900">
            Common questions
          </h2>
          <dl className="space-y-8">
            {FAQS.map((faq) => (
              <div key={faq.q}>
                <dt className="mb-2 font-semibold text-gray-900">{faq.q}</dt>
                <dd className="text-sm leading-relaxed text-gray-600">{faq.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200 bg-white py-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900">JoinSafe</span>
              <span className="text-sm text-gray-400">
                &copy; {new Date().getFullYear()}. Built on public records.
              </span>
            </div>
            <nav className="flex gap-6 text-sm text-gray-500">
              <Link href="/methodology" className="hover:text-gray-900">
                Methodology
              </Link>
              <Link href="/privacy" className="hover:text-gray-900">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-gray-900">
                Terms
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  )
}
