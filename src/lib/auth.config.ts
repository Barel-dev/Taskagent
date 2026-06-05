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
          // gmail.send lets the Email agent send on the user's behalf, and the
          // calendar.events / calendar.freebusy scopes let the Schedule agent
          // read busy times and create events — all only after explicit in-app
          // approval. access_type:offline + prompt:consent ensure Google issues
          // a refresh token so we can mint access tokens for these APIs later.
          // Adding scopes requires the user to re-consent (sign out and back in).
          scope:
            'openid email profile https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy',
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
