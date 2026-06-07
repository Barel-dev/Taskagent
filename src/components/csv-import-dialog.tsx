'use client'

import { useState } from 'react'
import { Upload, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
type ParsedTask = { title: string; priority?: Priority; dueDate?: string; description?: string }

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

// Minimal CSV line splitter that respects double-quoted fields ("" escapes a
// quote). Good enough for spreadsheet/Notion exports and hand-typed lists.
function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else inQuotes = false
      } else cur += ch
    } else if (ch === '"') inQuotes = true
    else if (ch === ',') {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

// Columns (in order): title, priority, dueDate, description. A line with no
// commas is treated as a bare title. A leading "title,..." header is skipped.
function parseTasks(text: string): ParsedTask[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lines.length === 0) return []
  const first = parseCsvLine(lines[0])
  const body = first[0]?.toLowerCase() === 'title' ? lines.slice(1) : lines

  const tasks: ParsedTask[] = []
  for (const line of body) {
    const f = parseCsvLine(line)
    const title = f[0]
    if (!title) continue
    const pr = (f[1] ?? '').toUpperCase()
    const priority = PRIORITIES.includes(pr) ? (pr as Priority) : undefined
    let dueDate: string | undefined
    if (f[2]) {
      const d = new Date(f[2])
      if (!isNaN(d.getTime())) dueDate = d.toISOString()
    }
    tasks.push({
      title: title.slice(0, 200),
      priority,
      dueDate,
      description: f[3] || undefined,
    })
  }
  return tasks
}

export function CsvImportDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: () => void
}) {
  const [text, setText] = useState('')
  const [importing, setImporting] = useState(false)
  const parsed = parseTasks(text)

  async function readFile(file: File) {
    const content = await file.text()
    setText(content)
  }

  async function doImport() {
    if (parsed.length === 0) return
    setImporting(true)
    try {
      const res = await fetch('/api/tasks/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: parsed }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(data?.error ?? 'Import failed')
        return
      }
      toast.success(`Imported ${data.created} task${data.created === 1 ? '' : 's'}`)
      setText('')
      onOpenChange(false)
      onImported()
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-white/10 bg-[#0b0e1a]/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-white">Import tasks</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-white/55">
            Paste one task per line, or CSV columns:{' '}
            <code className="rounded bg-white/10 px-1 py-0.5 text-xs text-violet-200">
              title, priority, due date, description
            </code>
            . Priority and due date are optional.
          </p>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder={
              'Buy groceries\nFinish report, HIGH, 2026-06-20\nCall the bank, , 2026-06-12'
            }
            className="w-full rounded-lg border border-white/10 bg-white/5 p-3 font-mono text-xs text-white placeholder:text-white/30 focus:border-violet-400/40 focus:outline-none"
          />

          <div className="flex items-center justify-between">
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-white/55 hover:text-white/80">
              <FileText className="h-3.5 w-3.5" />
              Upload a .csv file
              <input
                type="file"
                accept=".csv,text/csv,text/plain"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) readFile(file)
                }}
              />
            </label>
            <span className="text-xs text-white/45">
              {parsed.length > 0
                ? `${parsed.length} task${parsed.length === 1 ? '' : 's'} ready`
                : 'Nothing to import yet'}
            </span>
          </div>

          {parsed.length > 0 && (
            <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-white/10 bg-white/[0.02] p-2">
              {parsed.slice(0, 8).map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-white/70">
                  <span className="truncate">{t.title}</span>
                  {t.priority && (
                    <span className="text-white/35">· {t.priority.toLowerCase()}</span>
                  )}
                  {t.dueDate && <span className="text-white/35">· {t.dueDate.slice(0, 10)}</span>}
                </div>
              ))}
              {parsed.length > 8 && (
                <div className="text-xs text-white/35">+ {parsed.length - 8} more…</div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={importing}
              className="border-white/15 text-white/75 hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={doImport}
              disabled={importing || parsed.length === 0}
              className="btn-accent"
            >
              <Upload className="mr-1 h-3.5 w-3.5" />
              {importing ? 'Importing…' : `Import ${parsed.length || ''}`.trim()}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
