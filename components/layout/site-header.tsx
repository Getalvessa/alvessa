'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { logoutAction } from '@/app/[locale]/inloggen/actions';
import type { User } from '@supabase/supabase-js';

export default function SiteHeader() {
  const t = useTranslations('nav');
  const tCommon = useTranslations('common');
  const [user, setUser] = useState<User | null | undefined>(undefined); // undefined = loading

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null),
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt={tCommon('siteName')}
            width={120}
            height={80}
            className="h-10 w-auto"
            priority
          />
        </Link>

        <nav className="hidden gap-6 md:flex">
          <Link
            href="/aanbod"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {t('providers')}
          </Link>
          <Link
            href="/hoe-het-werkt"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {t('howItWorks')}
          </Link>
          <Link
            href="/voor-masseurs"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {t('forProviders')}
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {/* Loading state — matches width of auth buttons to avoid layout shift */}
          {user === undefined && (
            <div className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
          )}

          {user === null && (
            <>
              <Link
                href="/inloggen"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {t('login')}
              </Link>
              <Link
                href="/registreren"
                className="inline-flex h-9 items-center justify-center rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
              >
                {t('register')}
              </Link>
            </>
          )}

          {user && (
            <>
              <Link
                href="/mijn-boekingen"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {t('myBookings')}
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t('logout')}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
