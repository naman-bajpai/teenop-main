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
                user_id,
                title
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

          // Earnings will be created when booking status is updated to "completed"
          // No earnings are created at "paid" status

          // Send email to teen provider when parent pays
          try {
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
            console.error("Error sending email to provider via webhook:", emailError);
            // Don't fail the webhook if email fails
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
