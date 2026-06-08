// WARN signal computation
//
// WARN Act notices are the highest-fidelity signal in JoinSafe's model.
// They are legally filed, public record, and directly document workforce reduction.
// A single recent WARN notice elevates a company to ELEVATED tier minimum.

import type { WarnNoticeInput, RiskSignal } from '../../types'

const MS_12M = 365 * 24 * 60 * 60 * 1000
const MS_24M = 2 * MS_12M

interface WarnSignalOutput {
  score: number
  signals: RiskSignal[]
}

export function computeWarnSignals(
  notices: WarnNoticeInput[],
  employeeCount: number | null | undefined,
  now: Date,
): WarnSignalOutput {
  const signals: RiskSignal[] = []

  if (notices.length === 0) {
    return { score: 0, signals: [] }
  }

  const nowMs = now.getTime()
  const notices12m = notices.filter((n) => n.noticeDate.getTime() > nowMs - MS_12M)
  const notices24m = notices.filter((n) => n.noticeDate.getTime() > nowMs - MS_24M)

  const workers12m = notices12m.reduce((s, n) => s + n.affectedWorkers, 0)

  let score = 0

  // ── Signal: Recent WARN filings (12-month window) ─────────────────────────
  if (notices12m.length > 0) {
    const recencyScore = Math.min(100, (notices12m.length / 2) * 60 + 30)
    score = Math.max(score, recencyScore)

    const severity =
      notices12m.length >= 3
        ? ('CRITICAL' as const)
        : notices12m.length >= 2
          ? ('HIGH' as const)
          : ('MEDIUM' as const)

    signals.push({
      id: 'warn_recent_12m',
      category: 'WARN',
      severity,
      title: `${notices12m.length} WARN notice${notices12m.length > 1 ? 's' : ''} filed in the last 12 months`,
      description: `This employer filed ${notices12m.length} WARN Act notice${notices12m.length > 1 ? 's' : ''} covering ${workers12m.toLocaleString()} affected workers in the past year. WARN notices are advance legal notice of mass layoffs.`,
      value: notices12m.length,
      weight: 0.5,
    })
  }

  // ── Signal: Scale relative to known workforce ─────────────────────────────
  if (employeeCount && employeeCount > 0 && workers12m > 0) {
    const pct = workers12m / employeeCount

    if (pct >= 0.01) {
      const scaleScore = Math.min(100, pct * 400)
      score = Math.max(score, scaleScore)

      const severity =
        pct >= 0.2 ? ('CRITICAL' as const) : pct >= 0.08 ? ('HIGH' as const) : ('MEDIUM' as const)

      signals.push({
        id: 'warn_pct_workforce',
        category: 'WARN',
        severity,
        title: `${(pct * 100).toFixed(1)}% of reported workforce affected`,
        description: `WARN filings in the last 12 months affected approximately ${(pct * 100).toFixed(1)}% of this employer's reported headcount of ${employeeCount.toLocaleString()}.`,
        value: Math.round(pct * 1000) / 1000,
        weight: 0.3,
      })
    }
  }

  // ── Signal: Plant closings (more severe than a layoff) ────────────────────
  const plantClosings = notices12m.filter((n) => n.noticeType === 'PLANT_CLOSING')
  if (plantClosings.length > 0) {
    score = Math.max(score, 75)
    signals.push({
      id: 'warn_plant_closing',
      category: 'WARN',
      severity: 'HIGH',
      title: `${plantClosings.length} facility closure${plantClosings.length > 1 ? 's' : ''} filed`,
      description:
        'Plant closing WARN notices indicate permanent facility shutdowns, which carry a higher probability of broader workforce contraction than temporary layoffs.',
      value: plantClosings.length,
      weight: 0.15,
    })
  }

  // ── Signal: Recurring layoff pattern (cross-period) ───────────────────────
  const has12m = notices12m.length > 0
  const hasPrior = notices24m.length > notices12m.length

  if (has12m && hasPrior) {
    score = Math.min(100, score + 15)
    signals.push({
      id: 'warn_recurring_pattern',
      category: 'WARN',
      severity: 'HIGH',
      title: 'Recurring layoff pattern across consecutive periods',
      description:
        'This employer has filed WARN notices in multiple separate periods over 24 months, suggesting ongoing structural instability rather than an isolated reduction.',
      value: notices24m.length,
      weight: 0.05,
    })
  }

  return { score: Math.min(100, score), signals }
}
