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

/**
 * Rename a tag the user owns. Returns the updated tag, or null if not found.
 * Throws Prisma P2002 if the new name collides with another of the user's tags.
 */
export async function renameTagForUser(
  userId: string,
  id: string,
  name: string,
): Promise<TagLite | null> {
  const result = await prisma.tag.updateMany({
    where: { id, userId },
    data: { name: name.trim() },
  })
  if (result.count === 0) return null
  return prisma.tag.findUnique({
    where: { id },
    select: { id: true, name: true, color: true },
  })
}

/** Set a tag's color. Returns the updated tag, or null if not found. */
export async function setTagColorForUser(
  userId: string,
  id: string,
  color: string,
): Promise<TagLite | null> {
  const result = await prisma.tag.updateMany({ where: { id, userId }, data: { color } })
  if (result.count === 0) return null
  return prisma.tag.findUnique({
    where: { id },
    select: { id: true, name: true, color: true },
  })
}

/** Delete a tag the user owns (cascades its task links). */
export async function deleteTagForUser(userId: string, id: string): Promise<boolean> {
  const result = await prisma.tag.deleteMany({ where: { id, userId } })
  return result.count > 0
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
