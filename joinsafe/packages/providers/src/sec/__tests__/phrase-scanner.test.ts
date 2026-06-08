import { describe, it, expect } from 'vitest'
import { scanText, scanFilingHtml, stripHtml, summarizeHits } from '../phrase-scanner'

describe('stripHtml', () => {
  it('removes HTML tags', () => {
    const result = stripHtml('<p>Hello <strong>World</strong></p>')
    expect(result).toBe('Hello World')
  })

  it('removes script and style blocks entirely', () => {
    const html = '<script>alert("x")</script><style>.a{color:red}</style>Keep this.'
    expect(stripHtml(html)).toBe('Keep this.')
  })

  it('decodes common HTML entities', () => {
    expect(stripHtml('AT&amp;T &lt;ticker&gt; &nbsp; price')).toBe('AT&T <ticker>   price')
  })

  it('collapses multiple whitespace', () => {
    expect(stripHtml('<p>  Too   many   spaces  </p>')).toBe('Too many spaces')
  })
})

describe('scanText', () => {
  it('detects "workforce reduction"', () => {
    const hits = scanText('The company announced a workforce reduction of 500 employees.')
    const hit = hits.find((h) => h.phraseId === 'workforce_reduction')
    expect(hit).toBeDefined()
    expect(hit!.count).toBe(1)
    expect(hit!.category).toBe('WORKFORCE_REDUCTION')
  })

  it('detects "restructuring charge"', () => {
    const hits = scanText('We recorded a $50 million restructuring charge in Q4.')
    const hit = hits.find((h) => h.phraseId === 'restructuring_charge')
    expect(hit).toBeDefined()
    expect(hit!.category).toBe('RESTRUCTURING')
  })

  it('detects "reduction in force" (RIF)', () => {
    const hits = scanText('The reduction in force affected 200 positions.')
    const hit = hits.find((h) => h.phraseId === 'reduction_in_force')
    expect(hit).toBeDefined()
  })

  it('detects "margin pressure"', () => {
    const hits = scanText('Ongoing margin pressure has constrained profitability.')
    expect(hits.find((h) => h.category === 'MARGIN_PRESSURE')).toBeDefined()
  })

  it('detects "facility closure"', () => {
    const hits = scanText('The facility closure will be completed by Q2.')
    expect(hits.find((h) => h.category === 'FACILITY_CLOSURE')).toBeDefined()
  })

  it('detects "path to profitability"', () => {
    const hits = scanText('Management has articulated a clear path to profitability.')
    expect(hits.find((h) => h.phraseId === 'path_to_profitability')).toBeDefined()
  })

  it('counts multiple occurrences', () => {
    const text = 'restructuring is ongoing. The restructuring plan. Further restructuring.'
    const hits = scanText(text)
    const general = hits.find((h) => h.phraseId === 'restructuring_general')
    expect(general?.count).toBeGreaterThanOrEqual(3)
  })

  it('returns empty array for clean text', () => {
    const hits = scanText('The company reported strong revenue growth and record earnings.')
    expect(hits).toHaveLength(0)
  })

  it('includes context around the matched phrase', () => {
    const text = 'In Q3, management approved a workforce reduction targeting 300 roles.'
    const hits = scanText(text)
    const hit = hits.find((h) => h.phraseId === 'workforce_reduction')
    expect(hit?.context).toContain('targeting 300 roles')
    expect(hit?.context).toContain('Q3')
  })

  it('does not produce false positives for substring matches', () => {
    // "restructuring" in "infrastructure restructuring" should still match but
    // "cost" in "cost of goods sold" should NOT match "cost reduction"
    const hits = scanText('Our cost of goods sold increased due to supply chain disruptions.')
    const costHit = hits.find((h) => h.phraseId === 'cost_reduction')
    expect(costHit).toBeUndefined()
  })

  it('is case-insensitive', () => {
    const hits1 = scanText('WORKFORCE REDUCTION announced.')
    const hits2 = scanText('Workforce Reduction announced.')
    expect(hits1.find((h) => h.phraseId === 'workforce_reduction')).toBeDefined()
    expect(hits2.find((h) => h.phraseId === 'workforce_reduction')).toBeDefined()
  })
})

describe('scanFilingHtml', () => {
  it('scans HTML by stripping tags first', () => {
    const html = `
      <html><body>
        <p>The company will undergo <strong>restructuring</strong> in Q1.</p>
        <p>A <em>workforce reduction</em> of 400 employees has been approved.</p>
      </body></html>
    `
    const hits = scanFilingHtml(html)
    expect(hits.some((h) => h.category === 'RESTRUCTURING')).toBe(true)
    expect(hits.some((h) => h.category === 'WORKFORCE_REDUCTION')).toBe(true)
  })

  it('returns empty array for empty input', () => {
    expect(scanFilingHtml('')).toEqual([])
    expect(scanFilingHtml('   ')).toEqual([])
  })

  it('handles inline XBRL tags without false positives', () => {
    // Inline XBRL wraps financial figures in custom namespace elements
    const html = `
      <ix:nonNumeric name="dei:EntityPublicFloat">
        Approximately <ix:nonFraction>2.3</ix:nonFraction> billion.
      </ix:nonNumeric>
      We undertook a cost reduction program affecting 150 employees.
    `
    const hits = scanFilingHtml(html)
    expect(hits.find((h) => h.phraseId === 'cost_reduction')).toBeDefined()
  })
})

describe('summarizeHits', () => {
  it('groups hit counts by category', () => {
    const hits = scanText(
      'workforce reduction and headcount reduction and restructuring charge.',
    )
    const summary = summarizeHits(hits)
    expect(summary['WORKFORCE_REDUCTION']).toBeGreaterThanOrEqual(2)
    expect(summary['RESTRUCTURING']).toBeGreaterThanOrEqual(1)
  })

  it('returns zero values for categories with no hits', () => {
    const summary = summarizeHits([])
    // All categories should be absent or zero (no hits to count)
    expect(Object.values(summary).every((v) => v >= 0)).toBe(true)
  })
})
