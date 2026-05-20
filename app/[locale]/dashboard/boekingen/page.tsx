import { setRequestLocale, getTranslations } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dashboard.bookings' });
  return { title: `${t('title')} — Alvessa` };
}

type ProviderBooking = {
  id: string;
  status: string;
  scheduled_at: string;
  duration_minutes: number;
  total_cents: number;
  service_name_nl_snapshot: string;
  service_name_en_snapshot: string;
  address_city: string;
  customer: { display_name: string } | null;
};

async function getProviderBookings(): Promise<ProviderBooking[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('bookings')
    .select(
      `id, status, scheduled_at, duration_minutes, total_cents,
       service_name_nl_snapshot, service_name_en_snapshot, address_city,
       customer:profiles!bookings_customer_id_fkey(display_name)`,
    )
    .order('scheduled_at', { ascending: false });

  return (data ?? []) as unknown as ProviderBooking[];
}

export default async function DashboardBookingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const bookings = await getProviderBookings();

  return <BookingsList bookings={bookings} locale={locale} />;
}

const STATUS_COLOR: Record<string, string> = {
  pending_payment: 'bg-muted text-muted-foreground',
  confirmed:       'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  completed:       'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  payment_failed:  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  cancelled:       'bg-muted text-muted-foreground',
  refunded:        'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

function BookingsList({
  bookings,
  locale,
}: {
  bookings: ProviderBooking[];
  locale: string;
}) {
  const t = useTranslations('dashboard.bookings');

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending_payment: t('statusPendingPayment'),
      confirmed:       t('statusConfirmed'),
      completed:       t('statusCompleted'),
      payment_failed:  t('statusPaymentFailed'),
      cancelled:       t('statusCancelled'),
      refunded:        t('statusRefunded'),
    };
    return map[status] ?? status;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('title')}</h1>

      {bookings.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => {
            const serviceName =
              locale === 'nl' ? b.service_name_nl_snapshot : b.service_name_en_snapshot;
            const date = new Date(b.scheduled_at).toLocaleDateString(
              locale === 'nl' ? 'nl-NL' : 'en-GB',
              {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Europe/Amsterdam',
              },
            );

            return (
              <div key={b.id} className="rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{serviceName}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {b.customer?.display_name ?? '—'} · {date}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{b.address_city}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[b.status] ?? 'bg-muted text-muted-foreground'}`}
                    >
                      {statusLabel(b.status)}
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      €{Math.floor(b.total_cents / 100)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
