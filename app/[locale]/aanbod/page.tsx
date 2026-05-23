import { getTranslations, setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
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
  });
}

async function getProviders(mode: FilterMode): Promise<ProviderCardData[]> {
  const supabase = await createClient();

  let query = supabase
    .from('providers')
    .select(`
      id,
      slug,
      bio,
      city,
      avg_rating,
      total_reviews,
      service_area_km,
      service_mode,
      profiles ( display_name, avatar_url ),
      provider_services ( custom_price_cents, is_active, services ( base_price_cents ) )
    `)
    .eq('is_active', true)
    .eq('is_verified', true);

  if (mode === 'studio') {
    query = query.in('service_mode', ['studio_only', 'hybrid']);
  } else if (mode === 'home') {
    query = query.in('service_mode', ['mobile_only', 'hybrid']);
  }

  const { data, error } = await query
    .order('avg_rating', { ascending: false, nullsFirst: false })
    .order('total_reviews', { ascending: false });

  if (error) {
    console.error('Failed to fetch providers:', error.message);
    return [];
  }

  return (data ?? []) as ProviderCardData[];
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
      <div className="mb-4 text-4xl">💆</div>
      <h2 className="text-xl font-semibold text-foreground">{t('emptyTitle')}</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{t('emptyDesc')}</p>
      <Link
        href="/"
        className="mt-8 inline-flex h-10 items-center justify-center rounded-lg border border-border px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        {t('emptyCtaLabel')}
      </Link>
    </div>
  );
}
