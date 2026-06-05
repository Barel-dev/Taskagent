import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { sendEmailRequestSchema } from '@/lib/validators'
import { getGoogleAccessToken, sendGmail, GoogleAuthError } from '@/lib/google'

// Send the reviewed, user-approved email via the user's own Gmail account.
// This route is only ever hit when the user clicks "Send" in the review modal —
// there is no auto-send path from drafting.
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = sendEmailRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten() },
      { status: 400 },
    )
  }

  try {
    const accessToken = await getGoogleAccessToken(session.user.id)
    const id = await sendGmail({ accessToken, ...parsed.data })
    return NextResponse.json({ ok: true, id }, { status: 200 })
  } catch (err) {
    if (err instanceof GoogleAuthError) {
      return NextResponse.json({ error: err.message, needsReconnect: true }, { status: 403 })
    }
    console.error('Gmail send failed:', err)
    return NextResponse.json(
      { error: 'Could not send the email. Please try again.' },
      { status: 502 },
    )
  }
}
