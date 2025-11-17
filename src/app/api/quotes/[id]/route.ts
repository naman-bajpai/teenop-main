import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type QuotesUpdate = Database["public"]["Tables"]["quotes"]["Update"];

// GET - Get specific quote details
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

    const { data: quote, error } = await supabase
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
            description,
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
          last_name
        )
      `)
      .eq("id" as any, id as any)
      .single();

    if (error || !quote) {
      return NextResponse.json(
        { success: false, error: "Quote not found" },
        { status: 404 }
      );
    }

    const quoteData = quote as any;

    // Check permissions
    const isProvider = quoteData.provider_id === user.id;
    const isCustomer = quoteData.quote_requests?.customer_id === user.id;

    if (!isProvider && !isCustomer) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      quote
    });

  } catch (error) {
    console.error("Unexpected error in fetching quote:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH - Update quote (edit if not accepted)
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
    const { price, estimated_duration, notes, valid_until } = body;

    // Get quote
    const { data: quote, error: fetchError } = await supabase
      .from("quotes")
      .select("*")
      .eq("id" as any, id as any)
      .single();

    if (fetchError || !quote) {
      return NextResponse.json(
        { success: false, error: "Quote not found" },
        { status: 404 }
      );
    }

    const quoteData = quote as any;

    // Check if user is the provider
    if (quoteData.provider_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "Only the provider can edit quotes" },
        { status: 403 }
      );
    }

    // Only allow editing if quote is pending
    if (quoteData.status !== "pending") {
      return NextResponse.json(
        { success: false, error: "Cannot edit quote that has been accepted or rejected" },
        { status: 400 }
      );
    }

    // Validate price if provided
    if (price !== undefined) {
      if (typeof price !== "number" || price <= 0) {
        return NextResponse.json(
          { success: false, error: "Price must be a positive number" },
          { status: 400 }
        );
      }
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

    // Update quote
    const updateData: QuotesUpdate = {
      updated_at: new Date().toISOString()
    };

    if (price !== undefined) updateData.price = price;
    if (estimated_duration !== undefined) updateData.estimated_duration = estimated_duration;
    if (notes !== undefined) updateData.notes = notes;
    if (valid_until !== undefined) updateData.valid_until = valid_until;

    const quoteQuery = supabase.from("quotes");
    const { data: updatedQuote, error: updateError } = await (quoteQuery as any)
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating quote:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update quote" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      quote: updatedQuote
    });

  } catch (error) {
    console.error("Unexpected error in updating quote:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

