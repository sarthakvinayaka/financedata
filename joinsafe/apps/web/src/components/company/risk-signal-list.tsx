// RiskSignalList — displays the ordered list of risk signals.
// Server Component — no interactivity needed.

import type { RiskSignal } from '@joinsafe/core'
import { SEVERITY_BG, SEVERITY_COLORS } from '@joinsafe/ui'

const SEVERITY_ICONS: Record<string, string> = {
  INFO: 'ℹ',
  LOW: '↑',
  MEDIUM: '⚠',
  HIGH: '⚠',
  CRITICAL: '✕',
}

const CATEGORY_LABELS: Record<string, string> = {
  WARN: 'WARN Filing',
  SEC: 'SEC Disclosure',
  FINANCIAL: 'Financial',
  MOMENTUM: 'Momentum',
}

interface RiskSignalListProps {
  signals: RiskSignal[]
}

export function RiskSignalList({ signals }: RiskSignalListProps) {
  if (signals.length === 0) {
    return (
      <div className="px-5 py-8 text-center text-sm text-gray-400">
        No risk signals detected based on available public data.
      </div>
    )
  }

  // Sort: CRITICAL first, then by severity
  const SEVERITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 }
  const sorted = [...signals].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 5) - (SEVERITY_ORDER[b.severity] ?? 5),
  )

  return (
    <ul className="divide-y divide-gray-100">
      {sorted.map((signal) => (
        <li key={signal.id} className={`px-5 py-4 border-l-2 ${SEVERITY_BG[signal.severity]}`}>
          <div className="flex items-start gap-3">
            <span
              className={`mt-0.5 text-base leading-none ${SEVERITY_COLORS[signal.severity]}`}
              aria-hidden="true"
            >
              {SEVERITY_ICONS[signal.severity]}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-gray-900">{signal.title}</p>
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                  {CATEGORY_LABELS[signal.category] ?? signal.category}
                </span>
              </div>

              <p className="mt-1 text-xs leading-relaxed text-gray-600">{signal.description}</p>

              {signal.date && (
                <p className="mt-1.5 text-xs text-gray-400">
                  As of{' '}
                  {new Date(signal.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
