// Methodology callout — editorial block that explains the scoring approach.
//
// Surfaces at the bottom of company pages and on the methodology page.
// Visual language: editorial, restrained. No icons-heavy grids. Prose-first.
// The scoring breakdown uses a horizontal bar chart made of CSS, not a library,
// for zero-dependency performance and full design control.

import Link from 'next/link'

interface ComponentWeight {
  key: string
  label: string
  weight: number       // 0–1 fraction
  description: string
  source: string
}

const COMPONENTS: ComponentWeight[] = [
  {
    key: 'warn',
    label: 'WARN Filings',
    weight: 0.40,
    description: 'Federal and state advance notice of mass layoffs. The highest-fidelity direct signal of workforce instability.',
    source: 'State labor agency databases',
  },
  {
    key: 'financial',
    label: 'Financial Health',
    weight: 0.30,
    description: 'Cash runway, revenue trajectory, debt burden, and operating cash flow from SEC XBRL financial data.',
    source: 'SEC EDGAR XBRL inline data',
  },
  {
    key: 'sec',
    label: 'SEC Disclosures',
    weight: 0.20,
    description: 'Going concern opinions, restatements, auditor changes, and executive departures from annual and quarterly filings.',
    source: 'SEC EDGAR 10-K / 10-Q / 8-K',
  },
  {
    key: 'momentum',
    label: 'Risk Momentum',
    weight: 0.10,
    description: 'Directional score change from the previous scoring period. Rising scores approaching tier boundaries are weighted higher.',
    source: 'JoinSafe historical scores',
  },
]

interface MethodologyCalloutProps {
  compact?: boolean
  className?: string
}

export function MethodologyCallout({ compact, className }: MethodologyCalloutProps) {
  if (compact) {
    return (
      <aside className={`rounded-lg bg-subtle border border-subtle px-5 py-4 ${className ?? ''}`}>
        <p className="type-label text-tertiary mb-2">Score methodology</p>
        <p className="text-sm text-secondary leading-relaxed">
          Scores combine WARN Act filings (40%), financial health (30%), SEC disclosures (20%),
          and risk momentum (10%). All data is public record.{' '}
          <Link href="/methodology" className="text-plum-600 hover:underline underline-offset-2">
            Full methodology →
          </Link>
        </p>
      </aside>
    )
  }

  return (
    <section className={`bg-surface border border-subtle rounded-xl overflow-hidden ${className ?? ''}`}>
      {/* Header */}
      <div className="px-6 py-5 border-b border-subtle bg-subtle">
        <p className="type-label text-tertiary mb-1">Transparency</p>
        <h2 className="font-display text-2xl font-semibold text-primary">
          How the score is calculated
        </h2>
        <p className="type-small text-secondary mt-1.5 max-w-2xl">
          Every point of the risk score is traceable to a specific government data source.
          Weights are fixed and disclosed — we do not tune them per-company.
        </p>
      </div>

      {/* Component breakdown */}
      <div className="divide-y divide-subtle">
        {COMPONENTS.map((c) => (
          <div key={c.key} className="px-6 py-5">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="font-sans text-sm font-semibold text-primary">{c.label}</span>
                  <span className="font-mono text-xs text-plum-600 font-semibold">
                    {Math.round(c.weight * 100)}%
                  </span>
                </div>

                {/* Weight bar */}
                <div className="h-1 w-full bg-warm-200 rounded-pill mb-3 overflow-hidden">
                  <div
                    className="h-full bg-plum-600 rounded-pill"
                    style={{ width: `${c.weight * 100}%` }}
                  />
                </div>

                <p className="type-small text-secondary leading-relaxed">{c.description}</p>
              </div>

              <div className="flex-shrink-0 text-right hidden sm:block">
                <p className="type-caption text-faint uppercase tracking-wide">Source</p>
                <p className="text-xs text-tertiary mt-0.5 max-w-[160px]">{c.source}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-subtle border-t border-subtle">
        <p className="type-caption text-faint">
          Scores range 0–100. Tiers:{' '}
          {[
            { label: 'Stable', range: '0–20' },
            { label: 'Watch', range: '21–40' },
            { label: 'Elevated', range: '41–60' },
            { label: 'High', range: '61–80' },
            { label: 'Critical', range: '81–100' },
          ].map((t, i) => (
            <span key={t.label}>
              {i > 0 && <span className="mx-1.5 opacity-40">·</span>}
              <strong className="font-medium text-secondary">{t.label}</strong>{' '}
              <span className="font-mono">{t.range}</span>
            </span>
          ))}
          .{' '}
          <Link href="/methodology" className="text-plum-600 hover:underline underline-offset-2">
            Full methodology →
          </Link>
        </p>
      </div>
    </section>
  )
}
