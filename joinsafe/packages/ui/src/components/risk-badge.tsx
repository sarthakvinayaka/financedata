import type { RiskTier } from '@joinsafe/core'
import { RISK_TIER_LABELS, RISK_TIER_DESCRIPTIONS } from '@joinsafe/core'
import { RISK_TIER_COLORS } from '../theme'
import { cn } from '../lib/utils'

interface RiskBadgeProps {
  tier: RiskTier
  size?: 'sm' | 'md' | 'lg'
  showDot?: boolean
  className?: string
}

const SIZE_CLASSES = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
}

export function RiskBadge({ tier, size = 'md', showDot = true, className }: RiskBadgeProps) {
  const colors = RISK_TIER_COLORS[tier]

  return (
    <span
      title={RISK_TIER_DESCRIPTIONS[tier]}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        colors.badge,
        SIZE_CLASSES[size],
        className,
      )}
    >
      {showDot && (
        <span className={cn('h-1.5 w-1.5 rounded-full', colors.dot)} aria-hidden="true" />
      )}
      {RISK_TIER_LABELS[tier]}
    </span>
  )
}
