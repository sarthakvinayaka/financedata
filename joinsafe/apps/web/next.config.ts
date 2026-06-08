import type { NextConfig } from 'next'

const config: NextConfig = {
  // Transpile monorepo packages — required because they export raw TypeScript
  // (no pre-compilation step in development for faster DX).
  transpilePackages: ['@joinsafe/ui', '@joinsafe/core', '@joinsafe/db'],

  experimental: {
    // Server Actions are stable in Next.js 15 — no flag needed.
    // Opt in to partial prerendering for pages with Suspense boundaries.
    ppr: false, // Enable once stable: 'incremental'
  },

  images: {
    remotePatterns: [
      // Add external image sources here (e.g., company logos from Clearbit)
    ],
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
}

export default config
