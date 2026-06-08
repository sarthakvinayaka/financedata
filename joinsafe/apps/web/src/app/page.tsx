// Marketing landing page — Server Component
// Uses the new premium design system: Cormorant display headings, aubergine palette,
// warm ivory backgrounds. All interactive elements extracted to Client Components.

import Link from 'next/link'
import { RiskBadge, MetricCard } from '@joinsafe/ui'
import type { RiskTier } from '@joinsafe/core'
import { SearchHero } from '@/components/search/search-hero'
import { MethodologyCallout } from '@/components/common/methodology-callout'
import { TopNav } from '@/components/shell/top-nav'

// ── Data ─────────────────────────────────────────────────────────────────────

const PILLARS = [
  {
    label: '01',
    title: 'WARN Act Filings',
    body: 'Every mass layoff and plant closing required to be filed under federal law — across all 50 states. The most direct, legally-mandated signal of workforce instability.',
    source: 'U.S. state labor agencies',
  },
  {
    label: '02',
    title: 'SEC Disclosures',
    body: 'Annual and quarterly filings surface going concern opinions, auditor changes, financial restatements, and C-suite departures — each a documented precursor to restructuring.',
    source: 'SEC EDGAR (public database)',
  },
  {
    label: '03',
    title: 'Financial Indicators',
    body: 'Cash runway, revenue trajectory, operating cash flow, and leverage ratios extracted from machine-readable XBRL financial data embedded in regulatory filings.',
    source: 'SEC XBRL inline data',
  },
  {
    label: '04',
    title: 'Risk Momentum',
    body: 'Scores are trended over time. A score rising toward a tier boundary carries more urgency than a static equivalent — the direction matters as much as the level.',
    source: 'JoinSafe historical scores',
  },
]

const SAMPLE_COMPANIES: Array<{
  name: string
  sector: string
  hq: string
  tier: RiskTier
  score: number
  note: string
}> = [
  { name: 'Meridian Software', sector: 'Technology', hq: 'San Francisco, CA', tier: 'HIGH', score: 68, note: '2 WARN notices · Going concern filed' },
  { name: 'Atlas Manufacturing', sector: 'Industrials', hq: 'Detroit, MI', tier: 'ELEVATED', score: 44, note: '1 WARN notice · Revenue −14%' },
  { name: 'Borealis Capital', sector: 'Finance', hq: 'New York, NY', tier: 'STABLE', score: 12, note: 'No WARN filings · Strong cash position' },
  { name: 'Crestwood Retail', sector: 'Consumer', hq: 'Dallas, TX', tier: 'WATCH', score: 31, note: '1 WARN notice · Moderate leverage' },
  { name: 'Halcyon Bio', sector: 'Healthcare', hq: 'Cambridge, MA', tier: 'CRITICAL', score: 86, note: '3 WARN notices · 7-month cash runway' },
]

const PLAN_FEATURES = {
  free: ['5 company searches / month', 'Risk score + tier', 'Top 3 signals', 'WARN notice count'],
  pro: ['Unlimited searches', 'Full signal breakdown', 'Watchlist with tier-change alerts', 'Score history & trend', 'WARN timeline with raw data', 'SEC filing summaries', 'PDF export'],
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-base">
      <TopNav />

      {/* ── Search hero ── */}
      <SearchHero variant="landing" />

      {/* ── Sample companies ── */}
      <section className="border-b border-subtle bg-surface py-16 sm:py-20">
        <div className="mx-auto max-w-site px-5 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
            <div>
              <p className="type-label text-plum-600 mb-2">Live data · Updated nightly</p>
              <h2 className="font-display text-3xl font-semibold text-primary">
                Example risk profiles
              </h2>
            </div>
            <p className="type-small text-tertiary max-w-xs">
              Illustrative examples using synthetic data.
              Real scores are computed from public records.
            </p>
          </div>

          <div className="rounded-xl border border-subtle overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-subtle border-b border-subtle">
                <tr>
                  {['Employer', 'Sector', 'Score', 'Tier', 'Key indicators'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left type-label text-tertiary first:pl-5 last:pr-5 last:hidden sm:last:table-cell">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {SAMPLE_COMPANIES.map((co) => (
                  <tr key={co.name} className="hover:bg-subtle transition-colors group">
                    <td className="px-4 py-4 pl-5">
                      <p className="font-medium text-primary">{co.name}</p>
                      <p className="type-caption text-faint mt-0.5">{co.hq}</p>
                    </td>
                    <td className="px-4 py-4 text-secondary hidden sm:table-cell">{co.sector}</td>
                    <td className="px-4 py-4">
                      <span className="font-mono text-lg font-bold tabular-nums text-primary">{co.score}</span>
                    </td>
                    <td className="px-4 py-4">
                      <RiskBadge tier={co.tier} size="sm" />
                    </td>
                    <td className="px-4 py-4 pr-5 type-caption text-tertiary hidden sm:table-cell">
                      {co.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Four pillars ── */}
      <section className="bg-paper py-20 sm:py-28 border-b border-subtle">
        <div className="mx-auto max-w-site px-5 sm:px-6">
          <div className="max-w-2xl mb-14">
            <p className="type-label text-plum-600 mb-3">Signal categories</p>
            <h2 className="font-display text-4xl font-semibold text-primary text-balance">
              Four categories. One transparent score.
            </h2>
            <p className="type-lead mt-4 text-secondary text-balance">
              Every point in the score is traceable to a specific government record. We show our working.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((p) => (
              <div key={p.label} className="card flex flex-col gap-4 p-6">
                <div className="flex items-start justify-between">
                  <span className="font-mono text-3xl font-bold text-plum-100 leading-none select-none">
                    {p.label}
                  </span>
                </div>
                <div>
                  <h3 className="font-sans text-sm font-semibold text-primary mb-2">{p.title}</h3>
                  <p className="type-small text-secondary leading-relaxed">{p.body}</p>
                </div>
                <p className="type-caption text-faint mt-auto pt-3 border-t border-subtle">
                  {p.source}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Aggregate stats ── */}
      <section className="bg-plum-700 py-16 sm:py-20">
        <div className="mx-auto max-w-site px-5 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="WARN notices indexed"  value="94,000+" variant="accent" />
            <MetricCard label="States covered"        value="12"       subvalue="of 50" variant="accent" note="Expanding monthly" />
            <MetricCard label="Public companies"      value="8,400+"   variant="accent" />
            <MetricCard label="Data refresh cycle"    value="Nightly"  variant="accent" note="SEC within 24h of filing" />
          </div>
        </div>
      </section>

      {/* ── Methodology ── */}
      <section className="bg-surface border-b border-subtle py-20 sm:py-28">
        <div className="mx-auto max-w-site px-5 sm:px-6">
          <div className="max-w-2xl mb-10">
            <p className="type-label text-plum-600 mb-3">Methodology</p>
            <h2 className="font-display text-4xl font-semibold text-primary">
              No black boxes.
            </h2>
            <p className="type-lead mt-4 text-secondary text-balance">
              The scoring model is fixed, disclosed, and version-controlled.
              Weights are not tuned per company or per industry.
            </p>
          </div>
          <MethodologyCallout />
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="bg-paper border-b border-subtle py-20 sm:py-28">
        <div className="mx-auto max-w-site px-5 sm:px-6">
          <div className="mx-auto max-w-2xl mb-12 text-center">
            <p className="type-label text-plum-600 mb-3">Pricing</p>
            <h2 className="font-display text-4xl font-semibold text-primary">
              Free for job seekers.
            </h2>
            <p className="type-lead mt-4 text-secondary">
              Basic lookups are always free. Pro adds unlimited searches, watchlist alerts, and full signal detail.
            </p>
          </div>

          <div className="mx-auto max-w-2xl grid gap-4 sm:grid-cols-2">
            {/* Free */}
            <div className="card p-8">
              <p className="type-label text-tertiary mb-3">Free</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="font-display text-5xl font-semibold text-primary">$0</span>
              </div>
              <ul className="space-y-2.5 mb-8">
                {PLAN_FEATURES.free.map((f) => (
                  <li key={f} className="flex items-start gap-2 type-small text-secondary">
                    <span className="text-sage-500 mt-px flex-shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="btn btn-secondary btn-md w-full justify-center">
                Start free
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-plum-700 rounded-xl p-8 border border-plum-600 shadow-card">
              <p className="type-label text-plum-300 mb-3">Pro</p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="font-display text-5xl font-semibold text-white">$12</span>
                <span className="type-small text-plum-300">/mo</span>
              </div>
              <p className="type-caption text-plum-400 mb-6">Billed annually · $15 month-to-month</p>
              <ul className="space-y-2.5 mb-8">
                {PLAN_FEATURES.pro.map((f) => (
                  <li key={f} className="flex items-start gap-2 type-small text-plum-200">
                    <span className="text-sage-400 mt-px flex-shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup?plan=pro"
                className="block w-full rounded-md bg-white px-4 py-2.5 text-center text-sm font-semibold text-plum-800 hover:bg-plum-50 transition-colors"
              >
                Start 14-day trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-warm-900 text-warm-400 py-12">
        <div className="mx-auto max-w-site px-5 sm:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <p className="font-sans text-sm font-semibold text-warm-200">JoinSafe</p>
              <p className="type-caption text-warm-600 mt-1">
                © {new Date().getFullYear()} · Built on public records · Not financial advice
              </p>
            </div>
            <nav className="flex flex-wrap gap-x-6 gap-y-2">
              {[
                { href: '/methodology', label: 'Methodology' },
                { href: '/design', label: 'Design System' },
                { href: '/privacy', label: 'Privacy' },
                { href: '/terms', label: 'Terms' },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="type-small text-warm-500 hover:text-warm-200 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </footer>
    </div>
  )
}
