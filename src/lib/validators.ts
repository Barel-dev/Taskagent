import { z } from 'zod'

export const taskStatusEnum = z.enum(['TODO', 'IN_PROGRESS', 'DONE'])
export const priorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(5000).optional().nullable(),
  status: taskStatusEnum.optional(),
  priority: priorityEnum.optional(),
  dueDate: z.coerce.date().optional().nullable(),
})

export const updateTaskSchema = createTaskSchema
  .partial()
  .extend({
    completedAt: z.coerce.date().optional().nullable(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'At least one field is required',
  })

export const breakdownRequestSchema = z.object({
  taskId: z.string().min(1, 'taskId is required'),
})

export const planRequestSchema = z.object({
  goal: z.string().min(1, 'Describe a goal').max(500),
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
