import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'Missing signature or webhook secret' },
      { status: 400 }
    );
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  try {
    const supabase = await createServerClient();

    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        const bookingId = paymentIntent.metadata.bookingId;

        if (bookingId) {
          // Get booking details to find the service provider
          const { data: booking, error: bookingError } = await (supabase as any)
            .from("bookings")
            .select(`
              *,
              services (
                user_id
              )
            `)
            .eq("id", bookingId)
            .single();

          if (bookingError || !booking) {
            console.error(`Error fetching booking ${bookingId}:`, bookingError);
            break;
          }

          const bookingData = booking as any;
          const providerId = bookingData.services?.user_id;

          // Update booking status to paid
          await (supabase as any)
            .from("bookings")
            .update({
              status: "paid",
              payment_intent_id: paymentIntent.id,
              payment_completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq("id", bookingId);

          // Create earnings record for the service provider with status "pending" (available balance)
          if (providerId && bookingData.service_price) {
            // Check if earnings already exists for this booking
            const { data: existingEarnings } = await (supabase as any)
              .from("earnings")
              .select("id")
              .eq("booking_id", bookingId)
              .single();

            if (!existingEarnings) {
              const { error: earningsError } = await (supabase as any)
                .from("earnings")
                .insert({
                  user_id: providerId,
                  booking_id: bookingId,
                  amount: bookingData.service_price,
                  status: 'pending', // Available balance - not yet withdrawn
                  earned_at: new Date().toISOString()
                });

              if (earningsError) {
                console.error(`Error creating earnings for booking ${bookingId}:`, earningsError);
              } else {
                console.log(`Created pending earnings for provider ${providerId} from booking ${bookingId}`);
              }
            }
          }

          console.log(`Payment succeeded for booking ${bookingId}`);
        }
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        const failedBookingId = failedPayment.metadata.bookingId;

        if (failedBookingId) {
          // Log the failed payment
          console.log(`Payment failed for booking ${failedBookingId}`);
          
          // You might want to update the booking status or send notifications
          // For now, we'll just log it
        }
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
