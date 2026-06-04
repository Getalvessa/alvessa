'use client';

import { useTransition, useState } from 'react';
import { useTranslations } from 'next-intl';
import { completeBookingAction, cancelBookingAction } from './actions';

export function BookingActions({ bookingId }: { bookingId: string }) {
  const t = useTranslations('dashboard.bookings');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleComplete() {
    setError(null);
    startTransition(async () => {
      const result = await completeBookingAction(bookingId);
      if (result.error) setError(t('actionError'));
    });
  }

  function handleCancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelBookingAction(bookingId);
      if (result.error) setError(t('actionError'));
    });
  }

  return (
    <div className="mt-3 flex flex-col gap-1.5">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleCancel}
          disabled={isPending}
          className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          {t('actionCancel')}
        </button>
        <button
          onClick={handleComplete}
          disabled={isPending}
          className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {t('actionComplete')}
        </button>
      </div>
    </div>
  );
}
