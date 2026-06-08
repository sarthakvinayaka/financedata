// Banner — inline contextual messages.
// These are NOT alert dialogs or toasts. They sit within the document flow
// to provide persistent, non-intrusive context (e.g., data freshness warnings,
// confidence caveats, methodology disclosures).
//
// Design principle: these should not feel alarming. Use them for information,
// not crisis signalling. The CRITICAL variant is reserved for genuine data
// quality warnings — not risk level.

import { cn } from '../lib/utils'

type BannerVariant = 'info' | 'success' | 'warning' | 'caveat' | 'critical'

interface BannerProps {
  variant?: BannerVariant
  icon?: React.ReactNode
  title?: string
  children: React.ReactNode
  className?: string
  compact?: boolean
}

const VARIANT_CLASSES: Record<BannerVariant, { wrap: string; icon: string; title: string }> = {
  info: {
    wrap:  'bg-plum-50 border border-plum-100',
    icon:  'text-plum-500',
    title: 'text-plum-800',
  },
  success: {
    wrap:  'bg-sage-50 border border-sage-100',
    icon:  'text-sage-500',
    title: 'text-sage-800',
  },
  warning: {
    wrap:  'bg-harvest-50 border border-harvest-100',
    icon:  'text-harvest-600',
    title: 'text-harvest-800',
  },
  caveat: {
    wrap:  'bg-warm-100 border border-warm-200',
    icon:  'text-warm-500',
    title: 'text-warm-800',
  },
  critical: {
    wrap:  'bg-oxblood-50 border border-oxblood-100',
    icon:  'text-oxblood-400',
    title: 'text-oxblood-700',
  },
}

const DEFAULT_ICONS: Record<BannerVariant, string> = {
  info:     'ℹ',
  success:  '◉',
  warning:  '◎',
  caveat:   '◌',
  critical: '○',
}

export function Banner({ variant = 'info', icon, title, children, className, compact }: BannerProps) {
  const classes = VARIANT_CLASSES[variant]

  return (
    <div
      role="note"
      className={cn(
        'rounded-lg flex gap-3',
        compact ? 'p-3' : 'p-4',
        classes.wrap,
        className,
      )}
    >
      <span
        className={cn('flex-shrink-0 text-sm leading-5 mt-px', classes.icon)}
        aria-hidden="true"
      >
        {icon ?? DEFAULT_ICONS[variant]}
      </span>

      <div className="min-w-0 flex-1">
        {title && (
          <p className={cn('text-sm font-semibold mb-0.5', classes.title)}>{title}</p>
        )}
        <div className="text-sm text-secondary leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

// ── Preset banners for common JoinSafe contexts ───────────────────────────

export function DataFreshnessBanner({ dataAsOf }: { dataAsOf: Date }) {
  const daysAgo = Math.floor((Date.now() - dataAsOf.getTime()) / (1000 * 60 * 60 * 24))

  if (daysAgo <= 1) return null

  return (
    <Banner variant="caveat" compact>
      This score was last updated{' '}
      <strong className="font-medium text-primary">{daysAgo} days ago.</strong>{' '}
      Data is refreshed nightly from public sources.
    </Banner>
  )
}

export function PrivateCompanyBanner() {
  return (
    <Banner variant="info" title="Private company">
      SEC financial signals are unavailable for private companies. This score is based
      on WARN Act filings only — confidence is lower than for publicly traded employers.
    </Banner>
  )
}

export function LowConfidenceBanner({ confidence }: { confidence: number }) {
  return (
    <Banner variant="warning" title={`${Math.round(confidence * 100)}% data confidence`}>
      Limited public data is available for this employer. The score reflects available
      records but may not capture the full picture. Treat it as a starting point.
    </Banner>
  )
}
