import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET - Get service availability
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    const { id: serviceId } = await params;

    if (!serviceId) {
      return NextResponse.json(
        { success: false, error: "service_id is required" },
        { status: 400 }
      );
    }

    // Get the service to check ownership
    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("id, availability")
      .eq("id", serviceId)
      .single();

    if (serviceError || !service) {
      return NextResponse.json(
        { success: false, error: "Service not found" },
        { status: 404 }
      );
    }

    // Parse availability from JSONB if it exists
    let availability: any = {};
    if (service.availability) {
      if (typeof service.availability === 'string') {
        try {
          availability = JSON.parse(service.availability);
        } catch (e) {
          console.error('Error parsing availability JSON string:', e);
          availability = {};
        }
      } else if (typeof service.availability === 'object' && service.availability !== null) {
        availability = service.availability;
      }
    }

    // Ensure availability is an object (not null)
    if (!availability || typeof availability !== 'object') {
      availability = {};
    }

    return NextResponse.json({
      success: true,
      availability: availability,
    });
  } catch (error: any) {
    console.error("Unexpected error in GET service availability:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Save service availability
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

    const { id: serviceId } = await params;
    const body = await request.json();
    const { availability } = body;

    if (!availability || typeof availability !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid availability data" },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("id, user_id")
      .eq("id", serviceId)
      .single();

    if (serviceError || !service) {
      return NextResponse.json(
        { success: false, error: "Service not found" },
        { status: 404 }
      );
    }

    if ((service as any).user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    // Update service with availability
    const { data: updated, error: updateError } = await supabase
      .from("services")
      .update({
        availability: availability,
      })
      .eq("id", serviceId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating service availability:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update availability" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      service: updated,
    });
  } catch (error: any) {
    console.error("Unexpected error in POST service availability:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

