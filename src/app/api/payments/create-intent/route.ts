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

    const { bookingId } = await request.json();

    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: "Booking ID is required" },
        { status: 400 }
      );
    }

    // Get the booking details
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        services (
          title,
          user_id
        ),
        profiles:profiles!bookings_user_id_fkey (
          first_name,
          last_name,
          email
        )
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    // Type assertion for booking data
    const bookingData = booking as any;

    // Verify the user is the customer for this booking
    if (bookingData.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    // Check if booking is completed
    if (bookingData.status !== "completed") {
      return NextResponse.json(
        { success: false, error: "Booking must be completed before payment" },
        { status: 400 }
      );
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(bookingData.total_price * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        bookingId: bookingData.id,
        serviceTitle: bookingData.services?.title || 'Service',
        customerId: user.id,
        providerId: bookingData.services?.user_id,
      },
      description: `Payment for ${bookingData.services?.title || 'Service'}`,
    });

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      amount: bookingData.total_price,
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { success: false, error: "Failed to create payment intent" },
      { status: 500 }
    );
  }
}
