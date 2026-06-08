// Singleton Prisma client.
// In Next.js development, hot-reloading creates new module instances on each
// reload. Without this singleton pattern, each reload leaks a connection pool.
// The `globalThis` escape hatch is safe because it's dev-only.

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
