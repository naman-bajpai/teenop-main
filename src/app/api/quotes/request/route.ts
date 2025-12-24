import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { CreateQuoteRequestRequest } from "@/types/quote";
import { emailService } from "@/lib/email";

// POST - Create a new quote request
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

    const body: CreateQuoteRequestRequest = await request.json();
    const { service_id, requested_date, requested_time, special_instructions, image_url, service_address } = body;

    // Validate required fields
    if (!service_id || !requested_date || !requested_time) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: service_id, requested_date, requested_time" },
        { status: 400 }
      );
    }

    // Validate date is not in the past
    const requestedDateTime = new Date(`${requested_date}T${requested_time}`);
    if (requestedDateTime < new Date()) {
      return NextResponse.json(
        { success: false, error: "Cannot request quotes for past dates" },
        { status: 400 }
      );
    }

    // Check if service exists and is quote-based
    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("id, title, pricing_model, status, user_id")
      .eq("id" as any, service_id as any)
      .single();

    if (serviceError || !service) {
      return NextResponse.json(
        { success: false, error: "Service not found" },
        { status: 404 }
      );
    }

    const serviceData = service as any;

    // Check if service is quote-based
    if (serviceData.pricing_model !== "quote") {
      return NextResponse.json(
        { success: false, error: "This service is not quote-based" },
        { status: 400 }
      );
    }

    // Check if service is active
    if (serviceData.status !== "active") {
      return NextResponse.json(
        { success: false, error: "Service is not available" },
        { status: 400 }
      );
    }

    // Prevent users from requesting quotes for their own services
    if (serviceData.user_id === user.id) {
      return NextResponse.json(
        { success: false, error: "Cannot request quotes for your own service" },
        { status: 400 }
      );
    }

    // Check for existing pending/active quote request for this service
    const { data: existingRequest } = await supabase
      .from("quote_requests")
      .select("id, status")
      .eq("service_id" as any, service_id as any)
      .eq("customer_id" as any, user.id as any)
      .in("status" as any, ["pending" as any, "quoted" as any])
      .single();

    if (existingRequest) {
      return NextResponse.json(
        { success: false, error: "You already have an active quote request for this service" },
        { status: 400 }
      );
    }

    // Get customer profile
    const { data: customerProfile } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .eq("id" as any, user.id as any)
      .single();

    // Create the quote request
    const { data: quoteRequest, error: createError } = await supabase
      .from("quote_requests")
      .insert({
        service_id,
        customer_id: user.id,
        requested_date,
        requested_time,
        special_instructions: special_instructions || null,
        image_url: image_url || null,
        service_address: service_address || null,
        status: "pending"
      } as any)
      .select(`
        *,
        services (
          id,
          title,
          description,
          pricing_model,
          user_id
        )
      `)
      .single();

    if (createError) {
      console.error("Error creating quote request:", createError);
      return NextResponse.json(
        { success: false, error: "Failed to create quote request" },
        { status: 500 }
      );
    }

    // Create a booking for messaging purposes (so provider can message the requester)
    // This booking is used to establish a conversation thread
    const { data: messagingBooking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        service_id,
        user_id: user.id, // Customer who requested the quote
        requested_date,
        requested_time,
        status: "pending" as any,
        duration: 60, // Default duration
        total_price: 0, // Will be set when quote is accepted
        service_price: 0,
        platform_fee: 0.00, // $0 platform fee
        special_instructions: `[QUOTE_REQUEST] Quote request ID: ${quoteRequest.id}. Please message the customer to discuss pricing and details.`,
      } as any)
      .select("id")
      .single();

    if (bookingError) {
      console.error("Error creating messaging booking:", bookingError);
      // Don't fail the quote request if booking creation fails, but log it
    }

    // Get provider profile for notification
    const { data: providerProfile } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .eq("id" as any, serviceData.user_id as any)
      .single();

    // Send notification email to provider
    if (providerProfile && customerProfile) {
      try {
        await emailService.sendEmail(
          (providerProfile as any).email,
          `New Quote Request for ${serviceData.title}`,
          `
            <h2>New Quote Request</h2>
            <p>You have received a new quote request for your service: <strong>${serviceData.title}</strong></p>
            <p><strong>Customer:</strong> ${(customerProfile as any).first_name} ${(customerProfile as any).last_name}</p>
            <p><strong>Requested Date:</strong> ${requested_date}</p>
            <p><strong>Requested Time:</strong> ${requested_time}</p>
            ${special_instructions ? `<p><strong>Special Instructions:</strong> ${special_instructions}</p>` : ''}
            <p><strong>Important:</strong> Please message the customer through the platform to discuss pricing and details before submitting a quote.</p>
            <p>Log in to view the quote request and start messaging the customer.</p>
          `
        );
      } catch (emailError) {
        console.error("Error sending notification email:", emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      quote_request: quoteRequest
    }, { status: 201 });

  } catch (error) {
    console.error("Unexpected error in creating quote request:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET - Get quote requests (filtered by user role)
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const service_id = searchParams.get("service_id");
    const role = searchParams.get("role"); // "customer" or "provider"

    let query = supabase
      .from("quote_requests")
      .select(`
        *,
        services (
          id,
          title,
          description,
          pricing_model,
          user_id
        ),
        profiles:profiles!quote_requests_customer_id_fkey (
          id,
          first_name,
          last_name,
          email
        )
      `);

    // Filter by role
    if (role === "customer") {
      query = query.eq("customer_id" as any, user.id as any);
    } else if (role === "provider") {
      // Get services owned by user
      const { data: userServices } = await supabase
        .from("services")
        .select("id")
        .eq("user_id" as any, user.id as any);
      
      const serviceIds = userServices?.map(s => (s as any).id) || [];
      
      if (serviceIds.length === 0) {
        return NextResponse.json({
          success: true,
          quote_requests: []
        });
      }
      
      query = query.in("service_id" as any, serviceIds);
    } else {
      // Default: show customer's requests
      query = query.eq("customer_id" as any, user.id as any);
    }

    // Filter by status
    if (status) {
      query = query.eq("status" as any, status as any);
    }

    // Filter by service_id
    if (service_id) {
      query = query.eq("service_id" as any, service_id as any);
    }

    // Order by created_at descending
    query = query.order("created_at", { ascending: false });

    const { data: quoteRequests, error } = await query;

    if (error) {
      console.error("Error fetching quote requests:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch quote requests" },
        { status: 500 }
      );
    }

    // For each quote request, get associated quotes
    const quoteRequestsWithQuotes = await Promise.all(
      (quoteRequests || []).map(async (qr: any) => {
        const { data: quotes } = await supabase
          .from("quotes")
          .select(`
            *,
            profiles:profiles!quotes_provider_id_fkey (
              id,
              first_name,
              last_name
            )
          `)
          .eq("quote_request_id" as any, qr.id as any)
          .order("created_at", { ascending: false });

        return {
          ...qr,
          quotes: quotes || []
        };
      })
    );

    return NextResponse.json({
      success: true,
      quote_requests: quoteRequestsWithQuotes
    });

  } catch (error) {
    console.error("Unexpected error in fetching quote requests:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

