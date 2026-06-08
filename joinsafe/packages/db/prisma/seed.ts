// Seed script — populates local development database with representative data.
// Run: pnpm db:seed
// Safe to run repeatedly — uses upsert patterns.

import { PrismaClient, RiskTier, DataQuality, WarnNoticeType } from '@prisma/client'

const prisma = new PrismaClient()

const SAMPLE_COMPANIES = [
  {
    name: 'Acme Corp',
    slug: 'acme-corp',
    normalizedName: 'acme corp',
    ticker: 'ACME',
    cik: '0000000001',
    industry: 'Technology',
    sector: 'Information Technology',
    sicCode: '7372',
    hqCity: 'San Francisco',
    hqState: 'CA',
    isPublic: true,
    employeeCount: 5000,
    dataQuality: DataQuality.HIGH,
  },
  {
    name: 'Beta Industries',
    slug: 'beta-industries',
    normalizedName: 'beta industries',
    ticker: null,
    cik: null,
    industry: 'Manufacturing',
    sector: 'Industrials',
    sicCode: '3560',
    hqCity: 'Detroit',
    hqState: 'MI',
    isPublic: false,
    employeeCount: 1200,
    dataQuality: DataQuality.MEDIUM,
  },
]

async function main() {
  console.log('Seeding database...')

  for (const company of SAMPLE_COMPANIES) {
    const { ticker, cik, ...rest } = company

    const upserted = await prisma.company.upsert({
      where: { slug: company.slug },
      update: {},
      create: {
        ...rest,
        ...(ticker ? { ticker } : {}),
        ...(cik ? { cik } : {}),
      },
    })

    // Seed a WARN notice for Acme Corp
    if (upserted.slug === 'acme-corp') {
      await prisma.warnNotice.upsert({
        where: { sourceState_sourceRowId: { sourceState: 'CA', sourceRowId: 'seed-001' } },
        update: {},
        create: {
          companyId: upserted.id,
          employerName: 'Acme Corp',
          state: 'CA',
          city: 'San Francisco',
          noticeDate: new Date('2024-09-15'),
          layoffDate: new Date('2024-11-15'),
          affectedWorkers: 320,
          noticeType: WarnNoticeType.LAYOFF,
          sourceState: 'CA',
          sourceRowId: 'seed-001',
          rawData: { seeded: true },
        },
      })

      await prisma.riskScore.upsert({
        where: { companyId: upserted.id },
        update: {},
        create: {
          companyId: upserted.id,
          score: 62,
          tier: RiskTier.HIGH,
          warnScore: 75,
          secScore: 30,
          financialScore: 55,
          momentumScore: 50,
          signals: [
            {
              id: 'warn_recent_12m',
              category: 'WARN',
              severity: 'HIGH',
              title: '1 WARN notice filed in the last 12 months',
              description: 'This employer filed 1 WARN Act notice covering 320 affected workers in the past year.',
              value: 1,
              weight: 0.5,
            },
          ],
          confidence: 0.72,
          dataAsOf: new Date(),
        },
      })
    }

    console.log(`  ✓ ${upserted.name} (${upserted.slug})`)
  }

  console.log('Seed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
