// @joinsafe/core — canonical domain types
//
// Two classification systems coexist intentionally:
//
//   RiskBand (LOW / MEDIUM / HIGH) — the DB-level enum.
//   Coarse, filter-friendly. Stored in RiskScore and RiskScoreHistory.
//
//   RiskTier (STABLE / WATCH / ELEVATED / HIGH / CRITICAL) — the display enum.
//   Five-step granularity for UI communication. Derived from the numeric score
//   at render time; never stored in the DB.
//
// This separation means we can update display granularity without migrations,
// and run DB queries against the simple 3-value band index efficiently.

import { z } from 'zod'

// ─── RiskBand — DB-level classification ──────────────────────────────────────

export const RiskBandSchema = z.enum(['LOW', 'MEDIUM', 'HIGH'])
export type RiskBand = z.infer<typeof RiskBandSchema>

export const BAND_THRESHOLDS: Record<RiskBand, { min: number; max: number }> = {
  LOW:    { min: 0,  max: 33 },
  MEDIUM: { min: 34, max: 66 },
  HIGH:   { min: 67, max: 100 },
}

export const BAND_LABELS: Record<RiskBand, string> = {
  LOW:    'Lower Risk',
  MEDIUM: 'Moderate Risk',
  HIGH:   'Higher Risk',
}

export function scoreToBand(score: number): RiskBand {
  if (score <= 33) return 'LOW'
  if (score <= 66) return 'MEDIUM'
  return 'HIGH'
}

// ─── RiskTier — UI display classification ────────────────────────────────────

export const RiskTierSchema = z.enum(['STABLE', 'WATCH', 'ELEVATED', 'HIGH', 'CRITICAL'])
export type RiskTier = z.infer<typeof RiskTierSchema>

export const TIER_THRESHOLDS: Record<RiskTier, { min: number; max: number }> = {
  STABLE:   { min: 0,  max: 20 },
  WATCH:    { min: 21, max: 40 },
  ELEVATED: { min: 41, max: 60 },
  HIGH:     { min: 61, max: 80 },
  CRITICAL: { min: 81, max: 100 },
}

export const RISK_TIER_LABELS: Record<RiskTier, string> = {
  STABLE:   'Stable',
  WATCH:    'Watch',
  ELEVATED: 'Elevated',
  HIGH:     'High Risk',
  CRITICAL: 'Critical',
}

export const RISK_TIER_DESCRIPTIONS: Record<RiskTier, string> = {
  STABLE:   'Low indicators of instability based on available public data.',
  WATCH:    'Minor signals worth monitoring. No immediate concern.',
  ELEVATED: 'Multiple risk indicators present. Warrants closer review.',
  HIGH:     'Significant instability signals. Proceed with caution.',
  CRITICAL: 'Severe and/or multiple concurrent risk indicators. High confidence of near-term instability.',
}

export function scoreToTier(score: number): RiskTier {
  if (score <= 20) return 'STABLE'
  if (score <= 40) return 'WATCH'
  if (score <= 60) return 'ELEVATED'
  if (score <= 80) return 'HIGH'
  return 'CRITICAL'
}

// ─── Layoff classification ────────────────────────────────────────────────────

export const LayoffReasonSchema = z.enum([
  'COST_CUTTING',
  'RESTRUCTURING',
  'DEMAND_SLOWDOWN',
  'POST_MERGER_INTEGRATION',
  'PRODUCT_SHIFT',
  'AI_SHIFT',
  'FACILITY_CLOSURE',
  'PROFITABILITY_PUSH',
  'FUNDING_PRESSURE',
  'UNKNOWN',
])
export type LayoffReason = z.infer<typeof LayoffReasonSchema>

export const LAYOFF_REASON_LABELS: Record<LayoffReason, string> = {
  COST_CUTTING:              'Cost Reduction',
  RESTRUCTURING:             'Restructuring',
  DEMAND_SLOWDOWN:           'Demand Slowdown',
  POST_MERGER_INTEGRATION:   'Post-Merger Integration',
  PRODUCT_SHIFT:             'Product Strategy Shift',
  AI_SHIFT:                  'AI / Automation Impact',
  FACILITY_CLOSURE:          'Facility Closure',
  PROFITABILITY_PUSH:        'Profitability Push',
  FUNDING_PRESSURE:          'Funding Pressure',
  UNKNOWN:                   'Reason Unspecified',
}

export const LayoffSourceTypeSchema = z.enum(['WARN', 'SEC_FILING', 'NEWSROOM', 'PRESS', 'MANUAL'])
export type LayoffSourceType = z.infer<typeof LayoffSourceTypeSchema>

export const ConfidenceLabelSchema = z.enum([
  'REPORTED', 'DERIVED', 'ESTIMATED', 'INFERRED', 'UNKNOWN',
])
export type ConfidenceLabel = z.infer<typeof ConfidenceLabelSchema>

// ─── Risk signals ─────────────────────────────────────────────────────────────

export const SignalSeveritySchema = z.enum(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
export type SignalSeverity = z.infer<typeof SignalSeveritySchema>

export const SignalCategorySchema = z.enum(['WARN', 'SEC', 'FINANCIAL', 'MOMENTUM'])
export type SignalCategory = z.infer<typeof SignalCategorySchema>

export const RiskSignalSchema = z.object({
  id:           z.string(),
  category:     SignalCategorySchema,
  severity:     SignalSeveritySchema,
  title:        z.string(),
  description:  z.string(),
  numericValue: z.number().optional(),
  textValue:    z.string().optional(),
  date:         z.date().optional(),
  weight:       z.number().min(0).max(1),
  contribution: z.number(),
})
export type RiskSignal = z.infer<typeof RiskSignalSchema>

// ─── Engine component scores ─────────────────────────────────────────────────

export const ComponentScoresSchema = z.object({
  layoffRecency:    z.number().min(0).max(100),
  layoffFrequency:  z.number().min(0).max(100),
  layoffSeverity:   z.number().min(0).max(100),
  financialWeakness: z.number().min(0).max(100),
  negativeSignals:  z.number().min(0).max(100),
  recoverySignals:  z.number().min(0).max(100),  // Higher = more recovery → reduces total
})
export type ComponentScores = z.infer<typeof ComponentScoresSchema>

// ─── Engine I/O ───────────────────────────────────────────────────────────────

export const LayoffEventInputSchema = z.object({
  announcedDate:     z.date(),
  effectiveDate:     z.date().nullable().optional(),
  employeesAffected: z.number().int().min(0).nullable().optional(),
  percentAffected:   z.number().min(0).max(1).nullable().optional(),
  sourceType:        LayoffSourceTypeSchema,
  reasonClassification: LayoffReasonSchema,
  confidenceLabel:   ConfidenceLabelSchema,
  isTemporary:       z.boolean().default(false),
})
export type LayoffEventInput = z.infer<typeof LayoffEventInputSchema>

export const FinancialReportInputSchema = z.object({
  formType:             z.string(),
  filingDate:           z.date(),
  periodEndDate:        z.date().nullable().optional(),
  goingConcernOpinion:  z.boolean().default(false),
  restatement:          z.boolean().default(false),
  auditorChanged:       z.boolean().default(false),
  ceoChanged:           z.boolean().default(false),
  cfoChanged:           z.boolean().default(false),
  // Key metrics extracted from FinancialMetric rows
  revenue:              z.number().nullable().optional(),        // USD
  revenueYoYChange:     z.number().nullable().optional(),        // Fractional
  operatingCashFlow:    z.number().nullable().optional(),        // USD
  cashAndEquivalents:   z.number().nullable().optional(),        // USD
  totalDebt:            z.number().nullable().optional(),        // USD
  totalAssets:          z.number().nullable().optional(),        // USD
  reportedEmployees:    z.number().int().nullable().optional(),
})
export type FinancialReportInput = z.infer<typeof FinancialReportInputSchema>

export const RiskEngineInputSchema = z.object({
  company: z.object({
    id:            z.string(),
    companyType:   z.enum(['PUBLIC', 'PRIVATE']),
    employeeCount: z.number().int().positive().nullable().optional(),
  }),
  layoffEvents:     z.array(LayoffEventInputSchema),
  financialReports: z.array(FinancialReportInputSchema),
  priorScore:       z.number().min(0).max(100).optional(),
  now:              z.date().optional(),
})
export type RiskEngineInput = z.infer<typeof RiskEngineInputSchema>

export const RiskEngineOutputSchema = z.object({
  score:       z.number().min(0).max(100),
  band:        RiskBandSchema,
  tier:        RiskTierSchema,  // Derived for UI; not stored in DB
  components:  ComponentScoresSchema,
  signals:     z.array(RiskSignalSchema),
  confidence:  z.number().min(0).max(1),
  dataAsOf:    z.date(),
})
export type RiskEngineOutput = z.infer<typeof RiskEngineOutputSchema>
