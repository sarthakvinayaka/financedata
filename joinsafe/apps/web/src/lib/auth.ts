// NextAuth v5 configuration
//
// Uses the new Auth.js v5 (beta) pattern with Next.js 15 App Router.
// Session is JWT-based for edge compatibility.
// Extend providers here: Google OAuth, magic link, etc.

import NextAuth from 'next-auth'
import type { NextAuthConfig } from 'next-auth'
// import Google from 'next-auth/providers/google'
// import Resend from 'next-auth/providers/resend'

export const authConfig: NextAuthConfig = {
  providers: [
    // Google({
    //   clientId: process.env.AUTH_GOOGLE_ID,
    //   clientSecret: process.env.AUTH_GOOGLE_SECRET,
    // }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user
    },
  },
  session: {
    strategy: 'jwt',
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
