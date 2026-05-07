import { prisma } from '@/lib/prisma'

export async function createTestUser(overrides: Partial<{ email: string; name: string }> = {}) {
  return prisma.user.create({
    data: {
      email: overrides.email ?? `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`,
      name: overrides.name ?? 'Test User',
    },
  })
}
