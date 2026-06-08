// WARN provider types
//
// RawWarnRecord is the normalized output of every state parser.
// It maps to SourceDocument + LayoffEvent in the database layer.
// Parsers own only fetching and normalization — no DB access.

import { z } from 'zod'

export const RawWarnRecordSchema = z.object({
  employerName:     z.string().min(1),
  state:            z.string().length(2),
  city:             z.string().optional(),
  county:           z.string().optional(),
  zip:              z.string().optional(),
  noticeDate:       z.date(),
  layoffDate:       z.date().optional(),
  affectedWorkers:  z.number().int().min(0),
  isTemporary:      z.boolean().default(false),
  // Source provenance
  sourceState:   z.string().length(2),
  sourceUrl:     z.string().url().optional(),
  sourceRowId:   z.string(),  // Stable dedup key (state row ID or hash)
  rawData:       z.record(z.string(), z.unknown()),
})
export type RawWarnRecord = z.infer<typeof RawWarnRecordSchema>

export interface WarnStateParser {
  stateCode: string
  stateName: string
  sourceUrl: string
  fetchRecords(options?: FetchOptions): Promise<RawWarnRecord[]>
}

export interface FetchOptions {
  since?: Date
  signal?: AbortSignal
}

export interface WarnIngestionResult {
  stateCode: string
  fetched:   number
  created:   number
  skipped:   number
  errors:    string[]
}
