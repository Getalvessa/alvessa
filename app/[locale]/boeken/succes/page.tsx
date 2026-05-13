import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ booking_id?: string; session_id?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'payment' });
  return { title: t('successMetaTitle'), robots: { index: false, follow: false } };
}

export default async function BookingSuccessPage({ params, searchParams }: Props) {
  const { locale }     = await params;
  const { booking_id } = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'payment' });

  type BookingSummary = {
    service_name_nl_snapshot: string;
    service_name_en_snapshot: string;
    scheduled_at: string;
    total_cents: number;
    provider_display_name_snapshot: string;
  };

  let booking: BookingSummary | null = null;

  if (booking_id) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('bookings')
      .select(`
        service_name_nl_snapshot, service_name_en_snapshot,
        scheduled_at, total_cents, provider_display_name_snapshot
      `)
      .eq('id', booking_id)
      .single();
    booking = data;
  }

  const serviceName = booking
    ? (locale === 'nl' ? booking.service_name_nl_snapshot : booking.service_name_en_snapshot)
    : null;

  const dateStr = booking
    ? new Date(booking.scheduled_at).toLocaleDateString(
        locale === 'nl' ? 'nl-NL' : 'en-GB',
        {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam',
        },
      )
    : null;

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-foreground">
        <Check className="h-8 w-8 text-background" />
      </div>

      <h1 className="text-2xl font-bold text-foreground">{t('successTitle')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t('successSubtitle')}</p>

      {booking && (
        <dl className="mt-8 divide-y divide-border rounded-xl border border-border text-left">
          <div className="flex justify-between px-4 py-3">
            <dt className="text-sm text-muted-foreground">{t('summaryService')}</dt>
            <dd className="text-sm font-medium text-foreground">{serviceName}</dd>
          </div>
          <div className="flex justify-between px-4 py-3">
            <dt className="text-sm text-muted-foreground">{t('summaryProvider')}</dt>
            <dd className="text-sm font-medium text-foreground">{booking.provider_display_name_snapshot}</dd>
          </div>
          <div className="flex justify-between px-4 py-3">
            <dt className="text-sm text-muted-foreground">{t('summaryDate')}</dt>
            <dd className="text-sm font-medium text-foreground">{dateStr}</dd>
          </div>
          <div className="flex justify-between px-4 py-3">
            <dt className="text-sm text-muted-foreground">{t('summaryAmount')}</dt>
            <dd className="text-sm font-semibold text-foreground">
              €{Math.floor(booking.total_cents / 100)}
            </dd>
          </div>
        </dl>
      )}

      <Link
        href="/mijn-boekingen"
        className="mt-8 inline-flex h-11 items-center justify-center rounded-lg bg-foreground px-8 text-sm font-semibold text-background hover:bg-foreground/90"
      >
        {t('myBookingsButton')}
      </Link>
    </div>
  );
}
