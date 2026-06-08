// SEC EDGAR ingestion job
//
// For each public company in the DB (has CIK), this job:
//  1. Fetches the company's submissions metadata from EDGAR
//  2. Upserts recent 10-K, 10-Q, and 8-K filings
//  3. Extracts XBRL financial data and updates the SecFiling record
//  4. Marks the company's SEC data as fresh
//
// The job processes companies in batches to respect EDGAR rate limits.
// A conservative delay is enforced by the EdgarClient.
//
// Run: pnpm ingest:sec

import { prisma } from '@joinsafe/db'
import { createEdgarClient } from '@joinsafe/providers'
import { logger } from '../logger'

const BATCH_SIZE = parseInt(process.env['INGEST_BATCH_SIZE'] ?? '20', 10)

export async function runIngestSec(): Promise<void> {
  const log = logger.child({ job: 'ingest:sec' })
  const edgar = createEdgarClient()

  log.info('Starting SEC ingestion')

  const companies = await prisma.company.findMany({
    where: { isPublic: true, cik: { not: null } },
    select: { id: true, cik: true, name: true },
    orderBy: { secDataFetchedAt: 'asc' }, // Process least-recently-fetched first
    take: BATCH_SIZE,
  })

  log.info({ count: companies.length }, 'Companies to process')

  let processed = 0
  let errors = 0

  for (const company of companies) {
    if (!company.cik) continue

    try {
      log.debug({ company: company.name, cik: company.cik }, 'Fetching EDGAR data')

      const [submissions, facts] = await Promise.all([
        edgar.getSubmissions(company.cik),
        edgar.getCompanyFacts(company.cik).catch(() => null),
      ])

      const filings = edgar.getRecentFilings(submissions, ['10-K', '10-Q', '8-K'], 10)
      const financials = facts ? edgar.extractFinancials(facts) : {}

      for (const filing of filings) {
        await prisma.secFiling.upsert({
          where: { accessionNumber: filing.accessionNumber },
          update: {
            filingDate: filing.filingDate,
            periodOfReport: filing.periodOfReport,
            // Financial data — only update if we have it
            ...(financials.revenue !== undefined ? { revenue: financials.revenue } : {}),
            ...(financials.revenueYoYChange !== undefined
              ? { revenueYoYChange: financials.revenueYoYChange }
              : {}),
            ...(financials.operatingCashFlow !== undefined
              ? { operatingCashFlow: financials.operatingCashFlow }
              : {}),
            ...(financials.cashAndEquivalents !== undefined
              ? { cashAndEquivalents: financials.cashAndEquivalents }
              : {}),
            ...(financials.totalDebt !== undefined ? { totalDebt: financials.totalDebt } : {}),
            ...(financials.totalAssets !== undefined ? { totalAssets: financials.totalAssets } : {}),
            ...(financials.reportedEmployees !== undefined
              ? { reportedEmployees: financials.reportedEmployees }
              : {}),
          },
          create: {
            companyId: company.id,
            accessionNumber: filing.accessionNumber,
            formType: filing.formType,
            filingDate: filing.filingDate,
            periodOfReport: filing.periodOfReport,
            sourceUrl: filing.filingUrl,
            revenue: financials.revenue,
            revenueYoYChange: financials.revenueYoYChange,
            operatingCashFlow: financials.operatingCashFlow,
            cashAndEquivalents: financials.cashAndEquivalents,
            totalDebt: financials.totalDebt,
            totalAssets: financials.totalAssets,
            reportedEmployees: financials.reportedEmployees,
          },
        })
      }

      // Update employee count from SEC data if more recent
      if (financials.reportedEmployees) {
        await prisma.company.update({
          where: { id: company.id },
          data: {
            employeeCount: financials.reportedEmployees,
            employeeCountSource: 'SEC_10K',
            employeeCountAsOf: financials.periodEnd,
            secDataFetchedAt: new Date(),
          },
        })
      } else {
        await prisma.company.update({
          where: { id: company.id },
          data: { secDataFetchedAt: new Date() },
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

if (require.main === module) {
  runIngestSec()
    .catch((e) => {
      logger.error(e, 'SEC ingestion failed')
      process.exit(1)
    })
    .finally(() => prisma.$disconnect())
}
