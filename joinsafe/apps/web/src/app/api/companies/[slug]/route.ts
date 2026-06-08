// GET /api/companies/[slug] — full company risk profile
// Returns all data needed to render the company detail page.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@joinsafe/db'

interface RouteContext {
  params: Promise<{ slug: string }>
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { slug } = await params

  const company = await prisma.company.findUnique({
    where: { slug },
    include: {
      riskScore: true,
      warnNotices: {
        orderBy: { noticeDate: 'desc' },
        take: 50,
      },
      secFilings: {
        where: { formType: { in: ['10-K', '10-Q', '8-K'] } },
        orderBy: { filingDate: 'desc' },
        take: 10,
        select: {
          accessionNumber: true,
          formType: true,
          filingDate: true,
          periodOfReport: true,
          goingConcernOpinion: true,
          restatement: true,
          auditorChanged: true,
          sourceUrl: true,
        },
      },
      riskHistory: {
        orderBy: { computedAt: 'asc' },
        take: 24,
        select: { score: true, tier: true, computedAt: true, confidence: true },
      },
    },
  })

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  return NextResponse.json(company)
}
