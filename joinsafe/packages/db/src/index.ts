// @joinsafe/db
//
// This package owns:
//  - The Prisma schema (single source of truth for all database models)
//  - The singleton Prisma client (imported everywhere data access is needed)
//  - DB-level helpers (pagination, upsert patterns, transaction wrappers)
//
// Import pattern: `import { prisma } from '@joinsafe/db'`
// Never instantiate PrismaClient elsewhere — always use this singleton.

export { prisma } from './client'
export * from '@prisma/client'
