import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  getGoogleAccessToken,
  sendGmail,
  getCalendarBusy,
  createCalendarEvent,
  GoogleAuthError,
} from '@/lib/google'
import { prisma } from '@/lib/prisma'
import { createTestUser } from './helpers'

// Build a minimal Response-like object for the mocked global fetch.
function fakeResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000)
}

async function createGoogleAccount(
  userId: string,
  data: { access_token?: string | null; refresh_token?: string | null; expires_at?: number | null },
) {
  return prisma.account.create({
    data: {
      userId,
      type: 'oauth',
      provider: 'google',
      providerAccountId: `g-${userId}`,
      access_token: data.access_token ?? null,
      refresh_token: data.refresh_token ?? null,
      expires_at: data.expires_at ?? null,
    },
  })
}

const originalFetch = global.fetch

beforeEach(() => {
  // Needed by the refresh path.
  process.env.AUTH_GOOGLE_ID = 'test-client-id'
  process.env.AUTH_GOOGLE_SECRET = 'test-client-secret'
})

afterEach(() => {
  global.fetch = originalFetch
  vi.restoreAllMocks()
})

describe('getGoogleAccessToken', () => {
  it('returns the cached token without refreshing when it is still valid', async () => {
    const user = await createTestUser()
    await createGoogleAccount(user.id, {
      access_token: 'cached-token',
      refresh_token: 'refresh',
      expires_at: nowSeconds() + 3600,
    })
    const fetchMock = vi.fn()
    global.fetch = fetchMock as unknown as typeof fetch

    const token = await getGoogleAccessToken(user.id)

    expect(token).toBe('cached-token')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refreshes an expired token and persists the new one', async () => {
    const user = await createTestUser({ email: 'refresh@x.com' })
    const account = await createGoogleAccount(user.id, {
      access_token: 'old-token',
      refresh_token: 'a-refresh-token',
      expires_at: nowSeconds() - 30,
    })
    const fetchMock = vi
      .fn()
      .mockResolvedValue(fakeResponse(200, { access_token: 'fresh-token', expires_in: 3600 }))
    global.fetch = fetchMock as unknown as typeof fetch

    const token = await getGoogleAccessToken(user.id)

    expect(token).toBe('fresh-token')
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0][0]).toBe('https://oauth2.googleapis.com/token')

    const updated = await prisma.account.findUnique({ where: { id: account.id } })
    expect(updated?.access_token).toBe('fresh-token')
    expect(updated?.expires_at).toBeGreaterThan(nowSeconds())
  })

  it('throws GoogleAuthError when the user has no Google account', async () => {
    const user = await createTestUser({ email: 'no-account@x.com' })
    await expect(getGoogleAccessToken(user.id)).rejects.toBeInstanceOf(GoogleAuthError)
  })

  it('throws GoogleAuthError when expired with no refresh token', async () => {
    const user = await createTestUser({ email: 'no-refresh@x.com' })
    await createGoogleAccount(user.id, {
      access_token: 'old-token',
      refresh_token: null,
      expires_at: nowSeconds() - 30,
    })
    await expect(getGoogleAccessToken(user.id)).rejects.toBeInstanceOf(GoogleAuthError)
  })

  it('maps a failed refresh to GoogleAuthError', async () => {
    const user = await createTestUser({ email: 'bad-refresh@x.com' })
    await createGoogleAccount(user.id, {
      refresh_token: 'revoked',
      expires_at: nowSeconds() - 30,
    })
    global.fetch = vi
      .fn()
      .mockResolvedValue(fakeResponse(400, { error: 'invalid_grant' })) as unknown as typeof fetch

    await expect(getGoogleAccessToken(user.id)).rejects.toBeInstanceOf(GoogleAuthError)
  })
})

describe('sendGmail', () => {
  it('posts a base64url message and returns the message id', async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse(200, { id: 'msg-123' }))
    global.fetch = fetchMock as unknown as typeof fetch

    const id = await sendGmail({
      accessToken: 'tok',
      to: 'sarah@acme.com',
      subject: 'Hello',
      body: 'Hi there',
    })

    expect(id).toBe('msg-123')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://gmail.googleapis.com/gmail/v1/users/me/messages/send')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok')

    // The raw payload is base64url and decodes back to the RFC 2822 message.
    const raw = JSON.parse(init.body as string).raw as string
    expect(raw).not.toMatch(/[+/=]/) // base64url, not standard base64
    const decoded = Buffer.from(raw, 'base64url').toString('utf-8')
    expect(decoded).toContain('To: sarah@acme.com')
    expect(decoded).toContain('Subject: Hello')
    expect(decoded).toContain('Hi there')
  })

  it('maps a 403 from Gmail to GoogleAuthError', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        fakeResponse(403, { error: 'insufficient scope' }),
      ) as unknown as typeof fetch

    await expect(
      sendGmail({ accessToken: 'tok', to: 'a@b.com', subject: 's', body: 'b' }),
    ).rejects.toBeInstanceOf(GoogleAuthError)
  })
})

describe('getCalendarBusy', () => {
  it('returns the primary calendar busy intervals', async () => {
    const busy = [{ start: '2026-06-08T09:00:00Z', end: '2026-06-08T09:30:00Z' }]
    const fetchMock = vi
      .fn()
      .mockResolvedValue(fakeResponse(200, { calendars: { primary: { busy } } }))
    global.fetch = fetchMock as unknown as typeof fetch

    const result = await getCalendarBusy({
      accessToken: 'tok',
      timeMin: '2026-06-08T00:00:00Z',
      timeMax: '2026-06-15T00:00:00Z',
    })

    expect(result).toEqual(busy)
    expect(fetchMock.mock.calls[0][0]).toBe('https://www.googleapis.com/calendar/v3/freeBusy')
  })

  it('returns an empty array when the calendar has no busy data', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        fakeResponse(200, { calendars: { primary: {} } }),
      ) as unknown as typeof fetch

    const result = await getCalendarBusy({ accessToken: 'tok', timeMin: 'a', timeMax: 'b' })
    expect(result).toEqual([])
  })

  it('maps a 403 to GoogleAuthError', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(fakeResponse(403, { error: 'forbidden' })) as unknown as typeof fetch

    await expect(
      getCalendarBusy({ accessToken: 'tok', timeMin: 'a', timeMax: 'b' }),
    ).rejects.toBeInstanceOf(GoogleAuthError)
  })
})

describe('createCalendarEvent', () => {
  it('posts the event and returns its id and link', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(fakeResponse(200, { id: 'evt-1', htmlLink: 'https://cal/evt-1' }))
    global.fetch = fetchMock as unknown as typeof fetch

    const result = await createCalendarEvent({
      accessToken: 'tok',
      summary: 'Write report',
      start: '2026-06-08T10:00:00Z',
      end: '2026-06-08T10:30:00Z',
      timeZone: 'Europe/Lisbon',
    })

    expect(result).toEqual({ id: 'evt-1', htmlLink: 'https://cal/evt-1' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://www.googleapis.com/calendar/v3/calendars/primary/events')
    const payload = JSON.parse(init.body as string)
    expect(payload.summary).toBe('Write report')
    expect(payload.start).toEqual({ dateTime: '2026-06-08T10:00:00Z', timeZone: 'Europe/Lisbon' })
    expect(payload.end).toEqual({ dateTime: '2026-06-08T10:30:00Z', timeZone: 'Europe/Lisbon' })
  })

  it('maps a 403 to GoogleAuthError', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(fakeResponse(403, { error: 'forbidden' })) as unknown as typeof fetch

    await expect(
      createCalendarEvent({
        accessToken: 'tok',
        summary: 's',
        start: 'a',
        end: 'b',
        timeZone: 'UTC',
      }),
    ).rejects.toBeInstanceOf(GoogleAuthError)
  })
})
