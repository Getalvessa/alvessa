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

  return (data ?? []) as unknown as BookingRow[];
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
