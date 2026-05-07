import { beforeEach } from 'vitest'
import { config as loadEnv } from 'dotenv'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'

// Load .env.local so DATABASE_URL / TEST_DATABASE_URL are available.
// Vitest does not auto-load Next.js dotenv files reliably before our setup.
loadEnv({ path: path.resolve(__dirname, '../.env.local') })

const testUrl = process.env.TEST_DATABASE_URL
if (!testUrl) {
  throw new Error(
    'TEST_DATABASE_URL must be set in .env.local for the test suite to run.',
  )
}

// Override DATABASE_URL so any code path that reads env at runtime sees the test DB.
process.env.DATABASE_URL = testUrl

// Construct a Prisma client pinned explicitly to the test DB and stash it on the
// global cache used by src/lib/prisma.ts. Subsequent `await import('@/lib/prisma')`
// calls will pick up this same instance instead of constructing a new one that
// might read a stale DATABASE_URL.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient({
    datasourceUrl: testUrl,
    log: ['error', 'warn'],
  })
}
const prisma = globalForPrisma.prisma

beforeEach(async () => {
  await prisma.task.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.user.deleteMany()
})
