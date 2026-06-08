// @joinsafe/providers
//
// This package owns all external data acquisition:
//  - SEC EDGAR: company submissions, XBRL financial data
//  - WARN Act: state-by-state layoff notice ingestion
//
// Providers return raw/normalized records. They have no knowledge of the DB
// schema or risk scoring — they only fetch and normalize data. The worker
// orchestrates providers → DB writes → scoring runs.

export { EdgarClient, createEdgarClient, EdgarError } from './sec/edgar-client'
export type { NormalizedFiling, ExtractedFinancials } from './sec/types'

export { WarnClient, createWarnClient } from './warn/warn-client'
export { getParser, getSupportedStates, STATE_PARSERS } from './warn/state-parsers'
export type { RawWarnRecord, WarnStateParser, WarnIngestionResult } from './warn/types'
