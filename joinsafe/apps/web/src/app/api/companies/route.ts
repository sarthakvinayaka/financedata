// GET /api/companies — paginated company list with optional filtering
// Used by the search results page and autocomplete dropdown.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@joinsafe/db'
import { z } from 'zod'

const QuerySchema = z.object({
  q: z.string().optional(),
  state: z.string().length(2).optional(),
  tier: z.enum(['STABLE', 'WATCH', 'ELEVATED', 'HIGH', 'CRITICAL']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export async function GET(req: NextRequest) {
  const raw = Object.fromEntries(req.nextUrl.searchParams)
  const parsed = QuerySchema.safeParse(raw)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
  }

  const { q, state, tier, page, limit } = parsed.data
  const skip = (page - 1) * limit

  const where = {
    ...(q
      ? {
          OR: [
            { normalizedName: { contains: q.toLowerCase() } },
            { ticker: { contains: q.toUpperCase() } },
          ],
        }
      : {}),
    ...(state ? { hqState: state } : {}),
    ...(tier ? { riskScore: { tier } } : {}),
  }

  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      where,
      include: {
        riskScore: {
          select: { score: true, tier: true, confidence: true },
        },
      },
      skip,
      take: limit,
      orderBy: [{ riskScore: { score: 'desc' } }, { name: 'asc' }],
    }),
    prisma.company.count({ where }),
  ])

  return NextResponse.json({
    companies,
    meta: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  })
}
