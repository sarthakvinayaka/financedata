'use client'

// Score history chart — renders a line chart of historical risk scores.
// Client Component (Recharts requires browser APIs).

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'

interface HistoryPoint {
  score: number
  tier: string
  computedAt: Date | string
  confidence: number
}

interface ScoreHistoryChartProps {
  history: HistoryPoint[]
}

const TIER_COLORS = {
  STABLE: '#10b981',
  WATCH: '#f59e0b',
  ELEVATED: '#f97316',
  HIGH: '#ef4444',
  CRITICAL: '#991b1b',
}

export function ScoreHistoryChart({ history }: ScoreHistoryChartProps) {
  const data = history.map((h) => ({
    date: new Date(h.computedAt).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    score: Math.round(h.score),
    tier: h.tier,
  }))

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />

        {/* Tier threshold reference lines */}
        <ReferenceLine y={20} stroke="#e5e7eb" strokeDasharray="4 4" />
        <ReferenceLine y={40} stroke="#e5e7eb" strokeDasharray="4 4" />
        <ReferenceLine y={60} stroke="#e5e7eb" strokeDasharray="4 4" />
        <ReferenceLine y={80} stroke="#e5e7eb" strokeDasharray="4 4" />

        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
          formatter={(value: number, _name: string, props: { payload?: { tier: string } }) => [
            `${value} — ${props.payload?.tier ?? ''}`,
            'Risk Score',
          ]}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#1d4ed8"
          strokeWidth={2}
          dot={(props: { cx: number; cy: number; payload: { tier: string } }) => (
            <circle
              key={`dot-${props.cx}-${props.cy}`}
              cx={props.cx}
              cy={props.cy}
              r={3}
              fill={TIER_COLORS[props.payload.tier as keyof typeof TIER_COLORS] ?? '#1d4ed8'}
              stroke="white"
              strokeWidth={1.5}
            />
          )}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
