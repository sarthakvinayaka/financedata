// Worker scheduler
//
// Runs all ingestion and scoring jobs on a cron schedule.
// Cron expressions are configurable via environment variables.
//
// This is intentionally simple (node-cron, no Redis). When job volume grows
// or reliability requirements increase, migrate to BullMQ + Redis:
//  - Replace cron triggers with BullMQ RepeatableJobs
//  - Add job retry policies, dead-letter queues, and dashboard (Bull Board)
//  - Move to a separate process pool to isolate job failures

import cron from 'node-cron'
import { logger } from './logger'
import { runIngestWarn } from './jobs/ingest-warn'
import { runIngestSec } from './jobs/ingest-sec'
import { runScoreRecompute } from './jobs/score-recompute'
import { prisma } from '@joinsafe/db'

const SCHEDULES = {
  ingestWarn: process.env['WORKER_CRON_INGEST_WARN'] ?? '0 3 * * *',     // 3am daily
  ingestSec: process.env['WORKER_CRON_INGEST_SEC'] ?? '0 2 * * *',       // 2am daily
  scoreRecompute: process.env['WORKER_CRON_SCORE_RECOMPUTE'] ?? '0 4 * * *', // 4am daily
}

async function withErrorBoundary(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    logger.info({ job: name }, 'Job starting')
    await fn()
    logger.info({ job: name }, 'Job completed')
  } catch (err) {
    logger.error({ job: name, err }, 'Job failed')
    // In production: send alert to PagerDuty / Slack here
  }
}

export function startScheduler(): void {
  logger.info('Starting JoinSafe worker scheduler')
  logger.info({ schedules: SCHEDULES }, 'Job schedules')

  cron.schedule(SCHEDULES.ingestWarn, () =>
    withErrorBoundary('ingest:warn', runIngestWarn),
  )

  cron.schedule(SCHEDULES.ingestSec, () =>
    withErrorBoundary('ingest:sec', runIngestSec),
  )

  cron.schedule(SCHEDULES.scoreRecompute, () =>
    withErrorBoundary('score:recompute', runScoreRecompute),
  )

  logger.info('Scheduler running. Waiting for next tick...')
}
