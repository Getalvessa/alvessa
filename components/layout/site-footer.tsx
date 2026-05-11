import { useTranslations } from 'next-intl';

export default function SiteFooter() {
  const t = useTranslations('footer');
  const tCommon = useTranslations('common');

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex flex-col items-center gap-1 sm:items-start">
            <span className="text-sm font-semibold text-foreground">
              {tCommon('siteName')}
            </span>
            <span className="text-xs text-muted-foreground">{t('tagline')}</span>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <button className="transition-colors hover:text-foreground">
              {t('privacy')}
            </button>
            <button className="transition-colors hover:text-foreground">
              {t('terms')}
            </button>
            <span>
              © {new Date().getFullYear()} {tCommon('siteName')}. {t('rights')}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
