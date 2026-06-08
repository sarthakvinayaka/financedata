// MetricCard — premium stat display component
//
// Designed for dashboard-style data display: large tabular number,
// supporting label, optional trend indicator, and optional source chip.
// The number uses JetBrains Mono for precise, professional readability.

import { cn } from '../lib/utils'

interface MetricCardProps {
  label: string
  value: string | number
  subvalue?: string
  trend?: {
    direction: 'up' | 'down' | 'flat'
    label: string
    positive?: boolean  // true if "up" is good; false if "up" is bad (risk metrics)
  }
  note?: string
  icon?: React.ReactNode
  variant?: 'default' | 'subtle' | 'accent'
  className?: string
}

const TREND_CONFIG = {
  up: {
    icon: '↑',
    positive_class: 'text-sage-600',
    negative_class: 'text-oxblood-400',
  },
  down: {
    icon: '↓',
    positive_class: 'text-oxblood-400',
    negative_class: 'text-sage-600',
  },
  flat: {
    icon: '→',
    positive_class: 'text-warm-500',
    negative_class: 'text-warm-500',
  },
}

const VARIANT_CLASSES = {
  default: 'bg-surface border border-subtle shadow-surface',
  subtle:  'bg-subtle border border-subtle',
  accent:  'bg-plum-700 border border-plum-800 shadow-card',
}

const VARIANT_TEXT = {
  default: { label: 'text-tertiary', value: 'text-primary', subvalue: 'text-secondary' },
  subtle:  { label: 'text-tertiary', value: 'text-primary', subvalue: 'text-secondary' },
  accent:  { label: 'text-plum-300', value: 'text-white',   subvalue: 'text-plum-200'  },
}

export function MetricCard({
  label,
  value,
  subvalue,
  trend,
  note,
  icon,
  variant = 'default',
  className,
}: MetricCardProps) {
  const text = VARIANT_TEXT[variant]

  return (
    <div
      className={cn(
        'rounded-lg p-5 flex flex-col gap-3',
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {/* Label row */}
      <div className="flex items-center justify-between gap-2">
        <span className={cn('type-label', text.label)}>{label}</span>
        {icon && (
          <span className={cn('text-base opacity-60', text.subvalue)} aria-hidden="true">
            {icon}
          </span>
        )}
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-2">
        <span className={cn('font-mono text-3xl font-bold tabular-nums leading-none', text.value)}>
          {value}
        </span>
        {subvalue && (
          <span className={cn('font-sans text-sm font-normal', text.subvalue)}>{subvalue}</span>
        )}
      </div>

      {/* Trend + note */}
      {(trend ?? note) && (
        <div className="flex items-center justify-between gap-2 mt-auto">
          {trend && (() => {
            const cfg = TREND_CONFIG[trend.direction]
            const isPositive = trend.positive !== false
            const colorClass = trend.direction === 'flat'
              ? cfg.positive_class
              : isPositive ? cfg.positive_class : cfg.negative_class

            return (
              <span className={cn('inline-flex items-center gap-1 text-xs font-medium', colorClass)}>
                <span aria-hidden="true" className="text-[10px] font-bold">{cfg.icon}</span>
                {trend.label}
              </span>
            )
          })()}
          {note && <span className="text-xs text-tertiary">{note}</span>}
        </div>
      )}
    </div>
  )
}
