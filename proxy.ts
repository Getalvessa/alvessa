import createMiddleware from 'next-intl/middleware';
import { type NextRequest } from 'next/server';
import { routing } from './i18n/routing';

const handleI18nRouting = createMiddleware(routing);

// Named "proxy" export — Next.js 16 convention (replaces middleware.ts)
export function proxy(request: NextRequest) {
  return handleI18nRouting(request);
}

export const config = {
  matcher: [
    // Match root and all locale-prefixed routes
    '/',
    '/(nl|en)/:path*',
    // Match all paths except Next.js internals and static files
    '/((?!_next|_vercel|favicon\\.ico|.*\\..*).*)',
  ],
};
