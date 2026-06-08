// @joinsafe/ui — Design system exports
//
// All components are React Server Component-compatible by default.
// 'use client' components are explicitly marked within their files.

// ── Components ────────────────────────────────────────────────────────────────
export { RiskBadge } from './components/risk-badge'
export { ScoreGauge } from './components/score-gauge'
export { SourceChip, SOURCE_CONFIDENCE_ORDER } from './components/source-chip'
export { Card, CardHeader, CardTitle, CardDescription, CardFooter } from './components/card'
export { MetricCard } from './components/metric-card'
export {
  Skeleton,
  SkeletonText,
  SkeletonMetricCard,
  SkeletonCompanyRow,
  SkeletonScoreCard,
  SkeletonSignalCard,
} from './components/skeleton'
export {
  EmptyState,
  NoSearchResults,
  NoWarnHistory,
  EmptyWatchlist,
} from './components/empty-state'
export {
  Banner,
  DataFreshnessBanner,
  PrivateCompanyBanner,
  LowConfidenceBanner,
} from './components/banner'

// ── Theme / tokens ────────────────────────────────────────────────────────────
export {
  RISK_COLORS,
  RISK_TIER_CLASSES,
  SOURCE_CONFIDENCE_CLASSES,
  SEVERITY_COLORS,
  BRAND,
} from './theme'
export type { SourceConfidence } from './theme'

// ── Utilities ─────────────────────────────────────────────────────────────────
export { cn } from './lib/utils'
