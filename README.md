# TaskAgent

AI-powered task manager with autonomous sub-agents (in development).

**Phase 1 — Foundation:** sign in with Google, manage your tasks. ✅

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS v4 + shadcn/ui
- PostgreSQL (Neon) + Prisma ORM
- NextAuth v5 (Google OAuth)
- Vitest

## Local development

1. Clone and install:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` and fill in values:
   - `DATABASE_URL` and `TEST_DATABASE_URL` from neon.tech
   - `AUTH_SECRET` — generate with `openssl rand -base64 32`
   - `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` from Google Cloud Console (OAuth 2.0 client; redirect URI `http://localhost:3000/api/auth/callback/google`)
3. Apply migrations to both databases:
   ```bash
   npx prisma migrate dev
   DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy
   ```
4. Run dev server:
   ```bash
   npm run dev
   ```

## Tests

```bash
npm run test
```

11 tests covering Zod validators (7) and the tasks data layer with a real test database (4).

## Project structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/   NextAuth handler
│   │   └── tasks/                Task CRUD endpoints
│   ├── signin/                   Sign-in page
│   ├── tasks/                    Main task view
│   └── layout.tsx                Root layout + Providers
├── components/
│   ├── ui/                       shadcn primitives
│   ├── header.tsx                Top bar with sign-out
│   ├── task-list.tsx             List + dialogs
│   ├── task-item.tsx             Row with optimistic toggle/delete
│   ├── task-form.tsx             Create/edit form
│   └── providers.tsx             SessionProvider + Toaster
├── lib/
│   ├── auth.ts                   NextAuth config
│   ├── prisma.ts                 Prisma client singleton
│   ├── tasks.ts                  Data layer (per-user task ops)
│   └── validators.ts             Zod schemas
└── middleware.ts                 Route protection for /tasks/*
```

## Roadmap

- ✅ **Phase 1 — Foundation:** auth + task CRUD (this phase)
- ⏳ **Phase 2 — Rich task UX:** subtasks, tags, priorities, three views (List / Kanban / Calendar), search & filter, dark mode
- ⏳ **Phase 3 — First AI agents:** breakdown agent, prioritizer, chat interface
- ⏳ **Phase 4 — External integrations:** Gmail (email agent), Google Calendar (schedule agent), daily briefing cron
- ⏳ **Phase 5 — Polish:** stats dashboard, agent run history, notifications, demo video

Full design doc: [`docs/superpowers/specs/2026-05-05-taskagent-design.md`](docs/superpowers/specs/2026-05-05-taskagent-design.md)
Phase 1 plan: [`docs/superpowers/plans/2026-05-07-phase-1-foundation.md`](docs/superpowers/plans/2026-05-07-phase-1-foundation.md)

## License

Personal portfolio project — not licensed for commercial use.
