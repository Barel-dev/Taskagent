# TaskAgent — Design Document

**Date:** 2026-05-05
**Author:** Barel Berhayev
**Status:** Draft (pending review)

## 1. Overview

TaskAgent is a full-stack AI-powered task manager. Users sign in with Google, manage tasks across multiple views, and delegate work to five specialized AI sub-agents that act on the user's behalf — drafting emails, breaking down tasks, scheduling work into the user's calendar, sending daily briefings, and prioritizing the day.

This is a semester-long capstone project (~15 weeks) intended as a portfolio centerpiece for a CS undergrad resume.

## 2. Goals & Success Criteria

**Primary goals:**
- Build a deployed, demo-able full-stack web app that recruiters can click through.
- Demonstrate competence across modern full-stack TypeScript, relational data modeling, OAuth, third-party API integration, AI agent orchestration, and event-driven background processing.
- Produce 6–8 concrete resume bullets backed by working code.

**Success criteria:**
- Live demo URL on the resume.
- All 5 agents work end-to-end on real Gmail/Calendar accounts.
- README includes architecture diagram, demo video, and setup instructions.
- Author can explain every architectural decision in an interview.

**Non-goals:**
- Multi-tenant team/org features (single-user app).
- Mobile-native apps.
- Custom auth (we use NextAuth + Google OAuth only).
- Payment/billing.

## 3. Architecture

```
┌─────────────────────────────────────────────────────┐
│              Browser (Next.js client)               │
│   List / Kanban / Calendar views, Chat UI           │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP
┌──────────────────────▼──────────────────────────────┐
│           Next.js 15 (App Router) — Vercel          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │  React UI    │  │  API Routes  │  │  NextAuth │  │
│  │  (RSC + CC)  │  │  (CRUD)      │  │  Google   │  │
│  └──────────────┘  └──────┬───────┘  └─────┬─────┘  │
└─────────────────────────┬─┴────────────────┴────────┘
                          │                  │
              ┌───────────▼────────┐ ┌───────▼────────┐
              │  Inngest           │ │  Postgres      │
              │  (background +     │ │  (Neon, via    │
              │   cron for agents) │ │   Prisma ORM)  │
              └─────┬──────────────┘ └────────────────┘
                    │
       ┌────────────┼────────────────────────┐
       │            │                        │
┌──────▼──────┐ ┌───▼──────────┐ ┌──────────▼─────┐
│  Anthropic  │ │  Gmail API   │ │  Google        │
│  Claude API │ │  (send mail) │ │  Calendar API  │
└─────────────┘ └──────────────┘ └────────────────┘
```

**Single Next.js app + Inngest worker pattern:**
- The Next.js app handles UI, auth, and CRUD APIs.
- Long-running or scheduled work (agent execution, daily 7am briefing) runs in Inngest functions, which receive events from the API and call out to Claude / Gmail / Calendar.
- Postgres is the single source of truth.

## 4. Tech Stack

| Layer | Choice | Justification |
|---|---|---|
| Frontend framework | Next.js 15 (App Router) + TypeScript | Modern full-stack, server components, single deployment |
| UI components | Tailwind CSS + shadcn/ui | Polished UI without weeks of CSS work |
| Auth | NextAuth.js (Auth.js v5) with Google provider | Free, gives raw OAuth tokens for Gmail/Calendar |
| Database | PostgreSQL (Neon, free tier) | Industry standard relational DB |
| ORM | Prisma | Type-safe queries, automatic migrations, great DX |
| AI | Anthropic Claude API (`claude-sonnet-4-6`) | Best-in-class for agent reasoning + tool use |
| Background jobs | Inngest (free tier) | Cron + event-driven workers, no infra to manage |
| External APIs | Gmail API, Google Calendar API | For email and schedule agents |
| Hosting | Vercel (Next.js) + Neon (DB) + Inngest Cloud | All free tiers; one-click deploy |
| Form/validation | React Hook Form + Zod | Type-safe end-to-end |
| Testing | Vitest + Playwright | Unit + e2e |

## 5. Data Model (Prisma schema sketch)

```prisma
model User {
  id              String   @id @default(cuid())
  email           String   @unique
  name            String?
  image           String?
  googleAccessToken  String?  // for Gmail/Calendar
  googleRefreshToken String?
  tokenExpiresAt     DateTime?
  createdAt       DateTime @default(now())
  tasks           Task[]
  tags            Tag[]
  agentRuns       AgentRun[]
  chatMessages    ChatMessage[]
}

model Task {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  title       String
  description String?
  status      TaskStatus @default(TODO)  // TODO, IN_PROGRESS, DONE
  priority    Priority   @default(MEDIUM) // LOW, MEDIUM, HIGH, URGENT
  dueDate     DateTime?
  scheduledStart DateTime?  // when scheduled in calendar
  scheduledEnd   DateTime?
  parentId    String?  // subtasks
  parent      Task?    @relation("Subtasks", fields: [parentId], references: [id])
  children    Task[]   @relation("Subtasks")
  tags        Tag[]    @relation("TaskTags")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  completedAt DateTime?
}

model Tag {
  id      String @id @default(cuid())
  userId  String
  name    String
  color   String
  user    User   @relation(fields: [userId], references: [id])
  tasks   Task[] @relation("TaskTags")
  @@unique([userId, name])
}

model AgentRun {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  agentType   AgentType  // EMAIL, BREAKDOWN, SCHEDULE, BRIEFING, PRIORITIZER
  status      RunStatus  // PENDING, RUNNING, SUCCESS, FAILED
  input       Json
  output      Json?
  error       String?
  tokensUsed  Int?
  createdAt   DateTime @default(now())
  completedAt DateTime?
}

model ChatMessage {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  role      String   // "user" | "assistant"
  content   String
  toolCalls Json?
  createdAt DateTime @default(now())
}
```

## 6. The Five AI Agents (+ Chat Router)

Five specialist agents, plus a chat interface that routes natural-language requests to the right specialist. All use Claude Sonnet 4.6 with tool use. Each has a tightly-scoped system prompt and a small set of tools. Every agent execution is logged to `AgentRun` for observability.

### 6.1 Breakdown Agent
**Trigger:** User clicks "Break down" on a task or types in chat.
**Input:** Task title + description.
**Output:** 3–8 suggested subtasks with titles, priorities, and rough time estimates.
**Tools:** `create_subtask(parent_id, title, priority, estimate_minutes)`
**Why first:** No external APIs, easiest to test.

### 6.2 Prioritizer Agent
**Trigger:** User clicks "Prioritize my day" or runs daily.
**Input:** All open tasks with metadata.
**Output:** Reordered list with reasoning per task.
**Tools:** `update_task_priority`, `suggest_order(task_ids[])`

### 6.3 Chat Router (UI affordance, not a 6th agent)
**Trigger:** User types in the chat sidebar.
**Behavior:** Single Claude call that classifies intent and either answers directly (read-only questions like "what's due today?") or invokes the matching specialist agent (Breakdown / Prioritizer / Email / Schedule). Returns streaming responses.
**Tools:** Read-only tools (`list_tasks`, `get_task`, `search_tasks`) + dispatch tools that enqueue specialist agent runs.

### 6.4 Email Agent
**Trigger:** "Email Sarah about the budget review task" in chat, or task action button.
**Input:** Natural language email request + context task(s).
**Behavior:**
1. Drafts subject + body using Claude.
2. Shows draft in modal — user approves before send.
3. On approve: sends via Gmail API using stored OAuth token.
**Tools:** `draft_email(to, subject, body)`, `send_email(draft_id)` (only after user confirmation).
**Safety:** Never auto-sends. Always requires explicit user approval.

### 6.5 Schedule Agent
**Trigger:** "Schedule this task" button or "schedule my week" command.
**Input:** Task(s) + Google Calendar busy data for next 7 days.
**Behavior:**
1. Fetches free/busy from Google Calendar.
2. Proposes time slots respecting task duration estimates and priorities.
3. On approve: creates calendar events + sets `scheduledStart`/`scheduledEnd` on tasks.
**Tools:** `get_calendar_busy(start, end)`, `propose_slots(task_id, options[])`, `create_event(task_id, start, end)`.

### 6.6 Daily Briefing Agent
**Trigger:** Inngest cron at 7:00 AM in user's timezone.
**Behavior:**
1. Pulls today's tasks (due today, scheduled today, overdue).
2. Generates a friendly markdown briefing.
3. Sends to user's email via Gmail API.
**Tools:** `list_today_tasks`, `send_briefing_email`.

## 7. Authentication Flow

1. User clicks "Sign in with Google" → NextAuth redirects to Google OAuth.
2. User grants scopes: `openid email profile https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar`.
3. NextAuth stores access + refresh tokens in `User.googleAccessToken` / `googleRefreshToken`.
4. Server-side helper `getGoogleClient(userId)` refreshes tokens automatically when expired.
5. All Gmail/Calendar API calls go through this helper.

## 8. Phased Build Plan

### Phase 1 — Foundation (Weeks 1–3)
- Next.js 15 project setup, Tailwind, shadcn/ui
- Prisma schema, Postgres on Neon, migrations
- NextAuth + Google OAuth (basic scopes only)
- Task CRUD API + UI (list view)
- Vercel deployment
- **Milestone:** Live URL where you can sign in and CRUD tasks.

### Phase 2 — Rich Task UX (Weeks 4–6)
- Subtasks, tags, priorities, due dates
- Three views: List, Kanban (drag-drop), Calendar (month grid)
- Search & filter
- Dark mode (Tailwind class strategy)
- **Milestone:** Polished task manager — already a portfolio project.

### Phase 3 — First AI Agents (Weeks 7–9)
- Anthropic SDK setup, prompt caching, `AgentRun` logging
- Breakdown agent
- Prioritizer agent
- Chat sidebar with streaming responses
- **Milestone:** Working AI features without external API complexity.

### Phase 4 — External Integrations (Weeks 10–12)
- Add Gmail + Calendar OAuth scopes (re-auth flow)
- Google API client helpers with token refresh
- Email agent (with user approval modal)
- Schedule agent
- Inngest setup + Daily briefing cron
- **Milestone:** All 5 agents working end-to-end.

### Phase 5 — Polish & Resume Prep (Weeks 13–15)
- Stats dashboard (completion rate, agent usage, tokens spent)
- Activity log / agent run history page
- Push + email notifications for due tasks
- Robust error handling + rate limit handling
- Architecture diagram, README rewrite, demo video
- e2e tests on critical flows
- **Milestone:** Resume-ready. Demo link live, README polished.

## 9. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Google OAuth token expiry mid-agent-run | Refresh-on-401 helper wraps every Google API call |
| Claude API costs overrun | Per-user daily token cap; track in `AgentRun.tokensUsed`; use prompt caching |
| Email agent sends accidentally | Hard requirement: confirmation modal, no auto-send path exists in code |
| Phase 4 falls behind schedule | Phases 1–3 alone already produce a shippable portfolio project — Phase 4 is upside |
| Inngest free tier limits | Limits are generous (50K runs/month free); cron uses ~30/month |

## 10. Resume Bullets (target output)

1. Designed and shipped a full-stack AI task manager with 5 autonomous agents using Next.js 15, TypeScript, PostgreSQL, and the Anthropic Claude API.
2. Built event-driven architecture with Inngest for background agent execution and scheduled daily briefings.
3. Integrated Google OAuth, Gmail API, and Google Calendar API to enable AI-driven email drafting and automatic schedule planning.
4. Modeled the domain in PostgreSQL across 6 tables using Prisma ORM with type-safe end-to-end queries.
5. Implemented agent observability: every run logged with status, input, output, and token usage for debugging and cost tracking.
6. Deployed to Vercel + Neon with CI; tested with Vitest (unit) and Playwright (e2e).

## 11. Open Questions

- None blocking — proceeding to implementation plan.
