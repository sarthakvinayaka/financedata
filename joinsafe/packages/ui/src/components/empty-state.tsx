// EmptyState — refined placeholder for empty data surfaces.
// Avoids the "sad state" anti-pattern: frames absence positively or neutrally.
// Uses a visual icon glyph (unicode or SVG) rather than illustration, keeping
// the aesthetic consistent with the rest of the product.

import { cn } from '../lib/utils'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'subtle' | 'dashed'
  className?: string
}

const SIZE_CLASSES = {
  sm: { wrap: 'py-8 px-4', icon: 'text-2xl mb-3', title: 'text-sm', desc: 'text-xs' },
  md: { wrap: 'py-12 px-6', icon: 'text-3xl mb-4', title: 'text-base', desc: 'text-sm' },
  lg: { wrap: 'py-20 px-8', icon: 'text-4xl mb-5', title: 'text-lg', desc: 'text-base' },
}

const VARIANT_CLASSES = {
  default: 'bg-surface border border-subtle rounded-lg',
  subtle:  'bg-subtle rounded-lg',
  dashed:  'bg-surface border border-dashed border-muted rounded-lg',
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  size = 'md',
  variant = 'dashed',
  className,
}: EmptyStateProps) {
  const s = SIZE_CLASSES[size]

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        VARIANT_CLASSES[variant],
        s.wrap,
        className,
      )}
    >
      {icon && (
        <div className={cn('text-tertiary opacity-40 select-none', s.icon)} aria-hidden="true">
          {icon}
        </div>
      )}

      <p className={cn('font-sans font-medium text-secondary', s.title)}>{title}</p>

      {description && (
        <p className={cn('text-tertiary mt-1.5 max-w-xs leading-relaxed text-balance', s.desc)}>
          {description}
        </p>
      )}

      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

// ── Preset empty states for common JoinSafe surfaces ──────────────────────

export function NoSearchResults({ query }: { query?: string }) {
  return (
    <EmptyState
      icon={<span>⊘</span>}
      title={query ? `No results for "${query}"` : 'No results'}
      description="Try a different company name, ticker symbol, or remove filters."
      size="md"
    />
  )
}

export function NoWarnHistory() {
  return (
    <EmptyState
      icon={<span>◎</span>}
      title="No WARN notices on record"
      description="No federal or state WARN Act filings found for this employer in our covered jurisdictions."
      size="sm"
      variant="subtle"
    />
  )
}

export function EmptyWatchlist() {
  return (
    <EmptyState
      icon={<span>◈</span>}
      title="Your watchlist is empty"
      description="Search for an employer and add it to your watchlist to track risk changes over time."
      size="lg"
      variant="dashed"
    />
  )
}
