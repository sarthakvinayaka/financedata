import type { Metadata } from 'next'
import { Cormorant_Garamond, Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

// ── Typography ──────────────────────────────────────────────────────────────
// Cormorant Garamond: editorial display serif — H1/H2, hero text, section titles
// Inter: high-legibility sans — all UI text, body, labels, navigation
// JetBrains Mono: tabular numbers — risk scores, financial figures, codes

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '450', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
  display: 'swap',
})

// ── Metadata ────────────────────────────────────────────────────────────────

const APP_NAME = process.env['NEXT_PUBLIC_APP_NAME'] ?? 'JoinSafe'
const APP_URL = process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://joinsafe.com'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: `${APP_NAME} — Know the risk before you sign`,
    template: `%s · ${APP_NAME}`,
  },
  description:
    'Employer stability risk scores built on real WARN Act filings, SEC disclosures, and financial data. Know before you sign.',
  openGraph: {
    type: 'website',
    siteName: APP_NAME,
    title: `${APP_NAME} — Know the risk before you sign`,
    description:
      'Employer stability risk scores powered by public government records.',
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-base font-sans text-primary antialiased">
        {children}
      </body>
    </html>
  )
}
