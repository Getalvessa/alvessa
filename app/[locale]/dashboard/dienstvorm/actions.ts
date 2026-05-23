'use server';

import { createClient } from '@/lib/supabase/server';
import type { ServiceMode } from '@/lib/types/service-mode';

export type ServiceModeData = {
  service_mode: ServiceMode;
  mobile_radius_km: number | null;
  mobile_travel_fee_cents: number | null;
  mobile_notes: string;
  studio_city: string;
  studio_postcode: string;
  studio_notes: string;
};

export async function saveServiceModeAction(
  data: ServiceModeData,
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('providers')
    .update({
      service_mode:             data.service_mode,
      mobile_radius_km:         data.service_mode !== 'studio_only' ? data.mobile_radius_km : null,
      mobile_travel_fee_cents:  data.service_mode !== 'studio_only' ? data.mobile_travel_fee_cents : null,
      mobile_notes:             data.service_mode !== 'studio_only' ? data.mobile_notes.trim() || null : null,
      studio_city:              data.service_mode !== 'mobile_only' ? data.studio_city.trim() || null : null,
      studio_postcode:          data.service_mode !== 'mobile_only' ? data.studio_postcode.trim() || null : null,
      studio_notes:             data.service_mode !== 'mobile_only' ? data.studio_notes.trim() || null : null,
    })
    .eq('profile_id', user.id);

  if (error) return { error: error.message };
  return { error: null };
}
