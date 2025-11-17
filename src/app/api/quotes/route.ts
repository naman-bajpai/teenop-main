import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { CreateQuoteRequest } from "@/types/quote";
import { emailService } from "@/lib/email";
import type { Database } from "@/lib/database.types";

type QuoteRequestsUpdate = Database["public"]["Tables"]["quote_requests"]["Update"];

// POST - Submit a quote for a quote request
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

    const body: CreateQuoteRequest = await request.json();
    const { quote_request_id, price, estimated_duration, notes, valid_until } = body;

    // Validate required fields
    if (!quote_request_id || !price) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: quote_request_id, price" },
        { status: 400 }
      );
    }

    // Validate price
    if (typeof price !== "number" || price <= 0) {
      return NextResponse.json(
        { success: false, error: "Price must be a positive number" },
        { status: 400 }
      );
    }

    // Get quote request
    const { data: quoteRequest, error: qrError } = await supabase
      .from("quote_requests")
      .select(`
        *,
        services (
          id,
          title,
          user_id
        ),
        profiles:profiles!quote_requests_customer_id_fkey (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq("id" as any, quote_request_id as any)
      .single();

    if (qrError || !quoteRequest) {
      return NextResponse.json(
        { success: false, error: "Quote request not found" },
        { status: 404 }
      );
    }

    const qr = quoteRequest as any;

    // Check if user is the service provider
    if (qr.services?.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "Only the service provider can submit quotes" },
        { status: 403 }
      );
    }

    // Check if quote request is still pending or quoted
    if (!["pending", "quoted"].includes(qr.status)) {
      return NextResponse.json(
        { success: false, error: "Cannot submit quote for this request" },
        { status: 400 }
      );
    }

    // Validate expiration date if provided
    if (valid_until) {
      const expirationDate = new Date(valid_until);
      if (expirationDate < new Date()) {
        return NextResponse.json(
          { success: false, error: "Expiration date must be in the future" },
          { status: 400 }
        );
      }
    }

    // Create the quote
    const { data: quote, error: createError } = await supabase
      .from("quotes")
      .insert({
        quote_request_id,
        provider_id: user.id,
        price,
        estimated_duration: estimated_duration || null,
        notes: notes || null,
        valid_until: valid_until || null,
        status: "pending"
      } as any)
      .select(`
        *,
        profiles:profiles!quotes_provider_id_fkey (
          id,
          first_name,
          last_name
        )
      `)
      .single();

    if (createError) {
      console.error("Error creating quote:", createError);
      return NextResponse.json(
        { success: false, error: "Failed to create quote" },
        { status: 500 }
      );
    }

    // Update quote request status to "quoted"
    const quoteRequestUpdatePayload: QuoteRequestsUpdate = {
      status: "quoted",
      updated_at: new Date().toISOString()
    };
    const quoteRequestQuery = supabase.from("quote_requests");
    await (quoteRequestQuery as any)
      .update(quoteRequestUpdatePayload)
      .eq("id", quote_request_id);

    // Send notification email to customer
    if (qr.profiles) {
      try {
        const providerProfile = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id" as any, user.id as any)
          .single();

        await emailService.sendEmail(
          (qr.profiles as any).email,
          `Quote Received for ${qr.services?.title}`,
          `
            <h2>Quote Received</h2>
            <p>You have received a quote for your request: <strong>${qr.services?.title}</strong></p>
            <p><strong>Price:</strong> $${price.toFixed(2)}</p>
            ${estimated_duration ? `<p><strong>Estimated Duration:</strong> ${estimated_duration} minutes</p>` : ''}
            ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
            ${valid_until ? `<p><strong>Valid Until:</strong> ${valid_until}</p>` : ''}
            <p>Please log in to view and accept the quote.</p>
          `
        );
      } catch (emailError) {
        console.error("Error sending notification email:", emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      quote
    }, { status: 201 });

  } catch (error) {
    console.error("Unexpected error in creating quote:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET - Get quotes (filtered by user)
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
    const quote_request_id = searchParams.get("quote_request_id");
    const status = searchParams.get("status");
    const role = searchParams.get("role"); // "provider" or "customer"

    let query = supabase
      .from("quotes")
      .select(`
        *,
        quote_requests (
          id,
          service_id,
          customer_id,
          status,
          services (
            id,
            title
          )
        ),
        profiles:profiles!quotes_provider_id_fkey (
          id,
          first_name,
          last_name
        )
      `);

    // Filter by role
    if (role === "provider") {
      query = query.eq("provider_id" as any, user.id as any);
    } else if (role === "customer") {
      // Get quote requests for this customer
      const { data: customerRequests } = await supabase
        .from("quote_requests")
        .select("id")
        .eq("customer_id" as any, user.id as any);
      
      const requestIds = customerRequests?.map(r => (r as any).id) || [];
      
      if (requestIds.length === 0) {
        return NextResponse.json({
          success: true,
          quotes: []
        });
      }
      
      query = query.in("quote_request_id" as any, requestIds);
    }

    // Filter by quote_request_id
    if (quote_request_id) {
      query = query.eq("quote_request_id" as any, quote_request_id as any);
    }

    // Filter by status
    if (status) {
      query = query.eq("status" as any, status as any);
    }

    // Order by created_at descending
    query = query.order("created_at", { ascending: false });

    const { data: quotes, error } = await query;

    if (error) {
      console.error("Error fetching quotes:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch quotes" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      quotes: quotes || []
    });

  } catch (error) {
    console.error("Unexpected error in fetching quotes:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

