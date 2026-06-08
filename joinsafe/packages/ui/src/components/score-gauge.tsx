// Score gauge — displays a 0–100 risk score as an arc gauge.
// Uses SVG so it renders without a chart library dependency in shared UI.
// The arc is drawn using SVG path rather than circle stroke-dasharray
// for more precise control over the gauge sweep angle.

import type { RiskTier } from '@joinsafe/core'
import { RISK_TIER_LABELS } from '@joinsafe/core'
import { cn } from '../lib/utils'

interface ScoreGaugeProps {
  score: number
  tier: RiskTier
  size?: number
  className?: string
}

const TIER_STROKE: Record<RiskTier, string> = {
  STABLE: '#10b981',
  WATCH: '#f59e0b',
  ELEVATED: '#f97316',
  HIGH: '#ef4444',
  CRITICAL: '#991b1b',
}

export function ScoreGauge({ score, tier, size = 120, className }: ScoreGaugeProps) {
  const cx = size / 2
  const cy = size / 2
  const r = (size / 2) * 0.75
  const strokeWidth = size * 0.08

  // Gauge spans 210 degrees (from 165° to 375°, i.e., bottom-left to bottom-right)
  const startAngle = 165
  const sweepAngle = 210
  const endAngle = startAngle + sweepAngle * (score / 100)

  function polarToCartesian(angle: number) {
    const rad = ((angle - 90) * Math.PI) / 180
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    }
  }

  function describeArc(from: number, to: number) {
    const start = polarToCartesian(from)
    const end = polarToCartesian(to)
    const largeArc = to - from > 180 ? 1 : 0
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`
  }

  const trackPath = describeArc(startAngle, startAngle + sweepAngle)
  const scorePath = describeArc(startAngle, endAngle)
  const strokeColor = TIER_STROKE[tier]

  return (
    <div className={cn('relative inline-flex flex-col items-center', className)}>
      <svg width={size} height={size * 0.85} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {/* Track */}
        <path
          d={trackPath}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Score arc */}
        <path
          d={scorePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </svg>
      {/* Score label — positioned over the SVG */}
      <div
        className="absolute flex flex-col items-center"
        style={{ top: size * 0.28, left: '50%', transform: 'translateX(-50%)' }}
      >
        <span
          className="font-bold tabular-nums leading-none text-gray-900"
          style={{ fontSize: size * 0.22 }}
        >
          {score}
        </span>
        <span
          className="mt-0.5 font-medium leading-none text-gray-500"
          style={{ fontSize: size * 0.09 }}
        >
          {RISK_TIER_LABELS[tier]}
        </span>
      </div>
    </div>
  )
}
