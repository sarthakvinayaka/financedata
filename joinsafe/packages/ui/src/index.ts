// @joinsafe/ui
//
// Shared UI components and design tokens consumed by apps/web.
// Components in this package are React Server Component-compatible by default.
// Client-only components (those using hooks or browser APIs) are marked with
// 'use client' at the top of the file.

export { RiskBadge } from './components/risk-badge'
export { ScoreGauge } from './components/score-gauge'
export * from './theme'
export { cn } from './lib/utils'
