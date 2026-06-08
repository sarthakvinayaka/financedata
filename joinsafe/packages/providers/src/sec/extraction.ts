// XBRL financial metric extraction
//
// Pure functions — no I/O, no side effects. Takes a SecCompanyFactsResponse
// and returns structured ExtractedFinancials. All math happens here.
//
// Design notes:
//  - Each financial concept maps to multiple possible XBRL tag names because
//    companies don't consistently use the same tag. We try aliases in priority
//    order and use the first one with annual (10-K FY) data.
//  - Monetary values are returned as plain numbers in USD (not cents / BigInt).
//    The DB layer converts to whatever precision the schema requires.
//  - We only use full-year (fp === 'FY') 10-K values for annual metrics so
//    trailing-twelve-month calculations don't mix quarterly and annual data.

import type {
  SecCompanyFactsResponse,
  SecUnitValue,
  ExtractedFinancials,
  NormalizedFiling,
} from './types'

// ── XBRL concept aliases ─────────────────────────────────────────────────────
// Ordered by prevalence. The first alias with data wins.

const REVENUE_TAGS = [
  'Revenues',
  'RevenueFromContractWithCustomerExcludingAssessedTax',
  'RevenueFromContractWithCustomerIncludingAssessedTax',
  'SalesRevenueNet',
  'SalesRevenueGoodsNet',
  'RevenuesNetOfInterestExpense',
]

const NET_INCOME_TAGS = [
  'NetIncomeLoss',
  'ProfitLoss',
  'NetIncomeLossAvailableToCommonStockholdersBasic',
  'IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest',
]

const CASH_TAGS = [
  'CashAndCashEquivalentsAtCarryingValue',
  'CashCashEquivalentsAndShortTermInvestments',
  'CashAndCashEquivalentsPeriodIncreaseDecrease',
]

const OPERATING_CF_TAGS = [
  'NetCashProvidedByUsedInOperatingActivities',
  'NetCashProvidedByUsedInOperatingActivitiesContinuingOperations',
]

const LONG_TERM_DEBT_TAGS = [
  'LongTermDebtNoncurrent',
  'LongTermDebt',
  'LongTermDebtAndCapitalLeaseObligations',
  'LongTermNotesPayable',
]

const SHORT_TERM_DEBT_TAGS = [
  'ShortTermBorrowings',
  'DebtCurrent',
  'NotesPayableCurrent',
  'LongTermDebtCurrent',
]

const TOTAL_ASSETS_TAGS = ['Assets']

const EMPLOYEES_TAGS = [
  'EntityNumberOfEmployees',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

type GaapFacts = NonNullable<SecCompanyFactsResponse['facts']['us-gaap']>
type DeiFacts  = NonNullable<SecCompanyFactsResponse['facts']['dei']>

/**
 * Get the most recent annual (10-K FY) values for a concept.
 * Returns at most `n` values sorted newest-first.
 */
export function getAnnualValues(
  facts: GaapFacts | DeiFacts,
  tag: string,
  n = 2,
): SecUnitValue[] {
  const concept = facts[tag]
  if (!concept) return []

  // Prefer USD; fall back to 'pure' (used for employee counts etc.)
  const values = concept.units['USD'] ?? concept.units['pure'] ?? []

  return values
    .filter((v) => v.form === '10-K' && (v.fp === 'FY' || v.fp === undefined))
    .sort((a, b) => new Date(b.end).getTime() - new Date(a.end).getTime())
    .slice(0, n)
}

/**
 * Try concept aliases in order; return the first set of annual values found.
 */
function tryAliases(facts: GaapFacts, tags: string[]): SecUnitValue[] {
  for (const tag of tags) {
    const values = getAnnualValues(facts, tag)
    if (values.length > 0) return values
  }
  return []
}

/** Calculate fractional YoY change. Returns null if either value is zero/undefined. */
export function calcYoY(current: number, prior: number): number | null {
  if (!prior) return null
  return (current - prior) / Math.abs(prior)
}

/** Round to nearest dollar (remove float noise). */
function usd(val: number): number {
  return Math.round(val)
}

// ── Main extraction function ──────────────────────────────────────────────────

export function extractFinancials(
  facts: SecCompanyFactsResponse,
  filings: NormalizedFiling[],
): ExtractedFinancials {
  const gaap = facts.facts['us-gaap'] ?? {}
  const dei  = facts.facts['dei'] ?? {}

  const result: ExtractedFinancials = {}

  // ── Revenue ────────────────────────────────────────────────────────────────
  const revenueValues = tryAliases(gaap, REVENUE_TAGS)
  if (revenueValues.length >= 1) {
    const current = revenueValues[0]!
    result.revenue    = usd(current.val)
    result.periodEnd  = new Date(current.end)

    if (revenueValues.length >= 2) {
      const prior = revenueValues[1]!
      result.revenuePrior = usd(prior.val)
      result.revenueYoY   = calcYoY(current.val, prior.val) ?? undefined
    }
  }

  // ── Net income ─────────────────────────────────────────────────────────────
  const netIncomeValues = tryAliases(gaap, NET_INCOME_TAGS)
  if (netIncomeValues.length >= 1) {
    result.netIncome = usd(netIncomeValues[0]!.val)
    if (netIncomeValues.length >= 2) {
      result.netIncomeYoY = calcYoY(
        netIncomeValues[0]!.val,
        netIncomeValues[1]!.val,
      ) ?? undefined
    }
  }

  // ── Cash and cash equivalents ──────────────────────────────────────────────
  // This is a balance-sheet (instantaneous) value, so we use the most recent
  // value regardless of form (could be 10-K or 10-Q)
  for (const tag of CASH_TAGS) {
    const concept = gaap[tag]
    if (!concept) continue
    const values = (concept.units['USD'] ?? [])
      .filter((v) => ['10-K', '10-Q'].includes(v.form))
      .sort((a, b) => new Date(b.end).getTime() - new Date(a.end).getTime())
    if (values[0]) {
      result.cashAndEquivalents = usd(values[0].val)
      break
    }
  }

  // ── Operating cash flow ────────────────────────────────────────────────────
  const ocfValues = tryAliases(gaap, OPERATING_CF_TAGS)
  if (ocfValues.length >= 1) {
    result.operatingCashFlow = usd(ocfValues[0]!.val)
  }

  // ── Debt ───────────────────────────────────────────────────────────────────
  const ltdValues = tryAliases(gaap, LONG_TERM_DEBT_TAGS)
  if (ltdValues[0]) {
    result.longTermDebt = usd(ltdValues[0].val)
  }

  const stdValues = tryAliases(gaap, SHORT_TERM_DEBT_TAGS)
  if (stdValues[0]) {
    result.shortTermDebt = usd(stdValues[0].val)
  }

  if (result.longTermDebt !== undefined || result.shortTermDebt !== undefined) {
    result.totalDebt = usd((result.longTermDebt ?? 0) + (result.shortTermDebt ?? 0))
  }

  // ── Total assets ───────────────────────────────────────────────────────────
  const assetsValues = tryAliases(gaap, TOTAL_ASSETS_TAGS)
  if (assetsValues[0]) {
    result.totalAssets = usd(assetsValues[0].val)
  }

  // ── Employee count ─────────────────────────────────────────────────────────
  // EntityNumberOfEmployees is in the DEI taxonomy, not us-gaap
  for (const tag of EMPLOYEES_TAGS) {
    const concept = dei[tag] ?? gaap[tag]
    if (!concept) continue
    const values = ((concept.units['USD'] ?? concept.units['pure']) ?? [])
      .filter((v) => v.form === '10-K')
      .sort((a, b) => new Date(b.end).getTime() - new Date(a.end).getTime())
    if (values[0]) {
      result.reportedEmployees = Math.round(values[0].val)
      break
    }
  }

  // ── Filing recency ────────────────────────────────────────────────────────
  const latest10K = filings
    .filter((f) => f.formType === '10-K')
    .sort((a, b) => b.filingDate.getTime() - a.filingDate.getTime())[0]

  if (latest10K) {
    result.latestFilingDate  = latest10K.filingDate
    result.filingRecencyDays = Math.floor(
      (Date.now() - latest10K.filingDate.getTime()) / (1000 * 60 * 60 * 24),
    )
  }

  return result
}
