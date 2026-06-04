'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

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

  const { error } = await supabase
    .from('bookings')
    .update({
      status:       'cancelled',
      cancelled_by: 'provider',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
    .eq('provider_id', providerId)
    .eq('status', 'confirmed');

  if (error) return { error: error.message };

  revalidatePath('/dashboard/boekingen');
  revalidatePath('/nl/dashboard/boekingen');
  revalidatePath('/en/dashboard/boekingen');
  return { error: null };
}
