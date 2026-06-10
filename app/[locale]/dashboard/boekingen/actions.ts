'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { sendRefundRequiredAlert } from '@/lib/email';

async function requireProvider() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: provider } = await supabase
    .from('providers')
    .select('id')
    .eq('profile_id', user.id)
    .single();

  if (!provider) return null;
  return { supabase, providerId: provider.id };
}

export async function completeBookingAction(
  bookingId: string,
): Promise<{ error: string | null }> {
  const ctx = await requireProvider();
  if (!ctx) return { error: 'Unauthorized' };
  const { supabase, providerId } = ctx;

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'completed' })
    .eq('id', bookingId)
    .eq('provider_id', providerId)
    .eq('status', 'confirmed');

  if (error) return { error: error.message };

  revalidatePath('/dashboard/boekingen');
  revalidatePath('/nl/dashboard/boekingen');
  revalidatePath('/en/dashboard/boekingen');
  return { error: null };
}

export async function cancelBookingAction(
  bookingId: string,
): Promise<{ error: string | null }> {
  const ctx = await requireProvider();
  if (!ctx) return { error: 'Unauthorized' };
  const { supabase, providerId } = ctx;

  const { data: cancelled, error } = await supabase
    .from('bookings')
    .update({
      status:       'cancelled',
      cancelled_by: 'provider',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
    .eq('provider_id', providerId)
    .eq('status', 'confirmed')
    .select('id, customer_id, scheduled_at');

  if (error) return { error: error.message };

  // P1-4: this path only cancels bookings that were 'confirmed' (i.e. paid).
  // No automatic refund in the MVP — send an operational alert email so the
  // refund can be issued manually via the Stripe dashboard. Stripe is not
  // touched here. Email failure must NOT block the cancellation.
  if (cancelled && cancelled.length > 0) {
    const { data: payment } = await supabase
      .from('payments')
      .select('id')
      .eq('booking_id', bookingId)
      .maybeSingle();

    console.error('CANCELLED_PAID_BOOKING_REQUIRES_REFUND', JSON.stringify({
      booking_id:  bookingId,
      customer_id: cancelled[0].customer_id ?? null,
      payment_id:  payment?.id ?? null,
    }));

    try {
      await sendRefundRequiredAlert({
        bookingId,
        customerId:  cancelled[0].customer_id ?? '',
        providerId,
        paymentId:   payment?.id ?? null,
        scheduledAt: cancelled[0].scheduled_at,
        cancelledBy: 'provider',
      });
    } catch (alertErr) {
      console.error('[refund-alert] provider cancel: email send failed:',
        alertErr instanceof Error ? alertErr.message : 'unknown');
    }
  }

  revalidatePath('/dashboard/boekingen');
  revalidatePath('/nl/dashboard/boekingen');
  revalidatePath('/en/dashboard/boekingen');
  return { error: null };
}

// P1-4 (Issue 3): on-demand address fallback for the provider dashboard.
// The full street address is hidden from authenticated clients by column-level
// RLS (migration 021), so a provider cannot see where to go if the confirmation
// email fails. This action reveals the minimal address fields, but ONLY:
//   - to the provider the booking is assigned to (provider_id = own provider id)
//   - for a 'confirmed' booking
// A provider passing another provider's (or a non-confirmed) booking_id gets
// `not_found` — no cross-provider enumeration is possible. service_role is used
// solely to read past the column-level restriction after ownership is verified.
// Returns address fields only — never payment, card, or customer-email data.
export type BookingAddress = {
  addressLine:  string | null;
  addressCity:  string;
  addressNotes: string | null;
};

export async function getBookingAddressAction(
  bookingId: string,
): Promise<{ error: string | null; address?: BookingAddress }> {
  const ctx = await requireProvider();
  if (!ctx) return { error: 'unauthorized' };
  const { providerId } = ctx;

  const { data, error } = await createServiceRoleClient()
    .from('bookings')
    .select('address_line, address_city, address_notes')
    .eq('id', bookingId)
    .eq('provider_id', providerId)
    .eq('status', 'confirmed')
    .maybeSingle();

  if (error) {
    console.error('[getBookingAddress] lookup failed:', error.message);
    return { error: 'error' };
  }
  if (!data) return { error: 'not_found' };

  return {
    error: null,
    address: {
      addressLine:  data.address_line,
      addressCity:  data.address_city,
      addressNotes: data.address_notes,
    },
  };
}
