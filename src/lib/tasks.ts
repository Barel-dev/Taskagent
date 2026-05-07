import { prisma } from '@/lib/prisma'
import type { CreateTaskInput, UpdateTaskInput } from '@/lib/validators'

export async function listTasksForUser(userId: string) {
  return prisma.task.findMany({
    where: { userId },
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
  })
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
