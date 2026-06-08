import { describe, it, expect } from 'vitest'
import {
  normalizeCik,
  formatCikForUrl,
  accessionToPath,
  buildDocumentUrl,
  buildFilingIndexUrl,
} from '../cik'

describe('normalizeCik', () => {
  it('pads a short numeric string to 10 digits', () => {
    expect(normalizeCik('320193')).toBe('0000320193')
  })

  it('accepts a number and pads it', () => {
    expect(normalizeCik(320193)).toBe('0000320193')
  })

  it('passes through an already-padded 10-digit string', () => {
    expect(normalizeCik('0000320193')).toBe('0000320193')
  })

  it('strips non-digit characters from the input', () => {
    expect(normalizeCik('CIK0000320193')).toBe('0000320193')
  })

  it('handles single-digit CIK', () => {
    expect(normalizeCik('1')).toBe('0000000001')
  })

  it('throws on invalid input (too many digits)', () => {
    expect(() => normalizeCik('12345678901')).toThrow('Invalid CIK')
  })

  it('throws on empty string', () => {
    expect(() => normalizeCik('')).toThrow('Invalid CIK')
  })
})

describe('formatCikForUrl', () => {
  it('prepends CIK to a zero-padded 10-digit string', () => {
    expect(formatCikForUrl('320193')).toBe('CIK0000320193')
  })

  it('handles already-formatted input', () => {
    expect(formatCikForUrl('0000320193')).toBe('CIK0000320193')
  })
})

describe('accessionToPath', () => {
  it('removes dashes from accession number', () => {
    expect(accessionToPath('0000320193-24-000006')).toBe('000032019324000006')
  })

  it('is a no-op on already-stripped accession', () => {
    expect(accessionToPath('000032019324000006')).toBe('000032019324000006')
  })
})

describe('buildDocumentUrl', () => {
  it('constructs the correct SEC archives URL', () => {
    const url = buildDocumentUrl('320193', '0000320193-24-000006', 'aapl-20231230.htm')
    expect(url).toBe(
      'https://www.sec.gov/Archives/edgar/data/320193/000032019324000006/aapl-20231230.htm',
    )
  })

  it('strips leading zeros from CIK in the archive path', () => {
    const url = buildDocumentUrl('0000001', '0000000001-24-000001', 'doc.htm')
    expect(url).toContain('/edgar/data/1/')
  })
})

describe('buildFilingIndexUrl', () => {
  it('constructs the filing index URL', () => {
    const url = buildFilingIndexUrl('320193', '0000320193-24-000006')
    expect(url).toContain('000032019324000006-index.htm')
    expect(url).toContain('/Archives/edgar/data/320193/')
  })
})
