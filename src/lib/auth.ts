import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import authConfig from '@/lib/auth.config'

// Full config (Node.js runtime): the Edge-safe base + the Prisma adapter.
// JWT strategy so the Edge middleware can verify sessions without the DB;
// Prisma still stores User/Account records during sign-in (which runs in Node).
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  events: {
    // Auth.js does NOT refresh stored OAuth tokens on re-login for an existing
    // account, so persist them ourselves. This is what makes incremental
    // authorization work: when the user re-consents with broader scopes (the
    // "Connect Google" flow for the Email/Schedule agents), the new
    // access/refresh token + scope land in the Account row for getGoogleAccessToken.
    async signIn({ account }) {
      if (account?.provider !== 'google') return
      await prisma.account.updateMany({
        where: { provider: 'google', providerAccountId: account.providerAccountId },
        data: {
          access_token: account.access_token,
          expires_at: account.expires_at,
          scope: account.scope,
          // Google only returns a refresh_token on consent; keep the old one otherwise.
          ...(account.refresh_token ? { refresh_token: account.refresh_token } : {}),
        },
      })
    },
  },
})
