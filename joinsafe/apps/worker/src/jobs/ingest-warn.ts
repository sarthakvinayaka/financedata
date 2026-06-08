// WARN ingestion job (v2 — writes to LayoffEvent + SourceDocument)
//
// 1. Fetches notices from all supported state parsers
// 2. Upserts a SourceDocument (idempotent via stateCode + sourceRowId)
// 3. Creates a LayoffEvent linked to that document
// 4. Attempts company matching by normalizedName / alias
//
// Run: pnpm ingest:warn

import { prisma } from '@joinsafe/db'
import { createWarnClient } from '@joinsafe/providers'
import { logger } from '../logger'

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
}

async function matchCompany(employerName: string): Promise<string | null> {
  const normalized = normalize(employerName)

  // Direct normalizedName match
  const direct = await prisma.company.findFirst({
    where: { normalizedName: { contains: normalized } },
    select: { id: true },
  })
  if (direct) return direct.id

  // Alias match
  const alias = await prisma.companyAlias.findFirst({
    where: { normalized: { contains: normalized } },
    select: { companyId: true },
  })
  return alias?.companyId ?? null
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
      log.warn({ state, errors }, 'Parser errors')
    }

    log.info({ state, count: records.length }, 'Fetched WARN records')
    totalFetched += records.length

    for (const record of records) {
      // Idempotent upsert of source document
      let sourceDoc = await prisma.sourceDocument.findUnique({
        where: {
          stateCode_sourceRowId: {
            stateCode:   record.sourceState,
            sourceRowId: record.sourceRowId,
          },
        },
        select: { id: true },
      })

      if (sourceDoc) {
        totalSkipped++
        continue
      }

      const companyId = await matchCompany(record.employerName)

      await prisma.$transaction(async (tx) => {
        sourceDoc = await tx.sourceDocument.create({
          data: {
            companyId,
            documentType: 'WARN_NOTICE',
            url:          record.sourceUrl,
            publishedAt:  record.noticeDate,
            stateCode:    record.sourceState,
            sourceRowId:  record.sourceRowId,
            rawData:      record.rawData,
          },
        })

        await tx.layoffEvent.create({
          data: {
            companyId,
            announcedDate:        record.noticeDate,
            effectiveDate:        record.layoffDate ?? null,
            employeesAffected:    record.affectedWorkers > 0 ? record.affectedWorkers : null,
            geography:            [record.city, record.state].filter(Boolean).join(', ') || null,
            sourceType:           'WARN',
            sourceDocumentId:     sourceDoc.id,
            reasonClassification: 'UNKNOWN',
            confidenceLabel:      'REPORTED',
            isTemporary:          record.isTemporary,
          },
        })

        if (companyId) {
          await tx.company.update({
            where: { id: companyId },
            data:  { warnDataFetchedAt: new Date() },
          })
        }
      })

      totalCreated++
    }
  }

  log.info({ totalFetched, totalCreated, totalSkipped }, 'WARN ingestion complete')
}

if (require.main === module) {
  runIngestWarn()
    .catch((e) => {
      logger.error(e, 'WARN ingestion failed')
      process.exit(1)
    })
    .finally(() => prisma.$disconnect())
}
