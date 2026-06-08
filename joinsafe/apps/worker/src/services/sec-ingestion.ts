// SEC ingestion service
//
// Orchestrates: OfficialSecEdgarProvider → @joinsafe/db writes.
// This is the only place in the codebase that combines provider output
// with Prisma mutations — keeping the provider pure and the DB layer
// separate from data fetching.
//
// Idempotent: re-running for the same CIK will upsert (not duplicate) all records.

import { prisma } from '@joinsafe/db'
import { createSecProvider } from '@joinsafe/providers'
import type { SecCompanyProfile, NormalizedFiling, PhraseScanResult } from '@joinsafe/providers'
import { logger } from '../logger'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SecIngestionResult {
  cik:              string
  companyName:      string
  companyId:        string | null  // null if company not found in DB
  filingsUpserted:  number
  metricsUpserted:  number
  phrasesDetected:  number
  durationMs:       number
}

// ── Main ingestion function ───────────────────────────────────────────────────

/**
 * Fetch a company's full SEC profile and persist it to the database.
 *
 * @param cik    10-digit CIK string (or raw CIK — will be normalized)
 * @param companyId  Optional DB company ID override; otherwise looked up by CIK
 */
export async function ingestCompanyByCik(
  cik: string,
  companyId?: string,
): Promise<SecIngestionResult> {
  const log   = logger.child({ job: 'sec-ingestion', cik })
  const start = Date.now()

  const provider = createSecProvider()

  log.info('Fetching company profile from EDGAR')
  const profile = await provider.fetchCompanyProfile(cik)
  log.info({ name: profile.name, filings: profile.filings.length }, 'Profile fetched')

  // Resolve the DB company record
  const dbCompany = await resolveCompany(profile, companyId)

  if (!dbCompany) {
    log.warn({ name: profile.name }, 'Company not in DB — skipping write')
    return {
      cik:             profile.cik,
      companyName:     profile.name,
      companyId:       null,
      filingsUpserted: 0,
      metricsUpserted: 0,
      phrasesDetected: 0,
      durationMs:      Date.now() - start,
    }
  }

  let filingsUpserted = 0
  let metricsUpserted = 0
  let phrasesDetected = 0

  // ── Upsert source documents + financial reports + metrics ─────────────────
  for (const filing of profile.filings) {
    const scanResult = profile.phraseScanResults.find(
      (r) => r.accessionNumber === filing.accessionNumber,
    )

    const counts = await upsertFiling(dbCompany.id, profile, filing, scanResult)
    filingsUpserted  += counts.filings
    metricsUpserted  += counts.metrics
    phrasesDetected  += counts.phrases
  }

  // ── Update company metadata ───────────────────────────────────────────────
  await prisma.company.update({
    where: { id: dbCompany.id },
    data: {
      secDataFetchedAt: new Date(),
      ...(profile.financials.reportedEmployees
        ? {
            employeeCount:       profile.financials.reportedEmployees,
            employeeCountSource: 'SEC_10K',
            employeeCountAsOf:   profile.financials.periodEnd ?? new Date(),
          }
        : {}),
      ...(profile.ticker && !dbCompany.ticker ? { ticker: profile.ticker } : {}),
      ...(profile.exchange && !dbCompany.exchange ? { exchange: profile.exchange } : {}),
      ...(profile.sic && !dbCompany.sicCode ? { sicCode: profile.sic } : {}),
      ...(profile.address?.city && !dbCompany.headquartersCity
        ? { headquartersCity: profile.address.city }
        : {}),
      ...(profile.address?.stateOrCountry && !dbCompany.headquartersState
        ? { headquartersState: profile.address.stateOrCountry }
        : {}),
    },
  })

  const durationMs = Date.now() - start
  log.info({ filingsUpserted, metricsUpserted, phrasesDetected, durationMs }, 'Ingestion complete')

  return {
    cik:             profile.cik,
    companyName:     profile.name,
    companyId:       dbCompany.id,
    filingsUpserted,
    metricsUpserted,
    phrasesDetected,
    durationMs,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function resolveCompany(
  profile: SecCompanyProfile,
  explicitId?: string,
) {
  if (explicitId) {
    return prisma.company.findUnique({
      where: { id: explicitId },
      select: { id: true, ticker: true, exchange: true, sicCode: true, headquartersCity: true, headquartersState: true },
    })
  }

  // Try CIK match first
  if (profile.cik) {
    const byCik = await prisma.company.findUnique({
      where: { cik: profile.cik },
      select: { id: true, ticker: true, exchange: true, sicCode: true, headquartersCity: true, headquartersState: true },
    })
    if (byCik) return byCik
  }

  // Try ticker match
  if (profile.ticker) {
    const byTicker = await prisma.company.findUnique({
      where: { ticker: profile.ticker },
      select: { id: true, ticker: true, exchange: true, sicCode: true, headquartersCity: true, headquartersState: true },
    })
    if (byTicker) return byTicker
  }

  return null
}

async function upsertFiling(
  companyId: string,
  profile: SecCompanyProfile,
  filing: NormalizedFiling,
  scanResult?: PhraseScanResult,
): Promise<{ filings: number; metrics: number; phrases: number }> {
  let metricsCount = 0
  const phrasesCount = scanResult?.hits.length ?? 0

  await prisma.$transaction(async (tx) => {
    // ── Source document ──────────────────────────────────────────────────────
    const sourceDoc = await tx.sourceDocument.upsert({
      where: { accessionNumber: filing.accessionNumber },
      update: { retrievedAt: new Date() },
      create: {
        companyId,
        documentType:    filingToDocType(filing.formType),
        url:             filing.primaryDocumentUrl,
        accessionNumber: filing.accessionNumber,
        formType:        filing.formType,
        filingDate:      filing.filingDate,
        periodOfReport:  filing.reportDate,
        // Persist raw submissions + facts for audit trail
        rawData: {
          profile:    profile.rawSubmissions,  // Verbatim EDGAR JSON
          scannedAt:  scanResult?.scannedAt?.toISOString(),
          phraseHits: scanResult?.hits ?? [],
        },
      },
    })

    // ── Financial report ─────────────────────────────────────────────────────
    // Qualitative flags: going concern, restatement — these aren't available
    // from XBRL and would require NLP on the full filing text. Defaulting to
    // false here; the phrase scanner provides a heuristic alternative.
    // TODO: parse auditor's opinion section for going concern language.
    const report = await tx.financialReport.upsert({
      where: { id: sourceDoc.id },
      update: { updatedAt: new Date() },
      create: {
        id:              sourceDoc.id,
        companyId,
        sourceDocumentId: sourceDoc.id,
        formType:        filing.formType,
        filingDate:      filing.filingDate,
        periodEndDate:   filing.reportDate,
        // Detect going concern from phrase scanner if available
        goingConcernOpinion: (scanResult?.hits ?? []).some((h) =>
          h.phraseId === 'path_to_profitability' && h.count >= 3,
        ),
      },
    })

    // ── Financial metrics (from XBRL extraction) ────────────────────────────
    // Only write metrics for the annual 10-K filing since that's where
    // the full-year XBRL data lives.
    if (filing.formType === '10-K' && profile.financials) {
      const fin = profile.financials
      const metricRows: Array<{ key: string; value: number | undefined; yoy?: number }> = [
        { key: 'revenue',            value: fin.revenue,            yoy: fin.revenueYoY },
        { key: 'netIncome',          value: fin.netIncome,          yoy: fin.netIncomeYoY },
        { key: 'operatingCashFlow',  value: fin.operatingCashFlow },
        { key: 'cashAndEquivalents', value: fin.cashAndEquivalents },
        { key: 'longTermDebt',       value: fin.longTermDebt },
        { key: 'shortTermDebt',      value: fin.shortTermDebt },
        { key: 'totalDebt',          value: fin.totalDebt },
        { key: 'totalAssets',        value: fin.totalAssets },
        { key: 'employees',          value: fin.reportedEmployees },
      ]

      for (const { key, value, yoy } of metricRows) {
        if (value === undefined || value === null) continue

        await tx.financialMetric.upsert({
          where: { reportId_metricKey: { reportId: report.id, metricKey: key } },
          update: { metricValue: value, yoyChange: yoy ?? null },
          create: {
            reportId:       report.id,
            metricKey:      key,
            metricValue:    value,
            unit:           key === 'employees' ? 'employees' : 'USD',
            yoyChange:      yoy ?? null,
            periodEnd:      filing.reportDate,
            confidenceLabel: 'REPORTED',
          },
        })
        metricsCount++
      }
    }
  })

  return { filings: 1, metrics: metricsCount, phrases: phrasesCount }
}

function filingToDocType(formType: string): string {
  switch (formType) {
    case '10-K': return 'SEC_10K'
    case '10-Q': return 'SEC_10Q'
    case '8-K':  return 'SEC_8K'
    default:     return 'MANUAL_ENTRY'
  }
}
