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
  return { supabase, userId: user.id };
}

export async function approveProviderAction(
  providerId: string,
): Promise<{ error: string | null }> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: 'Unauthorized' };
  const { supabase, userId } = ctx;

  const { error } = await supabase
    .from('providers')
    .update({ is_verified: true, is_active: true })
    .eq('id', providerId);

  if (error) return { error: error.message };

  const { error: auditError } = await supabase.from('admin_audit_log').insert({
    actor_user_id: userId,
    target_type: 'provider',
    target_id: providerId,
    action: 'provider.approve',
    metadata: { is_verified: true, is_active: true },
  });
  if (auditError) console.error('[audit] provider.approve failed to log:', auditError.message);

  revalidatePath('/admin/aanbieders');
  return { error: null };
}

export async function deactivateProviderAction(
  providerId: string,
): Promise<{ error: string | null }> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: 'Unauthorized' };
  const { supabase, userId } = ctx;

  const { error } = await supabase
    .from('providers')
    .update({ is_active: false })
    .eq('id', providerId);

  if (error) return { error: error.message };

  const { error: auditError } = await supabase.from('admin_audit_log').insert({
    actor_user_id: userId,
    target_type: 'provider',
    target_id: providerId,
    action: 'provider.deactivate',
    metadata: { is_active: false },
  });
  if (auditError) console.error('[audit] provider.deactivate failed to log:', auditError.message);

  revalidatePath('/admin/aanbieders');
  return { error: null };
}

export async function activateProviderAction(
  providerId: string,
): Promise<{ error: string | null }> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: 'Unauthorized' };
  const { supabase, userId } = ctx;

  const { error } = await supabase
    .from('providers')
    .update({ is_active: true })
    .eq('id', providerId);

  if (error) return { error: error.message };

  const { error: auditError } = await supabase.from('admin_audit_log').insert({
    actor_user_id: userId,
    target_type: 'provider',
    target_id: providerId,
    action: 'provider.activate',
    metadata: { is_active: true },
  });
  if (auditError) console.error('[audit] provider.activate failed to log:', auditError.message);

  revalidatePath('/admin/aanbieders');
  return { error: null };
}

export async function updateProviderTrustAction(
  providerId: string,
  data: { status: ProviderStatus; trust_level: number; internal_notes: string | null },
): Promise<{ error: string | null }> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: 'Unauthorized' };
  const { supabase, userId } = ctx;

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

  const { error: auditError } = await supabase.from('admin_audit_log').insert({
    actor_user_id: userId,
    target_type: 'provider',
    target_id: providerId,
    action: 'provider.update_trust',
    metadata: { status: data.status, trust_level: trustLevel },
  });
  if (auditError) console.error('[audit] provider.update_trust failed to log:', auditError.message);

  revalidatePath('/admin/aanbieders');
  return { error: null };
}
