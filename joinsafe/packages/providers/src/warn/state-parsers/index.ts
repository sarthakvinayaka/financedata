// State parser registry
//
// Add new state parsers here as they are implemented.
// Priority order for coverage expansion:
//  1. CA, TX, NY, FL, IL — highest employer density
//  2. WA, GA, NC, OH, NJ — secondary markets
//  3. Remaining states — some publish PDFs (require OCR), some are HTML-only
//
// States that don't publish machine-readable WARN data require separate handling
// (manual entry, PDF parsing, or Freedom of Information requests).

import type { WarnStateParser } from '../types'
import { CaliforniaWarnParser } from './california'

export const STATE_PARSERS: Record<string, WarnStateParser> = {
  CA: new CaliforniaWarnParser(),
  // TX: new TexasWarnParser(),       — TODO: TX publishes quarterly Excel files
  // NY: new NewYorkWarnParser(),     — TODO: NY publishes a searchable web portal
  // FL: new FloridaWarnParser(),     — TODO: FL publishes CSV files
  // WA: new WashingtonWarnParser(),  — TODO: WA publishes quarterly Excel files
}

export function getParser(stateCode: string): WarnStateParser | null {
  return STATE_PARSERS[stateCode.toUpperCase()] ?? null
}

export function getSupportedStates(): string[] {
  return Object.keys(STATE_PARSERS)
}

export { CaliforniaWarnParser }
export type { WarnStateParser }
