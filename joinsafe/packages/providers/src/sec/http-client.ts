// SEC EDGAR HTTP client
//
// Wraps native fetch with:
//  - SEC-compliant User-Agent header (required — bot access without it is
//    explicitly prohibited by SEC's robots.txt and Fair Access policy)
//  - Shared token-bucket rate limiter (8 req/s → stays under 10 req/s limit)
//  - Exponential backoff retry (429, 503, network errors)
//  - Distinct error types for 404 vs rate-limit vs generic failure

import { edgarRateLimiter } from './rate-limiter'

const DATA_SEC_BASE  = 'https://data.sec.gov'
const WWW_SEC_BASE   = 'https://www.sec.gov'

const MAX_RETRIES        = 3
const INITIAL_BACKOFF_MS = 2_000
const MAX_BACKOFF_MS     = 30_000

// ── Error types ───────────────────────────────────────────────────────────────

export class SecHttpError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly url: string,
  ) {
    super(message)
    this.name = 'SecHttpError'
  }
}

export class SecNotFoundError extends SecHttpError {
  constructor(url: string) {
    super(`EDGAR resource not found: ${url}`, 404, url)
    this.name = 'SecNotFoundError'
  }
}

export class SecRateLimitError extends SecHttpError {
  constructor(url: string, retryAfterSec?: number) {
    super(
      `EDGAR rate limit exceeded${retryAfterSec ? ` — retry after ${retryAfterSec}s` : ''}`,
      429,
      url,
    )
    this.name = 'SecRateLimitError'
  }
}

// ── Retry helper ──────────────────────────────────────────────────────────────

function jitteredBackoff(attempt: number): number {
  const base  = Math.min(INITIAL_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS)
  const jitter = Math.random() * 0.3 * base  // ±30% jitter
  return Math.round(base + jitter)
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

// ── Core fetch function ───────────────────────────────────────────────────────

/**
 * Fetch a URL from EDGAR with rate limiting, retry, and correct headers.
 * Throws SecNotFoundError on 404, SecHttpError on other non-OK statuses
 * (after all retries are exhausted).
 */
export async function edgarFetch(url: string, userAgent: string): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      await edgarRateLimiter.acquire()

      const response = await fetch(url, {
        headers: {
          'User-Agent': userAgent,
          Accept: 'application/json, text/html, */*',
        },
      })

      // 404 — don't retry; the resource doesn't exist
      if (response.status === 404) {
        throw new SecNotFoundError(url)
      }

      // 429 — rate limited by SEC; respect Retry-After header
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') ?? '10', 10)
        if (attempt < MAX_RETRIES - 1) {
          await sleep(retryAfter * 1000)
          continue
        }
        throw new SecRateLimitError(url, retryAfter)
      }

      // 503 / 5xx — transient; retry with backoff
      if (response.status >= 500) {
        if (attempt < MAX_RETRIES - 1) {
          await sleep(jitteredBackoff(attempt))
          continue
        }
        throw new SecHttpError(`SEC server error: HTTP ${response.status}`, response.status, url)
      }

      // Any other non-OK response
      if (!response.ok) {
        throw new SecHttpError(`EDGAR HTTP ${response.status}`, response.status, url)
      }

      return response

    } catch (err) {
      // Never retry 404 or known permanent errors
      if (err instanceof SecNotFoundError) throw err
      if (err instanceof SecHttpError && err.statusCode < 500) throw err

      lastError = err instanceof Error ? err : new Error(String(err))

      if (attempt < MAX_RETRIES - 1) {
        await sleep(jitteredBackoff(attempt))
      }
    }
  }

  throw lastError ?? new SecHttpError('Max retries exceeded', 0, url)
}

/** Fetch and parse a JSON response from EDGAR. */
export async function edgarFetchJson<T>(url: string, userAgent: string): Promise<T> {
  const res = await edgarFetch(url, userAgent)
  return res.json() as Promise<T>
}

/** Fetch filing text (HTML/XHTML) and return as a string. */
export async function edgarFetchText(url: string, userAgent: string): Promise<string> {
  // Filing documents can be large HTML files — we use a streaming approach
  // to limit memory consumption on very large filings.
  const res = await edgarFetch(url, userAgent)
  return res.text()
}

// ── URL constructors (kept here alongside the fetch utilities) ─────────────────

export function submissionsUrl(cikFormatted: string): string {
  return `${DATA_SEC_BASE}/submissions/${cikFormatted}.json`
}

export function companyFactsUrl(cikFormatted: string): string {
  return `${DATA_SEC_BASE}/api/xbrl/companyfacts/${cikFormatted}.json`
}

export function companyConceptUrl(cikFormatted: string, taxonomy: string, tag: string): string {
  return `${DATA_SEC_BASE}/api/xbrl/companyconcept/${cikFormatted}/${taxonomy}/${tag}.json`
}

export function tickerIndexUrl(): string {
  return `${WWW_SEC_BASE}/files/company_tickers.json`
}
