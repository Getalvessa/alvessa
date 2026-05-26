import createMiddleware from 'next-intl/middleware';
import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const handleI18nRouting = createMiddleware(routing);

function isProtectedPath(pathname: string): boolean {
  return (
    pathname.includes('/mijn-boekingen') ||
    pathname.includes('/boeken') ||
    pathname.includes('/dashboard') ||
    pathname.includes('/admin')
  );
}

function checkBasicAuth(request: NextRequest): boolean {
  const authPassword = process.env.BASIC_AUTH_PASSWORD;
  if (!authPassword) return true; // No env var set → open access

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Basic ')) return false;

  const credentials = Buffer.from(authHeader.slice(6), 'base64').toString();
  const colonIndex = credentials.indexOf(':');
  if (colonIndex === -1) return false;
  const password = credentials.slice(colonIndex + 1);
  return password === authPassword;
}

export async function middleware(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          pendingCookies.push(...cookiesToSet);
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

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

  const i18nResponse = handleI18nRouting(request);

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
