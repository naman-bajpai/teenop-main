import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { CreateBookingRequest, BookingResponse } from "@/types/booking";

// Bookings API route with proper type assertions
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
      .eq("id" as any, service_id as any)
      .single();

    if (serviceError || !service) {
      return NextResponse.json(
        { success: false, error: "Service not found" },
        { status: 404 }
      );
    }

    // Type assertion for service data
    const serviceData = service as any;

    if (serviceData.status !== "active") {
      return NextResponse.json(
        { success: false, error: "Service is not available for booking" },
        { status: 400 }
      );
    }

    // Prevent users from booking their own services
    if (serviceData.user_id === user.id) {
      return NextResponse.json(
        { success: false, error: "Cannot book your own service" },
        { status: 400 }
      );
    }

    // Check for existing pending/confirmed bookings for the same time slot
    const { data: existingBookings, error: bookingCheckError } = await supabase
      .from("bookings")
      .select("id, status")
      .eq("service_id" as any, service_id as any)
      .eq("requested_date" as any, requested_date as any)
      .eq("requested_time" as any, requested_time as any)
      .in("status" as any, ["pending" as any, "confirmed" as any]);

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
    const totalPrice = serviceData.pricing_model === "per_hour" 
      ? serviceData.price * (serviceData.duration / 60) 
      : serviceData.price;

    // Create the booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        service_id,
        user_id: user.id,
        status: "pending" as any,
        requested_date,
        requested_time,
        duration: serviceData.duration,
        total_price: totalPrice,
        special_instructions: special_instructions || null,
      } as any)
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

    // Type assertion for booking data
    const bookingData = booking as any;

    // TODO: Send notification to service provider
    // This could be implemented with email notifications, push notifications, etc.

    return NextResponse.json({
      success: true,
      booking: {
        id: bookingData.id,
        service_id: bookingData.service_id,
        user_id: bookingData.user_id,
        status: bookingData.status,
        requested_date: bookingData.requested_date,
        requested_time: bookingData.requested_time,
        duration: bookingData.duration,
        total_price: bookingData.total_price,
        special_instructions: bookingData.special_instructions,
        created_at: bookingData.created_at,
        updated_at: bookingData.updated_at,
        service: bookingData.services,
        user: bookingData.profiles
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

    // Get all bookings for the user (both requested and received)
    // We'll separate them in the response processing
    // First get bookings where user is the customer
    const { data: myBookings, error: myBookingsError } = await supabase
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
      .eq("user_id" as any, user.id as any)
      .order("created_at", { ascending: false });

    if (myBookingsError) {
      console.error("Error fetching my bookings:", myBookingsError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch bookings" },
        { status: 500 }
      );
    }

    // Get bookings where user is the service provider
    // First get services owned by the user
    const { data: userServices, error: servicesError } = await supabase
      .from("services")
      .select("id")
      .eq("user_id" as any, user.id as any);

    if (servicesError) {
      console.error("Error fetching user services:", servicesError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch bookings" },
        { status: 500 }
      );
    }

    const serviceIds = (userServices as any)?.map((s: any) => s.id) || [];
    let incomingBookings: any[] = [];

    if (serviceIds.length > 0) {
      const { data: incoming, error: incomingError } = await supabase
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
        .in("service_id" as any, serviceIds)
        .order("created_at", { ascending: false });

      if (incomingError) {
        console.error("Error fetching incoming bookings:", incomingError);
        return NextResponse.json(
          { success: false, error: "Failed to fetch bookings" },
          { status: 500 }
        );
      }

      incomingBookings = incoming as any;
    }

    // Combine all bookings
    const allBookings = [...(myBookings as any || []), ...incomingBookings];

    // Type assertion for bookings data
    const bookingsData = allBookings;

    // Separate bookings into incoming (where user is provider) and my requests (where user is customer)
    const incoming: any[] = [];
    const myRequests: any[] = [];

    (bookingsData || []).forEach((booking: any) => {
      if (booking.services?.user_id === user.id) {
        // This is an incoming booking (user is the service provider)
        incoming.push({
          id: booking.id,
          service_id: booking.service_id,
          status: booking.status,
          requested_date: booking.requested_date,
          requested_time: booking.requested_time,
          duration: booking.duration,
          total_price: booking.total_price,
          special_instructions: booking.special_instructions ?? "",
          created_at: booking.created_at,
          updated_at: booking.updated_at,
          service: {
            id: booking.services?.id,
            title: booking.services?.title,
            pricing_model: booking.services?.pricing_model,
            location: booking.services?.location,
            category: booking.services?.category,
          },
          customer_name: booking.profiles ? 
            [booking.profiles.first_name, booking.profiles.last_name].filter(Boolean).join(" ").trim() || "Customer" : 
            "Customer",
        });
      } else if (booking.user_id === user.id) {
        // This is a request made by the user (user is the customer)
        myRequests.push({
          id: booking.id,
          service_id: booking.service_id,
          status: booking.status,
          requested_date: booking.requested_date,
          requested_time: booking.requested_time,
          duration: booking.duration,
          total_price: booking.total_price,
          special_instructions: booking.special_instructions ?? "",
          created_at: booking.created_at,
          updated_at: booking.updated_at,
          service: {
            id: booking.services?.id,
            title: booking.services?.title,
            provider_id: booking.services?.user_id,
            pricing_model: booking.services?.pricing_model,
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      incoming,
      myRequests
    });

  } catch (error) {
    console.error("Unexpected error in fetching bookings:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
