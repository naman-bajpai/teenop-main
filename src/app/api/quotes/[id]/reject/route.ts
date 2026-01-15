import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type QuotesUpdate = Database["public"]["Tables"]["quotes"]["Update"];
type QuoteRequestsUpdate = Database["public"]["Tables"]["quote_requests"]["Update"];

// POST - Customer rejects a quote
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

    // Get quote with quote request
    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select(`
        *,
        quote_requests (
          id,
          customer_id,
          status
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
        { success: false, error: "Only the customer can reject quotes" },
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

    // Update quote status to rejected
    const quoteUpdatePayload: QuotesUpdate = {
      status: "rejected",
      updated_at: new Date().toISOString()
    };
    const quoteQuery = supabase.from("quotes");
    const { data: updatedQuote, error: updateError } = await (quoteQuery as any)
      .update(quoteUpdatePayload)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating quote:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to reject quote" },
        { status: 500 }
      );
    }

    // Check if there are any other pending quotes for this request
    const { data: otherQuotes } = await supabase
      .from("quotes")
      .select("id")
      .eq("quote_request_id" as any, quoteRequest.id as any)
      .eq("status" as any, "pending" as any);

    // If no more pending quotes, mark the quote request as cancelled
    if (!otherQuotes || otherQuotes.length === 0) {
      const quoteRequestUpdatePayload: QuoteRequestsUpdate = {
        status: "cancelled",
        updated_at: new Date().toISOString()
      };
      const quoteRequestQuery = supabase.from("quote_requests");
      await (quoteRequestQuery as any)
        .update(quoteRequestUpdatePayload)
        .eq("id", quoteRequest.id);
    }

    return NextResponse.json({
      success: true,
      message: "Quote rejected successfully"
    });

  } catch (error) {
    console.error("Unexpected error in rejecting quote:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

