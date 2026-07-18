'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { logoutAction } from '@/app/[locale]/inloggen/actions';
import type { User } from '@supabase/supabase-js';
import { cn } from '@/lib/utils';

function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex items-center rounded-md border border-border overflow-hidden text-[11px] font-semibold sm:text-xs">
      {(['nl', 'en'] as const).map((loc, i) => (
        <button
          key={loc}
          onClick={() => router.push(pathname, { locale: loc })}
          disabled={locale === loc}
          className={cn(
            'px-1.5 py-1 transition-colors sm:px-2',
            i === 0 && 'border-r border-border',
            locale === loc
              ? 'bg-foreground text-background cursor-default'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted',
          )}
        >
          {loc.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

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
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center">
          <Image
            src="/logo.png"
            alt={tCommon('siteName')}
            width={140}
            height={93}
            className="h-9 w-auto sm:h-11 md:h-14"
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

        <div className="flex min-w-0 items-center gap-1 sm:gap-3">
          <LocaleSwitcher />

          {/* Loading state — desktop auth width only */}
          {user === undefined && (
            <div className="hidden h-9 w-24 animate-pulse rounded-lg bg-muted md:block" />
          )}

          {user === null && (
            <>
              {/* Compact login — visible on mobile + desktop; secondary text link */}
              <Link
                href="/inloggen"
                className="shrink-0 whitespace-nowrap text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:text-sm"
              >
                {t('login')}
              </Link>
              {/* Register stays desktop-only */}
              <Link
                href="/registreren"
                className="hidden h-9 items-center justify-center rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:inline-flex"
              >
                {t('register')}
              </Link>
            </>
          )}

          {/* Mobile recruitment CTA — below md only; no hamburger/menu state */}
          <Link
            href="/voor-masseurs"
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg bg-foreground px-2 text-xs font-medium whitespace-nowrap text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:h-9 sm:px-3 sm:text-sm md:hidden"
          >
            {t('mobileApply')}
          </Link>

          {user && (
            <>
              <Link
                href="/mijn-boekingen"
                className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground md:inline"
              >
                {t('myBookings')}
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
