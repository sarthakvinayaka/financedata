// JoinSafe Risk Engine — core scoring logic
//
// Architecture decisions:
//  - Pure functions: no I/O, no DB calls. The engine receives pre-fetched data
//    and returns a deterministic output. This makes the engine unit-testable
//    without mocking infrastructure.
//  - Weighted component model: each signal category contributes independently,
//    allowing transparent per-category breakdown in the UI.
//  - Transparent scoring: every point of the final score is traceable to a
//    specific signal with a human-readable description. This is core to the
//    product's trust-first positioning.
//
// Scoring scale: 0 (minimal risk) → 100 (severe risk)
// Tier thresholds: STABLE 0–20 | WATCH 21–40 | ELEVATED 41–60 | HIGH 61–80 | CRITICAL 81–100

import { computeWarnSignals } from './signals/warn-signal'
import { computeSecSignals } from './signals/sec-signal'
import { computeFinancialSignals } from './signals/financial-signal'
import {
  TIER_THRESHOLDS,
  type RiskEngineInput,
  type RiskEngineOutput,
  type RiskTier,
  type ComponentScore,
} from '../types'

// Component weights. Must sum to 1.0.
// WARN carries the most weight: it is legally filed, directly documents job loss,
// and is available for both public and private employers.
const WEIGHTS = {
  warn: 0.40,
  financial: 0.30,
  sec: 0.20,
  momentum: 0.10,
} as const satisfies Record<string, number>

export function scoreToTier(score: number): RiskTier {
  for (const [tier, range] of Object.entries(TIER_THRESHOLDS)) {
    if (score >= range.min && score <= range.max) {
      return tier as RiskTier
    }
  }
  return 'CRITICAL'
}

export function computeRiskScore(input: RiskEngineInput): RiskEngineOutput {
  const { company, warnNotices, secFilings, priorScore, now = new Date() } = input

  // ── Compute component scores ───────────────────────────────────────────────
  const warnResult = computeWarnSignals(warnNotices, company.employeeCount ?? null, now)
  const secResult = computeSecSignals(secFilings, now)
  const financialResult = computeFinancialSignals(secFilings)

  // ── Momentum: directional change from prior run ────────────────────────────
  // Captures trend signal: a score rising toward a tier boundary is more urgent
  // than a static score at the same level.
  let momentumScore = 50 // neutral
  if (priorScore !== undefined) {
    const currentRaw =
      warnResult.score * WEIGHTS.warn +
      secResult.score * WEIGHTS.sec +
      financialResult.score * WEIGHTS.financial
    const delta = currentRaw - priorScore
    momentumScore = Math.max(0, Math.min(100, 50 + delta * 2))
  }

  // ── Composite score ────────────────────────────────────────────────────────
  const rawScore =
    warnResult.score * WEIGHTS.warn +
    secResult.score * WEIGHTS.sec +
    financialResult.score * WEIGHTS.financial +
    momentumScore * WEIGHTS.momentum

  const score = Math.round(Math.max(0, Math.min(100, rawScore)))
  const tier = scoreToTier(score)

  // ── Confidence: fraction of signal categories with real data ──────────────
  // Confidence is surfaced in the UI so users understand the score's reliability.
  const hasWarn = true // WARN is always scanned across all employers
  const hasSec = company.isPublic && secFilings.length > 0
  const hasFinancial = secFilings.some(
    (f) => f.revenueYoYChange !== null && f.revenueYoYChange !== undefined,
  )

  const coverage = (hasWarn ? 0.4 : 0) + (hasSec ? 0.35 : 0) + (hasFinancial ? 0.25 : 0)
  const confidence = Math.round(Math.min(1, coverage) * 100) / 100

  const allSignals = [...warnResult.signals, ...secResult.signals, ...financialResult.signals]

  const components: RiskEngineOutput['components'] = {
    warn: buildComponent(warnResult.score, WEIGHTS.warn, warnResult.signals),
    sec: buildComponent(secResult.score, WEIGHTS.sec, secResult.signals),
    financial: buildComponent(financialResult.score, WEIGHTS.financial, financialResult.signals),
    momentum: buildComponent(momentumScore, WEIGHTS.momentum, []),
  }

  return {
    score,
    tier,
    components,
    signals: allSignals,
    confidence,
    dataAsOf: now,
  }
}

function buildComponent(
  score: number,
  weight: number,
  signals: RiskEngineOutput['signals'],
): ComponentScore {
  return { score: Math.round(score), weight, signals }
}
