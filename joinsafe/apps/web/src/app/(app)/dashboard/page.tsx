// User dashboard — authenticated page
// Shows the user's watchlist with live risk tiers.
// Auth enforcement is handled by the (app) layout middleware.

import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@joinsafe/db'
import { redirect } from 'next/navigation'
import { RiskBadge } from '@joinsafe/ui'
import type { RiskTier } from '@joinsafe/core'

export const metadata = {
  title: 'Dashboard',
}

async function getWatchlist(userId: string) {
  return prisma.companyWatch.findMany({
    where: { userId },
    include: {
      // We need the company name + risk score for display
      // Using raw Prisma here since CompanyWatch doesn't have a relation
      // to Company in the include chain by default — we join manually.
    },
    orderBy: { createdAt: 'desc' },
  })
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.email) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      watchlist: true,
    },
  })

  if (!user) redirect('/login')

  const watchedCompanyIds = user.watchlist.map((w) => w.companyId)

  const companies =
    watchedCompanyIds.length > 0
      ? await prisma.company.findMany({
          where: { id: { in: watchedCompanyIds } },
          include: { riskScore: true },
          orderBy: { name: 'asc' },
        })
      : []

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Watchlist</h1>
          <p className="mt-1 text-sm text-gray-500">
            {companies.length === 0
              ? 'No companies saved yet.'
              : `Tracking ${companies.length} employer${companies.length > 1 ? 's' : ''}`}
          </p>
        </div>
        <Link
          href="/"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Search companies
        </Link>
      </div>

      {companies.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-16 text-center">
          <p className="text-gray-500">
            Search for a company and click &ldquo;Watch&rdquo; to add it here.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Search companies
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm">
          {companies.map((company) => {
            const tier = company.riskScore?.tier as RiskTier | undefined
            const score = company.riskScore?.score

            return (
              <Link
                key={company.id}
                href={`/company/${company.slug}`}
                className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium text-gray-900">{company.name}</p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {[company.hqCity, company.hqState, company.industry].filter(Boolean).join(' · ')}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  {score !== undefined && (
                    <span className="font-mono text-sm font-bold text-gray-700">{Math.round(score)}</span>
                  )}
                  {tier ? (
                    <RiskBadge tier={tier} size="sm" />
                  ) : (
                    <span className="text-xs text-gray-400">Pending</span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
