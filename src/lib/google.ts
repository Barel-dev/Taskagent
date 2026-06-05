import { prisma } from '@/lib/prisma'

// Server-side helpers for acting on the user's Google account (currently just
// Gmail send for the Email agent). Raw fetch against Google's REST endpoints —
// no googleapis dependency — matching the lightweight style of link-preview.ts.
//
// Tokens come from the NextAuth `Account` row written at sign-in: access_token,
// refresh_token, and expires_at (epoch seconds). We refresh the access token on
// expiry and persist the new one so subsequent sends reuse it.

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'

// Refresh a little early so a token doesn't expire mid-request.
const EXPIRY_BUFFER_SECONDS = 60

/**
 * Thrown when we can't get a usable Google token or Gmail rejects us for
 * auth/scope reasons — i.e. the user needs to reconnect Google (sign out and
 * back in to re-consent to the gmail.send scope). Routes map this to a 403.
 */
export class GoogleAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GoogleAuthError'
  }
}

type GoogleTokenRow = {
  id: string
  access_token: string | null
  refresh_token: string | null
  expires_at: number | null
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000)
}

/**
 * Return a valid Google OAuth access token for the user, refreshing it via the
 * stored refresh token when the current one is missing or about to expire.
 * Throws GoogleAuthError when the user has no connected Google account or no
 * refresh token (they must re-authenticate).
 */
export async function getGoogleAccessToken(userId: string): Promise<string> {
  const account = (await prisma.account.findFirst({
    where: { userId, provider: 'google' },
    select: { id: true, access_token: true, refresh_token: true, expires_at: true },
  })) as GoogleTokenRow | null

  if (!account) {
    throw new GoogleAuthError('No Google account is connected for this user.')
  }

  const notExpired =
    account.expires_at != null && account.expires_at - EXPIRY_BUFFER_SECONDS > nowSeconds()
  if (account.access_token && notExpired) {
    return account.access_token
  }

  if (!account.refresh_token) {
    throw new GoogleAuthError('Google access has expired — please reconnect your Google account.')
  }

  const refreshed = await refreshAccessToken(account.refresh_token)

  await prisma.account.update({
    where: { id: account.id },
    data: {
      access_token: refreshed.accessToken,
      expires_at: nowSeconds() + refreshed.expiresIn,
    },
  })

  return refreshed.accessToken
}

async function refreshAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresIn: number }> {
  const clientId = process.env.AUTH_GOOGLE_ID
  const clientSecret = process.env.AUTH_GOOGLE_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET are not set.')
  }

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!res.ok) {
    // invalid_grant => the refresh token was revoked/expired: needs re-consent.
    throw new GoogleAuthError(
      'Could not refresh Google access — please reconnect your Google account.',
    )
  }

  const data = (await res.json()) as { access_token?: string; expires_in?: number }
  if (!data.access_token) {
    throw new GoogleAuthError('Google did not return a new access token — please reconnect.')
  }
  return { accessToken: data.access_token, expiresIn: data.expires_in ?? 3600 }
}

// ───────────────────────── Gmail send ─────────────────────────

/** RFC 2047 encoded-word for a header value, but only when it has non-ASCII. */
function encodeHeader(value: string): string {
  if (/^[\x20-\x7e]*$/.test(value)) return value
  return `=?UTF-8?B?${Buffer.from(value, 'utf-8').toString('base64')}?=`
}

/**
 * Send a plain-text email from the user's own Gmail account. `accessToken` must
 * come from getGoogleAccessToken and carry the gmail.send scope. Returns the
 * Gmail message id. Maps auth/scope failures to GoogleAuthError.
 */
export async function sendGmail(params: {
  accessToken: string
  to: string
  subject: string
  body: string
}): Promise<string> {
  const { accessToken, to, subject, body } = params

  const message = [
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    body,
  ].join('\r\n')

  const raw = Buffer.from(message, 'utf-8').toString('base64url')

  const res = await fetch(GMAIL_SEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  })

  if (res.status === 401 || res.status === 403) {
    throw new GoogleAuthError(
      'Gmail rejected the request — reconnect Google to grant send access (sign out and back in).',
    )
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Gmail send failed (${res.status}): ${detail.slice(0, 200)}`)
  }

  const data = (await res.json()) as { id?: string }
  return data.id ?? ''
}

// ───────────────────────── Google Calendar ─────────────────────────

const FREEBUSY_URL = 'https://www.googleapis.com/calendar/v3/freeBusy'
const CALENDAR_EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'

export type BusyInterval = { start: string; end: string }

/**
 * Read busy intervals on the user's primary calendar between two instants
 * (ISO strings). `accessToken` must carry the calendar.freebusy scope. Maps
 * auth/scope failures to GoogleAuthError.
 */
export async function getCalendarBusy(params: {
  accessToken: string
  timeMin: string
  timeMax: string
}): Promise<BusyInterval[]> {
  const { accessToken, timeMin, timeMax } = params

  const res = await fetch(FREEBUSY_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ timeMin, timeMax, items: [{ id: 'primary' }] }),
  })

  if (res.status === 401 || res.status === 403) {
    throw new GoogleAuthError(
      'Calendar access was rejected — reconnect Google to grant Calendar access (sign out and back in).',
    )
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Calendar free/busy failed (${res.status}): ${detail.slice(0, 200)}`)
  }

  const data = (await res.json()) as {
    calendars?: { primary?: { busy?: BusyInterval[] } }
  }
  return data.calendars?.primary?.busy ?? []
}

/**
 * Create an event on the user's primary calendar. `accessToken` must carry the
 * calendar.events scope. `start`/`end` are ISO strings; `timeZone` is an IANA
 * zone (e.g. "Europe/Lisbon"). Returns the event id and a link to view it.
 */
export async function createCalendarEvent(params: {
  accessToken: string
  summary: string
  description?: string
  start: string
  end: string
  timeZone: string
}): Promise<{ id: string; htmlLink: string }> {
  const { accessToken, summary, description, start, end, timeZone } = params

  const res = await fetch(CALENDAR_EVENTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary,
      description,
      start: { dateTime: start, timeZone },
      end: { dateTime: end, timeZone },
    }),
  })

  if (res.status === 401 || res.status === 403) {
    throw new GoogleAuthError(
      'Calendar access was rejected — reconnect Google to grant Calendar access (sign out and back in).',
    )
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Calendar event create failed (${res.status}): ${detail.slice(0, 200)}`)
  }

  const data = (await res.json()) as { id?: string; htmlLink?: string }
  return { id: data.id ?? '', htmlLink: data.htmlLink ?? '' }
}
