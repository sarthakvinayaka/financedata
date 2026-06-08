// Scorer — orchestrates DB reads and engine invocation for a single company.
//
// This is the boundary between infrastructure (DB, I/O) and pure logic (engine).
// The worker imports this; the engine is never called with raw Prisma objects.

import { computeRiskScore, scoreToTier } from '../engine/risk-engine'
import type { RiskEngineInput, RiskEngineOutput } from '../types'

// Re-export the engine for cases where callers already have the shaped input
export { computeRiskScore, scoreToTier }
export type { RiskEngineInput, RiskEngineOutput }

// Utility: normalize a Prisma Company+relations shape to RiskEngineInput
export function buildEngineInput(
  company: {
    id: string
    isPublic: boolean
    employeeCount: number | null
    riskScore?: { score: number } | null
    warnNotices: Array<{
      noticeDate: Date
      layoffDate: Date | null
      affectedWorkers: number
      noticeType: string
      isTemporary: boolean
    }>
    secFilings: Array<{
      formType: string
      filingDate: Date
      periodOfReport: Date | null
      goingConcernOpinion: boolean
      restatement: boolean
      auditorChanged: boolean
      ceoChanged: boolean
      cfoChanged: boolean
      revenueYoYChange: number | null
      revenue: bigint | null
      operatingCashFlow: bigint | null
      cashAndEquivalents: bigint | null
      totalDebt: bigint | null
      reportedEmployees: number | null
    }>
  },
  now?: Date,
): RiskEngineInput {
  return {
    company: {
      id: company.id,
      isPublic: company.isPublic,
      employeeCount: company.employeeCount ?? undefined,
    },
    warnNotices: company.warnNotices.map((n) => ({
      noticeDate: n.noticeDate,
      layoffDate: n.layoffDate,
      affectedWorkers: n.affectedWorkers,
      noticeType: n.noticeType,
      isTemporary: n.isTemporary,
    })),
    secFilings: company.secFilings.map((f) => ({
      formType: f.formType,
      filingDate: f.filingDate,
      periodOfReport: f.periodOfReport,
      goingConcernOpinion: f.goingConcernOpinion,
      restatement: f.restatement,
      auditorChanged: f.auditorChanged,
      ceoChanged: f.ceoChanged,
      cfoChanged: f.cfoChanged,
      revenueYoYChange: f.revenueYoYChange,
      revenue: f.revenue,
      operatingCashFlow: f.operatingCashFlow,
      cashAndEquivalents: f.cashAndEquivalents,
      totalDebt: f.totalDebt,
      reportedEmployees: f.reportedEmployees,
    })),
    priorScore: company.riskScore?.score,
    now,
  }
}
