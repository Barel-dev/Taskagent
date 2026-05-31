import { prisma } from '@/lib/prisma'
import type { Task } from '@prisma/client'
import type { CreateTaskInput, UpdateTaskInput } from '@/lib/validators'

export type TaskNode = Task & { children: TaskNode[] }

const STATUS_ORDER = { TODO: 0, IN_PROGRESS: 1, DONE: 2 } as const

export async function listTasksForUser(userId: string): Promise<TaskNode[]> {
  // Fetch every task for the user and assemble the parent → children tree in
  // memory. This supports subtasks nested to any depth (a subtask can itself
  // be broken down), which fixed-depth Prisma `include`s can't express.
  const all = await prisma.task.findMany({ where: { userId } })

  const nodes = new Map<string, TaskNode>(all.map((t) => [t.id, { ...t, children: [] }]))
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
  return prisma.task.create({
    data: { ...input, userId },
  })
}

export async function getTaskForUser(userId: string, taskId: string) {
  return prisma.task.findFirst({ where: { id: taskId, userId } })
}

export async function updateTaskForUser(userId: string, taskId: string, input: UpdateTaskInput) {
  const result = await prisma.task.updateMany({
    where: { id: taskId, userId },
    data: input,
  })
  if (result.count === 0) return null
  return prisma.task.findUnique({ where: { id: taskId } })
}

export async function deleteTaskForUser(userId: string, taskId: string) {
  const result = await prisma.task.deleteMany({ where: { id: taskId, userId } })
  return result.count > 0
}
