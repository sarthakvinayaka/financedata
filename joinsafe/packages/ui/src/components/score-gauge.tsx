// ScoreGauge — SVG arc gauge for the risk score.
// Redesigned with the aubergine palette. The arc uses a subtle gradient from
// the tier's light color to its base, avoiding the neon-dial look.
// Sizes: sm (80), md (120), lg (160), xl (200)

import type { RiskTier } from '@joinsafe/core'
import { RISK_TIER_LABELS } from '@joinsafe/core'
import { RISK_COLORS } from '../theme'
import { cn } from '../lib/utils'

interface ScoreGaugeProps {
  score: number
  tier: RiskTier
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showLabel?: boolean
  className?: string
}

const SIZE_MAP = { sm: 80, md: 120, lg: 160, xl: 200 }

export function ScoreGauge({
  score,
  tier,
  size = 'md',
  showLabel = true,
  className,
}: ScoreGaugeProps) {
  const px = SIZE_MAP[size]
  const cx = px / 2
  const cy = px / 2
  const r = px * 0.38
  const sw = px * 0.075   // stroke width
  const gradId = `gauge-grad-${tier}`

  // Gauge arc: 220° sweep, starting bottom-left (200°), ending bottom-right (340°)
  const startAngle = 200
  const sweepTotal = 220
  const endAngle = startAngle + sweepTotal * Math.max(0, Math.min(1, score / 100))

  function polar(angle: number) {
    const rad = ((angle - 90) * Math.PI) / 180
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }

  function arc(from: number, to: number) {
    if (Math.abs(to - from) < 0.01) return ''
    const s = polar(from)
    const e = polar(to)
    const large = to - from > 180 ? 1 : 0
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`
  }

  const colors = RISK_COLORS[tier]
  const trackPath = arc(startAngle, startAngle + sweepTotal)
  const scorePath = arc(startAngle, endAngle)

  // Font sizes relative to gauge size
  const scoreFontSize = px * 0.195
  const labelFontSize = px * 0.085
  const scoreY = cy + px * 0.04
  const labelY = cy + px * 0.165

  return (
    <div className={cn('inline-flex flex-col items-center', className)}>
      <svg
        width={px}
        height={px * 0.84}
        viewBox={`0 0 ${px} ${px}`}
        aria-label={`Risk score: ${score} — ${RISK_TIER_LABELS[tier]}`}
        role="img"
      >
        <defs>
          <linearGradient id={gradId} gradientUnits="userSpaceOnUse"
            x1={polar(startAngle).x} y1={polar(startAngle).y}
            x2={polar(startAngle + sweepTotal).x} y2={polar(startAngle + sweepTotal).y}
          >
            <stop offset="0%" stopColor={colors.light} />
            <stop offset="100%" stopColor={colors.base} />
          </linearGradient>
        </defs>

        {/* Track */}
        <path
          d={trackPath}
          fill="none"
          stroke="var(--track-color, #E8E4DC)"
          strokeWidth={sw}
          strokeLinecap="round"
          className="opacity-60 dark:opacity-30"
          style={{ stroke: 'rgb(var(--stone-200, 232 228 220))' }}
        />

        {/* Score arc */}
        {score > 0 && (
          <path
            d={scorePath}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth={sw}
            strokeLinecap="round"
          />
        )}

        {/* Score number */}
        <text
          x={cx}
          y={scoreY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={scoreFontSize}
          fontWeight="700"
          fontFamily="var(--font-mono, ui-monospace)"
          fill={colors.text}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {Math.round(score)}
        </text>

        {/* Tier label */}
        {showLabel && (
          <text
            x={cx}
            y={labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={labelFontSize}
            fontWeight="500"
            fontFamily="var(--font-inter, system-ui)"
            fill={colors.base}
            letterSpacing="0.04em"
            style={{ textTransform: 'uppercase' }}
          >
            {RISK_TIER_LABELS[tier]}
          </text>
        )}
      </svg>
    </div>
  )
}
