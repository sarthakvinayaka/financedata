// Seed — populates local dev DB with representative data matching schema v2.
// Run: pnpm db:seed
// Safe to re-run (all upserts are idempotent).

import {
  PrismaClient,
  CompanyType,
  DataQuality,
  LayoffSourceType,
  LayoffReason,
  ConfidenceLabel,
  RiskBand,
  Plan,
} from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database…')

  // ── Companies ────────────────────────────────────────────────────────────

  const meridian = await prisma.company.upsert({
    where:  { slug: 'meridian-software' },
    update: {},
    create: {
      name:           'Meridian Software',
      slug:           'meridian-software',
      normalizedName: 'meridian software',
      domain:         'meridiansoftware.com',
      ticker:         'MRSW',
      cik:            '0000000001',
      exchange:       'NASDAQ',
      companyType:    CompanyType.PUBLIC,
      industry:       'Enterprise Software',
      sector:         'Information Technology',
      sicCode:        '7372',
      headquartersCity:  'San Francisco',
      headquartersState: 'CA',
      employeeCount:  4800,
      employeeCountSource: 'SEC_10K',
      dataQuality:    DataQuality.HIGH,
    },
  })

  const atlas = await prisma.company.upsert({
    where:  { slug: 'atlas-manufacturing' },
    update: {},
    create: {
      name:           'Atlas Manufacturing',
      slug:           'atlas-manufacturing',
      normalizedName: 'atlas manufacturing',
      domain:         'atlasmfg.com',
      companyType:    CompanyType.PRIVATE,
      industry:       'Industrial Equipment',
      sector:         'Industrials',
      sicCode:        '3560',
      headquartersCity:  'Detroit',
      headquartersState: 'MI',
      employeeCount:  1200,
      employeeCountSource: 'WARN',
      dataQuality:    DataQuality.MEDIUM,
    },
  })

  console.log(`  ✓ ${meridian.name}`)
  console.log(`  ✓ ${atlas.name}`)

  // ── Aliases ──────────────────────────────────────────────────────────────

  await prisma.companyAlias.upsert({
    where:  { companyId_normalized: { companyId: meridian.id, normalized: 'mrsw' } },
    update: {},
    create: {
      companyId:  meridian.id,
      alias:      'MRSW',
      normalized: 'mrsw',
      aliasType:  'TICKER',
      source:     'SEC_EDGAR',
    },
  })

  // ── Source Documents ─────────────────────────────────────────────────────

  const warnDoc1 = await prisma.sourceDocument.upsert({
    where: { stateCode_sourceRowId: { stateCode: 'CA', sourceRowId: 'seed-ca-001' } },
    update: {},
    create: {
      companyId:    meridian.id,
      documentType: 'WARN_NOTICE',
      url:          'https://edd.ca.gov/warn/seed',
      publishedAt:  new Date('2024-09-15'),
      stateCode:    'CA',
      sourceRowId:  'seed-ca-001',
      rawData:      { seeded: true, employer: 'Meridian Software', workers: 320 },
    },
  })

  const warnDoc2 = await prisma.sourceDocument.upsert({
    where: { stateCode_sourceRowId: { stateCode: 'MI', sourceRowId: 'seed-mi-001' } },
    update: {},
    create: {
      companyId:    atlas.id,
      documentType: 'WARN_NOTICE',
      url:          'https://michigan.gov/leo/warn/seed',
      publishedAt:  new Date('2024-06-01'),
      stateCode:    'MI',
      sourceRowId:  'seed-mi-001',
      rawData:      { seeded: true, employer: 'Atlas Manufacturing', workers: 145 },
    },
  })

  console.log(`  ✓ Source documents`)

  // ── Layoff Events ────────────────────────────────────────────────────────

  await prisma.layoffEvent.upsert({
    where: { id: `seed-le-${meridian.id}` },
    update: {},
    create: {
      id:                   `seed-le-${meridian.id}`,
      companyId:            meridian.id,
      announcedDate:        new Date('2024-09-15'),
      effectiveDate:        new Date('2024-11-15'),
      employeesAffected:    320,
      percentAffected:      0.067,  // 320 / 4800
      geography:            'San Francisco, CA',
      sourceType:           LayoffSourceType.WARN,
      sourceDocumentId:     warnDoc1.id,
      reasonClassification: LayoffReason.COST_CUTTING,
      confidenceLabel:      ConfidenceLabel.REPORTED,
      rawReasonText:        null,
    },
  })

  await prisma.layoffEvent.upsert({
    where: { id: `seed-le-${atlas.id}` },
    update: {},
    create: {
      id:                   `seed-le-${atlas.id}`,
      companyId:            atlas.id,
      announcedDate:        new Date('2024-06-01'),
      effectiveDate:        new Date('2024-07-31'),
      employeesAffected:    145,
      geography:            'Detroit, MI',
      sourceType:           LayoffSourceType.WARN,
      sourceDocumentId:     warnDoc2.id,
      reasonClassification: LayoffReason.DEMAND_SLOWDOWN,
      confidenceLabel:      ConfidenceLabel.REPORTED,
    },
  })

  console.log(`  ✓ Layoff events`)

  // ── Financial Report (Meridian — 10-K) ───────────────────────────────────

  const secDoc = await prisma.sourceDocument.upsert({
    where: { accessionNumber: '0000000001-24-000001' },
    update: {},
    create: {
      companyId:      meridian.id,
      documentType:   'SEC_10K',
      url:            'https://www.sec.gov/Archives/edgar/data/1/000000000124000001/meridian10k.htm',
      accessionNumber: '0000000001-24-000001',
      formType:       '10-K',
      filingDate:     new Date('2024-03-15'),
      periodOfReport: new Date('2023-12-31'),
    },
  })

  const report = await prisma.financialReport.upsert({
    where: { id: secDoc.id },
    update: {},
    create: {
      id:              secDoc.id,
      companyId:       meridian.id,
      sourceDocumentId: secDoc.id,
      formType:        '10-K',
      filingDate:      new Date('2024-03-15'),
      periodEndDate:   new Date('2023-12-31'),
      goingConcernOpinion: false,
      restatement:     false,
      auditorChanged:  false,
      ceoChanged:      false,
      cfoChanged:      false,
    },
  })

  const metrics = [
    { key: 'revenue',            value: 285_000_000, unit: 'USD', yoy: -0.14 },
    { key: 'operatingCashFlow',  value: -18_000_000, unit: 'USD' },
    { key: 'cashAndEquivalents', value: 94_000_000,  unit: 'USD' },
    { key: 'totalDebt',          value: 145_000_000, unit: 'USD' },
    { key: 'totalAssets',        value: 320_000_000, unit: 'USD' },
    { key: 'employees',          value: 4800,        unit: 'employees' },
  ]

  for (const m of metrics) {
    await prisma.financialMetric.upsert({
      where: { reportId_metricKey: { reportId: report.id, metricKey: m.key } },
      update: {},
      create: {
        reportId:       report.id,
        metricKey:      m.key,
        metricValue:    m.value,
        unit:           m.unit,
        yoyChange:      m.yoy ?? null,
        periodEnd:      new Date('2023-12-31'),
        confidenceLabel: ConfidenceLabel.REPORTED,
      },
    })
  }

  console.log(`  ✓ Financial report + metrics`)

  // ── Risk Scores ───────────────────────────────────────────────────────────

  const meridianScore = await prisma.riskScore.upsert({
    where: { companyId: meridian.id },
    update: {},
    create: {
      companyId:             meridian.id,
      score:                 63,
      band:                  RiskBand.HIGH,
      layoffRecencyScore:    72,
      layoffFrequencyScore:  45,
      layoffSeverityScore:   55,
      financialWeaknessScore: 60,
      negativeSignalsScore:  20,
      recoverySignalsScore:  15,
      confidence:            0.84,
      dataAsOf:              new Date(),
    },
  })

  await prisma.riskScoreExplanation.upsert({
    where: { id: `seed-exp-${meridianScore.id}-1` },
    update: {},
    create: {
      id:           `seed-exp-${meridianScore.id}-1`,
      riskScoreId:  meridianScore.id,
      signalId:     'layoff_recency_12m',
      category:     'WARN',
      severity:     'MEDIUM',
      title:        '1 layoff event in the last 12 months',
      description:  'Meridian Software filed a WARN notice covering 320 employees (6.7% of workforce) in September 2024.',
      numericValue: 1,
      weight:       0.6,
      contribution: 9.7,
    },
  })

  await prisma.riskScore.upsert({
    where: { companyId: atlas.id },
    update: {},
    create: {
      companyId:             atlas.id,
      score:                 41,
      band:                  RiskBand.MEDIUM,
      layoffRecencyScore:    38,
      layoffFrequencyScore:  25,
      layoffSeverityScore:   30,
      financialWeaknessScore: 0,
      negativeSignalsScore:  0,
      recoverySignalsScore:  0,
      confidence:            0.42,
      dataAsOf:              new Date(),
    },
  })

  console.log(`  ✓ Risk scores`)

  // ── Users + Plans ────────────────────────────────────────────────────────

  const freeUser = await prisma.user.upsert({
    where: { email: 'demo-free@joinsafe.local' },
    update: {},
    create: {
      email:    'demo-free@joinsafe.local',
      name:     'Demo Free User',
    },
  })

  await prisma.userPlan.upsert({
    where: { userId: freeUser.id },
    update: {},
    create: {
      userId:                 freeUser.id,
      plan:                   Plan.FREE,
      monthlyCompanyViewLimit: 5,
      compareLimit:           0,
      alertsEnabled:          false,
      premiumReportsEnabled:  false,
      watchlistSizeLimit:     3,
    },
  })

  const proUser = await prisma.user.upsert({
    where: { email: 'demo-pro@joinsafe.local' },
    update: {},
    create: {
      email: 'demo-pro@joinsafe.local',
      name:  'Demo Pro User',
    },
  })

  await prisma.userPlan.upsert({
    where: { userId: proUser.id },
    update: {},
    create: {
      userId:                 proUser.id,
      plan:                   Plan.PRO,
      monthlyCompanyViewLimit: -1,
      compareLimit:           5,
      alertsEnabled:          true,
      premiumReportsEnabled:  true,
      watchlistSizeLimit:     -1,
    },
  })

  // Watchlist
  await prisma.watchlist.upsert({
    where: { userId_companyId: { userId: proUser.id, companyId: meridian.id } },
    update: {},
    create: {
      userId:    proUser.id,
      companyId: meridian.id,
      alertOnBandChange: true,
      alertOnNewLayoff:  true,
    },
  })

  console.log(`  ✓ Users + plans + watchlist`)
  console.log('\nSeed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
