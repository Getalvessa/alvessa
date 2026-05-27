'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const VALID_PROVIDER_STATUS = ['new', 'trusted', 'core', 'restricted', 'banned'] as const;
type ProviderStatus = (typeof VALID_PROVIDER_STATUS)[number];

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

export async function updateProviderTrustAction(
  providerId: string,
  data: { status: ProviderStatus; trust_level: number; internal_notes: string | null },
): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  if (!supabase) return { error: 'Unauthorized' };

  if (!VALID_PROVIDER_STATUS.includes(data.status)) return { error: 'Invalid status' };
  const trustLevel = Math.max(0, Math.min(100, Math.round(data.trust_level)));

  const { error } = await supabase
    .from('providers')
    .update({
      status: data.status,
      trust_level: trustLevel,
      internal_notes: data.internal_notes || null,
    })
    .eq('id', providerId);

  if (error) return { error: error.message };
  revalidatePath('/admin/aanbieders');
  return { error: null };
}
