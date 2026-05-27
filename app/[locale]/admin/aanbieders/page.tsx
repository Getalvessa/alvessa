import { setRequestLocale, getTranslations } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import ProvidersTable from './providers-table';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'admin.providers' });
  return { title: `${t('title')} — Admin — Alvessa` };
}

type ProviderStatus = 'new' | 'trusted' | 'core' | 'restricted' | 'banned';

type RawProvider = {
  id: string;
  slug: string;
  city: string;
  is_verified: boolean;
  is_active: boolean;
  status: ProviderStatus;
  trust_level: number;
  referred_by_provider_id: string | null;
  internal_notes: string | null;
  profile: { display_name: string } | null;
};

export type ProviderRow = RawProvider & {
  referred_by_name: string | null;
  completed: number;
  cancelled: number;
};

async function getAllProviders(): Promise<ProviderRow[]> {
  const supabase = await createClient();

  const [{ data: providers }, { data: bookingStats }] = await Promise.all([
    supabase
      .from('providers')
      .select(
        'id, slug, city, is_verified, is_active, status, trust_level, referred_by_provider_id, internal_notes, profile:profiles!providers_profile_id_fkey(display_name)',
      )
      .order('created_at', { ascending: false }),

    supabase
      .from('bookings')
      .select('provider_id, status')
      .in('status', ['completed', 'cancelled']),
  ]);

  const rawProviders = (providers ?? []) as unknown as RawProvider[];

  // Build name lookup for self-referential referred_by join
  const nameMap = Object.fromEntries(
    rawProviders.map((p) => [p.id, p.profile?.display_name ?? null]),
  );

  // Aggregate booking stats per provider
  const statsMap: Record<string, { completed: number; cancelled: number }> = {};
  for (const b of bookingStats ?? []) {
    const row = b as { provider_id: string; status: string };
    if (!statsMap[row.provider_id]) statsMap[row.provider_id] = { completed: 0, cancelled: 0 };
    if (row.status === 'completed') statsMap[row.provider_id].completed++;
    if (row.status === 'cancelled') statsMap[row.provider_id].cancelled++;
  }

  return rawProviders.map((p) => ({
    ...p,
    referred_by_name: p.referred_by_provider_id ? (nameMap[p.referred_by_provider_id] ?? null) : null,
    completed: statsMap[p.id]?.completed ?? 0,
    cancelled: statsMap[p.id]?.cancelled ?? 0,
  }));
}

export default async function AdminProvidersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const providers = await getAllProviders();

  return <PageContent providers={providers} />;
}

function PageContent({ providers }: { providers: ProviderRow[] }) {
  const t = useTranslations('admin.providers');
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('title')}</h1>
      <ProvidersTable providers={providers} />
    </div>
  );
}
