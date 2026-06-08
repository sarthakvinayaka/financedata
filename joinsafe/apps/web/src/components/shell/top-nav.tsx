// Top navigation shell
//
// Frosted-glass surface, restrained branding, no crowded icon clusters.
// The active state uses a subtle aubergine underline, not a pill or fill.
// Mobile: hamburger collapses to a full-width slide-down menu.

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@joinsafe/ui'

interface NavLink {
  href: string
  label: string
}

const NAV_LINKS: NavLink[] = [
  { href: '/dashboard', label: 'Watchlist' },
  { href: '/methodology', label: 'Methodology' },
  { href: '/pricing', label: 'Pricing' },
]

interface TopNavProps {
  user?: { name?: string | null; email?: string | null } | null
}

export function TopNav({ user }: TopNavProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 surface-glass">
      <div className="mx-auto flex h-[60px] max-w-site items-center justify-between px-5 sm:px-6">

        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group"
          aria-label="JoinSafe home"
        >
          {/* Monogram mark */}
          <span
            aria-hidden="true"
            className="flex h-7 w-7 items-center justify-center rounded-md bg-plum-700 text-xs font-bold text-white group-hover:bg-plum-600 transition-colors"
          >
            JS
          </span>
          <span className="font-sans text-sm font-semibold tracking-tight text-primary">
            JoinSafe
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + '/')
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'relative px-3 py-2 text-sm transition-colors rounded-md',
                  'hover:bg-warm-100 hover:text-primary',
                  isActive
                    ? 'text-primary font-medium'
                    : 'text-secondary font-normal',
                )}
              >
                {link.label}
                {isActive && (
                  <span
                    className="absolute bottom-1.5 left-3 right-3 h-px bg-plum-600 rounded-full"
                    aria-hidden="true"
                  />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Auth actions */}
        <div className="hidden items-center gap-2.5 md:flex">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-tertiary hidden lg:block truncate max-w-[140px]">
                {user.email}
              </span>
              <Link
                href="/api/auth/signout"
                className="btn btn-ghost btn-sm text-secondary"
              >
                Sign out
              </Link>
            </div>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm">
                Sign in
              </Link>
              <Link href="/signup" className="btn btn-primary btn-sm">
                Get started
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          className="md:hidden btn btn-ghost btn-sm p-2"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <div className="md:hidden border-t border-subtle bg-surface px-5 pb-4 pt-2 animate-slide-up">
          <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2.5 text-sm text-secondary hover:text-primary hover:bg-warm-100 rounded-md transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 pt-3 border-t border-subtle flex flex-col gap-2">
            {user ? (
              <Link href="/api/auth/signout" className="btn btn-secondary btn-md w-full justify-center">
                Sign out
              </Link>
            ) : (
              <>
                <Link href="/login" className="btn btn-secondary btn-md w-full justify-center">
                  Sign in
                </Link>
                <Link href="/signup" className="btn btn-primary btn-md w-full justify-center">
                  Get started free
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
