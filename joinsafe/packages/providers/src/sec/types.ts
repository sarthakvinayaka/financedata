// SEC EDGAR API response types
//
// EDGAR's public REST API (data.sec.gov) is used for:
//  - Company submissions metadata: /submissions/CIK{cik}.json
//  - XBRL financial data: /api/xbrl/companyfacts/CIK{cik}.json
//  - Full-text search: efts.sec.gov/LATEST/search-index
//
// All types are inferred from the actual EDGAR API response structure.
// BigInt is used where EDGAR returns large integer values for financial data.

import { z } from 'zod'

export const EdgarSubmissionsSchema = z.object({
  cik: z.string(),
  entityType: z.string().optional(),
  sic: z.string().optional(),
  sicDescription: z.string().optional(),
  name: z.string(),
  tickers: z.array(z.string()),
  exchanges: z.array(z.string()),
  ein: z.string().optional(),
  stateOfIncorporation: z.string().optional(),
  stateOfIncorporationDescription: z.string().optional(),
  addresses: z.object({
    mailing: z.object({
      street1: z.string().optional(),
      street2: z.string().optional(),
      city: z.string().optional(),
      stateOrCountry: z.string().optional(),
      zipCode: z.string().optional(),
    }).optional(),
    business: z.object({
      street1: z.string().optional(),
      street2: z.string().optional(),
      city: z.string().optional(),
      stateOrCountry: z.string().optional(),
      zipCode: z.string().optional(),
    }).optional(),
  }).optional(),
  filings: z.object({
    recent: z.object({
      accessionNumber: z.array(z.string()),
      filingDate: z.array(z.string()),
      form: z.array(z.string()),
      reportDate: z.array(z.string()),
      primaryDocument: z.array(z.string()),
    }),
  }),
})
export type EdgarSubmissions = z.infer<typeof EdgarSubmissionsSchema>

// XBRL company facts — financial data by taxonomy concept
export const XbrlValueSchema = z.object({
  end: z.string().optional(),
  val: z.number(),
  accn: z.string(),
  form: z.string(),
  filed: z.string(),
  frame: z.string().optional(),
})
export type XbrlValue = z.infer<typeof XbrlValueSchema>

export const CompanyFactsSchema = z.object({
  cik: z.number(),
  entityName: z.string(),
  facts: z.object({
    'us-gaap': z.record(
      z.string(),
      z.object({
        label: z.string(),
        description: z.string().optional(),
        units: z.record(z.string(), z.array(XbrlValueSchema)),
      }),
    ).optional(),
  }),
})
export type CompanyFacts = z.infer<typeof CompanyFactsSchema>

// Normalized filing record returned by the EDGAR client
export interface NormalizedFiling {
  accessionNumber: string
  formType: string
  filingDate: Date
  periodOfReport: Date | null
  primaryDocument: string
  filingUrl: string
}

// Normalized financial snapshot extracted from XBRL data
export interface ExtractedFinancials {
  revenue?: bigint
  revenueYoYChange?: number
  operatingCashFlow?: bigint
  cashAndEquivalents?: bigint
  totalDebt?: bigint
  totalAssets?: bigint
  totalLiabilities?: bigint
  reportedEmployees?: number
  periodEnd?: Date
}
