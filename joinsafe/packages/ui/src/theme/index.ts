// @joinsafe/ui — Design tokens as JavaScript constants
//
// The canonical color values are in apps/web/src/app/globals.css (CSS variables).
// This file re-exports them as typed JS for use in SVG, Recharts, or any
// context that can't use CSS custom properties.

import type { RiskTier } from '@joinsafe/core'

// ── Risk tier palette ──────────────────────────────────────────────────────

export const RISK_COLORS = {
  STABLE: {
    base:     '#2E7638',  // sage-500
    light:    '#EEF5EF',  // sage-50
    border:   '#A4D1A9',  // sage-200
    text:     '#194421',  // sage-700
    dot:      '#44944F',  // sage-400
    chart:    '#6CB576',  // sage-300 — for chart lines
  },
  WATCH: {
    base:     '#A27610',  // harvest-500
    light:    '#FBF6E3',  // harvest-50
    border:   '#EDCE7E',  // harvest-200
    text:     '#5A4206',  // harvest-700
    dot:      '#C89416',  // harvest-400
    chart:    '#E0B13C',  // harvest-300
  },
  ELEVATED: {
    base:     '#C89416',  // harvest-400 (slightly warmer than WATCH)
    light:    '#FBF6E3',
    border:   '#E0B13C',
    text:     '#5A4206',
    dot:      '#E0B13C',
    chart:    '#E0B13C',
  },
  HIGH: {
    base:     '#9C425C',  // oxblood-400
    light:    '#F6EBEE',  // oxblood-50
    border:   '#D298A6',  // oxblood-200
    text:     '#481624',  // oxblood-700
    dot:      '#B8677E',  // oxblood-300
    chart:    '#B8677E',
  },
  CRITICAL: {
    base:     '#7E2840',  // oxblood-500
    light:    '#F6EBEE',
    border:   '#B8677E',  // oxblood-300
    text:     '#2E0E17',  // oxblood-800
    dot:      '#9C425C',  // oxblood-400
    chart:    '#9C425C',
  },
} as const satisfies Record<RiskTier, Record<string, string>>

// ── Risk tier Tailwind class maps ──────────────────────────────────────────
// Used in components that can't use the RISK_COLORS object directly.

export const RISK_TIER_CLASSES: Record<
  RiskTier,
  {
    badge:  string  // pill badge full class string
    banner: string  // banner background + border
    text:   string  // text color class
    dot:    string  // indicator dot class
    border: string  // standalone border class
  }
> = {
  STABLE: {
    badge:  'bg-sage-50 text-sage-700 border-sage-200',
    banner: 'bg-sage-50 border-sage-200',
    text:   'text-sage-600',
    dot:    'bg-sage-400',
    border: 'border-sage-300',
  },
  WATCH: {
    badge:  'bg-harvest-50 text-harvest-700 border-harvest-200',
    banner: 'bg-harvest-50 border-harvest-200',
    text:   'text-harvest-600',
    dot:    'bg-harvest-400',
    border: 'border-harvest-300',
  },
  ELEVATED: {
    badge:  'bg-harvest-100 text-harvest-700 border-harvest-300',
    banner: 'bg-harvest-50 border-harvest-300',
    text:   'text-harvest-600',
    dot:    'bg-harvest-500',
    border: 'border-harvest-400',
  },
  HIGH: {
    badge:  'bg-oxblood-50 text-oxblood-700 border-oxblood-200',
    banner: 'bg-oxblood-50 border-oxblood-200',
    text:   'text-oxblood-500',
    dot:    'bg-oxblood-300',
    border: 'border-oxblood-300',
  },
  CRITICAL: {
    badge:  'bg-oxblood-100 text-oxblood-800 border-oxblood-300',
    banner: 'bg-oxblood-50 border-oxblood-300',
    text:   'text-oxblood-500',
    dot:    'bg-oxblood-500',
    border: 'border-oxblood-400',
  },
}

// ── Source confidence palette ──────────────────────────────────────────────

export type SourceConfidence = 'REPORTED' | 'DERIVED' | 'ESTIMATED' | 'INFERRED' | 'UNKNOWN'

export const SOURCE_CONFIDENCE_CLASSES: Record<
  SourceConfidence,
  { chip: string; label: string; description: string }
> = {
  REPORTED: {
    chip: 'bg-sage-50 text-sage-700 border-sage-200',
    label: 'Reported',
    description: 'Directly stated in a primary source (filing, notice, or official record).',
  },
  DERIVED: {
    chip: 'bg-plum-50 text-plum-700 border-plum-200',
    label: 'Derived',
    description: 'Calculated from primary data using a documented formula.',
  },
  ESTIMATED: {
    chip: 'bg-harvest-50 text-harvest-700 border-harvest-200',
    label: 'Estimated',
    description: 'Approximated from partial data; margin of uncertainty applies.',
  },
  INFERRED: {
    chip: 'bg-mist-100 text-warm-700 border-mist-200',
    label: 'Inferred',
    description: 'Reasoned from indirect signals; lower confidence.',
  },
  UNKNOWN: {
    chip: 'bg-warm-100 text-warm-600 border-warm-200',
    label: 'Unknown',
    description: 'Data point could not be verified from available sources.',
  },
}

// ── Brand palette (for non-CSS contexts: Recharts, SVGs) ──────────────────

export const BRAND = {
  plum700:    '#421C60',
  plum600:    '#582880',
  plum500:    '#7136A2',
  plum100:    '#E5D4F0',
  plum50:     '#F5EEFA',
  ivory:      '#FAFAF7',
  stone200:   '#E8E4DC',
  stone500:   '#938B7E',
  stone800:   '#322C24',
  graphite:   '#1C1711',
} as const

export const SEVERITY_COLORS = {
  INFO:     { text: 'text-warm-500',    icon: '○' },
  LOW:      { text: 'text-sage-600',    icon: '↑' },
  MEDIUM:   { text: 'text-harvest-600', icon: '⚠' },
  HIGH:     { text: 'text-oxblood-400', icon: '▲' },
  CRITICAL: { text: 'text-oxblood-500', icon: '◆' },
} as const
