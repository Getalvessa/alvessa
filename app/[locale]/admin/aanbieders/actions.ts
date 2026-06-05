'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

const VALID_PROVIDER_STATUS = ['new', 'trusted', 'core', 'restricted', 'banned'] as const;
type ProviderStatus = (typeof VALID_PROVIDER_STATUS)[number];
type AdminUser = { id: string; email?: string | null };

const USER_LOOKUP_PER_PAGE = 1000;
const USER_LOOKUP_MAX_PAGES = 20;

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

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function findAuthUserByEmail(
  serviceRole: ReturnType<typeof createServiceRoleClient>,
  email: string,
): Promise<{ user: AdminUser | null; error: string | null }> {
  const targetEmail = normalizeEmail(email);

  for (let page = 1; page <= USER_LOOKUP_MAX_PAGES; page++) {
    const { data, error } = await serviceRole.auth.admin.listUsers({
      page,
      perPage: USER_LOOKUP_PER_PAGE,
    });

    if (error) return { user: null, error: error.message };

    const matchedUser =
      data.users.find((user) => user.email && normalizeEmail(user.email) === targetEmail) ?? null;
    if (matchedUser) return { user: matchedUser, error: null };
    if (data.users.length < USER_LOOKUP_PER_PAGE) break;
  }

  return { user: null, error: null };
}

export async function approveApplicationAction(
  applicationId: string,
): Promise<{ error: string | null; providerCreated: boolean; userFound: boolean }> {
  try {
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

    const { user: matchedUser, error: userLookupError } = await findAuthUserByEmail(serviceRole, app.email);
    if (userLookupError) {
      console.error('[approve] stage=user_lookup', userLookupError);
      return { error: userLookupError, providerCreated: false, userFound: false };
    }

    if (!matchedUser) {
      // No registered account yet — record the lookup attempt but do NOT approve the application.
      const { error: auditError } = await supabase.from('admin_audit_log').insert({
        actor_user_id: userId,
        target_type: 'application',
        target_id: applicationId,
        action: 'application.user_missing',
        metadata: { email: app.email },
      });
      if (auditError) {
        console.error('[approve] stage=audit_insert user_missing', auditError.message);
        return { error: auditError.message, providerCreated: false, userFound: false };
      }
      return { error: null, providerCreated: false, userFound: false };
    }

    const profileId = matchedUser.id;

    const { error: profileError } = await serviceRole
      .from('profiles')
      .update({ is_provider: true })
      .eq('id', profileId);

    if (profileError) {
      console.error('[approve] stage=profile_update', profileError.message);
      return { error: profileError.message, providerCreated: false, userFound: true };
    }

    const { data: existingProvider, error: providerLookupError } = await serviceRole
      .from('providers')
      .select('id')
      .eq('profile_id', profileId)
      .maybeSingle();

    if (providerLookupError) {
      console.error('[approve] stage=provider_lookup', providerLookupError.message);
      return { error: providerLookupError.message, providerCreated: false, userFound: true };
    }

    let providerCreated = false;
    if (!existingProvider) {
      const { error: providerError } = await serviceRole.from('providers').insert({
        profile_id: profileId,
        slug: generateSlug(app.full_name),
        city: app.city,
        service_mode: app.works_mobile ? 'mobile_only' : 'studio_only',
        is_active: false,
        is_verified: false,
        status: 'new',
        trust_level: 0,
      });
      if (providerError) {
        console.error('[approve] stage=provider_insert', providerError.message);
        return { error: providerError.message, providerCreated: false, userFound: true };
      }
      providerCreated = true;
    }

    // Status update first; only log approved when the transition succeeds.
    const { error: updateError } = await serviceRole
      .from('provider_applications')
      .update({ status: 'approved' })
      .eq('id', applicationId)
      .eq('status', 'pending')
      .select('id')
      .single();

    if (updateError) {
      console.error('[approve] stage=status_update', updateError.message);
      return { error: updateError.message, providerCreated, userFound: true };
    }

    const { error: auditError } = await supabase.from('admin_audit_log').insert({
      actor_user_id: userId,
      target_type: 'application',
      target_id: applicationId,
      action: 'application.approve',
      metadata: { email: app.email, profile_id: profileId, provider_created: providerCreated },
    });
    if (auditError) console.error('[approve] stage=audit_insert', auditError.message);

    return { error: null, providerCreated, userFound: true };
  } catch (err) {
    console.error('[approve] unexpected', err);
    return { error: 'Unexpected server error', providerCreated: false, userFound: false };
  }
}

export async function rejectApplicationAction(
  applicationId: string,
): Promise<{ error: string | null }> {
  try {
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

    // Status update first; only log rejected when the transition succeeds.
    const { error: updateError } = await serviceRole
      .from('provider_applications')
      .update({ status: 'rejected' })
      .eq('id', applicationId)
      .eq('status', 'pending')
      .select('id')
      .single();

    if (updateError) {
      console.error('[reject] stage=status_update', updateError.message);
      return { error: updateError.message };
    }

    const { error: auditError } = await supabase.from('admin_audit_log').insert({
      actor_user_id: userId,
      target_type: 'application',
      target_id: applicationId,
      action: 'application.reject',
      metadata: { email: app.email },
    });
    if (auditError) console.error('[reject] stage=audit_insert', auditError.message);

    return { error: null };
  } catch (err) {
    console.error('[reject] unexpected', err);
    return { error: 'Unexpected server error' };
  }
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

export async function toggleFoundingTherapistAction(
  providerId: string,
  isFounder: boolean,
): Promise<{ error: string | null }> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: 'Unauthorized' };
  const { supabase, userId } = ctx;

  const serviceRole = createServiceRoleClient();
  const { error } = await serviceRole
    .from('providers')
    .update({
      is_founding_therapist: isFounder,
      founding_joined_at: isFounder ? new Date().toISOString() : null,
    })
    .eq('id', providerId);

  if (error) return { error: error.message };

  const { error: auditError } = await supabase.from('admin_audit_log').insert({
    actor_user_id: userId,
    target_type: 'provider',
    target_id: providerId,
    action: isFounder ? 'provider.founding_set' : 'provider.founding_removed',
    metadata: { is_founding_therapist: isFounder },
  });
  if (auditError) console.error('[audit] founding toggle failed to log:', auditError.message);

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
    action: 'provider.trust_update',
    metadata: { status: data.status, trust_level: trustLevel },
  });
  if (auditError) console.error('[audit] provider.trust_update failed to log:', auditError.message);

  revalidatePath('/admin/aanbieders');
  return { error: null };
}
