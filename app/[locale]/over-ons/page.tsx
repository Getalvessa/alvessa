import { getTranslations, setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { buildMetadata } from '@/lib/metadata';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'about' });
  return buildMetadata({ locale, path: 'over-ons', title: t('metaTitle'), description: t('metaDescription') });
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <AboutContent />
    </div>
  );
}

function AboutContent() {
  const t = useTranslations('about');
  const values = [
    { titleKey: 'value1Title' as const, descKey: 'value1Desc' as const },
    { titleKey: 'value2Title' as const, descKey: 'value2Desc' as const },
    { titleKey: 'value3Title' as const, descKey: 'value3Desc' as const },
  ];

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {t('pageTitle')}
      </h1>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-foreground">{t('missionTitle')}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t('missionBody')}</p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-foreground">{t('storyTitle')}</h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {t('storyBody')}
        </p>
      </section>

      <section className="mt-10">
        <h2 className="mb-6 text-xl font-semibold text-foreground">{t('valuesTitle')}</h2>
        <div className="space-y-5">
          {values.map(({ titleKey, descKey }) => (
            <div key={titleKey}>
              <h3 className="text-sm font-semibold text-foreground">{t(titleKey)}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t(descKey)}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-12">
        <Link
          href="/aanbod"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-foreground px-8 text-sm font-semibold text-background transition-colors hover:bg-foreground/90"
        >
          {t('ctaButton')}
        </Link>
      </div>
    </>
  );
}
