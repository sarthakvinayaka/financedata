// /design — Design system showcase
//
// Internal reference page. Demonstrates every token, component, and composed
// pattern in the JoinSafe design system. Not linked from public navigation.
// Route: /design

import type { Metadata } from 'next'
import {
  RiskBadge,
  ScoreGauge,
  SourceChip,
  Card, CardHeader, CardTitle, CardDescription,
  MetricCard,
  Skeleton, SkeletonMetricCard, SkeletonCompanyRow, SkeletonSignalCard,
  EmptyState, NoSearchResults, NoWarnHistory, EmptyWatchlist,
  Banner, DataFreshnessBanner, PrivateCompanyBanner, LowConfidenceBanner,
} from '@joinsafe/ui'
import type { RiskTier } from '@joinsafe/core'
import { RISK_TIER_LABELS } from '@joinsafe/core'
import { MethodologyCallout } from '@/components/common/methodology-callout'
import { SearchHero } from '@/components/search/search-hero'

export const metadata: Metadata = { title: 'Design System' }

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, description, children }: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-16">
      <div className="mb-6 border-b border-subtle pb-4">
        <h2 className="font-display text-2xl font-semibold text-primary">{title}</h2>
        {description && (
          <p className="mt-1 type-small text-secondary">{description}</p>
        )}
      </div>
      {children}
    </section>
  )
}

// ── Token swatch ──────────────────────────────────────────────────────────────
function Swatch({ bg, label, hex }: { bg: string; label: string; hex: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className={`h-12 rounded-lg border border-subtle ${bg}`} />
      <div>
        <p className="text-xs font-medium text-primary">{label}</p>
        <p className="font-mono text-xxs text-tertiary">{hex}</p>
      </div>
    </div>
  )
}

const RISK_TIERS: RiskTier[] = ['STABLE', 'WATCH', 'ELEVATED', 'HIGH', 'CRITICAL']
const RISK_SCORES: Record<RiskTier, number> = {
  STABLE: 12, WATCH: 34, ELEVATED: 52, HIGH: 68, CRITICAL: 87,
}

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-base">
      {/* Page header */}
      <div className="border-b border-subtle bg-surface">
        <div className="mx-auto max-w-site px-5 py-8 sm:px-6">
          <p className="type-label text-plum-600 mb-2">Internal</p>
          <h1 className="font-display text-4xl font-semibold text-primary">Design System</h1>
          <p className="type-lead mt-2 text-secondary">
            JoinSafe visual design system — tokens, components, and composed patterns.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-site px-5 py-12 sm:px-6">

        {/* ── Typography ─────────────────────────────────────────────────── */}
        <Section title="Typography" description="Cormorant Garamond for display, Inter for UI, JetBrains Mono for data.">
          <div className="space-y-4 bg-surface rounded-xl border border-subtle p-8">
            <div className="pb-4 border-b border-subtle">
              <p className="type-label text-tertiary mb-3">Display — Cormorant Garamond</p>
              <p className="font-display text-7xl font-semibold text-primary leading-none">Know the risk.</p>
              <p className="font-display text-5xl font-medium text-secondary leading-tight mt-2 italic">
                Before you sign.
              </p>
            </div>
            <div className="grid gap-3 pt-2">
              {[
                { cls: 'type-h1 font-display', label: 'H1 / 3rem', text: 'Employer Stability Risk' },
                { cls: 'type-h2 font-display', label: 'H2 / 2.25rem', text: 'WARN Act Filings' },
                { cls: 'type-h3 font-display', label: 'H3 / 1.75rem', text: 'Financial Health Signals' },
                { cls: 'type-h4 font-sans', label: 'H4 / 1.25rem', text: 'Score Breakdown' },
                { cls: 'type-lead font-sans', label: 'Lead / 1.125rem', text: 'Transparent risk scoring built on public records.' },
                { cls: 'type-body font-sans', label: 'Body / 1rem', text: 'JoinSafe analyzes WARN Act filings, SEC disclosures, and financial indicators.' },
                { cls: 'type-small font-sans', label: 'Small / 0.875rem', text: 'Data sourced from U.S. state labor agencies and SEC EDGAR.' },
                { cls: 'type-caption font-sans', label: 'Caption / 0.75rem', text: 'Updated nightly · Public records only · Not financial advice' },
                { cls: 'type-label font-sans', label: 'Label / 0.6875rem', text: 'Risk Score · WARN Data · SEC Filing' },
              ].map((t) => (
                <div key={t.label} className="flex items-baseline gap-4">
                  <span className="type-caption text-faint w-32 flex-shrink-0 font-mono">{t.label}</span>
                  <span className={t.cls}>{t.text}</span>
                </div>
              ))}
              <div className="flex items-baseline gap-4 pt-2 border-t border-subtle">
                <span className="type-caption text-faint w-32 flex-shrink-0 font-mono">Mono / Score</span>
                <span className="font-mono text-4xl font-bold tabular-nums text-plum-700">68</span>
                <span className="font-mono text-2xl font-semibold tabular-nums text-harvest-600">34.2%</span>
                <span className="font-mono text-lg tabular-nums text-sage-600">+2,840</span>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Color Palette ──────────────────────────────────────────────── */}
        <Section title="Color Palette" description="Smoked aubergine primary · Warm stone neutrals · Muted risk signal colors.">
          <div className="space-y-6">
            {/* Plum */}
            <div>
              <p className="type-label text-tertiary mb-3">Plum / Aubergine (Brand)</p>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                {[
                  { bg: 'bg-plum-50',  hex: '#F5EEFA', label: '50' },
                  { bg: 'bg-plum-100', hex: '#E5D4F0', label: '100' },
                  { bg: 'bg-plum-200', hex: '#CBA9E1', label: '200' },
                  { bg: 'bg-plum-300', hex: '#AE7ED0', label: '300' },
                  { bg: 'bg-plum-400', hex: '#8F57BC', label: '400' },
                  { bg: 'bg-plum-500', hex: '#7136A2', label: '500' },
                  { bg: 'bg-plum-600', hex: '#582880', label: '600' },
                  { bg: 'bg-plum-700', hex: '#421C60', label: '700 ★' },
                  { bg: 'bg-plum-800', hex: '#2C1242', label: '800' },
                  { bg: 'bg-plum-900', hex: '#18092A', label: '900' },
                ].map((s) => <Swatch key={s.label} {...s} />)}
              </div>
            </div>
            {/* Warm stone */}
            <div>
              <p className="type-label text-tertiary mb-3">Warm Stone (Neutrals)</p>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                {[
                  { bg: 'bg-warm-50',  hex: '#FAFAF7', label: '50' },
                  { bg: 'bg-warm-100', hex: '#F4F1EC', label: '100' },
                  { bg: 'bg-warm-200', hex: '#E8E4DC', label: '200' },
                  { bg: 'bg-warm-300', hex: '#D6D1C7', label: '300' },
                  { bg: 'bg-warm-400', hex: '#B7B0A4', label: '400' },
                  { bg: 'bg-warm-500', hex: '#938B7E', label: '500' },
                  { bg: 'bg-warm-600', hex: '#6E6659', label: '600' },
                  { bg: 'bg-warm-700', hex: '#504840', label: '700' },
                  { bg: 'bg-warm-800', hex: '#322C24', label: '800' },
                  { bg: 'bg-warm-900', hex: '#1C1711', label: '900 ★' },
                ].map((s) => <Swatch key={s.label} {...s} />)}
              </div>
            </div>
            {/* Risk */}
            <div>
              <p className="type-label text-tertiary mb-3">Risk Signal Colors</p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                <Swatch bg="bg-sage-50"     hex="#EEF5EF" label="Sage 50" />
                <Swatch bg="bg-sage-500"    hex="#2E7638" label="Sage 500 (Stable)" />
                <Swatch bg="bg-harvest-50"  hex="#FBF6E3" label="Harvest 50" />
                <Swatch bg="bg-harvest-500" hex="#A27610" label="Harvest 500 (Watch)" />
                <Swatch bg="bg-oxblood-50"  hex="#F6EBEE" label="Oxblood 50" />
                <Swatch bg="bg-oxblood-500" hex="#7E2840" label="Oxblood 500 (Critical)" />
              </div>
            </div>
          </div>
        </Section>

        {/* ── Risk Badges ────────────────────────────────────────────────── */}
        <Section title="Risk Badges" description="Five tiers · Three sizes · With and without score overlay.">
          <div className="bg-surface border border-subtle rounded-xl p-6 space-y-6">
            {(['xs', 'sm', 'md', 'lg'] as const).map((size) => (
              <div key={size}>
                <p className="type-label text-tertiary mb-3">Size: {size}</p>
                <div className="flex flex-wrap items-center gap-3">
                  {RISK_TIERS.map((tier) => (
                    <RiskBadge key={tier} tier={tier} size={size} />
                  ))}
                </div>
              </div>
            ))}
            <div className="pt-4 border-t border-subtle">
              <p className="type-label text-tertiary mb-3">With score overlay</p>
              <div className="flex flex-wrap items-center gap-3">
                {RISK_TIERS.map((tier) => (
                  <RiskBadge key={tier} tier={tier} size="md" showScore={RISK_SCORES[tier]} />
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ── Score Gauges ───────────────────────────────────────────────── */}
        <Section title="Score Gauges" description="SVG arc gauge · Four sizes · One per risk tier.">
          <div className="bg-surface border border-subtle rounded-xl p-8">
            <div className="flex flex-wrap items-end justify-center gap-8 sm:gap-12">
              {RISK_TIERS.map((tier) => (
                <div key={tier} className="flex flex-col items-center gap-2">
                  <ScoreGauge score={RISK_SCORES[tier]} tier={tier} size="lg" />
                  <span className="type-caption text-faint">{RISK_TIER_LABELS[tier]}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 pt-6 border-t border-subtle flex flex-wrap justify-center gap-6">
              {(['sm', 'md', 'lg', 'xl'] as const).map((s) => (
                <div key={s} className="flex flex-col items-center gap-2">
                  <ScoreGauge score={68} tier="HIGH" size={s} />
                  <span className="type-caption text-faint">{s}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Source Chips ───────────────────────────────────────────────── */}
        <Section title="Source Confidence Chips" description="Five levels from most to least reliable.">
          <div className="bg-surface border border-subtle rounded-xl p-6">
            <div className="flex flex-wrap gap-3 mb-6">
              {(['REPORTED', 'DERIVED', 'ESTIMATED', 'INFERRED', 'UNKNOWN'] as const).map((c) => (
                <SourceChip key={c} confidence={c} />
              ))}
            </div>
            <div className="pt-5 border-t border-subtle space-y-3">
              <p className="type-label text-tertiary">In context</p>
              {[
                { field: 'Affected workers', value: '1,340', conf: 'REPORTED' as const },
                { field: 'Revenue decline', value: '−18.4%', conf: 'DERIVED' as const },
                { field: 'Employee count', value: '~4,200', conf: 'ESTIMATED' as const },
                { field: 'Sector', value: 'Software', conf: 'INFERRED' as const },
                { field: 'HQ state', value: '—', conf: 'UNKNOWN' as const },
              ].map((row) => (
                <div key={row.field} className="flex items-center gap-3">
                  <span className="type-small text-tertiary w-36">{row.field}</span>
                  <span className="type-small font-mono text-primary">{row.value}</span>
                  <SourceChip confidence={row.conf} />
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Metric Cards ───────────────────────────────────────────────── */}
        <Section title="Metric Cards" description="Stat display with trend indicators.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Risk Score"
              value="68"
              subvalue="/ 100"
              trend={{ direction: 'up', label: '+6 pts this month', positive: false }}
              note="HIGH tier"
            />
            <MetricCard
              label="WARN Notices"
              value="3"
              subvalue="last 24 mo."
              trend={{ direction: 'up', label: 'Up from 1 prior year', positive: false }}
            />
            <MetricCard
              label="Affected Workers"
              value="1,340"
              trend={{ direction: 'flat', label: 'No change' }}
              note="12-month window"
            />
            <MetricCard
              label="Data Confidence"
              value="84%"
              trend={{ direction: 'up', label: '+12% since SEC update', positive: true }}
            />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <MetricCard label="Cash Runway" value="~9 mo." trend={{ direction: 'down', label: 'Critical threshold', positive: false }} variant="subtle" />
            <MetricCard label="Revenue YoY" value="−22%" trend={{ direction: 'down', label: 'Severe decline', positive: false }} variant="subtle" />
            <MetricCard label="SEC Score" value="90" subvalue="/ 100" note="Going concern" variant="accent" />
          </div>
        </Section>

        {/* ── Cards ──────────────────────────────────────────────────────── */}
        <Section title="Cards" description="Four variants: default, subtle, outlined, elevated.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(['default', 'subtle', 'outlined', 'elevated'] as const).map((v) => (
              <Card key={v} variant={v}>
                <CardHeader>
                  <div>
                    <CardTitle>{v.charAt(0).toUpperCase() + v.slice(1)}</CardTitle>
                    <CardDescription>Card variant</CardDescription>
                  </div>
                </CardHeader>
                <p className="type-small text-secondary">
                  Premium surface for structured data display.
                </p>
              </Card>
            ))}
          </div>
          <div className="mt-4">
            <Card variant="default" interactive className="max-w-sm">
              <CardHeader>
                <CardTitle>Interactive card</CardTitle>
              </CardHeader>
              <p className="type-small text-secondary">Hover to see the lift effect.</p>
            </Card>
          </div>
        </Section>

        {/* ── Banners ────────────────────────────────────────────────────── */}
        <Section title="Banners" description="Contextual messages — muted and editorial, not alarming.">
          <div className="space-y-3">
            <Banner variant="info" title="Score updated">
              This score was recalculated following new SEC 10-K filing on December 12, 2024.
            </Banner>
            <Banner variant="success" title="High confidence">
              This company has verified CIK, matched WARN records, and recent XBRL data.
              Confidence: 91%.
            </Banner>
            <Banner variant="warning" title="Partial coverage">
              WARN data is available for California only. Coverage is incomplete for
              multi-state employers.
            </Banner>
            <Banner variant="caveat">
              This score is based on public records only and is not financial or legal advice.
            </Banner>
            <Banner variant="critical" title="Going concern opinion issued">
              The company's auditor has included a going concern qualification in its most
              recent annual report.
            </Banner>
            <div className="pt-4 border-t border-subtle space-y-3">
              <p className="type-label text-tertiary mb-2">Preset banners</p>
              <DataFreshnessBanner dataAsOf={new Date(Date.now() - 5 * 86400 * 1000)} />
              <PrivateCompanyBanner />
              <LowConfidenceBanner confidence={0.38} />
            </div>
          </div>
        </Section>

        {/* ── Buttons ────────────────────────────────────────────────────── */}
        <Section title="Buttons & CTAs" description="Four variants · Three sizes · Aubergine primary.">
          <div className="bg-surface border border-subtle rounded-xl p-6 space-y-5">
            {(['primary', 'secondary', 'ghost', 'accent-subtle'] as const).map((variant) => (
              <div key={variant}>
                <p className="type-label text-tertiary mb-3">{variant}</p>
                <div className="flex flex-wrap items-center gap-3">
                  <button className={`btn btn-${variant} btn-sm`}>Small</button>
                  <button className={`btn btn-${variant} btn-md`}>Medium</button>
                  <button className={`btn btn-${variant} btn-lg`}>Large</button>
                  <button className={`btn btn-${variant} btn-md`} disabled>Disabled</button>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Skeleton Loaders ───────────────────────────────────────────── */}
        <Section title="Skeleton Loaders" description="Shimmer placeholders that match the shapes they replace.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-0 bg-surface border border-subtle rounded-xl overflow-hidden">
              <p className="type-label text-tertiary px-5 pt-4 pb-3 border-b border-subtle">Company rows</p>
              {[1, 2, 3].map((i) => (
                <SkeletonCompanyRow key={i} className="border-b border-subtle last:border-0" />
              ))}
            </div>
            <div className="space-y-4">
              <SkeletonMetricCard />
              <SkeletonMetricCard />
            </div>
            <div className="sm:col-span-2 bg-surface border border-subtle rounded-xl overflow-hidden">
              <p className="type-label text-tertiary px-5 pt-4 pb-3 border-b border-subtle">Signal cards</p>
              {[1, 2, 3].map((i) => (
                <SkeletonSignalCard key={i} />
              ))}
            </div>
          </div>
        </Section>

        {/* ── Empty States ───────────────────────────────────────────────── */}
        <Section title="Empty States" description="Neutral, non-alarmist placeholders.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <NoSearchResults query="Acme Inc." />
            <NoWarnHistory />
            <EmptyState
              icon={<span>◎</span>}
              title="No SEC filings"
              description="This employer has no public SEC filings on record."
              size="sm"
              variant="subtle"
            />
          </div>
          <div className="mt-4">
            <EmptyWatchlist />
          </div>
        </Section>

        {/* ── Table ──────────────────────────────────────────────────────── */}
        <Section title="Table" description="Refined tabular layout for company lists and signal breakdowns.">
          <div className="bg-surface border border-subtle rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-subtle border-b border-subtle">
                <tr>
                  {['Company', 'State', 'Sector', 'Risk Score', 'Tier', 'Notices (12m)'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left type-label text-tertiary font-medium first:pl-5 last:pr-5"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {[
                  { name: 'Meridian Software', state: 'CA', sector: 'Technology', score: 68, tier: 'HIGH' as RiskTier, notices: 2 },
                  { name: 'Atlas Manufacturing', state: 'MI', sector: 'Industrials', score: 44, tier: 'ELEVATED' as RiskTier, notices: 1 },
                  { name: 'Borealis Capital', state: 'NY', sector: 'Finance', score: 18, tier: 'STABLE' as RiskTier, notices: 0 },
                  { name: 'Crestwood Retail', state: 'TX', sector: 'Consumer', score: 31, tier: 'WATCH' as RiskTier, notices: 1 },
                  { name: 'Halcyon Bio', state: 'MA', sector: 'Healthcare', score: 86, tier: 'CRITICAL' as RiskTier, notices: 3 },
                ].map((row) => (
                  <tr key={row.name} className="hover:bg-subtle transition-colors">
                    <td className="px-4 py-3.5 pl-5">
                      <span className="font-medium text-primary">{row.name}</span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-secondary">{row.state}</td>
                    <td className="px-4 py-3.5 text-secondary">{row.sector}</td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono font-semibold text-primary tabular-nums">{row.score}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <RiskBadge tier={row.tier} size="sm" />
                    </td>
                    <td className="px-4 py-3.5 pr-5">
                      <span className={`font-mono text-sm tabular-nums ${row.notices > 0 ? 'text-oxblood-500 font-semibold' : 'text-tertiary'}`}>
                        {row.notices}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ── Composed: Methodology Callout ──────────────────────────────── */}
        <Section title="Methodology Callout" description="Editorial block disclosing the scoring model.">
          <MethodologyCallout />
        </Section>

        {/* ── Composed: Search Hero ──────────────────────────────────────── */}
        <Section title="Search Hero" description="Landing hero section — editorial serif, understated bg.">
          <div className="rounded-xl overflow-hidden border border-subtle">
            <SearchHero variant="landing" />
          </div>
        </Section>

      </div>
    </div>
  )
}
