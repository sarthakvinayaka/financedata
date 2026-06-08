// @joinsafe/providers
//
// Data acquisition layer — no business logic, no DB access.
// Providers fetch and normalize raw data from external sources.
// The worker orchestrates providers → DB writes.

// ── SEC EDGAR ─────────────────────────────────────────────────────────────────
export * from './sec/index'

// ── WARN Act ─────────────────────────────────────────────────────────────────
export { WarnClient, createWarnClient } from './warn/warn-client'
export { getParser, getSupportedStates, STATE_PARSERS } from './warn/state-parsers'
export type { RawWarnRecord, WarnStateParser, WarnIngestionResult } from './warn/types'
