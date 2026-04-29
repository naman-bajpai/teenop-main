import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET - Get or create booking for a quote request (for messaging)
export async function GET(
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

    const { id: quoteRequestId } = await params;

    // Get quote request
    const { data: quoteRequest, error: qrError } = await supabase
      .from("quote_requests")
      .select(`
        *,
        services (
          id,
          title,
          user_id
        )
      `)
      .eq("id" as any, quoteRequestId as any)
      .single();

    if (qrError || !quoteRequest) {
      return NextResponse.json(
        { success: false, error: "Quote request not found" },
        { status: 404 }
      );
    }

    const qr = quoteRequest as any;

    // Check permissions
    const isCustomer = qr.customer_id === user.id;
    const isProvider = qr.services?.user_id === user.id;

    if (!isCustomer && !isProvider) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    let bookingId = qr.booking_id;

    // If booking_id exists, verify the booking exists
    if (bookingId) {
      const { data: existingBooking } = await supabase
        .from("bookings")
        .select("id")
        .eq("id", bookingId)
        .single();

      if (existingBooking) {
        return NextResponse.json({
          success: true,
          booking_id: bookingId
        });
      }
    }

    // Booking doesn't exist or booking_id not set, find or create it
    // Try to find booking by quote request ID in special_instructions
    const { data: existingBookings } = await supabase
      .from("bookings")
      .select("id")
      .eq("service_id" as any, qr.service_id as any)
      .eq("user_id", qr.customer_id)
      .like("special_instructions" as any, `%[QUOTE_REQUEST] Quote request ID: ${quoteRequestId}%`);

    if (existingBookings && existingBookings.length > 0) {
      bookingId = existingBookings[0].id;
      
      // Update quote request with booking_id
      await supabase
        .from("quote_requests")
        .update({ booking_id: bookingId } as any)
        .eq("id", quoteRequestId);

      return NextResponse.json({
        success: true,
        booking_id: bookingId
      });
    }

    // No booking found, create a placeholder for the conversation thread.
    // Schema requires total_price > 0, so we use $0.01 as a sentinel; this booking
    // is filtered out of regular booking lists by its [QUOTE_REQUEST] marker.
    const { data: newBooking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        service_id: qr.service_id,
        user_id: qr.customer_id,
        requested_date: qr.requested_date || new Date().toISOString().split('T')[0],
        requested_time: qr.requested_time || "12:00",
        status: "pending" as any,
        duration: 60,
        total_price: 0.01,
        service_price: 0.01,
        platform_fee: 0.00,
        special_instructions: `[QUOTE_REQUEST] Quote request ID: ${quoteRequestId}. Please message to discuss pricing and details.`,
      } as any)
      .select("id")
      .single();

    if (bookingError || !newBooking) {
      console.error("Error creating booking:", bookingError);
      return NextResponse.json(
        { success: false, error: "Failed to create booking for messaging" },
        { status: 500 }
      );
    }

    // Update quote request with booking_id
    await supabase
      .from("quote_requests")
      .update({ booking_id: newBooking.id } as any)
      .eq("id", quoteRequestId);

    return NextResponse.json({
      success: true,
      booking_id: newBooking.id
    });

  } catch (error) {
    console.error("Unexpected error in getting booking for quote request:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

