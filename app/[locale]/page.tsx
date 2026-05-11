import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HomeContent />;
}

function HomeContent() {
  const t = useTranslations('home');
  const tCommon = useTranslations('common');

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="max-w-2xl space-y-6">
        <div className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-sm text-muted-foreground">
          {t('phase')}
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          {t('heroTitle')}
        </h1>

        <p className="text-lg text-muted-foreground leading-relaxed">
          {t('heroSubtitle')}
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button className="inline-flex h-11 items-center justify-center rounded-lg bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-foreground/90">
            {t('heroCtaPrimary')}
          </button>
          <button className="inline-flex h-11 items-center justify-center rounded-lg border border-border px-6 text-sm font-medium text-foreground transition-colors hover:bg-muted">
            {t('heroCtaSecondary')}
          </button>
        </div>

        <p className="text-sm text-muted-foreground">
          {tCommon('siteName')} · Utrecht, Nederland
        </p>
      </div>
    </div>
  );
}
