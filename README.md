# TaskAgent

An AI task manager where specialized agents don't just organize your work — they **do** it. Describe a goal, and agents plan it, break it into steps, **search the live web to actually carry tasks out**, prioritize your day, and brief you on what matters.

> **Live demo:** https://taskagent-amber.vercel.app
> **Stack:** Next.js 15 · TypeScript · Prisma + Postgres (Neon) · NextAuth v5 (Google) · Google Gemini · Tailwind v4

<!-- Add a screenshot or GIF here: ![TaskAgent](docs/screenshot.png) -->

## What it does

You sign in with Google, then work with a grid of task tiles. Open any task to reach its agents:

| Agent              | What it does                                                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Plan**           | Turns a plain-language goal ("plan a trip to Lisbon") into a task with ordered subtasks.                                                               |
| **Breakdown**      | Splits a task into 3–7 ordered, time-estimated steps.                                                                                                  |
| **Refine**         | Sharpens a vague task into a clear title, description, and acceptance criteria — you review and apply.                                                 |
| **Do it**          | **Actually performs the task** using Gemini + live Google Search, and returns real results as rich preview cards (image, title, sources).              |
| **Do all**         | Runs _every_ subtask in sequence, sharing each result as context for the next.                                                                         |
| **Prioritizer**    | Reweighs every open task by urgency, due date, and effort, then reorders your day — and explains why.                                                  |
| **Daily Briefing** | A short morning brief across all your tasks: what's due, what's overdue, what to focus on.                                                             |
| **Summary**        | Rolls a whole plan up into a status briefing.                                                                                                          |
| **Email**          | Drafts an email about a task, shows it for you to review/edit, and **sends it from your own Gmail** — but only after you click Send. Never auto-sends. |
| **Schedule**       | Reads your Google Calendar busy times and proposes slots for a task; on your approval it **creates the calendar event** and books the time.            |
| **Chat**           | A sidebar assistant: ask about your tasks ("what's due?", "what should I focus on?") or tell it to plan something new and it creates the task for you. |

Agents **share context**: answers you give one agent (dates, budget, who's traveling) are saved to the plan and reused by the others, so they stop re-asking what's already known.

## Workspace & views

- **Today / Focus page:** a time-of-day greeting plus everything that needs attention — overdue, due today, and scheduled-today — with one-click complete and snooze-to-tomorrow.
- **Three views:** a tile **list**, a drag-and-drop **Kanban board** (drag to change status, drag to reorder, quick-add per column), and a **calendar** (week + month grid) that plots tasks by scheduled time or due date, with drag-to-reschedule, an overdue ring on past-day chips, and keyboard navigation. Your view choice is remembered.
- **Quick capture:** natural-language quick-add — typing `Email Dan tomorrow !high` sets the due date and priority automatically (works in the list bar, board/calendar add, and steps); plus **reusable templates** (save a task + its steps, recreate in one click), **CSV / paste import**, and a **⌘K command palette** (jump to a view, search tasks, new task, new from template, import).
- **Inline editing everywhere:** click a tile's priority to cycle it or its due chip to pick a date; the detail edits title, description (Markdown), priority, due, and tags in place; steps can be renamed, reordered (drag), run, completed, and deleted.
- **Organize:** colored **tags** (create, recolor, click a chip to filter, bulk-add, manage); priorities; **pin** to top; **recurring tasks** (daily / weekly / monthly / yearly that respawn the next occurrence on completion); and **manual drag-to-reorder** of top-level tasks.
- **Find & focus:** search with **match highlighting**, filters (priority / tag / due window) with one-click "N overdue · N due today" chips, **hide-done** toggle, **saved views**, sort by smart / due / priority / title / manual, and a clear-filters shortcut.
- **Bulk actions:** multi-select tasks to set status, priority, or due date, add a tag, or delete — with select all / none.
- **Smart due dates:** relative labels ("Today", "Tomorrow", "2d overdue", "in 3d") with overdue/soon color highlighting.
- **Dashboard:** task stats, a **completion streak**, an **open-work** time estimate, by-priority deep-links, **scheduled-next** list, recurring count, a 14-day activity chart, by-agent breakdown, and an **expandable recent-run drill-down** (input/output/error).
- **Reminders & preferences:** opt-in **browser notifications** for due-soon tasks; a **settings** page (default view/sort/priority, completion confetti, reminders, reset local data); persisted chat history.
- **Keyboard shortcuts:** `⌘K`/`Ctrl+K` palette · `n` new task · `/` search · `b` toggle list/board · `g` then `t`/`c`/`d`/`s` to navigate · `?` help; calendar `←`/`→`, `t`, `w`/`m`.
- **Focus timer:** a per-task Pomodoro (25-min) in the detail that counts your completed focus sessions.
- **Installable PWA:** add TaskAgent to your home screen / desktop (web manifest, branded icon, standalone display).
- **Touches:** copy a task as Markdown, export the whole workspace as Markdown, copy a shareable task link, confetti when you finish your last task.

## How it works

- **Agents** live in `src/lib/agents/*`. Each calls Google Gemini (`gemini-2.5-flash`) and logs an `AgentRun` row (input, output, status, tokens) — surfaced on the **/dashboard** page.
- **"Do it"** uses Gemini's **Google Search grounding** to search the live web, then `src/lib/link-preview.ts` fetches each source's OpenGraph data so results render as rich cards.
- **"Email"** drafts with Gemini, then sends through the **Gmail API** (`src/lib/google.ts`) using the user's stored Google OAuth token (auto-refreshed on expiry). Drafting and sending are separate endpoints — the draft route never sends.
- **"Schedule"** reads free/busy and creates events through the **Google Calendar API** (`src/lib/google.ts`), reusing the same token helper. Proposing slots and creating the event are separate endpoints — proposing never writes to the calendar.
- **"Chat"** classifies each message with Gemini (structured output): read-only questions are answered from your task list, while a "create a task" intent is dispatched to the Planner. No new OAuth and no persisted history.
- **Structured output** (Gemini `responseSchema`) + **Zod** validation guarantees well-formed agent results.
- **Demo mode:** with no `GEMINI_API_KEY` set, agents return free placeholder output so the whole flow is testable at zero cost; the real agents switch on automatically once a key is present.
- **Safety:** per-user, DB-backed rate limiting on every agent route; graceful handling of provider quota (429).

## Local setup

```bash
git clone https://github.com/Barel-dev/Taskagent && cd Taskagent
npm install
cp .env.example .env.local   # then fill in the values below
npx prisma migrate dev
npm run dev
```

Environment variables (`.env.local`):

| Var                                     | Notes                                                                                                                                                                                         |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                          | Postgres (Neon) connection string                                                                                                                                                             |
| `TEST_DATABASE_URL`                     | Separate Neon branch, used by the test suite                                                                                                                                                  |
| `AUTH_SECRET`                           | `openssl rand -base64 32`                                                                                                                                                                     |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth credentials. For the Email/Schedule agents, add the `gmail.send`, `calendar.events`, and `calendar.freebusy` scopes on the OAuth consent screen and sign in again to grant them. |
| `GEMINI_API_KEY`                        | Free key from https://aistudio.google.com/apikey (optional — without it, demo mode)                                                                                                           |

## Testing

```bash
npm test    # Vitest — Zod validators, data layer, and every agent (Gemini mocked, $0),
            # plus pure-function unit tests for filtering, sorting, due labels,
            # and the natural-language quick-add parser
```

## Deploying (Vercel)

1. Import the repo on Vercel.
2. Build command: `prisma migrate deploy && next build`.
3. Add the env vars above (`GEMINI_API_KEY` included for real agents).
4. Add `https://<your-domain>/api/auth/callback/google` to the Google OAuth redirect URIs.

## Status

Built and working: Plan, Breakdown, Do it (live web search), Do all, Prioritizer, Daily Briefing, Summary, Email (drafts and sends via Gmail after you approve), Schedule (proposes calendar slots and books the event after you approve), plus the agent dashboard. All five of the originally-designed agents are now built.

---

### Resume bullets

- Built a full-stack AI task manager (Next.js 15, TypeScript, Prisma/Postgres, NextAuth) where **9 specialized agents** plan, execute, prioritize, email, and schedule work.
- Implemented an **agent that performs tasks autonomously** via Google Gemini with **live web-search grounding**, returning cited, rich results — with structured-output + Zod validation, shared cross-agent context, rate limiting, and an audit log.
- Integrated the **Gmail and Google Calendar APIs** so agents draft/send email and propose/book calendar events from the user's account, with OAuth-token auto-refresh and a mandatory human-approval step (no auto-send/auto-book path in code).
- Designed a premium, responsive UI (tile grid + detail modal) and shipped it to Vercel; backed by a Vitest suite covering validators, data layer, and all agents.
