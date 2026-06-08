import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

const APP_NAME = process.env['NEXT_PUBLIC_APP_NAME'] ?? 'JoinSafe'
const APP_URL = process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://joinsafe.com'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: `${APP_NAME} — Know the risk before you sign`,
    template: `%s — ${APP_NAME}`,
  },
  description:
    'JoinSafe analyzes public WARN layoff filings, SEC disclosures, and financial indicators to surface employer stability risk before you accept an offer.',
  openGraph: {
    type: 'website',
    siteName: APP_NAME,
    title: `${APP_NAME} — Know the risk before you sign`,
    description:
      'Employer stability risk scores powered by real government data. Free for job seekers.',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${APP_NAME} — Know the risk before you sign`,
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-white font-sans antialiased">{children}</body>
    </html>
  )
}
