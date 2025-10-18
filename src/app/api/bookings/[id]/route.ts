import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET specific booking details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log("API Route GET - Auth Error:", authError);
    console.log("API Route GET - User:", user);
    console.log("API Route GET - User ID:", user?.id);
    
    if (authError || !user) {
      console.log("API Route GET - Authentication failed");
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id: bookingId } = await params;
    console.log("API Route GET - Booking ID:", bookingId);

    // Get booking with full details including customer and service provider info
    console.log("API Route GET - Querying database for booking:", bookingId);
    
    // First, let's check what bookings this user has access to
    console.log("API Route GET - Checking user's bookings...");
    
    // Check bookings where user is the customer
    const { data: customerBookings, error: customerError } = await supabase
      .from("bookings")
      .select("id, service_id, user_id")
      .eq("user_id" as any, user.id as any);
    
    console.log("API Route GET - Customer bookings:", customerBookings);
    
    // Check bookings where user is the service provider
    const { data: userServices, error: servicesError } = await supabase
      .from("services")
      .select("id")
      .eq("user_id" as any, user.id as any);
    
    console.log("API Route GET - User services:", userServices);
    
    let providerBookings: any[] = [];
    if (userServices && userServices.length > 0) {
      const serviceIds = userServices.map((s: any) => s.id);
      const { data: providerBookingsData, error: providerError } = await supabase
        .from("bookings")
        .select("id, service_id, user_id")
        .in("service_id" as any, serviceIds);
      
      providerBookings = providerBookingsData || [];
      console.log("API Route GET - Provider bookings:", providerBookings);
    }
    
    // Check if the requested booking ID is in the user's accessible bookings
    const allUserBookings = [...(customerBookings || []), ...providerBookings];
    const hasAccess = allUserBookings.some(b => b.id === bookingId);
    console.log("API Route GET - User has access to booking:", hasAccess);
    console.log("API Route GET - All accessible booking IDs:", allUserBookings.map(b => b.id));
    
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        services (
          id,
          title,
          description,
          price,
          pricing_model,
          location,
          category,
          duration,
          user_id,
          profiles:profiles!services_user_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            avatar_url
          )
        ),
        profiles:profiles!bookings_user_id_fkey (
          id,
          first_name,
          last_name,
          email,
          phone,
          avatar_url
        )
      `)
      .eq("id" as any, bookingId as any)
      .single();

    console.log("API Route GET - Database query result:");
    console.log("  - Booking data:", booking);
    console.log("  - Booking error:", bookingError);

    if (bookingError || !booking) {
      console.log("API Route GET - Booking not found or error occurred");
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    // Type assertion for booking data
    const bookingData = booking as any;

    // Check if user has permission to view this booking
    // User can view if they are either the customer or the service provider
    const isCustomer = bookingData.user_id === user.id;
    const isProvider = bookingData.services?.user_id === user.id;

    if (!isCustomer && !isProvider) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

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
        customer: bookingData.profiles,
        provider: bookingData.services?.profiles
      }
    });

  } catch (error) {
    console.error("Unexpected error in fetching booking details:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH to update booking status (accept/decline)
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

    const { id: bookingId } = await params;
    const body = await request.json();
    const { status } = body;

    // Validate status
    if (!status || !["confirmed", "rejected", "completed", "paid", "cancelled"].includes(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid status" },
        { status: 400 }
      );
    }

    // Get the booking to check permissions
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        services (
          user_id
        )
      `)
      .eq("id" as any, bookingId as any)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    // Type assertion for booking data
    const bookingData = booking as any;

    // Check permissions based on status change
    if (status === "confirmed" || status === "rejected") {
      // Only service provider can accept/reject
      if (bookingData.services?.user_id !== user.id) {
        return NextResponse.json(
          { success: false, error: "Only service provider can accept or reject bookings" },
          { status: 403 }
        );
      }
    } else if (status === "cancelled") {
      // Either customer or provider can cancel
      const isCustomer = bookingData.user_id === user.id;
      const isProvider = bookingData.services?.user_id === user.id;
      
      if (!isCustomer && !isProvider) {
        return NextResponse.json(
          { success: false, error: "Access denied" },
          { status: 403 }
        );
      }
    } else if (status === "completed") {
      // Only service provider can mark as completed
      if (bookingData.services?.user_id !== user.id) {
        return NextResponse.json(
          { success: false, error: "Only service provider can mark booking as completed" },
          { status: 403 }
        );
      }
    } else if (status === "paid") {
      // Only customer can mark as paid (though this should typically be done via payment webhook)
      if (bookingData.user_id !== user.id) {
        return NextResponse.json(
          { success: false, error: "Only customer can mark booking as paid" },
          { status: 403 }
        );
      }
    }

    // Update the booking status
    const { data: updatedBooking, error: updateError } = await (supabase as any)
      .from("bookings")
      .update({
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq("id", bookingId)
      .select(`
        *,
        services (
          id,
          title,
          pricing_model,
          location,
          category
        ),
        profiles:profiles!bookings_user_id_fkey (
          first_name,
          last_name
        )
      `)
      .single();

    if (updateError) {
      console.error("Error updating booking:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update booking" },
        { status: 500 }
      );
    }

    // Type assertion for updated booking data
    const updatedBookingData = updatedBooking as any;

    return NextResponse.json({
      success: true,
      booking: {
        id: updatedBookingData.id,
        service_id: updatedBookingData.service_id,
        status: updatedBookingData.status,
        requested_date: updatedBookingData.requested_date,
        requested_time: updatedBookingData.requested_time,
        duration: updatedBookingData.duration,
        total_price: updatedBookingData.total_price,
        special_instructions: updatedBookingData.special_instructions,
        created_at: updatedBookingData.created_at,
        updated_at: updatedBookingData.updated_at,
        service: updatedBookingData.services,
        customer_name: updatedBookingData.profiles ? 
          [updatedBookingData.profiles.first_name, updatedBookingData.profiles.last_name].filter(Boolean).join(" ").trim() || "Customer" : 
          "Customer",
      }
    });

  } catch (error) {
    console.error("Unexpected error in updating booking:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
