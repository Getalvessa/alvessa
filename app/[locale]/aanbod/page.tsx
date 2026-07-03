import { getTranslations, setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { fetchPublicProviders } from '@/lib/providers/public';
import { ProviderCard, type ProviderCardData } from '@/components/providers/provider-card';
import { ServiceModeFilter } from '@/components/providers/service-mode-filter';
import { buildMetadata } from '@/lib/metadata';

type FilterMode = 'all' | 'studio' | 'home';
type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ mode?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'providers' });
  return buildMetadata({
    locale,
    path: 'aanbod',
    title: t('metaTitle'),
    description: t('metaDescription'),
    noindex: true,
  });
}

async function getProviders(mode: FilterMode): Promise<ProviderCardData[]> {
  const data = await fetchPublicProviders(mode);
  return data as ProviderCardData[];
}

export default async function ProvidersPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { mode: rawMode } = await searchParams;
  setRequestLocale(locale);

  const mode: FilterMode =
    rawMode === 'studio' ? 'studio' : rawMode === 'home' ? 'home' : 'all';

  const providers = await getProviders(mode);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <PageHeader />
      <div className="mb-6">
        <Suspense>
          <ServiceModeFilter current={mode} />
        </Suspense>
      </div>
      {providers.length > 0 ? (
        <ProviderGrid providers={providers} />
      ) : (
        <EmptyState />
      )}
    </div>
  );
}

function PageHeader() {
  const t = useTranslations('providers');
  return (
    <div className="mb-10">
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {t('pageTitle')}
      </h1>
      <p className="mt-3 text-muted-foreground">{t('pageSubtitle')}</p>
    </div>
  );
}

function ProviderGrid({ providers }: { providers: ProviderCardData[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {providers.map((provider) => (
        <ProviderCard key={provider.id} provider={provider} />
      ))}
    </div>
  );
}

function EmptyState() {
  const t = useTranslations('providers');
  return (
    <div className="flex flex-col items-center py-24 text-center">
      <div className="mb-4 text-4xl">✨</div>
      <h2 className="text-xl font-semibold text-foreground">{t('emptyTitle')}</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{t('emptyDesc')}</p>
      <Link
        href="/voor-schoonmakers"
        className="mt-8 inline-flex h-10 items-center justify-center rounded-lg border border-border px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        {t('emptyCtaLabel')}
      </Link>
    </div>
  );
}
