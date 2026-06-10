'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { sendRefundRequiredAlert } from '@/lib/email';

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) return null;
  return { supabase, userId: user.id };
}

export async function completeBookingAction(
  bookingId: string,
): Promise<{ error: string | null }> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: 'Unauthorized' };
  const { supabase, userId } = ctx;

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'completed' })
    .eq('id', bookingId)
    .eq('status', 'confirmed');

  if (error) return { error: error.message };

  const { error: auditError } = await supabase.from('admin_audit_log').insert({
    actor_user_id: userId,
    target_type: 'booking',
    target_id: bookingId,
    action: 'booking.complete',
    metadata: { status_set: 'completed' },
  });
  if (auditError) console.error('[audit] booking.complete failed to log:', auditError.message);

  revalidatePath('/admin/boekingen');
  return { error: null };
}

export async function cancelBookingAction(
  bookingId: string,
): Promise<{ error: string | null }> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: 'Unauthorized' };
  const { supabase, userId } = ctx;

  // Capture the prior status BEFORE the update so we know whether this booking
  // was already paid ('confirmed') — only paid bookings need a manual refund.
  const { data: prior } = await supabase
    .from('bookings')
    .select('status, customer_id, provider_id, scheduled_at')
    .eq('id', bookingId)
    .single();

  const { error } = await supabase
    .from('bookings')
    .update({
      status:       'cancelled',
      cancelled_by: 'admin',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
    .in('status', ['confirmed', 'pending_payment']);

  if (error) return { error: error.message };

  // P1-4: a paid ('confirmed') booking was cancelled. No automatic refund in the
  // MVP — send an operational alert email so the refund can be issued manually via
  // the Stripe dashboard. pending_payment cancellations were never paid, so they
  // are skipped. Email failure must NOT block the cancellation.
  if (prior?.status === 'confirmed') {
    const { data: payment } = await supabase
      .from('payments')
      .select('id')
      .eq('booking_id', bookingId)
      .maybeSingle();

    console.error('CANCELLED_PAID_BOOKING_REQUIRES_REFUND', JSON.stringify({
      booking_id:  bookingId,
      customer_id: prior.customer_id ?? null,
      payment_id:  payment?.id ?? null,
    }));

    try {
      await sendRefundRequiredAlert({
        bookingId,
        customerId:  prior.customer_id ?? '',
        providerId:  prior.provider_id ?? '',
        paymentId:   payment?.id ?? null,
        scheduledAt: prior.scheduled_at,
        cancelledBy: 'admin',
      });
    } catch (alertErr) {
      console.error('[refund-alert] admin cancel: email send failed:',
        alertErr instanceof Error ? alertErr.message : 'unknown');
    }
  }

  const { error: auditError } = await supabase.from('admin_audit_log').insert({
    actor_user_id: userId,
    target_type: 'booking',
    target_id: bookingId,
    action: 'booking.cancel',
    metadata: { cancelled_by: 'admin' },
  });
  if (auditError) console.error('[audit] booking.cancel failed to log:', auditError.message);

  revalidatePath('/admin/boekingen');
  return { error: null };
}
