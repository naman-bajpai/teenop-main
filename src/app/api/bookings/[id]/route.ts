import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const bookingId = params.id;

    // Fetch the booking with related data
    const { data: booking, error } = await supabase
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
      .eq("id", bookingId)
      .single();

    if (error || !booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    // Check if user has permission to view this booking
    const isBookingOwner = booking.user_id === user.id;
    const isServiceProvider = booking.services?.user_id === user.id;

    if (!isBookingOwner && !isServiceProvider) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

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
    console.error("Unexpected error in fetching booking:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const bookingId = params.id;
    const body = await request.json();
    const { status, special_instructions } = body;

    // Fetch the booking to check permissions
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select(`
        *,
        services (
          user_id
        )
      `)
      .eq("id", bookingId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    // Check permissions
    const isBookingOwner = booking.user_id === user.id;
    const isServiceProvider = booking.services?.user_id === user.id;

    if (!isBookingOwner && !isServiceProvider) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    // Determine what updates are allowed
    const updates: any = {};

    if (status) {
      // Only service providers can change status to confirmed/rejected
      // Only booking owners can cancel
      if (isServiceProvider && ["confirmed", "rejected", "completed"].includes(status)) {
        updates.status = status;
      } else if (isBookingOwner && status === "cancelled") {
        updates.status = status;
      } else {
        return NextResponse.json(
          { success: false, error: "Invalid status change" },
          { status: 400 }
        );
      }
    }

    if (special_instructions !== undefined && isBookingOwner) {
      updates.special_instructions = special_instructions;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid updates provided" },
        { status: 400 }
      );
    }

    // Update the booking
    const { data: updatedBooking, error: updateError } = await supabase
      .from("bookings")
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq("id", bookingId)
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

    if (updateError) {
      console.error("Error updating booking:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update booking" },
        { status: 500 }
      );
    }

    // TODO: Send notification to the other party about the status change

    return NextResponse.json({
      success: true,
      booking: {
        id: updatedBooking.id,
        service_id: updatedBooking.service_id,
        user_id: updatedBooking.user_id,
        status: updatedBooking.status,
        requested_date: updatedBooking.requested_date,
        requested_time: updatedBooking.requested_time,
        duration: updatedBooking.duration,
        total_price: updatedBooking.total_price,
        special_instructions: updatedBooking.special_instructions,
        created_at: updatedBooking.created_at,
        updated_at: updatedBooking.updated_at,
        service: updatedBooking.services,
        user: updatedBooking.profiles
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const bookingId = params.id;

    // Fetch the booking to check permissions
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("user_id, status")
      .eq("id", bookingId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    // Only booking owners can delete their bookings
    if (booking.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    // Only allow deletion of pending bookings
    if (booking.status !== "pending") {
      return NextResponse.json(
        { success: false, error: "Can only delete pending bookings" },
        { status: 400 }
      );
    }

    // Delete the booking
    const { error: deleteError } = await supabase
      .from("bookings")
      .delete()
      .eq("id", bookingId);

    if (deleteError) {
      console.error("Error deleting booking:", deleteError);
      return NextResponse.json(
        { success: false, error: "Failed to delete booking" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Booking deleted successfully"
    });

  } catch (error) {
    console.error("Unexpected error in deleting booking:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
