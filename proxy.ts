import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/lib/auth/session'

const protectedPrefixes = [
  '/home',
  '/create',
  '/room',
  '/my-rooms',
  '/mypage',
  '/points',
  '/admin',
]

export function proxy(request: NextRequest) {
  const isProtected = protectedPrefixes.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix),
  )

  if (isProtected && !request.cookies.has(SESSION_COOKIE_NAME)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/home/:path*',
    '/create/:path*',
    '/room/:path*',
    '/my-rooms/:path*',
    '/mypage/:path*',
    '/points/:path*',
    '/admin/:path*',
  ],
}
