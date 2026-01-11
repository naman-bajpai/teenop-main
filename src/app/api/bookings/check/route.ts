import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// Check if user has a booking for a specific service
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // If no user, return hasBooking: false (not an error for public pages)
    if (authError || !user) {
      return NextResponse.json({
        success: true,
        hasBooking: false
      });
    }

    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get("service_id");

    if (!serviceId) {
      return NextResponse.json(
        { success: false, hasBooking: false, error: "Service ID is required" },
        { status: 400 }
      );
    }

    // Check if user has any booking for this service (as customer)
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("service_id", serviceId)
      .order("created_at", { ascending: false });

    if (bookingsError) {
      console.error("Error checking bookings:", bookingsError);
      return NextResponse.json(
        { success: false, hasBooking: false, error: "Failed to check bookings" },
        { status: 500 }
      );
    }

    const hasBooking = bookings && bookings.length > 0;

    return NextResponse.json({
      success: true,
      hasBooking,
      bookingId: bookings?.[0]?.id || null,
      bookingCount: bookings?.length || 0
    });

  } catch (error) {
    console.error("Unexpected error in checking bookings:", error);
    return NextResponse.json(
      { success: false, hasBooking: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
