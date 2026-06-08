// Design system tokens
//
// These map to Tailwind CSS classes and CSS custom properties defined in globals.css.
// The risk tier palette is central to the product's visual language:
// color communicates urgency without requiring the user to read the label.

import type { RiskTier } from '@joinsafe/core'

export const RISK_TIER_COLORS: Record<
  RiskTier,
  {
    bg: string
    border: string
    text: string
    badge: string
    dot: string
  }
> = {
  STABLE: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-800',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  WATCH: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
  },
  ELEVATED: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-800',
    badge: 'bg-orange-100 text-orange-800 border-orange-200',
    dot: 'bg-orange-500',
  },
  HIGH: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    badge: 'bg-red-100 text-red-800 border-red-200',
    dot: 'bg-red-500',
  },
  CRITICAL: {
    bg: 'bg-red-100',
    border: 'border-red-400',
    text: 'text-red-900',
    badge: 'bg-red-200 text-red-900 border-red-400',
    dot: 'bg-red-700',
  },
}

export const SEVERITY_COLORS = {
  INFO: 'text-gray-500',
  LOW: 'text-blue-600',
  MEDIUM: 'text-amber-600',
  HIGH: 'text-orange-600',
  CRITICAL: 'text-red-700',
} as const

export const SEVERITY_BG = {
  INFO: 'bg-gray-50 border-gray-200',
  LOW: 'bg-blue-50 border-blue-200',
  MEDIUM: 'bg-amber-50 border-amber-200',
  HIGH: 'bg-orange-50 border-orange-200',
  CRITICAL: 'bg-red-50 border-red-200',
} as const
