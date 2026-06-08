// Source confidence chip
//
// Surfaces data provenance inline — every data point in JoinSafe has a
// confidence level. Making this visible builds user trust and sets honest
// expectations about score reliability.
//
// Levels:
//  REPORTED  — directly stated in a primary government source
//  DERIVED   — calculated from primary data via documented formula
//  ESTIMATED — approximated from partial data (lower confidence)
//  INFERRED  — reasoned from indirect signals (lowest confidence)
//  UNKNOWN   — source could not be determined

import { SOURCE_CONFIDENCE_CLASSES, type SourceConfidence } from '../theme'
import { cn } from '../lib/utils'

interface SourceChipProps {
  confidence: SourceConfidence
  showIcon?: boolean
  className?: string
}

const CONFIDENCE_ICONS: Record<SourceConfidence, string> = {
  REPORTED:  '◉',
  DERIVED:   '◎',
  ESTIMATED: '◌',
  INFERRED:  '○',
  UNKNOWN:   '—',
}

// Ordered for display — most to least confident
export const SOURCE_CONFIDENCE_ORDER: SourceConfidence[] = [
  'REPORTED',
  'DERIVED',
  'ESTIMATED',
  'INFERRED',
  'UNKNOWN',
]

export function SourceChip({ confidence, showIcon = true, className }: SourceChipProps) {
  const config = SOURCE_CONFIDENCE_CLASSES[confidence]

  return (
    <span
      title={config.description}
      className={cn(
        'inline-flex items-center gap-1 rounded-pill border px-1.5 py-0.5',
        'font-sans text-xxs font-medium tracking-wide',
        'cursor-default select-none',
        config.chip,
        className,
      )}
    >
      {showIcon && (
        <span className="text-[9px] leading-none opacity-70" aria-hidden="true">
          {CONFIDENCE_ICONS[confidence]}
        </span>
      )}
      {config.label}
    </span>
  )
}
