'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { completeBookingAction, cancelBookingAction } from './actions';

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

const STATUS_COLOR: Record<string, string> = {
  pending_payment: 'bg-muted text-muted-foreground',
  confirmed:       'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  completed:       'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  payment_failed:  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  cancelled:       'bg-muted text-muted-foreground',
  refunded:        'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Wacht op betaling',
  confirmed:       'Bevestigd',
  completed:       'Voltooid',
  payment_failed:  'Betaling mislukt',
  cancelled:       'Geannuleerd',
  refunded:        'Terugbetaald',
};

export default function BookingsTable({
  bookings,
  locale,
}: {
  bookings: BookingRow[];
  locale: string;
}) {
  const t = useTranslations('admin.bookings');
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  async function handle(
    id: string,
    action: (id: string) => Promise<{ error: string | null }>,
  ) {
    setBusy(id);
    const { error } = await action(id);
    if (error) setFeedback((prev) => ({ ...prev, [id]: t('actionError') }));
    setBusy(null);
  }

  if (bookings.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('empty')}</p>;
  }

  return (
    <div className="rounded-xl border border-border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            {[
              t('colDate'), t('colCustomer'), t('colProvider'),
              t('colService'), t('colAmount'), t('colStatus'), t('colActions'),
            ].map((h) => (
              <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => {
            const serviceName =
              locale === 'nl' ? b.service_name_nl_snapshot : b.service_name_en_snapshot;
            const date = new Date(b.scheduled_at).toLocaleDateString(
              locale === 'nl' ? 'nl-NL' : 'en-GB',
              { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' },
            );
            const canComplete = b.status === 'confirmed';
            const canCancel   = ['confirmed', 'pending_payment'].includes(b.status);

            return (
              <tr key={b.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{date}</td>
                <td className="px-4 py-3 text-foreground">{b.customer?.display_name ?? '—'}</td>
                <td className="px-4 py-3 text-foreground">{b.provider_display_name_snapshot}</td>
                <td className="px-4 py-3 text-foreground">{serviceName}</td>
                <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                  €{Math.floor(b.total_cents / 100)}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[b.status] ?? 'bg-muted text-muted-foreground'}`}>
                    {STATUS_LABELS[b.status] ?? b.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {canComplete && (
                      <button
                        disabled={busy === b.id}
                        onClick={() => handle(b.id, completeBookingAction)}
                        className="rounded-lg bg-foreground px-3 py-1 text-xs font-semibold text-background hover:bg-foreground/90 disabled:opacity-50"
                      >
                        {t('actionComplete')}
                      </button>
                    )}
                    {canCancel && (
                      <button
                        disabled={busy === b.id}
                        onClick={() => handle(b.id, cancelBookingAction)}
                        className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
                      >
                        {t('actionCancel')}
                      </button>
                    )}
                    {feedback[b.id] && (
                      <span className="text-xs text-red-600">{feedback[b.id]}</span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
