import { setRequestLocale, getTranslations } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import StatsCard from '@/components/dashboard/stats-card';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'admin.overview' });
  return { title: `${t('title')} — Zenzo` };
}

async function getAdminStats() {
  const supabase = await createClient();

  const [
    { count: totalBookings },
    { count: confirmedBookings },
    { count: pendingProviders },
    { data: payments },
  ] = await Promise.all([
    supabase.from('bookings').select('*', { count: 'exact', head: true }),
    supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'confirmed'),
    supabase
      .from('providers')
      .select('*', { count: 'exact', head: true })
      .eq('is_verified', false)
      .eq('is_active', true),
    supabase.from('payments').select('amount_cents').eq('status', 'paid'),
  ]);

  const totalRevenue = (payments ?? []).reduce((s, p) => s + (p.amount_cents ?? 0), 0);

  return {
    totalBookings:     totalBookings ?? 0,
    confirmedBookings: confirmedBookings ?? 0,
    pendingProviders:  pendingProviders ?? 0,
    totalRevenue,
  };
}

export default async function AdminOverviewPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const stats = await getAdminStats();

  return <OverviewContent stats={stats} />;
}

function OverviewContent({
  stats,
}: {
  stats: {
    totalBookings: number;
    confirmedBookings: number;
    pendingProviders: number;
    totalRevenue: number;
  };
}) {
  const t = useTranslations('admin.overview');

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('title')}</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatsCard label={t('statsTotalBookings')}    value={String(stats.totalBookings)} />
        <StatsCard label={t('statsConfirmedBookings')} value={String(stats.confirmedBookings)} />
        <StatsCard label={t('statsPendingProviders')} value={String(stats.pendingProviders)} />
        <StatsCard
          label={t('statsTotalRevenue')}
          value={`€${Math.floor(stats.totalRevenue / 100)}`}
        />
      </div>
    </div>
  );
}
