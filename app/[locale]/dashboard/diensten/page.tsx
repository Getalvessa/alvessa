import { setRequestLocale, getTranslations } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import ServicesForm from './services-form';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dashboard.services' });
  return { title: `${t('title')} — Alvessa` };
}

type ServiceRow = {
  id: string;
  nameNl: string;
  nameEn: string;
  basePriceCents: number;
  durationMinutes: number;
  isEnabled: boolean;
  customPriceCents: number | null;
};

async function getServicesData(): Promise<ServiceRow[]> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: provider } = await supabase
    .from('providers')
    .select('id')
    .eq('profile_id', user.id)
    .single();

  if (!provider) return [];

  const [{ data: allServices }, { data: myServices }] = await Promise.all([
    supabase
      .from('services')
      .select('id, name_nl, name_en, base_price_cents, duration_minutes, category_id')
      .eq('is_active', true)
      .order('duration_minutes', { ascending: true }),
    supabase
      .from('provider_services')
      .select('service_id, is_active, custom_price_cents')
      .eq('provider_id', provider.id),
  ]);

  // Build a lookup so we can resolve category_id for each of the provider's services.
  const allServicesMap = new Map((allServices ?? []).map((s) => [s.id, s]));

  // Determine which categories this provider has already configured services for.
  // If the provider has no provider_services yet (new provider), show all categories
  // so they can set up their profile — the admin handles assignment at onboarding.
  const enabledCategoryIds = new Set(
    (myServices ?? [])
      .map((r) => allServicesMap.get(r.service_id)?.category_id)
      .filter((id): id is string => Boolean(id)),
  );

  const filteredServices = enabledCategoryIds.size > 0
    ? (allServices ?? []).filter((s) => enabledCategoryIds.has(s.category_id))
    : (allServices ?? []);

  const myMap = new Map(
    (myServices ?? []).map((r) => [r.service_id, r]),
  );

  return filteredServices.map((s) => {
    const mine = myMap.get(s.id);
    return {
      id:               s.id,
      nameNl:           s.name_nl,
      nameEn:           s.name_en,
      basePriceCents:   s.base_price_cents,
      durationMinutes:  s.duration_minutes,
      isEnabled:        mine?.is_active ?? false,
      customPriceCents: mine?.custom_price_cents ?? null,
    };
  });
}

export default async function DashboardServicesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const services = await getServicesData();

  return <PageContent services={services} locale={locale} />;
}

function PageContent({ services, locale }: { services: ServiceRow[]; locale: string }) {
  const t = useTranslations('dashboard.services');
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      <ServicesForm initialServices={services} locale={locale} />
    </div>
  );
}
