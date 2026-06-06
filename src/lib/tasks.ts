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

  // Subtasks read top-to-bottom in the order they were generated.
  for (const node of nodes.values()) {
    node.children.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  }

  // Top-level ordering: open tasks first, then by due date, then newest first.
  roots.sort((a, b) => {
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
  return prisma.task.create({
    data: {
      ...data,
      userId,
      ...(validParentId ? { parentId: validParentId } : {}),
      ...(validTagIds.length ? { tags: { create: validTagIds.map((tagId) => ({ tagId })) } } : {}),
    },
  })
}

export async function getTaskForUser(userId: string, taskId: string) {
  return prisma.task.findFirst({ where: { id: taskId, userId } })
}

export async function updateTaskForUser(userId: string, taskId: string, input: UpdateTaskInput) {
  const { tagIds, ...data } = input

  // Update scalar fields (if any) and confirm ownership in one go.
  const result =
    Object.keys(data).length > 0
      ? await prisma.task.updateMany({ where: { id: taskId, userId }, data })
      : { count: await prisma.task.count({ where: { id: taskId, userId } }) }
  if (result.count === 0) return null

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

  return prisma.task.findUnique({ where: { id: taskId } })
}

export async function deleteTaskForUser(userId: string, taskId: string) {
  const result = await prisma.task.deleteMany({ where: { id: taskId, userId } })
  return result.count > 0
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
