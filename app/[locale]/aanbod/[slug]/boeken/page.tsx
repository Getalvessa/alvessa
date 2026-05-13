import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { BookingFlow } from './booking-flow';

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ cancelled?: string }>;
};

type Service = {
  id: string;
  is_active: boolean;
  custom_price_cents: number | null;
  services: {
    id: string;
    name_nl: string;
    name_en: string;
    duration_minutes: number;
    base_price_cents: number;
  } | null;
};

async function getProviderForBooking(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('providers')
    .select(`
      id, slug, city,
      profiles ( display_name ),
      provider_services ( id, custom_price_cents, is_active,
        services ( id, name_nl, name_en, duration_minutes, base_price_cents )
      )
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .eq('is_verified', true)
    .single();

  if (!data) return null;

  return {
    ...data,
    provider_services: (data.provider_services as Service[]).filter(
      (ps) => ps.is_active && ps.services,
    ),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const provider = await getProviderForBooking(slug);
  if (!provider) return {};
  const t = await getTranslations({ locale, namespace: 'booking' });
  return { title: t('metaTitle', { name: provider.profiles?.display_name ?? slug }), robots: { index: false, follow: false } };
}

export default async function BookingPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const { cancelled }    = await searchParams;
  setRequestLocale(locale);

  const provider = await getProviderForBooking(slug);
  if (!provider || provider.provider_services.length === 0) notFound();

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <BookingFlow provider={provider} locale={locale} cancelled={cancelled === 'true'} />
    </div>
  );
}
