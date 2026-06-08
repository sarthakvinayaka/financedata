// @joinsafe/core
//
// This package owns all domain logic that is independent of infrastructure:
//  - Canonical TypeScript types and zod schemas
//  - The risk scoring engine (pure functions, no I/O)
//  - The scorer utility that shapes DB data for the engine
//
// Consumers:
//  - apps/web: displays scores and signals
//  - apps/worker: runs the scoring pipeline
//  - packages/db: types are NOT imported here (core has no DB dependency)
//
// Do not add I/O, HTTP calls, or DB access to this package.

export * from './types'
export * from './engine/risk-engine'
export * from './scoring/scorer'
