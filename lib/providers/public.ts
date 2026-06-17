import 'server-only';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getPublicCitySlugs } from '@/lib/cities';

/**
 * Status values that qualify a provider for public listing.
 * Evaluated server-side via service role — never exposed to anon/authenticated.
 */
export const PUBLIC_PROVIDER_STATUSES = ['new', 'trusted', 'core'] as const;
export type PublicProviderStatus = (typeof PUBLIC_PROVIDER_STATUSES)[number];

type FilterMode = 'all' | 'studio' | 'home';

export async function fetchPublicProviders(mode: FilterMode) {
  // City gate: only providers in publicly-launched cities (status=active &&
  // publicVisible) may surface. Empty allowlist → no public providers, which
  // is the intended state until a city is launched. Prevents supply-test
  // providers in non-public cities from leaking onto /aanbod.
  const publicCities = getPublicCitySlugs();
  if (publicCities.length === 0) return [];

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
    .in('city', publicCities)
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
  // Same city gate as the listing: a provider profile in a non-public city
  // must not be reachable as a public page, even via direct slug URL.
  const publicCities = getPublicCitySlugs();
  if (publicCities.length === 0) return null;

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
    .in('city', publicCities)
    .in('status', [...PUBLIC_PROVIDER_STATUSES])
    .single();

  if (error || !data) return null;
  return data;
}

export async function fetchProviderForBooking(slug: string) {
  // City gate so a non-public-city provider cannot be booked via a direct
  // /aanbod/[slug]/boeken URL. Additive read-only filter — no change to slot
  // validation, pricing, or Stripe logic (those live in boeken/actions.ts).
  const publicCities = getPublicCitySlugs();
  if (publicCities.length === 0) return null;

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
    .in('city', publicCities)
    .in('status', [...PUBLIC_PROVIDER_STATUSES])
    .single();

  return data ?? null;
}
