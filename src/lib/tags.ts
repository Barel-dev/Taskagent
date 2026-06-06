import { prisma } from '@/lib/prisma'
import { TAG_COLORS } from '@/lib/tag-colors'

export type TagLite = { id: string; name: string; color: string }

export async function listTagsForUser(userId: string): Promise<TagLite[]> {
  return prisma.tag.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, color: true },
  })
}

/**
 * Create a tag for the user, or return the existing one with that name (tags are
 * unique per user). New tags get a color by cycling the palette.
 */
export async function createTagForUser(userId: string, name: string): Promise<TagLite> {
  const trimmed = name.trim()
  const existing = await prisma.tag.findFirst({
    where: { userId, name: trimmed },
    select: { id: true, name: true, color: true },
  })
  if (existing) return existing

  const count = await prisma.tag.count({ where: { userId } })
  const color = TAG_COLORS[count % TAG_COLORS.length]
  try {
    return await prisma.tag.create({
      data: { userId, name: trimmed, color },
      select: { id: true, name: true, color: true },
    })
  } catch {
    // Lost a race on the @@unique([userId, name]) — return the now-existing row.
    const row = await prisma.tag.findFirst({
      where: { userId, name: trimmed },
      select: { id: true, name: true, color: true },
    })
    if (row) return row
    throw new Error('Could not create tag')
  }
}

/** Narrow a list of tag ids to those actually owned by the user. */
export async function ownedTagIds(userId: string, tagIds?: string[]): Promise<string[]> {
  if (!tagIds || tagIds.length === 0) return []
  const owned = await prisma.tag.findMany({
    where: { userId, id: { in: tagIds } },
    select: { id: true },
  })
  return owned.map((t) => t.id)
}
