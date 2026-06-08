// Skeleton loaders — shimmer placeholders for async content.
// Sized to match the components they replace so layout shift is minimal.

import { cn } from '../lib/utils'

interface SkeletonProps {
  className?: string
  rounded?: 'sm' | 'md' | 'lg' | 'pill'
}

const ROUNDED = {
  sm:   'rounded-sm',
  md:   'rounded-md',
  lg:   'rounded-lg',
  pill: 'rounded-pill',
}

export function Skeleton({ className, rounded = 'md' }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('skeleton', ROUNDED[rounded], className)}
    />
  )
}

// ── Composed skeletons for specific component shapes ──────────────────────

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-3.5',
            i === lines - 1 ? 'w-3/4' : 'w-full',
          )}
        />
      ))}
    </div>
  )
}

export function SkeletonMetricCard({ className }: { className?: string }) {
  return (
    <div className={cn('bg-surface border border-subtle rounded-lg p-5 space-y-3', className)} aria-hidden="true">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-20" rounded="sm" />
      <Skeleton className="h-3 w-32" />
    </div>
  )
}

export function SkeletonCompanyRow({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-between px-5 py-4', className)} aria-hidden="true">
      <div className="space-y-1.5">
        <Skeleton className="h-3.5 w-36" />
        <Skeleton className="h-2.5 w-24" />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-4 w-8" />
        <Skeleton className="h-5 w-16" rounded="pill" />
      </div>
    </div>
  )
}

export function SkeletonScoreCard({ className }: { className?: string }) {
  return (
    <div className={cn('bg-surface border border-subtle rounded-lg p-6', className)} aria-hidden="true">
      <div className="flex items-center gap-4">
        <Skeleton className="h-28 w-28 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-3 w-40 mt-3" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonSignalCard({ className }: { className?: string }) {
  return (
    <div className={cn('px-5 py-4 border-b border-subtle last:border-0', className)} aria-hidden="true">
      <div className="flex items-start gap-3">
        <Skeleton className="h-4 w-4 mt-0.5" rounded="sm" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3.5 w-48" />
            <Skeleton className="h-4 w-16" rounded="sm" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>
    </div>
  )
}
