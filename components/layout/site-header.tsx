'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function SiteHeader() {
  const t = useTranslations('nav');
  const tCommon = useTranslations('common');

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-foreground">
            {tCommon('siteName')}
          </span>
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
          <button className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            {t('login')}
          </button>
          <button className="inline-flex h-9 items-center justify-center rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/90">
            {tCommon('bookNow')}
          </button>
        </div>
      </div>
    </header>
  );
}
