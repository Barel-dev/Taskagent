// TEMPORARY STUB — Task 5 will replace this with the real NextAuth implementation.
// Returns null in all environments for now so route handlers compile and respond 401.

type StubSession = { user: { id: string; email?: string | null } } | null

export async function auth(): Promise<StubSession> {
  return null
}

// Placeholders so other imports compile. Task 5 will provide real values.
export const handlers: { GET: never; POST: never } = {} as never
export const signIn = async (..._args: unknown[]) => {
  throw new Error('signIn stub — Task 5 not run yet')
}
export const signOut = async (..._args: unknown[]) => {
  throw new Error('signOut stub — Task 5 not run yet')
}
