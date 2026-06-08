// GET /api/search?q=<query> — typeahead search endpoint
// Returns a lightweight list of matching companies for the search bar dropdown.
// Optimized for low latency: minimal fields, strict limit.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@joinsafe/db'
import { z } from 'zod'

const QuerySchema = z.object({
  q: z.string().min(1).max(100),
})

export async function GET(req: NextRequest) {
  const parsed = QuerySchema.safeParse({ q: req.nextUrl.searchParams.get('q') })

  if (!parsed.success) {
    return NextResponse.json({ results: [] })
  }

  const { q } = parsed.data
  const normalized = q.toLowerCase().trim()

  const results = await prisma.company.findMany({
    where: {
      OR: [
        { normalizedName: { contains: normalized } },
        { name: { contains: q, mode: 'insensitive' } },
        { ticker: { equals: q.toUpperCase() } },
      ],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      ticker: true,
      hqState: true,
      industry: true,
      isPublic: true,
      riskScore: {
        select: { score: true, tier: true },
      },
    },
    take: 8,
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ results })
}
