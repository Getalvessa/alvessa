'use server';

import { createClient } from '@/lib/supabase/server';

export type BookingState = {
  error: string | null;
  bookingId?: string;
};

export async function createBooking(
  _prev: BookingState,
  formData: FormData,
): Promise<BookingState> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'loginRequired' };

  const providerId             = formData.get('provider_id')              as string;
  const providerServiceId      = formData.get('provider_service_id')       as string;
  const scheduledAt            = formData.get('scheduled_at')              as string; // ISO UTC
  const durationMinutes        = parseInt(formData.get('duration_minutes') as string, 10);
  const addressLine            = (formData.get('address_line')             as string).trim();
  const addressCity            = (formData.get('address_city')             as string | null) ?? 'Utrecht';
  const addressNotes           = (formData.get('address_notes')            as string | null) || null;
  const totalCents             = parseInt(formData.get('total_cents')      as string, 10);
  const serviceNameNl          = formData.get('service_name_nl')           as string;
  const serviceNameEn          = formData.get('service_name_en')           as string;
  const servicePriceCents      = parseInt(formData.get('service_price_cents') as string, 10);
  const providerDisplayName    = formData.get('provider_display_name')     as string;
  const providerSlug           = formData.get('provider_slug')             as string;

  const { data: booking, error } = await supabase
    .from('bookings')
    .insert({
      customer_id:                        user.id,
      provider_id:                        providerId,
      provider_service_id:                providerServiceId,
      status:                             'pending_payment',
      scheduled_at:                       scheduledAt,
      duration_minutes:                   durationMinutes,
      address_line:                       addressLine,
      address_city:                       addressCity,
      address_notes:                      addressNotes,
      total_cents:                        totalCents,
      platform_fee_cents:                 0,
      service_name_nl_snapshot:           serviceNameNl,
      service_name_en_snapshot:           serviceNameEn,
      service_price_cents_snapshot:       servicePriceCents,
      provider_display_name_snapshot:     providerDisplayName,
      provider_slug_snapshot:             providerSlug,
    })
    .select('id')
    .single();

  if (error) {
    // Exclusion constraint violation = slot already taken
    if (error.code === '23P01') return { error: 'errorSlotTaken' };
    console.error('createBooking error:', error.message);
    return { error: 'errorGeneric' };
  }

  return { error: null, bookingId: booking.id };
}
