import type { RiskTier } from '@joinsafe/core'
import { RISK_TIER_LABELS, RISK_TIER_DESCRIPTIONS } from '@joinsafe/core'
import { RISK_TIER_CLASSES } from '../theme'
import { cn } from '../lib/utils'

interface RiskBadgeProps {
  tier: RiskTier
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showDot?: boolean
  showScore?: number
  className?: string
}

const SIZE_CLASSES = {
  xs: 'px-1.5 py-0.5 text-xxs gap-1',
  sm: 'px-2 py-0.5 text-xs gap-1.5',
  md: 'px-2.5 py-1 text-sm gap-1.5',
  lg: 'px-3 py-1.5 text-base gap-2',
}

const DOT_SIZE = {
  xs: 'h-1 w-1',
  sm: 'h-1.5 w-1.5',
  md: 'h-1.5 w-1.5',
  lg: 'h-2 w-2',
}

export function RiskBadge({
  tier,
  size = 'md',
  showDot = true,
  showScore,
  className,
}: RiskBadgeProps) {
  const classes = RISK_TIER_CLASSES[tier]

  return (
    <span
      role="status"
      title={RISK_TIER_DESCRIPTIONS[tier]}
      className={cn(
        'inline-flex items-center rounded-pill border font-sans font-medium tracking-wide',
        classes.badge,
        SIZE_CLASSES[size],
        className,
      )}
    >
      {showDot && (
        <span
          className={cn('rounded-full flex-shrink-0', classes.dot, DOT_SIZE[size])}
          aria-hidden="true"
        />
      )}
      {showScore !== undefined && (
        <span className="font-mono font-semibold tabular-nums mr-0.5">{Math.round(showScore)}</span>
      )}
      {RISK_TIER_LABELS[tier]}
    </span>
  )
}
