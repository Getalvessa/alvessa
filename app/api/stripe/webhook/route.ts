import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { createStripeClient } from '@/lib/stripe';
import { createServiceRoleClient } from '@/lib/supabase/server';

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

    // Confirm the booking
    const { error: bookingError } = await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', bookingId)
      .eq('status', 'pending_payment');

    if (bookingError) {
      console.error('Webhook: failed to confirm booking:', bookingError.message);
      return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
    }

    // Record the payment
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        booking_id:               bookingId,
        stripe_payment_intent_id: session.payment_intent as string,
        status:                   'paid',
        amount_cents:             session.amount_total ?? 0,
        platform_fee_cents:       0,
        provider_amount_cents:    session.amount_total ?? 0,
      });

    if (paymentError) {
      // Booking is already confirmed — log but don't fail the webhook
      console.error('Webhook: failed to insert payment record:', paymentError.message);
    }
  }

  return NextResponse.json({ received: true });
}
