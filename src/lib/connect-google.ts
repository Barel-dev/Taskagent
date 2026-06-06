import { signIn } from 'next-auth/react'

// Incremental authorization: the scopes the Email + Schedule agents need, on top
// of the base login scopes. Requested ONLY via the explicit "Connect Google"
// action below — never at sign-in — so login can't be gated on them.
export const AGENT_GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.freebusy',
].join(' ')

/**
 * Re-run Google OAuth requesting the agent scopes (combined with anything already
 * granted). On return, src/lib/auth.ts persists the broadened token so the Email
 * and Schedule agents can call Google. Redirects to Google, then back to /tasks.
 */
export function connectGoogle() {
  return signIn(
    'google',
    { redirectTo: '/tasks' },
    {
      scope: AGENT_GOOGLE_SCOPES,
      include_granted_scopes: 'true',
      access_type: 'offline',
      prompt: 'consent',
    },
  )
}
