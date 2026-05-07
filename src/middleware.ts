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
