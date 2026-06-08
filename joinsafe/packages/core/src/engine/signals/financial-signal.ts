// Financial health signal computation
//
// Derived from SEC XBRL financial data. Focuses on metrics with documented
// predictive value for layoffs: cash runway, revenue trajectory, and debt burden.
//
// All monetary values are stored as BigInt (cents) to avoid float precision loss
// in financial arithmetic. Conversions to float happen only for ratio calculations.

import type { SecFilingInput, RiskSignal } from '../../types'

interface FinancialSignalOutput {
  score: number
  signals: RiskSignal[]
}

function centsToDollars(cents: bigint): number {
  return Number(cents) / 100
}

export function computeFinancialSignals(filings: SecFilingInput[]): FinancialSignalOutput {
  const signals: RiskSignal[] = []

  const annualFilings = filings
    .filter((f) => f.formType === '10-K')
    .sort((a, b) => b.filingDate.getTime() - a.filingDate.getTime())

  if (annualFilings.length === 0) {
    return { score: 0, signals: [] }
  }

  const latest = annualFilings[0]
  let score = 0

  // ── Signal: Revenue decline ───────────────────────────────────────────────
  if (latest.revenueYoYChange !== null && latest.revenueYoYChange !== undefined) {
    const pctChange = latest.revenueYoYChange // e.g. -0.15 means -15%

    if (pctChange <= -0.25) {
      score = Math.max(score, 75)
      signals.push({
        id: 'fin_revenue_decline_severe',
        category: 'FINANCIAL',
        severity: 'HIGH',
        title: `Revenue declined ${Math.abs(pctChange * 100).toFixed(0)}% year-over-year`,
        description:
          'A severe revenue contraction of this magnitude typically triggers cost restructuring. Workforce reductions often follow within one to two reporting periods.',
        value: Math.round(pctChange * 1000) / 1000,
        weight: 0.25,
      })
    } else if (pctChange <= -0.10) {
      score = Math.max(score, 45)
      signals.push({
        id: 'fin_revenue_decline',
        category: 'FINANCIAL',
        severity: 'MEDIUM',
        title: `Revenue declined ${Math.abs(pctChange * 100).toFixed(0)}% year-over-year`,
        description:
          'A double-digit revenue decline often leads management to reduce operating costs, including headcount, particularly in high-margin software and professional services companies.',
        value: Math.round(pctChange * 1000) / 1000,
        weight: 0.25,
      })
    }
  }

  // ── Signal: Cash runway ───────────────────────────────────────────────────
  if (
    latest.cashAndEquivalents != null &&
    latest.operatingCashFlow != null &&
    latest.operatingCashFlow < 0n
  ) {
    const cashDollars = centsToDollars(latest.cashAndEquivalents)
    const burnPerMonth = Math.abs(centsToDollars(latest.operatingCashFlow)) / 12
    const runwayMonths = burnPerMonth > 0 ? cashDollars / burnPerMonth : Infinity

    if (runwayMonths < 12) {
      score = Math.max(score, 85)
      signals.push({
        id: 'fin_cash_runway_critical',
        category: 'FINANCIAL',
        severity: 'CRITICAL',
        title: `Estimated cash runway: ~${Math.floor(runwayMonths)} months`,
        description:
          'At current cash burn, the company has less than 12 months of operating capital. This level of runway constrains hiring, creates pressure to reduce headcount, and heightens insolvency risk.',
        value: Math.round(runwayMonths * 10) / 10,
        weight: 0.3,
      })
    } else if (runwayMonths < 24) {
      score = Math.max(score, 55)
      signals.push({
        id: 'fin_cash_runway_limited',
        category: 'FINANCIAL',
        severity: 'HIGH',
        title: `Estimated cash runway: ~${Math.floor(runwayMonths)} months`,
        description:
          'The company has less than 24 months of runway at current burn. This typically triggers management action — fundraising, cost cuts, or both — within the next few quarters.',
        value: Math.round(runwayMonths * 10) / 10,
        weight: 0.3,
      })
    }
  }

  // ── Signal: High leverage / debt burden ───────────────────────────────────
  if (latest.totalDebt != null && latest.totalAssets != null && latest.totalAssets > 0n) {
    const debtRatio = Number(latest.totalDebt) / Number(latest.totalAssets)

    if (debtRatio > 0.8) {
      score = Math.max(score, 65)
      signals.push({
        id: 'fin_high_leverage',
        category: 'FINANCIAL',
        severity: 'HIGH',
        title: `Debt-to-assets ratio: ${(debtRatio * 100).toFixed(0)}%`,
        description:
          'A high debt burden limits financial flexibility. Companies with debt-to-asset ratios above 80% have significantly constrained ability to weather revenue shocks without restructuring.',
        value: Math.round(debtRatio * 1000) / 1000,
        weight: 0.2,
      })
    } else if (debtRatio > 0.6) {
      score = Math.max(score, 35)
      signals.push({
        id: 'fin_elevated_leverage',
        category: 'FINANCIAL',
        severity: 'MEDIUM',
        title: `Debt-to-assets ratio: ${(debtRatio * 100).toFixed(0)}%`,
        description:
          'Elevated leverage increases exposure to rising interest costs and refinancing risk, both of which can pressure workforce spending.',
        value: Math.round(debtRatio * 1000) / 1000,
        weight: 0.2,
      })
    }
  }

  // ── Signal: Negative operating cash flow ─────────────────────────────────
  if (latest.operatingCashFlow != null && latest.operatingCashFlow < 0n && latest.revenue != null) {
    const burnToRevenue = Math.abs(Number(latest.operatingCashFlow)) / Number(latest.revenue)

    if (burnToRevenue > 0.3) {
      score = Math.max(score, 60)
      signals.push({
        id: 'fin_negative_ocf',
        category: 'FINANCIAL',
        severity: 'HIGH',
        title: 'Negative operating cash flow',
        description:
          'The company is spending significantly more cash from operations than it generates from revenue. Sustained negative operating cash flow is a strong predictor of forced cost reduction.',
        value: Math.round(burnToRevenue * 100) / 100,
        weight: 0.25,
      })
    }
  }

  return { score: Math.min(100, score), signals }
}
