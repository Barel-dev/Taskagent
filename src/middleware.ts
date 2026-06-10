import NextAuth from 'next-auth'
import authConfig from '@/lib/auth.config'

// Build a middleware-only NextAuth instance from the Edge-safe config (no
// Prisma), so this Edge function stays small. It only reads the JWT cookie.
const { auth } = NextAuth(authConfig)

const PROTECTED = ['/tasks', '/calendar', '/dashboard', '/today', '/settings']

export default auth((req) => {
  const isAuthed = !!req.auth
  const { pathname } = req.nextUrl

  if (!isAuthed && PROTECTED.some((p) => pathname.startsWith(p))) {
    const url = req.nextUrl.clone()
    url.pathname = '/signin'
    return Response.redirect(url)
  }
})

export const config = {
  matcher: [
    '/tasks/:path*',
    '/calendar/:path*',
    '/dashboard/:path*',
    '/today/:path*',
    '/settings/:path*',
  ],
}
