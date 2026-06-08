// @joinsafe/core — canonical type definitions
//
// These types are the contract between:
//  - The risk engine (computation)
//  - The providers (data ingestion)
//  - The web app (presentation)
//  - The worker (orchestration)
//
// All zod schemas have a corresponding TypeScript type inferred from them.
// The DB layer uses Prisma-generated types; this package maps them to
// domain types that carry only what the engine needs.

import { z } from 'zod'

// ─── Risk Tiers ───────────────────────────────────────────────────────────────

export const RiskTierSchema = z.enum(['STABLE', 'WATCH', 'ELEVATED', 'HIGH', 'CRITICAL'])
export type RiskTier = z.infer<typeof RiskTierSchema>

export const RISK_TIER_LABELS: Record<RiskTier, string> = {
  STABLE: 'Stable',
  WATCH: 'Watch',
  ELEVATED: 'Elevated',
  HIGH: 'High Risk',
  CRITICAL: 'Critical',
}

export const RISK_TIER_DESCRIPTIONS: Record<RiskTier, string> = {
  STABLE: 'Low indicators of instability based on available public data.',
  WATCH: 'Minor signals worth monitoring. No immediate concern.',
  ELEVATED: 'Multiple risk indicators present. Warrants closer review.',
  HIGH: 'Significant instability signals. Proceed with caution.',
  CRITICAL: 'Severe and/or multiple concurrent risk indicators. High confidence of near-term instability.',
}

export const TIER_THRESHOLDS: Record<RiskTier, { min: number; max: number }> = {
  STABLE: { min: 0, max: 20 },
  WATCH: { min: 21, max: 40 },
  ELEVATED: { min: 41, max: 60 },
  HIGH: { min: 61, max: 80 },
  CRITICAL: { min: 81, max: 100 },
}

// ─── Risk Signals ─────────────────────────────────────────────────────────────

export const SignalSeveritySchema = z.enum(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
export type SignalSeverity = z.infer<typeof SignalSeveritySchema>

export const SignalCategorySchema = z.enum(['WARN', 'SEC', 'FINANCIAL', 'MOMENTUM'])
export type SignalCategory = z.infer<typeof SignalCategorySchema>

export const RiskSignalSchema = z.object({
  id: z.string(),
  category: SignalCategorySchema,
  severity: SignalSeveritySchema,
  title: z.string(),
  description: z.string(),
  value: z.union([z.number(), z.string()]).optional(),
  date: z.date().optional(),
  weight: z.number().min(0).max(1),
})
export type RiskSignal = z.infer<typeof RiskSignalSchema>

// ─── Component Scores ─────────────────────────────────────────────────────────

export const ComponentScoreSchema = z.object({
  score: z.number().min(0).max(100),
  weight: z.number().min(0).max(1),
  signals: z.array(RiskSignalSchema),
})
export type ComponentScore = z.infer<typeof ComponentScoreSchema>

// ─── Engine I/O ───────────────────────────────────────────────────────────────

export const WarnNoticeInputSchema = z.object({
  noticeDate: z.date(),
  layoffDate: z.date().nullable().optional(),
  affectedWorkers: z.number().int().positive(),
  noticeType: z.string(),
  isTemporary: z.boolean().default(false),
})
export type WarnNoticeInput = z.infer<typeof WarnNoticeInputSchema>

export const SecFilingInputSchema = z.object({
  formType: z.string(),
  filingDate: z.date(),
  periodOfReport: z.date().nullable().optional(),
  goingConcernOpinion: z.boolean().default(false),
  restatement: z.boolean().default(false),
  auditorChanged: z.boolean().default(false),
  ceoChanged: z.boolean().default(false),
  cfoChanged: z.boolean().default(false),
  revenueYoYChange: z.number().nullable().optional(),
  revenue: z.bigint().nullable().optional(),
  operatingCashFlow: z.bigint().nullable().optional(),
  cashAndEquivalents: z.bigint().nullable().optional(),
  totalDebt: z.bigint().nullable().optional(),
  reportedEmployees: z.number().int().nullable().optional(),
})
export type SecFilingInput = z.infer<typeof SecFilingInputSchema>

export const RiskEngineInputSchema = z.object({
  company: z.object({
    id: z.string(),
    isPublic: z.boolean(),
    employeeCount: z.number().int().positive().nullable().optional(),
  }),
  warnNotices: z.array(WarnNoticeInputSchema),
  secFilings: z.array(SecFilingInputSchema),
  priorScore: z.number().min(0).max(100).optional(),
  now: z.date().optional(),
})
export type RiskEngineInput = z.infer<typeof RiskEngineInputSchema>

export const RiskEngineOutputSchema = z.object({
  score: z.number().min(0).max(100),
  tier: RiskTierSchema,
  components: z.object({
    warn: ComponentScoreSchema,
    sec: ComponentScoreSchema,
    financial: ComponentScoreSchema,
    momentum: ComponentScoreSchema,
  }),
  signals: z.array(RiskSignalSchema),
  confidence: z.number().min(0).max(1),
  dataAsOf: z.date(),
})
export type RiskEngineOutput = z.infer<typeof RiskEngineOutputSchema>
