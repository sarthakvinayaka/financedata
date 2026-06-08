// JoinSafe Risk Engine v2
//
// Input:  LayoffEventInput[] + FinancialReportInput[] + company metadata
// Output: composite score, band, tier, per-component scores, ranked signals
//
// Component model (weights sum to 1.0):
//
//   Layoff Recency    0.25  — How recent is the most recent layoff event?
//   Layoff Frequency  0.15  — How many events in the trailing 24 months?
//   Layoff Severity   0.20  — Affected employees as % of reported headcount
//   Financial Weakness 0.25 — Cash runway, revenue decline, leverage
//   Negative Signals  0.10  — Going concern, restatements, auditor/exec churn
//   Recovery Signals −0.05  — Positive counterbalancing indicators (reduces score)
//
// The negative weight on recoverySignals intentionally reduces the total score
// when positive evidence is present — this is the "recovery" mechanic.

import {
  scoreToBand,
  scoreToTier,
  type RiskEngineInput,
  type RiskEngineOutput,
  type RiskSignal,
  type ComponentScores,
} from '../types'

// ─── Component weights ────────────────────────────────────────────────────────
// Weights for the positive components must sum to < 1.0 to leave room for the
// recovery credit. |RECOVERY_WEIGHT| reduces from the positive total.

const W = {
  recency:   0.25,
  frequency: 0.15,
  severity:  0.20,
  financial: 0.25,
  negative:  0.10,
  recovery:  0.05,  // Applied as a negative — see composite calculation
} as const

const MS_6M  = 180 * 24 * 60 * 60 * 1000
const MS_12M = 365 * 24 * 60 * 60 * 1000
const MS_24M = 2 * MS_12M

export function computeRiskScore(input: RiskEngineInput): RiskEngineOutput {
  const { company, layoffEvents, financialReports, priorScore, now = new Date() } = input
  const signals: RiskSignal[] = []

  // ── Component: Layoff Recency ─────────────────────────────────────────────
  const recency = computeRecency(layoffEvents, now, signals)

  // ── Component: Layoff Frequency ───────────────────────────────────────────
  const frequency = computeFrequency(layoffEvents, now, signals)

  // ── Component: Layoff Severity ────────────────────────────────────────────
  const severity = computeSeverity(layoffEvents, company.employeeCount ?? null, now, signals)

  // ── Component: Financial Weakness ─────────────────────────────────────────
  const financial = computeFinancial(financialReports, signals)

  // ── Component: Negative Signals ───────────────────────────────────────────
  const negative = computeNegativeSignals(financialReports, signals)

  // ── Component: Recovery Signals ───────────────────────────────────────────
  const recovery = computeRecoverySignals(layoffEvents, financialReports, priorScore, signals)

  // ── Composite score ───────────────────────────────────────────────────────
  const rawScore =
    recency   * W.recency   +
    frequency * W.frequency +
    severity  * W.severity  +
    financial * W.financial +
    negative  * W.negative  -
    recovery  * W.recovery

  const score = Math.round(Math.max(0, Math.min(100, rawScore)))
  const band  = scoreToBand(score)
  const tier  = scoreToTier(score)

  // ── Confidence ────────────────────────────────────────────────────────────
  const hasLayoffData  = layoffEvents.length > 0 || true  // We always scan WARN
  const hasFinancial   = company.companyType === 'PUBLIC' && financialReports.length > 0
  const hasSizingData  = company.employeeCount != null

  const coverage =
    (hasLayoffData  ? 0.40 : 0) +
    (hasFinancial   ? 0.40 : 0) +
    (hasSizingData  ? 0.20 : 0)

  const confidence = Math.round(Math.min(1, coverage) * 100) / 100

  // ── Attach contributions to signals ──────────────────────────────────────
  // Signals were built inside each compute function with weight relative to
  // their category. Multiply by the category weight to get actual contribution.
  const finalSignals = signals.map((s) => ({
    ...s,
    contribution: computeContribution(s, { recency, frequency, severity, financial, negative, recovery }),
  }))

  const components: ComponentScores = {
    layoffRecency:    Math.round(recency),
    layoffFrequency:  Math.round(frequency),
    layoffSeverity:   Math.round(severity),
    financialWeakness: Math.round(financial),
    negativeSignals:  Math.round(negative),
    recoverySignals:  Math.round(recovery),
  }

  return {
    score,
    band,
    tier,
    components,
    signals: finalSignals,
    confidence,
    dataAsOf: now,
  }
}

// ─── Component sub-functions ──────────────────────────────────────────────────

function computeRecency(
  events: RiskEngineInput['layoffEvents'],
  now: Date,
  signals: RiskSignal[],
): number {
  if (events.length === 0) return 0

  const nowMs = now.getTime()
  const events6m  = events.filter((e) => e.announcedDate.getTime() > nowMs - MS_6M)
  const events12m = events.filter((e) => e.announcedDate.getTime() > nowMs - MS_12M)

  if (events6m.length > 0) {
    const score = Math.min(100, 60 + events6m.length * 15)
    signals.push({
      id: 'layoff_recency_6m',
      category: 'WARN',
      severity: events6m.length >= 2 ? 'CRITICAL' : 'HIGH',
      title: `${events6m.length} layoff event${events6m.length > 1 ? 's' : ''} in the last 6 months`,
      description: `${events6m.length} layoff event${events6m.length > 1 ? 's were' : ' was'} announced in the last 6 months. Recent events carry the highest recency weight.`,
      numericValue: events6m.length,
      weight: 0.8,
      contribution: 0,  // Filled in later
    })
    return score
  }

  if (events12m.length > 0) {
    const score = Math.min(100, 35 + events12m.length * 10)
    signals.push({
      id: 'layoff_recency_12m',
      category: 'WARN',
      severity: 'MEDIUM',
      title: `${events12m.length} layoff event${events12m.length > 1 ? 's' : ''} in the last 12 months`,
      description: `Layoff events filed in the past year indicate ongoing workforce reduction activity.`,
      numericValue: events12m.length,
      weight: 0.6,
      contribution: 0,
    })
    return score
  }

  return 0
}

function computeFrequency(
  events: RiskEngineInput['layoffEvents'],
  now: Date,
  signals: RiskSignal[],
): number {
  if (events.length === 0) return 0

  const nowMs = now.getTime()
  const events24m = events.filter((e) => e.announcedDate.getTime() > nowMs - MS_24M)

  if (events24m.length === 0) return 0

  const score = Math.min(100, (events24m.length / 4) * 100)

  if (events24m.length >= 3) {
    signals.push({
      id: 'layoff_frequency_high',
      category: 'WARN',
      severity: 'HIGH',
      title: `${events24m.length} layoff events in 24 months`,
      description: `${events24m.length} separate layoff events in two years suggests a sustained pattern of workforce reduction, not a single correction.`,
      numericValue: events24m.length,
      weight: 0.8,
      contribution: 0,
    })
  } else if (events24m.length >= 2) {
    signals.push({
      id: 'layoff_frequency_medium',
      category: 'WARN',
      severity: 'MEDIUM',
      title: `${events24m.length} layoff events in 24 months`,
      description: `Repeated layoff events suggest ongoing restructuring rather than an isolated workforce adjustment.`,
      numericValue: events24m.length,
      weight: 0.5,
      contribution: 0,
    })
  }

  return score
}

function computeSeverity(
  events: RiskEngineInput['layoffEvents'],
  employeeCount: number | null,
  now: Date,
  signals: RiskSignal[],
): number {
  if (events.length === 0) return 0

  const nowMs = now.getTime()
  const events12m = events.filter((e) => e.announcedDate.getTime() > nowMs - MS_12M)
  if (events12m.length === 0) return 0

  // Prefer percentAffected (already a ratio) over employeesAffected
  const pcts = events12m
    .map((e) => {
      if (e.percentAffected != null) return e.percentAffected
      if (e.employeesAffected != null && employeeCount && employeeCount > 0)
        return e.employeesAffected / employeeCount
      return null
    })
    .filter((v): v is number => v !== null)

  const totalAffected = events12m.reduce((s, e) => s + (e.employeesAffected ?? 0), 0)
  const maxPct = pcts.length > 0 ? Math.max(...pcts) : null

  if (maxPct !== null && maxPct > 0.01) {
    const score = Math.min(100, maxPct * 350)
    const severity = maxPct >= 0.2 ? 'CRITICAL' : maxPct >= 0.08 ? 'HIGH' : 'MEDIUM'

    signals.push({
      id: 'layoff_severity_pct',
      category: 'WARN',
      severity,
      title: `Up to ${(maxPct * 100).toFixed(1)}% of workforce affected`,
      description: `Layoff events in the last 12 months affected up to ${(maxPct * 100).toFixed(1)}% of the employer's reported workforce, representing ${totalAffected.toLocaleString()} employees.`,
      numericValue: Math.round(maxPct * 1000) / 1000,
      weight: 0.7,
      contribution: 0,
    })
    return score
  }

  // Fallback: absolute headcount when ratio isn't available
  if (totalAffected > 500) {
    const score = Math.min(60, (totalAffected / 5000) * 100)
    signals.push({
      id: 'layoff_severity_absolute',
      category: 'WARN',
      severity: totalAffected >= 2000 ? 'HIGH' : 'MEDIUM',
      title: `${totalAffected.toLocaleString()} employees affected in 12 months`,
      description: `Absolute headcount impact is significant. Workforce percentage could not be calculated — employee count not reported.`,
      numericValue: totalAffected,
      weight: 0.4,
      contribution: 0,
    })
    return score
  }

  return 0
}

function computeFinancial(
  reports: RiskEngineInput['financialReports'],
  signals: RiskSignal[],
): number {
  const annuals = reports
    .filter((r) => r.formType === '10-K')
    .sort((a, b) => b.filingDate.getTime() - a.filingDate.getTime())

  if (annuals.length === 0) return 0

  const latest = annuals[0]!
  let score = 0

  // ── Cash runway ──────────────────────────────────────────────────────────
  if (
    latest.cashAndEquivalents != null &&
    latest.operatingCashFlow != null &&
    latest.operatingCashFlow < 0
  ) {
    const annualBurn = Math.abs(latest.operatingCashFlow)
    const runwayMonths = (latest.cashAndEquivalents / annualBurn) * 12

    if (runwayMonths < 12) {
      score = Math.max(score, 85)
      signals.push({
        id: 'fin_cash_runway_critical',
        category: 'FINANCIAL',
        severity: 'CRITICAL',
        title: `~${Math.floor(runwayMonths)} months cash runway`,
        description: 'At current operating burn rate, the company has less than 12 months of cash. This constrains hiring, elevates insolvency risk, and typically forces near-term cost reductions.',
        numericValue: Math.round(runwayMonths * 10) / 10,
        weight: 0.35,
        contribution: 0,
      })
    } else if (runwayMonths < 24) {
      score = Math.max(score, 55)
      signals.push({
        id: 'fin_cash_runway_limited',
        category: 'FINANCIAL',
        severity: 'HIGH',
        title: `~${Math.floor(runwayMonths)} months cash runway`,
        description: 'Under 24 months of runway typically triggers management action — fundraising, cuts, or both — within the next few quarters.',
        numericValue: Math.round(runwayMonths * 10) / 10,
        weight: 0.35,
        contribution: 0,
      })
    }
  }

  // ── Revenue decline ───────────────────────────────────────────────────────
  if (latest.revenueYoYChange != null) {
    const pct = latest.revenueYoYChange

    if (pct <= -0.25) {
      score = Math.max(score, 75)
      signals.push({
        id: 'fin_revenue_decline_severe',
        category: 'FINANCIAL',
        severity: 'HIGH',
        title: `Revenue declined ${Math.abs(pct * 100).toFixed(0)}% YoY`,
        description: 'A severe revenue contraction typically triggers cost restructuring within one to two reporting periods.',
        numericValue: Math.round(pct * 1000) / 1000,
        weight: 0.30,
        contribution: 0,
      })
    } else if (pct <= -0.10) {
      score = Math.max(score, 42)
      signals.push({
        id: 'fin_revenue_decline',
        category: 'FINANCIAL',
        severity: 'MEDIUM',
        title: `Revenue declined ${Math.abs(pct * 100).toFixed(0)}% YoY`,
        description: 'A double-digit revenue decline pressures operating expense ratios and often precedes headcount reductions.',
        numericValue: Math.round(pct * 1000) / 1000,
        weight: 0.30,
        contribution: 0,
      })
    }
  }

  // ── Leverage ──────────────────────────────────────────────────────────────
  if (latest.totalDebt != null && latest.totalAssets != null && latest.totalAssets > 0) {
    const ratio = latest.totalDebt / latest.totalAssets

    if (ratio > 0.8) {
      score = Math.max(score, 62)
      signals.push({
        id: 'fin_leverage_high',
        category: 'FINANCIAL',
        severity: 'HIGH',
        title: `Debt-to-assets: ${(ratio * 100).toFixed(0)}%`,
        description: 'A debt-to-assets ratio above 80% severely limits financial flexibility and raises refinancing risk.',
        numericValue: Math.round(ratio * 1000) / 1000,
        weight: 0.20,
        contribution: 0,
      })
    } else if (ratio > 0.6) {
      score = Math.max(score, 35)
      signals.push({
        id: 'fin_leverage_elevated',
        category: 'FINANCIAL',
        severity: 'MEDIUM',
        title: `Debt-to-assets: ${(ratio * 100).toFixed(0)}%`,
        description: 'Elevated leverage increases exposure to rising interest costs and constrains operational flexibility.',
        numericValue: Math.round(ratio * 1000) / 1000,
        weight: 0.20,
        contribution: 0,
      })
    }
  }

  return Math.min(100, score)
}

function computeNegativeSignals(
  reports: RiskEngineInput['financialReports'],
  signals: RiskSignal[],
): number {
  if (reports.length === 0) return 0

  let score = 0

  const annuals = reports
    .filter((r) => r.formType === '10-K')
    .sort((a, b) => b.filingDate.getTime() - a.filingDate.getTime())

  const latest = annuals[0]

  if (latest?.goingConcernOpinion) {
    score = Math.max(score, 95)
    signals.push({
      id: 'sec_going_concern',
      category: 'SEC',
      severity: 'CRITICAL',
      title: 'Going concern qualification issued',
      description: "The company's auditor has issued a going concern paragraph, indicating substantial doubt about the company's ability to continue operating. This is the most severe single signal available in public records.",
      weight: 0.60,
      contribution: 0,
    })
  }

  const restatements = reports.filter((r) => r.restatement)
  if (restatements.length > 0) {
    score = Math.max(score, 55)
    signals.push({
      id: 'sec_restatement',
      category: 'SEC',
      severity: 'HIGH',
      title: `${restatements.length} financial restatement${restatements.length > 1 ? 's' : ''}`,
      description: 'Financial restatements indicate material errors in prior reporting and often precede increased regulatory scrutiny.',
      numericValue: restatements.length,
      weight: 0.20,
      contribution: 0,
    })
  }

  if (reports.some((r) => r.auditorChanged)) {
    score = Math.max(score, 35)
    signals.push({
      id: 'sec_auditor_change',
      category: 'SEC',
      severity: 'MEDIUM',
      title: 'Auditor change reported',
      description: 'Mid-engagement auditor changes can indicate disagreements over accounting treatments or reporting scope.',
      weight: 0.10,
      contribution: 0,
    })
  }

  const execChanges = reports.filter((r) => r.ceoChanged || r.cfoChanged)
  if (execChanges.length > 0) {
    const hasCeo = execChanges.some((r) => r.ceoChanged)
    const hasCfo = execChanges.some((r) => r.cfoChanged)
    score = Math.max(score, 28)
    signals.push({
      id: 'sec_exec_turnover',
      category: 'SEC',
      severity: 'LOW',
      title: `${[hasCeo && 'CEO', hasCfo && 'CFO'].filter(Boolean).join(' and ')} departure reported`,
      description: 'C-suite departures are a documented leading indicator of near-term restructuring.',
      weight: 0.10,
      contribution: 0,
    })
  }

  return Math.min(100, score)
}

function computeRecoverySignals(
  layoffEvents: RiskEngineInput['layoffEvents'],
  financialReports: RiskEngineInput['financialReports'],
  priorScore: number | undefined,
  signals: RiskSignal[],
): number {
  let recoveryScore = 0

  // Revenue growth is a recovery signal
  const annuals = financialReports
    .filter((r) => r.formType === '10-K')
    .sort((a, b) => b.filingDate.getTime() - a.filingDate.getTime())

  const latest = annuals[0]
  if (latest?.revenueYoYChange != null && latest.revenueYoYChange > 0.10) {
    recoveryScore = Math.max(recoveryScore, 50)
    signals.push({
      id: 'recovery_revenue_growth',
      category: 'MOMENTUM',
      severity: 'INFO',
      title: `Revenue grew ${(latest.revenueYoYChange * 100).toFixed(0)}% YoY`,
      description: 'Positive revenue growth partially offsets other risk signals — a growing top line reduces pressure on headcount.',
      numericValue: Math.round(latest.revenueYoYChange * 1000) / 1000,
      weight: 0.5,
      contribution: 0,
    })
  }

  // Score improvement vs prior period
  if (priorScore !== undefined) {
    const improvement = priorScore - (recoveryScore * W.recovery)
    if (improvement > 10) {
      recoveryScore = Math.max(recoveryScore, 30)
      signals.push({
        id: 'recovery_score_improving',
        category: 'MOMENTUM',
        severity: 'INFO',
        title: 'Risk score improving vs. prior period',
        description: 'The risk score has declined relative to the previous scoring period, suggesting improving conditions.',
        numericValue: Math.round(improvement),
        weight: 0.3,
        contribution: 0,
      })
    }
  }

  return Math.min(100, recoveryScore)
}

// ─── Signal contribution helper ───────────────────────────────────────────────

function computeContribution(
  signal: RiskSignal,
  components: Record<string, number>,
): number {
  const categoryMap: Record<string, number | undefined> = {
    WARN:      (components['layoffRecency'] ?? 0) * W.recency,  // Approximate
    SEC:       (components['negativeSignals'] ?? 0) * W.negative,
    FINANCIAL: (components['financialWeakness'] ?? 0) * W.financial,
    MOMENTUM:  0,
  }
  return Math.round((categoryMap[signal.category] ?? 0) * signal.weight * 10) / 10
}
