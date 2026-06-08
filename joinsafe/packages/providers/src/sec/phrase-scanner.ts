// Negative phrase scanner for SEC filing text
//
// Scans cleaned filing text for phrases that indicate financial distress,
// restructuring, or workforce reduction. Designed to be:
//  - Heuristic and explicit (no ML / embeddings — rules are auditable)
//  - Explainable (every hit includes its surrounding context)
//  - Conservative (only well-established regulatory language triggers hits)
//
// All patterns are anchored to word boundaries to avoid substring false-positives.
// E.g., "cost reduction" won't match inside "cost reductions in regulatory burden".
// The context window (~300 chars) lets a human reader quickly verify the hit.

import type { NegativePhraseHit, NegativePhraseCategory } from './types'

// ── Pattern definitions ───────────────────────────────────────────────────────

interface PhrasePattern {
  id:       string                  // Stable slug for deduplication
  pattern:  RegExp
  display:  string                  // Human-readable phrase for the hit
  category: NegativePhraseCategory
}

const PATTERNS: PhrasePattern[] = [
  // ── Restructuring
  {
    id:      'restructuring_charge',
    pattern: /\brestructuring\s+(?:charge|cost|plan|program|initiative|action|expense)/gi,
    display: 'restructuring charge/plan',
    category: 'RESTRUCTURING',
  },
  {
    id:      'restructuring_general',
    pattern: /\brestructur(?:ing|ed)\b/gi,
    display: 'restructuring',
    category: 'RESTRUCTURING',
  },
  {
    id:      'reorganization',
    pattern: /\breorganiz(?:ation|ing|ed)\b/gi,
    display: 'reorganization',
    category: 'RESTRUCTURING',
  },

  // ── Workforce reduction
  {
    id:      'workforce_reduction',
    pattern: /\bworkforce\s+reduction\b/gi,
    display: 'workforce reduction',
    category: 'WORKFORCE_REDUCTION',
  },
  {
    id:      'headcount_reduction',
    pattern: /\bheadcount\s+reduction\b/gi,
    display: 'headcount reduction',
    category: 'WORKFORCE_REDUCTION',
  },
  {
    id:      'reduction_in_force',
    pattern: /\breduction\s+in\s+force\b/gi,
    display: 'reduction in force',
    category: 'WORKFORCE_REDUCTION',
  },
  {
    id:      'rif',
    pattern: /\b(?:RIF|rif)\b/g,
    display: 'RIF (reduction in force)',
    category: 'WORKFORCE_REDUCTION',
  },
  {
    id:      'layoff_event',
    pattern: /\blay-?off\b/gi,
    display: 'layoff',
    category: 'WORKFORCE_REDUCTION',
  },
  {
    id:      'furlough',
    pattern: /\bfurlough(?:ed|ing)?\b/gi,
    display: 'furlough',
    category: 'WORKFORCE_REDUCTION',
  },
  {
    id:      'position_elimination',
    pattern: /\belimina(?:ting|tion|ted)\s+(?:\w+\s+)?position/gi,
    display: 'position elimination',
    category: 'WORKFORCE_REDUCTION',
  },

  // ── Cost reduction
  {
    id:      'cost_reduction',
    pattern: /\bcost\s+(?:reduction|cutting|savings|rationali[sz]ation|optimi[sz]ation)\b/gi,
    display: 'cost reduction',
    category: 'COST_REDUCTION',
  },
  {
    id:      'expense_reduction',
    pattern: /\bexpense\s+reduction\b/gi,
    display: 'expense reduction',
    category: 'COST_REDUCTION',
  },
  {
    id:      'cost_containment',
    pattern: /\bcost\s+contain(?:ment|ing)\b/gi,
    display: 'cost containment',
    category: 'COST_REDUCTION',
  },
  {
    id:      'operational_efficiency',
    pattern: /\boperational\s+efficien(?:cy|cies)\s+initiative/gi,
    display: 'operational efficiency initiative',
    category: 'COST_REDUCTION',
  },

  // ── Margin pressure
  {
    id:      'margin_pressure',
    pattern: /\bmargin\s+pressure\b/gi,
    display: 'margin pressure',
    category: 'MARGIN_PRESSURE',
  },
  {
    id:      'margin_compression',
    pattern: /\bmargin\s+compression\b/gi,
    display: 'margin compression',
    category: 'MARGIN_PRESSURE',
  },
  {
    id:      'margin_contraction',
    pattern: /\bmargin\s+contraction\b/gi,
    display: 'margin contraction',
    category: 'MARGIN_PRESSURE',
  },
  {
    id:      'gross_margin_decline',
    pattern: /\bgross\s+margin\s+(?:decline|deterioration|decrease)\b/gi,
    display: 'gross margin decline',
    category: 'MARGIN_PRESSURE',
  },

  // ── Facility closure
  {
    id:      'facility_closure',
    pattern: /\bfacilit(?:y|ies)\s+clos(?:ure|ing|ed)\b/gi,
    display: 'facility closure',
    category: 'FACILITY_CLOSURE',
  },
  {
    id:      'plant_closing',
    pattern: /\bplant\s+clos(?:ure|ing|ed)\b/gi,
    display: 'plant closing',
    category: 'FACILITY_CLOSURE',
  },
  {
    id:      'site_closure',
    pattern: /\bsite\s+clos(?:ure|ing|ed)\b/gi,
    display: 'site closure',
    category: 'FACILITY_CLOSURE',
  },
  {
    id:      'office_consolidation',
    pattern: /\boffice\s+consolidation\b/gi,
    display: 'office consolidation',
    category: 'FACILITY_CLOSURE',
  },

  // ── Profitability pressure
  {
    id:      'profitability_initiative',
    pattern: /\bprofitability\s+initiative\b/gi,
    display: 'profitability initiative',
    category: 'PROFITABILITY_PRESSURE',
  },
  {
    id:      'improve_profitability',
    pattern: /\bimprove\s+(?:our\s+)?profitability\b/gi,
    display: 'improve profitability',
    category: 'PROFITABILITY_PRESSURE',
  },
  {
    id:      'path_to_profitability',
    pattern: /\bpath\s+to\s+profitability\b/gi,
    display: 'path to profitability',
    category: 'PROFITABILITY_PRESSURE',
  },
  {
    id:      'operating_losses',
    pattern: /\boperating\s+loss(?:es)?\b/gi,
    display: 'operating losses',
    category: 'PROFITABILITY_PRESSURE',
  },
]

// ── HTML stripping ────────────────────────────────────────────────────────────

/**
 * Strip HTML/XHTML tags and decode common entities.
 * SEC filings are XHTML, sometimes with inline XBRL tags — we want plain text.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s{2,}/g, ' ')
    .trim()
}

// ── Context extraction ────────────────────────────────────────────────────────

const CONTEXT_CHARS = 200  // Characters before and after the hit phrase

function extractContext(text: string, matchIndex: number, matchLength: number): string {
  const start = Math.max(0, matchIndex - CONTEXT_CHARS)
  const end   = Math.min(text.length, matchIndex + matchLength + CONTEXT_CHARS)
  let ctx = text.slice(start, end).trim()

  // Add ellipsis if we truncated
  if (start > 0) ctx = `…${ctx}`
  if (end < text.length) ctx = `${ctx}…`

  return ctx
}

// ── Main scan function ────────────────────────────────────────────────────────

/**
 * Scan plain text (not HTML) for negative phrases.
 * Returns one hit per unique phraseId, carrying:
 *  - The first match's context (for representative display)
 *  - The total count across the document
 *
 * To avoid noise, we deduplicate by phraseId rather than by exact match,
 * and set a minimum threshold per category.
 */
export function scanText(text: string): NegativePhraseHit[] {
  const hitMap = new Map<string, NegativePhraseHit>()

  for (const { id, pattern, display, category } of PATTERNS) {
    // Reset lastIndex since we reuse compiled regexps
    pattern.lastIndex = 0

    let match: RegExpExecArray | null
    let count = 0
    let firstContext = ''
    let firstMatch = ''

    while ((match = pattern.exec(text)) !== null) {
      count++
      if (count === 1) {
        firstContext = extractContext(text, match.index, match[0].length)
        firstMatch   = match[0]
      }
      // Safety: prevent infinite loops on zero-length matches
      if (match.index === pattern.lastIndex) pattern.lastIndex++
    }

    if (count === 0) continue

    // Merge into existing hit for this id if already seen (from a prior alias)
    const existing = hitMap.get(id)
    if (existing) {
      existing.count += count
    } else {
      hitMap.set(id, {
        phraseId: id,
        pattern:  firstMatch || display,
        category,
        context:  firstContext,
        count,
      })
    }
  }

  // Sort by count descending so most-mentioned signals appear first
  return Array.from(hitMap.values()).sort((a, b) => b.count - a.count)
}

/**
 * Scan HTML filing text: strips tags first, then calls scanText.
 * Returns empty array if text is empty.
 */
export function scanFilingHtml(html: string): NegativePhraseHit[] {
  if (!html.trim()) return []
  const text = stripHtml(html)
  return scanText(text)
}

/** Summarize phrase hits by category for quick display. */
export function summarizeHits(hits: NegativePhraseHit[]): Record<NegativePhraseCategory, number> {
  const summary: Partial<Record<NegativePhraseCategory, number>> = {}
  for (const hit of hits) {
    summary[hit.category] = (summary[hit.category] ?? 0) + hit.count
  }
  return summary as Record<NegativePhraseCategory, number>
}
