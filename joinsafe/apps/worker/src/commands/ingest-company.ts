#!/usr/bin/env tsx
// ingest-company — one-shot SEC ingestion for a single company
//
// Usage:
//   pnpm --filter @joinsafe/worker ingest:company --cik 0000320193
//   pnpm --filter @joinsafe/worker ingest:company --ticker AAPL
//   pnpm --filter @joinsafe/worker ingest:company --ticker AAPL --company-id clxxxxxx
//
// The --company-id flag overrides CIK/ticker lookup and writes directly to
// the specified DB record (useful when the DB company was created manually
// before the CIK was known).
//
// Exit codes:
//   0  success
//   1  company not found on EDGAR or DB lookup failed
//   2  environment / configuration error

import { prisma } from '@joinsafe/db'
import { normalizeCik, lookupCikByTicker } from '@joinsafe/providers'
import { ingestCompanyByCik } from '../services/sec-ingestion'
import { logger } from '../logger'

// ── Argument parsing (no third-party dep — keeps the CLI lightweight) ────────

function parseArgs(argv: string[]): {
  cik?: string
  ticker?: string
  companyId?: string
} {
  const args: Record<string, string> = {}
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i]
    if (!arg) continue
    if (arg.startsWith('--')) {
      const key   = arg.slice(2).replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
      const value = argv[i + 1]
      if (value && !value.startsWith('--')) {
        args[key] = value
        i++
      }
    }
  }
  return {
    cik:       args['cik'],
    ticker:    args['ticker'],
    companyId: args['companyId'],
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { cik: rawCik, ticker, companyId } = parseArgs(process.argv)

  if (!rawCik && !ticker) {
    console.error('Error: provide --cik or --ticker\n')
    console.error('  pnpm ingest:company --cik 0000320193')
    console.error('  pnpm ingest:company --ticker AAPL')
    process.exit(2)
  }

  const userAgent = process.env['SEC_EDGAR_USER_AGENT']
  if (!userAgent) {
    console.error('Error: SEC_EDGAR_USER_AGENT environment variable is required')
    process.exit(2)
  }

  let resolvedCik: string

  if (rawCik) {
    try {
      resolvedCik = normalizeCik(rawCik)
    } catch {
      console.error(`Error: invalid CIK "${rawCik}"`)
      process.exit(1)
    }
  } else {
    // Ticker resolution
    const { lookupCikByTicker: lookup } = await import('@joinsafe/providers')
    const found = await lookup(ticker!, userAgent)
    if (!found) {
      console.error(`Error: ticker "${ticker}" not found in SEC registry`)
      process.exit(1)
    }
    resolvedCik = found
    logger.info({ ticker, cik: resolvedCik }, 'Resolved ticker → CIK')
  }

  logger.info({ cik: resolvedCik, companyId }, 'Starting SEC ingestion')

  const result = await ingestCompanyByCik(resolvedCik, companyId)

  if (!result.companyId) {
    console.error(
      `\nCompany "${result.companyName}" (CIK ${result.cik}) was found on EDGAR ` +
      `but has no matching record in the JoinSafe database.\n\n` +
      `To create it, run:\n` +
      `  INSERT INTO "Company" (name, slug, "normalizedName", cik, "companyType") ` +
      `VALUES ('${result.companyName}', '...', '...', '${result.cik}', 'PUBLIC');\n`,
    )
    process.exit(1)
  }

  console.log('\n✓ Ingestion complete\n')
  console.table({
    CIK:              result.cik,
    Company:          result.companyName,
    'DB company ID':  result.companyId,
    'Filings upserted': result.filingsUpserted,
    'Metrics upserted': result.metricsUpserted,
    'Negative phrases': result.phrasesDetected,
    'Duration':        `${result.durationMs}ms`,
  })
}

main()
  .catch((err) => {
    logger.error(err, 'Ingestion command failed')
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
