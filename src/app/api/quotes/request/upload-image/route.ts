import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import { parseStoredQuoteImageUrls, serializeQuoteImageUrls } from "@/lib/quote-reference-images";

type QuoteRequestsUpdate = Database["public"]["Tables"]["quote_requests"]["Update"] & {
  image_url?: string | null;
};

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

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const quoteRequestId = formData.get("quote_request_id") as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    if (!quoteRequestId) {
      return NextResponse.json(
        { success: false, error: "quote_request_id is required" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: "File must be an image" },
        { status: 400 }
      );
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "File size must be less than 5MB" },
        { status: 400 }
      );
    }

    // Verify user has access to this quote request
    const { data: quoteRequest, error: qrError } = await supabase
      .from("quote_requests")
      .select("customer_id, image_url")
      .eq("id" as any, quoteRequestId as any)
      .single();

    if (qrError || !quoteRequest) {
      return NextResponse.json(
        { success: false, error: "Quote request not found" },
        { status: 404 }
      );
    }

    if ((quoteRequest as any).customer_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${user.id}/quote-requests/${quoteRequestId}/${fileName}`;

    // Upload file to storage
    const { error: uploadError } = await supabase.storage
      .from('service-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error("Error uploading image:", uploadError);
      return NextResponse.json(
        { success: false, error: "Failed to upload image: " + uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('service-images')
      .getPublicUrl(filePath);

    const existingUrls = parseStoredQuoteImageUrls((quoteRequest as { image_url?: string | null }).image_url);
    const nextUrls = [...existingUrls, publicUrl];
    const updatePayload: QuoteRequestsUpdate = {
      image_url: serializeQuoteImageUrls(nextUrls),
    };
    const quoteRequestQuery = supabase.from("quote_requests");
    const { error: updateError } = await (quoteRequestQuery as any)
      .update(updatePayload)
      .eq("id", quoteRequestId);

    if (updateError) {
      console.error("Error updating quote request:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update quote request with image URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: publicUrl
    });
  } catch (error) {
    console.error("Unexpected error uploading image:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

