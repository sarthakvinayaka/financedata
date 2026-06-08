import { cn } from '../lib/utils'

// ── Card ──────────────────────────────────────────────────────────────────────
// Base surface component. All variants share the same token-based border and
// shadow system; differentiated by fill, padding, and hover behavior.

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'subtle' | 'outlined' | 'elevated' | 'glass'
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  interactive?: boolean
  asChild?: boolean
}

const VARIANT_CLASSES: Record<NonNullable<CardProps['variant']>, string> = {
  default:  'bg-surface border border-subtle shadow-surface',
  subtle:   'bg-subtle border border-subtle',
  outlined: 'bg-surface border border-muted',
  elevated: 'bg-surface border border-subtle shadow-card',
  glass:    'surface-glass',
}

const PADDING_CLASSES: Record<NonNullable<CardProps['padding']>, string> = {
  none: '',
  sm:   'p-4',
  md:   'p-5',
  lg:   'p-6',
  xl:   'p-8',
}

export function Card({
  variant = 'default',
  padding = 'md',
  interactive = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg',
        VARIANT_CLASSES[variant],
        PADDING_CLASSES[padding],
        interactive && 'card-interactive cursor-pointer',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// ── Card sub-components ───────────────────────────────────────────────────────

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-start justify-between gap-3 border-b border-subtle pb-4 mb-4', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('font-sans text-sm font-semibold text-primary tracking-tight', className)}
      {...props}
    >
      {children}
    </h3>
  )
}

export function CardDescription({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-xs text-tertiary mt-0.5 leading-relaxed', className)} {...props}>
      {children}
    </p>
  )
}

export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center gap-3 border-t border-subtle pt-4 mt-4', className)}
      {...props}
    >
      {children}
    </div>
  )
}
