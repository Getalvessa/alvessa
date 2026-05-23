import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import ServiceModeForm from './service-mode-form';
import type { ServiceMode } from '@/lib/types/service-mode';

type Props = { params: Promise<{ locale: string }> };

export default async function ServiceModePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/inloggen');

  const { data: provider } = await supabase
    .from('providers')
    .select('service_mode, mobile_radius_km, mobile_travel_fee_cents, mobile_notes, studio_city, studio_postcode, studio_notes')
    .eq('profile_id', user.id)
    .single();

  if (!provider) redirect('/dashboard');

  const t = await getTranslations({ locale, namespace: 'serviceMode' });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('pageTitle')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('pageSubtitle')}</p>
      </div>

      <ServiceModeForm
        initial={{
          service_mode:            (provider.service_mode as ServiceMode) ?? 'studio_only',
          mobile_radius_km:        provider.mobile_radius_km ?? null,
          mobile_travel_fee_cents: provider.mobile_travel_fee_cents ?? null,
          mobile_notes:            provider.mobile_notes ?? '',
          studio_city:             provider.studio_city ?? '',
          studio_postcode:         provider.studio_postcode ?? '',
          studio_notes:            provider.studio_notes ?? '',
        }}
      />
    </div>
  );
}
