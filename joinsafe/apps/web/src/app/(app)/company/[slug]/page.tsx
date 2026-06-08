// Company detail page — the core product surface.
//
// Renders the full risk profile for a single employer:
//  - Headline risk score + tier badge
//  - Component breakdown (WARN / SEC / Financial / Momentum)
//  - Signal cards with plain-English explanations
//  - WARN notice timeline
//  - Score history chart (Pro)
//  - Data provenance and confidence disclosure
//
// This is a Server Component that fetches from the DB via the API layer.
// Charts are extracted to client components.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@joinsafe/db'
import { RISK_TIER_LABELS, RISK_TIER_DESCRIPTIONS } from '@joinsafe/core'
import { RiskBadge, ScoreGauge } from '@joinsafe/ui'
import { RiskSignalList } from '@/components/company/risk-signal-list'
import { WarnTimeline } from '@/components/company/warn-timeline'
import { ScoreHistoryChart } from '@/components/company/score-history-chart'
import { cn } from '@/lib/utils'
import type { RiskTier } from '@joinsafe/core'

interface PageProps {
  params: Promise<{ slug: string }>
}

async function getCompany(slug: string) {
  return prisma.company.findUnique({
    where: { slug },
    include: {
      riskScore: true,
      warnNotices: {
        orderBy: { noticeDate: 'desc' },
        take: 20,
      },
      riskHistory: {
        orderBy: { computedAt: 'asc' },
        take: 24,
      },
    },
  })
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const company = await getCompany(slug)

  if (!company) return { title: 'Company not found' }

  return {
    title: company.name,
    description: company.riskScore
      ? `${company.name} has a JoinSafe risk score of ${company.riskScore.score} — ${RISK_TIER_LABELS[company.riskScore.tier as RiskTier]}.`
      : `Employer stability profile for ${company.name}.`,
  }
}

const COMPONENT_LABELS: Record<string, string> = {
  warn: 'WARN Filings',
  sec: 'SEC Disclosures',
  financial: 'Financial Health',
  momentum: 'Momentum',
}

const COMPONENT_WEIGHTS: Record<string, number> = {
  warn: 40,
  sec: 20,
  financial: 30,
  momentum: 10,
}

export default async function CompanyPage({ params }: PageProps) {
  const { slug } = await params
  const company = await getCompany(slug)

  if (!company) notFound()

  const score = company.riskScore
  const tier = score?.tier as RiskTier | undefined

  const components = score
    ? (score.signals as unknown as Record<string, { score: number; signals: unknown[] }>)
    : null

  const confidencePct = score ? Math.round(score.confidence * 100) : null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
              <p className="mt-1 text-sm text-gray-500">
                {[company.hqCity, company.hqState, company.industry].filter(Boolean).join(' · ')}
                {company.isPublic && company.ticker && (
                  <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-600">
                    {company.exchange}: {company.ticker}
                  </span>
                )}
              </p>
            </div>

            {tier && (
              <div className="flex shrink-0 flex-col items-start sm:items-end gap-2">
                <RiskBadge tier={tier} size="lg" />
                {confidencePct !== null && (
                  <p className="text-xs text-gray-400">{confidencePct}% data confidence</p>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {score && tier ? (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* ── Left column: score + breakdown ── */}
            <div className="space-y-6 lg:col-span-1">
              {/* Score gauge card */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
                <ScoreGauge score={score.score} tier={tier} size={160} className="mx-auto" />

                <p className="mt-4 text-sm text-gray-600">
                  {RISK_TIER_DESCRIPTIONS[tier]}
                </p>

                <div className="mt-4 border-t border-gray-100 pt-4 text-xs text-gray-400">
                  Scored {new Date(score.dataAsOf).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>

              {/* Component breakdown */}
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 px-5 py-4">
                  <h2 className="text-sm font-semibold text-gray-900">Score breakdown</h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {Object.entries(COMPONENT_WEIGHTS).map(([key, weight]) => {
                    const subScore = key === 'warn'
                      ? score.warnScore
                      : key === 'sec'
                        ? score.secScore
                        : key === 'financial'
                          ? score.financialScore
                          : score.momentumScore

                    const s = subScore ?? 0

                    return (
                      <div key={key} className="px-5 py-3">
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-700">
                            {COMPONENT_LABELS[key]}
                          </span>
                          <span className="font-mono text-xs text-gray-500">
                            {Math.round(s)}/100 · {weight}% weight
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              s >= 80
                                ? 'bg-red-500'
                                : s >= 60
                                  ? 'bg-orange-500'
                                  : s >= 40
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500',
                            )}
                            style={{ width: `${s}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* ── Right column: signals + timeline ── */}
            <div className="space-y-6 lg:col-span-2">
              {/* Risk signals */}
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 px-5 py-4">
                  <h2 className="text-sm font-semibold text-gray-900">Risk signals</h2>
                  <p className="mt-0.5 text-xs text-gray-400">
                    Each signal contributes to the composite score. Hover for methodology details.
                  </p>
                </div>
                <RiskSignalList signals={score.signals as never} />
              </div>

              {/* WARN timeline */}
              {company.warnNotices.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                  <div className="border-b border-gray-100 px-5 py-4">
                    <h2 className="text-sm font-semibold text-gray-900">WARN notice history</h2>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {company.warnNotices.length} notice{company.warnNotices.length > 1 ? 's' : ''} on file
                    </p>
                  </div>
                  <WarnTimeline notices={company.warnNotices as never} />
                </div>
              )}

              {/* Score history chart */}
              {company.riskHistory.length > 1 && (
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                  <div className="border-b border-gray-100 px-5 py-4">
                    <h2 className="text-sm font-semibold text-gray-900">Score history</h2>
                  </div>
                  <div className="p-5">
                    <ScoreHistoryChart history={company.riskHistory as never} />
                  </div>
                </div>
              )}

              {/* Data transparency */}
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 text-xs text-gray-500">
                <p className="font-medium text-gray-700">About this score</p>
                <p className="mt-1.5 leading-relaxed">
                  This score is computed from public government records only. It is not financial,
                  legal, or employment advice. Data confidence is{' '}
                  <strong className="text-gray-700">{confidencePct}%</strong> based on the
                  completeness of available public records for this employer.
                  {!company.isPublic &&
                    ' This is a private company — SEC financial signals are unavailable.'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
            <p className="text-gray-500">Risk score not yet computed for this company.</p>
            <p className="mt-2 text-xs text-gray-400">
              Scores are generated automatically during the next nightly scoring run.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
