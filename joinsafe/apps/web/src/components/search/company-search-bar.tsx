'use client'

// CompanySearchBar — typeahead search with keyboard navigation.
// Rendered as a Client Component because it requires browser state and events.
// The parent landing page (Server Component) imports this as an island.

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RiskBadge } from '@joinsafe/ui'
import type { RiskTier } from '@joinsafe/core'

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

export function CompanySearchBar() {
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

  return (
    <div className="relative mx-auto w-full max-w-lg">
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
          {loading ? (
            <svg className="h-4 w-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
          placeholder="Search a company — e.g. &ldquo;Acme Corp&rdquo; or ticker &ldquo;ACME&rdquo;"
          className="w-full rounded-xl border border-gray-300 bg-white py-3.5 pl-11 pr-4 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200"
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
          className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
        >
          {results.map((result, i) => (
            <button
              key={result.id}
              role="option"
              aria-selected={i === activeIndex}
              onClick={() => handleSelect(result)}
              className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors ${
                i === activeIndex ? 'bg-gray-50' : 'hover:bg-gray-50'
              }`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">{result.name}</p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {[result.ticker, result.hqState, result.industry].filter(Boolean).join(' · ')}
                </p>
              </div>

              {result.riskScore && (
                <div className="ml-3 shrink-0 flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-gray-600">
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
