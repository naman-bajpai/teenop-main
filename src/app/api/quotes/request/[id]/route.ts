import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type QuoteRequestsUpdate = Database["public"]["Tables"]["quote_requests"]["Update"];

// GET - Get specific quote request details
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

    const { id } = await params;

    // Get quote request with service and customer details
    const { data: quoteRequest, error } = await supabase
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
      `)
      .eq("id" as any, id as any)
      .single();

    if (error || !quoteRequest) {
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

    // Get associated quotes
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
      .eq("quote_request_id" as any, id as any)
      .order("created_at", { ascending: false });

    return NextResponse.json({
      success: true,
      quote_request: {
        ...qr,
        quotes: quotes || []
      }
    });

  } catch (error) {
    console.error("Unexpected error in fetching quote request:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH - Update quote request (cancel, etc.)
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

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    // Get quote request
    const { data: quoteRequest, error: fetchError } = await supabase
      .from("quote_requests")
      .select("*")
      .eq("id" as any, id as any)
      .single();

    if (fetchError || !quoteRequest) {
      return NextResponse.json(
        { success: false, error: "Quote request not found" },
        { status: 404 }
      );
    }

    const qr = quoteRequest as any;

    // Get service to check provider
    const { data: service } = await supabase
      .from("services")
      .select("user_id")
      .eq("id" as any, qr.service_id as any)
      .single();

    const isCustomer = qr.customer_id === user.id;
    const isProvider = service?.user_id === user.id;

    // Check permissions - customer or provider can cancel
    if (!isCustomer && !isProvider) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    // Check if quote request is past due
    const isPastDue = qr.requested_date && qr.requested_time ? 
      new Date(`${qr.requested_date}T${qr.requested_time}`) < new Date() : false;

    // Allow cancelling if:
    // 1. Status is pending or quoted (normal case)
    // 2. OR if the request is past due (even if status is still pending/quoted)
    if (status === "cancelled") {
      const canCancel = ["pending", "quoted"].includes(qr.status) || isPastDue;
      if (!canCancel && qr.status !== "cancelled") {
        return NextResponse.json(
          { success: false, error: "Cannot cancel this quote request" },
          { status: 400 }
        );
      }
    }

    // Update quote request
    const quoteRequestUpdatePayload: QuoteRequestsUpdate = {
      status: status,
      updated_at: new Date().toISOString()
    };
    const quoteRequestQuery = supabase.from("quote_requests");
    const { data: updatedRequest, error: updateError } = await (quoteRequestQuery as any)
      .update(quoteRequestUpdatePayload)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating quote request:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update quote request" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      quote_request: updatedRequest
    });

  } catch (error) {
    console.error("Unexpected error in updating quote request:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

