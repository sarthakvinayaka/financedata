// Score recomputation job
//
// Fetches every company with layoff events or financial reports, runs the
// risk engine, and upserts RiskScore + appends RiskScoreHistory.
// Also writes per-signal RiskScoreExplanation rows for the detail view.
//
// Run: pnpm score:recompute

import { prisma } from '@joinsafe/db'
import { buildEngineInput, computeRiskScore } from '@joinsafe/core'
import { logger } from '../logger'

const BATCH_SIZE = 100

export async function runScoreRecompute(): Promise<void> {
  const log = logger.child({ job: 'score:recompute' })

  const total = await prisma.company.count()
  log.info({ total }, 'Starting score recomputation')

  let cursor: string | undefined
  let scored = 0
  let errors = 0

  while (true) {
    const companies = await prisma.company.findMany({
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: {
        id: true,
        companyType: true,
        employeeCount: true,
        riskScore: { select: { score: true } },
        layoffEvents: {
          select: {
            announcedDate: true,
            effectiveDate: true,
            employeesAffected: true,
            percentAffected: true,
            sourceType: true,
            reasonClassification: true,
            confidenceLabel: true,
            isTemporary: true,
          },
          orderBy: { announcedDate: 'desc' },
        },
        financialReports: {
          where: { formType: { in: ['10-K', '10-Q', '8-K'] } },
          orderBy: { filingDate: 'desc' },
          take: 8,
          select: {
            formType: true,
            filingDate: true,
            periodEndDate: true,
            goingConcernOpinion: true,
            restatement: true,
            auditorChanged: true,
            ceoChanged: true,
            cfoChanged: true,
            metrics: {
              select: {
                metricKey: true,
                metricValue: true,
                yoyChange: true,
              },
            },
          },
        },
      },
    })

    if (companies.length === 0) break
    cursor = companies[companies.length - 1]?.id

    for (const company of companies) {
      try {
        const input = buildEngineInput(company)
        const output = computeRiskScore(input)

        await prisma.$transaction(async (tx) => {
          // Upsert current score
          const score = await tx.riskScore.upsert({
            where: { companyId: company.id },
            update: {
              score: output.score,
              band:  output.band,
              layoffRecencyScore:    output.components.layoffRecency,
              layoffFrequencyScore:  output.components.layoffFrequency,
              layoffSeverityScore:   output.components.layoffSeverity,
              financialWeaknessScore: output.components.financialWeakness,
              negativeSignalsScore:  output.components.negativeSignals,
              recoverySignalsScore:  output.components.recoverySignals,
              confidence: output.confidence,
              dataAsOf:   output.dataAsOf,
            },
            create: {
              companyId: company.id,
              score: output.score,
              band:  output.band,
              layoffRecencyScore:    output.components.layoffRecency,
              layoffFrequencyScore:  output.components.layoffFrequency,
              layoffSeverityScore:   output.components.layoffSeverity,
              financialWeaknessScore: output.components.financialWeakness,
              negativeSignalsScore:  output.components.negativeSignals,
              recoverySignalsScore:  output.components.recoverySignals,
              confidence: output.confidence,
              dataAsOf:   output.dataAsOf,
            },
          })

          // Replace explanation rows (delete + create = clean state)
          await tx.riskScoreExplanation.deleteMany({ where: { riskScoreId: score.id } })
          if (output.signals.length > 0) {
            await tx.riskScoreExplanation.createMany({
              data: output.signals.map((s) => ({
                riskScoreId:  score.id,
                signalId:     s.id,
                category:     s.category,
                severity:     s.severity,
                title:        s.title,
                description:  s.description,
                numericValue: s.numericValue ?? null,
                textValue:    s.textValue ?? null,
                weight:       s.weight,
                contribution: s.contribution,
              })),
            })
          }

          // Append history
          await tx.riskScoreHistory.create({
            data: {
              companyId: company.id,
              score: output.score,
              band:  output.band,
              layoffRecencyScore:    output.components.layoffRecency,
              layoffFrequencyScore:  output.components.layoffFrequency,
              layoffSeverityScore:   output.components.layoffSeverity,
              financialWeaknessScore: output.components.financialWeakness,
              negativeSignalsScore:  output.components.negativeSignals,
              recoverySignalsScore:  output.components.recoverySignals,
              confidence: output.confidence,
            },
          })

          await tx.company.update({
            where: { id: company.id },
            data:  { lastScoredAt: new Date() },
          })
        })

        scored++
      } catch (err) {
        log.error({ companyId: company.id, err }, 'Scoring failed')
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
