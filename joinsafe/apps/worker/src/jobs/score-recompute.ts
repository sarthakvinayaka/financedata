// Score recomputation job
//
// Runs the risk engine for every company that has been scored or has new data.
// The engine is deterministic and pure — this job handles all I/O:
//  1. Fetch company + relations from DB
//  2. Shape data into RiskEngineInput
//  3. Run computeRiskScore (pure)
//  4. Write RiskScore (upsert) and RiskScoreHistory (append)
//
// Processes all companies in batches. Companies with no WARN notices and no
// public filings are scored with a low-confidence STABLE result rather than
// being skipped — the absence of data is itself informative.
//
// Run: pnpm score:recompute

import { prisma } from '@joinsafe/db'
import { buildEngineInput, computeRiskScore } from '@joinsafe/core'
import { logger } from '../logger'

const BATCH_SIZE = 100

export async function runScoreRecompute(): Promise<void> {
  const log = logger.child({ job: 'score:recompute' })

  log.info('Starting score recomputation')

  const total = await prisma.company.count()
  log.info({ total }, 'Companies to score')

  let cursor: string | undefined
  let scored = 0
  let errors = 0

  while (true) {
    const companies = await prisma.company.findMany({
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: {
        id: true,
        isPublic: true,
        employeeCount: true,
        riskScore: { select: { score: true } },
        warnNotices: {
          select: {
            noticeDate: true,
            layoffDate: true,
            affectedWorkers: true,
            noticeType: true,
            isTemporary: true,
          },
        },
        secFilings: {
          select: {
            formType: true,
            filingDate: true,
            periodOfReport: true,
            goingConcernOpinion: true,
            restatement: true,
            auditorChanged: true,
            ceoChanged: true,
            cfoChanged: true,
            revenueYoYChange: true,
            revenue: true,
            operatingCashFlow: true,
            cashAndEquivalents: true,
            totalDebt: true,
            reportedEmployees: true,
          },
          orderBy: { filingDate: 'desc' },
          take: 10,
        },
      },
    })

    if (companies.length === 0) break
    cursor = companies[companies.length - 1]?.id

    for (const company of companies) {
      try {
        const input = buildEngineInput(company as Parameters<typeof buildEngineInput>[0])
        const output = computeRiskScore(input)

        await prisma.$transaction([
          prisma.riskScore.upsert({
            where: { companyId: company.id },
            update: {
              score: output.score,
              tier: output.tier,
              warnScore: output.components.warn.score,
              secScore: output.components.sec.score,
              financialScore: output.components.financial.score,
              momentumScore: output.components.momentum.score,
              signals: output.signals as never,
              confidence: output.confidence,
              dataAsOf: output.dataAsOf,
            },
            create: {
              companyId: company.id,
              score: output.score,
              tier: output.tier,
              warnScore: output.components.warn.score,
              secScore: output.components.sec.score,
              financialScore: output.components.financial.score,
              momentumScore: output.components.momentum.score,
              signals: output.signals as never,
              confidence: output.confidence,
              dataAsOf: output.dataAsOf,
            },
          }),
          prisma.riskScoreHistory.create({
            data: {
              companyId: company.id,
              score: output.score,
              tier: output.tier,
              signals: output.signals as never,
              confidence: output.confidence,
            },
          }),
          prisma.company.update({
            where: { id: company.id },
            data: { lastScoredAt: new Date() },
          }),
        ])

        scored++
      } catch (err) {
        log.error({ companyId: company.id, err }, 'Scoring failed for company')
        errors++
      }
    }

    log.debug({ scored, errors }, 'Batch complete')
  }

  log.info({ scored, errors }, 'Score recomputation complete')
}

if (require.main === module) {
  runScoreRecompute()
    .catch((e) => {
      logger.error(e, 'Score recomputation failed')
      process.exit(1)
    })
    .finally(() => prisma.$disconnect())
}
