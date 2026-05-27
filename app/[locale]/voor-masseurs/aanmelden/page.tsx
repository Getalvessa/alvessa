import { getTranslations, setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/metadata';
import ApplicationForm from './application-form';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'forProviders' });
  return buildMetadata({
    locale,
    path: 'voor-masseurs/aanmelden',
    title: t('applyMetaTitle'),
    description: t('applyMetaDescription'),
  });
}

export default async function ApplyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-6 sm:py-16">
      <PageHeader />
      <ApplicationForm />
    </div>
  );
}

function PageHeader() {
  const t = useTranslations('forProviders');
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
