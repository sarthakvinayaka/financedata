// SEC EDGAR REST API client
//
// Uses only public, unauthenticated EDGAR endpoints. No API key required.
// SEC requires a descriptive User-Agent header — set SEC_EDGAR_USER_AGENT in .env.
// Rate limit: EDGAR allows 10 requests/second per IP; this client enforces
// a conservative 500ms inter-request delay to stay well within limits.
//
// Docs: https://www.sec.gov/edgar/sec-api-documentation

import { z } from 'zod'
import {
  EdgarSubmissionsSchema,
  CompanyFactsSchema,
  type EdgarSubmissions,
  type CompanyFacts,
  type NormalizedFiling,
  type ExtractedFinancials,
} from './types'

const BASE_URL = 'https://data.sec.gov'
const SEARCH_URL = 'https://efts.sec.gov'

export interface EdgarClientOptions {
  userAgent: string // Required by SEC: "AppName/version contact@email.com"
  requestDelayMs?: number
}

export class EdgarClient {
  private userAgent: string
  private delayMs: number
  private lastRequestAt = 0

  constructor(options: EdgarClientOptions) {
    this.userAgent = options.userAgent
    this.delayMs = options.requestDelayMs ?? 500
  }

  // Pad CIK to 10 digits, prepend "CIK" as EDGAR expects
  private formatCik(cik: string): string {
    return `CIK${cik.padStart(10, '0')}`
  }

  private async rateLimit(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestAt
    if (elapsed < this.delayMs) {
      await new Promise((r) => setTimeout(r, this.delayMs - elapsed))
    }
    this.lastRequestAt = Date.now()
  }

  private async fetch<T>(url: string, schema: z.ZodType<T>): Promise<T> {
    await this.rateLimit()

    const res = await fetch(url, {
      headers: {
        'User-Agent': this.userAgent,
        Accept: 'application/json',
      },
    })

    if (!res.ok) {
      throw new EdgarError(`EDGAR request failed: ${res.status} ${res.statusText}`, res.status, url)
    }

    const json: unknown = await res.json()
    return schema.parse(json)
  }

  async getSubmissions(cik: string): Promise<EdgarSubmissions> {
    const formattedCik = this.formatCik(cik)
    return this.fetch(
      `${BASE_URL}/submissions/${formattedCik}.json`,
      EdgarSubmissionsSchema,
    )
  }

  async getCompanyFacts(cik: string): Promise<CompanyFacts> {
    const formattedCik = this.formatCik(cik)
    return this.fetch(
      `${BASE_URL}/api/xbrl/companyfacts/${formattedCik}.json`,
      CompanyFactsSchema,
    )
  }

  // Returns normalized filing records for the specified form types
  getRecentFilings(
    submissions: EdgarSubmissions,
    formTypes: string[] = ['10-K', '10-Q', '8-K'],
    limit = 20,
  ): NormalizedFiling[] {
    const { recent } = submissions.filings
    const results: NormalizedFiling[] = []

    for (let i = 0; i < recent.accessionNumber.length && results.length < limit; i++) {
      const form = recent.form[i]
      if (!form || !formTypes.includes(form)) continue

      const accn = recent.accessionNumber[i]
      const filed = recent.filingDate[i]
      const report = recent.reportDate[i]
      const doc = recent.primaryDocument[i]

      if (!accn || !filed || !doc) continue

      const cik = submissions.cik
      const accnFormatted = accn.replace(/-/g, '')
      const filingUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accnFormatted}/${doc}`

      results.push({
        accessionNumber: accn,
        formType: form,
        filingDate: new Date(filed),
        periodOfReport: report ? new Date(report) : null,
        primaryDocument: doc,
        filingUrl,
      })
    }

    return results
  }

  // Extract key financial metrics from XBRL facts for scoring
  extractFinancials(facts: CompanyFacts): ExtractedFinancials {
    const gaap = facts.facts['us-gaap']
    if (!gaap) return {}

    const result: ExtractedFinancials = {}

    // Helper: get the most recent annual value for a GAAP concept
    const getAnnual = (concept: string): { val: number; end: string } | null => {
      const data = gaap[concept]
      if (!data) return null

      const usdValues = data.units['USD']
      if (!usdValues) return null

      // Filter to 10-K filings with a period frame (annual)
      const annual = usdValues
        .filter((v) => v.form === '10-K' && v.end)
        .sort((a, b) => new Date(b.end!).getTime() - new Date(a.end!).getTime())

      return annual[0] ? { val: annual[0].val, end: annual[0].end! } : null
    }

    const revenue = getAnnual('Revenues') ?? getAnnual('RevenueFromContractWithCustomerExcludingAssessedTax')
    const priorRevenue = (() => {
      const concept = 'Revenues'
      const data = gaap[concept]
      if (!data) return null
      const usdValues = data.units['USD'] ?? []
      const annual = usdValues
        .filter((v) => v.form === '10-K' && v.end)
        .sort((a, b) => new Date(b.end!).getTime() - new Date(a.end!).getTime())
      return annual[1] ?? null
    })()

    if (revenue) {
      result.revenue = BigInt(Math.round(revenue.val * 100))
      result.periodEnd = new Date(revenue.end)

      if (priorRevenue && priorRevenue.val > 0) {
        result.revenueYoYChange = (revenue.val - priorRevenue.val) / priorRevenue.val
      }
    }

    const ocf = getAnnual('NetCashProvidedByUsedInOperatingActivities')
    if (ocf) result.operatingCashFlow = BigInt(Math.round(ocf.val * 100))

    const cash = getAnnual('CashAndCashEquivalentsAtCarryingValue')
    if (cash) result.cashAndEquivalents = BigInt(Math.round(cash.val * 100))

    const debt = getAnnual('LongTermDebt') ?? getAnnual('LongTermDebtNoncurrent')
    if (debt) result.totalDebt = BigInt(Math.round(debt.val * 100))

    const assets = getAnnual('Assets')
    if (assets) result.totalAssets = BigInt(Math.round(assets.val * 100))

    const liabilities = getAnnual('Liabilities')
    if (liabilities) result.totalLiabilities = BigInt(Math.round(liabilities.val * 100))

    const employees = gaap['EntityNumberOfEmployees']
    if (employees) {
      const empValues = employees.units['USD'] ?? employees.units['pure'] ?? []
      const sorted = empValues
        .filter((v) => v.form === '10-K')
        .sort((a, b) => new Date(b.end ?? '').getTime() - new Date(a.end ?? '').getTime())
      if (sorted[0]) result.reportedEmployees = Math.round(sorted[0].val)
    }

    return result
  }

  // Search for a company by name — returns CIK candidates
  async searchCompany(name: string): Promise<Array<{ cik: string; name: string; ticker: string }>> {
    await this.rateLimit()

    const url = `${SEARCH_URL}/LATEST/search-index?q=%22${encodeURIComponent(name)}%22&dateRange=custom&startdt=2020-01-01&forms=10-K`

    const res = await fetch(url, {
      headers: { 'User-Agent': this.userAgent, Accept: 'application/json' },
    })

    if (!res.ok) return []

    const json = (await res.json()) as {
      hits?: { hits?: Array<{ _source?: { entity_name?: string; file_num?: string } }> }
    }

    const hits = json.hits?.hits ?? []
    const seen = new Set<string>()
    const results: Array<{ cik: string; name: string; ticker: string }> = []

    for (const hit of hits) {
      const source = hit._source
      if (!source?.entity_name || !source.file_num) continue
      const cik = source.file_num.replace(/\D/g, '')
      if (seen.has(cik)) continue
      seen.add(cik)
      results.push({ cik, name: source.entity_name, ticker: '' })
    }

    return results.slice(0, 10)
  }
}

export class EdgarError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly url: string,
  ) {
    super(message)
    this.name = 'EdgarError'
  }
}

// Factory — reads config from environment
export function createEdgarClient(): EdgarClient {
  const userAgent = process.env['SEC_EDGAR_USER_AGENT']
  if (!userAgent) {
    throw new Error('SEC_EDGAR_USER_AGENT environment variable is required')
  }
  return new EdgarClient({ userAgent })
}
