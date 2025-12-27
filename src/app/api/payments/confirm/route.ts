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

    // Send email to teen provider when parent pays
    try {
      const providerId = bookingData.services?.user_id;
      const { data: providerProfile } = await supabase
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("id", providerId)
        .single();

      if (providerProfile && (providerProfile as any).email) {
        const { emailService } = await import("@/lib/email");
        const serviceTitle = bookingData.services?.title || "Service";
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const formatDate = (dateString: string) => {
          return new Date(dateString).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
        };
        const formatTime = (timeString: string) => {
          const [hours, minutes] = timeString.split(':');
          const hour = parseInt(hours);
          const ampm = hour >= 12 ? 'PM' : 'AM';
          const displayHour = hour % 12 || 12;
          return `${displayHour}:${minutes} ${ampm}`;
        };
        
        await emailService.sendEmail(
          (providerProfile as any).email,
          "You're Booked! Your TeenOp Service Is Scheduled",
          `
            <p>Hello,</p>
            <p>Great news! A community member has scheduled your service, and payment has been completed. Your service is now officially confirmed.</p>
            <p>You can find the details on your <a href="${appUrl}/my-teen-hustle" style="color: #434c9d; text-decoration: underline;">My Teen Hustle page</a> under Scheduled Services or <a href="${appUrl}/my-teen-hustle" style="color: #434c9d; text-decoration: underline;">click here</a>.</p>
            <p>You'll receive an email and text reminder 1 day before and 3 hours before the service.</p>
            <p>After the service is completed, your payment will be processed and sent to you within 1–3 days.</p>
            <p>If you need to reach out to your client, you can message them anytime through <a href="${appUrl}/messages" style="color: #434c9d; text-decoration: underline;">TeenOp Messages</a>.</p>
            <p>Nice work, and good luck with your upcoming service!</p>
            <p>Best,<br>The TeenOp Team</p>
          `
        );
      }
    } catch (emailError) {
      console.error("Error sending email to provider:", emailError);
      // Don't fail the payment confirmation if email fails
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
