'use client';

import { useTransition, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  completeBookingAction,
  cancelBookingAction,
  getBookingAddressAction,
  type BookingAddress,
} from './actions';

export function BookingActions({ bookingId }: { bookingId: string }) {
  const t = useTranslations('dashboard.bookings');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState<BookingAddress | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);

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

  // P1-4 (Issue 3): reveal the full address on demand. Nothing is loaded until
  // the provider clicks — the list never bulk-exposes addresses.
  function handleToggleAddress() {
    if (address) {
      setAddress(null);
      return;
    }
    setAddressError(null);
    startTransition(async () => {
      const result = await getBookingAddressAction(bookingId);
      if (result.error || !result.address) {
        setAddressError(t('addressError'));
        return;
      }
      setAddress(result.address);
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
        <button
          onClick={handleToggleAddress}
          disabled={isPending}
          className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          {address ? t('hideAddress') : t('showAddress')}
        </button>
      </div>
      {addressError && <p className="text-xs text-red-600">{addressError}</p>}
      {address && (
        <div className="mt-1 rounded-lg border border-border bg-muted/40 p-3 text-xs text-foreground">
          <p>{[address.addressLine, address.addressCity].filter(Boolean).join(', ')}</p>
          {address.addressNotes && (
            <p className="mt-1 text-muted-foreground">
              <span className="font-medium text-foreground">{t('addressNotesLabel')}: </span>
              {address.addressNotes}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
