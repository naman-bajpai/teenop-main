import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET support conversations for admin
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

    // Verify user is admin
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || (profile as any).role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    // Get all support bookings (bookings with [SUPPORT_CONVERSATION] marker)
    const { data: supportBookings, error: bookingsError } = await supabase
      .from("bookings")
      .select(`
        id,
        user_id,
        service_id,
        status,
        requested_date,
        requested_time,
        special_instructions,
        created_at,
        services (
          id,
          title
        )
      `)
      .like("special_instructions", "%[SUPPORT_CONVERSATION]%")
      .order("created_at", { ascending: false });

    if (bookingsError) {
      console.error("Error fetching support bookings:", bookingsError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch support conversations" },
        { status: 500 }
      );
    }

    // Get conversations with message details
    const conversations = await Promise.all(
      (supportBookings || []).map(async (booking: any) => {
        // Get user profile
        const { data: userProfile, error: userError } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email, avatar_url")
          .eq("id", booking.user_id)
          .single();

        if (userError || !userProfile) {
          console.error("Error fetching user profile:", userError);
          return null;
        }

        // Get the latest message for this booking
        let lastMessage = null;
        let unreadCount = 0;
        
        try {
          const { data: messageData, error: messageError } = await supabase
            .from("messages")
            .select("*")
            .eq("booking_id", booking.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (messageData) {
            // Get sender profile
            const { data: senderProfile } = await supabase
              .from("profiles")
              .select("first_name, last_name")
              .eq("id", (messageData as any).sender_id)
              .single();

            lastMessage = {
              ...(messageData as any),
              sender_name: senderProfile ? 
                [(senderProfile as any).first_name, (senderProfile as any).last_name].filter(Boolean).join(" ").trim() || "User" : 
                "User"
            };
          }

          // Count unread messages (messages sent to admin that haven't been read)
          const { count: unreadCountData } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("booking_id", booking.id)
            .eq("receiver_id", user.id)
            .is("read_at", null);

          unreadCount = unreadCountData || 0;
        } catch (error) {
          // Messages might not exist yet, that's okay
          console.log("No messages found for booking:", booking.id);
        }

        // Extract service title from message content if available
        let serviceTitle = null;
        if (booking.services) {
          serviceTitle = (booking.services as any).title;
        } else if (lastMessage && (lastMessage as any).content) {
          // Try to extract from message content
          const match = (lastMessage as any).content.match(/\[Help Request for Service: (.+?)\]/);
          if (match) {
            serviceTitle = match[1];
          }
        }

        return {
          id: booking.id,
          booking_id: booking.id,
          user: {
            id: (userProfile as any).id,
            first_name: (userProfile as any).first_name,
            last_name: (userProfile as any).last_name,
            email: (userProfile as any).email,
            avatar_url: (userProfile as any).avatar_url
          },
          service_title: serviceTitle,
          last_message: lastMessage ? {
            content: (lastMessage as any).content,
            image_url: (lastMessage as any).image_url,
            created_at: (lastMessage as any).created_at,
            sender_id: (lastMessage as any).sender_id,
            sender_name: (lastMessage as any).sender_name
          } : null,
          unread_count: unreadCount,
          created_at: booking.created_at
        };
      })
    );

    // Filter out null results and sort by last message time or creation time
    const validConversations = conversations
      .filter(conv => conv !== null)
      .sort((a, b) => {
        const aTime = a?.last_message?.created_at || a?.created_at;
        const bTime = b?.last_message?.created_at || b?.created_at;
        if (!aTime && !bTime) return 0;
        if (!aTime) return 1;
        if (!bTime) return -1;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

    return NextResponse.json({
      success: true,
      conversations: validConversations
    });

  } catch (error) {
    console.error("Unexpected error in fetching support conversations:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
