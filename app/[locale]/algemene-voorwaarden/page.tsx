import { setRequestLocale, getTranslations } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/metadata';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'terms' });
  return buildMetadata({ locale, path: 'algemene-voorwaarden', title: t('metaTitle'), description: t('metaDescription') });
}

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TermsContent />;
}

const SECTIONS = [
  's1', 's2', 's3', 's4', 's5', 's6', 's7',
] as const;

function TermsContent() {
  const t = useTranslations('terms');

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('pageTitle')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t('lastUpdated')}</p>

      <div className="mt-10 space-y-8">
        {SECTIONS.map((s) => (
          <section key={s}>
            <h2 className="text-base font-semibold text-foreground">
              {t(`${s}Title` as Parameters<typeof t>[0])}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t(`${s}Body` as Parameters<typeof t>[0])}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}
