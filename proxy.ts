import createMiddleware from 'next-intl/middleware';
import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const handleI18nRouting = createMiddleware(routing);

function checkBasicAuth(request: NextRequest): boolean {
  const authPassword = process.env.BASIC_AUTH_PASSWORD;
  if (!authPassword) return true; // No env var set → open access

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Basic ')) return false;

  const credentials = Buffer.from(authHeader.slice(6), 'base64').toString();
  const colonIndex = credentials.indexOf(':');
  if (colonIndex === -1) return false;
  return credentials.slice(colonIndex + 1) === authPassword;
}

function isProtectedPath(pathname: string): boolean {
  return (
    pathname.includes('/mijn-boekingen') ||
    pathname.includes('/boeken') ||
    pathname.includes('/dashboard') ||
    pathname.includes('/admin')
  );
}

function isAdminPath(pathname: string): boolean {
  return pathname.includes('/admin');
}

function isProviderPath(pathname: string): boolean {
  return pathname.includes('/dashboard');
}

export async function proxy(request: NextRequest) {
  // Basic Auth gate — active when BASIC_AUTH_PASSWORD env var is set
  if (!checkBasicAuth(request)) {
    return new NextResponse('Authentication required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Alvessa", charset="UTF-8"' },
    });
  }

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

  // Role-based access control for /admin and /dashboard
  if (user && (isAdminPath(pathname) || isProviderPath(pathname))) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, is_provider')
      .eq('id', user.id)
      .single();

    const isAdmin    = profile?.is_admin    ?? false;
    const isProvider = profile?.is_provider ?? false;

    const denied =
      (isAdminPath(pathname)    && !isAdmin) ||
      (isProviderPath(pathname) && !isProvider && !isAdmin);

    if (denied) {
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = '/';
      homeUrl.search = '';
      const redirectResponse = NextResponse.redirect(homeUrl);
      pendingCookies.forEach(({ name, value, options }) =>
        redirectResponse.cookies.set(name, value, options as Parameters<typeof redirectResponse.cookies.set>[2]),
      );
      return redirectResponse;
    }
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
