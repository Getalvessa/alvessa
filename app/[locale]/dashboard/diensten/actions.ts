'use server';

import { createClient } from '@/lib/supabase/server';

export type ServiceSetting = {
  serviceId: string;
  isEnabled: boolean;
  customPriceCents: number | null;
};

export async function saveServicesAction(
  settings: ServiceSetting[],
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: provider } = await supabase
    .from('providers')
    .select('id')
    .eq('profile_id', user.id)
    .single();

  if (!provider) return { error: 'Provider not found' };

  // Fetch all existing provider_services (including inactive) to decide insert vs update
  const { data: existing } = await supabase
    .from('provider_services')
    .select('id, service_id, is_active')
    .eq('provider_id', provider.id);

  // Re-fetch active service IDs from DB to ignore unknown or inactive submissions
  const { data: activeServices } = await supabase
    .from('services')
    .select('id')
    .eq('is_active', true);

  const activeServiceIds = new Set((activeServices ?? []).map((s) => s.id));

  const existingMap = new Map((existing ?? []).map((r) => [r.service_id, r]));

  for (const s of settings) {
    // Ignore service IDs not present in the active services list
    if (!activeServiceIds.has(s.serviceId)) continue;

    // Validate custom price: must be null or a positive integer in cents (max €9,999.99)
    if (s.customPriceCents !== null) {
      if (!Number.isInteger(s.customPriceCents) || s.customPriceCents <= 0 || s.customPriceCents > 999_999) {
        return { error: `Invalid custom price for service ${s.serviceId}` };
      }
    }

    const current = existingMap.get(s.serviceId);

    if (current) {
      const { error } = await supabase
        .from('provider_services')
        .update({
          is_active:          s.isEnabled,
          custom_price_cents: s.customPriceCents,
        })
        .eq('id', current.id);
      if (error) return { error: error.message };
    } else if (s.isEnabled) {
      const { error } = await supabase
        .from('provider_services')
        .insert({
          provider_id:        provider.id,
          service_id:         s.serviceId,
          is_active:          true,
          custom_price_cents: s.customPriceCents,
        });
      if (error) return { error: error.message };
    }
  }

  return { error: null };
}
