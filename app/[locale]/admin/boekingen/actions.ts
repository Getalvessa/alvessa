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
  return supabase;
}

export async function completeBookingAction(
  bookingId: string,
): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  if (!supabase) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'completed' })
    .eq('id', bookingId)
    .eq('status', 'confirmed');

  if (error) return { error: error.message };
  revalidatePath('/admin/boekingen');
  return { error: null };
}

export async function cancelBookingAction(
  bookingId: string,
): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  if (!supabase) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('bookings')
    .update({
      status:          'cancelled',
      cancelled_by:    'admin',
      cancelled_at:    new Date().toISOString(),
    })
    .eq('id', bookingId)
    .in('status', ['confirmed', 'pending_payment']);

  if (error) return { error: error.message };
  revalidatePath('/admin/boekingen');
  return { error: null };
}
