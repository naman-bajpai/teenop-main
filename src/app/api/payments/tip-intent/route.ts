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

    const { bookingId, tipAmount } = await request.json();

    if (!bookingId || !tipAmount) {
      return NextResponse.json(
        { success: false, error: "Booking ID and tip amount are required" },
        { status: 400 }
      );
    }

    if (tipAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "Tip amount must be greater than 0" },
        { status: 400 }
      );
    }

    // Get the booking details
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        services (
          id,
          title,
          user_id
        ),
        profiles:profiles!bookings_user_id_fkey (
          id,
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
        { success: false, error: "Booking must be completed before you can tip" },
        { status: 400 }
      );
    }

    // Get the provider's profile to check for Stripe Connect account
    const providerId = bookingData.services?.user_id;
    if (!providerId) {
      return NextResponse.json(
        { success: false, error: "Service provider not found" },
        { status: 404 }
      );
    }

    const { data: providerProfile, error: providerError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, stripe_connect_account_id")
      .eq("id", providerId)
      .single();

    if (providerError || !providerProfile) {
      return NextResponse.json(
        { success: false, error: "Provider profile not found" },
        { status: 404 }
      );
    }

    const provider = providerProfile as any;

    // Create payment intent for tip
    // If provider has Stripe Connect, we'll transfer to them with platform fee
    // Otherwise, we'll charge directly (provider can set up Connect later)
    const platformFeePercent = 0.0; // 10% platform fee on tips
    const platformFee = Math.round(tipAmount * platformFeePercent * 100); // in cents
    const tipAmountCents = Math.round(tipAmount * 100);

    const paymentIntentParams: any = {
      amount: tipAmountCents,
      currency: 'usd',
      metadata: {
        type: 'tip',
        bookingId: bookingData.id,
        serviceTitle: bookingData.services?.title || 'Service',
        customerId: user.id,
        providerId: providerId,
      },
      description: `Tip for ${bookingData.services?.title || 'Service'}`,
    };

    // If provider has Stripe Connect account, transfer directly to them
    if (provider.stripe_connect_account_id) {
      paymentIntentParams.transfer_data = {
        destination: provider.stripe_connect_account_id,
      };
      // Application fee is the platform fee
      paymentIntentParams.application_fee_amount = platformFee;
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      amount: tipAmount,
      platformFee: platformFee / 100,
    });

  } catch (error) {
    console.error('Error creating tip payment intent:', error);
    return NextResponse.json(
      { success: false, error: "Failed to create tip payment intent" },
      { status: 500 }
    );
  }
}

