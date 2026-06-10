import { setRequestLocale, getTranslations } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import BookingsTable from './bookings-table';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'admin.bookings' });
  return { title: `${t('title')} — Admin — Alvessa` };
}

type BookingRow = {
  id: string;
  status: string;
  scheduled_at: string;
  total_cents: number;
  service_name_nl_snapshot: string;
  service_name_en_snapshot: string;
  provider_display_name_snapshot: string;
  customer: { display_name: string } | null;
  // P1-4: true when a cancelled booking still has a payment row — i.e. it was
  // paid and a manual Stripe refund is required (no auto-refund in the MVP).
  refundRequired: boolean;
};

async function getAllBookings(): Promise<BookingRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('bookings')
    .select(`
      id, status, scheduled_at, total_cents,
      service_name_nl_snapshot, service_name_en_snapshot,
      provider_display_name_snapshot,
      customer:profiles!bookings_customer_id_fkey(display_name)
    `)
    .order('scheduled_at', { ascending: false });

  const rows = (data ?? []) as unknown as Omit<BookingRow, 'refundRequired'>[];

  // P1-4 (Issue 2): determine the manual-refund flag with an explicit payments
  // lookup rather than a PostgREST embedded shape. payments.booking_id is UNIQUE,
  // so an embed could come back as an object (not an array), making a
  // `payments.length` check unreliable. A booking needs a refund when it is
  // cancelled AND a payment row exists for it.
  const cancelledIds = rows.filter((r) => r.status === 'cancelled').map((r) => r.id);
  const paidBookingIds = new Set<string>();

  if (cancelledIds.length > 0) {
    const { data: paidRows, error: paidError } = await supabase
      .from('payments')
      .select('booking_id')
      .in('booking_id', cancelledIds);

    if (paidError) {
      // Conservative: log and leave the flag off rather than crashing the page.
      // The refund-alert email (Issue 1) is the authoritative operational signal.
      console.error('[admin/bookings] payment lookup failed:', paidError.message);
    } else {
      for (const p of paidRows ?? []) {
        paidBookingIds.add((p as { booking_id: string }).booking_id);
      }
    }
  }

  return rows.map((row) => ({
    ...row,
    refundRequired: row.status === 'cancelled' && paidBookingIds.has(row.id),
  }));
}

export default async function AdminBookingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const bookings = await getAllBookings();

  return <PageContent bookings={bookings} locale={locale} />;
}

function PageContent({
  bookings,
  locale,
}: {
  bookings: BookingRow[];
  locale: string;
}) {
  const t = useTranslations('admin.bookings');
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('title')}</h1>
      <BookingsTable bookings={bookings} locale={locale} />
    </div>
  );
}
