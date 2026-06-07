'use client'

import { Search, Settings2, LayoutGrid, Columns3, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { PriorityFilter, SortKey, DueFilter } from '@/lib/task-filter'

type Tag = { id: string; name: string; color: string }

// The filter / sort / view controls for the tasks page. Pure presentational —
// all state lives in TaskList and is passed down.
export function TaskToolbar({
  query,
  setQuery,
  priority,
  setPriority,
  dueFilter,
  setDueFilter,
  tagFilter,
  setTagFilter,
  allTags,
  onManageTags,
  sort,
  setSort,
  hideDone,
  setHideDone,
  view,
  setView,
}: {
  query: string
  setQuery: (v: string) => void
  priority: PriorityFilter
  setPriority: (v: PriorityFilter) => void
  dueFilter: DueFilter
  setDueFilter: (v: DueFilter) => void
  tagFilter: string
  setTagFilter: (v: string) => void
  allTags: Tag[]
  onManageTags: () => void
  sort: SortKey
  setSort: (v: SortKey) => void
  hideDone: boolean
  setHideDone: (v: boolean) => void
  view: 'list' | 'board'
  setView: (v: 'list' | 'board') => void
}) {
  return (
    <div className="tl-rise flex flex-wrap items-center gap-2" style={{ animationDelay: '100ms' }}>
      <div className="relative min-w-[180px] flex-1">
        <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
        <Input
          id="task-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tasks…"
          aria-label="Search tasks"
          className="h-9 border-white/10 bg-white/5 pl-9 text-sm text-white placeholder:text-white/35"
        />
      </div>
      <select
        value={priority}
        onChange={(e) => setPriority(e.target.value as PriorityFilter)}
        aria-label="Filter by priority"
        className="h-9 rounded-md border border-white/10 bg-white/5 px-2.5 text-sm text-white/75 focus:border-violet-400/40 focus:outline-none"
      >
        <option value="ALL">All priorities</option>
        <option value="URGENT">Urgent</option>
        <option value="HIGH">High</option>
        <option value="MEDIUM">Medium</option>
        <option value="LOW">Low</option>
      </select>
      <select
        value={dueFilter}
        onChange={(e) => setDueFilter(e.target.value as DueFilter)}
        aria-label="Filter by due date"
        className="h-9 rounded-md border border-white/10 bg-white/5 px-2.5 text-sm text-white/75 focus:border-violet-400/40 focus:outline-none"
      >
        <option value="ALL">Any time</option>
        <option value="overdue">Overdue</option>
        <option value="today">Due today</option>
        <option value="week">Due this week</option>
      </select>
      {allTags.length > 0 && (
        <>
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            aria-label="Filter by tag"
            className="h-9 rounded-md border border-white/10 bg-white/5 px-2.5 text-sm text-white/75 focus:border-violet-400/40 focus:outline-none"
          >
            <option value="ALL">All tags</option>
            {allTags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
          <Button
            size="icon-sm"
            variant="outline"
            onClick={onManageTags}
            title="Manage tags"
            aria-label="Manage tags"
            className="h-9 w-9 border-white/15 text-white/70 hover:bg-white/5"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
      <select
        value={sort}
        onChange={(e) => setSort(e.target.value as SortKey)}
        aria-label="Sort tasks"
        className="h-9 rounded-md border border-white/10 bg-white/5 px-2.5 text-sm text-white/75 focus:border-violet-400/40 focus:outline-none"
      >
        <option value="default">Sort: Smart</option>
        <option value="due">Sort: Due date</option>
        <option value="priority">Sort: Priority</option>
        <option value="title">Sort: Title</option>
      </select>
      <button
        type="button"
        onClick={() => setHideDone(!hideDone)}
        aria-pressed={hideDone}
        title={hideDone ? 'Show completed tasks' : 'Hide completed tasks'}
        className={`inline-flex h-9 items-center gap-1 rounded-md border px-2.5 text-xs transition-colors ${
          hideDone
            ? 'border-violet-400/40 bg-violet-500/15 text-white'
            : 'border-white/10 text-white/70 hover:bg-white/5'
        }`}
      >
        {hideDone ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        Hide done
      </button>
      <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
        <button
          type="button"
          onClick={() => setView('list')}
          aria-pressed={view === 'list'}
          className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition-colors ${
            view === 'list' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'
          }`}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          List
        </button>
        <button
          type="button"
          onClick={() => setView('board')}
          aria-pressed={view === 'board'}
          className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition-colors ${
            view === 'board' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'
          }`}
        >
          <Columns3 className="h-3.5 w-3.5" />
          Board
        </button>
      </div>
    </div>
  )
}
