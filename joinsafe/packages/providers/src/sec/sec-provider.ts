// OfficialSecEdgarProvider — production implementation of SecProvider.
//
// Uses only public, unauthenticated EDGAR endpoints:
//   https://data.sec.gov/submissions/CIK##########.json
//   https://data.sec.gov/api/xbrl/companyfacts/CIK##########.json
//   https://data.sec.gov/api/xbrl/companyconcept/CIK##########/{taxonomy}/{tag}.json
//
// No API key or account is required. The SEC only asks for a descriptive
// User-Agent header identifying your application and contact info.
//
// Design: the provider is a pure data-fetching layer. It returns typed
// domain objects. All DB writes happen in the ingestion service (worker).

import { normalizeCik, formatCikForUrl, buildDocumentUrl, buildFilingIndexUrl } from './cik'
import {
  edgarFetchJson,
  edgarFetchText,
  SecNotFoundError,
  submissionsUrl,
  companyFactsUrl,
  companyConceptUrl,
} from './http-client'
import { lookupCikByTicker } from './cik'
import { extractFinancials } from './extraction'
import { scanFilingHtml } from './phrase-scanner'
import type {
  SecSubmissionsResponse,
  SecCompanyFactsResponse,
  SecCompanyConceptResponse,
  SecCompanyProfile,
  NormalizedFiling,
  ExtractedFinancials,
  PhraseScanResult,
  FilingListOptions,
  SecProvider,
} from './types'

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_FORM_TYPES = ['10-K', '10-Q', '8-K']
const DEFAULT_FILING_LIMIT = 20
// Maximum text bytes to read from a filing — 10-K filings can be 5–20MB.
// We scan only the first 2MB to stay within memory bounds.
const MAX_TEXT_BYTES = 2 * 1024 * 1024

// ── Provider implementation ───────────────────────────────────────────────────

export class OfficialSecEdgarProvider implements SecProvider {
  private readonly userAgent: string

  constructor(userAgent: string) {
    if (!userAgent || !userAgent.includes('@')) {
      throw new Error(
        'User-Agent must include contact info per SEC Fair Access policy. ' +
        'Format: "AppName/1.0 contact@company.com"',
      )
    }
    this.userAgent = userAgent
  }

  // ── Core EDGAR fetching ───────────────────────────────────────────────────

  async getSubmissions(cik: string): Promise<SecSubmissionsResponse> {
    const url = submissionsUrl(formatCikForUrl(normalizeCik(cik)))
    return edgarFetchJson<SecSubmissionsResponse>(url, this.userAgent)
  }

  async getCompanyFacts(cik: string): Promise<SecCompanyFactsResponse> {
    const url = companyFactsUrl(formatCikForUrl(normalizeCik(cik)))
    return edgarFetchJson<SecCompanyFactsResponse>(url, this.userAgent)
  }

  async getCompanyConcept(
    cik: string,
    taxonomy: string,
    tag: string,
  ): Promise<SecCompanyConceptResponse> {
    const url = companyConceptUrl(formatCikForUrl(normalizeCik(cik)), taxonomy, tag)
    return edgarFetchJson<SecCompanyConceptResponse>(url, this.userAgent)
  }

  // ── CIK resolution ────────────────────────────────────────────────────────

  async lookupCikByTicker(ticker: string): Promise<string | null> {
    return lookupCikByTicker(ticker, this.userAgent)
  }

  // ── Filing list normalization ─────────────────────────────────────────────

  listFilings(
    submissions: SecSubmissionsResponse,
    options?: FilingListOptions,
  ): NormalizedFiling[] {
    const formTypes = options?.formTypes ?? DEFAULT_FORM_TYPES
    const limit     = options?.limit ?? DEFAULT_FILING_LIMIT
    const since     = options?.since

    const { recent } = submissions.filings
    const results: NormalizedFiling[] = []

    const cik = submissions.cik

    for (let i = 0; i < recent.accessionNumber.length; i++) {
      if (results.length >= limit) break

      const form = recent.form[i]
      if (!form || !formTypes.includes(form)) continue

      const accn    = recent.accessionNumber[i]
      const filed   = recent.filingDate[i]
      const report  = recent.reportDate[i]
      const doc     = recent.primaryDocument[i]
      const isXBRL  = (recent.isXBRL[i] ?? 0) === 1
      const isIXBRL = (recent.isInlineXBRL[i] ?? 0) === 1

      if (!accn || !filed || !doc) continue

      const filingDate = new Date(filed)
      if (since && filingDate < since) continue

      results.push({
        accessionNumber:    accn,
        formType:           form,
        filingDate,
        reportDate:         report ? new Date(report) : null,
        primaryDocument:    doc,
        isXBRL,
        isInlineXBRL:       isIXBRL,
        filingIndexUrl:     buildFilingIndexUrl(cik, accn),
        primaryDocumentUrl: buildDocumentUrl(cik, accn, doc),
      })
    }

    return results
  }

  // ── Financial extraction ──────────────────────────────────────────────────

  extractFinancials(
    facts: SecCompanyFactsResponse,
    filings: NormalizedFiling[],
  ): ExtractedFinancials {
    return extractFinancials(facts, filings)
  }

  // ── Phrase scanning ───────────────────────────────────────────────────────

  async scanFiling(cik: string, filing: NormalizedFiling): Promise<PhraseScanResult> {
    const base: Omit<PhraseScanResult, 'hits' | 'textLengthChars' | 'error'> = {
      accessionNumber: filing.accessionNumber,
      formType:        filing.formType,
      filingDate:      filing.filingDate,
      scannedAt:       new Date(),
    }

    // Only scan text-heavy filings — 8-K exhibits can be press releases
    // which are low-signal for our purposes
    if (!['10-K', '10-Q'].includes(filing.formType)) {
      return { ...base, hits: [], textLengthChars: 0 }
    }

    try {
      const html = await edgarFetchText(filing.primaryDocumentUrl, this.userAgent)

      // Trim to MAX_TEXT_BYTES to avoid OOM on very large filings
      const trimmed = html.length > MAX_TEXT_BYTES
        ? html.slice(0, MAX_TEXT_BYTES)
        : html

      const hits = scanFilingHtml(trimmed)

      return {
        ...base,
        hits,
        textLengthChars: trimmed.length,
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      return { ...base, hits: [], textLengthChars: 0, error }
    }
  }

  // ── Full profile pipeline ─────────────────────────────────────────────────

  async fetchCompanyProfile(cik: string): Promise<SecCompanyProfile> {
    const normalizedCik = normalizeCik(cik)

    // Fetch submissions and company facts in parallel
    const [submissions, facts] = await Promise.all([
      this.getSubmissions(normalizedCik),
      this.getCompanyFacts(normalizedCik).catch((err) => {
        // Private companies and some public companies lack XBRL data — not fatal
        if (err instanceof SecNotFoundError) return null
        throw err
      }),
    ])

    const filings = this.listFilings(submissions, {
      formTypes: DEFAULT_FORM_TYPES,
      limit: DEFAULT_FILING_LIMIT,
    })

    const financials = facts
      ? this.extractFinancials(facts, filings)
      : {}

    // Scan recent 10-K and 10-Q filings for negative phrases.
    // Limit to the 3 most recent to keep ingestion time reasonable.
    const filingsToScan = filings
      .filter((f) => ['10-K', '10-Q'].includes(f.formType))
      .slice(0, 3)

    const phraseScanResults = await Promise.all(
      filingsToScan.map((f) => this.scanFiling(normalizedCik, f)),
    )

    // Extract company metadata
    const ticker = submissions.tickers[0]

    return {
      cik: normalizedCik,
      name: submissions.name,
      ticker,
      exchange: submissions.exchanges[0],
      sic: submissions.sic,
      sicDescription: submissions.sicDescription,
      stateOfIncorporation: submissions.stateOfIncorporation,
      ein: submissions.ein,
      address: submissions.addresses?.business ?? submissions.addresses?.mailing,
      filings,
      financials,
      phraseScanResults,
      // Raw payloads — stored verbatim so we can re-parse if formats change
      rawSubmissions: submissions,
      rawFacts: facts,
    }
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function createSecProvider(): OfficialSecEdgarProvider {
  const userAgent = process.env['SEC_EDGAR_USER_AGENT']
  if (!userAgent) {
    throw new Error(
      'SEC_EDGAR_USER_AGENT environment variable is required. ' +
      'Format: "AppName/1.0 contact@company.com"',
    )
  }
  return new OfficialSecEdgarProvider(userAgent)
}
