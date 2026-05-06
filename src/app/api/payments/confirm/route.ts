import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { paymentIntentId } = await request.json();

    if (!paymentIntentId) {
      return NextResponse.json(
        { success: false, error: "Payment intent ID is required" },
        { status: 400 }
      );
    }

    // Retrieve the payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { success: false, error: "Payment not completed" },
        { status: 400 }
      );
    }

    const bookingId = paymentIntent.metadata.bookingId;

    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: "Invalid payment intent" },
        { status: 400 }
      );
    }

    // Get booking details to find the service provider
    const { data: booking, error: bookingFetchError } = await (supabase as any)
      .from("bookings")
      .select(`
        *,
        services (
          user_id
        )
      `)
      .eq("id", bookingId)
      .single();

    if (bookingFetchError || !booking) {
      console.error('Error fetching booking:', bookingFetchError);
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    const bookingData = booking as any;

    // Verify the user is the customer for this booking
    if (bookingData.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    // Update booking status to paid
    const { data: updatedBooking, error: updateError } = await (supabase as any)
      .from("bookings")
      .update({
        status: "paid",
        payment_intent_id: paymentIntentId,
        payment_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", bookingId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating booking:', updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update booking status" },
        { status: 500 }
      );
    }

    // Earnings will be created when booking status is updated to "completed"
    // No earnings are created at "paid" status
    // NOTE: Payment confirmation emails are sent exclusively via the Stripe webhook
    // (payment_intent.succeeded) to avoid duplicate sends from this route + webhook.

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
      paymentIntent: {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        status: paymentIntent.status,
      }
    });

  } catch (error) {
    console.error('Error confirming payment:', error);
    return NextResponse.json(
      { success: false, error: "Failed to confirm payment" },
      { status: 500 }
    );
  }
}
