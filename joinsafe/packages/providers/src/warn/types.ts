// WARN provider types
//
// The federal WARN Act requires 60-day advance notice for mass layoffs.
// Each state maintains its own notice database — there is no federal aggregation.
// States vary significantly in format: some publish CSVs, some PDFs, some HTML tables.
// This interface defines the canonical normalized record that all state parsers
// must produce, regardless of source format.

import { z } from 'zod'

export const WarnNoticeTypeSchema = z.enum(['LAYOFF', 'PLANT_CLOSING', 'RELOCATION'])
export type WarnNoticeType = z.infer<typeof WarnNoticeTypeSchema>

export const RawWarnRecordSchema = z.object({
  employerName: z.string().min(1),
  state: z.string().length(2), // 2-letter USPS code
  city: z.string().optional(),
  county: z.string().optional(),
  zip: z.string().optional(),
  noticeDate: z.date(),
  layoffDate: z.date().optional(),
  affectedWorkers: z.number().int().min(0),
  noticeType: WarnNoticeTypeSchema,
  isTemporary: z.boolean().default(false),
  sourceState: z.string().length(2),
  sourceUrl: z.string().url().optional(),
  sourceRowId: z.string(), // Stable ID for deduplication
  rawData: z.record(z.string(), z.unknown()), // Original row for audit
})
export type RawWarnRecord = z.infer<typeof RawWarnRecordSchema>

export interface WarnStateParser {
  stateCode: string // 2-letter USPS code
  stateName: string
  sourceUrl: string
  // Fetches and parses all available records from the state source
  fetchRecords(options?: FetchOptions): Promise<RawWarnRecord[]>
}

export interface FetchOptions {
  since?: Date
  signal?: AbortSignal
}

export interface WarnIngestionResult {
  stateCode: string
  fetched: number
  created: number
  skipped: number
  errors: string[]
}
