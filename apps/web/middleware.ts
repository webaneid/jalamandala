import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const url = request.nextUrl
  const hostname = request.headers.get('host') || ''

  const isApp = hostname.startsWith('app.')
  const isExpo = hostname.startsWith('expo.')
  const isApi = hostname.startsWith('api.')
  const isApiPath = url.pathname.startsWith('/api')

  if (isApiPath) {
    return NextResponse.next()
  }

  if (isApp && !url.pathname.startsWith('/admin') && !url.pathname.startsWith('/invoice')) {
    return NextResponse.rewrite(new URL(`/admin${url.pathname}`, request.url))
  }

  if (isExpo && (url.pathname === '/expo' || url.pathname.startsWith('/expo/'))) {
    const redirectUrl = new URL(url.pathname.replace(/^\/expo/, '') || '/', request.url)
    return NextResponse.redirect(redirectUrl)
  }
  
  if (isExpo && url.pathname.startsWith('/vendor')) {
    const rewrittenUrl = new URL(`/expo${url.pathname}`, request.url);
    return NextResponse.rewrite(rewrittenUrl);
  }

  if (isExpo) {
    return NextResponse.redirect(new URL('/vendor/login', request.url));
  }

  if (isApi && !url.pathname.startsWith('/api')) {
    return NextResponse.rewrite(new URL(`/api${url.pathname}`, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
