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
      .eq("user_id", user.id) // Ensure user owns this booking
      .select()
      .single();

    if (updateError) {
      console.error('Error updating booking:', updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update booking status" },
        { status: 500 }
      );
    }

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
