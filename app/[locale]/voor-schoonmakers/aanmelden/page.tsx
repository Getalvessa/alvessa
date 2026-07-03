import { getTranslations, setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/metadata';
import ApplicationForm from '../../voor-masseurs/aanmelden/application-form';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'forCleaners' });
  return buildMetadata({
    locale,
    path: 'voor-schoonmakers/aanmelden',
    title: t('applyMetaTitle'),
    description: t('applyMetaDescription'),
    // Pre-launch FULL HIDDEN policy (docs/STATE.md → Pre-Launch SEO Strategy)
    noindex: true,
  });
}

export default async function CleanerApplyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-6 sm:py-16">
      <PageHeader />
      <ApplicationForm defaultCity="groningen" categorySlug="cleaning" />
    </div>
  );
}

function PageHeader() {
  const t = useTranslations('forCleaners');
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {t('applyPageTitle')}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">{t('applyPageSubtitle')}</p>
      <p className="mt-1 text-sm text-muted-foreground">{t('applyNote')}</p>
    </div>
  );
}
