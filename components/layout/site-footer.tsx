import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function SiteFooter() {
  const t = useTranslations('footer');
  const tCommon = useTranslations('common');

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-3">
          {/* Brand */}
          <div>
            <span className="text-sm font-semibold text-foreground">
              {tCommon('siteName')}
            </span>
            <p className="mt-1 text-xs text-muted-foreground">{t('tagline')}</p>
          </div>

          {/* Platform links */}
          <div className="flex flex-col gap-2">
            <Link href="/hoe-het-werkt" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
              {t('howItWorks')}
            </Link>
            <Link href="/voor-masseurs" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
              {t('forProviders')}
            </Link>
            <Link href="/faq" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
              {t('faq')}
            </Link>
          </div>

          {/* Company links */}
          <div className="flex flex-col gap-2">
            <Link href="/over-ons" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
              {t('about')}
            </Link>
            <Link href="/contact" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
              {t('contact')}
            </Link>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-border pt-6 sm:flex-row">
          <span className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {tCommon('siteName')}. {t('rights')}
          </span>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="cursor-default">{t('privacy')}</span>
            <span className="cursor-default">{t('terms')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
