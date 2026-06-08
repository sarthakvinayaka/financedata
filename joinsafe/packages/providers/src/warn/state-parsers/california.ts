// California WARN Act parser
//
// California EDD publishes WARN notices as downloadable Excel files (.xlsx)
// organized by year. This parser fetches the current-year file and normalizes
// each row to RawWarnRecord format.
//
// Source: https://edd.ca.gov/en/Jobs_and_Training/Layoff_Services_WARN
// File format: Excel with columns [Date, Employer, No. Of Employees, Layoff/Closure Date,
//              Received Date, County, City, Industry, Closure/Layoff]
//
// Note: California's XLSX format changes occasionally. The column mapping below
// reflects the structure as of 2024. If parsing fails, check for format changes.

import type { WarnStateParser, RawWarnRecord, FetchOptions } from '../types'
import { createHash } from 'crypto'

// XLSX parsing requires an optional dependency — import dynamically so the
// package can be loaded without it (other parsers may not need it).
async function parseXlsx(buffer: ArrayBuffer): Promise<Record<string, string>[]> {
  const xlsx = await import('xlsx').catch(() => {
    throw new Error(
      'xlsx package required for California WARN parser. Run: pnpm add xlsx',
    )
  })
  const workbook = xlsx.read(Buffer.from(buffer), { type: 'buffer', cellDates: true })
  const sheet = workbook.Sheets[workbook.SheetNames[0]!]!
  return xlsx.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' })
}

function parseDate(raw: unknown): Date | undefined {
  if (!raw) return undefined
  if (raw instanceof Date) return raw
  const parsed = new Date(String(raw))
  return isNaN(parsed.getTime()) ? undefined : parsed
}

function parseWorkers(raw: string): number {
  const cleaned = String(raw).replace(/[^\d]/g, '')
  const n = parseInt(cleaned, 10)
  return isNaN(n) ? 0 : n
}

export class CaliforniaWarnParser implements WarnStateParser {
  stateCode = 'CA'
  stateName = 'California'
  sourceUrl = 'https://edd.ca.gov/en/Jobs_and_Training/Layoff_Services_WARN'

  private get xlsxUrl(): string {
    const year = new Date().getFullYear()
    return `https://edd.ca.gov/siteassets/files/jobs_and_training/warn/${year}warn.xlsx`
  }

  async fetchRecords(_options?: FetchOptions): Promise<RawWarnRecord[]> {
    const res = await fetch(this.xlsxUrl, {
      headers: { 'User-Agent': 'JoinSafe/1.0 contact@joinsafe.com' },
      signal: _options?.signal,
    })

    if (!res.ok) {
      throw new Error(`California WARN fetch failed: ${res.status} ${res.statusText}`)
    }

    const buffer = await res.arrayBuffer()
    const rows = await parseXlsx(buffer)
    const records: RawWarnRecord[] = []

    for (const row of rows) {
      const employerName = (row['Employer'] ?? row['Company'] ?? '').trim()
      if (!employerName) continue

      const noticeDateRaw = row['Notice Date'] ?? row['Received Date'] ?? ''
      const noticeDate = parseDate(noticeDateRaw)
      if (!noticeDate) continue

      const affectedWorkers = parseWorkers(row['No. Of Employees'] ?? row['Employees Affected'] ?? '0')
      if (affectedWorkers < 1) continue

      const rawData: Record<string, unknown> = { ...row }
      const rowHash = createHash('sha256')
        .update(`CA-${employerName}-${noticeDate.toISOString()}-${affectedWorkers}`)
        .digest('hex')
        .slice(0, 16)

      const layoffDateRaw = row['Layoff/Closure Date'] ?? row['Effective Date'] ?? ''

      const noticeTypeRaw = (row['Closure/Layoff'] ?? row['Type'] ?? '').toLowerCase()
      const noticeType = noticeTypeRaw.includes('clos')
        ? ('PLANT_CLOSING' as const)
        : noticeTypeRaw.includes('reloc')
          ? ('RELOCATION' as const)
          : ('LAYOFF' as const)

      records.push({
        employerName,
        state: 'CA',
        city: (row['City'] ?? '').trim() || undefined,
        county: (row['County'] ?? '').trim() || undefined,
        noticeDate,
        layoffDate: parseDate(layoffDateRaw),
        affectedWorkers,
        noticeType,
        isTemporary: false,
        sourceState: 'CA',
        sourceUrl: this.xlsxUrl,
        sourceRowId: rowHash,
        rawData,
      })
    }

    return records
  }
}
