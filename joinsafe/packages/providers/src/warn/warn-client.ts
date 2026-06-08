// WARN ingestion client
//
// Orchestrates fetching from all supported state parsers.
// Designed to be called from the worker's ingest:warn job.
// Returns structured results per state for logging and monitoring.

import { getParser, getSupportedStates } from './state-parsers'
import type { RawWarnRecord, WarnIngestionResult, FetchOptions } from './types'

export interface WarnClientOptions {
  states?: string[] // Defaults to all supported states
}

export class WarnClient {
  private states: string[]

  constructor(options: WarnClientOptions = {}) {
    this.states = options.states ?? getSupportedStates()
  }

  async fetchState(
    stateCode: string,
    options?: FetchOptions,
  ): Promise<{ records: RawWarnRecord[]; errors: string[] }> {
    const parser = getParser(stateCode)
    if (!parser) {
      return { records: [], errors: [`No parser for state: ${stateCode}`] }
    }

    try {
      const records = await parser.fetchRecords(options)
      return { records, errors: [] }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { records: [], errors: [message] }
    }
  }

  async *fetchAll(
    options?: FetchOptions,
  ): AsyncGenerator<{ state: string; records: RawWarnRecord[]; errors: string[] }> {
    for (const state of this.states) {
      const result = await this.fetchState(state, options)
      yield { state, ...result }
    }
  }
}

export function createWarnClient(options?: WarnClientOptions): WarnClient {
  return new WarnClient(options)
}
