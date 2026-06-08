// SEC EDGAR API — typed response models
//
// Shapes are modeled directly from the official EDGAR REST API responses.
// Field names intentionally mirror the API (e.g. cik_str, fp, fy) so that
// raw payloads can be stored verbatim and cross-referenced without translation.
//
// Docs: https://www.sec.gov/edgar/sec-api-documentation

// ── Submissions API: data.sec.gov/submissions/CIK##########.json ─────────────

export interface SecSubmissionsResponse {
  cik: string
  entityType?: string
  sic?: string
  sicDescription?: string
  insiderTransactionForOwnerExists?: number
  insiderTransactionForIssuerExists?: number
  name: string
  tickers: string[]
  exchanges: string[]
  ein?: string
  description?: string
  website?: string
  investorWebsite?: string
  category?: string
  fiscalYearEnd?: string     // e.g. "1231" = December 31
  stateOfIncorporation?: string
  stateOfIncorporationDescription?: string
  phone?: string
  addresses?: {
    mailing?: SecAddress
    business?: SecAddress
  }
  filings: {
    recent: SecRecentFilings
    files: SecFilingsFile[]   // Additional pages of older filings
  }
}

export interface SecAddress {
  street1?: string
  street2?: string
  city?: string
  stateOrCountry?: string
  stateOrCountryDescription?: string
  zipCode?: string
}

// Parallel arrays — index N in each array corresponds to the same filing.
export interface SecRecentFilings {
  accessionNumber:      string[]   // "0000320193-24-000006"
  filingDate:           string[]   // "2024-02-02"
  reportDate:           string[]   // "2023-12-30" — period end date
  acceptanceDateTime:   string[]   // "2024-02-02T18:02:13.000Z"
  act:                  string[]
  form:                 string[]   // "10-K" | "10-Q" | "8-K" | etc.
  fileNumber:           string[]
  filmNumber:           string[]
  items:                string[]
  size:                 number[]
  isXBRL:               number[]   // 0 or 1
  isInlineXBRL:         number[]   // 0 or 1
  primaryDocument:      string[]   // e.g. "aapl-20231230.htm"
  primaryDocDescription: string[]
}

export interface SecFilingsFile {
  name:         string   // "CIK0000320193-submissions-001.json"
  filingCount:  number
  filingFrom:   string   // "1993-01-15"
  filingTo:     string
}

// ── Company Facts API: data.sec.gov/api/xbrl/companyfacts/CIK##########.json ─

export interface SecCompanyFactsResponse {
  cik: number
  entityName: string
  facts: {
    'us-gaap'?: SecTaxonomyFacts
    dei?: SecTaxonomyFacts
    ifrs?: SecTaxonomyFacts
  }
}

// A taxonomy (us-gaap, dei) maps tag names to concept data
export type SecTaxonomyFacts = Record<string, SecConceptData>

export interface SecConceptData {
  label: string
  description?: string
  units: Record<string, SecUnitValue[]>
}

export interface SecUnitValue {
  start?: string   // Period start (duration concepts only, e.g. revenue)
  end:    string   // Period end date — "2023-12-31"
  val:    number
  accn:   string   // Accession number — links back to a specific filing
  fy?:    number   // Fiscal year
  fp?:    string   // Fiscal period: "FY" | "Q1" | "Q2" | "Q3" | "Q4" | "H1" | "H2"
  form:   string   // "10-K" | "10-Q" | "8-K" | etc.
  filed:  string   // Filing date
  frame?: string   // EDGAR frame identifier, e.g. "CY2023Q4I"
}

// ── Company Concept API ────────────────────────────────────────────────────────
// data.sec.gov/api/xbrl/companyconcept/CIK##########/{taxonomy}/{tag}.json

export interface SecCompanyConceptResponse {
  cik:          number
  taxonomy:     string
  tag:          string
  label:        string
  description:  string
  entityName:   string
  units: Record<string, SecUnitValue[]>
}

// ── Ticker registry: www.sec.gov/files/company_tickers.json ─────────────────

export interface SecTickerEntry {
  cik_str: number
  ticker:  string
  title:   string
}

export type SecTickerIndex = Record<string, SecTickerEntry>

// ── Normalized / extracted shapes (our internal domain types) ─────────────────

export interface NormalizedFiling {
  accessionNumber:    string  // Canonical with dashes: "0000320193-24-000006"
  formType:           string
  filingDate:         Date
  reportDate:         Date | null
  primaryDocument:    string
  isXBRL:             boolean
  isInlineXBRL:       boolean
  filingIndexUrl:     string   // https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&...
  primaryDocumentUrl: string   // https://www.sec.gov/Archives/edgar/data/{cik}/{accn}/{doc}
}

export interface ExtractedFinancials {
  // Revenue
  revenue?:       number    // USD — most recent annual (10-K FY)
  revenueYoY?:    number    // Fractional: -0.14 = -14%
  revenuePrior?:  number    // Prior year, for display context

  // Profitability
  netIncome?:     number
  netIncomeYoY?:  number

  // Cash
  cashAndEquivalents?: number

  // Cash generation
  operatingCashFlow?:  number

  // Debt & leverage
  longTermDebt?:  number
  shortTermDebt?: number
  totalDebt?:     number    // = longTermDebt + shortTermDebt when both available

  // Size
  totalAssets?:   number
  reportedEmployees?: number

  // Metadata
  periodEnd?:          Date    // End date of most recent annual period
  latestFilingDate?:   Date    // When the most recent 10-K was filed
  filingRecencyDays?:  number  // Days since most recent 10-K
}

// ── Phrase scanning ───────────────────────────────────────────────────────────

export const NEGATIVE_PHRASE_CATEGORIES = {
  RESTRUCTURING:          'Restructuring',
  WORKFORCE_REDUCTION:    'Workforce Reduction',
  COST_REDUCTION:         'Cost Reduction',
  MARGIN_PRESSURE:        'Margin Pressure',
  FACILITY_CLOSURE:       'Facility Closure',
  PROFITABILITY_PRESSURE: 'Profitability Pressure',
} as const

export type NegativePhraseCategory = keyof typeof NEGATIVE_PHRASE_CATEGORIES

export interface NegativePhraseHit {
  phraseId:  string                  // Stable slug: "workforce_reduction"
  pattern:   string                  // The phrase/pattern that matched
  category:  NegativePhraseCategory
  context:   string                  // ~300 chars around the hit
  count:     number                  // Total occurrences in this document
}

export interface PhraseScanResult {
  accessionNumber: string
  formType:        string
  filingDate:      Date
  hits:            NegativePhraseHit[]
  textLengthChars: number
  scannedAt:       Date
  error?:          string            // Set if text fetch failed (non-fatal)
}

// ── Full company profile (provider output) ───────────────────────────────────

export interface SecCompanyProfile {
  cik:                  string
  name:                 string
  ticker?:              string
  exchange?:            string
  sic?:                 string
  sicDescription?:      string
  stateOfIncorporation?: string
  ein?:                 string
  address?:             SecAddress
  filings:              NormalizedFiling[]
  financials:           ExtractedFinancials
  phraseScanResults:    PhraseScanResult[]
  // Raw payloads — persisted verbatim to SourceDocument.rawData
  rawSubmissions:       SecSubmissionsResponse
  rawFacts:             SecCompanyFactsResponse | null
}

// ── Provider interface ────────────────────────────────────────────────────────

export interface FilingListOptions {
  formTypes?: string[]    // Default: ['10-K', '10-Q', '8-K']
  limit?:     number      // Max filings to return
  since?:     Date        // Only filings after this date
}

export interface SecProvider {
  // Core EDGAR data fetching
  getSubmissions(cik: string): Promise<SecSubmissionsResponse>
  getCompanyFacts(cik: string): Promise<SecCompanyFactsResponse>
  getCompanyConcept(cik: string, taxonomy: string, tag: string): Promise<SecCompanyConceptResponse>

  // CIK resolution
  lookupCikByTicker(ticker: string): Promise<string | null>

  // Normalized filing list
  listFilings(submissions: SecSubmissionsResponse, options?: FilingListOptions): NormalizedFiling[]

  // Financial metric extraction
  extractFinancials(facts: SecCompanyFactsResponse, filings: NormalizedFiling[]): ExtractedFinancials

  // Negative phrase scanning (fetches and scans filing text)
  scanFiling(cik: string, filing: NormalizedFiling): Promise<PhraseScanResult>

  // Full pipeline: returns everything needed for DB writes
  fetchCompanyProfile(cik: string): Promise<SecCompanyProfile>
}
