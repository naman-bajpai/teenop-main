import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET messages for a booking
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
    const bookingId = searchParams.get("booking_id");

    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: "Booking ID is required" },
        { status: 400 }
      );
    }

    // Verify user has access to this booking
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

    // Check if user has permission to view messages for this booking
    const isCustomer = bookingData.user_id === user.id;
    const isProvider = bookingData.services?.user_id === user.id;

    if (!isCustomer && !isProvider) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    // Get messages for this booking
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .eq("booking_id" as any, bookingId as any)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("Error fetching messages:", messagesError);
      // If messages table doesn't exist, return empty array
      if (messagesError.code === 'PGRST200' || messagesError.message?.includes('relation "messages" does not exist')) {
        return NextResponse.json({
          success: true,
          messages: []
        });
      }
      return NextResponse.json(
        { success: false, error: "Failed to fetch messages" },
        { status: 500 }
      );
    }

    // Type assertion for messages data
    const messagesData = messages as any;

    // Get sender names separately since foreign key relationship doesn't exist yet
    const formattedMessages = await Promise.all(
      (messagesData || []).map(async (message: any) => {
        // Get sender profile
        const { data: senderProfile } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", message.sender_id)
          .single();

        return {
          id: message.id,
          sender_id: message.sender_id,
          receiver_id: message.receiver_id,
          booking_id: message.booking_id,
          content: message.content,
          created_at: message.created_at,
          sender_name: senderProfile ? 
            [(senderProfile as any).first_name, (senderProfile as any).last_name].filter(Boolean).join(" ").trim() || "User" : 
            "User"
        };
      })
    );

    return NextResponse.json({
      success: true,
      messages: formattedMessages
    });

  } catch (error) {
    console.error("Unexpected error in fetching messages:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST new message
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
    const { booking_id, receiver_id, content } = body;

    // Validate required fields
    if (!booking_id || !receiver_id || !content) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify user has access to this booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        services (
          user_id
        )
      `)
      .eq("id" as any, booking_id as any)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    // Type assertion for booking data
    const bookingData = booking as any;

    // Check if user has permission to send messages for this booking
    const isCustomer = bookingData.user_id === user.id;
    const isProvider = bookingData.services?.user_id === user.id;

    if (!isCustomer && !isProvider) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    // Verify receiver is the other party in the booking
    const expectedReceiverId = isCustomer ? bookingData.services?.user_id : bookingData.user_id;
    if (receiver_id !== expectedReceiverId) {
      return NextResponse.json(
        { success: false, error: "Invalid receiver" },
        { status: 400 }
      );
    }

    // Create the message
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({
        sender_id: user.id,
        receiver_id,
        booking_id,
        content: content.trim(),
      } as any)
      .select("*")
      .single();

    if (messageError) {
      console.error("Error creating message:", messageError);
      // If messages table doesn't exist, return a helpful error
      if (messageError.code === 'PGRST200' || messageError.message?.includes('relation "messages" does not exist')) {
        return NextResponse.json(
          { success: false, error: "Messages feature is not available yet. Please contact support." },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { success: false, error: "Failed to send message" },
        { status: 500 }
      );
    }

    // Type assertion for message data
    const messageData = message as any;

    // Get sender profile for the response
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", messageData.sender_id)
      .single();

    return NextResponse.json({
      success: true,
      message: {
        id: messageData.id,
        sender_id: messageData.sender_id,
        receiver_id: messageData.receiver_id,
        booking_id: messageData.booking_id,
        content: messageData.content,
        created_at: messageData.created_at,
        sender_name: senderProfile ? 
          [(senderProfile as any).first_name, (senderProfile as any).last_name].filter(Boolean).join(" ").trim() || "User" : 
          "User"
      }
    });

  } catch (error) {
    console.error("Unexpected error in sending message:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
