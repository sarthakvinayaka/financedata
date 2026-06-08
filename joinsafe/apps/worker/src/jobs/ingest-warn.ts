// WARN ingestion job
//
// Fetches WARN notices from all supported state parsers and upserts them
// into the database. Idempotent: re-running is safe because upserts are
// keyed on (sourceState, sourceRowId).
//
// After ingestion, attempts to match notices to existing Company records
// by normalized employer name. Unmatched notices are stored without a
// companyId and can be matched in a later reconciliation pass.
//
// Run: pnpm ingest:warn

import { prisma } from '@joinsafe/db'
import { createWarnClient } from '@joinsafe/providers'
import { logger } from '../logger'

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
}

async function matchCompany(employerName: string): Promise<string | null> {
  const normalized = normalize(employerName)
  const company = await prisma.company.findFirst({
    where: { normalizedName: { contains: normalized } },
    select: { id: true },
  })
  return company?.id ?? null
}

export async function runIngestWarn(): Promise<void> {
  const log = logger.child({ job: 'ingest:warn' })
  const client = createWarnClient()

  log.info('Starting WARN ingestion')

  let totalFetched = 0
  let totalCreated = 0
  let totalSkipped = 0

  for await (const { state, records, errors } of client.fetchAll()) {
    if (errors.length > 0) {
      log.warn({ state, errors }, 'Errors fetching WARN data')
    }

    log.info({ state, count: records.length }, 'Fetched WARN records')
    totalFetched += records.length

    for (const record of records) {
      const companyId = await matchCompany(record.employerName)

      const existing = await prisma.warnNotice.findUnique({
        where: {
          sourceState_sourceRowId: {
            sourceState: record.sourceState,
            sourceRowId: record.sourceRowId,
          },
        },
        select: { id: true },
      })

      if (existing) {
        totalSkipped++
        continue
      }

      await prisma.warnNotice.create({
        data: {
          ...(companyId ? { companyId } : {}),
          employerName: record.employerName,
          state: record.state,
          city: record.city,
          county: record.county,
          zip: record.zip,
          noticeDate: record.noticeDate,
          layoffDate: record.layoffDate,
          affectedWorkers: record.affectedWorkers,
          noticeType: record.noticeType,
          isTemporary: record.isTemporary,
          sourceState: record.sourceState,
          sourceUrl: record.sourceUrl,
          sourceRowId: record.sourceRowId,
          rawData: record.rawData,
        },
      })

      totalCreated++
    }

    // Mark the company's WARN data as fresh
    if (records.length > 0) {
      const employerNames = [...new Set(records.map((r) => normalize(r.employerName)))]
      await prisma.company.updateMany({
        where: { normalizedName: { in: employerNames } },
        data: { warnDataFetchedAt: new Date() },
      })
    }
  }

  log.info({ totalFetched, totalCreated, totalSkipped }, 'WARN ingestion complete')
}

// Entry point when run directly
if (require.main === module) {
  runIngestWarn()
    .catch((e) => {
      logger.error(e, 'WARN ingestion failed')
      process.exit(1)
    })
    .finally(() => prisma.$disconnect())
}
