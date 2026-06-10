import { prisma } from '@/lib/prisma'
import type { Task } from '@prisma/client'
import type { CreateTaskInput, UpdateTaskInput } from '@/lib/validators'
import { ownedTagIds, type TagLite } from '@/lib/tags'

export type TaskNode = Task & { children: TaskNode[]; tags: TagLite[] }

const STATUS_ORDER = { TODO: 0, IN_PROGRESS: 1, DONE: 2 } as const

export async function listTasksForUser(userId: string): Promise<TaskNode[]> {
  // Fetch every task for the user and assemble the parent → children tree in
  // memory. This supports subtasks nested to any depth (a subtask can itself
  // be broken down), which fixed-depth Prisma `include`s can't express.
  const all = await prisma.task.findMany({
    where: { userId },
    include: { tags: { select: { tag: { select: { id: true, name: true, color: true } } } } },
  })

  const nodes = new Map<string, TaskNode>(
    all.map((t) => {
      const { tags, ...rest } = t
      return [t.id, { ...rest, children: [], tags: tags.map((tt) => tt.tag) }]
    }),
  )
  const roots: TaskNode[] = []
  for (const t of all) {
    const node = nodes.get(t.id)!
    const parent = t.parentId ? nodes.get(t.parentId) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node) // top-level, or an orphan whose parent is gone
  }

  // Subtasks read top-to-bottom by their manual order, then creation time.
  for (const node of nodes.values()) {
    node.children.sort((a, b) => a.order - b.order || a.createdAt.getTime() - b.createdAt.getTime())
  }

  // Top-level ordering: pinned first, then open tasks, then by due date, newest.
  roots.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    if (STATUS_ORDER[a.status] !== STATUS_ORDER[b.status]) {
      return STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    }
    const ad = a.dueDate?.getTime() ?? Infinity
    const bd = b.dueDate?.getTime() ?? Infinity
    if (ad !== bd) return ad - bd
    return b.createdAt.getTime() - a.createdAt.getTime()
  })

  return roots
}

export async function createTaskForUser(userId: string, input: CreateTaskInput) {
  const { tagIds, parentId, ...data } = input
  const validTagIds = await ownedTagIds(userId, tagIds)
  // Only attach to a parent the user owns; otherwise create it top-level.
  let validParentId: string | undefined
  if (parentId) {
    const owned = await prisma.task.count({ where: { id: parentId, userId } })
    if (owned) validParentId = parentId
  }
  // New tasks go to the end of their sibling list (top-level or under a parent).
  const order = await prisma.task.count({ where: { userId, parentId: validParentId ?? null } })
  return prisma.task.create({
    data: {
      ...data,
      userId,
      order,
      ...(validParentId ? { parentId: validParentId } : {}),
      ...(validTagIds.length ? { tags: { create: validTagIds.map((tagId) => ({ tagId })) } } : {}),
    },
  })
}

/**
 * Persist a manual ordering of tasks (drag-to-reorder). Each id's `order` is set
 * to its index in the array. Scoped to the caller's own tasks via userId, so
 * foreign ids are silently ignored.
 */
export async function reorderTasksForUser(userId: string, ids: string[]) {
  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.task.updateMany({ where: { id, userId }, data: { order: index } }),
    ),
  )
}

export async function getTaskForUser(userId: string, taskId: string) {
  return prisma.task.findFirst({ where: { id: taskId, userId } })
}

export async function updateTaskForUser(userId: string, taskId: string, input: UpdateTaskInput) {
  const { tagIds, ...data } = input

  // Load the current row first: it confirms ownership and lets us detect the
  // not-DONE → DONE transition below.
  const before = await prisma.task.findFirst({ where: { id: taskId, userId } })
  if (!before) return null

  // Stamp/clear completedAt on status transitions when the client didn't send
  // it, so completion analytics don't depend on every client remembering to.
  if (data.status !== undefined && data.completedAt === undefined) {
    if (data.status === 'DONE' && before.status !== 'DONE') data.completedAt = new Date()
    else if (data.status !== 'DONE' && before.status === 'DONE') data.completedAt = null
  }

  if (Object.keys(data).length > 0) {
    await prisma.task.update({ where: { id: taskId }, data })
  }

  // Replace the task's tags when tagIds is provided (omit to leave unchanged).
  if (tagIds !== undefined) {
    const validTagIds = await ownedTagIds(userId, tagIds)
    await prisma.$transaction([
      prisma.taskTag.deleteMany({ where: { taskId } }),
      ...(validTagIds.length
        ? [prisma.taskTag.createMany({ data: validTagIds.map((tagId) => ({ taskId, tagId })) })]
        : []),
    ])
  }

  // Completing a recurring task spawns the next occurrence — only on the
  // transition into DONE, so re-saving an already-done task (or toggling
  // DONE → TODO → DONE) can't create duplicates.
  if (data.status === 'DONE' && before.status !== 'DONE' && before.recurrence !== 'NONE') {
    await prisma.task.create({
      data: {
        userId,
        title: before.title,
        description: before.description,
        priority: before.priority,
        recurrence: before.recurrence,
        parentId: before.parentId,
        dueDate: nextOccurrence(before.dueDate ?? new Date(), before.recurrence),
      },
    })
  }

  return prisma.task.findUnique({ where: { id: taskId } })
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function nextOccurrence(base: Date, recurrence: string): Date {
  const d = new Date(base)
  const day = d.getDate()
  if (recurrence === 'DAILY') d.setDate(d.getDate() + 1)
  else if (recurrence === 'WEEKLY') d.setDate(d.getDate() + 7)
  else if (recurrence === 'MONTHLY') {
    // Clamp to the target month's length so Jan 31 → Feb 28, not Mar 3.
    d.setDate(1)
    d.setMonth(d.getMonth() + 1)
    d.setDate(Math.min(day, daysInMonth(d.getFullYear(), d.getMonth())))
  } else if (recurrence === 'YEARLY') {
    // Same clamp for leap days: Feb 29 → Feb 28 next year.
    d.setDate(1)
    d.setFullYear(d.getFullYear() + 1)
    d.setDate(Math.min(day, daysInMonth(d.getFullYear(), d.getMonth())))
  }
  return d
}

export async function deleteTaskForUser(userId: string, taskId: string) {
  const result = await prisma.task.deleteMany({ where: { id: taskId, userId } })
  return result.count > 0
}

/**
 * Duplicate a task the user owns — copies its fields, subtasks, and tags into a
 * fresh "(copy)" with status reset to TODO. Returns the new task, or null if not
 * found. Agent results/summaries are intentionally not carried over.
 */
export async function duplicateTaskForUser(userId: string, taskId: string) {
  const orig = await prisma.task.findFirst({
    where: { id: taskId, userId },
    include: {
      children: { orderBy: { createdAt: 'asc' } },
      tags: { select: { tagId: true } },
    },
  })
  if (!orig) return null

  return prisma.task.create({
    data: {
      userId,
      title: `${orig.title} (copy)`,
      description: orig.description,
      priority: orig.priority,
      dueDate: orig.dueDate,
      estimatedMinutes: orig.estimatedMinutes,
      tags: orig.tags.length ? { create: orig.tags.map((t) => ({ tagId: t.tagId })) } : undefined,
      children: orig.children.length
        ? {
            create: orig.children.map((c) => ({
              userId,
              title: c.title,
              description: c.description,
              priority: c.priority,
              estimatedMinutes: c.estimatedMinutes,
            })),
          }
        : undefined,
    },
  })
}

/**
 * Record the calendar block the Schedule agent created on a task the caller
 * owns. Returns false when the task isn't found / not owned by the user.
 */
export async function setTaskSchedule(
  userId: string,
  taskId: string,
  data: { scheduledStart: Date; scheduledEnd: Date; calendarEventId: string },
) {
  const result = await prisma.task.updateMany({ where: { id: taskId, userId }, data })
  return result.count > 0
}
