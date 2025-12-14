import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// POST message to admin (support/help request)
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

    const body = await request.json();
    const { service_id, content, image_url } = body;

    // Validate required fields
    if (!content && !image_url) {
      return NextResponse.json(
        { success: false, error: "Message content or image is required" },
        { status: 400 }
      );
    }

    // Get admin user
    const { data: admins, error: adminError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .eq("role", "admin")
      .limit(1);

    if (adminError || !admins || admins.length === 0) {
      return NextResponse.json(
        { success: false, error: "Admin not found" },
        { status: 404 }
      );
    }

    const adminId = admins[0].id;

    // Get service details if service_id is provided
    let serviceTitle = null;
    if (service_id) {
      const { data: service } = await supabase
        .from("services")
        .select("title")
        .eq("id", service_id)
        .single();
      
      if (service) {
        serviceTitle = (service as any).title;
      }
    }

    // Format the message with service context if available
    let messageContent = content || "";
    if (service_id && serviceTitle) {
      messageContent = `[Help Request for Service: ${serviceTitle}]\n\n${messageContent}`;
    }

    // Since messages require booking_id, we need to create or find a support booking
    // Check if there's an existing support booking for this user-admin pair
    let supportBookingId: string | null = null;
    
    // Try to find an existing support booking for this user-admin pair
    // We'll look for bookings with a special marker in special_instructions
    const { data: existingBookings } = await supabase
      .from("bookings")
      .select("id")
      .eq("user_id", user.id)
      .like("special_instructions", "%[SUPPORT_CONVERSATION]%")
      .limit(1)
      .single();

    if (existingBookings) {
      supportBookingId = (existingBookings as any).id;
    } else {
      // Create a new support booking
      // First, we need a service for the booking - let's use a placeholder or create one
      // For now, let's try to find any service or create a minimal one
      const { data: anyService } = await supabase
        .from("services")
        .select("id")
        .limit(1)
        .single();

      if (anyService) {
        const { data: newBooking, error: bookingError } = await supabase
          .from("bookings")
          .insert({
            user_id: user.id,
            service_id: (anyService as any).id,
            status: "pending", // Use pending status for support conversations
            requested_date: new Date().toISOString().split("T")[0],
            requested_time: new Date().toTimeString().split(" ")[0].substring(0, 5),
            special_instructions: "[SUPPORT_CONVERSATION] This is a support/help conversation with admin.",
          } as any)
          .select("id")
          .single();

        if (bookingError) {
          console.error("Error creating support booking:", bookingError);
          return NextResponse.json(
            { success: false, error: "Failed to create support conversation" },
            { status: 500 }
          );
        }

        supportBookingId = (newBooking as any).id;
      } else {
        return NextResponse.json(
          { success: false, error: "System configuration error. Please contact support." },
          { status: 500 }
        );
      }
    }

    // Create the support message
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({
        sender_id: user.id,
        receiver_id: adminId,
        booking_id: supportBookingId,
        content: messageContent.trim() || null,
        image_url: image_url || null,
      } as any)
      .select("*")
      .single();

    if (messageError) {
      console.error("Error creating admin message:", messageError);
      return NextResponse.json(
        { success: false, error: "Failed to send message" },
        { status: 500 }
      );
    }

    // Get sender profile for the response
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .single();

    return NextResponse.json({
      success: true,
      message: {
        id: (message as any).id,
        sender_id: (message as any).sender_id,
        receiver_id: (message as any).receiver_id,
        booking_id: (message as any).booking_id,
        content: (message as any).content,
        image_url: (message as any).image_url,
        created_at: (message as any).created_at,
        sender_name: senderProfile ? 
          [(senderProfile as any).first_name, (senderProfile as any).last_name].filter(Boolean).join(" ").trim() || "User" : 
          "User"
      }
    });

  } catch (error) {
    console.error("Unexpected error in sending admin message:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
