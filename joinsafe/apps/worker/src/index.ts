// @joinsafe/worker — background job orchestrator
//
// This process runs alongside the web app and handles all data pipeline work:
//  - WARN notice ingestion (nightly, per state)
//  - SEC EDGAR ingestion (nightly, for public companies)
//  - Risk score recomputation (nightly, after ingestion)
//
// In production, this is deployed as a separate container/process.
// It has direct DB access via @joinsafe/db and provider access via @joinsafe/providers.
// The web app never calls these jobs directly — it reads the results from the DB.

import { startScheduler } from './scheduler'
import { logger } from './logger'
import { prisma } from '@joinsafe/db'

async function main() {
  logger.info({ version: process.version }, 'JoinSafe Worker starting')

  // Verify DB connectivity before starting scheduler
  await prisma.$queryRaw`SELECT 1`
  logger.info('Database connection verified')

  startScheduler()

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received')
    await prisma.$disconnect()
    process.exit(0)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

main().catch((err) => {
  logger.error(err, 'Fatal worker startup error')
  process.exit(1)
})
