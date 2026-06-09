import 'server-only';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Status values that qualify a provider for public listing.
 * Evaluated server-side via service role — never exposed to anon/authenticated.
 */
export const PUBLIC_PROVIDER_STATUSES = ['new', 'trusted', 'core'] as const;
export type PublicProviderStatus = (typeof PUBLIC_PROVIDER_STATUSES)[number];

type FilterMode = 'all' | 'studio' | 'home';

export async function fetchPublicProviders(mode: FilterMode) {
  const srClient = createServiceRoleClient();

  let query = srClient
    .from('providers')
    .select(`
      id, slug, bio, city, avg_rating, total_reviews, service_area_km,
      service_mode, is_founding_therapist,
      profiles ( display_name, avatar_url ),
      provider_services ( custom_price_cents, is_active, services ( base_price_cents ) )
    `)
    .eq('is_active', true)
    .eq('is_verified', true)
    .in('status', [...PUBLIC_PROVIDER_STATUSES]);

  if (mode === 'studio') {
    query = query.in('service_mode', ['studio_only', 'hybrid']);
  } else if (mode === 'home') {
    query = query.in('service_mode', ['mobile_only', 'hybrid']);
  }

  const { data, error } = await query
    .order('avg_rating', { ascending: false, nullsFirst: false })
    .order('total_reviews', { ascending: false });

  if (error) {
    console.error('[fetchPublicProviders] failed:', error.message);
    return [];
  }
  return data ?? [];
}

export async function fetchPublicProviderBySlug(slug: string) {
  const { data, error } = await createServiceRoleClient()
    .from('providers')
    .select(`
      id, slug, bio, city, avg_rating, total_reviews, certifications,
      is_founding_therapist,
      service_mode, mobile_radius_km, mobile_travel_fee_cents, mobile_notes,
      studio_city, studio_postcode, studio_notes,
      profiles ( display_name, avatar_url ),
      provider_services (
        id, custom_price_cents, is_active,
        services ( id, name_nl, name_en, description_nl, description_en, duration_minutes, base_price_cents )
      )
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .eq('is_verified', true)
    .in('status', [...PUBLIC_PROVIDER_STATUSES])
    .single();

  if (error || !data) return null;
  return data;
}

export async function fetchProviderForBooking(slug: string) {
  const { data } = await createServiceRoleClient()
    .from('providers')
    .select(`
      id, slug, city,
      service_mode, mobile_radius_km, mobile_travel_fee_cents, mobile_notes,
      studio_city, studio_postcode, studio_notes,
      profiles ( display_name ),
      provider_services ( id, custom_price_cents, is_active,
        services ( id, name_nl, name_en, duration_minutes, base_price_cents )
      )
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .eq('is_verified', true)
    .in('status', [...PUBLIC_PROVIDER_STATUSES])
    .single();

  return data ?? null;
}
