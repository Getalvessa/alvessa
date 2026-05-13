import { setRequestLocale, getTranslations } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import ServicesForm from './services-form';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dashboard.services' });
  return { title: `${t('title')} — Zenzo` };
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
      .select('id, name_nl, name_en, base_price_cents, duration_minutes')
      .eq('is_active', true)
      .order('duration_minutes', { ascending: true }),
    supabase
      .from('provider_services')
      .select('service_id, is_active, custom_price_cents')
      .eq('provider_id', provider.id),
  ]);

  const myMap = new Map(
    (myServices ?? []).map((r) => [r.service_id, r]),
  );

  return (allServices ?? []).map((s) => {
    const mine = myMap.get(s.id);
    return {
      id:              s.id,
      nameNl:          s.name_nl,
      nameEn:          s.name_en,
      basePriceCents:  s.base_price_cents,
      durationMinutes: s.duration_minutes,
      isEnabled:       mine?.is_active ?? false,
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
