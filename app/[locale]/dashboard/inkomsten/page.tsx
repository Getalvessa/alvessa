import { setRequestLocale, getTranslations } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import StatsCard from '@/components/dashboard/stats-card';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dashboard.earnings' });
  return { title: `${t('title')} — Alvessa` };
}

type PaymentRow = {
  id: string;
  created_at: string;
  provider_amount_cents: number;
  booking: {
    service_name_nl_snapshot: string;
    service_name_en_snapshot: string;
  } | null;
};

async function getEarningsData() {
  const supabase = await createClient();

  const [{ data: payments }, { data: pendingBookings }] = await Promise.all([
    supabase
      .from('payments')
      .select(
        `id, created_at, provider_amount_cents,
         booking:bookings!payments_booking_id_fkey(service_name_nl_snapshot, service_name_en_snapshot)`,
      )
      .eq('status', 'paid')
      .order('created_at', { ascending: false }),
    supabase
      .from('bookings')
      .select('total_cents')
      .eq('status', 'confirmed'),
  ]);

  const paidTotal = (payments ?? []).reduce(
    (sum, p) => sum + (p.provider_amount_cents ?? 0),
    0,
  );
  const pendingTotal = (pendingBookings ?? []).reduce(
    (sum, b) => sum + (b.total_cents ?? 0),
    0,
  );

  return {
    payments: (payments ?? []) as unknown as PaymentRow[],
    paidTotal,
    pendingTotal,
  };
}

export default async function EarningsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { payments, paidTotal, pendingTotal } = await getEarningsData();

  return (
    <EarningsContent
      payments={payments}
      paidTotal={paidTotal}
      pendingTotal={pendingTotal}
      locale={locale}
    />
  );
}

function EarningsContent({
  payments,
  paidTotal,
  pendingTotal,
  locale,
}: {
  payments: PaymentRow[];
  paidTotal: number;
  pendingTotal: number;
  locale: string;
}) {
  const t = useTranslations('dashboard.earnings');

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('title')}</h1>

      <div className="grid grid-cols-2 gap-4">
        <StatsCard label={t('paidTotal')} value={`€${Math.floor(paidTotal / 100)}`} />
        <StatsCard label={t('pendingTotal')} value={`€${Math.floor(pendingTotal / 100)}`} />
      </div>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">{t('recentTitle')}</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noEarnings')}</p>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    {t('colDate')}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    {t('colService')}
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    {t('colAmount')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const serviceName =
                    locale === 'nl'
                      ? p.booking?.service_name_nl_snapshot
                      : p.booking?.service_name_en_snapshot;
                  const date = new Date(p.created_at).toLocaleDateString(
                    locale === 'nl' ? 'nl-NL' : 'en-GB',
                    {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      timeZone: 'Europe/Amsterdam',
                    },
                  );

                  return (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-muted-foreground">{date}</td>
                      <td className="px-4 py-3 text-foreground">{serviceName ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground">
                        €{Math.floor(p.provider_amount_cents / 100)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
