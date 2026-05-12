import { getTranslations, setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';

type Props = { params: Promise<{ locale: string }> };

type Booking = {
  id: string;
  status: string;
  scheduled_at: string;
  duration_minutes: number;
  total_cents: number;
  service_name_nl_snapshot: string;
  service_name_en_snapshot: string;
  provider_display_name_snapshot: string;
  provider_slug_snapshot: string;
  address_city: string;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'myBookings' });
  return { title: t('metaTitle') };
}

async function getMyBookings(): Promise<Booking[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('bookings')
    .select(`
      id, status, scheduled_at, duration_minutes, total_cents,
      service_name_nl_snapshot, service_name_en_snapshot,
      provider_display_name_snapshot, provider_slug_snapshot, address_city
    `)
    .eq('customer_id', user.id)
    .order('scheduled_at', { ascending: false });

  return (data ?? []) as Booking[];
}

const STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Wacht op betaling',
  confirmed:       'Bevestigd',
  completed:       'Voltooid',
  payment_failed:  'Betaling mislukt',
  cancelled:       'Geannuleerd',
  refunded:        'Terugbetaald',
};

export default async function MyBookingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const bookings = await getMyBookings();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <PageHeader />
      {bookings.length === 0 ? <EmptyState /> : <BookingList bookings={bookings} locale={locale} />}
    </div>
  );
}

function PageHeader() {
  const t = useTranslations('myBookings');
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('pageTitle')}</h1>
    </div>
  );
}

function BookingList({ bookings, locale }: { bookings: Booking[]; locale: string }) {
  return (
    <div className="space-y-4">
      {bookings.map((b) => (
        <BookingCard key={b.id} booking={b} locale={locale} />
      ))}
    </div>
  );
}

function BookingCard({ booking: b, locale }: { booking: Booking; locale: string }) {
  const serviceName = locale === 'nl' ? b.service_name_nl_snapshot : b.service_name_en_snapshot;
  const date = new Date(b.scheduled_at).toLocaleDateString(
    locale === 'nl' ? 'nl-NL' : 'en-GB',
    { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' },
  );

  const statusLabel = STATUS_LABEL[b.status] ?? b.status;
  const isConfirmed = b.status === 'confirmed';

  return (
    <div className="rounded-xl border border-border p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">{serviceName}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {b.provider_display_name_snapshot} · {date}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{b.address_city}</p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium
            ${isConfirmed ? 'bg-foreground/10 text-foreground' : 'bg-muted text-muted-foreground'}`}>
            {statusLabel}
          </span>
          <span className="text-sm font-semibold text-foreground">
            €{Math.floor(b.total_cents / 100)}
          </span>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  const t = useTranslations('myBookings');
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <div className="mb-4 text-4xl">📅</div>
      <p className="text-lg font-semibold text-foreground">{t('emptyTitle')}</p>
      <p className="mt-2 text-sm text-muted-foreground">{t('emptyDesc')}</p>
      <Link
        href="/aanbod"
        className="mt-8 inline-flex h-10 items-center justify-center rounded-lg bg-foreground px-6 text-sm font-semibold text-background hover:bg-foreground/90"
      >
        {t('browseLink')}
      </Link>
    </div>
  );
}
