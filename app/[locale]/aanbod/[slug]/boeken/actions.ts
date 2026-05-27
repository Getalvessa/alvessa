'use server';

import { headers } from 'next/headers';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { createStripeClient } from '@/lib/stripe';

export type BookingState = {
  error: string | null;
  bookingId?: string;
  checkoutUrl?: string;
};

// Constants mirror availability/route.ts so both paths enforce the same rules.
const TZ_OFFSET_H       = 2;   // Amsterdam CEST (UTC+2)
const SLOT_INTERVAL_MIN = 30;
const MIN_ADVANCE_MS    = 2 * 3_600_000;         // 2 h — matches the availability API buffer
const MAX_ADVANCE_DAYS  = 60;

function validateScheduledAt(scheduledAt: string): string | null {
  const d   = new Date(scheduledAt);
  const now = Date.now();
  if (isNaN(d.getTime()))                                                          return 'errorGeneric';
  if (d.getTime() < now + MIN_ADVANCE_MS)                                          return 'errorSlotTaken';
  if (d.getTime() > now + MAX_ADVANCE_DAYS * 86_400_000)                           return 'errorGeneric';
  if (d.getUTCMinutes() % SLOT_INTERVAL_MIN !== 0 || d.getUTCSeconds() !== 0)     return 'errorGeneric';
  return null;
}

export async function createBooking(
  _prev: BookingState,
  formData: FormData,
): Promise<BookingState> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'loginRequired' };

  // Only trust user-selection inputs from the client — never trust price, duration, or snapshots
  const providerServiceId = formData.get('provider_service_id') as string;
  const scheduledAt       = formData.get('scheduled_at')        as string;
  const appointmentType   = (formData.get('appointment_type')   as string) || 'at_home';
  const rawAddressLine    = (formData.get('address_line')       as string | null) ?? '';
  const addressLine       = rawAddressLine.trim() || null;
  const addressCity       = (formData.get('address_city')       as string | null) ?? 'Utrecht';
  const addressNotes      = (formData.get('address_notes')      as string | null) || null;
  const locale            = (formData.get('locale')             as string) || 'nl';

  // 1. Fetch authoritative service data from the database
  const { data: ps, error: psError } = await supabase
    .from('provider_services')
    .select('id, provider_id, custom_price_cents, is_active, services ( id, name_nl, name_en, duration_minutes, base_price_cents )')
    .eq('id', providerServiceId)
    .single();

  if (psError || !ps) {
    console.error('[createBooking] provider_service lookup failed:', psError);
    return { error: 'errorGeneric' };
  }
  if (!ps.is_active || !ps.services) return { error: 'errorGeneric' };

  // 2. Fetch authoritative provider data to verify active + verified status
  const { data: provider, error: providerError } = await supabase
    .from('providers')
    .select('id, slug, is_active, is_verified, profiles ( display_name )')
    .eq('id', ps.provider_id)
    .single();

  if (providerError || !provider) {
    console.error('[createBooking] provider lookup failed:', providerError);
    return { error: 'errorGeneric' };
  }
  if (!provider.is_active || !provider.is_verified) return { error: 'errorGeneric' };

  // All financial and snapshot values come exclusively from the database
  const priceCents          = ps.custom_price_cents ?? ps.services.base_price_cents;
  const durationMinutes     = ps.services.duration_minutes;
  const serviceNameNl       = ps.services.name_nl;
  const serviceNameEn       = ps.services.name_en;
  const providerId          = ps.provider_id;
  const providerSlug        = provider.slug;
  const providerDisplayName = (provider.profiles as { display_name: string } | null)?.display_name ?? providerSlug;

  // 3. Server-side scheduled_at validation
  //    Layer A — pure checks (no DB): valid date, not past, not too far, on 30-min grid
  const scheduleError = validateScheduledAt(scheduledAt);
  if (scheduleError) return { error: scheduleError };

  //    Layer B — provider availability window: schedule + exceptions
  {
    const slotUTC    = new Date(scheduledAt);
    const localHours = (slotUTC.getUTCHours() + TZ_OFFSET_H) % 24;
    const localMin   = localHours * 60 + slotUTC.getUTCMinutes();
    // Shift the UTC instant to Amsterdam local time and read off the date string
    const localDate  = new Date(slotUTC.getTime() + TZ_OFFSET_H * 3_600_000);
    const dateStr    = localDate.toISOString().slice(0, 10);          // YYYY-MM-DD (Amsterdam)
    const dayOfWeek  = new Date(`${dateStr}T12:00:00Z`).getUTCDay(); // 0=Sun … 6=Sat

    const { data: exc } = await supabase
      .from('availability_exceptions')
      .select('is_blocked, start_time, end_time')
      .eq('provider_id', providerId)
      .eq('exception_date', dateStr)
      .maybeSingle();

    if (exc?.is_blocked) return { error: 'errorSlotTaken' };

    const { data: sched } = await supabase
      .from('availability_schedules')
      .select('start_time, end_time')
      .eq('provider_id', providerId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true)
      .maybeSingle();

    if (!sched) return { error: 'errorSlotTaken' };

    const [wsh, wsm] = (exc?.start_time ?? sched.start_time).slice(0, 5).split(':').map(Number);
    const [weh, wem] = (exc?.end_time   ?? sched.end_time  ).slice(0, 5).split(':').map(Number);
    const windowStart = wsh * 60 + wsm;
    const windowEnd   = weh * 60 + wem;

    // Slot must start within the window AND finish by the window end
    if (localMin < windowStart || localMin + durationMinutes > windowEnd) {
      return { error: 'errorSlotTaken' };
    }
  }

  // 4. Pre-checkout slot conflict guard
  // Uses service_role so it sees ALL confirmed bookings, not just the current user's
  // (the user-scoped client is limited by RLS to their own rows).
  // Overlap condition: existing.scheduled_at < requestedEnd AND existing.end_at > requestedStart
  const requestedEndAt = new Date(new Date(scheduledAt).getTime() + durationMinutes * 60_000).toISOString();
  const srClient = createServiceRoleClient();
  const { data: slotConflict } = await srClient
    .from('bookings')
    .select('id')
    .eq('provider_id', providerId)
    .eq('status', 'confirmed')
    .lt('scheduled_at', requestedEndAt)
    .gt('end_at', scheduledAt)
    .limit(1);

  if (slotConflict && slotConflict.length > 0) {
    return { error: 'errorSlotTaken' };
  }

  // 4. Create booking record using only server-derived values for financial fields.
  // Uses service_role so that the authenticated INSERT policy is NOT required.
  // Removing the INSERT policy for authenticated users prevents clients from forging
  // bookings directly against the Supabase REST API, bypassing this server action.
  const { data: booking, error: dbError } = await createServiceRoleClient()
    .from('bookings')
    .insert({
      customer_id:                    user.id,
      provider_id:                    providerId,
      provider_service_id:            providerServiceId,
      status:                         'pending_payment',
      scheduled_at:                   scheduledAt,
      duration_minutes:               durationMinutes,
      appointment_type:               appointmentType,
      address_line:                   addressLine,
      address_city:                   addressCity,
      address_notes:                  addressNotes,
      total_cents:                    priceCents,
      platform_fee_cents:             0,
      service_name_nl_snapshot:       serviceNameNl,
      service_name_en_snapshot:       serviceNameEn,
      service_price_cents_snapshot:   priceCents,
      provider_display_name_snapshot: providerDisplayName,
      provider_slug_snapshot:         providerSlug,
    })
    .select('id')
    .single();

  if (dbError) {
    if (dbError.code === '23P01') return { error: 'errorSlotTaken' };
    console.error('[createBooking] DB insert failed:', JSON.stringify({
      code: dbError.code, message: dbError.message, details: dbError.details, hint: dbError.hint,
    }));
    return { error: 'errorGeneric' };
  }

  // 5. Derive base URL from request headers
  const headersList = await headers();
  const host  = headersList.get('host') ?? 'localhost:3000';
  const proto = headersList.get('x-forwarded-proto') ?? 'http';
  const base  = `${proto}://${host}`;
  const localePath = locale === 'nl' ? '' : `/${locale}`;

  // 6. Create Stripe Checkout Session — amount is always server-derived
  const stripeClient = createStripeClient();
  const serviceName  = locale === 'nl' ? serviceNameNl : serviceNameEn;

  let session: Awaited<ReturnType<typeof stripeClient.checkout.sessions.create>>;
  try {
    session = await stripeClient.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card', 'ideal'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            unit_amount: priceCents,
            product_data: {
              name: `${serviceName} — ${providerDisplayName}`,
              description: `${durationMinutes} min · ${addressCity}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata:            { booking_id: booking.id },
      client_reference_id: booking.id,
      success_url: `${base}${localePath}/boeken/succes?session_id={CHECKOUT_SESSION_ID}&booking_id=${booking.id}`,
      cancel_url:  `${base}${localePath}/aanbod/${providerSlug}/boeken?cancelled=true`,
    });
  } catch (stripeErr) {
    console.error('[createBooking] Stripe session creation failed:', stripeErr);
    return { error: 'errorGeneric' };
  }

  if (!session.url) {
    console.error('[createBooking] Stripe session missing URL, session id:', session.id);
    return { error: 'errorGeneric' };
  }

  return { error: null, bookingId: booking.id, checkoutUrl: session.url };
}
