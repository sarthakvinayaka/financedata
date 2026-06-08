// @joinsafe/providers — SEC EDGAR sub-module exports

export { OfficialSecEdgarProvider, createSecProvider } from './sec-provider'
export { normalizeCik, formatCikForUrl, buildDocumentUrl, lookupCikByTicker, clearTickerCache } from './cik'
export { extractFinancials, getAnnualValues, calcYoY } from './extraction'
export { scanText, scanFilingHtml, stripHtml, summarizeHits } from './phrase-scanner'
export { SecHttpError, SecNotFoundError, SecRateLimitError } from './http-client'

export type {
  SecProvider,
  SecSubmissionsResponse,
  SecCompanyFactsResponse,
  SecCompanyConceptResponse,
  SecCompanyProfile,
  NormalizedFiling,
  ExtractedFinancials,
  PhraseScanResult,
  NegativePhraseHit,
  FilingListOptions,
} from './types'
