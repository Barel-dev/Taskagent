// Reusable task templates, stored on-device (localStorage). A template captures
// a task's title, description, priority, and its step titles so a whole
// checklist can be recreated in one click. Client-only helpers.

export type TaskTemplate = {
  id: string
  name: string
  title: string
  description?: string | null
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  steps: string[]
}

const KEY = 'taskagent:templates'

export function loadTemplates(): TaskTemplate[] {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveTemplate(t: TaskTemplate): void {
  localStorage.setItem(KEY, JSON.stringify([...loadTemplates(), t]))
}

export function removeTemplate(id: string): void {
  localStorage.setItem(KEY, JSON.stringify(loadTemplates().filter((t) => t.id !== id)))
}
