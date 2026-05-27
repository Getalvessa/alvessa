'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

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
