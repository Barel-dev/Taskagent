import { z } from 'zod'

export const taskStatusEnum = z.enum(['TODO', 'IN_PROGRESS', 'DONE'])
export const priorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(5000).optional().nullable(),
  status: taskStatusEnum.optional(),
  priority: priorityEnum.optional(),
  pinned: z.boolean().optional(),
  dueDate: z.coerce.date().optional().nullable(),
  // Tag ids to attach (validated against the user's own tags in the data layer).
  tagIds: z.array(z.string()).max(20).optional(),
  // Attach as a subtask of this task (ownership validated in the data layer).
  parentId: z.string().min(1).optional(),
})

export const createTagSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(40),
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

export const executeRequestSchema = z.object({
  taskId: z.string().min(1, 'taskId is required'),
  // Optional answer to the agent's questions / extra details to use.
  reply: z.string().max(2000).optional(),
})

// Email agent. Drafting takes a plain-language instruction (and optional task
// the email is about). Sending takes the reviewed, user-approved draft.
export const draftEmailRequestSchema = z.object({
  taskId: z.string().min(1).optional(),
  instruction: z.string().min(1, 'Describe the email you want').max(2000),
})

export const sendEmailRequestSchema = z.object({
  to: z.string().email('Enter a valid recipient email'),
  subject: z.string().min(1, 'Subject is required').max(300),
  body: z.string().min(1, 'Body is required').max(20000),
})

// Schedule agent. Proposing takes the task (+ the browser's timezone). Committing
// takes the user-approved slot to write to Google Calendar.
export const scheduleRequestSchema = z.object({
  taskId: z.string().min(1, 'taskId is required'),
  timeZone: z.string().min(1).max(64).optional(),
})

export const scheduleCommitSchema = z.object({
  taskId: z.string().min(1, 'taskId is required'),
  start: z.coerce.date(),
  end: z.coerce.date(),
  timeZone: z.string().min(1).max(64).optional(),
})

// Chat router. A free-text message plus a short rolling history for context.
export const chatRequestSchema = z.object({
  message: z.string().min(1, 'Type a message').max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(4000),
      }),
    )
    .max(20)
    .optional(),
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
