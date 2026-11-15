import { NextResponse, type NextRequest } from 'next/server';

/**
 * Optimistic sign-in redirect: visitors without a session cookie are sent to the
 * sign-in page before any rendering starts. This is only a fast path — every page,
 * server action and API route still verifies the session itself.
 */
export function proxy(request: NextRequest) {
  if (request.method !== 'GET' || request.cookies.has('sommr_session')) return NextResponse.next();
  const { pathname, search } = request.nextUrl;
  const url = new URL('/login', request.url);
  url.searchParams.set('next', pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    '/explore',
    '/whats-on',
    '/challenges',
    '/profile',
    '/onboarding',
    '/my-summer/:path*',
    '/places/:path*',
    '/events/:path*',
    '/submit/:path*',
    '/admin/:path*',
  ],
};
