// CIK normalization and ticker → CIK resolution
//
// SEC CIK numbers are 1–10 digit integers. The EDGAR API requires them
// zero-padded to 10 digits prefixed with "CIK" in the URL path.
// Internally we store the zero-padded 10-digit form without the prefix.

import type { SecTickerIndex } from './types'

const TICKERS_URL = 'https://www.sec.gov/files/company_tickers.json'
const TICKER_CACHE_TTL_MS = 4 * 60 * 60 * 1000  // 4 hours

// ── CIK formatting ────────────────────────────────────────────────────────────

/** Normalize any CIK representation to a zero-padded 10-digit string. */
export function normalizeCik(raw: string | number): string {
  const digits = String(raw).replace(/\D/g, '')
  if (!digits || digits.length > 10) {
    throw new Error(`Invalid CIK: "${raw}"`)
  }
  return digits.padStart(10, '0')
}

/** Format a CIK for use in EDGAR API URL paths: "CIK0000320193" */
export function formatCikForUrl(cik: string): string {
  return `CIK${normalizeCik(cik)}`
}

/** Format an accession number for use in EDGAR archive URLs (no dashes). */
export function accessionToPath(accession: string): string {
  return accession.replace(/-/g, '')
}

/** Build the primary document URL for a given CIK and filing. */
export function buildDocumentUrl(cik: string, accession: string, primaryDocument: string): string {
  return [
    'https://www.sec.gov/Archives/edgar/data',
    normalizeCik(cik).replace(/^0+/, ''),  // CIK without leading zeros for archive path
    accessionToPath(accession),
    primaryDocument,
  ].join('/')
}

/** Build the EDGAR filing index URL for a given CIK + accession number. */
export function buildFilingIndexUrl(cik: string, accession: string): string {
  return [
    'https://www.sec.gov/Archives/edgar/data',
    normalizeCik(cik).replace(/^0+/, ''),
    accessionToPath(accession),
    `${accessionToPath(accession)}-index.htm`,
  ].join('/')
}

// ── Ticker → CIK lookup ───────────────────────────────────────────────────────

interface CachedTickerIndex {
  index: Map<string, string>  // ticker (uppercase) → cik (10-digit)
  cachedAt: number
}

let tickerCache: CachedTickerIndex | null = null

/**
 * Fetch the SEC's company tickers JSON and build a ticker → CIK map.
 * Cached for 4 hours to avoid repeated downloads of the ~2MB file.
 */
async function getTickerIndex(userAgent: string): Promise<Map<string, string>> {
  if (tickerCache && Date.now() - tickerCache.cachedAt < TICKER_CACHE_TTL_MS) {
    return tickerCache.index
  }

  const res = await fetch(TICKERS_URL, {
    headers: {
      'User-Agent': userAgent,
      Accept: 'application/json',
    },
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch ticker index: HTTP ${res.status}`)
  }

  const raw = (await res.json()) as SecTickerIndex

  const index = new Map<string, string>()
  for (const entry of Object.values(raw)) {
    if (entry.ticker && entry.cik_str) {
      index.set(entry.ticker.toUpperCase(), normalizeCik(entry.cik_str))
    }
  }

  tickerCache = { index, cachedAt: Date.now() }
  return index
}

/**
 * Resolve a stock ticker to a 10-digit CIK string.
 * Returns null if the ticker is not found in the SEC registry.
 */
export async function lookupCikByTicker(ticker: string, userAgent: string): Promise<string | null> {
  const index = await getTickerIndex(userAgent)
  return index.get(ticker.toUpperCase()) ?? null
}

/** Clear the ticker cache (useful in tests). */
export function clearTickerCache(): void {
  tickerCache = null
}
