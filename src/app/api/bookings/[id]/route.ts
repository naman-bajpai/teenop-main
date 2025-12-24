import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

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
    if (status === "confirmed" || status === "rejected" || status === "alternative_proposed") {
      // Only service provider can accept/reject/propose alternative
      if (bookingData.services?.user_id !== user.id) {
        return NextResponse.json(
          { success: false, error: "Only service provider can accept, reject, or propose alternative times" },
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
      // Only service provider can mark as completed
      if (bookingData.services?.user_id !== user.id) {
        return NextResponse.json(
          { success: false, error: "Only service provider can mark booking as completed" },
          { status: 403 }
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
    }

    // If accepting alternative time (status = confirmed), update requested_date and requested_time
    if (status === "confirmed" && requested_date && requested_time) {
      updatePayload.requested_date = requested_date;
      updatePayload.requested_time = requested_time;
      // Clear alternative fields since we're using them now
      updatePayload.alternative_date = null;
      updatePayload.alternative_time = null;
    }

    // Update the booking status
    const { data: updatedBooking, error: updateError } = await (supabase as any)
      .from("bookings")
      .update(updatePayload)
      .eq("id", bookingId)
      .select(`
        *,
        services (
          id,
          title,
          pricing_model,
          location,
          category
        ),
        profiles:profiles!bookings_user_id_fkey (
          first_name,
          last_name
        )
      `)
      .single();

    if (updateError) {
      console.error("Error updating booking:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update booking" },
        { status: 500 }
      );
    }

    // Type assertion for updated booking data
    const updatedBookingData = updatedBooking as any;

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
              <h2>Good News!</h2>
              <p>A teen has accepted your service request, and you're almost all set.</p>
              <p>To officially schedule the service, simply complete payment within TeenOp.</p>
              <p><a href="${appUrl}/my-requests" style="background: #434c9d; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">Click here to confirm and pay with Stripe</a></p>
              <p>Thank you for supporting a local teen and for being part of the TeenOp community!</p>
              <p>Best,<br>The TeenOp Team</p>
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
              <h2>Service Request Update</h2>
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

        if (customerProfile && (customerProfile as any).email) {
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
            (customerProfile as any).email,
            "Your Action Needed: New TeenOp Service Time Proposed",
            `
              <h2>Your Action Needed</h2>
              <p>The original date and time didn't work with the teen's schedule, so they're proposing a new date and time for your service request.</p>
              <p><strong>Original Time:</strong> ${formatDate(bookingData.requested_date)}, ${formatTime(bookingData.requested_time)}</p>
              <p><strong>Proposed Time:</strong> ${formatDate(alternative_date)}, ${formatTime(alternative_time)}</p>
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
