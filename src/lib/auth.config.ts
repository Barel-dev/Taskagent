import type { NextAuthConfig } from 'next-auth'
import Google from 'next-auth/providers/google'

// Edge-safe auth config: providers, pages, and callbacks only — NO Prisma
// adapter and no DB imports. The middleware builds its NextAuth instance from
// this so the Edge bundle stays small (Prisma lives only in src/lib/auth.ts,
// which runs in Node.js).
export default {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
          // Base login scopes ONLY. Do not bundle sensitive Gmail/Calendar
          // scopes here: Google rejects the whole authorization request — which
          // blocks sign-in entirely — until those scopes are enabled + listed on
          // the OAuth consent screen. The Email/Schedule agents should obtain
          // gmail.send / calendar.events / calendar.freebusy via incremental
          // authorization (a separate "Connect Google" re-consent) when first
          // used, so login is never gated on them.
          scope: 'openid email profile',
        },
      },
    }),
  ],
  pages: {
    signIn: '/signin',
  },
  callbacks: {
    // Copy the user id into the JWT on first sign-in
    jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    // Expose the id on the session object so server components can read it
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string
      }
      return session
    },
  },
} satisfies NextAuthConfig
