'use client'

// CompanySearchBar — typeahead search with keyboard navigation.
// Rendered as a Client Component because it requires browser state and events.
// The parent landing page (Server Component) imports this as an island.

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RiskBadge } from '@joinsafe/ui'
import type { RiskTier } from '@joinsafe/core'

type SearchBarSize = 'md' | 'lg'

interface SearchResult {
  id: string
  name: string
  slug: string
  ticker: string | null
  hqState: string | null
  industry: string | null
  isPublic: boolean
  riskScore: { score: number; tier: string } | null
}

export function CompanySearchBar({ size = 'md' }: { size?: SearchBarSize }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      setOpen(false)
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = (await res.json()) as { results: SearchResult[] }
      setResults(data.results)
      setOpen(data.results.length > 0)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value
    setQuery(q)
    setActiveIndex(-1)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(q), 200)
  }

  const handleSelect = (result: SearchResult) => {
    setOpen(false)
    setQuery(result.name)
    router.push(`/company/${result.slug}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      const result = results[activeIndex]
      if (result) handleSelect(result)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        !inputRef.current?.contains(e.target as Node) &&
        !dropdownRef.current?.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const isLg = size === 'lg'

  return (
    <div className="relative w-full">
      <div className="relative">
        {/* Search icon / spinner */}
        <div className={`pointer-events-none absolute inset-y-0 left-0 flex items-center ${isLg ? 'pl-4' : 'pl-3.5'}`}>
          {loading ? (
            <svg className={`animate-spin text-warm-400 ${isLg ? 'h-5 w-5' : 'h-4 w-4'}`} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className={`text-warm-400 ${isLg ? 'h-5 w-5' : 'h-4 w-4'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={isLg ? 'Search by company name or ticker — e.g. "Meridian Software"' : 'Search a company or ticker'}
          className={`input w-full ${isLg ? 'input-lg pl-12' : 'pl-10'} shadow-surface`}
          aria-label="Search companies"
          aria-autocomplete="list"
          aria-controls="search-results"
          aria-expanded={open}
          autoComplete="off"
        />
      </div>

      {open && results.length > 0 && (
        <div
          id="search-results"
          ref={dropdownRef}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-subtle bg-surface shadow-overlay animate-slide-up"
        >
          {results.map((result, i) => (
            <button
              key={result.id}
              role="option"
              aria-selected={i === activeIndex}
              onClick={() => handleSelect(result)}
              className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors border-b border-subtle last:border-0 ${
                i === activeIndex ? 'bg-subtle' : 'hover:bg-subtle'
              }`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-primary">{result.name}</p>
                <p className="mt-0.5 type-caption text-faint">
                  {[result.ticker, result.hqState, result.industry].filter(Boolean).join(' · ')}
                </p>
              </div>

              {result.riskScore && (
                <div className="ml-3 shrink-0 flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-secondary tabular-nums">
                    {Math.round(result.riskScore.score)}
                  </span>
                  <RiskBadge tier={result.riskScore.tier as RiskTier} size="sm" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
