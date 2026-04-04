import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createServiceRoleClient } from "@/lib/supabase/server";

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

    // Check if user is admin
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = userProfile && (userProfile as any).role === "admin";
    const isSupportConversation = bookingData.special_instructions?.includes("[SUPPORT_CONVERSATION]");

    // Check if user has permission to view messages for this booking
    const isCustomer = bookingData.user_id === user.id;
    const isProvider = bookingData.services?.user_id === user.id;

    // Allow admin to view support conversations, or allow customer/provider in regular bookings
    if (!isAdmin && !isCustomer && !isProvider) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    // For support conversations, only admin and the customer can view
    if (isSupportConversation && !isAdmin && !isCustomer) {
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
          image_url: message.image_url,
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
    const { booking_id, receiver_id, content, image_url } = body;

    // Validate required fields - either content or image_url must be provided
    if (!booking_id || !receiver_id || (!content && !image_url)) {
      return NextResponse.json(
        { success: false, error: "Missing required fields - either content or image_url must be provided" },
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

    // Check if user is admin
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = userProfile && (userProfile as any).role === "admin";
    const isSupportConversation = bookingData.special_instructions?.includes("[SUPPORT_CONVERSATION]");

    // Check if user has permission to send messages for this booking
    const isCustomer = bookingData.user_id === user.id;
    const isProvider = bookingData.services?.user_id === user.id;

    // Allow admin to send messages in support conversations, or allow customer/provider in regular bookings
    if (!isAdmin && !isCustomer && !isProvider) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    // For support conversations, admin can message the user, and user can message admin
    if (isSupportConversation) {
      if (isAdmin) {
        // Admin sending to user - verify receiver is the customer
        if (receiver_id !== bookingData.user_id) {
          return NextResponse.json(
            { success: false, error: "Invalid receiver for support conversation" },
            { status: 400 }
          );
        }
      } else if (isCustomer) {
        // User sending to admin - get admin ID
        const { data: admins } = await supabase
          .from("profiles")
          .select("id")
          .eq("role", "admin")
          .limit(1);
        
        if (!admins || admins.length === 0 || receiver_id !== admins[0].id) {
          return NextResponse.json(
            { success: false, error: "Invalid receiver for support conversation" },
            { status: 400 }
          );
        }
      }
    } else {
      // Regular booking - verify receiver is the other party
      const expectedReceiverId = isCustomer ? bookingData.services?.user_id : bookingData.user_id;
      if (receiver_id !== expectedReceiverId) {
        return NextResponse.json(
          { success: false, error: "Invalid receiver" },
          { status: 400 }
        );
      }
    }

    // Create the message
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({
        sender_id: user.id,
        receiver_id,
        booking_id,
        content: content ? content.trim() : null,
        image_url: image_url || null,
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

    // When user replies, mark all messages in this conversation sent to them as read (clears red bubble for this conversation)
    try {
      let db: ReturnType<typeof createServiceRoleClient> | Awaited<ReturnType<typeof createServerClient>>;
      try {
        db = createServiceRoleClient();
      } catch {
        db = supabase;
      }
      await (db as any)
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("booking_id", booking_id)
        .eq("receiver_id", user.id)
        .is("read_at", null);
    } catch (markReadErr) {
      console.error("Error marking conversation as read after reply:", markReadErr);
      // Don't fail the send if mark-read fails
    }

    // Type assertion for message data
    const messageData = message as any;

    // Get sender profile for the response
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", messageData.sender_id)
      .single();

    // Send email notification to receiver
    try {
      const { data: receiverProfile } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .eq("id", receiver_id)
        .single();

      if (receiverProfile && receiverProfile.email && senderProfile) {
        const { EmailService } = await import("@/lib/email");
        const emailService = new EmailService();
        
        await emailService.sendEmail(
          receiverProfile.email,
          "You Have a New Message on TeenOp!",
          `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>New Message</title>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
                .content { background: white; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px; }
                .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; font-size: 14px; color: #666; }
                .button { display: inline-block; background: #434c9d; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>You Have a New Message on TeenOp!</h1>
                  <p>You've received a new message from ${senderProfile.first_name || 'a user'} on TeenOp.</p>
                </div>
                
                <div class="content">
                  <h3>What's next?</h3>
                  <ul>
                    <li>Log in to your TeenOp account to read and respond to this message.</li>
                    <li>Click the button below to view your message and continue the conversation.</li>
                    <li>Keep all communication on TeenOp for safety and record-keeping.</li>
                  </ul>

                  <p style="text-align: center; margin: 20px 0;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://teenop.com'}/messages" class="button">Click here to view your message</a>
                  </p>

                  <p><strong>Important:</strong> Please respond to messages in a timely manner to maintain good communication with other users.</p>
                  
                  <p>Thanks for being part of the TeenOp community!</p>
                </div>

                <div class="footer">
                  <p>Best,<br>The TeenOp Team</p>
                  <p>teenop.co@gmail.com | www.teenop.com</p>
                </div>
              </div>
            </body>
            </html>
          `
        );
      }
    } catch (emailError) {
      console.error("Error sending message notification email:", emailError);
      // Don't fail the message creation if email fails
    }

    return NextResponse.json({
      success: true,
      message: {
        id: messageData.id,
        sender_id: messageData.sender_id,
        receiver_id: messageData.receiver_id,
        booking_id: messageData.booking_id,
        content: messageData.content,
        image_url: messageData.image_url,
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

