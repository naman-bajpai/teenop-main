import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { CreateBookingRequest, BookingResponse } from "@/types/booking";

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

    // Parse request body
    const body: CreateBookingRequest = await request.json();
    const { service_id, requested_date, requested_time, special_instructions } = body;

    // Validate required fields
    if (!service_id || !requested_date || !requested_time) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate date is not in the past
    const requestedDateTime = new Date(`${requested_date}T${requested_time}`);
    if (requestedDateTime < new Date()) {
      return NextResponse.json(
        { success: false, error: "Cannot book services in the past" },
        { status: 400 }
      );
    }

    // Check if service exists and is active
    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("id, title, price, pricing_model, duration, status, user_id")
      .eq("id", service_id)
      .single();

    if (serviceError || !service) {
      return NextResponse.json(
        { success: false, error: "Service not found" },
        { status: 404 }
      );
    }

    if (service.status !== "active") {
      return NextResponse.json(
        { success: false, error: "Service is not available for booking" },
        { status: 400 }
      );
    }

    // Prevent users from booking their own services
    if (service.user_id === user.id) {
      return NextResponse.json(
        { success: false, error: "Cannot book your own service" },
        { status: 400 }
      );
    }

    // Check for existing pending/confirmed bookings for the same time slot
    const { data: existingBookings, error: bookingCheckError } = await supabase
      .from("bookings")
      .select("id, status")
      .eq("service_id", service_id)
      .eq("requested_date", requested_date)
      .eq("requested_time", requested_time)
      .in("status", ["pending", "confirmed"]);

    if (bookingCheckError) {
      console.error("Error checking existing bookings:", bookingCheckError);
      return NextResponse.json(
        { success: false, error: "Failed to check availability" },
        { status: 500 }
      );
    }

    if (existingBookings && existingBookings.length > 0) {
      return NextResponse.json(
        { success: false, error: "This time slot is already booked" },
        { status: 400 }
      );
    }

    // Calculate total price
    const totalPrice = service.pricing_model === "per_hour" 
      ? service.price * (service.duration / 60) 
      : service.price;

    // Create the booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        service_id,
        user_id: user.id,
        status: "pending",
        requested_date,
        requested_time,
        duration: service.duration,
        total_price: totalPrice,
        special_instructions: special_instructions || null,
      })
      .select(`
        *,
        services (
          title,
          description,
          price,
          pricing_model,
          location,
          category,
          user_id
        ),
        profiles!bookings_user_id_fkey (
          first_name,
          last_name,
          email,
          phone
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

    // TODO: Send notification to service provider
    // This could be implemented with email notifications, push notifications, etc.

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        service_id: booking.service_id,
        user_id: booking.user_id,
        status: booking.status,
        requested_date: booking.requested_date,
        requested_time: booking.requested_time,
        duration: booking.duration,
        total_price: booking.total_price,
        special_instructions: booking.special_instructions,
        created_at: booking.created_at,
        updated_at: booking.updated_at,
        service: booking.services,
        user: booking.profiles
      }
    });

  } catch (error) {
    console.error("Unexpected error in booking creation:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

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
    const type = searchParams.get("type"); // "requested" or "received"

    let query = supabase
      .from("bookings")
      .select(`
        *,
        services (
          title,
          description,
          price,
          pricing_model,
          location,
          category,
          user_id
        ),
        profiles!bookings_user_id_fkey (
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .order("created_at", { ascending: false });

    if (type === "requested") {
      // Bookings made by the current user
      query = query.eq("user_id", user.id);
    } else if (type === "received") {
      // Bookings received by the current user (for their services)
      query = query.eq("services.user_id", user.id);
    } else {
      // Return all bookings for the user (both requested and received)
      query = query.or(`user_id.eq.${user.id},services.user_id.eq.${user.id}`);
    }

    const { data: bookings, error } = await query;

    if (error) {
      console.error("Error fetching bookings:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch bookings" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      bookings: bookings || []
    });

  } catch (error) {
    console.error("Unexpected error in fetching bookings:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
