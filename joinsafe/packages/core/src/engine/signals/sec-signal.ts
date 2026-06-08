// SEC filing signal computation
//
// SEC filings surface qualitative and structural risk that WARN data cannot.
// A going concern opinion from an auditor is the single most severe individual
// signal in this model — it means the company's own accountants doubt survival.
// Executive turnover (CEO/CFO) is a leading indicator with well-documented
// correlation to near-term restructuring.

import type { SecFilingInput, RiskSignal } from '../../types'

interface SecSignalOutput {
  score: number
  signals: RiskSignal[]
}

export function computeSecSignals(filings: SecFilingInput[], now: Date): SecSignalOutput {
  const signals: RiskSignal[] = []

  if (filings.length === 0) {
    return { score: 0, signals: [] }
  }

  let score = 0

  const annualFilings = filings
    .filter((f) => f.formType === '10-K')
    .sort((a, b) => b.filingDate.getTime() - a.filingDate.getTime())

  const latestAnnual = annualFilings[0]

  // ── Signal: Going concern opinion ─────────────────────────────────────────
  if (latestAnnual?.goingConcernOpinion) {
    score = Math.max(score, 90)
    signals.push({
      id: 'sec_going_concern',
      category: 'SEC',
      severity: 'CRITICAL',
      title: 'Going concern qualification issued by auditor',
      description:
        "The company's independent auditor included a going concern paragraph in its audit opinion, indicating substantial doubt about the company's ability to continue as a going concern. This is the most severe external financial warning available in public records.",
      weight: 0.5,
      date: latestAnnual.filingDate,
    })
  }

  // ── Signal: Financial restatements ────────────────────────────────────────
  const restatements = filings.filter((f) => f.restatement)
  if (restatements.length > 0) {
    score = Math.max(score, 60)
    signals.push({
      id: 'sec_restatement',
      category: 'SEC',
      severity: 'HIGH',
      title: `${restatements.length} financial restatement${restatements.length > 1 ? 's' : ''} filed`,
      description: `The company restated previously reported financial figures ${restatements.length} time${restatements.length > 1 ? 's' : ''}, indicating material errors in prior reporting. Restatements often precede increased scrutiny, credit rating actions, and leadership changes.`,
      value: restatements.length,
      weight: 0.2,
    })
  }

  // ── Signal: Auditor change ────────────────────────────────────────────────
  const auditorChanges = filings.filter((f) => f.auditorChanged)
  if (auditorChanges.length > 0) {
    score = Math.max(score, 40)
    signals.push({
      id: 'sec_auditor_change',
      category: 'SEC',
      severity: 'MEDIUM',
      title: 'Auditor change reported',
      description:
        'The company changed its independent auditing firm. Mid-engagement auditor changes can indicate disagreements over accounting treatments or financial reporting scope.',
      weight: 0.15,
    })
  }

  // ── Signal: Executive leadership changes ─────────────────────────────────
  const ceoChanges = filings.filter((f) => f.ceoChanged)
  const cfoChanges = filings.filter((f) => f.cfoChanged)
  const execChanges = [...new Set([...ceoChanges, ...cfoChanges])]

  if (execChanges.length > 0) {
    const hasCeo = ceoChanges.length > 0
    const hasCfo = cfoChanges.length > 0
    score = Math.max(score, 35)
    signals.push({
      id: 'sec_exec_turnover',
      category: 'SEC',
      severity: 'LOW',
      title: `${[hasCeo && 'CEO', hasCfo && 'CFO'].filter(Boolean).join(' and ')} departure reported`,
      description:
        'C-suite turnover, particularly CEO and CFO departures, is a documented leading indicator of near-term restructuring activity in publicly available academic research.',
      weight: 0.1,
    })
  }

  // ── Signal: Stale filings (no recent 10-K) ───────────────────────────────
  if (latestAnnual) {
    const monthsSinceFiling =
      (now.getTime() - latestAnnual.filingDate.getTime()) / (30 * 24 * 60 * 60 * 1000)
    if (monthsSinceFiling > 18) {
      score = Math.max(score, 50)
      signals.push({
        id: 'sec_stale_filing',
        category: 'SEC',
        severity: 'MEDIUM',
        title: 'Annual report significantly overdue',
        description: `The most recent 10-K was filed ${Math.floor(monthsSinceFiling)} months ago. Late or missing annual filings are a regulatory red flag and may indicate financial or operational distress.`,
        value: Math.floor(monthsSinceFiling),
        weight: 0.05,
      })
    }
  }

  return { score: Math.min(100, score), signals }
}
