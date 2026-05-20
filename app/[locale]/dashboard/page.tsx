import { setRequestLocale, getTranslations } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import StatsCard from '@/components/dashboard/stats-card';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dashboard.overview' });
  return { title: `${t('title')} — Alvessa` };
}

type UpcomingBooking = {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  service_name_nl_snapshot: string;
  service_name_en_snapshot: string;
  address_city: string;
  total_cents: number;
  customer: { display_name: string } | null;
};

async function getDashboardData() {
  const supabase = await createClient();

  const now = new Date().toISOString();
  const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthStart = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  ).toISOString();

  const [{ data: upcoming }, { data: monthBookings }, { data: payments }] =
    await Promise.all([
      supabase
        .from('bookings')
        .select(
          `id, scheduled_at, duration_minutes,
           service_name_nl_snapshot, service_name_en_snapshot,
           address_city, total_cents,
           customer:profiles!bookings_customer_id_fkey(display_name)`,
        )
        .eq('status', 'confirmed')
        .gte('scheduled_at', now)
        .lte('scheduled_at', sevenDaysLater)
        .order('scheduled_at', { ascending: true }),
      supabase
        .from('bookings')
        .select('id')
        .in('status', ['confirmed', 'completed'])
        .gte('scheduled_at', monthStart),
      supabase
        .from('payments')
        .select('provider_amount_cents')
        .eq('status', 'paid')
        .gte('created_at', monthStart),
    ]);

  const monthEarnings = (payments ?? []).reduce(
    (sum, p) => sum + (p.provider_amount_cents ?? 0),
    0,
  );

  return {
    upcoming: (upcoming ?? []) as unknown as UpcomingBooking[],
    monthBookingCount: (monthBookings ?? []).length,
    monthEarnings,
  };
}

export default async function DashboardOverviewPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const data = await getDashboardData();

  return (
    <OverviewContent
      upcoming={data.upcoming}
      monthBookingCount={data.monthBookingCount}
      monthEarnings={data.monthEarnings}
      locale={locale}
    />
  );
}

function OverviewContent({
  upcoming,
  monthBookingCount,
  monthEarnings,
  locale,
}: {
  upcoming: UpcomingBooking[];
  monthBookingCount: number;
  monthEarnings: number;
  locale: string;
}) {
  const t = useTranslations('dashboard.overview');

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('title')}</h1>

      <div className="grid grid-cols-2 gap-4">
        <StatsCard label={t('statsThisMonth')} value={String(monthBookingCount)} />
        <StatsCard
          label={t('statsThisMonthEarnings')}
          value={`€${Math.floor(monthEarnings / 100)}`}
        />
      </div>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">{t('upcomingTitle')}</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noUpcoming')}</p>
        ) : (
          <div className="space-y-3">
            {upcoming.map((b) => (
              <UpcomingCard key={b.id} booking={b} locale={locale} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function UpcomingCard({
  booking: b,
  locale,
}: {
  booking: UpcomingBooking;
  locale: string;
}) {
  const serviceName =
    locale === 'nl' ? b.service_name_nl_snapshot : b.service_name_en_snapshot;
  const date = new Date(b.scheduled_at).toLocaleDateString(
    locale === 'nl' ? 'nl-NL' : 'en-GB',
    {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Amsterdam',
    },
  );
  const customerName = b.customer?.display_name ?? '—';

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-foreground">{serviceName}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {customerName} · {date}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{b.address_city}</p>
        </div>
        <span className="shrink-0 text-sm font-semibold text-foreground">
          €{Math.floor(b.total_cents / 100)}
        </span>
      </div>
    </div>
  );
}
