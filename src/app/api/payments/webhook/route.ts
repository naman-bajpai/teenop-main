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

          // Idempotency guard: Stripe delivers webhooks at-least-once.
          // If the booking is already "paid" this is a duplicate delivery — update
          // the DB (safe/idempotent) but skip sending emails a second time.
          const alreadyPaid = bookingData.status === 'paid';

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

          if (alreadyPaid) {
            console.log(`Webhook duplicate for booking ${bookingId} — already paid, skipping emails.`);
            break;
          }

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
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <meta charset="utf-8">
                    <title>Service Scheduled</title>
                    <style>
                      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                      .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
                      .content { background: white; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px; }
                      .booking-details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
                      .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; font-size: 14px; color: #666; }
                      .button { display: inline-block; background: #434c9d; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <div class="header">
                        <h1>You're Booked! Your TeenOp Service Is Scheduled</h1>
                        <p>Great news! A community member has scheduled your service, and payment has been completed.</p>
                      </div>
                      
                      <div class="content">
                        <div class="booking-details">
                          <h3>Booking Details</h3>
                          <p><strong>Service:</strong> ${serviceTitle}</p>
                          <p><strong>Status:</strong> Confirmed and Paid</p>
                        </div>

                        <h3>What's next?</h3>
                        <ul>
                          <li>You can find all the details on your <a href="${appUrl}/my-teen-hustle" style="color: #434c9d; text-decoration: underline;">Booking Dashboard</a> under Scheduled Services.</li>
                          <li>You'll receive an email and text reminder 1 day before and 3 hours before the service.</li>
                          <li>After the service is completed, your payment will be processed and sent to you within 1–3 days.</li>
                          <li>If you need to reach out to your client, you can message them anytime through <a href="${appUrl}/messages" style="color: #434c9d; text-decoration: underline;">TeenOp Messages</a>.</li>
                        </ul>

                        <p><strong>Important:</strong> Your service is now officially confirmed. Make sure you're prepared and ready for the scheduled time.</p>
                        
                  <p>Nice work, and good luck with your upcoming service!</p>
                      </div>

                      <div class="footer">
                  <p>Best,<br>The TeenOp Team</p>
                        <p>teenop.co@gmail.com | www.teenop.com</p>
                      </div>
                    </div>
                  </body>
                  </html>
                `
              );
            }
          } catch (emailError) {
            console.error("Error sending email to provider via webhook:", emailError);
            // Don't fail the webhook if email fails
          }

          // Send confirmation email to parent/customer when payment succeeds
          try {
            const { data: customerProfile } = await supabase
              .from("profiles")
              .select("first_name, email")
              .eq("id", bookingData.user_id)
              .single();

            const customerEmail = (customerProfile as any)?.email || null;
            if (customerEmail) {
              const { emailService } = await import("@/lib/email");
              const customerName = (customerProfile as any)?.first_name || "there";
              await emailService.sendBuyerPaymentConfirmed({
                buyerName: customerName,
                buyerEmail: customerEmail,
              });
            }
          } catch (parentEmailError) {
            console.error("Error sending payment confirmation email to parent via webhook:", parentEmailError);
            // Don't fail webhook if parent email fails
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
