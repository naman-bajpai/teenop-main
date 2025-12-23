import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { emailService } from "@/lib/email";
import type { Database } from "@/lib/database.types";

type QuotesUpdate = Database["public"]["Tables"]["quotes"]["Update"];
type QuoteRequestsUpdate = Database["public"]["Tables"]["quote_requests"]["Update"];

// POST - Customer accepts a quote (creates booking)
export async function POST(
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

    const { id } = await params;

    // Get quote with related data
    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select(`
        *,
        quote_requests (
          id,
          service_id,
          customer_id,
          status,
          requested_date,
          requested_time,
          special_instructions,
          services (
            id,
            title,
            price,
            duration,
            pricing_model,
            user_id
          ),
          profiles:profiles!quote_requests_customer_id_fkey (
            id,
            first_name,
            last_name,
            email
          )
        ),
        profiles:profiles!quotes_provider_id_fkey (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq("id" as any, id as any)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json(
        { success: false, error: "Quote not found" },
        { status: 404 }
      );
    }

    const quoteData = quote as any;
    const quoteRequest = quoteData.quote_requests;

    // Check if user is the customer
    if (quoteRequest.customer_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "Only the customer can accept quotes" },
        { status: 403 }
      );
    }

    // Check if quote is still pending
    if (quoteData.status !== "pending") {
      return NextResponse.json(
        { success: false, error: "Quote has already been accepted or rejected" },
        { status: 400 }
      );
    }

    // Check if quote has expired
    if (quoteData.valid_until) {
      const expirationDate = new Date(quoteData.valid_until);
      if (expirationDate < new Date()) {
        return NextResponse.json(
          { success: false, error: "Quote has expired" },
          { status: 400 }
        );
      }
    }

    // Check if quote request is still valid
    if (!["pending", "quoted"].includes(quoteRequest.status)) {
      return NextResponse.json(
        { success: false, error: "Quote request is no longer valid" },
        { status: 400 }
      );
    }

    // Check for existing bookings for the same time slot
    const { data: existingBookings } = await supabase
      .from("bookings")
      .select("id, status")
      .eq("service_id" as any, quoteRequest.service_id as any)
      .eq("requested_date" as any, quoteRequest.requested_date as any)
      .eq("requested_time" as any, quoteRequest.requested_time as any)
      .in("status" as any, ["pending" as any, "confirmed" as any, "paid" as any]);

    if (existingBookings && existingBookings.length > 0) {
      return NextResponse.json(
        { success: false, error: "This time slot is already booked" },
        { status: 400 }
      );
    }

    // Calculate total price with platform fee
    const servicePrice = quoteData.price;
    const platformFee = 0.00; // $0 platform fee
    const totalPrice = servicePrice + platformFee;

    // Create booking with quote price
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        service_id: quoteRequest.service_id,
        user_id: user.id,
        requested_date: quoteRequest.requested_date,
        requested_time: quoteRequest.requested_time,
        special_instructions: quoteRequest.special_instructions,
        service_price: servicePrice,
        platform_fee: platformFee,
        total_price: totalPrice,
        duration: quoteData.estimated_duration || quoteRequest.services?.duration || 60,
        status: "pending",
        quote_id: id
      } as any)
      .select(`
        *,
        services (
          id,
          title,
          description,
          pricing_model,
          location,
          category
        )
      `)
      .single();

    if (bookingError) {
      console.error("Error creating booking:", bookingError);
      return NextResponse.json(
        { success: false, error: "Failed to create booking" },
        { status: 500 }
      );
    }

    // Update quote status to accepted
    const quoteUpdatePayload: QuotesUpdate = {
      status: "accepted",
      updated_at: new Date().toISOString()
    };
    const quoteQuery = supabase.from("quotes");
    await (quoteQuery as any)
      .update(quoteUpdatePayload)
      .eq("id", id);

    // Update quote request status to accepted
    const quoteRequestUpdatePayload: QuoteRequestsUpdate = {
      status: "accepted",
      updated_at: new Date().toISOString()
    };
    const quoteRequestQuery = supabase.from("quote_requests");
    await (quoteRequestQuery as any)
      .update(quoteRequestUpdatePayload)
      .eq("id", quoteRequest.id);

    // Reject other pending quotes for the same request
    const rejectUpdatePayload: QuotesUpdate = {
      status: "rejected",
      updated_at: new Date().toISOString()
    };
    const rejectQuery = supabase.from("quotes");
    await (rejectQuery as any)
      .update(rejectUpdatePayload)
      .eq("quote_request_id", quoteRequest.id)
      .eq("status", "pending")
      .neq("id", id);

    // Send notification emails
    try {
      const customerEmail = (quoteRequest.profiles as any)?.email;
      const providerEmail = (quoteData.profiles as any)?.email;
      const customerName = `${(quoteRequest.profiles as any)?.first_name || ''} ${(quoteRequest.profiles as any)?.last_name || ''}`.trim() || 'Customer';
      const providerName = `${(quoteData.profiles as any)?.first_name || ''} ${(quoteData.profiles as any)?.last_name || ''}`.trim() || 'Provider';
      const serviceTitle = quoteRequest.services?.title || 'Service';
      
      // Notify provider
      if (providerEmail) {
        await emailService.sendEmail(
          providerEmail,
          `Quote Accepted for ${serviceTitle}`,
          `
            <h2>Quote Accepted</h2>
            <p>Your quote has been accepted for: <strong>${serviceTitle}</strong></p>
            <p><strong>Customer:</strong> ${customerName}</p>
            <p><strong>Date:</strong> ${quoteRequest.requested_date}</p>
            <p><strong>Time:</strong> ${quoteRequest.requested_time}</p>
            <p>Please log in to confirm the booking.</p>
          `
        );
      }

      // Notify customer (the person who requested the service)
      if (customerEmail) {
        await emailService.sendEmail(
          customerEmail,
          `Booking Created - ${serviceTitle}`,
          `
            <h2>Booking Created</h2>
            <p>Your quote has been accepted and a booking has been created for: <strong>${serviceTitle}</strong></p>
            <p><strong>Provider:</strong> ${providerName}</p>
            <p><strong>Date:</strong> ${quoteRequest.requested_date}</p>
            <p><strong>Time:</strong> ${quoteRequest.requested_time}</p>
            <p><strong>Total Price:</strong> $${totalPrice.toFixed(2)}</p>
            <p>Please proceed to payment to confirm your booking.</p>
          `
        );
      }
    } catch (emailError) {
      console.error("Error sending notification emails:", emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      booking,
      message: "Quote accepted. Booking created successfully."
    });

  } catch (error) {
    console.error("Unexpected error in accepting quote:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

