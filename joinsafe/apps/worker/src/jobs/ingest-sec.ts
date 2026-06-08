// SEC EDGAR ingestion job (v2 — writes to FinancialReport + FinancialMetric)
//
// For each public company with a CIK:
//  1. Fetches submissions metadata from EDGAR
//  2. Upserts a SourceDocument per filing (accessionNumber = unique key)
//  3. Upserts FinancialReport with qualitative flags
//  4. Upserts FinancialMetric rows for extracted XBRL values
//
// Run: pnpm ingest:sec

import { prisma } from '@joinsafe/db'
import { createEdgarClient } from '@joinsafe/providers'
import type { ExtractedFinancials } from '@joinsafe/providers'
import { logger } from '../logger'

const BATCH_SIZE = parseInt(process.env['INGEST_BATCH_SIZE'] ?? '20', 10)

// Map our flat ExtractedFinancials keys to metricKey slugs
const METRIC_KEYS: Array<{
  field: keyof ExtractedFinancials
  key: string
  unit: string
}> = [
  { field: 'revenue',            key: 'revenue',            unit: 'USD' },
  { field: 'operatingCashFlow',  key: 'operatingCashFlow',  unit: 'USD' },
  { field: 'cashAndEquivalents', key: 'cashAndEquivalents', unit: 'USD' },
  { field: 'totalDebt',          key: 'totalDebt',          unit: 'USD' },
  { field: 'totalAssets',        key: 'totalAssets',        unit: 'USD' },
  { field: 'totalLiabilities',   key: 'totalLiabilities',   unit: 'USD' },
  { field: 'reportedEmployees',  key: 'employees',          unit: 'employees' },
]

export async function runIngestSec(): Promise<void> {
  const log = logger.child({ job: 'ingest:sec' })
  const edgar = createEdgarClient()

  const companies = await prisma.company.findMany({
    where: { companyType: 'PUBLIC', cik: { not: null } },
    select: { id: true, cik: true, name: true },
    orderBy: { secDataFetchedAt: 'asc' },
    take: BATCH_SIZE,
  })

  log.info({ count: companies.length }, 'Starting SEC ingestion')

  let processed = 0
  let errors = 0

  for (const company of companies) {
    if (!company.cik) continue

    try {
      const [submissions, facts] = await Promise.all([
        edgar.getSubmissions(company.cik),
        edgar.getCompanyFacts(company.cik).catch(() => null),
      ])

      const filings = edgar.getRecentFilings(submissions, ['10-K', '10-Q', '8-K'], 10)
      const financials = facts ? edgar.extractFinancials(facts) : {}

      for (const filing of filings) {
        await prisma.$transaction(async (tx) => {
          // Upsert SourceDocument
          const sourceDoc = await tx.sourceDocument.upsert({
            where: { accessionNumber: filing.accessionNumber },
            update: { retrievedAt: new Date() },
            create: {
              companyId:      company.id,
              documentType:   filingFormType(filing.formType),
              url:            filing.filingUrl,
              accessionNumber: filing.accessionNumber,
              formType:       filing.formType,
              filingDate:     filing.filingDate,
              periodOfReport: filing.periodOfReport,
            },
          })

          // Upsert FinancialReport
          const report = await tx.financialReport.upsert({
            where: { id: sourceDoc.id },  // One report per source doc
            update: { updatedAt: new Date() },
            create: {
              id:              sourceDoc.id,  // Reuse source doc ID for simplicity
              companyId:       company.id,
              sourceDocumentId: sourceDoc.id,
              formType:        filing.formType,
              filingDate:      filing.filingDate,
              periodEndDate:   filing.periodOfReport,
            },
          })

          // Upsert financial metric rows
          for (const { field, key, unit } of METRIC_KEYS) {
            const rawValue = financials[field]
            if (rawValue === undefined || rawValue === null) continue

            // BigInt values come from EDGAR; convert to number for Decimal storage
            const numericValue = typeof rawValue === 'bigint'
              ? Number(rawValue) / 100  // BigInt was stored as cents
              : typeof rawValue === 'number'
                ? rawValue
                : null

            if (numericValue === null) continue

            await tx.financialMetric.upsert({
              where: { reportId_metricKey: { reportId: report.id, metricKey: key } },
              update: {
                metricValue: numericValue,
                yoyChange:   field === 'revenue' ? (financials.revenueYoYChange ?? null) : null,
              },
              create: {
                reportId:       report.id,
                metricKey:      key,
                metricValue:    numericValue,
                unit,
                yoyChange:      field === 'revenue' ? (financials.revenueYoYChange ?? null) : null,
                periodEnd:      filing.periodOfReport,
                confidenceLabel: 'REPORTED',
              },
            })
          }
        })
      }

      // Update employee count from SEC data
      if (financials.reportedEmployees) {
        await prisma.company.update({
          where: { id: company.id },
          data: {
            employeeCount:       financials.reportedEmployees,
            employeeCountSource: 'SEC_10K',
            employeeCountAsOf:   financials.periodEnd ?? new Date(),
            secDataFetchedAt:    new Date(),
          },
        })
      } else {
        await prisma.company.update({
          where: { id: company.id },
          data:  { secDataFetchedAt: new Date() },
        })
      }

      processed++
    } catch (err) {
      log.error({ company: company.name, err }, 'Failed to ingest SEC data')
      errors++
    }
  }

  log.info({ processed, errors }, 'SEC ingestion complete')
}

function filingFormType(formType: string): string {
  switch (formType) {
    case '10-K': return 'SEC_10K'
    case '10-Q': return 'SEC_10Q'
    case '8-K':  return 'SEC_8K'
    default:     return 'MANUAL_ENTRY'
  }
}

if (require.main === module) {
  runIngestSec()
    .catch((e) => {
      logger.error(e, 'SEC ingestion failed')
      process.exit(1)
    })
    .finally(() => prisma.$disconnect())
}
