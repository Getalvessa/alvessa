import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { createStripeClient } from '@/lib/stripe';
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  sendCustomerConfirmation,
  sendProviderNotification,
} from '@/lib/email';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig  = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripeClient = createStripeClient();
    event = stripeClient.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('Stripe webhook signature failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session  = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.booking_id;

    if (!bookingId) {
      console.error('Webhook: missing booking_id in session metadata');
      return NextResponse.json({ error: 'Missing booking_id' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // ── Idempotency guard ─────────────────────────────────────────────────────
    // Stripe retries on 5xx or timeout. If a payment row already carries this
    // event ID, the event was fully processed — return 200 immediately.
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('stripe_event_id', event.id)
      .maybeSingle();

    if (existingPayment) {
      return NextResponse.json({ received: true });
    }

    // ── Confirm the booking ───────────────────────────────────────────────────
    const { error: bookingError } = await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', bookingId)
      .eq('status', 'pending_payment');

    if (bookingError) {
      if (bookingError.code === '23P01') {
        // Exclusion constraint: a concurrent booking was confirmed first (race condition).
        // This customer has paid but the slot is no longer available.
        // Cancel the booking and record the payment so an admin can issue the refund
        // via the Stripe dashboard using the stripe_payment_intent_id below.
        await supabase
          .from('bookings')
          .update({
            status:              'cancelled',
            cancelled_by:        'admin',
            cancelled_at:        new Date().toISOString(),
            cancellation_reason: 'slot_conflict_requires_refund',
          })
          .eq('id', bookingId)
          .eq('status', 'pending_payment');

        const { error: conflictPaymentError } = await supabase.from('payments').insert({
          booking_id:               bookingId,
          stripe_payment_intent_id: session.payment_intent as string,
          stripe_event_id:          event.id,
          status:                   'paid',
          amount_cents:             session.amount_total ?? 0,
          platform_fee_cents:       0,
          provider_amount_cents:    0, // No payout — full amount must be refunded to customer
        });

        console.error('[webhook] SLOT_CONFLICT_REQUIRES_MANUAL_REFUND', JSON.stringify({
          booking_id:               bookingId,
          stripe_session_id:        session.id,
          stripe_payment_intent_id: session.payment_intent,
          amount_cents:             session.amount_total,
          payment_insert_error:     conflictPaymentError?.message ?? null,
        }));

        // Return 200 — slot conflict is a business error, not a transient server error.
        // Returning 200 prevents Stripe from retrying, which would be futile.
        return NextResponse.json({ received: true });
      }

      console.error('Webhook: failed to confirm booking:', bookingError.message);
      return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
    }

    // ── Record the payment ────────────────────────────────────────────────────
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        booking_id:               bookingId,
        stripe_payment_intent_id: session.payment_intent as string,
        stripe_event_id:          event.id,
        status:                   'paid',
        amount_cents:             session.amount_total ?? 0,
        platform_fee_cents:       0,
        provider_amount_cents:    session.amount_total ?? 0,
      });

    if (paymentError) {
      console.error('Webhook: failed to insert payment record:', paymentError.message);
      return NextResponse.json({ error: 'Payment record failed' }, { status: 500 });
    }

    // ── Send email notifications ──────────────────────────────────────────────
    // Runs after DB is settled. Failures are caught and logged — they must not
    // cause a 5xx response that would trigger a Stripe retry.
    try {
      const { data: booking } = await supabase
        .from('bookings')
        .select(`customer_id, provider_id, service_name_nl_snapshot, scheduled_at,
                 duration_minutes, address_line, address_city, address_notes,
                 appointment_type, total_cents, provider_display_name_snapshot`)
        .eq('id', bookingId)
        .single();

      if (!booking) throw new Error('booking row not found for emails');

      const [
        { data: customerProfile },
        { data: { user: customerUser }, error: customerAuthError },
        { data: providerRecord },
      ] = await Promise.all([
        supabase.from('profiles').select('display_name, phone').eq('id', booking.customer_id).single(),
        supabase.auth.admin.getUserById(booking.customer_id),
        supabase.from('providers').select('profile_id').eq('id', booking.provider_id).single(),
      ]);

      if (customerAuthError) throw customerAuthError;

      const { data: { user: providerUser }, error: providerAuthError } =
        await supabase.auth.admin.getUserById(providerRecord!.profile_id);

      if (providerAuthError) throw providerAuthError;

      const customerEmail = customerUser?.email;
      const providerEmail = providerUser?.email;

      const emailBase = {
        serviceName:     booking.service_name_nl_snapshot,
        scheduledAt:     booking.scheduled_at,
        durationMinutes: booking.duration_minutes,
        appointmentType: booking.appointment_type,
        addressLine:     booking.address_line,
        addressCity:     booking.address_city,
        totalCents:      booking.total_cents,
        bookingId,
      };

      const sends: Promise<void>[] = [];

      if (customerEmail) {
        sends.push(
          sendCustomerConfirmation({
            ...emailBase,
            toEmail:      customerEmail,
            customerName: customerProfile?.display_name ?? 'Klant',
            providerName: booking.provider_display_name_snapshot,
          }),
        );
      }

      if (providerEmail) {
        sends.push(
          sendProviderNotification({
            ...emailBase,
            toEmail:       providerEmail,
            providerName:  booking.provider_display_name_snapshot,
            customerName:  customerProfile?.display_name ?? 'Klant',
            customerEmail: customerEmail ?? '(niet beschikbaar)',
            customerPhone: customerProfile?.phone ?? null,
            addressNotes:  booking.address_notes,
          }),
        );
      }

      const results = await Promise.allSettled(sends);
      results.forEach((r) => {
        if (r.status === 'rejected') {
          // Log the error message only — no personal data (email addresses, names)
          console.error('[webhook] email send failed:', {
            booking_id: bookingId,
            error: r.reason instanceof Error ? r.reason.message : 'unknown',
          });
        }
      });
    } catch (emailSetupErr) {
      console.error('[webhook] email setup failed:', {
        booking_id: bookingId,
        error: emailSetupErr instanceof Error ? emailSetupErr.message : 'unknown',
      });
    }
  } else if (event.type === 'checkout.session.expired') {
    const session  = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.booking_id;

    if (!bookingId) {
      console.warn('[webhook] checkout.session.expired: missing booking_id in metadata', { stripe_event_id: event.id });
      return NextResponse.json({ received: true });
    }

    const supabase = createServiceRoleClient();

    // Only update bookings still in pending_payment — this makes the update idempotent.
    // A booking already in payment_failed, confirmed, or cancelled is left untouched.
    const { error: expiredError } = await supabase
      .from('bookings')
      .update({ status: 'payment_failed' })
      .eq('id', bookingId)
      .eq('status', 'pending_payment');

    if (expiredError) {
      console.error('[webhook] checkout.session.expired: failed to update booking:', {
        booking_id:     bookingId,
        stripe_event_id: event.id,
        error:          expiredError.message,
      });
      return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
