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
})
