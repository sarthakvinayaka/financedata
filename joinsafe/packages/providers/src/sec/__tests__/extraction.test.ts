import { describe, it, expect } from 'vitest'
import { extractFinancials, getAnnualValues, calcYoY } from '../extraction'
import type { SecCompanyFactsResponse, NormalizedFiling } from '../types'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeFilingValue(
  end: string,
  val: number,
  form = '10-K',
  fp = 'FY',
  filed = '2024-02-15',
): import('../types').SecUnitValue {
  return { end, val, form, fp, filed, accn: '0001234567-24-000001' }
}

const SAMPLE_FACTS: SecCompanyFactsResponse = {
  cik: 1234567,
  entityName: 'Acme Corp',
  facts: {
    'us-gaap': {
      // Revenue — two annual values for YoY calculation
      Revenues: {
        label: 'Revenues',
        units: {
          USD: [
            makeFilingValue('2022-12-31', 1_000_000_000, '10-K', 'FY', '2023-02-01'),
            makeFilingValue('2023-12-31',   860_000_000, '10-K', 'FY', '2024-02-01'),
            // Quarterly — should NOT be included in annual extraction
            makeFilingValue('2023-03-31',   210_000_000, '10-Q', 'Q1', '2023-04-15'),
          ],
        },
      },
      // Net income — negative (loss)
      NetIncomeLoss: {
        label: 'Net Income (Loss)',
        units: {
          USD: [
            makeFilingValue('2022-12-31',  50_000_000),
            makeFilingValue('2023-12-31', -80_000_000),
          ],
        },
      },
      // Operating cash flow — negative (burning cash)
      NetCashProvidedByUsedInOperatingActivities: {
        label: 'Operating Cash Flow',
        units: {
          USD: [
            makeFilingValue('2023-12-31', -120_000_000),
          ],
        },
      },
      // Cash — use most recent (could be from 10-Q)
      CashAndCashEquivalentsAtCarryingValue: {
        label: 'Cash',
        units: {
          USD: [
            makeFilingValue('2023-12-31', 200_000_000, '10-K'),
            makeFilingValue('2024-03-31',  95_000_000, '10-Q', 'Q1', '2024-04-30'),
          ],
        },
      },
      // Debt
      LongTermDebtNoncurrent: {
        label: 'Long-Term Debt',
        units: { USD: [makeFilingValue('2023-12-31', 300_000_000)] },
      },
      ShortTermBorrowings: {
        label: 'Short-Term Borrowings',
        units: { USD: [makeFilingValue('2023-12-31', 50_000_000)] },
      },
      // Total assets
      Assets: {
        label: 'Assets',
        units: { USD: [makeFilingValue('2023-12-31', 900_000_000)] },
      },
    },
    dei: {
      EntityNumberOfEmployees: {
        label: 'Number of Employees',
        units: {
          pure: [makeFilingValue('2023-12-31', 4800)],
        },
      },
    },
  },
}

const SAMPLE_FILINGS: NormalizedFiling[] = [
  {
    accessionNumber:    '0001234567-24-000001',
    formType:           '10-K',
    filingDate:         new Date('2024-02-01'),
    reportDate:         new Date('2023-12-31'),
    primaryDocument:    'acme-20231231.htm',
    isXBRL:             true,
    isInlineXBRL:       true,
    filingIndexUrl:     'https://www.sec.gov/Archives/edgar/data/1234567/...',
    primaryDocumentUrl: 'https://www.sec.gov/Archives/edgar/data/1234567/.../acme-20231231.htm',
  },
]

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('getAnnualValues', () => {
  const gaap = SAMPLE_FACTS.facts['us-gaap']!

  it('returns only 10-K FY values sorted newest-first', () => {
    const values = getAnnualValues(gaap, 'Revenues', 3)
    // Should exclude the Q1 quarterly value
    expect(values.length).toBe(2)
    expect(values[0]!.end).toBe('2023-12-31')   // newest
    expect(values[1]!.end).toBe('2022-12-31')
  })

  it('returns empty array for unknown tag', () => {
    expect(getAnnualValues(gaap, 'NonExistentTag')).toEqual([])
  })

  it('respects the n limit', () => {
    expect(getAnnualValues(gaap, 'Revenues', 1)).toHaveLength(1)
  })
})

describe('calcYoY', () => {
  it('calculates negative YoY correctly', () => {
    const yoy = calcYoY(860_000_000, 1_000_000_000)
    expect(yoy).toBeCloseTo(-0.14, 2)
  })

  it('calculates positive YoY correctly', () => {
    expect(calcYoY(110, 100)).toBeCloseTo(0.10, 4)
  })

  it('returns null when prior is zero', () => {
    expect(calcYoY(100, 0)).toBeNull()
  })

  it('handles negative → positive correctly', () => {
    // -50 to +50 = improvement; absolute prior = 50
    expect(calcYoY(50, -50)).toBeCloseTo(2.0, 4)
  })
})

describe('extractFinancials', () => {
  const result = extractFinancials(SAMPLE_FACTS, SAMPLE_FILINGS)

  it('extracts revenue from the most recent annual period', () => {
    expect(result.revenue).toBe(860_000_000)
  })

  it('calculates revenue YoY change', () => {
    expect(result.revenueYoY).toBeCloseTo(-0.14, 2)
  })

  it('captures prior year revenue for context', () => {
    expect(result.revenuePrior).toBe(1_000_000_000)
  })

  it('extracts net income (negative — loss)', () => {
    expect(result.netIncome).toBe(-80_000_000)
  })

  it('calculates net income YoY', () => {
    // From 50M to -80M: (-80M - 50M) / |50M| = -2.6
    expect(result.netIncomeYoY).toBeCloseTo(-2.6, 1)
  })

  it('extracts operating cash flow (negative)', () => {
    expect(result.operatingCashFlow).toBe(-120_000_000)
  })

  it('extracts the most recent cash balance (10-Q takes precedence when newer)', () => {
    // 10-Q filed 2024-03-31 is more recent than 10-K 2023-12-31
    expect(result.cashAndEquivalents).toBe(95_000_000)
  })

  it('extracts long-term debt', () => {
    expect(result.longTermDebt).toBe(300_000_000)
  })

  it('extracts short-term debt', () => {
    expect(result.shortTermDebt).toBe(50_000_000)
  })

  it('sums total debt from long-term + short-term', () => {
    expect(result.totalDebt).toBe(350_000_000)
  })

  it('extracts total assets', () => {
    expect(result.totalAssets).toBe(900_000_000)
  })

  it('extracts employee count from DEI taxonomy', () => {
    expect(result.reportedEmployees).toBe(4800)
  })

  it('sets periodEnd from the most recent revenue period', () => {
    expect(result.periodEnd).toEqual(new Date('2023-12-31'))
  })

  it('calculates filing recency in days', () => {
    const expectedDays = Math.floor(
      (Date.now() - new Date('2024-02-01').getTime()) / (1000 * 60 * 60 * 24),
    )
    // Allow ±1 day for test timing
    expect(result.filingRecencyDays).toBeGreaterThanOrEqual(expectedDays - 1)
  })

  it('returns empty object for a company with no XBRL data', () => {
    const emptyFacts: SecCompanyFactsResponse = {
      cik: 9999,
      entityName: 'Private Co',
      facts: {},
    }
    const empty = extractFinancials(emptyFacts, [])
    expect(empty.revenue).toBeUndefined()
    expect(empty.operatingCashFlow).toBeUndefined()
  })
})
