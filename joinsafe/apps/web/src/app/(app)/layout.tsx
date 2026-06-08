// Authenticated app shell layout.
// All routes under (app)/ require a valid session.
// This layout adds the top navigation and enforces auth via middleware.

import Link from 'next/link'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="font-bold text-gray-900">
            JoinSafe
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
              Watchlist
            </Link>
            <Link
              href="/api/auth/signout"
              className="text-gray-500 hover:text-gray-900"
            >
              Sign out
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  )
}
