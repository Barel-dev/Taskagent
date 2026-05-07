'use client'

import { useState } from 'react'
import { TaskItem } from '@/components/task-item'
import { TaskForm } from '@/components/task-form'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type Task = Parameters<typeof TaskItem>[0]['task']

export function TaskList({ initialTasks }: { initialTasks: Task[] }) {
  const [editing, setEditing] = useState<Task | null>(null)
  const [creating, setCreating] = useState(false)

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Tasks</h2>
        <Button onClick={() => setCreating(true)}>New task</Button>
      </div>

      {initialTasks.length === 0 && (
        <p className="text-muted-foreground">No tasks yet. Create one to get started.</p>
      )}

      <div className="space-y-2">
        {initialTasks.map((t) => (
          <TaskItem key={t.id} task={t} onEdit={setEditing} />
        ))}
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New task</DialogTitle>
          </DialogHeader>
          <TaskForm onDone={() => setCreating(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit task</DialogTitle>
          </DialogHeader>
          {editing && <TaskForm task={editing} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
