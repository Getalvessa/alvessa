import createMiddleware from 'next-intl/middleware';
import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const handleI18nRouting = createMiddleware(routing);

// Routes that require an authenticated session.
// Checked against the full pathname (after locale prefix when present).
function isProtectedPath(pathname: string): boolean {
  return (
    pathname.includes('/mijn-boekingen') ||
    pathname.includes('/boeken') ||
    pathname.includes('/dashboard') ||
    pathname.includes('/admin')
  );
}

export async function proxy(request: NextRequest) {
  // Collect cookies Supabase wants to set during session refresh
  const pendingCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Mutate request cookies so subsequent server reads are consistent,
          // then queue them to be applied to the final response.
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          pendingCookies.push(...cookiesToSet);
        },
      },
    },
  );

  // Verify the JWT with the Supabase server (never use getSession() in server context).
  // This also refreshes the access token when it is near expiry.
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Redirect unauthenticated users away from protected routes
  if (!user && isProtectedPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/inloggen';
    loginUrl.searchParams.set('redirect_to', pathname);
    const redirectResponse = NextResponse.redirect(loginUrl);
    pendingCookies.forEach(({ name, value, options }) =>
      redirectResponse.cookies.set(name, value, options as Parameters<typeof redirectResponse.cookies.set>[2]),
    );
    return redirectResponse;
  }

  // Let next-intl handle locale detection and routing
  const i18nResponse = handleI18nRouting(request);

  // Forward any Supabase cookie updates onto the final response
  pendingCookies.forEach(({ name, value, options }) =>
    i18nResponse.cookies.set(name, value, options as Parameters<typeof i18nResponse.cookies.set>[2]),
  );

  return i18nResponse;
}

export const config = {
  matcher: [
    '/',
    '/(nl|en)/:path*',
    '/((?!_next|_vercel|api|og|favicon\\.ico|.*\\..*).*)',
  ],
};
