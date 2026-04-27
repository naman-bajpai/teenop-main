import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

// GET specific booking details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    console.log("API Route GET - Auth Error:", authError);
    console.log("API Route GET - User:", user);
    console.log("API Route GET - User ID:", user?.id);

    if (authError || !user) {
      console.log("API Route GET - Authentication failed");
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id: bookingId } = await params;
    console.log("API Route GET - Booking ID:", bookingId);

    // Get booking with full details including customer and service provider info
    console.log("API Route GET - Querying database for booking:", bookingId);

    // First, let's check what bookings this user has access to
    console.log("API Route GET - Checking user's bookings...");

    // Check bookings where user is the customer
    const { data: customerBookings, error: customerError } = await supabase
      .from("bookings")
      .select("id, service_id, user_id")
      .eq("user_id" as any, user.id as any);

    console.log("API Route GET - Customer bookings:", customerBookings);

    // Check bookings where user is the service provider
    const { data: userServices, error: servicesError } = await supabase
      .from("services")
      .select("id")
      .eq("user_id" as any, user.id as any);

    console.log("API Route GET - User services:", userServices);

    let providerBookings: any[] = [];
    if (userServices && userServices.length > 0) {
      const serviceIds = userServices.map((s: any) => s.id);
      const { data: providerBookingsData, error: providerError } = await supabase
        .from("bookings")
        .select("id, service_id, user_id")
        .in("service_id" as any, serviceIds);

      providerBookings = providerBookingsData || [];
      console.log("API Route GET - Provider bookings:", providerBookings);
    }

    // Check if the requested booking ID is in the user's accessible bookings
    const allUserBookings = [...(customerBookings || []), ...providerBookings];
    const hasAccess = allUserBookings.some(b => b.id === bookingId);
    console.log("API Route GET - User has access to booking:", hasAccess);
    console.log("API Route GET - All accessible booking IDs:", allUserBookings.map(b => b.id));

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        services (
          id,
          title,
          description,
          price,
          pricing_model,
          location,
          category,
          duration,
          user_id,
          profiles:profiles!services_user_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            avatar_url
          )
        ),
        profiles:profiles!bookings_user_id_fkey (
          id,
          first_name,
          last_name,
          email,
          phone,
          avatar_url
        )
      `)
      .eq("id" as any, bookingId as any)
      .single();

    console.log("API Route GET - Database query result:");
    console.log("  - Booking data:", booking);
    console.log("  - Booking error:", bookingError);

    if (bookingError || !booking) {
      console.log("API Route GET - Booking not found or error occurred");
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    // Type assertion for booking data
    const bookingData = booking as any;

    // Check if user has permission to view this booking
    // User can view if they are either the customer or the service provider
    const isCustomer = bookingData.user_id === user.id;
    const isProvider = bookingData.services?.user_id === user.id;

    if (!isCustomer && !isProvider) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: bookingData.id,
        service_id: bookingData.service_id,
        user_id: bookingData.user_id,
        status: bookingData.status,
        requested_date: bookingData.requested_date,
        requested_time: bookingData.requested_time,
        duration: bookingData.duration,
        total_price: bookingData.total_price,
        special_instructions: bookingData.special_instructions,
        created_at: bookingData.created_at,
        updated_at: bookingData.updated_at,
        service: bookingData.services,
        customer: bookingData.profiles,
        provider: bookingData.services?.profiles
      }
    });

  } catch (error) {
    console.error("Unexpected error in fetching booking details:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH to update booking status (accept/decline)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: bookingId } = await params;
    const body = await request.json();
    const { status, alternative_date, alternative_time, requested_date, requested_time } = body;

    // Debug log
    console.log("Booking update request:", {
      bookingId,
      status,
      alternative_date,
      alternative_time,
      body
    });

    // Validate status
    if (!status || !["confirmed", "rejected", "completed", "paid", "cancelled", "alternative_proposed"].includes(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid status" },
        { status: 400 }
      );
    }

    // If proposing alternative time, validate the fields
    if (status === "alternative_proposed") {
      if (!alternative_date || !alternative_time) {
        return NextResponse.json(
          { success: false, error: "Alternative date and time are required" },
          { status: 400 }
        );
      }
    }

    // Get the booking to check permissions
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        services (
          user_id
        )
      `)
      .eq("id" as any, bookingId as any)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    // Type assertion for booking data
    const bookingData = booking as any;

    // Check permissions based on status change
    if (status === "alternative_proposed") {
      // Only service provider can propose alternative times
      console.log("Permission check for alternative_proposed:", {
        status,
        bookingServiceUserId: bookingData.services?.user_id,
        currentUserId: user.id,
        isProvider: bookingData.services?.user_id === user.id
      });

      if (bookingData.services?.user_id !== user.id) {
        return NextResponse.json(
          { success: false, error: "Only service provider can propose alternative times" },
          { status: 403 }
        );
      }
    } else if (status === "confirmed") {
      // Service provider can confirm initially, customer can confirm when accepting alternative time
      const isProvider = bookingData.services?.user_id === user.id;
      const isCustomer = bookingData.user_id === user.id;
      const isAcceptingAlternative = bookingData.status === "alternative_proposed" && requested_date && requested_time;

      console.log("Permission check for confirmed:", {
        status,
        bookingServiceUserId: bookingData.services?.user_id,
        bookingUserId: bookingData.user_id,
        currentUserId: user.id,
        isProvider,
        isCustomer,
        isAcceptingAlternative,
        currentStatus: bookingData.status,
        requested_date,
        requested_time,
        hasRequestedDate: !!requested_date,
        hasRequestedTime: !!requested_time
      });

      // Allow if: (1) provider confirming initially, OR (2) customer accepting alternative time
      if (isProvider) {
        // Provider can always confirm
        console.log("Permission granted: Provider confirming booking");
      } else if (isCustomer && isAcceptingAlternative) {
        // Customer can confirm when accepting alternative time
        console.log("Permission granted: Customer accepting alternative time");
      } else {
        // Deny access
        console.log("Permission denied: Not provider and not customer accepting alternative");
        return NextResponse.json(
          { success: false, error: "Only service provider can confirm bookings, or customer can accept alternative times" },
          { status: 403 }
        );
      }
    } else if (status === "rejected") {
      // Only service provider can reject
      if (bookingData.services?.user_id !== user.id) {
        return NextResponse.json(
          { success: false, error: "Only service provider can reject bookings" },
          { status: 403 }
        );
      }
    } else if (status === "cancelled") {
      // Either customer or provider can cancel (including confirmed and paid bookings)
      const isCustomer = bookingData.user_id === user.id;
      const isProvider = bookingData.services?.user_id === user.id;

      if (!isCustomer && !isProvider) {
        return NextResponse.json(
          { success: false, error: "Access denied" },
          { status: 403 }
        );
      }

      // Send cancellation email notifications
      try {
        const { data: customerProfile } = await supabase
          .from("profiles")
          .select("first_name, last_name, email")
          .eq("id", bookingData.user_id)
          .single();

        const { data: providerProfile } = await supabase
          .from("profiles")
          .select("first_name, last_name, email")
          .eq("id", bookingData.services?.user_id)
          .single();

        const { emailService } = await import("@/lib/email");
        const serviceTitle = bookingData.services?.title || "Service";
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

        // Notify the other party
        if (isCustomer && providerProfile && (providerProfile as any).email) {
          // Customer cancelled, notify provider
          await emailService.sendEmail(
            (providerProfile as any).email,
            "Service Cancellation Notice",
            `
              <h2>Service Cancellation</h2>
              <p>The customer has cancelled the booking for: <strong>${serviceTitle}</strong></p>
              <p>If you have any questions, please contact TeenOp support.</p>
              <p>Best,<br>The TeenOp Team</p>
            `
          );
        } else if (isProvider && customerProfile && (customerProfile as any).email) {
          // Provider cancelled, notify customer
          await emailService.sendEmail(
            (customerProfile as any).email,
            "Service Cancellation Notice",
            `
              <h2>Service Cancellation</h2>
              <p>The service provider has cancelled the booking for: <strong>${serviceTitle}</strong></p>
              <p>If you have any questions or need assistance, please contact TeenOp support.</p>
              <p>Best,<br>The TeenOp Team</p>
            `
          );
        }
      } catch (emailError) {
        console.error("Error sending cancellation email:", emailError);
        // Don't fail the cancellation if email fails
      }
    } else if (status === "completed") {
      // Service provider OR customer can mark as completed, and only when status is "paid"
      const isProvider = bookingData.services?.user_id === user.id;
      const isCustomer = bookingData.user_id === user.id;

      if (!isProvider && !isCustomer) {
        return NextResponse.json(
          { success: false, error: "Only service provider or customer can mark booking as completed" },
          { status: 403 }
        );
      }

      // Ensure booking is paid before allowing completion
      if (bookingData.status !== "paid") {
        return NextResponse.json(
          { success: false, error: "Booking must be paid before it can be marked as completed" },
          { status: 400 }
        );
      }
    } else if (status === "paid") {
      // Only customer can mark as paid (though this should typically be done via payment webhook)
      if (bookingData.user_id !== user.id) {
        return NextResponse.json(
          { success: false, error: "Only customer can mark booking as paid" },
          { status: 403 }
        );
      }
    }

    // Prepare update payload
    const updatePayload: any = {
      status: status,
      updated_at: new Date().toISOString()
    };

    // If proposing alternative time, include alternative_date and alternative_time
    if (status === "alternative_proposed" && alternative_date && alternative_time) {
      updatePayload.alternative_date = alternative_date;
      updatePayload.alternative_time = alternative_time;
      console.log("Updating booking to alternative_proposed:", {
        bookingId,
        alternative_date,
        alternative_time,
        updatePayload
      });
    }

    // Debug: Log the complete update payload
    console.log("Complete update payload before database update:", JSON.stringify(updatePayload, null, 2));

    // If accepting alternative time (status = confirmed), update requested_date and requested_time
    if (status === "confirmed" && requested_date && requested_time) {
      updatePayload.requested_date = requested_date;
      updatePayload.requested_time = requested_time;
      // Clear alternative fields since we're using them now
      updatePayload.alternative_date = null;
      updatePayload.alternative_time = null;
    }

    // Update the booking status
    console.log("Executing database update query:");
    console.log("Table: bookings");
    console.log("Where: id =", bookingId);
    console.log("Update payload:", updatePayload);

    const { data: updatedBooking, error: updateError } = await (supabase as any)
      .from("bookings")
      .update(updatePayload)
      .eq("id", bookingId)
      .select(`
        *,
        service_price,
        total_price,
        services (
          id,
          title,
          pricing_model,
          location,
          category,
          user_id
        ),
        profiles:profiles!bookings_user_id_fkey (
          first_name,
          last_name
        )
      `)
      .single();

    // Debug: Log the raw database response
    console.log("Database update response:", {
      hasData: !!updatedBooking,
      hasError: !!updateError,
      error: updateError,
      updatedStatus: updatedBooking?.status,
      updatedAlternativeDate: updatedBooking?.alternative_date,
      updatedAlternativeTime: updatedBooking?.alternative_time
    });

    if (updateError) {
      console.error("Error updating booking:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update booking" },
        { status: 500 }
      );
    }

    // Type assertion for updated booking data
    const updatedBookingData = updatedBooking as any;

    // Debug: Log the updated booking status
    console.log("Booking updated successfully:", {
      bookingId,
      newStatus: updatedBookingData.status,
      alternative_date: updatedBookingData.alternative_date,
      alternative_time: updatedBookingData.alternative_time
    });

    // If booking is marked as completed, create/update earnings with status "pending" and automatically create withdrawal request
    if (status === "completed") {
      console.log(`[EARNINGS] Processing completed booking ${bookingId}`);

      // First, check if earnings exist for this booking
      const { data: existingEarnings, error: checkError } = await (supabase as any)
        .from("earnings")
        .select("id, status, amount")
        .eq("booking_id", bookingId)
        .maybeSingle();

      let earningsId: string | null = null;
      let earningsAmount: number = 0;

      if (checkError) {
        console.error("[EARNINGS] Error checking earnings:", checkError);
      } else if (existingEarnings) {
        console.log(`[EARNINGS] Existing earnings found for booking ${bookingId}:`, existingEarnings);
        earningsId = existingEarnings.id;
        earningsAmount = existingEarnings.amount;

        // Earnings exist, update them to pending if needed
        // If earnings are 'completed', check if they're in an approved withdrawal request
        // If not, they might have been incorrectly marked as completed (e.g., from sync route)
        // and should be updated to 'pending' so they can be withdrawn
        if (existingEarnings.status === "completed") {
          // Check if these earnings are in an approved withdrawal request
          const supabaseService = createServiceRoleClient();
          const { data: withdrawalRequests } = await (supabaseService as any)
            .from('withdrawal_requests')
            .select('id, status, notes')
            .eq('user_id', updatedBookingData.services?.user_id)
            .in('status', ['approved', 'processed'])
            .limit(100);

          let isInApprovedRequest = false;
          if (withdrawalRequests && Array.isArray(withdrawalRequests)) {
            for (const wr of withdrawalRequests) {
              if (wr.notes) {
                try {
                  const notes = JSON.parse(wr.notes);
                  if (notes.earnings_ids && Array.isArray(notes.earnings_ids) && notes.earnings_ids.includes(existingEarnings.id)) {
                    isInApprovedRequest = true;
                    console.log(`[EARNINGS] Earnings ${existingEarnings.id} is already in approved withdrawal request ${wr.id}`);
                    break;
                  }
                } catch (e) {
                  // Ignore parse errors
                }
              }
            }
          }

          if (!isInApprovedRequest) {
            // Earnings are marked as 'completed' but not in an approved withdrawal request
            // This likely means they were incorrectly marked as completed (e.g., from sync route)
            // Update them to 'pending' so they can be withdrawn
            console.log(`[EARNINGS] Earnings ${existingEarnings.id} is 'completed' but not in an approved withdrawal request. Updating to 'pending'.`);
            const { error: earningsUpdateError } = await (supabaseService as any)
              .from("earnings")
              .update({
                status: 'pending', // Make earnings available for withdrawal
                updated_at: new Date().toISOString()
              })
              .eq("booking_id", bookingId);

            if (earningsUpdateError) {
              console.error("[EARNINGS] Error updating earnings status:", earningsUpdateError);
            } else {
              console.log(`[EARNINGS] Updated earnings for booking ${bookingId} from 'completed' to 'pending' status`);
            }
          }
        } else if (existingEarnings.status !== "pending") {
          // Earnings exist but are not pending, update them to pending
          const supabaseService = createServiceRoleClient();
          const { error: earningsUpdateError } = await (supabaseService as any)
            .from("earnings")
            .update({
              status: 'pending', // Make earnings available for withdrawal
              updated_at: new Date().toISOString()
            })
            .eq("booking_id", bookingId);

          if (earningsUpdateError) {
            console.error("[EARNINGS] Error updating earnings status:", earningsUpdateError);
            // Don't fail the request, just log the error
          } else {
            console.log(`[EARNINGS] Updated earnings for booking ${bookingId} to pending status`);
          }
        } else {
          console.log(`[EARNINGS] Earnings for booking ${bookingId} are already in status: ${existingEarnings.status}`);
        }
      } else {
        // Earnings don't exist, create them with pending status
        const providerId = updatedBookingData.services?.user_id;
        // Use service_price (what provider earns) if available, otherwise use total_price
        earningsAmount = updatedBookingData.service_price || updatedBookingData.total_price;

        console.log(`[EARNINGS] Creating new earnings for booking ${bookingId}:`, {
          providerId,
          earningsAmount,
          service_price: updatedBookingData.service_price,
          total_price: updatedBookingData.total_price
        });

        if (providerId && earningsAmount) {
          // Use service role client to bypass RLS for automatic earnings creation
          const supabaseService = createServiceRoleClient();
          const { data: newEarnings, error: earningsCreateError } = await (supabaseService as any)
            .from("earnings")
            .insert({
              user_id: providerId,
              booking_id: bookingId,
              amount: earningsAmount,
              status: 'pending', // Create as pending since booking is already completed
              earned_at: new Date().toISOString()
            })
            .select()
            .single();

          if (earningsCreateError) {
            console.error("[EARNINGS] ❌ Error creating earnings:", earningsCreateError);
            console.error("[EARNINGS] Error details:", {
              code: earningsCreateError.code,
              message: earningsCreateError.message,
              details: earningsCreateError.details,
              hint: earningsCreateError.hint
            });
            // Don't fail the request, just log the error
          } else if (newEarnings) {
            console.log(`[EARNINGS] ✅ Created pending earnings for booking ${bookingId}:`, newEarnings);
            earningsId = newEarnings.id;
          } else {
            console.error(`[EARNINGS] ⚠️ Earnings insert returned no data and no error for booking ${bookingId}`);
          }
        } else {
          console.warn(`[EARNINGS] Cannot create earnings for booking ${bookingId}: missing providerId (${providerId}) or earnings amount (${earningsAmount})`);
        }
      }

      // Withdrawal requests are user-initiated via "Withdraw Cash" on the earnings page.
      // We intentionally do not auto-create a request on booking completion.
      if (!earningsId || earningsAmount <= 0) {
        console.warn(`[WITHDRAWAL REQUEST] Earnings not ready for booking ${bookingId}: earningsId=${earningsId}, earningsAmount=${earningsAmount}`);
      }
    }

    // Send notifications based on status change
    try {
      if (status === "confirmed") {
        // When teen confirms, send email to parent asking them to pay
        // Get customer profile for email
        const { data: customerProfile } = await supabase
          .from("profiles")
          .select("first_name, last_name, email")
          .eq("id", bookingData.user_id)
          .single();

        if (customerProfile && (customerProfile as any).email) {
          const { emailService } = await import("@/lib/email");
          const serviceTitle = updatedBookingData.services?.title || "Service";
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

          await emailService.sendEmail(
            (customerProfile as any).email,
            "Good News! Your TeenOp Service Is Ready to Be Confirmed",
            `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <title>Service Ready to Confirm</title>
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
                    <h1>Good News! Your TeenOp Service Is Ready to Be Confirmed</h1>
                    <p>A teen has accepted your service request, and you're almost all set.</p>
                  </div>
                  
                  <div class="content">
                    <div class="booking-details">
                      <h3>Service Details</h3>
                      <p><strong>Service:</strong> ${serviceTitle}</p>
                    </div>

                    <h3>What's next?</h3>
                    <ul>
                      <li>To officially schedule the service, simply complete payment within TeenOp.</li>
                      <li>Click the button below to confirm and pay with Stripe.</li>
                      <li>Once payment is complete, your booking will be confirmed and you'll receive all the details.</li>
                    </ul>

                    <p style="text-align: center; margin: 20px 0;">
                      <a href="${appUrl}/my-requests" class="button">Click here to confirm and pay with Stripe</a>
                    </p>

                    <p><strong>Important:</strong> Please complete payment as soon as possible to secure your booking.</p>
                    
                    <p>Thank you for supporting a local teen and for being part of the TeenOp community!</p>
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
      } else if (status === "rejected") {
        // Send rejection notification to buyer
        const { data: customerProfile } = await supabase
          .from("profiles")
          .select("first_name, last_name, email")
          .eq("id", bookingData.user_id)
          .single();

        if (customerProfile && (customerProfile as any).email) {
          const { emailService } = await import("@/lib/email");
          const serviceTitle = updatedBookingData.services?.title || "Service";
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

          await emailService.sendEmail(
            (customerProfile as any).email,
            "Service Request Update",
            `
              <p>Hello,</p>
              <p>We wanted to let you know that the teen is unable to move forward with your service request at this time.</p>
              <p>If you'd like to request this service again for a different date or time, you can return to the original listing and submit a new request that works for you.</p>
              <p><a href="${appUrl}/services/${updatedBookingData.services?.id}" style="background: #434c9d; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">Click here to view the listing and request again</a></p>
              <p>Thank you for your understanding and for being part of the TeenOp community. We hope you're able to find the help you need on TeenOp with one of our many talented teens.</p>
              <p>Warmly,<br>The TeenOp Team</p>
            `
          );
        }
      } else if (status === "alternative_proposed") {
        // Send alternative time proposal notification to buyer
        const { data: customerProfile } = await supabase
          .from("profiles")
          .select("first_name, last_name, email")
          .eq("id", bookingData.user_id)
          .single();

        let customerEmail = (customerProfile as any)?.email as string | undefined;

        // Fallback to auth email in case profiles.email is missing/outdated.
        if (!customerEmail) {
          try {
            const serviceRole = createServiceRoleClient();
            const { data: authUserData, error: authUserError } = await serviceRole.auth.admin.getUserById(bookingData.user_id);
            if (!authUserError) {
              customerEmail = authUserData.user?.email;
            } else {
              console.warn("Failed to fetch customer auth email for alternative proposal:", authUserError.message);
            }
          } catch (fallbackError) {
            console.warn("Alternative proposal email fallback failed:", fallbackError);
          }
        }

        if (customerEmail) {
          const { emailService } = await import("@/lib/email");
          const serviceTitle = updatedBookingData.services?.title || "Service";
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
            customerEmail,
            "Your Action Needed: New TeenOp Service Time Proposed",
            `
              <p>Hello,</p>
              <p>The original date and time didn't work with the teen's schedule, so they're proposing a new date and time for your service request.</p>
              <p>Please review the updated details and choose to accept and complete payment, or decline the alternative timing.</p>
              <p><a href="${appUrl}/my-requests" style="background: #434c9d; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">Click here to review and respond</a></p>
              <p>Thanks for using TeenOp,<br>The TeenOp Team</p>
            `
          );
        }
      }
    } catch (notificationError) {
      console.error("Error sending notification:", notificationError);
      // Don't fail the booking update if notification fails
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: updatedBookingData.id,
        service_id: updatedBookingData.service_id,
        status: updatedBookingData.status,
        requested_date: updatedBookingData.requested_date,
        requested_time: updatedBookingData.requested_time,
        alternative_date: updatedBookingData.alternative_date ?? null,
        alternative_time: updatedBookingData.alternative_time ?? null,
        duration: updatedBookingData.duration,
        total_price: updatedBookingData.total_price,
        special_instructions: updatedBookingData.special_instructions,
        created_at: updatedBookingData.created_at,
        updated_at: updatedBookingData.updated_at,
        service: updatedBookingData.services,
        customer_name: updatedBookingData.profiles ?
          [updatedBookingData.profiles.first_name, updatedBookingData.profiles.last_name].filter(Boolean).join(" ").trim() || "Customer" :
          "Customer",
      }
    });

  } catch (error) {
    console.error("Unexpected error in updating booking:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
