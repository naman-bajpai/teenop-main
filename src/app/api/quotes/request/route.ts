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
    const { service_id, requested_date, requested_time, special_instructions, service_address } = body;

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
    } else if (messagingBooking) {
      // Update quote request with booking_id for easy messaging access
      await supabase
        .from("quote_requests")
        .update({ booking_id: messagingBooking.id } as any)
        .eq("id", quoteRequest.id);
      
      // Update quoteRequest object to include booking_id
      (quoteRequest as any).booking_id = messagingBooking.id;
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
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>New Quote Request</title>
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
                  <h1>You have a new quote request!</h1>
                  <p>Someone wants a quote for your service. Review the details below.</p>
                </div>
                
                <div class="content">
                  <div class="booking-details">
                    <h3>Quote Request Details</h3>
                    <p><strong>Service:</strong> ${serviceData.title}</p>
                    <p><strong>Requested by:</strong> ${(customerProfile as any).first_name} ${(customerProfile as any).last_name}</p>
                    <p><strong>Requested Date:</strong> ${requested_date}</p>
                    <p><strong>Requested Time:</strong> ${requested_time}</p>
                    ${special_instructions ? `<p><strong>Special Instructions:</strong> ${special_instructions}</p>` : ''}
                  </div>

                  <h3>What's next?</h3>
                  <ul>
                    <li>Log in to your TeenOp account to review this quote request.</li>
                    <li>Message the customer through the platform to discuss pricing and details before submitting a quote.</li>
                    <li>Once you've discussed the details, submit your quote through the TeenOp platform.</li>
                    <li>If you need more information, use TeenOp messages to communicate with the customer.</li>
                  </ul>

                  <p><strong>Important:</strong> Please respond to this quote request as soon as possible so the customer knows if you can help them.</p>
                  
                  <p>Thanks for being part of TeenOp!</p>
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
        booking_id,
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

