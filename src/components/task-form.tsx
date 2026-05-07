'use client'
type Task = { id: string; title: string }
export function TaskForm({ onDone }: { task?: Task; onDone: () => void }) {
  return (
    <div>
      Form coming in Task 11.{' '}
      <button onClick={onDone}>Close</button>
    </div>
  )
}
