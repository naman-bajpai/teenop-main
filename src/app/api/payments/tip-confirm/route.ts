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
        { success: false, error: "Tip payment not completed" },
        { status: 400 }
      );
    }

    // Verify this is a tip payment
    if (paymentIntent.metadata.type !== 'tip') {
      return NextResponse.json(
        { success: false, error: "Invalid payment type" },
        { status: 400 }
      );
    }

    const bookingId = paymentIntent.metadata.bookingId;
    const providerId = paymentIntent.metadata.providerId;

    if (!bookingId || !providerId) {
      return NextResponse.json(
        { success: false, error: "Invalid payment intent metadata" },
        { status: 400 }
      );
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, user_id")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    // Verify the user is the customer for this booking
    if (booking.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    // Calculate tip amount from payment intent
    const tipAmount = paymentIntent.amount / 100; // Convert from cents

    return NextResponse.json({
      success: true,
      tipAmount: tipAmount,
      paymentIntent: {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        status: paymentIntent.status,
      }
    });

  } catch (error) {
    console.error('Error confirming tip payment:', error);
    return NextResponse.json(
      { success: false, error: "Failed to confirm tip payment" },
      { status: 500 }
    );
  }
}

