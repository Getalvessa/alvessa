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

export async function approveProviderAction(
  providerId: string,
): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  if (!supabase) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('providers')
    .update({ is_verified: true, is_active: true })
    .eq('id', providerId);

  if (error) return { error: error.message };
  revalidatePath('/admin/aanbieders');
  return { error: null };
}

export async function deactivateProviderAction(
  providerId: string,
): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  if (!supabase) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('providers')
    .update({ is_active: false })
    .eq('id', providerId);

  if (error) return { error: error.message };
  revalidatePath('/admin/aanbieders');
  return { error: null };
}

export async function activateProviderAction(
  providerId: string,
): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  if (!supabase) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('providers')
    .update({ is_active: true })
    .eq('id', providerId);

  if (error) return { error: error.message };
  revalidatePath('/admin/aanbieders');
  return { error: null };
}
