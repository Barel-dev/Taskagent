# Phase 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a deployed Next.js task manager where a user can sign in with Google and create/read/update/delete their own tasks.

**Architecture:** Next.js 15 App Router (single deployable unit on Vercel). Postgres on Neon, accessed via Prisma ORM. Auth via NextAuth v5 (Auth.js) with Google provider — basic scopes only this phase. Server-side API routes back the UI; React Server Components fetch read data directly via Prisma where possible. Tasks are owned by a single user; all queries filter by `userId` from the session.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Prisma, PostgreSQL (Neon), NextAuth v5, Zod, Vitest, Vercel.

**Phase 1 scope (from design doc, Section 8):**
- Project scaffolding (Next.js + TS + Tailwind + shadcn/ui)
- Prisma schema (User + Task only — Tag/AgentRun/ChatMessage land in later phases)
- NextAuth + Google OAuth (basic profile/email scopes only)
- Task CRUD API + minimal list-view UI
- Vercel + Neon deployment

**Out of scope this phase:** Subtasks, tags, priorities (in schema but not surfaced in UI), Kanban/calendar views, agents, Gmail/Calendar APIs, Inngest. All come in later phases.

---

## File Structure

After this phase, the repo will look like:

```
TaskAgent/
├── .env.local                          # local secrets (gitignored)
├── .env.example                        # committed template
├── .gitignore
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── components.json                     # shadcn config
├── README.md
├── vitest.config.ts
├── docs/                               # already exists (specs, plans)
├── prisma/
│   └── schema.prisma
├── public/
└── src/
    ├── middleware.ts                   # route protection
    ├── app/
    │   ├── layout.tsx                  # root layout, providers
    │   ├── page.tsx                    # landing → redirect
    │   ├── globals.css
    │   ├── api/
    │   │   ├── auth/
    │   │   │   └── [...nextauth]/
    │   │   │       └── route.ts        # NextAuth handler
    │   │   └── tasks/
    │   │       ├── route.ts            # GET (list), POST (create)
    │   │       └── [id]/
    │   │           └── route.ts        # GET, PATCH, DELETE
    │   ├── signin/
    │   │   └── page.tsx                # sign-in screen
    │   └── tasks/
    │       └── page.tsx                # main task view
    ├── components/
    │   ├── ui/                         # shadcn primitives
    │   ├── header.tsx                  # top bar w/ sign-out
    │   ├── task-list.tsx
    │   ├── task-item.tsx
    │   ├── task-form.tsx
    │   └── providers.tsx               # SessionProvider wrapper
    ├── lib/
    │   ├── auth.ts                     # NextAuth config
    │   ├── prisma.ts                   # Prisma client singleton
    │   └── validators.ts               # Zod schemas
    └── tests/
        ├── validators.test.ts
        └── api/
            └── tasks.test.ts
```

**Responsibilities (one purpose per file):**
- `lib/auth.ts` — NextAuth config + `auth()` helper. Nothing else.
- `lib/prisma.ts` — singleton client only.
- `lib/validators.ts` — pure Zod schemas, no I/O.
- `app/api/tasks/route.ts` — list + create endpoints; both must filter by session user.
- `app/api/tasks/[id]/route.ts` — single-task endpoints; must verify ownership.
- `components/task-form.tsx` — controlled form, dual-mode (create/edit), no fetching of its own.
- `components/task-list.tsx` — renders `TaskItem`s; no business logic.

---

## Conventions

- **Branch model:** work directly on `main` (solo project). Frequent small commits.
- **Commit style:** Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`).
- **Testing:** Vitest for unit + API integration tests. Manual browser test at the end of each UI task.
- **Type safety:** Zod at every API boundary. Prisma types flow through everywhere else.
- **Env vars:** add to `.env.example` with a comment whenever you add a new one.

---

## Task 1: Scaffold Next.js project

**Files:**
- Create: everything `create-next-app` produces (most importantly `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `.gitignore`)
- Preserve: existing `docs/` and `.git/` directories

**Why scaffolding into a non-empty dir is awkward:** `create-next-app` refuses dirs that aren't empty. We'll scaffold into a sibling temp folder and merge.

- [ ] **Step 1: Verify current state**

```bash
cd /Users/barelberhayev/workspace/TaskAgent
ls -la
```

Expected: see `.git/` and `docs/` only (plus `.` and `..`).

- [ ] **Step 2: Scaffold into a sibling temp directory**

```bash
cd /Users/barelberhayev/workspace
npx create-next-app@latest taskagent-scaffold \
  --typescript \
  --tailwind \
  --app \
  --eslint \
  --src-dir \
  --import-alias "@/*" \
  --use-npm \
  --skip-install \
  --no-turbopack
```

Expected: prompts none (all flags set). Creates `taskagent-scaffold/` with package.json, src/app/, etc. Note: `--skip-install` because we'll install after merging.

- [ ] **Step 3: Remove the scaffold's auto-created git repo**

```bash
rm -rf /Users/barelberhayev/workspace/taskagent-scaffold/.git
```

We keep the existing `.git` in `TaskAgent/`.

- [ ] **Step 4: Move scaffolded files into TaskAgent**

```bash
cd /Users/barelberhayev/workspace/taskagent-scaffold
shopt -s dotglob          # include dotfiles in *
mv * /Users/barelberhayev/workspace/TaskAgent/
shopt -u dotglob
cd /Users/barelberhayev/workspace
rmdir taskagent-scaffold
```

Expected: `taskagent-scaffold/` now empty and removed; TaskAgent has new files.

- [ ] **Step 5: Install deps**

```bash
cd /Users/barelberhayev/workspace/TaskAgent
npm install
```

Expected: deps install. May take 1–2 min.

- [ ] **Step 6: Smoke-test the dev server**

```bash
npm run dev
```

Expected: server starts on http://localhost:3000. Open browser, see Next.js welcome page. Stop with Ctrl+C.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 15 with TypeScript, Tailwind, ESLint"
```

---

## Task 2: Configure Prettier and add scripts

**Files:**
- Create: `.prettierrc.json`, `.prettierignore`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Install Prettier and Tailwind plugin**

```bash
npm install -D prettier prettier-plugin-tailwindcss
```

- [ ] **Step 2: Create `.prettierrc.json`**

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

- [ ] **Step 3: Create `.prettierignore`**

```
.next
node_modules
package-lock.json
prisma/migrations
docs
```

- [ ] **Step 4: Add scripts to `package.json`**

In the `"scripts"` object, ensure these entries exist:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "format": "prettier --write .",
  "format:check": "prettier --check ."
}
```

- [ ] **Step 5: Run formatter**

```bash
npm run format
```

Expected: rewrites files to match style.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: add Prettier with Tailwind plugin"
```

---

## Task 3: Install and configure shadcn/ui

**Files:**
- Create: `components.json`, `src/components/ui/button.tsx` (and other primitives), updates to `src/app/globals.css`
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Initialize shadcn**

```bash
npx shadcn@latest init
```

Answer prompts:
- Style: **Default**
- Base color: **Slate**
- CSS variables: **Yes**

This creates `components.json`, updates `globals.css` with CSS variables, and updates `tailwind.config.ts`.

- [ ] **Step 2: Add the components we'll use in Phase 1**

```bash
npx shadcn@latest add button input textarea label dialog form sonner card dropdown-menu separator
```

Expected: files appear under `src/components/ui/`.

- [ ] **Step 3: Smoke-test by editing the home page**

Replace contents of `src/app/page.tsx`:

```tsx
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <Button>It works</Button>
    </main>
  )
}
```

- [ ] **Step 4: Verify in browser**

```bash
npm run dev
```

Expected: home page shows a styled "It works" button. Stop server.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: add shadcn/ui with Phase 1 components"
```

---

## Task 4: Set up Neon Postgres and Prisma

**Files:**
- Create: `prisma/schema.prisma`, `src/lib/prisma.ts`, `.env.local`, `.env.example`

This task assumes you've created a free Neon project at https://neon.tech and have the connection string ready. Use **two** branches in Neon: `main` (prod) and `dev` (local). Phase 1 only uses one — we'll add prod in Task 14.

- [ ] **Step 1: Install Prisma**

```bash
npm install -D prisma
npm install @prisma/client
npx prisma init
```

This creates `prisma/schema.prisma` and `.env`. We won't use the auto-created `.env` (Next.js prefers `.env.local`).

- [ ] **Step 2: Move env vars and add example**

Delete the `.env` Prisma created. Create `.env.local`:

```
# Postgres (Neon)
DATABASE_URL="postgresql://USER:PASSWORD@ep-xxx.us-east-2.aws.neon.tech/taskagent?sslmode=require"
```

(Paste your actual Neon connection string.)

Create `.env.example`:

```
# Postgres (Neon — copy from neon.tech project page)
DATABASE_URL="postgresql://user:password@host/db?sslmode=require"
```

- [ ] **Step 3: Confirm `.env.local` is gitignored**

```bash
grep -E "^\.env" .gitignore
```

Expected output includes `.env*` or `.env.local`. If not, add `.env*.local` to `.gitignore`.

- [ ] **Step 4: Define Phase 1 schema**

Replace `prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  DONE
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  image         String?
  emailVerified DateTime?
  accounts      Account[]
  sessions      Session[]
  tasks         Task[]
  createdAt     DateTime  @default(now())
}

// NextAuth required tables
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model Task {
  id          String     @id @default(cuid())
  userId      String
  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  title       String
  description String?
  status      TaskStatus @default(TODO)
  priority    Priority   @default(MEDIUM)
  dueDate     DateTime?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  completedAt DateTime?

  @@index([userId, status])
  @@index([userId, dueDate])
}
```

Note: full schema (subtasks, tags, agents) lives in the design doc. We add columns/tables in later phases via migrations.

- [ ] **Step 5: Run the first migration**

```bash
npx prisma migrate dev --name init
```

Expected: creates `prisma/migrations/<timestamp>_init/migration.sql`, applies to Neon, generates client.

- [ ] **Step 6: Create the Prisma client singleton**

Create `src/lib/prisma.ts`:

```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ['error', 'warn'] })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

The singleton prevents Next.js dev hot-reload from creating dozens of clients.

- [ ] **Step 7: Smoke-test the connection**

```bash
npx prisma studio
```

Expected: opens browser to localhost:5555 showing empty tables. Close it.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add Prisma schema with User and Task models"
```

---

## Task 5: Set up NextAuth v5 with Google provider

**Files:**
- Create: `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/middleware.ts`, `src/types/next-auth.d.ts`
- Modify: `.env.local`, `.env.example`

You'll need a Google Cloud project with an OAuth 2.0 client ID. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google` (and your Vercel URL later).

- [ ] **Step 1: Install NextAuth v5 and Prisma adapter**

```bash
npm install next-auth@beta @auth/prisma-adapter
```

- [ ] **Step 2: Add auth env vars**

Append to `.env.local`:

```
# NextAuth
AUTH_SECRET="run: openssl rand -base64 32"
AUTH_GOOGLE_ID="your-google-client-id.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="your-google-client-secret"
```

Replace `AUTH_SECRET` with output of `openssl rand -base64 32`.

Append to `.env.example`:

```
# NextAuth (generate AUTH_SECRET with: openssl rand -base64 32)
AUTH_SECRET=""
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
```

- [ ] **Step 3: Create the auth config**

Create `src/lib/auth.ts`:

```ts
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'database' },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
          scope: 'openid email profile',
        },
      },
    }),
  ],
  pages: {
    signIn: '/signin',
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id
      return session
    },
  },
})
```

- [ ] **Step 4: Augment NextAuth's session type**

Create `src/types/next-auth.d.ts`:

```ts
import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}
```

Make sure `tsconfig.json`'s `"include"` covers `src/**/*.ts`. It should already.

- [ ] **Step 5: Create the route handler**

Create `src/app/api/auth/[...nextauth]/route.ts`:

```ts
import { handlers } from '@/lib/auth'
export const { GET, POST } = handlers
```

- [ ] **Step 6: Add middleware to gate /tasks**

Create `src/middleware.ts`:

```ts
import { auth } from '@/lib/auth'

export default auth((req) => {
  const isAuthed = !!req.auth
  const { pathname } = req.nextUrl

  if (!isAuthed && pathname.startsWith('/tasks')) {
    const url = req.nextUrl.clone()
    url.pathname = '/signin'
    return Response.redirect(url)
  }
})

export const config = {
  matcher: ['/tasks/:path*'],
}
```

- [ ] **Step 7: Smoke-test the auth endpoint**

```bash
npm run dev
```

Visit `http://localhost:3000/api/auth/signin`. Expected: NextAuth's default sign-in page lists Google. Don't log in yet — we'll do that after Task 6. Stop the server.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add NextAuth v5 with Google provider and Prisma adapter"
```

---

## Task 6: Build sign-in page, header, and root layout

**Files:**
- Create: `src/app/signin/page.tsx`, `src/components/header.tsx`, `src/components/providers.tsx`
- Modify: `src/app/layout.tsx`, `src/app/page.tsx`

- [ ] **Step 1: Create the SessionProvider wrapper**

Create `src/components/providers.tsx`:

```tsx
'use client'

import { SessionProvider } from 'next-auth/react'
import { Toaster } from '@/components/ui/sonner'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster richColors />
    </SessionProvider>
  )
}
```

- [ ] **Step 2: Wire providers into root layout**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/providers'

export const metadata: Metadata = {
  title: 'TaskAgent',
  description: 'AI-powered task manager',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Replace home page with auth-aware redirect**

Replace `src/app/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export default async function Home() {
  const session = await auth()
  redirect(session ? '/tasks' : '/signin')
}
```

- [ ] **Step 4: Build the sign-in page**

Create `src/app/signin/page.tsx`:

```tsx
import { signIn } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in to TaskAgent</CardTitle>
          <CardDescription>Use your Google account to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={async () => {
              'use server'
              await signIn('google', { redirectTo: '/tasks' })
            }}
          >
            <Button type="submit" className="w-full">
              Continue with Google
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
```

- [ ] **Step 5: Build the header**

Create `src/components/header.tsx`:

```tsx
import { auth, signOut } from '@/lib/auth'
import { Button } from '@/components/ui/button'

export async function Header() {
  const session = await auth()

  return (
    <header className="flex items-center justify-between border-b px-6 py-4">
      <h1 className="text-lg font-semibold">TaskAgent</h1>
      {session?.user && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{session.user.email}</span>
          <form
            action={async () => {
              'use server'
              await signOut({ redirectTo: '/signin' })
            }}
          >
            <Button variant="outline" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      )}
    </header>
  )
}
```

- [ ] **Step 6: End-to-end auth test**

```bash
npm run dev
```

Open http://localhost:3000:
1. Should redirect to `/signin`.
2. Click "Continue with Google" → Google consent → redirected to `/tasks` (404 for now, Task 9 fixes this).
3. Visit `/api/auth/signin` and confirm session is present.
4. In Prisma Studio (`npx prisma studio` in another terminal), confirm a row in `User` and `Account`.

Stop server.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add sign-in page, header, and providers"
```

---

## Task 7: Zod validators for tasks (TDD)

**Files:**
- Create: `src/lib/validators.ts`, `tests/validators.test.ts`, `vitest.config.ts`

- [ ] **Step 1: Install Zod and Vitest**

```bash
npm install zod
npm install -D vitest @vitest/ui
```

- [ ] **Step 2: Create vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

Add to `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Write failing tests**

Create `tests/validators.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createTaskSchema, updateTaskSchema } from '@/lib/validators'

describe('createTaskSchema', () => {
  it('accepts a minimal valid task', () => {
    const result = createTaskSchema.safeParse({ title: 'Buy milk' })
    expect(result.success).toBe(true)
  })

  it('rejects empty title', () => {
    const result = createTaskSchema.safeParse({ title: '' })
    expect(result.success).toBe(false)
  })

  it('rejects title longer than 200 chars', () => {
    const result = createTaskSchema.safeParse({ title: 'a'.repeat(201) })
    expect(result.success).toBe(false)
  })

  it('coerces ISO date string for dueDate', () => {
    const result = createTaskSchema.safeParse({
      title: 'Submit report',
      dueDate: '2026-06-01T10:00:00Z',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.dueDate).toBeInstanceOf(Date)
  })

  it('rejects invalid status', () => {
    const result = createTaskSchema.safeParse({ title: 'x', status: 'BOGUS' })
    expect(result.success).toBe(false)
  })
})

describe('updateTaskSchema', () => {
  it('accepts partial updates', () => {
    const result = updateTaskSchema.safeParse({ status: 'DONE' })
    expect(result.success).toBe(true)
  })

  it('rejects empty object', () => {
    const result = updateTaskSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 4: Run tests — should fail**

```bash
npm run test
```

Expected: errors because `@/lib/validators` doesn't exist yet.

- [ ] **Step 5: Implement validators**

Create `src/lib/validators.ts`:

```ts
import { z } from 'zod'

export const taskStatusEnum = z.enum(['TODO', 'IN_PROGRESS', 'DONE'])
export const priorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(5000).optional().nullable(),
  status: taskStatusEnum.optional(),
  priority: priorityEnum.optional(),
  dueDate: z.coerce.date().optional().nullable(),
})

export const updateTaskSchema = createTaskSchema
  .partial()
  .extend({
    completedAt: z.coerce.date().optional().nullable(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'At least one field is required',
  })

export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
```

- [ ] **Step 6: Run tests — should pass**

```bash
npm run test
```

Expected: all 7 tests pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add Zod validators for task create/update"
```

---

## Task 8: Task list/create API route (TDD)

**Files:**
- Create: `src/app/api/tasks/route.ts`, `tests/api/tasks.test.ts`, `tests/setup.ts`, `tests/helpers.ts`

We'll use a **real test database** rather than mocking Prisma. Set `DATABASE_URL` to a separate Neon branch (or a local Postgres) for tests, or to a `taskagent_test` schema. The test helpers truncate tables between tests.

- [ ] **Step 1: Add a test database URL**

Append to `.env.local`:

```
TEST_DATABASE_URL="postgresql://USER:PASSWORD@host/taskagent_test?sslmode=require"
```

Create the test DB on Neon (or use a separate branch named `test`). Run:

```bash
DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy
```

Expected: schema applied to test DB.

- [ ] **Step 2: Wire vitest to use TEST_DATABASE_URL**

Update `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

Create `tests/setup.ts`:

```ts
import { beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
}

beforeEach(async () => {
  await prisma.task.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.user.deleteMany()
})
```

- [ ] **Step 3: Create test helpers**

Create `tests/helpers.ts`:

```ts
import { prisma } from '@/lib/prisma'

export async function createTestUser(overrides: Partial<{ email: string; name: string }> = {}) {
  return prisma.user.create({
    data: {
      email: overrides.email ?? `test-${Date.now()}@example.com`,
      name: overrides.name ?? 'Test User',
    },
  })
}
```

- [ ] **Step 4: Refactor route handlers to be testable**

Rather than testing the Next.js route directly (which requires session mocking), we extract the logic into pure functions that take `userId`. Create `src/lib/tasks.ts`:

```ts
import { prisma } from '@/lib/prisma'
import type { CreateTaskInput, UpdateTaskInput } from '@/lib/validators'

export async function listTasksForUser(userId: string) {
  return prisma.task.findMany({
    where: { userId },
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
  })
}

export async function createTaskForUser(userId: string, input: CreateTaskInput) {
  return prisma.task.create({
    data: { ...input, userId },
  })
}

export async function getTaskForUser(userId: string, taskId: string) {
  return prisma.task.findFirst({ where: { id: taskId, userId } })
}

export async function updateTaskForUser(userId: string, taskId: string, input: UpdateTaskInput) {
  const result = await prisma.task.updateMany({
    where: { id: taskId, userId },
    data: input,
  })
  if (result.count === 0) return null
  return prisma.task.findUnique({ where: { id: taskId } })
}

export async function deleteTaskForUser(userId: string, taskId: string) {
  const result = await prisma.task.deleteMany({ where: { id: taskId, userId } })
  return result.count > 0
}
```

- [ ] **Step 5: Write failing tests for list + create**

Create `tests/api/tasks.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  listTasksForUser,
  createTaskForUser,
  getTaskForUser,
  updateTaskForUser,
  deleteTaskForUser,
} from '@/lib/tasks'
import { createTestUser } from '../helpers'

describe('task data layer', () => {
  it('lists only the requesting user’s tasks', async () => {
    const alice = await createTestUser({ email: 'alice@x.com' })
    const bob = await createTestUser({ email: 'bob@x.com' })
    await createTaskForUser(alice.id, { title: 'A1' })
    await createTaskForUser(bob.id, { title: 'B1' })

    const aliceTasks = await listTasksForUser(alice.id)
    expect(aliceTasks).toHaveLength(1)
    expect(aliceTasks[0].title).toBe('A1')
  })

  it('creates a task with defaults', async () => {
    const u = await createTestUser()
    const task = await createTaskForUser(u.id, { title: 'Buy milk' })
    expect(task.status).toBe('TODO')
    expect(task.priority).toBe('MEDIUM')
    expect(task.userId).toBe(u.id)
  })

  it('updates only owned tasks', async () => {
    const alice = await createTestUser({ email: 'alice2@x.com' })
    const bob = await createTestUser({ email: 'bob2@x.com' })
    const t = await createTaskForUser(alice.id, { title: 'private' })

    const result = await updateTaskForUser(bob.id, t.id, { title: 'hacked' })
    expect(result).toBeNull()

    const stillThere = await getTaskForUser(alice.id, t.id)
    expect(stillThere?.title).toBe('private')
  })

  it('deletes only owned tasks', async () => {
    const alice = await createTestUser({ email: 'alice3@x.com' })
    const bob = await createTestUser({ email: 'bob3@x.com' })
    const t = await createTaskForUser(alice.id, { title: 'mine' })

    expect(await deleteTaskForUser(bob.id, t.id)).toBe(false)
    expect(await deleteTaskForUser(alice.id, t.id)).toBe(true)
    expect(await getTaskForUser(alice.id, t.id)).toBeNull()
  })
})
```

- [ ] **Step 6: Run tests — should fail (no `@/lib/tasks` yet)**

```bash
npm run test
```

Expected: import errors. *(Actually the file was created in Step 4 — if the tests fail for a different reason, debug. If they pass, proceed.)*

- [ ] **Step 7: Run tests — should pass now**

```bash
npm run test
```

Expected: all 4 data-layer tests + 7 validator tests pass.

- [ ] **Step 8: Build the API route**

Create `src/app/api/tasks/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createTaskSchema } from '@/lib/validators'
import { createTaskForUser, listTasksForUser } from '@/lib/tasks'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tasks = await listTasksForUser(session.user.id)
  return NextResponse.json({ tasks })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = createTaskSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.flatten() }, { status: 400 })
  }

  const task = await createTaskForUser(session.user.id, parsed.data)
  return NextResponse.json({ task }, { status: 201 })
}
```

- [ ] **Step 9: Manual smoke test**

```bash
npm run dev
```

In another terminal (after signing in via the browser to seed a session cookie), or just verify in the Network tab when the UI is built (Task 10).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add tasks list/create API and data layer with tests"
```

---

## Task 9: Single-task API routes (GET/PATCH/DELETE)

**Files:**
- Create: `src/app/api/tasks/[id]/route.ts`

The data-layer functions and tests already exist from Task 8.

- [ ] **Step 1: Create the route handler**

Create `src/app/api/tasks/[id]/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { updateTaskSchema } from '@/lib/validators'
import { deleteTaskForUser, getTaskForUser, updateTaskForUser } from '@/lib/tasks'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const task = await getTaskForUser(session.user.id, id)
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ task })
}

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const body = await req.json().catch(() => null)
  const parsed = updateTaskSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.flatten() }, { status: 400 })
  }

  const task = await updateTaskForUser(session.user.id, id, parsed.data)
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ task })
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const ok = await deleteTaskForUser(session.user.id, id)
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 2: Run tests**

```bash
npm run test
```

Expected: still passing (data-layer tests cover the underlying logic).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add single-task API route with GET/PATCH/DELETE"
```

---

## Task 10: Task list page

**Files:**
- Create: `src/app/tasks/page.tsx`, `src/components/task-list.tsx`, `src/components/task-item.tsx`

Tasks are fetched server-side via the `/lib/tasks` data layer (Server Component), and the list/items are pure presentational. Mutations go through API routes from client components in Task 11.

- [ ] **Step 1: Build TaskItem**

Create `src/components/task-item.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useRouter } from 'next/navigation'

type Task = {
  id: string
  title: string
  description: string | null
  status: 'TODO' | 'IN_PROGRESS' | 'DONE'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate: string | Date | null
}

export function TaskItem({ task, onEdit }: { task: Task; onEdit: (t: Task) => void }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [optimisticDone, setOptimisticDone] = useState(task.status === 'DONE')

  async function toggleDone() {
    const next = optimisticDone ? 'TODO' : 'DONE'
    setOptimisticDone(!optimisticDone)
    start(async () => {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next, completedAt: next === 'DONE' ? new Date().toISOString() : null }),
      })
      if (!res.ok) {
        setOptimisticDone(optimisticDone) // rollback
        toast.error('Failed to update')
        return
      }
      router.refresh()
    })
  }

  async function remove() {
    if (!confirm('Delete this task?')) return
    start(async () => {
      const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
      if (!res.ok) {
        toast.error('Failed to delete')
        return
      }
      toast.success('Task deleted')
      router.refresh()
    })
  }

  return (
    <Card className="flex items-start gap-3 p-4">
      <input
        type="checkbox"
        checked={optimisticDone}
        onChange={toggleDone}
        disabled={pending}
        className="mt-1 h-4 w-4"
      />
      <div className="flex-1">
        <div className={optimisticDone ? 'text-muted-foreground line-through' : 'font-medium'}>
          {task.title}
        </div>
        {task.description && (
          <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>
        )}
        <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
          <span>{task.priority}</span>
          {task.dueDate && <span>· due {new Date(task.dueDate).toLocaleDateString()}</span>}
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => onEdit(task)} disabled={pending}>
          Edit
        </Button>
        <Button size="sm" variant="destructive" onClick={remove} disabled={pending}>
          Delete
        </Button>
      </div>
    </Card>
  )
}
```

- [ ] **Step 2: Build TaskList**

Create `src/components/task-list.tsx`:

```tsx
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
```

- [ ] **Step 3: Build the tasks page**

Create `src/app/tasks/page.tsx`:

```tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Header } from '@/components/header'
import { TaskList } from '@/components/task-list'
import { listTasksForUser } from '@/lib/tasks'

export default async function TasksPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/signin')

  const tasks = await listTasksForUser(session.user.id)
  // serialize Date fields for client components
  const initial = tasks.map((t) => ({
    ...t,
    dueDate: t.dueDate?.toISOString() ?? null,
  })) as Parameters<typeof TaskList>[0]['initialTasks']

  return (
    <>
      <Header />
      <TaskList initialTasks={initial} />
    </>
  )
}
```

- [ ] **Step 4: Smoke-test (TaskForm doesn't exist yet — temporary stub)**

To make this compile before Task 11, create a temporary stub `src/components/task-form.tsx`:

```tsx
'use client'
type Task = { id: string; title: string }
export function TaskForm({ task, onDone }: { task?: Task; onDone: () => void }) {
  return <div>Form coming in Task 11. <button onClick={onDone}>Close</button></div>
}
```

Run `npm run dev`, sign in, visit `/tasks`. Expected: empty state shows "No tasks yet."

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: task list page with item rows and edit/delete actions"
```

---

## Task 11: Task form (create + edit)

**Files:**
- Modify: `src/components/task-form.tsx`

- [ ] **Step 1: Replace the stub with the full form**

Replace `src/components/task-form.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

type Task = {
  id: string
  title: string
  description: string | null
  status: 'TODO' | 'IN_PROGRESS' | 'DONE'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate: string | Date | null
}

export function TaskForm({ task, onDone }: { task?: Task; onDone: () => void }) {
  const router = useRouter()
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [priority, setPriority] = useState<Task['priority']>(task?.priority ?? 'MEDIUM')
  const [dueDate, setDueDate] = useState(
    task?.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '',
  )
  const [saving, setSaving] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {
        title,
        description: description || null,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      }
      const url = task ? `/api/tasks/${task.id}` : '/api/tasks'
      const method = task ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? 'Save failed')
        return
      }
      toast.success(task ? 'Task updated' : 'Task created')
      onDone()
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description ?? ''}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Task['priority'])}
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">Due date</Label>
          <Input
            id="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onDone} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving || !title.trim()}>
          {saving ? 'Saving…' : task ? 'Save' : 'Create'}
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Manual end-to-end test**

```bash
npm run dev
```

1. Sign in.
2. Create a task with title only → appears in list.
3. Create a task with all fields → appears with priority and due date.
4. Toggle done → strikes through.
5. Edit a task → fields prefilled, save updates.
6. Delete a task → removed from list.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: task form for create and edit"
```

---

## Task 12: Polish (loading states, empty state, basic styling)

**Files:**
- Modify: `src/app/tasks/page.tsx`, `src/components/task-list.tsx`, `src/app/globals.css`

- [ ] **Step 1: Add a loading skeleton**

Create `src/app/tasks/loading.tsx`:

```tsx
export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <div className="h-8 w-32 animate-pulse rounded bg-muted" />
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded bg-muted" />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add a not-found page**

Create `src/app/not-found.tsx`:

```tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-2xl font-semibold">Not found</h1>
      <Button asChild>
        <Link href="/">Go home</Link>
      </Button>
    </main>
  )
}
```

- [ ] **Step 3: Run formatter and lint**

```bash
npm run format
npm run lint
```

Fix any errors. Linting is allowed to warn but should not error.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "polish: add loading skeleton and 404 page"
```

---

## Task 13: README and docs

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write the README**

Create `README.md`:

```markdown
# TaskAgent

AI-powered task manager with autonomous sub-agents (in development).

**Phase 1 — Foundation:** sign in with Google, manage your tasks. ✅

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- PostgreSQL (Neon) + Prisma ORM
- NextAuth v5 (Google OAuth)
- Vitest

## Local development

1. Clone and install:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` and fill in values.
3. Apply migrations:
   ```bash
   npx prisma migrate dev
   ```
4. Run dev server:
   ```bash
   npm run dev
   ```

## Tests

```bash
npm run test
```

## Roadmap

See [`docs/superpowers/specs/2026-05-05-taskagent-design.md`](docs/superpowers/specs/2026-05-05-taskagent-design.md) for the full design and 5-phase plan.
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "docs: add README"
```

---

## Task 14: Deploy to Vercel

**Files:** none in repo — Vercel and Neon UI.

- [ ] **Step 1: Push to GitHub**

```bash
gh repo create taskagent --public --source=. --remote=origin --push
```

(Or create on github.com manually and `git push -u origin main`.)

- [ ] **Step 2: Create a production Postgres branch on Neon**

In Neon dashboard, branch `main` → keep this for prod. Note the prod connection string.

- [ ] **Step 3: Add an authorized redirect URI in Google Cloud**

Add `https://<your-vercel-domain>.vercel.app/api/auth/callback/google` to your OAuth client.

- [ ] **Step 4: Import to Vercel**

- vercel.com → New Project → import `taskagent` repo
- Framework: Next.js (auto-detected)
- Environment variables (production):
  - `DATABASE_URL` — Neon prod connection string
  - `AUTH_SECRET` — generate fresh with `openssl rand -base64 32`
  - `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` — same as local
  - `AUTH_URL` — `https://<your-vercel-domain>.vercel.app`
- Build command: `prisma migrate deploy && next build` (override default)
- Deploy.

- [ ] **Step 5: End-to-end production test**

Visit your Vercel URL. Sign in with Google. Create a task. Refresh. Verify it persists.

- [ ] **Step 6: Add the live URL to README**

Edit `README.md`, add at top:

```markdown
**Live demo:** https://<your-vercel-domain>.vercel.app
```

Commit:

```bash
git add README.md
git commit -m "docs: add live demo URL"
git push
```

---

## Phase 1 Done — Definition of Done

- [ ] All 11 Vitest tests pass (`npm run test`)
- [ ] `npm run build` succeeds without errors
- [ ] `npm run lint` passes (warnings okay)
- [ ] Live URL works: sign in, create, edit, toggle done, delete
- [ ] Two different users see only their own tasks (test by signing in with two Google accounts)
- [ ] README has live demo link, setup instructions, stack list

When all boxes are checked, return to brainstorming/writing-plans for Phase 2.

---

## Self-review notes

- All 5 spec items in Phase 1 (project setup, DB, auth, CRUD, deployment) have at least one task: ✓
- No placeholders ("TBD", "TODO", "implement later"): ✓
- Type names consistent across tasks (`Task`, `CreateTaskInput`, `UpdateTaskInput`, `taskStatusEnum`): ✓
- Function names consistent (`listTasksForUser`, `createTaskForUser`, etc.): ✓
- Every code step shows the actual code: ✓
- Every command shows the exact command and expected output: ✓
