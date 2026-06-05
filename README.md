# TaskAgent

An AI task manager where specialized agents don't just organize your work — they **do** it. Describe a goal, and agents plan it, break it into steps, **search the live web to actually carry tasks out**, prioritize your day, and brief you on what matters.

> **Live demo:** https://taskagent-amber.vercel.app
> **Stack:** Next.js 15 · TypeScript · Prisma + Postgres (Neon) · NextAuth v5 (Google) · Google Gemini · Tailwind v4

<!-- Add a screenshot or GIF here: ![TaskAgent](docs/screenshot.png) -->

## What it does

You sign in with Google, then work with a grid of task tiles. Open any task to reach its agents:

| Agent | What it does |
|---|---|
| **Plan** | Turns a plain-language goal ("plan a trip to Lisbon") into a task with ordered subtasks. |
| **Breakdown** | Splits a task into 3–7 ordered, time-estimated steps. |
| **Do it** | **Actually performs the task** using Gemini + live Google Search, and returns real results as rich preview cards (image, title, sources). |
| **Do all** | Runs *every* subtask in sequence, sharing each result as context for the next. |
| **Prioritizer** | Reweighs every open task by urgency, due date, and effort, then reorders your day — and explains why. |
| **Daily Briefing** | A short morning brief across all your tasks: what's due, what's overdue, what to focus on. |
| **Summary** | Rolls a whole plan up into a status briefing. |

Agents **share context**: answers you give one agent (dates, budget, who's traveling) are saved to the plan and reused by the others, so they stop re-asking what's already known.

## How it works

- **Agents** live in `src/lib/agents/*`. Each calls Google Gemini (`gemini-2.5-flash`) and logs an `AgentRun` row (input, output, status, tokens) — surfaced on the **/dashboard** page.
- **"Do it"** uses Gemini's **Google Search grounding** to search the live web, then `src/lib/link-preview.ts` fetches each source's OpenGraph data so results render as rich cards.
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

| Var | Notes |
|---|---|
| `DATABASE_URL` | Postgres (Neon) connection string |
| `TEST_DATABASE_URL` | Separate Neon branch, used by the test suite |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth credentials |
| `GEMINI_API_KEY` | Free key from https://aistudio.google.com/apikey (optional — without it, demo mode) |

## Testing

```bash
npm test    # Vitest — Zod validators, data layer, and every agent (Gemini mocked, $0)
```

## Deploying (Vercel)

1. Import the repo on Vercel.
2. Build command: `prisma migrate deploy && next build`.
3. Add the env vars above (`GEMINI_API_KEY` included for real agents).
4. Add `https://<your-domain>/api/auth/callback/google` to the Google OAuth redirect URIs.

## Status

Built and working: Plan, Breakdown, Do it (live web search), Do all, Prioritizer, Daily Briefing, Summary, plus the agent dashboard. Email/Calendar agents are designed but not built (they need additional OAuth scopes) — and are not claimed as working anywhere in the app.

---

### Resume bullets

- Built a full-stack AI task manager (Next.js 15, TypeScript, Prisma/Postgres, NextAuth) where **6 specialized agents** plan, execute, and prioritize work.
- Implemented an **agent that performs tasks autonomously** via Google Gemini with **live web-search grounding**, returning cited, rich results — with structured-output + Zod validation, shared cross-agent context, rate limiting, and an audit log.
- Designed a premium, responsive UI (tile grid + detail modal) and shipped it to Vercel; backed by a Vitest suite covering validators, data layer, and all agents.
