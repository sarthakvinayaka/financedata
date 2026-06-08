// Search Hero — the main value proposition section.
//
// Design intent:
//  - Large editorial heading in Cormorant Garamond — sets an intelligent,
//    non-hyperbolic tone. The serif says "this is serious data", not "this is a tool".
//  - Understated background: warm ivory with a barely-visible radial tint.
//    No gradient blobs, no abstract shapes, no noise textures.
//  - The search input is the hero's CTA — visually large, prominent,
//    but not garish. Focus ring is plum-colored.
//  - Supporting trust signals are typeset small and factual, not badges.

import { CompanySearchBar } from './company-search-bar'

interface SearchHeroProps {
  variant?: 'landing' | 'app'
}

const TRUST_SIGNALS = [
  'WARN Act data — 50 U.S. states',
  'SEC EDGAR filings',
  'Updated nightly',
]

export function SearchHero({ variant = 'landing' }: SearchHeroProps) {
  const isLanding = variant === 'landing'

  return (
    <section className="relative overflow-hidden bg-paper border-b border-subtle">
      {/* Subtle ambient tints — barely visible, adds depth without distraction */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            'radial-gradient(ellipse 60% 40% at 15% 90%, rgb(var(--plum-100) / 0.18) 0%, transparent 70%)',
            'radial-gradient(ellipse 50% 50% at 85% 10%, rgb(var(--sage-100) / 0.10) 0%, transparent 60%)',
          ].join(', '),
        }}
      />

      <div className="relative mx-auto max-w-site px-5 sm:px-6">
        <div
          className={
            isLanding
              ? 'flex flex-col items-center text-center py-20 sm:py-28 lg:py-36'
              : 'flex flex-col items-center text-center py-12 sm:py-16'
          }
        >
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 mb-6 sm:mb-8">
            <span className="h-px w-8 bg-plum-300" aria-hidden="true" />
            <span className="type-label text-plum-600">Employer Risk Intelligence</span>
            <span className="h-px w-8 bg-plum-300" aria-hidden="true" />
          </div>

          {/* Heading — Cormorant Garamond, editorial weight */}
          {isLanding ? (
            <h1 className="type-display font-display font-semibold text-primary text-balance max-w-3xl">
              Know the risk
              <br />
              <em className="not-italic text-plum-700">before</em> you sign.
            </h1>
          ) : (
            <h1 className="type-h2 font-display font-semibold text-primary">
              Search an employer
            </h1>
          )}

          {/* Subheading */}
          {isLanding && (
            <p className="type-lead mt-5 max-w-xl text-balance text-secondary">
              JoinSafe scores employer stability using WARN Act layoff filings, SEC
              disclosures, and financial indicators — sourced from public government
              records, updated nightly.
            </p>
          )}

          {/* Search bar */}
          <div className={isLanding ? 'mt-10 w-full max-w-xl' : 'mt-6 w-full max-w-xl'}>
            <CompanySearchBar size={isLanding ? 'lg' : 'md'} />
          </div>

          {/* Trust signals — typeset as a quiet horizontal list */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
            {TRUST_SIGNALS.map((signal, i) => (
              <span key={signal} className="flex items-center gap-1.5 type-caption text-faint">
                {i > 0 && <span aria-hidden="true" className="h-1 w-1 rounded-full bg-warm-300" />}
                {signal}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
