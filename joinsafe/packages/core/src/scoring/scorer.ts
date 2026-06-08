// Scorer — shapes Prisma query results into RiskEngineInput.
//
// This is the boundary between infrastructure (Prisma types) and pure logic.
// The engine never sees Prisma-generated types — only the domain input shape.

import { computeRiskScore } from '../engine/risk-engine'
import type { RiskEngineInput, RiskEngineOutput, LayoffEventInput, FinancialReportInput } from '../types'

export { computeRiskScore }
export type { RiskEngineInput, RiskEngineOutput }

// ── Shape helpers ─────────────────────────────────────────────────────────────

type PrismaLayoffEvent = {
  announcedDate: Date
  effectiveDate: Date | null
  employeesAffected: number | null
  percentAffected: number | null
  sourceType: string
  reasonClassification: string
  confidenceLabel: string
  isTemporary: boolean
}

type PrismaFinancialReport = {
  formType: string
  filingDate: Date
  periodEndDate: Date | null
  goingConcernOpinion: boolean
  restatement: boolean
  auditorChanged: boolean
  ceoChanged: boolean
  cfoChanged: boolean
  metrics: Array<{
    metricKey: string
    metricValue: { toNumber(): number } | null
    yoyChange: number | null
  }>
}

type PrismaCompany = {
  id: string
  companyType: string
  employeeCount: number | null
  riskScore?: { score: number } | null
  layoffEvents: PrismaLayoffEvent[]
  financialReports: PrismaFinancialReport[]
}

function extractMetric(
  report: PrismaFinancialReport,
  key: string,
): number | null {
  const m = report.metrics.find((m) => m.metricKey === key)
  return m?.metricValue?.toNumber() ?? null
}

export function buildEngineInput(company: PrismaCompany, now?: Date): RiskEngineInput {
  const layoffEvents: LayoffEventInput[] = company.layoffEvents.map((e) => ({
    announcedDate:       e.announcedDate,
    effectiveDate:       e.effectiveDate,
    employeesAffected:   e.employeesAffected,
    percentAffected:     e.percentAffected,
    sourceType:          e.sourceType as LayoffEventInput['sourceType'],
    reasonClassification: e.reasonClassification as LayoffEventInput['reasonClassification'],
    confidenceLabel:     e.confidenceLabel as LayoffEventInput['confidenceLabel'],
    isTemporary:         e.isTemporary,
  }))

  const financialReports: FinancialReportInput[] = company.financialReports.map((r) => ({
    formType:            r.formType,
    filingDate:          r.filingDate,
    periodEndDate:       r.periodEndDate,
    goingConcernOpinion: r.goingConcernOpinion,
    restatement:         r.restatement,
    auditorChanged:      r.auditorChanged,
    ceoChanged:          r.ceoChanged,
    cfoChanged:          r.cfoChanged,
    revenue:             extractMetric(r, 'revenue'),
    revenueYoYChange:    r.metrics.find((m) => m.metricKey === 'revenue')?.yoyChange ?? null,
    operatingCashFlow:   extractMetric(r, 'operatingCashFlow'),
    cashAndEquivalents:  extractMetric(r, 'cashAndEquivalents'),
    totalDebt:           extractMetric(r, 'totalDebt'),
    totalAssets:         extractMetric(r, 'totalAssets'),
    reportedEmployees:   (() => {
      const v = extractMetric(r, 'employees')
      return v !== null ? Math.round(v) : null
    })(),
  }))

  return {
    company: {
      id:            company.id,
      companyType:   company.companyType as 'PUBLIC' | 'PRIVATE',
      employeeCount: company.employeeCount ?? undefined,
    },
    layoffEvents,
    financialReports,
    priorScore: company.riskScore?.score,
    now,
  }
}
