'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

const VALID_PROVIDER_STATUS = ['new', 'trusted', 'core', 'restricted', 'banned'] as const;
type ProviderStatus = (typeof VALID_PROVIDER_STATUS)[number];

function generateSlug(fullName: string): string {
  const base = fullName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

export async function approveApplicationAction(
  applicationId: string,
): Promise<{ error: string | null; providerCreated: boolean; userFound: boolean }> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: 'Unauthorized', providerCreated: false, userFound: false };
  const { supabase, userId } = ctx;

  const serviceRole = createServiceRoleClient();

  const { data: app, error: fetchError } = await serviceRole
    .from('provider_applications')
    .select('*')
    .eq('id', applicationId)
    .single();

  if (fetchError || !app) return { error: 'Application not found', providerCreated: false, userFound: false };
  if (app.status !== 'pending') return { error: 'Application is not pending', providerCreated: false, userFound: false };

  const { error: updateError } = await serviceRole
    .from('provider_applications')
    .update({ status: 'approved' })
    .eq('id', applicationId);

  if (updateError) return { error: updateError.message, providerCreated: false, userFound: false };

  const { data: usersData } = await serviceRole.auth.admin.listUsers({ perPage: 1000 });
  const matchedUser = usersData?.users?.find((u) => u.email === app.email) ?? null;

  if (!matchedUser) {
    await supabase.from('admin_audit_log').insert({
      actor_user_id: userId,
      target_type: 'user',
      target_id: applicationId,
      action: 'application.approve',
      metadata: { email: app.email, user_found: false },
    });
    revalidatePath('/admin/aanbieders');
    return { error: null, providerCreated: false, userFound: false };
  }

  const profileId = matchedUser.id;

  await serviceRole.from('profiles').update({ is_provider: true }).eq('id', profileId);

  const { data: existingProvider } = await serviceRole
    .from('providers')
    .select('id')
    .eq('profile_id', profileId)
    .maybeSingle();

  let providerCreated = false;
  if (!existingProvider) {
    const { error: providerError } = await serviceRole.from('providers').insert({
      profile_id: profileId,
      slug: generateSlug(app.full_name),
      city: app.city,
      service_mode: app.works_mobile ? 'mobile' : 'studio',
      is_active: false,
      is_verified: false,
      status: 'new',
      trust_level: 0,
    });
    if (!providerError) providerCreated = true;
    else console.error('[approveApplication] provider insert failed:', providerError.message);
  }

  await supabase.from('admin_audit_log').insert({
    actor_user_id: userId,
    target_type: 'user',
    target_id: applicationId,
    action: 'application.approve',
    metadata: { email: app.email, profile_id: profileId, provider_created: providerCreated },
  });

  revalidatePath('/admin/aanbieders');
  return { error: null, providerCreated, userFound: true };
}

export async function rejectApplicationAction(
  applicationId: string,
): Promise<{ error: string | null }> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: 'Unauthorized' };
  const { supabase, userId } = ctx;

  const serviceRole = createServiceRoleClient();

  const { data: app, error: fetchError } = await serviceRole
    .from('provider_applications')
    .select('id, status, email')
    .eq('id', applicationId)
    .single();

  if (fetchError || !app) return { error: 'Application not found' };
  if (app.status !== 'pending') return { error: 'Application is not pending' };

  const { error: updateError } = await serviceRole
    .from('provider_applications')
    .update({ status: 'rejected' })
    .eq('id', applicationId);

  if (updateError) return { error: updateError.message };

  await supabase.from('admin_audit_log').insert({
    actor_user_id: userId,
    target_type: 'user',
    target_id: applicationId,
    action: 'application.reject',
    metadata: { email: app.email },
  });

  revalidatePath('/admin/aanbieders');
  return { error: null };
}

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
